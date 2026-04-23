'use strict'

const https = require('https')
const { shell, app } = require('electron')
const crypto = require('crypto')
const store = require('../store/config-store')
const { setState } = require('../state/app-state')

const CLIENT_ID       = process.env.SPOTIFY_CLIENT_ID || ''
const REDIRECT_URI    = 'friday://spotify-callback'
const SCOPE           = 'user-read-playback-state user-modify-playback-state user-read-currently-playing'
const API_BASE        = 'https://api.spotify.com/v1'
const TOKEN_URL       = 'https://accounts.spotify.com/api/token'
const ACCOUNTS_AUTHED = 'https://accounts.spotify.com/authorize'

let _codeVerifier = null
let _pollInterval = null

// ── PKCE helpers ──────────────────────────────────────────────────────────────
function generateVerifier() {
  return crypto.randomBytes(32).toString('base64url')
}

function generateChallenge(verifier) {
  return crypto.createHash('sha256').update(verifier).digest('base64url')
}

// ── Auth flow ─────────────────────────────────────────────────────────────────
function startAuth() {
  _codeVerifier = generateVerifier()
  const challenge = generateChallenge(_codeVerifier)
  const params = new URLSearchParams({
    client_id:             CLIENT_ID,
    response_type:         'code',
    redirect_uri:          REDIRECT_URI,
    scope:                 SCOPE,
    code_challenge_method: 'S256',
    code_challenge:        challenge
  })
  const url = `${ACCOUNTS_AUTHED}?${params}`
  shell.openExternal(url)
  return url
}

async function handleCallback(callbackUrl) {
  const url   = new URL(callbackUrl)
  const code  = url.searchParams.get('code')
  if (!code || !_codeVerifier) return false

  try {
    const tokens = await post(TOKEN_URL, {
      client_id:     CLIENT_ID,
      grant_type:    'authorization_code',
      code,
      redirect_uri:  REDIRECT_URI,
      code_verifier: _codeVerifier
    }, 'application/x-www-form-urlencoded')

    store.set('spotifyTokens', {
      accessToken:  tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt:    Date.now() + tokens.expires_in * 1000
    })
    _codeVerifier = null
    return true
  } catch (_) { return false }
}

async function refreshTokens() {
  const { refreshToken } = store.get('spotifyTokens')
  if (!refreshToken) return false

  try {
    const tokens = await post(TOKEN_URL, {
      client_id:     CLIENT_ID,
      grant_type:    'refresh_token',
      refresh_token: refreshToken
    }, 'application/x-www-form-urlencoded')

    store.set('spotifyTokens', {
      accessToken:  tokens.access_token,
      refreshToken: tokens.refresh_token || refreshToken,
      expiresAt:    Date.now() + tokens.expires_in * 1000
    })
    return true
  } catch (_) {
    store.set('spotifyTokens', { accessToken: null, refreshToken: null, expiresAt: null })
    return false
  }
}

async function getAccessToken() {
  const { accessToken, expiresAt } = store.get('spotifyTokens')
  if (!accessToken) return null
  if (Date.now() > (expiresAt || 0) - 60000) {
    const ok = await refreshTokens()
    if (!ok) return null
  }
  return store.get('spotifyTokens').accessToken
}

// ── API calls ─────────────────────────────────────────────────────────────────
async function apiRequest(method, path, body) {
  const token = await getAccessToken()
  if (!token) return null
  try {
    return await request(`${API_BASE}${path}`, method, token, body)
  } catch (_) { return null }
}

async function playPause() {
  const state = await apiRequest('GET', '/me/player')
  if (!state) return
  if (state.is_playing) await apiRequest('PUT', '/me/player/pause')
  else await apiRequest('PUT', '/me/player/play')
}

async function next()  { await apiRequest('POST', '/me/player/next') }
async function prev()  { await apiRequest('POST', '/me/player/previous') }

async function adjustVolume(delta) {
  const state = await apiRequest('GET', '/me/player')
  if (!state) return
  const current = state.device?.volume_percent ?? 50
  const next = Math.max(0, Math.min(100, current + delta))
  await apiRequest('PUT', `/me/player/volume?volume_percent=${next}`)
}

async function pollTrack() {
  const state = await apiRequest('GET', '/me/player/currently-playing')
  if (!state?.item) return
  setState({
    spotify: {
      name:     state.item.name,
      artist:   state.item.artists?.map(a => a.name).join(', ') || '',
      progress: state.progress_ms || 0,
      duration: state.item.duration_ms || 0,
      playing:  state.is_playing,
      volume:   null
    }
  })
}

function startPolling() {
  if (_pollInterval) return
  _pollInterval = setInterval(pollTrack, 3000)
}

function stopPolling() {
  if (_pollInterval) { clearInterval(_pollInterval); _pollInterval = null }
}

function isConnected() {
  return !!store.get('spotifyTokens').accessToken
}

function revoke() {
  store.set('spotifyTokens', { accessToken: null, refreshToken: null, expiresAt: null })
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function request(url, method, token, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const options = {
      hostname: u.hostname, port: 443, path: u.pathname + u.search,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json'
      }
    }
    if (body) options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body))

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(data ? JSON.parse(data) : null) } catch (_) { resolve(null) }
        } else {
          reject(new Error(`Spotify API ${res.statusCode}`))
        }
      })
    })
    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

function post(url, params, contentType) {
  return new Promise((resolve, reject) => {
    const body = contentType === 'application/x-www-form-urlencoded'
      ? new URLSearchParams(params).toString()
      : JSON.stringify(params)
    const u = new URL(url)
    const options = {
      hostname: u.hostname, port: 443, path: u.pathname,
      method: 'POST',
      headers: { 'Content-Type': contentType, 'Content-Length': Buffer.byteLength(body) }
    }
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch (_) { reject(new Error('Parse error')) }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

module.exports = { startAuth, handleCallback, playPause, next, prev, adjustVolume, startPolling, stopPolling, isConnected, revoke }
