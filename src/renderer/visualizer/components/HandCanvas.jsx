import React, { useMemo, useEffect, useRef } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { classifyGestures } from '../lib/gestureClassifier'

// 1 Three.js unit = 100 mm
const S = 0.01

function toV([x, y, z]) { return [x * S, y * S, z * S] }

// ── Static scene geometry ─────────────────────────────────────────────────────

// Pre-baked edges geometry for the activation zone box (40 × 25 × 30 cm)
const ZONE_EDGES_GEO = new THREE.EdgesGeometry(new THREE.BoxGeometry(4, 2.5, 3))

// Pre-baked floor grid
const FLOOR_GEO = (() => {
  const g = new THREE.BufferGeometry()
  const pts = []
  for (let x = -2; x <= 2; x += 0.5) { pts.push(x, 0, -1.5,  x, 0, 1.5) }
  for (let z = -1.5; z <= 1.5; z += 0.5) { pts.push(-2, 0, z,  2, 0, z) }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  return g
})()

function ZoneBox() {
  return (
    <lineSegments geometry={ZONE_EDGES_GEO} position={[0, 1.75, 0]}>
      <lineBasicMaterial color="#2244cc" transparent opacity={0.3} />
    </lineSegments>
  )
}

function ZoneFloor() {
  return (
    <lineSegments geometry={FLOOR_GEO}>
      <lineBasicMaterial color="#ffffff" transparent opacity={0.03} />
    </lineSegments>
  )
}

// ── Hand skeleton — one LineSegments object per hand for all bones ─────────────

function HandSkeleton({ hand, isForming, isFiring }) {
  const meshRef  = useRef()
  const geoRef   = useRef(new THREE.BufferGeometry())

  useFrame(() => {
    if (!meshRef.current) return

    const pts = []
    for (const finger of hand.fingers ?? []) {
      for (const bone of finger.bones ?? []) {
        if (!bone.prevJoint || !bone.nextJoint) continue
        pts.push(...toV(bone.prevJoint), ...toV(bone.nextJoint))
      }
    }
    const arr = new Float32Array(pts)
    geoRef.current.setAttribute('position', new THREE.BufferAttribute(arr, 3))
    geoRef.current.attributes.position.needsUpdate = true

    const mat = meshRef.current.material
    mat.color.set(isFiring ? '#ffffff' : isForming ? '#ffaa44' : '#00c8ff')
    mat.opacity = 0.7 + 0.3 * (hand.confidence ?? 1)
  })

  return (
    <lineSegments ref={meshRef} geometry={geoRef.current}>
      <lineBasicMaterial
        color="#00c8ff"
        transparent
        opacity={0.9}
        vertexColors={false}
      />
    </lineSegments>
  )
}

// ── Joint spheres ─────────────────────────────────────────────────────────────

const JOINT_GEO = new THREE.SphereGeometry(0.06, 7, 5)
const EXT_JOINT_GEO = new THREE.SphereGeometry(0.075, 8, 6)

function JointSpheres({ hand, isForming, isFiring }) {
  const joints = []
  const seen   = new Set()

  for (const finger of hand.fingers ?? []) {
    for (const bone of finger.bones ?? []) {
      for (const [raw, ext] of [
        [bone.prevJoint, finger.extended],
        [bone.nextJoint, finger.extended],
      ]) {
        if (!raw) continue
        const key = raw.map(v => Math.round(v)).join(',')
        if (!seen.has(key)) {
          seen.add(key)
          joints.push({ pos: toV(raw), extended: ext })
        }
      }
    }
  }

  return (
    <>
      {joints.map((j, i) => {
        const color    = j.extended
          ? (isFiring ? '#ffffff' : isForming ? '#ffe090' : '#c0f0ff')
          : '#334455'
        const emissive = j.extended
          ? (isFiring ? '#ffffff' : isForming ? '#ff6600' : '#002244')
          : '#000000'
        const emi = j.extended ? (isFiring ? 3 : isForming ? 1.5 : 0.4) : 0

        return (
          <mesh key={i} position={j.pos} geometry={j.extended ? EXT_JOINT_GEO : JOINT_GEO}>
            <meshStandardMaterial
              color={color}
              emissive={emissive}
              emissiveIntensity={emi}
              roughness={0.4}
              metalness={0.1}
            />
          </mesh>
        )
      })}
    </>
  )
}

// ── Palm disc ─────────────────────────────────────────────────────────────────

const PALM_GEO = new THREE.SphereGeometry(1, 12, 8)

function PalmDisc({ hand, isForming, isFiring }) {
  const pos   = toV(hand.palmPosition ?? [0, 150, 0])
  const grab  = hand.grabStrength ?? 0
  const scale = Math.max(0.08, 0.18 * (1.2 - grab * 0.7))
  const color = isFiring ? '#ffffff' : isForming ? '#ff9933' : '#3366cc'

  return (
    <mesh position={pos} scale={[scale, scale, scale]} geometry={PALM_GEO}>
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.35}
        emissive={color}
        emissiveIntensity={isFiring ? 1.5 : isForming ? 0.6 : 0.2}
        roughness={0.5}
      />
    </mesh>
  )
}

// ── Full hand model ───────────────────────────────────────────────────────────

function HandModel({ hand }) {
  const gestures   = classifyGestures(hand)
  const confidence = gestures[0]?.confidence ?? 0
  const isForming  = confidence >= 0.45 && confidence < 0.82
  const isFiring   = confidence >= 0.82

  return (
    <group>
      <HandSkeleton hand={hand} isForming={isForming} isFiring={isFiring} />
      <JointSpheres  hand={hand} isForming={isForming} isFiring={isFiring} />
      <PalmDisc      hand={hand} isForming={isForming} isFiring={isFiring} />
    </group>
  )
}

// ── Camera setup ──────────────────────────────────────────────────────────────

function SceneSetup() {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.set(0, 3.5, 9)
    camera.lookAt(0, 1.75, 0)
    camera.updateProjectionMatrix()
  }, []) // eslint-disable-line
  return null
}

// ── Root component ────────────────────────────────────────────────────────────

const _loggedHands = { current: false }

export default function HandCanvas({ frame }) {
  const hands = frame?.hands ?? []
  if (hands.length && !_loggedHands.current) {
    console.log('[HandCanvas] first frame with hands:', hands.length, 'palmY:', hands[0]?.palmPosition?.[1]?.toFixed(0))
    _loggedHands.current = true
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#07070f' }}>
      <Canvas
        style={{ width: '100%', height: '100%' }}
        camera={{ fov: 45, near: 0.1, far: 50 }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor(new THREE.Color('#07070f'))
          scene.fog = new THREE.Fog('#07070f', 13, 26)
        }}
      >
        <SceneSetup />

        <ambientLight intensity={0.22} />
        <pointLight position={[0, 6, 7]} intensity={1.8} />
        <pointLight position={[-3, 4, -2]} intensity={0.55} color="#aabbff" />
        <pointLight position={[3, 2, 4]} intensity={0.35} color="#ffddcc" />

        <ZoneBox />
        <ZoneFloor />

        {hands.map(hand => (
          <HandModel key={hand.type} hand={hand} />
        ))}
      </Canvas>

      {/* Status overlays */}
      {!hands.length && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.12)', letterSpacing: '0.06em' }}>
            Place hand above sensor
          </span>
        </div>
      )}
      <div style={{
        position: 'absolute', bottom: 10, right: 12,
        fontSize: 10, color: 'rgba(255,255,255,0.1)',
        letterSpacing: '0.08em', pointerEvents: 'none',
      }}>
        400 × 300 × 250 mm
      </div>
    </div>
  )
}
