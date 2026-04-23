'use strict'

const net = require('net')
const { setState } = require('../state/app-state')

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '0'
const OPCODES = { HANDSHAKE: 0, FRAME: 1, CLOSE: 2, PING: 3, PONG: 4 }
const RECONNECT_DELAY = 5000

let _socket = null
let _connected = false
let _reconnectTimer = null
let _nonce = 0
let _voiceState = { micMuted: false, deafened: false, inVoice: false, channelName: null }

function encode(opcode, payload) {
  const json = JSON.stringify(payload)
  const buf  = Buffer.alloc(8 + Buffer.byteLength(json))
  buf.writeUInt32LE(opcode, 0)
  buf.writeUInt32LE(Buffer.byteLength(json), 4)
  buf.write(json, 8)
  return buf
}

function decode(buf) {
  if (buf.length < 8) return null
  const opcode = buf.readUInt32LE(0)
  const length = buf.readUInt32LE(4)
  if (buf.length < 8 + length) return null
  try {
    const json = JSON.parse(buf.slice(8, 8 + length).toString())
    return { opcode, data: json }
  } catch (_) { return null }
}

function connect() {
  if (_connected) return
  tryPipeIndex(0)
}

function tryPipeIndex(index) {
  if (index > 9) {
    scheduleReconnect()
    return
  }

  const pipePath = `\\\\.\\pipe\\discord-ipc-${index}`
  const socket = net.createConnection(pipePath)

  socket.once('connect', () => {
    _socket = socket
    _connected = true
    setState({ sensorStatus: 'degraded' }) // mark as "partially connected"

    // Handshake
    socket.write(encode(OPCODES.HANDSHAKE, { v: 1, client_id: DISCORD_CLIENT_ID }))
  })

  let _readBuf = Buffer.alloc(0)
  socket.on('data', (data) => {
    _readBuf = Buffer.concat([_readBuf, data])
    while (_readBuf.length >= 8) {
      const length = _readBuf.readUInt32LE(4)
      if (_readBuf.length < 8 + length) break
      const msg = decode(_readBuf)
      _readBuf = _readBuf.slice(8 + length)
      if (msg) handleMessage(msg)
    }
  })

  socket.once('error', () => {
    socket.destroy()
    tryPipeIndex(index + 1)
  })

  socket.once('close', () => {
    _socket = null
    _connected = false
    scheduleReconnect()
  })
}

function scheduleReconnect() {
  if (_reconnectTimer) return
  _reconnectTimer = setTimeout(() => {
    _reconnectTimer = null
    connect()
  }, RECONNECT_DELAY)
}

function handleMessage({ opcode, data }) {
  if (!data) return

  if (data.evt === 'VOICE_STATE_UPDATE' || data.evt === 'SPEAKING') {
    const user = data.data?.user
    if (user?.self_mute !== undefined) _voiceState.micMuted = user.self_mute
    if (user?.self_deaf !== undefined) _voiceState.deafened = user.self_deaf
    setState({ discord: { ..._voiceState } })
  }

  if (data.evt === 'VOICE_CHANNEL_SELECT') {
    const channelId = data.data?.channel_id
    _voiceState.inVoice = !!channelId
    _voiceState.channelName = channelId ? 'Voice Channel' : null
    setState({ discord: { ..._voiceState } })
  }
}

function sendCommand(command) {
  if (!_socket || !_connected) return Promise.resolve()
  const nonce = String(++_nonce)

  const commandMap = {
    TOGGLE_MIC:     { cmd: 'TOGGLE_SELF_MUTE' },
    TOGGLE_DEAFEN:  { cmd: 'TOGGLE_SELF_DEAF' },
    PTT_TOGGLE:     { cmd: 'PUSH_TO_TALK', args: { active: true } },
    DISCONNECT:     { cmd: 'SELECT_VOICE_CHANNEL', args: { channel_id: null } }
  }

  const mapping = commandMap[command]
  if (!mapping) return Promise.resolve()

  _socket.write(encode(OPCODES.FRAME, {
    cmd:   mapping.cmd,
    args:  mapping.args || {},
    nonce
  }))

  return Promise.resolve()
}

function disconnect() {
  if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null }
  if (_socket) { _socket.destroy(); _socket = null }
  _connected = false
}

module.exports = { connect, disconnect, sendCommand, isConnected: () => _connected }
