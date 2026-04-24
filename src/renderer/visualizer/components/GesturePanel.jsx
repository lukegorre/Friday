import React, { useState, useRef, useEffect } from 'react'
import { classifyGestures } from '../lib/gestureClassifier'
import { classifySwipes }   from '../lib/swipeClassifier'

const CONFIDENCE_THRESHOLD = 0.82
const FORMING_THRESHOLD    = 0.45

// ── Confidence ring ─────────────────────────────────────────────────────────

const RING_R    = 56
const RING_CIRC = 2 * Math.PI * RING_R

function ringColor(confidence, fired) {
  if (fired)                           return '#ffffff'
  if (confidence >= CONFIDENCE_THRESHOLD) return '#22c55e'
  if (confidence >= FORMING_THRESHOLD)    return '#f59e0b'
  return 'rgba(255,255,255,0.08)'
}

function ringLabel(confidence, fired) {
  if (fired)                              return 'FIRED'
  if (confidence >= CONFIDENCE_THRESHOLD) return 'READY'
  if (confidence >= FORMING_THRESHOLD)    return 'FORMING'
  return null
}

function ConfidenceRing({ gesture, confidence, fired }) {
  const clampedConf = Math.max(0, Math.min(1, confidence))
  const color       = ringColor(clampedConf, fired)
  const label       = ringLabel(clampedConf, fired)
  const pct         = Math.round(clampedConf * 100)
  const dashOffset  = RING_CIRC * (1 - clampedConf)
  const showing     = clampedConf >= FORMING_THRESHOLD

  return (
    <div style={{
      display:       'flex', flexDirection: 'column', alignItems: 'center',
      padding:       '20px 16px 16px',
      borderBottom:  '1px solid rgba(255,255,255,0.06)',
      flexShrink:    0,
      position:      'relative',
    }}>
      {/* Ring */}
      <div style={{ position: 'relative', width: 132, height: 132 }}>
        <svg
          width="132" height="132"
          style={{ transform: 'rotate(-90deg)', display: 'block' }}
        >
          {/* Track */}
          <circle
            cx={66} cy={66} r={RING_R}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={10}
          />
          {/* Arc */}
          <circle
            cx={66} cy={66} r={RING_R}
            fill="none"
            stroke={color}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={RING_CIRC}
            strokeDashoffset={dashOffset}
            style={{
              transition:  'stroke-dashoffset 55ms linear, stroke 120ms ease',
              filter:      showing ? `drop-shadow(0 0 6px ${color})` : 'none',
            }}
          />
        </svg>

        {/* Center text */}
        <div style={{
          position:       'absolute', inset: 0,
          display:        'flex', flexDirection: 'column',
          alignItems:     'center', justifyContent: 'center',
        }}>
          <div style={{
            fontSize:   showing ? 20 : 15,
            fontWeight: 700,
            color:      showing ? '#fff' : 'rgba(255,255,255,0.15)',
            transition: 'font-size 120ms, color 120ms',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {showing ? `${pct}%` : '—'}
          </div>
          {label && (
            <div style={{
              fontSize:      9,
              color,
              fontWeight:    700,
              letterSpacing: '0.12em',
              marginTop:     3,
              transition:    'color 120ms',
            }}>
              {label}
            </div>
          )}
        </div>
      </div>

      {/* Gesture name */}
      <div style={{
        marginTop:  10,
        fontSize:   showing ? 17 : 13,
        fontWeight: 700,
        color:      showing ? '#fff' : 'rgba(255,255,255,0.2)',
        textAlign:  'center',
        letterSpacing: showing ? 0 : '0.05em',
        minHeight:  24,
        transition: 'font-size 120ms, color 120ms',
      }}>
        {showing ? (gesture ?? '—') : '—'}
      </div>
    </div>
  )
}

// ── Layer badge ─────────────────────────────────────────────────────────────

function LayerBadge({ isModifier }) {
  if (!isModifier) return null
  return (
    <div style={{
      position:      'absolute', top: 12, right: 12,
      background:    'rgba(0,40,120,0.7)',
      color:         '#4488ff',
      fontSize:      9,
      fontWeight:    700,
      letterSpacing: '0.12em',
      padding:       '3px 8px',
      borderRadius:  10,
      border:        '1px solid rgba(68,136,255,0.35)',
    }}>
      MOD
    </div>
  )
}

// ── Confidence meter bars ────────────────────────────────────────────────────

function barColor(c) {
  if (c >= CONFIDENCE_THRESHOLD) return '#22c55e'
  if (c >= FORMING_THRESHOLD)    return '#f59e0b'
  return 'rgba(255,255,255,0.14)'
}

function MiniMeter({ name, confidence, isWinner }) {
  const pct = Math.round(confidence * 100)
  return (
    <div style={{
      padding:      '3px 12px',
      borderRadius: 4,
      background:   isWinner ? 'rgba(255,255,255,0.05)' : 'transparent',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{
          fontSize:   10, fontWeight: isWinner ? 600 : 400,
          color:      isWinner ? '#fff' : 'rgba(255,255,255,0.45)',
        }}>
          {name}
        </span>
        <span style={{
          fontSize:   10, fontVariantNumeric: 'tabular-nums',
          color:      barColor(confidence), fontWeight: 600,
        }}>
          {pct}%
        </span>
      </div>
      <div style={{ height: 2, borderRadius: 1, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{
          height:     '100%',
          width:      `${pct}%`,
          background: barColor(confidence),
          borderRadius: 1,
          transition: 'width 55ms linear, background 100ms',
          boxShadow:  confidence >= CONFIDENCE_THRESHOLD
            ? `0 0 4px ${barColor(confidence)}` : 'none',
        }} />
      </div>
    </div>
  )
}

function SectionHeader({ label }) {
  return (
    <div style={{
      padding:       '8px 12px 4px',
      fontSize:      9,
      letterSpacing: '0.12em',
      color:         'rgba(255,255,255,0.25)',
      fontWeight:    700,
      textTransform: 'uppercase',
    }}>
      {label}
    </div>
  )
}

function RawDataRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 12px', fontSize: 10 }}>
      <span style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</span>
      <span style={{ color: 'rgba(255,255,255,0.65)', fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace' }}>
        {value}
      </span>
    </div>
  )
}

function mm(v)  { return typeof v === 'number' ? v.toFixed(0) : '—' }
function vec(a) { return Array.isArray(a) ? `${mm(a[0])}, ${mm(a[1])}, ${mm(a[2])}` : '—' }

const FINGER_NAMES = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']

// ── Fire flash state ─────────────────────────────────────────────────────────
// Detects the crossing moment (confidence rises through threshold) and holds
// the "fired" state for 600ms regardless of subsequent frame updates.

function useFiredState(topConfidence) {
  const [fired, setFired]  = useState(false)
  const prevConf           = useRef(0)
  const timerRef           = useRef(null)

  useEffect(() => {
    const prev = prevConf.current
    prevConf.current = topConfidence
    if (prev < CONFIDENCE_THRESHOLD && topConfidence >= CONFIDENCE_THRESHOLD) {
      if (timerRef.current) clearTimeout(timerRef.current)
      setFired(true)
      timerRef.current = setTimeout(() => { setFired(false); timerRef.current = null }, 600)
    }
  }, [topConfidence])

  // Cleanup timer on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return fired
}

// ── Main component ────────────────────────────────────────────────────────────

export default function GesturePanel({ frame }) {
  const [dataOpen, setDataOpen]           = useState(false)
  const [gesturesEnabled, setGesturesEnabled] = useState(true)
  const [orientation, setOrientation]         = useState('FORWARD_FACING')
  const [cooldown, setCooldownState]           = useState(350)

  function toggleGestures() {
    const next = !gesturesEnabled
    setGesturesEnabled(next)
    window.leapAPI?.setGesturesEnabled(next)
  }

  function toggleOrientation() {
    setOrientation(o => o === 'FORWARD_FACING' ? 'TOP_DOWN' : 'FORWARD_FACING')
  }

  function onCooldownChange(e) {
    const ms = Number(e.target.value)
    setCooldownState(ms)
    window.leapAPI?.setCooldown(ms)
  }

  const hands    = frame?.hands ?? []
  const hand     = hands.find(h => h.type === 'right') ?? hands[0] ?? null

  const shapeResults = hand ? classifyGestures(hand, orientation) : []
  const swipeResults = hand ? classifySwipes(hand, orientation) : [
    { name: 'Swipe Right', direction: 'right', confidence: 0 },
    { name: 'Swipe Left',  direction: 'left',  confidence: 0 },
    { name: 'Swipe Up',    direction: 'up',    confidence: 0 },
    { name: 'Swipe Down',  direction: 'down',  confidence: 0 },
  ]

  const topShape = shapeResults[0]
  const topSwipe = [...swipeResults].sort((a, b) => b.confidence - a.confidence)[0]

  // Two-finger flick wins when both components are above forming threshold
  let winner = null
  if (
    shapeResults.find(g => g.name === 'Two-Finger')?.confidence >= FORMING_THRESHOLD &&
    topSwipe?.confidence >= FORMING_THRESHOLD
  ) {
    const tf = shapeResults.find(g => g.name === 'Two-Finger')
    winner = {
      name:       `Two-Finger Flick ${dirArrow(topSwipe.direction)}`,
      confidence: Math.min(tf.confidence, topSwipe.confidence),
    }
  } else if (topShape?.confidence >= FORMING_THRESHOLD) {
    winner = topShape
  }

  const topConf  = winner?.confidence ?? 0
  const fired    = useFiredState(topConf)

  // Modifier detection — left hand still in zone
  const leftHand = hands.find(h => h.type === 'left')
  const lv       = leftHand?.palmVelocity ?? [0, 0, 0]
  const leftSpeed = Math.sqrt(lv[0]**2 + lv[1]**2 + lv[2]**2)
  const isModifier = !!leftHand && leftSpeed < 15

  return (
    <div style={{
      width:         '40%',
      minWidth:      320,
      height:        '100%',
      display:       'flex',
      flexDirection: 'column',
      background:    '#0a0a13',
      borderLeft:    '1px solid rgba(255,255,255,0.07)',
      overflowY:     'auto',
      position:      'relative',
    }}>
      <LayerBadge isModifier={isModifier} />

      {/* Dev toggles row */}
      <div style={{
        padding:        '10px 12px 0',
        display:        'flex',
        justifyContent: 'flex-end',
        gap:            6,
      }}>
        <button
          onClick={toggleOrientation}
          style={{
            background:    'rgba(255,255,255,0.06)',
            border:        '1px solid rgba(255,255,255,0.15)',
            color:         'rgba(255,255,255,0.55)',
            borderRadius:  6,
            padding:       '4px 10px',
            fontSize:      10,
            fontWeight:    700,
            letterSpacing: '0.1em',
            cursor:        'pointer',
            userSelect:    'none',
          }}
        >
          {orientation === 'FORWARD_FACING' ? 'FORWARD' : 'TOP DOWN'}
        </button>
        <button
          onClick={toggleGestures}
          style={{
            background:    gesturesEnabled ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
            border:        `1px solid ${gesturesEnabled ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
            color:         gesturesEnabled ? '#22c55e' : '#ef4444',
            borderRadius:  6,
            padding:       '4px 10px',
            fontSize:      10,
            fontWeight:    700,
            letterSpacing: '0.1em',
            cursor:        'pointer',
            userSelect:    'none',
          }}
        >
          {gesturesEnabled ? 'GESTURES ON' : 'GESTURES OFF'}
        </button>
      </div>

      {/* Cooldown slider */}
      <div style={{
        padding:    '6px 12px 8px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>
            Fire Cooldown
          </span>
          <span style={{ fontSize: 10, fontVariantNumeric: 'tabular-nums', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
            {cooldown}ms
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={2000}
          step={50}
          value={cooldown}
          onChange={onCooldownChange}
          style={{ width: '100%', accentColor: '#4488ff', cursor: 'pointer' }}
        />
      </div>

      <ConfidenceRing
        gesture={winner?.name ?? null}
        confidence={topConf}
        fired={fired}
      />

      {/* Shape gestures */}
      <SectionHeader label="Hand Shape" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '0 0 4px' }}>
        {shapeResults.length > 0
          ? shapeResults.map(r => (
              <MiniMeter
                key={r.name}
                name={r.name}
                confidence={r.confidence}
                isWinner={winner?.name === r.name || winner?.name?.startsWith('Two-Finger Flick') && r.name === 'Two-Finger'}
              />
            ))
          : <div style={{ padding: '6px 12px', fontSize: 10, color: 'rgba(255,255,255,0.18)' }}>No hand detected</div>
        }
      </div>

      {/* Swipes */}
      <SectionHeader label="Swipe" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '0 0 4px' }}>
        {swipeResults.map(r => (
          <MiniMeter
            key={r.direction}
            name={r.name}
            confidence={r.confidence}
            isWinner={false}
          />
        ))}
      </div>

      {/* Raw data (collapsed by default) */}
      {hand && (
        <>
          <div
            onClick={() => setDataOpen(o => !o)}
            style={{
              padding:       '8px 12px 4px',
              fontSize:      9,
              letterSpacing: '0.12em',
              color:         'rgba(255,255,255,0.25)',
              fontWeight:    700,
              textTransform: 'uppercase',
              cursor:        'pointer',
              display:       'flex',
              justifyContent:'space-between',
              userSelect:    'none',
            }}
          >
            <span>Raw Data</span>
            <span style={{ fontSize: 10 }}>{dataOpen ? '▲' : '▼'}</span>
          </div>
          {dataOpen && (
            <div style={{ paddingBottom: 12 }}>
              <RawDataRow label="Hand"       value={hand.type?.toUpperCase() ?? '—'} />
              <RawDataRow label="Confidence" value={`${Math.round((hand.confidence ?? 0) * 100)}%`} />
              <RawDataRow label="Palm XYZ"   value={vec(hand.palmPosition)} />
              <RawDataRow label="Velocity"   value={vec(hand.palmVelocity)} />
              <RawDataRow label="Pinch"      value={`${Math.round((hand.pinchStrength ?? 0) * 100)}%`} />
              <RawDataRow label="Grab"       value={`${Math.round((hand.grabStrength ?? 0) * 100)}%`} />
              <div style={{ height: 4 }} />
              {(hand.fingers ?? []).slice().sort((a, b) => a.type - b.type).map(f => (
                <RawDataRow
                  key={f.type}
                  label={`${FINGER_NAMES[f.type] ?? f.type} tip`}
                  value={`${f.extended ? 'ext' : 'curl'}  ${vec(f.tipPosition)}`}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function dirArrow(dir) {
  return { right: '→', left: '←', up: '↑', down: '↓' }[dir] ?? ''
}
