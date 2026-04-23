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
const { setState }   = require('./state/app-state')
const vol            = require('./actions/volume-media')
const bright         = require('./actions/brightness')

// Register friday:// protocol for Spotify OAuth callback
protocol.registerSchemesAsPrivileged([
  { scheme: 'friday', privileges: { secure: true, standard: true } }
])

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

  // Start profile resolver
  profileResolver.start()

  // Leap Motion frames come directly from renderer-side WebSocket (visualizer-preload / useLeapWebSocket)
  // The main-process leap-ws singleton is reserved for the gesture engine (requires background_app_mode:2)

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
    leapWs.stop()
    app.quit()
  }
})

bootstrap().catch(console.error)
