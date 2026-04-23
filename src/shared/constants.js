'use strict'

const { EventEmitter } = require('events')

const GESTURE_NAMES = Object.freeze({
  TWO_FINGER_FLICK:  'TWO_FINGER_FLICK',
  PINCH:             'PINCH',
  GUN_SHAPE:         'GUN_SHAPE',
  HANG_LOOSE:        'HANG_LOOSE',
  THUMBS_UP:         'THUMBS_UP',
  THUMBS_DOWN:       'THUMBS_DOWN',
  INDEX_POINT_TWIST: 'INDEX_POINT_TWIST',
  OPEN_PALM:         'OPEN_PALM',
  SNAP_TO_FIST:      'SNAP_TO_FIST',
  PEACE_SIGN:        'PEACE_SIGN',
  WRIST_SHOO:        'WRIST_SHOO',
  DIAL_ROTATE:       'DIAL_ROTATE',
})

const GESTURE_EVENTS = Object.freeze({
  HAND_ENTER:        'hand:enter',
  HAND_EXIT:         'hand:exit',
  HAND_UPDATE:       'hand:update',
  GESTURE_FORMING:   'gesture:forming',
  GESTURE_FIRE:      'gesture:fire',
  GESTURE_CANCELLED: 'gesture:cancelled',
  HOLD_START:        'gesture:hold:start',
  HOLD_PROGRESS:     'gesture:hold:progress',
  HOLD_COMPLETE:     'gesture:hold:complete',
  HOLD_CANCEL:       'gesture:hold:cancel',
  DIAL_CHANGE:       'dial:change',
  MODIFIER_ENTER:    'modifier:enter',
  MODIFIER_EXIT:     'modifier:exit',
  LAYER3_ENTER:      'layer3:enter',
  LAYER3_EXIT:       'layer3:exit',
})

const TIMING = Object.freeze({
  CONFIDENCE_THRESHOLD:             0.82,
  COOLDOWN_MS:                      350,
  MODIFIER_VELOCITY_THRESHOLD_MM_S: 15,
  LAYER3_HOLD_MS:                   800,
  DIAL_DEAD_ZONE_DEGREES:           15,
})

const HOLD_DURATIONS = Object.freeze({
  PINCH_WINDOW_CLOSE:     500,
  GUN_SHAPE_OVERVIEW:     300,
  HANG_LOOSE_CLEAR_DESK:  300,
  PEACE_SIGN_CHEAT_SHEET: 600,
  PINCH_FORCE_QUIT:       800,
  PINCH_LEAVE_VOICE:      800,
  INDEX_UP_GO_QUIET:      400,
  CLOSED_FIST_GO_DARK:    400,
})

const ACTIVATION_ZONE = Object.freeze({
  WIDTH_CM:              40,
  DEPTH_CM:              30,
  HEIGHT_CM:             25,
  OFFSET_FROM_SENSOR_CM: 5,
})

class GestureInputProvider extends EventEmitter {
  connect()                    { throw new Error('Not implemented: connect()') }
  disconnect()                 { throw new Error('Not implemented: disconnect()') }
  isConnected()                { throw new Error('Not implemented: isConnected()') }
  getConfidenceThreshold()     { throw new Error('Not implemented: getConfidenceThreshold()') }
  getCooldownMs()              { throw new Error('Not implemented: getCooldownMs()') }
  getModifierVelocityThreshold() { throw new Error('Not implemented: getModifierVelocityThreshold()') }
}

module.exports = {
  GESTURE_NAMES,
  GESTURE_EVENTS,
  TIMING,
  HOLD_DURATIONS,
  ACTIVATION_ZONE,
  GestureInputProvider,
}
