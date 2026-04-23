'use strict'

const Store = require('electron-store')

const schema = {
  deviceAliases: {
    type: 'object',
    additionalProperties: { type: 'string' },
    default: {}
  },
  gestureRemaps: {
    type: 'object',
    additionalProperties: {
      type: 'object',
      additionalProperties: { type: 'string' }
    },
    default: {}
  },
  hudPosition: {
    type: 'object',
    properties: {
      x: { type: ['number', 'null'] },
      y: { type: ['number', 'null'] }
    },
    default: { x: null, y: null }
  },
  spotifyTokens: {
    type: 'object',
    properties: {
      accessToken:  { type: ['string', 'null'] },
      refreshToken: { type: ['string', 'null'] },
      expiresAt:    { type: ['number', 'null'] }
    },
    default: { accessToken: null, refreshToken: null, expiresAt: null }
  },
  hudVisible: {
    type: 'boolean',
    default: true
  },
  profiles: {
    type: 'object',
    default: {
      globalBase:    { enabled: true },
      browser:       { enabled: true },
      mediaPlayer:   { enabled: true },
      creativeTools: { enabled: true },
      codeEditor:    { enabled: true },
      communication: { enabled: true },
      documents:     { enabled: true }
    }
  }
}

const store = new Store({ schema, name: 'friday-config' })

module.exports = store
