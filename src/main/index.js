'use strict'

const { app, protocol, BrowserWindow, screen, ipcMain } = require('electron')
const path = require('path')

// Prevent multiple instances
if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0) }

const store          = require('./store/config-store')
const psRunner       = require('./ps-runner')
const profileResolver = require('./state/profile-resolver')
const stateBroadcaster = require('./ipc/state-broadcaster')
const gestureHandlers  = require('./ipc/gesture-handlers')
const configHandlers   = require('./ipc/config-handlers')
const hudWindowMgr      = require('./windows/hud-window')
const testPanelMgr      = require('./windows/test-panel-window')
const configWinMgr      = require('./windows/config-window')
const visualizerWinMgr  = require('./windows/visualizer-window')
const discordIpc     = require('./integrations/discord-ipc')
const leapWs         = require('./integrations/leap-ws')
const leapNative     = require('./integrations/leap-native')
const pipeline       = require('./pipeline/gesture-pipeline')
const classifier     = require('./pipeline/classifier')
const { setState }   = require('./state/app-state')
const { GESTURE_NAMES, TIMING } = require('../shared/constants')
const vol            = require('./actions/volume-media')
const bright         = require('./actions/brightness')

// Catch-all for unhandled JS errors — prints to stdout so crashes appear in dev.log
process.on('uncaughtException', (err) => {
  console.error('[FATAL] uncaughtException:', err.message)
  console.error('[FATAL] stack:', err.stack)
})
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] unhandledRejection:', reason?.message ?? reason)
  if (reason?.stack) console.error('[FATAL] stack:', reason.stack)
})
app.on('before-quit', () => {
  console.log('[app] before-quit event fired')
})

// Register friday:// protocol for Spotify OAuth callback
protocol.registerSchemesAsPrivileged([
  { scheme: 'friday', privileges: { secure: true, standard: true } }
])

// Maps classifier gesture names to the shared GESTURE_NAMES constants
const SHAPE_TO_GESTURE = {
  'Open Palm':   GESTURE_NAMES.OPEN_PALM,
  'Peace Sign':  GESTURE_NAMES.PEACE_SIGN,
  'Gun Shape':   GESTURE_NAMES.GUN_SHAPE,
  'Hang Loose':  GESTURE_NAMES.HANG_LOOSE,
  'Thumbs Up':   GESTURE_NAMES.THUMBS_UP,
  'Thumbs Down': GESTURE_NAMES.THUMBS_DOWN,
  'Index Point': GESTURE_NAMES.INDEX_POINT_TWIST,
  'Pinch':       GESTURE_NAMES.PINCH,
}

// Hold gestures need onHoldStart/Cancel rather than direct fire
const HOLD_GESTURE_SET = new Set([
  GESTURE_NAMES.GUN_SHAPE,
  GESTURE_NAMES.HANG_LOOSE,
  GESTURE_NAMES.PINCH,
  GESTURE_NAMES.PEACE_SIGN,
  GESTURE_NAMES.INDEX_POINT_TWIST,
])

const FORMING_THRESHOLD = 0.45  // below this, gesture is not yet shown

class FrameBridge {
  constructor() {
    this._prevLeft        = false
    this._prevRight       = false
    this._modifierActive  = false
    this._modifierFrames  = 0
    this._layer3Active    = false
    this._layer3Start     = null   // Date.now() ms when left pinch started
    this._prevGesture     = null   // current dominant GESTURE_NAMES key
    this._prevIsHold      = false
  }

  onFrame(frame) {
    const hands     = frame?.hands ?? []
    const leftHand  = hands.find(h => h.type === 'left')
    const rightHand = hands.find(h => h.type === 'right')
    this._updatePresence(leftHand, rightHand)
    this._updateModifier(leftHand)
    this._updateLayer3(leftHand)
    if (rightHand) {
      this._routeRightHand(rightHand)
    } else if (this._prevGesture && this._prevIsHold) {
      pipeline.onHoldCancel({ gesture: this._prevGesture, hand: 'right' })
      this._prevGesture = null
      this._prevIsHold  = false
    }
  }

  _updatePresence(left, right) {
    const l = !!left, r = !!right
    if (l && !this._prevLeft)  pipeline.onHandEnter({ hand: 'left' })
    if (!l && this._prevLeft)  pipeline.onHandExit({ hand: 'left' })
    if (r && !this._prevRight) pipeline.onHandEnter({ hand: 'right' })
    if (!r && this._prevRight) pipeline.onHandExit({ hand: 'right' })
    this._prevLeft  = l
    this._prevRight = r
  }

  _updateModifier(leftHand) {
    if (!leftHand) {
      this._modifierFrames = 0
      if (this._modifierActive) { this._modifierActive = false; pipeline.onModifierExit() }
      return
    }
    const v     = leftHand.palmVelocity ?? [0, 0, 0]
    const speed = Math.sqrt(v[0]**2 + v[1]**2 + v[2]**2)
    if (speed < TIMING.MODIFIER_VELOCITY_THRESHOLD_MM_S) {
      this._modifierFrames++
      if (!this._modifierActive && this._modifierFrames >= 5) {
        this._modifierActive = true
        pipeline.onModifierEnter()
      }
    } else {
      this._modifierFrames = 0
      if (this._modifierActive) { this._modifierActive = false; pipeline.onModifierExit() }
    }
  }

  _updateLayer3(leftHand) {
    if (!leftHand || (leftHand.pinchStrength ?? 0) < 0.9) {
      this._layer3Start = null
      return
    }
    const now = Date.now()
    if (!this._layer3Start) { this._layer3Start = now; return }
    if ((now - this._layer3Start) >= TIMING.LAYER3_HOLD_MS) {
      this._layer3Start = null
      if (this._layer3Active) {
        this._layer3Active = false
        pipeline.onLayer3Exit()
      } else {
        this._layer3Active = true
        pipeline.onLayer3Enter()
      }
    }
  }

  _routeRightHand(hand) {
    const { gestures, swipes } = classifier.classifyFrame(hand)

    // Two-finger flick: Two-Finger shape + directional swipe both above forming threshold
    const twoFinger = gestures.find(g => g.name === 'Two-Finger')
    const topSwipe  = swipes.reduce((a, b) => b.confidence > a.confidence ? b : a)

    let gesture    = null
    let confidence = 0
    let direction  = null

    if (twoFinger?.confidence >= FORMING_THRESHOLD && topSwipe?.confidence >= FORMING_THRESHOLD) {
      gesture    = GESTURE_NAMES.TWO_FINGER_FLICK
      confidence = Math.min(twoFinger.confidence, topSwipe.confidence)
      direction  = topSwipe.direction
    } else {
      const top = gestures.find(g => g.name !== 'Two-Finger')
      if (top && top.confidence >= FORMING_THRESHOLD) {
        gesture    = SHAPE_TO_GESTURE[top.name]
        confidence = top.confidence
      }
    }

    if (!gesture) {
      if (this._prevGesture && this._prevIsHold) {
        pipeline.onHoldCancel({ gesture: this._prevGesture, hand: 'right' })
      }
      this._prevGesture = null
      this._prevIsHold  = false
      return
    }

    const isHold = HOLD_GESTURE_SET.has(gesture)

    if (gesture !== this._prevGesture) {
      if (this._prevGesture && this._prevIsHold) {
        pipeline.onHoldCancel({ gesture: this._prevGesture, hand: 'right' })
      }
      if (isHold && confidence >= TIMING.CONFIDENCE_THRESHOLD) {
        pipeline.onHoldStart({ gesture, hand: 'right', direction })
      }
      this._prevGesture = gesture
      this._prevIsHold  = isHold
    }

    pipeline.onGestureEvent({ gesture, hand: 'right', direction, confidence, timestamp: Date.now() })
  }
}

let gesturesEnabled = true

const isDev = !app.isPackaged
const RENDERER_URL = process.env['ELECTRON_RENDERER_URL'] || ''

function preloadPath(name) {
  // electron-vite output: out/preload/<name>.js
  return path.join(__dirname, `../preload/${name}.js`)
}

function rendererUrl(page) {
  if (isDev && RENDERER_URL) return `${RENDERER_URL}/${page}/index.html`
  return path.join(__dirname, `../renderer/${page}/index.html`)
}

async function bootstrap() {
  await app.whenReady()

  // Register custom protocol handler for Spotify OAuth
  protocol.handle('friday', (request) => {
    const url = request.url
    if (url.startsWith('friday://spotify-callback')) {
      require('./integrations/spotify-client').handleCallback(url)
    }
    return new Response('', { status: 200 })
  })

  // Start persistent PowerShell runner
  try {
    await psRunner.start()
    setState({ sensorStatus: 'disconnected' })
  } catch (err) {
    console.error('[ps-runner] Failed to start PowerShell runner:', err)
  }

  // Create windows
  const hudWin      = hudWindowMgr.create(preloadPath('hudPreload'), store)
  const testWin     = testPanelMgr.create(preloadPath('testPanelPreload'))
  const configWin   = configWinMgr.open(preloadPath('configPreload'))
  const visualizerWin = visualizerWinMgr.create(preloadPath('visualizerPreload'))

  // Wire IPC
  gestureHandlers.register()
  configHandlers.register()
  stateBroadcaster.init(hudWin, testWin)

  // Load renderer pages
  if (isDev && RENDERER_URL) {
    hudWin.loadURL(`${RENDERER_URL}/hud/index.html`)
    testWin.loadURL(`${RENDERER_URL}/test-panel/index.html`)
    configWin.loadURL(`${RENDERER_URL}/config/index.html`)
    visualizerWin.loadURL(`${RENDERER_URL}/visualizer/index.html`)
  } else {
    hudWin.loadFile(path.join(__dirname, '../renderer/hud/index.html'))
    testWin.loadFile(path.join(__dirname, '../renderer/test-panel/index.html'))
    configWin.loadFile(path.join(__dirname, '../renderer/config/index.html'))
    visualizerWin.loadFile(path.join(__dirname, '../renderer/visualizer/index.html'))
  }

  // Ensure windows are visible on primary display
  const primary = screen.getPrimaryDisplay()
  const { x: px, y: py, width: pw, height: ph } = primary.workArea
  console.log('[windows] all displays:', JSON.stringify(screen.getAllDisplays().map(d => d.workArea)))
  console.log('[windows] primary workArea:', { px, py, pw, ph })
  const testBounds = { x: px + Math.max(0, pw - 480), y: py + 60, width: 460, height: Math.min(860, ph - 80) }
  console.log('[windows] testPanel bounds:', testBounds)
  testWin.setBounds(testBounds)
  hudWin.setBounds({ x: px + Math.max(0, pw - 380), y: py, width: 360, height: ph })
  testWin.show()
  hudWin.show()
  configWin.show()
  visualizerWin.show()
  testWin.moveTop()
  configWin.moveTop()
  visualizerWin.focus()  // last — nothing can steal it after this

  // Open DevTools in dev (test panel + visualizer, detached)
  if (isDev) {
    testWin.webContents.openDevTools({ mode: 'detach' })
    visualizerWin.webContents.openDevTools({ mode: 'detach' })
  }

  // Window crash + close logging for all windows
  const namedWindows = [
    { name: 'visualizer', win: visualizerWin },
    { name: 'hud',        win: hudWin },
    { name: 'testPanel',  win: testWin },
    { name: 'config',     win: configWin },
  ]
  for (const { name, win } of namedWindows) {
    win.on('closed', () => console.error(`[window:${name}] closed`))
    win.webContents.on('render-process-gone', (_e, details) => {
      console.error(`[window:${name}] render-process-gone reason=${details.reason} exit=${details.exitCode}`)
    })
    win.webContents.on('did-crash', () => {
      console.error(`[window:${name}] did-crash`)
    })
  }

  // Window-state heartbeat every 10s — visible in dev.log so monitor can detect renderer death
  setInterval(() => {
    const states = namedWindows.map(({ name, win }) => {
      const alive = win && !win.isDestroyed()
      return `${name}=${alive ? 'alive' : 'DEAD'}`
    }).join(' ')
    console.log(`[windows] ${states}`)
  }, 10000)

  // Start profile resolver
  profileResolver.start()

  // Wire Leap Motion native tracking — frames go to both visualizer and gesture pipeline
  const frameBridge = new FrameBridge()

  // Push frames to visualizer at 16ms (≈60fps) — matches renderer's rAF rate.
  // The renderer stores each frame in a ref and renders at rAF cadence, so the
  // ref always holds the latest value regardless of any momentary IPC queue depth.
  let _lastVisSend = 0
  leapNative.on('frame', (frameData) => {
    const now     = Date.now()
    const elapsed = now - _lastVisSend
    const minInterval = frameData.hands.length > 0 ? 16 : 250
    if (elapsed >= minInterval) {
      _lastVisSend = now
      if (!visualizerWin?.isDestroyed?.() && visualizerWin?.webContents)
        visualizerWin.webContents.send('leap:frame', frameData)
    }
    if (gesturesEnabled) {
      try {
        frameBridge.onFrame(frameData)
      } catch (err) {
        console.error('[frameBridge] error:', err.message)
      }
    }
  })
  leapNative.on('status', (status) => {
    if (!visualizerWin?.isDestroyed?.() && visualizerWin?.webContents)
      visualizerWin.webContents.send('leap:status', status)
  })
  ipcMain.handle('leap:get-status', () => leapNative.status)
  ipcMain.on('gestures:set-enabled', (_e, enabled) => {
    gesturesEnabled = !!enabled
    console.log(`[gestures] ${gesturesEnabled ? 'enabled' : 'disabled'}`)
  })
  ipcMain.on('gesture:cooldown', (_e, ms) => {
    const pipeline = require('./pipeline/gesture-pipeline')
    pipeline.setCooldown(ms)
    console.log(`[gestures] cooldown set to ${ms}ms`)
  })
  ipcMain.on('renderer:error', (_e, { message, stack }) => {
    console.error('[renderer]', message, stack?.split('\n').slice(0, 3).join(' | '))
  })
  leapNative.start()

  // Start Discord IPC (non-blocking — fails gracefully if Discord not running)
  discordIpc.connect()

  // Poll system values every 5 seconds
  async function pollSystemValues() {
    const [v, b] = await Promise.all([
      vol.getVolume().catch(() => null),
      bright.getBrightness().catch(() => null)
    ])
    setState({ volume: v, brightness: b })
  }
  pollSystemValues()
  setInterval(pollSystemValues, 5000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) bootstrap()
  })
}

app.on('second-instance', (_event, argv) => {
  // Handle Spotify OAuth redirect on Windows
  const callbackUrl = argv.find(a => a.startsWith('friday://spotify-callback'))
  if (callbackUrl) {
    require('./integrations/spotify-client').handleCallback(callbackUrl)
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    psRunner.stop()
    profileResolver.stop()
    discordIpc.disconnect()
    leapNative.stop()
    leapWs.stop()
    app.quit()
  }
})

bootstrap().catch(console.error)
