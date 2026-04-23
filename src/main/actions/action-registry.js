'use strict'

const { ACTIONS } = require('../../shared/gesture-map')
const vol         = require('./volume-media')
const bright      = require('./brightness')
const win         = require('./window-management')
const desk        = require('./desktop-management')
const discord     = require('./discord-actions')
const spotify     = require('./spotify-actions')
const { setState } = require('../state/app-state')

// Registry maps actionId → async handler
const registry = new Map([
  // Volume & media
  [ACTIONS.VOLUME_UP,          () => vol.volumeUp()],
  [ACTIONS.VOLUME_DOWN,        () => vol.volumeDown()],
  [ACTIONS.MUTE,               () => vol.toggleMute()],
  [ACTIONS.MEDIA_PLAY_PAUSE,   () => vol.playPause()],
  [ACTIONS.MEDIA_NEXT,         () => vol.nextTrack()],
  [ACTIONS.MEDIA_PREV,         () => vol.prevTrack()],

  // Brightness
  [ACTIONS.BRIGHTNESS_UP,      () => bright.brightnessUp()],
  [ACTIONS.BRIGHTNESS_DOWN,    () => bright.brightnessDown()],

  // Window management
  [ACTIONS.APP_FORWARD,        () => win.appForward()],
  [ACTIONS.APP_BACK,           () => win.appBack()],
  [ACTIONS.WINDOW_MAXIMIZE,    () => win.maximize()],
  [ACTIONS.WINDOW_MINIMIZE,    () => win.minimize()],
  [ACTIONS.WINDOW_CLOSE,       () => win.close()],
  [ACTIONS.WINDOW_FORCE_QUIT,  () => win.forceQuit()],
  [ACTIONS.WINDOW_SNAP_RIGHT,  () => win.snapRight()],
  [ACTIONS.WINDOW_SNAP_LEFT,   () => win.snapLeft()],
  [ACTIONS.WINDOW_NEXT_MONITOR,() => win.nextMonitor()],
  [ACTIONS.WINDOW_PREV_MONITOR,() => win.prevMonitor()],
  [ACTIONS.OVERVIEW,           () => win.taskView()],
  [ACTIONS.CLEAR_DESK,         () => win.showDesktop()],

  // Virtual desktops
  [ACTIONS.DESKTOP_RIGHT,      () => desk.desktopRight()],
  [ACTIONS.DESKTOP_LEFT,       () => desk.desktopLeft()],
  [ACTIONS.DESKTOP_CREATE,     () => desk.createDesktop()],
  [ACTIONS.DESKTOP_CLOSE,      () => desk.closeDesktop()],
  [ACTIONS.DESKTOP_SEND_RIGHT, () => desk.sendRight()],
  [ACTIONS.DESKTOP_SEND_LEFT,  () => desk.sendLeft()],

  // HUD control (handled by pipeline, not here)
  [ACTIONS.HUD_TOGGLE,         () => setState({ hudVisible: !require('../state/app-state').getState().hudVisible })],
  [ACTIONS.CHEAT_SHEET,        () => setState({ hudState: 4 })],
  [ACTIONS.NIGHT_MODE,         () => toggleNightMode()],

  // Discord
  [ACTIONS.DISCORD_MIC_TOGGLE,    () => discord.micToggle()],
  [ACTIONS.DISCORD_DEAFEN_TOGGLE, () => discord.deafenToggle()],
  [ACTIONS.DISCORD_PTT,           () => discord.pttToggle()],
  [ACTIONS.DISCORD_LEAVE,         () => discord.leaveVoice()],

  // Spotify
  [ACTIONS.SPOTIFY_PLAY_PAUSE,    () => spotify.playPause()],
  [ACTIONS.SPOTIFY_NEXT,          () => spotify.next()],
  [ACTIONS.SPOTIFY_PREV,          () => spotify.prev()],
  [ACTIONS.SPOTIFY_VOLUME,        (ctx) => spotify.adjustVolume(ctx?.direction === 'cw' ? 5 : -5)],

  // Audio routing
  [ACTIONS.AUDIO_OUT_NEXT,     () => require('./audio-routing').nextOutput()],
  [ACTIONS.AUDIO_IN_NEXT,      () => require('./audio-routing').nextInput()],

  // Browser (send keyboard shortcuts — assumes app is focused)
  [ACTIONS.BROWSER_FORWARD,    () => sendKeys('%{RIGHT}')],
  [ACTIONS.BROWSER_BACK,       () => sendKeys('%{LEFT}')],
  [ACTIONS.SCROLL_TOP,         () => sendKeys('^{HOME}')],
  [ACTIONS.SCROLL_BOTTOM,      () => sendKeys('^{END}')],
  [ACTIONS.ZOOM_IN,            () => sendKeys('^+')],
  [ACTIONS.ZOOM_OUT,           () => sendKeys('^-')],

  // Media player keyboard shortcuts
  [ACTIONS.SKIP_FORWARD,       () => sendKeys('+{RIGHT}')],
  [ACTIONS.SKIP_BACK,          () => sendKeys('+{LEFT}')],
  [ACTIONS.TOGGLE_FULLSCREEN,  () => sendKeys('f')],
  [ACTIONS.MEDIA_PLAY_PAUSE_APP,() => sendKeys(' ')],

  // Creative
  [ACTIONS.UNDO,               () => sendKeys('^z')],
  [ACTIONS.REDO,               () => sendKeys('^y')],
  [ACTIONS.BRUSH_SIZE_UP,      () => sendKeys(']')],
  [ACTIONS.BRUSH_SIZE_DOWN,    () => sendKeys('[')],

  // Code editor
  [ACTIONS.GO_TO_DEFINITION,   () => sendKeys('{F12}')],
  [ACTIONS.GO_BACK,            () => sendKeys('%{LEFT}')],
  [ACTIONS.LINE_MOVE_UP,       () => sendKeys('+%{UP}')],
  [ACTIONS.LINE_MOVE_DOWN,     () => sendKeys('+%{DOWN}')],

  // Communication
  [ACTIONS.APP_MIC_MUTE,       () => sendKeys('^+m')],
  [ACTIONS.CAMERA_ON,          () => sendKeys('^+v')],
  [ACTIONS.CAMERA_OFF,         () => sendKeys('^+v')],
  [ACTIONS.RAISE_HAND,         () => sendKeys('^+h')],
  [ACTIONS.LEAVE_CALL,         () => sendKeys('^+{F4}')],

  // Documents
  [ACTIONS.NEXT_PAGE,          () => sendKeys('{PGDN}')],
  [ACTIONS.PREV_PAGE,          () => sendKeys('{PGUP}')],
  [ACTIONS.FONT_SIZE_UP,       () => sendKeys('^]')],
  [ACTIONS.FONT_SIZE_DOWN,     () => sendKeys('^[')],
  [ACTIONS.READING_VIEW,       () => sendKeys('{F7}')],
  [ACTIONS.PLAYBACK_SPEED,     () => {}],
  [ACTIONS.LAYER_UP,           () => sendKeys(']')],
  [ACTIONS.LAYER_DOWN,         () => sendKeys('[')],
])

const psRunner = require('../ps-runner')

function toggleNightMode() {
  return psRunner.run('[NightModeHelper]::Toggle()').then(result => {
    if (result && result !== 'OK') console.warn('[NightMode]', result)
  })
}

function sendKeys(keys) {
  const escaped = keys.replace(/'/g, "''")
  return psRunner.run(`$wsh = New-Object -ComObject WScript.Shell; $wsh.SendKeys('${escaped}')`)
}

async function execute(actionId, context = {}) {
  const handler = registry.get(actionId)
  if (!handler) {
    console.warn(`[actions] No handler for actionId: ${actionId}`)
    return
  }
  try {
    await handler(context)
  } catch (err) {
    console.error(`[actions] Error executing ${actionId}:`, err.message)
  }
}

module.exports = { execute, registry }
