import React, { useState } from 'react'
import { classifyGestures } from '../lib/gestureClassifier'
import { classifySwipes }   from '../lib/swipeClassifier'

const CONFIDENCE_THRESHOLD = 0.82

function barColor(c) {
  if (c >= CONFIDENCE_THRESHOLD) return '#22c55e'
  if (c >= 0.5)                  return '#f59e0b'
  return 'rgba(255,255,255,0.18)'
}

function ConfidenceMeter({ name, confidence, isWinner }) {
  const pct = Math.round(confidence * 100)
  return (
    <div style={{
      padding:      '5px 12px',
      borderRadius: 6,
      background:   isWinner ? 'rgba(255,255,255,0.06)' : 'transparent',
      border:       isWinner ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: isWinner ? '#fff' : 'rgba(255,255,255,0.6)', fontWeight: isWinner ? 600 : 400 }}>
          {name}
        </span>
        <span style={{
          fontSize: 11, fontVariantNumeric: 'tabular-nums',
          color: barColor(confidence), fontWeight: 600,
        }}>
          {pct}%
        </span>
      </div>
      <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{
          height:     '100%',
          width:      `${pct}%`,
          background: barColor(confidence),
          borderRadius: 2,
          transition: 'width 60ms linear, background 120ms',
          boxShadow:  confidence >= CONFIDENCE_THRESHOLD ? `0 0 6px ${barColor(confidence)}` : 'none',
        }} />
      </div>
    </div>
  )
}

function SectionHeader({ label }) {
  return (
    <div style={{
      padding:     '8px 12px 4px',
      fontSize:    10,
      letterSpacing: '0.1em',
      color:       'rgba(255,255,255,0.3)',
      fontWeight:  600,
      textTransform: 'uppercase',
    }}>
      {label}
    </div>
  )
}

function RawDataRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 12px', fontSize: 10 }}>
      <span style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</span>
      <span style={{ color: 'rgba(255,255,255,0.7)', fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace' }}>
        {value}
      </span>
    </div>
  )
}

function mm(v) { return typeof v === 'number' ? v.toFixed(0) : '—' }
function vec(arr) {
  if (!Array.isArray(arr)) return '—'
  return `${mm(arr[0])}, ${mm(arr[1])}, ${mm(arr[2])}`
}

const FINGER_NAMES = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']

export default function GesturePanel({ frame }) {
  const [dataOpen, setDataOpen] = useState(true)

  const hands = frame?.hands ?? []
  const hand  = hands[0] ?? null   // Primary hand for classification

  const shapeResults = hand ? classifyGestures(hand) : []
  const swipeResults = hand ? classifySwipes(hand)   : [
    { name: 'Swipe Right', direction: 'right', confidence: 0 },
    { name: 'Swipe Left',  direction: 'left',  confidence: 0 },
    { name: 'Swipe Up',    direction: 'up',    confidence: 0 },
    { name: 'Swipe Down',  direction: 'down',  confidence: 0 },
  ]

  const topShape = shapeResults[0]
  const topSwipe = [...swipeResults].sort((a, b) => b.confidence - a.confidence)[0]

  const winner = (topShape?.confidence >= CONFIDENCE_THRESHOLD)
    ? topShape
    : (topSwipe?.confidence >= CONFIDENCE_THRESHOLD ? topSwipe : null)

  return (
    <div style={{
      width:      '35%',
      minWidth:   360,
      height:     '100%',
      display:    'flex',
      flexDirection: 'column',
      background: '#0c0c14',
      borderLeft: '1px solid rgba(255,255,255,0.08)',
      overflowY:  'auto',
    }}>
      {/* Active gesture display */}
      <div style={{
        padding:   '18px 16px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 10, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>
          DETECTED
        </div>
        <div style={{
          fontSize:   winner ? 22 : 18,
          fontWeight: 700,
          color:      winner ? '#fff' : 'rgba(255,255,255,0.2)',
          letterSpacing: winner ? 0 : '0.05em',
          minHeight:  30,
        }}>
          {winner ? winner.name : '—'}
        </div>
        {winner && (
          <div style={{ fontSize: 12, color: barColor(winner.confidence), marginTop: 3, fontWeight: 600 }}>
            {Math.round(winner.confidence * 100)}% confidence
          </div>
        )}
      </div>

      {/* Shape gestures */}
      <SectionHeader label="Hand Shape" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 0 4px' }}>
        {shapeResults.length > 0
          ? shapeResults.map(r => (
              <ConfidenceMeter
                key={r.name}
                name={r.name}
                confidence={r.confidence}
                isWinner={winner?.name === r.name}
              />
            ))
          : <div style={{ padding: '8px 12px', fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>No hand detected</div>
        }
      </div>

      {/* Swipe gestures */}
      <SectionHeader label="Swipe (Index Finger)" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 0 4px' }}>
        {swipeResults.map(r => (
          <ConfidenceMeter
            key={r.direction}
            name={r.name}
            confidence={r.confidence}
            isWinner={winner?.name === r.name}
          />
        ))}
      </div>

      {/* Raw data */}
      {hand && (
        <>
          <div
            onClick={() => setDataOpen(o => !o)}
            style={{
              padding:    '8px 12px 4px',
              fontSize:   10,
              letterSpacing: '0.1em',
              color:      'rgba(255,255,255,0.3)',
              fontWeight: 600,
              textTransform: 'uppercase',
              cursor:     'pointer',
              display:    'flex',
              justifyContent: 'space-between',
              userSelect: 'none',
            }}
          >
            <span>Raw Data</span>
            <span>{dataOpen ? '▲' : '▼'}</span>
          </div>
          {dataOpen && (
            <div style={{ paddingBottom: 12 }}>
              <RawDataRow label="Hand"       value={hand.type?.toUpperCase() ?? '—'} />
              <RawDataRow label="Confidence" value={`${Math.round((hand.confidence ?? 0) * 100)}%`} />
              <RawDataRow label="Palm XYZ"   value={vec(hand.palmPosition)} />
              <RawDataRow label="Velocity"   value={vec(hand.palmVelocity)} />
              <RawDataRow label="Pinch"      value={`${Math.round((hand.pinchStrength ?? 0) * 100)}%`} />
              <RawDataRow label="Grab"       value={`${Math.round((hand.grabStrength ?? 0) * 100)}%`} />
              <div style={{ height: 6 }} />
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
