'use strict'

// Re-export from actions/audio-routing for use in pipeline
const { nextOutput, nextInput, listDevices } = require('../actions/audio-routing')
module.exports = { nextOutput, nextInput, listDevices }
