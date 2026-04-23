'use strict'

const { GESTURE_NAMES, HOLD_DURATIONS } = require('./constants')
const { PROFILES } = require('./profiles')

// ── Action IDs ────────────────────────────────────────────────────────────────
const ACTIONS = Object.freeze({
  // Window management
  APP_FORWARD:           'app:forward',
  APP_BACK:              'app:back',
  WINDOW_MAXIMIZE:       'window:maximize',
  WINDOW_MINIMIZE:       'window:minimize',
  WINDOW_CLOSE:          'window:close',
  WINDOW_FORCE_QUIT:     'window:forceQuit',
  WINDOW_SNAP_RIGHT:     'window:snapRight',
  WINDOW_SNAP_LEFT:      'window:snapLeft',
  WINDOW_NEXT_MONITOR:   'window:nextMonitor',
  WINDOW_PREV_MONITOR:   'window:prevMonitor',
  OVERVIEW:              'window:overview',
  CLEAR_DESK:            'window:clearDesk',

  // Virtual desktops
  DESKTOP_RIGHT:         'desktop:right',
  DESKTOP_LEFT:          'desktop:left',
  DESKTOP_CREATE:        'desktop:create',
  DESKTOP_CLOSE:         'desktop:close',
  DESKTOP_SEND_RIGHT:    'desktop:sendRight',
  DESKTOP_SEND_LEFT:     'desktop:sendLeft',

  // Volume / media
  VOLUME_UP:             'audio:volumeUp',
  VOLUME_DOWN:           'audio:volumeDown',
  MUTE:                  'audio:mute',
  MEDIA_PLAY_PAUSE:      'audio:playPause',
  MEDIA_NEXT:            'audio:next',
  MEDIA_PREV:            'audio:prev',

  // Brightness
  BRIGHTNESS_UP:         'system:brightnessUp',
  BRIGHTNESS_DOWN:       'system:brightnessDown',

  // System
  NIGHT_MODE:            'system:nightMode',
  HUD_TOGGLE:            'hud:toggle',
  CHEAT_SHEET:           'hud:cheatSheet',

  // Audio routing
  AUDIO_OUT_NEXT:        'audio:outNext',
  AUDIO_IN_NEXT:         'audio:inNext',

  // Browser
  BROWSER_FORWARD:       'browser:forward',
  BROWSER_BACK:          'browser:back',
  SCROLL_TOP:            'browser:scrollTop',
  SCROLL_BOTTOM:         'browser:scrollBottom',
  ZOOM_IN:               'browser:zoomIn',
  ZOOM_OUT:              'browser:zoomOut',

  // Media player
  SKIP_FORWARD:          'media:skipForward',
  SKIP_BACK:             'media:skipBack',
  TOGGLE_FULLSCREEN:     'media:fullscreen',
  PLAYBACK_SPEED:        'media:playbackSpeed',
  MEDIA_PLAY_PAUSE_APP:  'media:playPauseApp',

  // Creative tools
  UNDO:                  'creative:undo',
  REDO:                  'creative:redo',
  BRUSH_SIZE_UP:         'creative:brushSizeUp',
  BRUSH_SIZE_DOWN:       'creative:brushSizeDown',
  LAYER_UP:              'creative:layerUp',
  LAYER_DOWN:            'creative:layerDown',

  // Code editor
  GO_TO_DEFINITION:      'code:goToDefinition',
  GO_BACK:               'code:goBack',
  LINE_MOVE_UP:          'code:lineMoveUp',
  LINE_MOVE_DOWN:        'code:lineMoveDown',

  // Communication
  APP_MIC_MUTE:          'comm:micMute',
  CAMERA_ON:             'comm:cameraOn',
  CAMERA_OFF:            'comm:cameraOff',
  RAISE_HAND:            'comm:raiseHand',
  LEAVE_CALL:            'comm:leaveCall',

  // Documents
  NEXT_PAGE:             'doc:nextPage',
  PREV_PAGE:             'doc:prevPage',
  FONT_SIZE_UP:          'doc:fontSizeUp',
  FONT_SIZE_DOWN:        'doc:fontSizeDown',
  READING_VIEW:          'doc:readingView',

  // Discord (Layer 3)
  DISCORD_MIC_TOGGLE:    'discord:micToggle',
  DISCORD_DEAFEN_TOGGLE: 'discord:deafenToggle',
  DISCORD_PTT:           'discord:ptt',
  DISCORD_LEAVE:         'discord:leave',

  // Spotify (Layer 3)
  SPOTIFY_PLAY_PAUSE:    'spotify:playPause',
  SPOTIFY_NEXT:          'spotify:next',
  SPOTIFY_PREV:          'spotify:prev',
  SPOTIFY_VOLUME:        'spotify:volume',
})

// ── Hardwired gestures (checked first, never overridden except where noted) ──
const HARDWIRED = Object.freeze({
  [GESTURE_NAMES.WRIST_SHOO]:   ACTIONS.HUD_TOGGLE,
  [GESTURE_NAMES.SNAP_TO_FIST]: ACTIONS.WINDOW_MINIMIZE,
  [GESTURE_NAMES.OPEN_PALM]:    ACTIONS.MUTE,
  // PEACE_SIGN hold 600ms → cheat sheet (handled as hold in pipeline)
})

// ── Human-readable action descriptions (shown in HUD State 3) ────────────────
const ACTION_LABELS = Object.freeze({
  [ACTIONS.APP_FORWARD]:          'Next App',
  [ACTIONS.APP_BACK]:             'Previous App',
  [ACTIONS.WINDOW_MAXIMIZE]:      'Maximize Window',
  [ACTIONS.WINDOW_MINIMIZE]:      'Minimize Window',
  [ACTIONS.WINDOW_CLOSE]:         'Close Window',
  [ACTIONS.WINDOW_FORCE_QUIT]:    'Force Quit',
  [ACTIONS.WINDOW_SNAP_RIGHT]:    'Snap Right',
  [ACTIONS.WINDOW_SNAP_LEFT]:     'Snap Left',
  [ACTIONS.WINDOW_NEXT_MONITOR]:  'Next Monitor',
  [ACTIONS.WINDOW_PREV_MONITOR]:  'Previous Monitor',
  [ACTIONS.OVERVIEW]:             'Task View',
  [ACTIONS.CLEAR_DESK]:           'Show Desktop',
  [ACTIONS.DESKTOP_RIGHT]:        'Next Desktop',
  [ACTIONS.DESKTOP_LEFT]:         'Previous Desktop',
  [ACTIONS.DESKTOP_CREATE]:       'New Desktop',
  [ACTIONS.DESKTOP_CLOSE]:        'Close Desktop',
  [ACTIONS.DESKTOP_SEND_RIGHT]:   'Send to Next Desktop',
  [ACTIONS.DESKTOP_SEND_LEFT]:    'Send to Previous Desktop',
  [ACTIONS.VOLUME_UP]:            'Volume Up',
  [ACTIONS.VOLUME_DOWN]:          'Volume Down',
  [ACTIONS.MUTE]:                 'Mute / Unmute',
  [ACTIONS.MEDIA_PLAY_PAUSE]:     'Play / Pause',
  [ACTIONS.MEDIA_NEXT]:           'Next Track',
  [ACTIONS.MEDIA_PREV]:           'Previous Track',
  [ACTIONS.BRIGHTNESS_UP]:        'Brightness Up',
  [ACTIONS.BRIGHTNESS_DOWN]:      'Brightness Down',
  [ACTIONS.NIGHT_MODE]:           'Toggle Night Mode',
  [ACTIONS.HUD_TOGGLE]:           'Summon / Banish',
  [ACTIONS.CHEAT_SHEET]:          'Gesture Reference',
  [ACTIONS.AUDIO_OUT_NEXT]:       'Next Output Device',
  [ACTIONS.AUDIO_IN_NEXT]:        'Next Input Device',
  [ACTIONS.BROWSER_FORWARD]:      'History Forward',
  [ACTIONS.BROWSER_BACK]:         'History Back',
  [ACTIONS.SCROLL_TOP]:           'Scroll to Top',
  [ACTIONS.SCROLL_BOTTOM]:        'Scroll to Bottom',
  [ACTIONS.ZOOM_IN]:              'Zoom In',
  [ACTIONS.ZOOM_OUT]:             'Zoom Out',
  [ACTIONS.SKIP_FORWARD]:         'Skip +30s',
  [ACTIONS.SKIP_BACK]:            'Skip -10s',
  [ACTIONS.TOGGLE_FULLSCREEN]:    'Toggle Fullscreen',
  [ACTIONS.PLAYBACK_SPEED]:       'Playback Speed',
  [ACTIONS.MEDIA_PLAY_PAUSE_APP]: 'Play / Pause',
  [ACTIONS.UNDO]:                 'Undo',
  [ACTIONS.REDO]:                 'Redo',
  [ACTIONS.BRUSH_SIZE_UP]:        'Brush Size Up',
  [ACTIONS.BRUSH_SIZE_DOWN]:      'Brush Size Down',
  [ACTIONS.LAYER_UP]:             'Layer Up',
  [ACTIONS.LAYER_DOWN]:           'Layer Down',
  [ACTIONS.GO_TO_DEFINITION]:     'Go to Definition',
  [ACTIONS.GO_BACK]:              'Go Back',
  [ACTIONS.LINE_MOVE_UP]:         'Move Line Up',
  [ACTIONS.LINE_MOVE_DOWN]:       'Move Line Down',
  [ACTIONS.APP_MIC_MUTE]:         'Mic Mute',
  [ACTIONS.CAMERA_ON]:            'Camera On',
  [ACTIONS.CAMERA_OFF]:           'Camera Off',
  [ACTIONS.RAISE_HAND]:           'Raise Hand',
  [ACTIONS.LEAVE_CALL]:           'Leave Call',
  [ACTIONS.NEXT_PAGE]:            'Next Page',
  [ACTIONS.PREV_PAGE]:            'Previous Page',
  [ACTIONS.FONT_SIZE_UP]:         'Font Size Up',
  [ACTIONS.FONT_SIZE_DOWN]:       'Font Size Down',
  [ACTIONS.READING_VIEW]:         'Reading View',
  [ACTIONS.DISCORD_MIC_TOGGLE]:   'Discord Mic',
  [ACTIONS.DISCORD_DEAFEN_TOGGLE]:'Discord Deafen',
  [ACTIONS.DISCORD_PTT]:          'Push to Talk',
  [ACTIONS.DISCORD_LEAVE]:        'Leave Voice',
  [ACTIONS.SPOTIFY_PLAY_PAUSE]:   'Spotify Play/Pause',
  [ACTIONS.SPOTIFY_NEXT]:         'Next Track',
  [ACTIONS.SPOTIFY_PREV]:         'Previous Track',
  [ACTIONS.SPOTIFY_VOLUME]:       'Spotify Volume',
})

// ── Layer 1 gesture maps per profile ─────────────────────────────────────────
// Key: gesture name. For directional gestures, key is "GESTURE:direction"
const LAYER1 = Object.freeze({
  [PROFILES.GLOBAL_BASE]: {
    [`${GESTURE_NAMES.TWO_FINGER_FLICK}:right`]: ACTIONS.APP_FORWARD,
    [`${GESTURE_NAMES.TWO_FINGER_FLICK}:left`]:  ACTIONS.APP_BACK,
    [`${GESTURE_NAMES.TWO_FINGER_FLICK}:up`]:    ACTIONS.WINDOW_MAXIMIZE,
    [`${GESTURE_NAMES.TWO_FINGER_FLICK}:down`]:  ACTIONS.WINDOW_MINIMIZE,
    [GESTURE_NAMES.PINCH]:                       ACTIONS.WINDOW_CLOSE,     // hold 500ms
    [GESTURE_NAMES.GUN_SHAPE]:                   ACTIONS.OVERVIEW,         // hold 300ms
    [GESTURE_NAMES.HANG_LOOSE]:                  ACTIONS.CLEAR_DESK,       // hold 300ms
    [`${GESTURE_NAMES.INDEX_POINT_TWIST}:cw`]:   ACTIONS.DESKTOP_RIGHT,
    [`${GESTURE_NAMES.INDEX_POINT_TWIST}:ccw`]:  ACTIONS.DESKTOP_LEFT,
    [GESTURE_NAMES.THUMBS_UP]:                   ACTIONS.VOLUME_UP,
    [GESTURE_NAMES.THUMBS_DOWN]:                 ACTIONS.VOLUME_DOWN,
    [GESTURE_NAMES.DIAL_ROTATE]:                 ACTIONS.MEDIA_PLAY_PAUSE, // double pinch in spec → dial here
  },
  [PROFILES.BROWSER]: {
    [`${GESTURE_NAMES.TWO_FINGER_FLICK}:right`]: ACTIONS.BROWSER_FORWARD,
    [`${GESTURE_NAMES.TWO_FINGER_FLICK}:left`]:  ACTIONS.BROWSER_BACK,
    [GESTURE_NAMES.THUMBS_UP]:                   ACTIONS.SCROLL_TOP,
    [GESTURE_NAMES.THUMBS_DOWN]:                 ACTIONS.SCROLL_BOTTOM,
    [GESTURE_NAMES.GUN_SHAPE]:                   ACTIONS.ZOOM_IN,
    [GESTURE_NAMES.HANG_LOOSE]:                  ACTIONS.ZOOM_OUT,
  },
  [PROFILES.MEDIA_PLAYER]: {
    [`${GESTURE_NAMES.TWO_FINGER_FLICK}:right`]: ACTIONS.SKIP_FORWARD,
    [`${GESTURE_NAMES.TWO_FINGER_FLICK}:left`]:  ACTIONS.SKIP_BACK,
    [GESTURE_NAMES.PINCH]:                       ACTIONS.MEDIA_PLAY_PAUSE_APP,
    [GESTURE_NAMES.GUN_SHAPE]:                   ACTIONS.TOGGLE_FULLSCREEN,
    [`${GESTURE_NAMES.INDEX_POINT_TWIST}:cw`]:   ACTIONS.PLAYBACK_SPEED,
    [`${GESTURE_NAMES.INDEX_POINT_TWIST}:ccw`]:  ACTIONS.PLAYBACK_SPEED,
  },
  [PROFILES.CREATIVE_TOOLS]: {
    [`${GESTURE_NAMES.TWO_FINGER_FLICK}:left`]:  ACTIONS.UNDO,
    [`${GESTURE_NAMES.TWO_FINGER_FLICK}:right`]: ACTIONS.REDO,
    [GESTURE_NAMES.THUMBS_UP]:                   ACTIONS.BRUSH_SIZE_UP,
    [GESTURE_NAMES.THUMBS_DOWN]:                 ACTIONS.BRUSH_SIZE_DOWN,
    [`${GESTURE_NAMES.INDEX_POINT_TWIST}:cw`]:   ACTIONS.LAYER_UP,
    [`${GESTURE_NAMES.INDEX_POINT_TWIST}:ccw`]:  ACTIONS.LAYER_DOWN,
  },
  [PROFILES.CODE_EDITOR]: {
    [`${GESTURE_NAMES.TWO_FINGER_FLICK}:right`]: ACTIONS.GO_TO_DEFINITION,
    [`${GESTURE_NAMES.TWO_FINGER_FLICK}:left`]:  ACTIONS.GO_BACK,
    [GESTURE_NAMES.THUMBS_UP]:                   ACTIONS.LINE_MOVE_UP,
    [GESTURE_NAMES.THUMBS_DOWN]:                 ACTIONS.LINE_MOVE_DOWN,
  },
  [PROFILES.COMMUNICATION]: {
    [GESTURE_NAMES.OPEN_PALM]:                   ACTIONS.APP_MIC_MUTE,     // overrides hardwired MUTE
    [GESTURE_NAMES.GUN_SHAPE]:                   ACTIONS.CAMERA_ON,
    [GESTURE_NAMES.HANG_LOOSE]:                  ACTIONS.CAMERA_OFF,
    [`${GESTURE_NAMES.TWO_FINGER_FLICK}:up`]:    ACTIONS.RAISE_HAND,
    [GESTURE_NAMES.PINCH]:                       ACTIONS.LEAVE_CALL,       // hold
  },
  [PROFILES.DOCUMENTS]: {
    [`${GESTURE_NAMES.TWO_FINGER_FLICK}:right`]: ACTIONS.NEXT_PAGE,
    [`${GESTURE_NAMES.TWO_FINGER_FLICK}:left`]:  ACTIONS.PREV_PAGE,
    [GESTURE_NAMES.THUMBS_UP]:                   ACTIONS.FONT_SIZE_UP,
    [GESTURE_NAMES.THUMBS_DOWN]:                 ACTIONS.FONT_SIZE_DOWN,
    [GESTURE_NAMES.GUN_SHAPE]:                   ACTIONS.READING_VIEW,
  }
})

// ── Layer 2 modifier overrides (merged over Layer 1) ─────────────────────────
const LAYER2 = Object.freeze({
  [`${GESTURE_NAMES.TWO_FINGER_FLICK}:right`]: ACTIONS.WINDOW_SNAP_RIGHT,
  [`${GESTURE_NAMES.TWO_FINGER_FLICK}:left`]:  ACTIONS.WINDOW_SNAP_LEFT,
  [`${GESTURE_NAMES.TWO_FINGER_FLICK}:up`]:    ACTIONS.WINDOW_NEXT_MONITOR,
  [`${GESTURE_NAMES.TWO_FINGER_FLICK}:down`]:  ACTIONS.WINDOW_PREV_MONITOR,
  [GESTURE_NAMES.PINCH]:                       ACTIONS.WINDOW_FORCE_QUIT, // hold 800ms
  [GESTURE_NAMES.GUN_SHAPE]:                   ACTIONS.DESKTOP_CREATE,    // hold 300ms
  [GESTURE_NAMES.HANG_LOOSE]:                  ACTIONS.DESKTOP_CLOSE,     // hold 300ms
  [`${GESTURE_NAMES.INDEX_POINT_TWIST}:cw`]:   ACTIONS.DESKTOP_SEND_RIGHT,
  [`${GESTURE_NAMES.INDEX_POINT_TWIST}:ccw`]:  ACTIONS.DESKTOP_SEND_LEFT,
  [GESTURE_NAMES.THUMBS_UP]:                   ACTIONS.BRIGHTNESS_UP,
  [GESTURE_NAMES.THUMBS_DOWN]:                 ACTIONS.BRIGHTNESS_DOWN,
  [GESTURE_NAMES.OPEN_PALM]:                   ACTIONS.NIGHT_MODE,
})

// ── Layer 3 gesture map (Discord + Spotify, both hands) ──────────────────────
const LAYER3 = Object.freeze({
  // Right hand
  [`${GESTURE_NAMES.INDEX_POINT_TWIST}:up`]:   ACTIONS.DISCORD_MIC_TOGGLE, // hold 400ms
  [GESTURE_NAMES.SNAP_TO_FIST]:                ACTIONS.DISCORD_DEAFEN_TOGGLE, // hold 400ms
  [GESTURE_NAMES.GUN_SHAPE]:                   ACTIONS.DISCORD_PTT,
  [GESTURE_NAMES.PINCH]:                       ACTIONS.DISCORD_LEAVE,      // hold 800ms
  [`${GESTURE_NAMES.TWO_FINGER_FLICK}:right`]: ACTIONS.SPOTIFY_NEXT,
  [`${GESTURE_NAMES.TWO_FINGER_FLICK}:left`]:  ACTIONS.SPOTIFY_PREV,
  [GESTURE_NAMES.THUMBS_UP]:                   ACTIONS.SPOTIFY_NEXT,
  [GESTURE_NAMES.THUMBS_DOWN]:                 ACTIONS.SPOTIFY_PREV,
  [GESTURE_NAMES.DIAL_ROTATE]:                 ACTIONS.SPOTIFY_VOLUME,
  // Left hand
  [`LEFT:${GESTURE_NAMES.TWO_FINGER_FLICK}:right`]: ACTIONS.AUDIO_OUT_NEXT,
  [`LEFT:${GESTURE_NAMES.TWO_FINGER_FLICK}:left`]:  ACTIONS.AUDIO_IN_NEXT,
})

// ── Hold durations per gesture per layer ─────────────────────────────────────
const GESTURE_HOLD_DURATIONS = Object.freeze({
  [GESTURE_NAMES.PINCH]: {
    layer1: HOLD_DURATIONS.PINCH_WINDOW_CLOSE,
    layer2: HOLD_DURATIONS.PINCH_FORCE_QUIT,
    layer3: HOLD_DURATIONS.PINCH_LEAVE_VOICE
  },
  [GESTURE_NAMES.GUN_SHAPE]: {
    layer1: HOLD_DURATIONS.GUN_SHAPE_OVERVIEW,
    layer2: HOLD_DURATIONS.GUN_SHAPE_OVERVIEW
  },
  [GESTURE_NAMES.HANG_LOOSE]: {
    layer1: HOLD_DURATIONS.HANG_LOOSE_CLEAR_DESK,
    layer2: HOLD_DURATIONS.HANG_LOOSE_CLEAR_DESK
  },
  [GESTURE_NAMES.PEACE_SIGN]: {
    layer1: HOLD_DURATIONS.PEACE_SIGN_CHEAT_SHEET
  },
  [`${GESTURE_NAMES.INDEX_POINT_TWIST}:up`]: {
    layer3: HOLD_DURATIONS.INDEX_UP_GO_QUIET
  },
  [GESTURE_NAMES.SNAP_TO_FIST]: {
    layer3: HOLD_DURATIONS.CLOSED_FIST_GO_DARK
  }
})

// Gestures that require a hold (not immediate fire)
const HOLD_GESTURES = new Set(Object.keys(GESTURE_HOLD_DURATIONS))

module.exports = { ACTIONS, ACTION_LABELS, HARDWIRED, LAYER1, LAYER2, LAYER3, GESTURE_HOLD_DURATIONS, HOLD_GESTURES }
