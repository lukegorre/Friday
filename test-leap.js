'use strict'
// Minimal raw LeapC test — run with: node test-leap.js
// Hold your hand above the sensor and watch for nHands > 0
const koffi = require('koffi')

const DLL = 'C:\\Users\\lukeg\\OneDrive\\Desktop\\LeapDeveloperKit_5.0.0-preview+52386_win\\LeapSDK\\lib\\x64\\LeapC.dll'
const lib = koffi.load(DLL)

const LEAP_FRAME_HEADER = koffi.pack('LEAP_FRAME_HEADER', {
  reserved: 'void *', frame_id: 'int64', timestamp: 'int64',
})
const LEAP_TRACKING_EVENT = koffi.pack('LEAP_TRACKING_EVENT', {
  info: LEAP_FRAME_HEADER, tracking_frame_id: 'int64',
  nHands: 'uint32', pHands: 'void *', framerate: 'float',
})
const LEAP_CONNECTION_MESSAGE = koffi.pack('LEAP_CONNECTION_MESSAGE', {
  size: 'uint32', type: 'int32', pointer: 'void *',
})
const LEAP_DEVICE_REF = koffi.pack('LEAP_DEVICE_REF', {
  handle: 'void *', id: 'uint32',
})
const LEAP_DEVICE_EVENT = koffi.pack('LEAP_DEVICE_EVENT', {
  flags: 'uint32', device: LEAP_DEVICE_REF, status: 'uint32',
})

const LeapCreateConnection = lib.func('int32 LeapCreateConnection(void *config, _Out_ void **phConn)')
const LeapOpenConnection   = lib.func('int32 LeapOpenConnection(void *hConn)')
const LeapPollConnection   = lib.func('int32 LeapPollConnection(void *hConn, uint32 timeout, _Out_ LEAP_CONNECTION_MESSAGE *evt)')
const LeapOpenDevice       = lib.func('int32 LeapOpenDevice(LEAP_DEVICE_REF rDevice, _Out_ void **phDevice)')

const hConnArr = [null]
console.log('create:', LeapCreateConnection(null, hConnArr))
console.log('open:  ', LeapOpenConnection(hConnArr[0]))
const hConn = hConnArr[0]

let frames = 0
const start = Date.now()
const poll = setInterval(() => {
  const msg = {}
  const rs = LeapPollConnection(hConn, 0, msg)
  if (rs !== 0) return

  if (msg.type === 0x100) { // tracking
    const ev = koffi.decode(msg.pointer, LEAP_TRACKING_EVENT)
    frames++
    if (frames % 110 === 0 || ev.nHands > 0) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1)
      console.log(`[${elapsed}s] frame=${frames} nHands=${ev.nHands} fps=${Math.round(ev.framerate)}`)
    }
  } else if (msg.type === 1) {
    console.log('CONNECTED')
  } else if (msg.type === 3) {
    const ev = koffi.decode(msg.pointer, LEAP_DEVICE_EVENT)
    const devArr = [null]
    const rs2 = LeapOpenDevice(ev.device, devArr)
    console.log(`DEVICE EVENT — LeapOpenDevice rs=${rs2} id=${ev.device.id}`)
  }
}, 8)

setTimeout(() => { clearInterval(poll); process.exit(0) }, 30000)
console.log('Running for 30s — hold your hand above the sensor now...')
