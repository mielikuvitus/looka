// Looka playground — the 3D "mic orb": a small tappable sphere that floats
// above the bee and reflects the voice loop's state (idle / recording /
// working / speaking / error). Plain three.js, no WebSpatial, no React (see
// main.ts header).
//
// The orb parents itself to bee.anchor, so it rides along for free with
// tap-to-place (phone) and ray-grab (headset) — no per-adapter follow code.
// Adapters call raycast() BEFORE their own placement/grab hit-tests so that
// aiming at the orb wins over moving the bee. The voice loop (voiceLoop.ts)
// drives setState() from the mic/job/playback lifecycle.

import type { LoadedBee } from './beeLoader'
import * as THREE from 'three'

export type OrbState = 'idle' | 'recording' | 'working' | 'speaking' | 'error'

export interface MicOrb {
  /** The orb's root group. createMicOrb already parents it to bee.anchor; exposed for tests/tuning. */
  group: THREE.Group
  getState: () => OrbState
  setState: (state: OrbState) => void
  /**
   * Whether the controller/screen ray is currently over the orb (call every
   * frame from the same raycast that feeds raycast() below). Only visible
   * while `state === 'idle'` — highlights the core white and scales up
   * slightly, since that's the only state where tapping does anything.
   */
  setHovered: (hovered: boolean) => void
  /** 0..3 white dots orbiting in 'working' (clamp to [0,3]). */
  setJobCount: (n: number) => void
  /** Transient error flash (~300ms 'error' visual) then returns to 'idle'. */
  flashError: () => void
  /**
   * True iff the orb's invisible proxy sphere is hit by this world-space
   * raycaster. Adapters call this BEFORE their own placement/grab hit-tests
   * so the orb wins.
   */
  raycast: (raycaster: THREE.Raycaster) => boolean
  /** Per-frame: gentle float, billboard the label/ring/dots toward the camera, animate the current state. */
  update: (dt: number, cameraWorldPos: THREE.Vector3) => void
  /** Remove from parent and dispose ALL geometries, materials, and CanvasTextures created here. */
  dispose: () => void
}

// Design tokens (DESIGN.md, canonical).
const SHELL = 0x2A2730 // idle core
const SHELL_HOVER = 0x453F4A // idle core, hovered — same hue, just lighter
const PINK = 0xDC0073 // Looka pink rim + recording fill
const WHITE = 0xF5F2EC // dots + speaking pulse
const ERROR = 0xBF3B2F // error rim flash

const ORB_Y = 0.32 // above the bee's head (anchor origin = bee center, head ≈ y+0.2)
const CORE_RADIUS = 0.045
const RIM_RADIUS = CORE_RADIUS * 1.15
const PROXY_RADIUS = 0.09 // generous, pose-independent tap target
const DOT_RADIUS = 0.007
const DOT_ORBIT_RADIUS = 0.075
const MAX_DOTS = 3
const ERROR_FLASH_S = 0.3 // transient error visual duration

/**
 * Build the mic orb and parent it to `bee.anchor`. Starts in 'idle'. The
 * caller drives it via update(dt, cameraWorldPos) every frame and disposes it
 * before disposing the bee.
 */
export function createMicOrb(bee: LoadedBee): MicOrb {
  const group = new THREE.Group()
  group.position.set(0, ORB_Y, 0)
  bee.anchor.add(group)

  // Core sphere — rotation-invariant, no billboard needed. Transparent so
  // 'working' can dim it without swapping materials.
  const coreGeo = new THREE.SphereGeometry(CORE_RADIUS, 32, 24)
  const coreMat = new THREE.MeshStandardMaterial({
    color: SHELL,
    roughness: 0.4,
    metalness: 0.1,
    transparent: true,
  })
  const core = new THREE.Mesh(coreGeo, coreMat)
  group.add(core)

  // Cheap fresnel-style rim: a slightly larger BackSide sphere in pink.
  const rimGeo = new THREE.SphereGeometry(RIM_RADIUS, 32, 24)
  const rimMat = new THREE.MeshBasicMaterial({
    color: PINK,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.55,
  })
  const rim = new THREE.Mesh(rimGeo, rimMat)
  group.add(rim)

  // Invisible, generously-sized proxy for raycast() — NOT the animated bee
  // mesh (a SkinnedMesh raycasts against its bind pose), and roomier than the
  // visible core so it's a comfortable target.
  const proxyGeo = new THREE.SphereGeometry(PROXY_RADIUS, 8, 6)
  const proxyMat = new THREE.MeshBasicMaterial({ visible: false })
  const proxy = new THREE.Mesh(proxyGeo, proxyMat)
  group.add(proxy)

  // Parts that must FACE the viewer live here; update() orients this group
  // with lookAt every frame (its local +Z ends up pointing at the camera).
  const facing = new THREE.Group()
  group.add(facing)

  // Recording ring (pulses in 'recording'), lies in the facing plane.
  const ringGeo = new THREE.RingGeometry(CORE_RADIUS * 1.4, CORE_RADIUS * 1.7, 48)
  const ringMat = new THREE.MeshBasicMaterial({
    color: PINK,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
  })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.visible = false
  facing.add(ring)

  // Up to MAX_DOTS white 'job' dots orbiting in the facing plane. Built once,
  // toggled by state + job count; they share one geometry and material.
  const dotGeo = new THREE.SphereGeometry(DOT_RADIUS, 12, 8)
  const dotMat = new THREE.MeshBasicMaterial({ color: WHITE })
  const dots: THREE.Mesh[] = []
  for (let i = 0; i < MAX_DOTS; i++) {
    const dot = new THREE.Mesh(dotGeo, dotMat)
    dot.visible = false
    facing.add(dot)
    dots.push(dot)
  }

  // 'tap to talk' label — a CanvasTexture sprite (sprites face the camera for
  // free). Shown only in 'idle' for slice 1.
  const labelTexture = drawLabelTexture('tap to talk')
  const labelMat = new THREE.SpriteMaterial({ map: labelTexture, transparent: true })
  const label = new THREE.Sprite(labelMat)
  label.scale.set(0.12, 0.03, 1)
  label.position.set(0, CORE_RADIUS + 0.05, 0)
  group.add(label)

  let state: OrbState = 'idle'
  let jobCount = 0
  let elapsed = 0 // drives bob / ring pulse / dot orbit / speaking pulse
  let errorTimer = 0 // >0 while the transient error flash plays
  let hovered = false

  function updateDots() {
    const shown = state === 'working' ? Math.min(jobCount, MAX_DOTS) : 0
    for (let i = 0; i < MAX_DOTS; i++)
      dots[i].visible = i < shown
  }

  // Set every material/visibility to match `state`. Per-frame animation of the
  // active state happens in update(); this is the static baseline.
  function applyState() {
    coreMat.color.setHex(state === 'recording' ? PINK : SHELL)
    coreMat.opacity = state === 'working' ? 0.5 : 1 // 'working' dims the mic
    coreMat.emissive.setHex(state === 'speaking' ? WHITE : 0x000000)
    coreMat.emissiveIntensity = 0
    rimMat.color.setHex(state === 'error' ? ERROR : PINK)
    label.visible = state === 'idle'
    ring.visible = state === 'recording'
    updateDots()
  }
  applyState()

  return {
    group,
    getState: () => state,
    setState(next) {
      state = next
      errorTimer = 0
      applyState()
    },
    setHovered(next) {
      hovered = next
    },
    setJobCount(n) {
      jobCount = Math.max(0, Math.min(MAX_DOTS, Math.floor(n)))
      updateDots()
    },
    flashError() {
      state = 'error'
      errorTimer = ERROR_FLASH_S
      applyState()
    },
    raycast(raycaster) {
      return raycaster.intersectObject(proxy, false).length > 0
    },
    update(dt, cameraWorldPos) {
      elapsed += dt

      // Gentle vertical bob around the resting height.
      group.position.y = ORB_Y + Math.sin(elapsed * 1.6) * 0.006

      // Billboard the facing parts toward the viewer (lookAt accounts for the
      // parent world matrix, so this is correct even after tap-to-place).
      facing.lookAt(cameraWorldPos)

      // Hover highlight: only meaningful in 'idle' (the only state tapping
      // does anything) — a subtle lightening of the same shell color, no
      // scale change, so aiming at the orb is noticeable without looking
      // jarring. Runs every frame so it always wins over applyState()'s
      // baseline color for the current state.
      if (state === 'idle')
        coreMat.color.setHex(hovered ? SHELL_HOVER : SHELL)

      if (state === 'recording') {
        // ~1.6s ease-in-out pulse: scale + fade the ring outward.
        const t = (Math.sin((elapsed / 1.6) * Math.PI * 2) + 1) / 2
        const scale = 1 + t * 0.35
        ring.scale.setScalar(scale)
        ringMat.opacity = 0.9 - t * 0.6
      }
      else if (state === 'working') {
        // Slowly orbit the visible dots in the facing plane.
        const shown = Math.min(jobCount, MAX_DOTS)
        for (let i = 0; i < shown; i++) {
          const angle = elapsed * 0.8 + (i / shown) * Math.PI * 2
          dots[i].position.set(
            Math.cos(angle) * DOT_ORBIT_RADIUS,
            Math.sin(angle) * DOT_ORBIT_RADIUS,
            0,
          )
        }
      }
      else if (state === 'speaking') {
        // Placeholder waveform: a white emissive pulse on the core.
        coreMat.emissiveIntensity = (Math.sin(elapsed * 8) + 1) / 2
      }
      else if (state === 'error') {
        errorTimer -= dt
        if (errorTimer <= 0) {
          state = 'idle'
          applyState()
        }
      }
    },
    dispose() {
      group.removeFromParent()
      coreGeo.dispose()
      coreMat.dispose()
      rimGeo.dispose()
      rimMat.dispose()
      proxyGeo.dispose()
      proxyMat.dispose()
      ringGeo.dispose()
      ringMat.dispose()
      dotGeo.dispose()
      dotMat.dispose()
      labelTexture.dispose()
      labelMat.dispose()
    },
  }
}

/** Draw the orb label ('tap to talk') to a transparent CanvasTexture. */
function drawLabelTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const g = canvas.getContext('2d')!
  g.clearRect(0, 0, canvas.width, canvas.height)
  g.font = '600 64px Inter, system-ui, sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillStyle = '#f5f2ec'
  g.fillText(text, canvas.width / 2, canvas.height / 2)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}
