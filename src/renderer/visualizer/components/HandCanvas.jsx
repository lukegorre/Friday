import React, { useRef, useEffect } from 'react'

// Camera sits 600mm in front, looking at activation zone center (0, 150, 0)
const CAM_Z     = -700
const FOCAL     = 450
const CX_OFFSET = 0
const CY_OFFSET = -40  // shift center slightly up

const COLORS = {
  right: { bone: '#00c8ff', joint: '#7ee8ff', palm: '#00a0cc' },
  left:  { bone: '#ff8040', joint: '#ffc0a0', palm: '#cc5a20' },
}

function project(x, y, z, w, h) {
  const dz    = z - CAM_Z
  const scale = FOCAL / dz
  const sx    = w / 2 + CX_OFFSET + x * scale
  const sy    = h / 2 + CY_OFFSET - y * scale   // y up → screen down
  return { sx, sy, scale }
}

function drawHand(ctx, hand, w, h) {
  const col   = COLORS[hand.type === 'left' ? 'left' : 'right']
  const alpha = 0.35 + 0.65 * Math.max(0, Math.min(1, hand.confidence ?? 1))

  ctx.globalAlpha = alpha

  // Bones
  ctx.strokeStyle = col.bone
  ctx.lineWidth   = 2.5
  ctx.lineCap     = 'round'
  for (const finger of hand.fingers ?? []) {
    for (const bone of finger.bones ?? []) {
      if (!bone.prevJoint || !bone.nextJoint) continue
      const { sx: ax, sy: ay } = project(...bone.prevJoint, w, h)
      const { sx: bx, sy: by } = project(...bone.nextJoint, w, h)
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.lineTo(bx, by)
      ctx.stroke()
    }
  }

  // Joints
  ctx.fillStyle = col.joint
  for (const finger of hand.fingers ?? []) {
    for (const bone of finger.bones ?? []) {
      if (!bone.prevJoint || !bone.nextJoint) continue
      for (const joint of [bone.prevJoint, bone.nextJoint]) {
        const { sx, sy, scale } = project(...joint, w, h)
        const r = Math.max(2, 3.5 * scale)
        ctx.beginPath()
        ctx.arc(sx, sy, r, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  // Palm
  const { sx: px, sy: py, scale: ps } = project(...(hand.palmPosition ?? [0, 150, 0]), w, h)
  ctx.fillStyle   = col.palm
  ctx.strokeStyle = col.bone
  ctx.lineWidth   = 1.5
  ctx.beginPath()
  ctx.arc(px, py, Math.max(6, 12 * ps), 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.globalAlpha = 1
}

function drawGrid(ctx, w, h) {
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'
  ctx.lineWidth = 1
  // Horizontal lines in activation zone plane (Y=50..300, X=-200..200)
  for (let y = 50; y <= 300; y += 50) {
    const l = project(-200, y, 0, w, h)
    const r = project( 200, y, 0, w, h)
    ctx.beginPath(); ctx.moveTo(l.sx, l.sy); ctx.lineTo(r.sx, r.sy); ctx.stroke()
  }
  // Vertical lines
  for (let x = -200; x <= 200; x += 100) {
    const t = project(x, 300, 0, w, h)
    const b = project(x,  50, 0, w, h)
    ctx.beginPath(); ctx.moveTo(t.sx, t.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke()
  }
}

function drawZoneLabel(ctx, w, h) {
  ctx.fillStyle    = 'rgba(255,255,255,0.08)'
  ctx.font         = '11px -apple-system, system-ui, monospace'
  ctx.textAlign    = 'right'
  ctx.fillText('activation zone  400 × 250 × 300 mm', w - 12, h - 12)
}

export default function HandCanvas({ frame }) {
  const canvasRef = useRef(null)
  const rafRef    = useRef(null)
  const frameRef  = useRef(null)

  // Keep latest frame in a ref so the rAF loop doesn't need re-registration
  useEffect(() => { frameRef.current = frame }, [frame])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    function render() {
      const w = canvas.width
      const h = canvas.height
      const f = frameRef.current

      ctx.clearRect(0, 0, w, h)
      drawGrid(ctx, w, h)

      if (f?.hands?.length) {
        for (const hand of f.hands) drawHand(ctx, hand, w, h)
      } else {
        // Empty state hint
        ctx.fillStyle = 'rgba(255,255,255,0.08)'
        ctx.font      = '13px -apple-system, system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('Place hand above sensor', w / 2, h / 2)
      }

      drawZoneLabel(ctx, w, h)
      rafRef.current = requestAnimationFrame(render)
    }

    // Sync canvas resolution to layout size
    function resize() {
      canvas.width  = canvas.offsetWidth  * devicePixelRatio
      canvas.height = canvas.offsetHeight * devicePixelRatio
      ctx.scale(devicePixelRatio, devicePixelRatio)
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()
    rafRef.current = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}
