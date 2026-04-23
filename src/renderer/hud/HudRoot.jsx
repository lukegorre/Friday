import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import State1Strip from './components/State1Strip'
import State2Bar from './components/State2Bar'
import State3GestureSlot from './components/State3GestureSlot'
import State4CheatSheet from './components/State4CheatSheet'
import BackgroundPanel from './components/BackgroundPanel'

const DEFAULT_STATE = {
  hudState: 1, layer: 1, modifierActive: false, layer3Active: false,
  profile: 'globalBase', sensorStatus: 'disconnected',
  hudVisible: true, volume: null, brightness: null,
  outputAlias: null, inputAlias: null, gesture: null, confidence: null,
  actionDescription: null, gestureResult: null, cheatSheet: null,
  discord: { micMuted: false, deafened: false, inVoice: false, channelName: null },
  spotify: { name: null, artist: null, progress: 0, duration: 0, volume: null, playing: false }
}

export default function HudRoot() {
  const [state, setState] = useState(DEFAULT_STATE)

  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.onStateUpdate((update) => setState(s => ({ ...s, ...update })))
  }, [])

  if (!state.hudVisible) return null

  const commonBarProps = {
    profile:       state.profile,
    sensorStatus:  state.sensorStatus,
    modifierActive:state.modifierActive,
    volume:        state.volume,
    brightness:    state.brightness,
    outputAlias:   state.outputAlias,
    inputAlias:    state.inputAlias
  }

  return (
    <div id="root">
      {/* Layer 3 background panel — centered overlay */}
      <AnimatePresence>
        {state.layer3Active && (
          <BackgroundPanel
            discord={state.discord}
            spotify={state.spotify}
            volume={state.volume}
            brightness={state.brightness}
            outputAlias={state.outputAlias}
            inputAlias={state.inputAlias}
          />
        )}
      </AnimatePresence>

      {/* Cheat sheet overlay */}
      <AnimatePresence>
        {state.hudState === 4 && (
          <State4CheatSheet profile={state.profile} />
        )}
      </AnimatePresence>

      {/* Live panel — bottom-right corner */}
      {!state.layer3Active && state.hudState !== 4 && (
        <div className="hud-anchor">
          <AnimatePresence mode="sync">
            {state.hudState === 1 && (
              <motion.div key="s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <State1Strip {...commonBarProps} />
              </motion.div>
            )}
            {state.hudState === 2 && (
              <motion.div key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <State2Bar {...commonBarProps} />
              </motion.div>
            )}
            {state.hudState === 3 && (
              <motion.div key="s3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <State3GestureSlot
                  {...commonBarProps}
                  gesture={state.gesture}
                  actionDescription={state.actionDescription}
                  confidence={state.confidence}
                  gestureResult={state.gestureResult}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
