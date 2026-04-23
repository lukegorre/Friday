'use strict'

const WebSocket    = require('ws')
const EventEmitter = require('events')

const LEAP_WS_URL     = 'ws://127.0.0.1:6437/v6.json'
const RETRY_DELAY_MS  = 2000

class LeapWS extends EventEmitter {
  constructor() {
    super()
    this._ws      = null
    this._retry   = null
    this._running = false
    this._status  = 'waiting'
  }

  get status() { return this._status }

  start() {
    this._running = true
    this._connect()
  }

  stop() {
    this._running = false
    clearTimeout(this._retry)
    if (this._ws) { try { this._ws.close() } catch {} }
  }

  _connect() {
    if (!this._running) return
    const ws = new WebSocket(LEAP_WS_URL)
    this._ws = ws

    ws.on('open', () => {
      this._status = 'connected'
      this.emit('status', 'connected')
    })

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString())
        if (!Array.isArray(data.hands)) return
        const pointables = Array.isArray(data.pointables) ? data.pointables : []
        const hands = data.hands.map(h => ({
          ...h,
          fingers: pointables.filter(p => p.handId === h.id)
        }))
        this.emit('frame', { ...data, hands })
      } catch {}
    })

    ws.on('error', () => { this._status = 'error'; this.emit('status', 'error') })

    ws.on('close', () => {
      this._status = 'waiting'
      this.emit('status', 'waiting')
      if (this._running) this._retry = setTimeout(() => this._connect(), RETRY_DELAY_MS)
    })
  }
}

module.exports = new LeapWS()
