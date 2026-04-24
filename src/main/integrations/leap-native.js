'use strict'

const EventEmitter = require('events')
const path = require('path')

const LEAP_DLL_CANDIDATES = [
  path.join('C:', 'Program Files', 'Ultraleap', 'LeapSDK', 'lib', 'x64', 'LeapC.dll'),
  path.join('C:', 'Program Files', 'Ultraleap', 'Tracking', 'lib', 'x64', 'LeapC.dll'),
  path.join('C:', 'Program Files', 'Leap Motion', 'Core Services', 'LeapC.dll'),
  path.join('C:', 'Users', 'lukeg', 'OneDrive', 'Desktop',
    'LeapDeveloperKit_5.0.0-preview+52386_win', 'LeapSDK', 'lib', 'x64', 'LeapC.dll'),
]

const eLeapRS_Success              = 0x00000000
const eLeapEventType_Connection    = 1
const eLeapEventType_ConnectionLost = 2
const eLeapEventType_Device        = 3
const eLeapEventType_Tracking      = 0x100
const eLeapPolicyFlag_BackgroundFrames = 0x00000001
const eLeapTrackingMode_Desktop    = 0

// Module-level koffi state — initialized once
let koffi  = null
let lib    = null
let LEAP_VECTOR, LEAP_QUATERNION, LEAP_BONE, LEAP_DIGIT, LEAP_PALM, LEAP_HAND
let LEAP_FRAME_HEADER, LEAP_TRACKING_EVENT, LEAP_CONNECTION_MESSAGE
let LEAP_DEVICE_REF, LEAP_DEVICE_EVENT
let HAND_SIZE
let LeapCreateConnection, LeapOpenConnection, LeapPollConnection
let LeapSetPolicyFlags, LeapSetTrackingMode, LeapCloseConnection, LeapDestroyConnection
let LeapOpenDevice, LeapCloseDevice

function initKoffi() {
  if (lib) return true
  try {
    koffi = require('koffi')

    LEAP_VECTOR = koffi.pack('LEAP_VECTOR', {
      x: 'float', y: 'float', z: 'float',
    })
    LEAP_QUATERNION = koffi.pack('LEAP_QUATERNION', {
      x: 'float', y: 'float', z: 'float', w: 'float',
    })
    LEAP_BONE = koffi.pack('LEAP_BONE', {
      prev_joint: LEAP_VECTOR,
      next_joint: LEAP_VECTOR,
      width:      'float',
      rotation:   LEAP_QUATERNION,
    })
    LEAP_DIGIT = koffi.pack('LEAP_DIGIT', {
      finger_id:    'int32',
      metacarpal:   LEAP_BONE,
      proximal:     LEAP_BONE,
      intermediate: LEAP_BONE,
      distal:       LEAP_BONE,
      is_extended:  'uint32',
    })
    LEAP_PALM = koffi.pack('LEAP_PALM', {
      position:            LEAP_VECTOR,
      stabilized_position: LEAP_VECTOR,
      velocity:            LEAP_VECTOR,
      normal:              LEAP_VECTOR,
      width:               'float',
      direction:           LEAP_VECTOR,
      orientation:         LEAP_QUATERNION,
    })
    LEAP_HAND = koffi.pack('LEAP_HAND', {
      id:             'uint32',
      flags:          'uint32',
      hand_type:      'int32',    // renamed: 'type' conflicts with koffi internals
      confidence:     'float',
      visible_time:   'uint64',
      pinch_distance: 'float',
      grab_angle:     'float',
      pinch_strength: 'float',
      grab_strength:  'float',
      palm:           LEAP_PALM,
      thumb:          LEAP_DIGIT,
      index_digit:    LEAP_DIGIT, // renamed: 'index' conflicts with koffi internals
      middle:         LEAP_DIGIT,
      ring:           LEAP_DIGIT,
      pinky:          LEAP_DIGIT,
      arm:            LEAP_BONE,
    })
    LEAP_FRAME_HEADER = koffi.pack('LEAP_FRAME_HEADER', {
      reserved:  'void *',
      frame_id:  'int64',
      timestamp: 'int64',
    })
    LEAP_TRACKING_EVENT = koffi.pack('LEAP_TRACKING_EVENT', {
      info:              LEAP_FRAME_HEADER,
      tracking_frame_id: 'int64',
      nHands:            'uint32',
      pHands:            'void *',
      framerate:         'float',
    })
    LEAP_CONNECTION_MESSAGE = koffi.pack('LEAP_CONNECTION_MESSAGE', {
      size:    'uint32',
      type:    'int32',
      pointer: 'void *',
    })

    let loadedPath = null
    for (const candidate of LEAP_DLL_CANDIDATES) {
      try {
        lib = koffi.load(candidate)
        loadedPath = candidate
        break
      } catch {
        console.log(`[leap-native] not found: ${candidate}`)
      }
    }
    if (!lib) {
      console.error('[leap-native] LeapC.dll not found in any candidate path')
      return false
    }
    console.log(`[leap-native] loaded DLL: ${loadedPath}`)

    LeapCreateConnection  = lib.func('int32 LeapCreateConnection(void *config, _Out_ void **phConn)')
    LeapOpenConnection    = lib.func('int32 LeapOpenConnection(void *hConn)')
    LeapPollConnection    = lib.func('int32 LeapPollConnection(void *hConn, uint32 timeout, _Out_ LEAP_CONNECTION_MESSAGE *evt)')
    LeapSetPolicyFlags    = lib.func('int32 LeapSetPolicyFlags(void *hConn, uint32 set, uint32 clear)')
    LeapSetTrackingMode   = lib.func('int32 LeapSetTrackingMode(void *hConn, uint32 mode)')
    LeapCloseConnection   = lib.func('void LeapCloseConnection(void *hConn)')
    LeapDestroyConnection = lib.func('void LeapDestroyConnection(void *hConn)')

    // v5 SDK: device must be opened before hand data is emitted in tracking frames
    LEAP_DEVICE_REF = koffi.pack('LEAP_DEVICE_REF', {
      handle: 'void *',
      id:     'uint32',
    })
    LEAP_DEVICE_EVENT = koffi.pack('LEAP_DEVICE_EVENT', {
      flags:  'uint32',
      device: LEAP_DEVICE_REF,
      status: 'uint32',
    })
    LeapOpenDevice  = lib.func('int32 LeapOpenDevice(LEAP_DEVICE_REF rDevice, _Out_ void **phDevice)')
    LeapCloseDevice = lib.func('int32 LeapCloseDevice(void *hDevice)')

    HAND_SIZE = koffi.sizeof(LEAP_HAND)
    console.log(`[leap-native] koffi ready — LEAP_HAND=${HAND_SIZE}B tracking_event=${koffi.sizeof(LEAP_TRACKING_EVENT)}B`)
    return true
  } catch (err) {
    console.error('[leap-native] koffi init failed:', err.message)
    koffi = null
    lib = null
    return false
  }
}

// Per-hand tip position history for swipe velocity
const prevTip = new Map()  // handId → [x, y, z]
const prevTs  = new Map()  // handId → timestamp µs (as number)

function normVec3(arr) {
  const len = Math.sqrt(arr[0] ** 2 + arr[1] ** 2 + arr[2] ** 2)
  return len < 0.001 ? [0, 0, 1] : [arr[0] / len, arr[1] / len, arr[2] / len]
}

function serializeBone(b) {
  return {
    prevJoint: [b.prev_joint.x, b.prev_joint.y, b.prev_joint.z],
    nextJoint: [b.next_joint.x, b.next_joint.y, b.next_joint.z],
    width: b.width,
  }
}

function serializeDigit(digit, fingerType) {
  const bones = [
    serializeBone(digit.metacarpal),
    serializeBone(digit.proximal),
    serializeBone(digit.intermediate),
    serializeBone(digit.distal),
  ]
  const distal = bones[3]
  return {
    type:        fingerType,
    finger_id:   digit.finger_id,
    extended:    digit.is_extended !== 0,
    tipPosition: distal.nextJoint,
    direction:   normVec3([
      distal.nextJoint[0] - distal.prevJoint[0],
      distal.nextJoint[1] - distal.prevJoint[1],
      distal.nextJoint[2] - distal.prevJoint[2],
    ]),
    bones,
  }
}

function serializeHand(hand, timestamp) {
  // timestamp is µs (Number after BigInt conversion)
  // field names use renamed versions to avoid koffi internal conflicts:
  //   hand_type instead of type,  index_digit instead of index
  const digits = [hand.thumb, hand.index_digit, hand.middle, hand.ring, hand.pinky]
  const id = hand.id

  // Compute index tip velocity for swipe detection
  const indexDistal = digits[1]?.distal
  const tip = indexDistal
    ? [indexDistal.next_joint.x, indexDistal.next_joint.y, indexDistal.next_joint.z]
    : [0, 0, 0]
  let tipVelocity = [0, 0, 0]
  if (prevTip.has(id) && prevTs.has(id)) {
    const dtSec = (timestamp - prevTs.get(id)) * 1e-6
    if (dtSec > 0 && dtSec < 0.15) {
      const p = prevTip.get(id)
      tipVelocity = [
        (tip[0] - p[0]) / dtSec,
        (tip[1] - p[1]) / dtSec,
        (tip[2] - p[2]) / dtSec,
      ]
    }
  }
  prevTip.set(id, tip)
  prevTs.set(id, timestamp)

  const fingers = digits.map((d, i) => {
    const f = serializeDigit(d, i)
    f.tipVelocity = i === 1 ? tipVelocity : [0, 0, 0]
    return f
  })

  return {
    id,
    type:          hand.hand_type === 0 ? 'left' : 'right',
    confidence:    hand.confidence,
    pinchStrength: hand.pinch_strength,
    grabStrength:  hand.grab_strength,
    pinchDistance: hand.pinch_distance,
    palmPosition:  [hand.palm.position.x,  hand.palm.position.y,  hand.palm.position.z],
    palmVelocity:  [hand.palm.velocity.x,  hand.palm.velocity.y,  hand.palm.velocity.z],
    palmNormal:    [hand.palm.normal.x,    hand.palm.normal.y,    hand.palm.normal.z],
    fingers,
  }
}

class LeapNative extends EventEmitter {
  constructor() {
    super()
    this._status       = 'waiting'
    this._running      = false
    this._hConn        = null
    this._timer        = null
    this._firstFrame   = true
    this._firstHand    = true
    this._frameCount   = 0
    this._prevNHands   = 0
  }

  get status() { return this._status }

  start() {
    if (this._running) return
    this._running = true
    this._init().catch(err => {
      console.error('[leap-native] start error:', err)
      this._setStatus('error')
    })
  }

  stop() {
    this._running = false
    if (this._timer) { clearInterval(this._timer); this._timer = null }
    if (this._hConn && lib) {
      try { LeapCloseConnection(this._hConn) } catch {}
      try { LeapDestroyConnection(this._hConn) } catch {}
      this._hConn = null
    }
  }

  _setStatus(s) {
    this._status = s
    this.emit('status', s)
  }

  async _init() {
    if (!initKoffi()) { this._setStatus('error'); return }

    const hConnArr = [null]
    const rsCreate = LeapCreateConnection(null, hConnArr)
    if (rsCreate !== eLeapRS_Success) {
      console.error('[leap-native] LeapCreateConnection failed:', rsCreate)
      this._setStatus('error')
      return
    }
    this._hConn = hConnArr[0]

    const rsOpen = LeapOpenConnection(this._hConn)
    if (rsOpen !== eLeapRS_Success) {
      console.error('[leap-native] LeapOpenConnection failed:', rsOpen)
      this._setStatus('error')
      return
    }

    console.log('[leap-native] polling started')
    this._timer = setInterval(() => this._poll(), 8)
  }

  _poll() {
    if (!this._running || !this._hConn) return
    let lastFrame = null
    try {
      // Drain the entire LeapC buffer each tick — keeping only the freshest tracking
      // frame eliminates the backlog that causes the ~10-second lag.
      while (true) {
        const msg = {}
        const rs  = LeapPollConnection(this._hConn, 0, msg)
        if (rs !== eLeapRS_Success) break
        if (msg.type === eLeapEventType_Tracking) {
          // Decode immediately — pointer is valid only until the next LeapPollConnection call
          const decoded = this._decodeTracking(msg)
          if (decoded) lastFrame = decoded
        } else {
          this._handleMessage(msg)
        }
      }
      if (lastFrame) this._emitFrame(lastFrame)
    } catch (err) {
      console.error('[leap-native] poll error:', err.message)
    }
  }

  _decodeTracking(msg) {
    if (!msg.pointer) return null
    try {
      const ev        = koffi.decode(msg.pointer, LEAP_TRACKING_EVENT)
      const timestamp = Number(ev.info.timestamp)
      const n         = ev.nHands
      const hands     = []
      if (n > 0) {
        const pHands = koffi.decode(msg.pointer, 36, 'void *')
        if (pHands) {
          for (let i = 0; i < n; i++) {
            try {
              const raw = koffi.decode(pHands, i * HAND_SIZE, LEAP_HAND)
              hands.push(serializeHand(raw, timestamp))
            } catch (err) {
              console.error(`[leap-native] hand[${i}] decode failed:`, err.message)
            }
          }
        }
      }
      return { timestamp, fps: Math.round(ev.framerate), nHands: n, hands }
    } catch (err) {
      console.error('[leap-native] tracking decode error:', err.message)
      return null
    }
  }

  _emitFrame({ timestamp, fps, nHands, hands }) {
    if (this._firstFrame) {
      console.log(`[leap-native] first tracking frame — fps=${fps}`)
      this._firstFrame = false
    }
    this._frameCount++
    if (this._frameCount % 330 === 0)
      console.log(`[leap-native] alive #${this._frameCount} fps=${fps}`)

    if (nHands !== this._prevNHands) {
      console.log(`[leap-native] nHands changed: ${this._prevNHands} → ${nHands}`)
      this._prevNHands = nHands
    }

    if (this._frameCount % 55 === 0 && hands.length > 0) {
      const p = hands[0].palmPosition
      console.log(`[leap-hand] type:${hands[0].type} palm:[${p.map(v => v.toFixed(0)).join(',')}]mm conf:${hands[0].confidence?.toFixed(2)}`)
    }

    this.emit('frame', { timestamp, fps, hands })
  }

  _handleMessage(msg) {
    const type = msg.type
    if (type === eLeapEventType_Connection) {
      console.log('[leap-native] service connected — requesting background frames')
      LeapSetPolicyFlags(this._hConn, eLeapPolicyFlag_BackgroundFrames, 0)
      this._setStatus('connected')
    } else if (type === eLeapEventType_ConnectionLost) {
      console.log('[leap-native] service connection lost')
      this._setStatus('waiting')
    } else if (type === eLeapEventType_Device) {
      if (!msg.pointer) return
      try {
        const ev = koffi.decode(msg.pointer, LEAP_DEVICE_EVENT)
        const streaming = (ev.status & 0x1) !== 0
        const paused    = (ev.status & 0x2) !== 0
        console.log(`[leap-native] device event id=${ev.device.id} status=0x${ev.status.toString(16)} streaming=${streaming} paused=${paused}`)
        const deviceArr = [null]
        const rs = LeapOpenDevice(ev.device, deviceArr)
        console.log(`[leap-native] LeapOpenDevice rs=${rs}`)
        if (rs === 0 && deviceArr[0]) {
          // Match the official sample: open, then immediately close — streaming is managed by the service
          LeapCloseDevice(deviceArr[0])
        }
      } catch (err) {
        console.error('[leap-native] device open error:', err.message)
      }
    } else if (type === 0x107) {
      // eLeapEventType_DeviceStatusChange
      if (msg.pointer) {
        try {
          // struct: LEAP_DEVICE_REF device (12B), uint32 last_status, uint32 status
          const lastStatus = koffi.decode(msg.pointer, 12, 'uint32')
          const curStatus  = koffi.decode(msg.pointer, 16, 'uint32')
          console.log(`[leap-native] DeviceStatusChange last=0x${lastStatus.toString(16)} cur=0x${curStatus.toString(16)} streaming=${(curStatus & 1) !== 0}`)
        } catch {}
      }
    } else if (type === 0x10B) {
      // eLeapEventType_TrackingMode — log it
      console.log('[leap-native] TrackingMode event received')
    } else if (type !== eLeapEventType_Tracking && type !== 5 && type !== 0 && type !== 0x108) {
      // Log unexpected event types (skip Policy=5, None=0, DroppedFrame=0x108)
      console.log(`[leap-native] unhandled event type=${type} (0x${type.toString(16)})`)
    }
  }
}

module.exports = new LeapNative()
