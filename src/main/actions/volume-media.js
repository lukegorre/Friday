'use strict'

const psRunner = require('../ps-runner')

// VK codes for media keys
const VK = {
  VOLUME_MUTE:       0xAD,
  VOLUME_DOWN:       0xAE,
  VOLUME_UP:         0xAF,
  MEDIA_NEXT_TRACK:  0xB0,
  MEDIA_PREV_TRACK:  0xB1,
  MEDIA_STOP:        0xB2,
  MEDIA_PLAY_PAUSE:  0xB3
}

async function adjustVolume(delta) {
  // delta: float -1.0 to +1.0
  const current = parseFloat(await psRunner.run('[AudioManager]::GetVolume()')) || 0
  const next = Math.max(0, Math.min(1, current + delta))
  await psRunner.run(`[AudioManager]::SetVolume(${next.toFixed(4)})`)
  return Math.round(next * 100)
}

async function getVolume() {
  const v = parseFloat(await psRunner.run('[AudioManager]::GetVolume()'))
  return isNaN(v) ? null : Math.round(v * 100)
}

async function toggleMute() {
  await psRunner.run('[AudioManager]::ToggleMute()')
}

async function sendMediaKey(vk) {
  await psRunner.run(`[MediaKey]::Send(${vk})`)
}

module.exports = {
  volumeUp:    () => adjustVolume(0.1),
  volumeDown:  () => adjustVolume(-0.1),
  toggleMute,
  getVolume,
  playPause:   () => sendMediaKey(VK.MEDIA_PLAY_PAUSE),
  nextTrack:   () => sendMediaKey(VK.MEDIA_NEXT_TRACK),
  prevTrack:   () => sendMediaKey(VK.MEDIA_PREV_TRACK),
}
