'use strict'

const psRunner = require('../ps-runner')

// Cycles audio devices using nircmd if available, else PowerShell AudioDeviceCmdlets.
// These are best-effort — silently fail if the required tools aren't present.

async function nextOutput() {
  try {
    await psRunner.run(`
      if (Get-Command Set-AudioDevice -ErrorAction SilentlyContinue) {
        $devices = Get-AudioDevice -List | Where-Object { $_.Type -eq 'Playback' }
        $current = Get-AudioDevice -Playback
        $idx = [array]::IndexOf($devices.ID, $current.ID)
        $next = $devices[($idx + 1) % $devices.Count]
        Set-AudioDevice -ID $next.ID | Out-Null
      }
    `)
  } catch (_) {}
}

async function nextInput() {
  try {
    await psRunner.run(`
      if (Get-Command Set-AudioDevice -ErrorAction SilentlyContinue) {
        $devices = Get-AudioDevice -List | Where-Object { $_.Type -eq 'Recording' }
        $current = Get-AudioDevice -Recording
        $idx = [array]::IndexOf($devices.ID, $current.ID)
        $next = $devices[($idx + 1) % $devices.Count]
        Set-AudioDevice -ID $next.ID | Out-Null
      }
    `)
  } catch (_) {}
}

async function listDevices() {
  try {
    const raw = await psRunner.run(`
      if (Get-Command Get-AudioDevice -ErrorAction SilentlyContinue) {
        Get-AudioDevice -List | Select-Object ID, Name, Type | ConvertTo-Json
      } else {
        Write-Output '[]'
      }
    `)
    return JSON.parse(raw || '[]')
  } catch (_) {
    return []
  }
}

module.exports = { nextOutput, nextInput, listDevices }
