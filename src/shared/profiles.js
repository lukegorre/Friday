'use strict'

// Profile IDs
const PROFILES = Object.freeze({
  GLOBAL_BASE:    'globalBase',
  BROWSER:        'browser',
  MEDIA_PLAYER:   'mediaPlayer',
  CREATIVE_TOOLS: 'creativeTools',
  CODE_EDITOR:    'codeEditor',
  COMMUNICATION:  'communication',
  DOCUMENTS:      'documents'
})

// App matchers for auto-profile switching.
// processName: lowercased executable name without .exe
// titleContains: substrings checked against window title (lowercase)
const PROFILE_MATCHERS = Object.freeze({
  [PROFILES.BROWSER]: {
    processNames: ['chrome', 'firefox', 'arc', 'msedge', 'safari', 'brave', 'opera'],
    titleContains: []
  },
  [PROFILES.MEDIA_PLAYER]: {
    processNames: ['spotify', 'vlc', 'mpv', 'wmplayer', 'groove'],
    titleContains: [
      'youtube', 'netflix', 'twitch', 'hulu', 'disney+', 'prime video',
      'apple tv', 'peacock', 'hbo max', 'paramount+'
    ]
  },
  [PROFILES.CREATIVE_TOOLS]: {
    processNames: [
      'photoshop', 'illustrator', 'figma', 'xd', 'sketch',
      'affinitydesigner', 'affinityphoto', 'affinitypublisher',
      'inkscape', 'gimp', 'krita', 'blender'
    ],
    titleContains: []
  },
  [PROFILES.CODE_EDITOR]: {
    processNames: [
      'code', 'code - insiders', 'cursor', 'windsurf',
      'idea64', 'webstorm64', 'pycharm64', 'goland64', 'rider64',
      'sublime_text', 'atom', 'notepad++'
    ],
    titleContains: []
  },
  [PROFILES.COMMUNICATION]: {
    processNames: ['zoom', 'teams', 'discord', 'slack', 'webex', 'skype', 'meet'],
    titleContains: ['google meet', 'zoom meeting', 'microsoft teams']
  },
  [PROFILES.DOCUMENTS]: {
    processNames: [
      'winword', 'excel', 'powerpnt', 'onenote',
      'notion', 'obsidian', 'acrobat', 'sumatrapdf', 'foxitreader',
      'evince', 'okular'
    ],
    titleContains: []
  }
})

// Profile display names (for HUD and Config UI)
const PROFILE_LABELS = Object.freeze({
  [PROFILES.GLOBAL_BASE]:    'Global',
  [PROFILES.BROWSER]:        'Browser',
  [PROFILES.MEDIA_PLAYER]:   'Media',
  [PROFILES.CREATIVE_TOOLS]: 'Creative',
  [PROFILES.CODE_EDITOR]:    'Code',
  [PROFILES.COMMUNICATION]:  'Call',
  [PROFILES.DOCUMENTS]:      'Docs'
})

/**
 * Given active-win result, return the matching profile ID.
 * Returns GLOBAL_BASE if no profile matches.
 */
function resolveProfile(activeWinResult) {
  if (!activeWinResult) return PROFILES.GLOBAL_BASE

  const procName = (activeWinResult.owner?.name || '').toLowerCase().replace(/\.exe$/, '')
  const title    = (activeWinResult.title || '').toLowerCase()

  for (const [profileId, matchers] of Object.entries(PROFILE_MATCHERS)) {
    if (matchers.processNames.some(p => procName.includes(p))) return profileId
    if (matchers.titleContains.some(t => title.includes(t))) return profileId
  }

  return PROFILES.GLOBAL_BASE
}

module.exports = { PROFILES, PROFILE_MATCHERS, PROFILE_LABELS, resolveProfile }
