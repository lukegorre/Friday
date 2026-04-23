'use strict'

const activeWin = require('active-win')
const { resolveProfile } = require('../../shared/profiles')
const { setState, getState } = require('./app-state')

const POLL_INTERVAL = 500

let _intervalId = null
let _lastProfile = null

async function poll() {
  try {
    const result = await activeWin()
    const profile = resolveProfile(result)
    if (profile !== _lastProfile) {
      _lastProfile = profile
      setState({ profile })
    }
  } catch (_) {
    // active-win can fail if no windows are open — silently ignore
  }
}

function start() {
  if (_intervalId) return
  poll()
  _intervalId = setInterval(poll, POLL_INTERVAL)
}

function stop() {
  if (_intervalId) {
    clearInterval(_intervalId)
    _intervalId = null
  }
}

module.exports = { start, stop }
