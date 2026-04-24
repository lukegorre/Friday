'use strict'

const path = require('path')
const { app } = require('electron')
const psRunner = require('../ps-runner')

function getAssetPath(filename) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'assets', filename)
  }
  return path.join(__dirname, '../../../assets', filename)
}

function play(filename) {
  const filePath = getAssetPath(filename).replace(/\\/g, '\\\\')
  return psRunner.run(
    `(New-Object System.Media.SoundPlayer '${filePath}').Play()`
  ).catch(() => {})
}

module.exports = {
  playEnter: () => play('chime-enter.wav'),
  playExit:  () => play('chime-exit.wav')
}
