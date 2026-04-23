'use strict'

const spotifyClient = require('../integrations/spotify-client')

module.exports = {
  playPause:      () => spotifyClient.playPause(),
  next:           () => spotifyClient.next(),
  prev:           () => spotifyClient.prev(),
  adjustVolume:   (delta) => spotifyClient.adjustVolume(delta)
}
