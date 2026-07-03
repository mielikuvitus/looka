// Looka playground — the non-XR "canvas floor": an ordinary WebGL view of
// the idling bee shown on the page itself, so the playground is useful even
// before (or without) entering AR. Plain three.js + DOM, no WebSpatial, no
// React (see main.ts header).
//
// Exposes pause()/resume() so main.ts can stop this render loop while an AR
// session owns the GPU — two concurrently active WebGL animation loops is a
// reliable way to make mobile browsers unhappy.

import type { LoadedBee } from './beeLoader'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { loadBee } from './beeLoader'
import { createMicOrb } from './micOrb'

export interface CanvasFloor {
  /** Stop rendering (loop + resize handling). Idempotent. */
  pause: () => void
  /** Resume rendering after pause(). Idempotent. */
  resume: () => void
  /** Full teardown: loop, controls, bee, renderer. */
  dispose: () => void
}

/**
 * Boot the page-level scene onto `canvas`: lights, orbit controls, and the
 * idling bee. Resolves once the bee model is loaded and the loop is running.
 */
export async function startCanvasFloor(canvas: HTMLCanvasElement): Promise<CanvasFloor> {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  try {
    return await buildFloor(renderer, canvas)
  }
  catch (err) {
    // Without this, a failed bee load would leak the canvas's GL context for
    // the page lifetime (no handle exists yet, so dispose() is unreachable).
    renderer.dispose()
    renderer.forceContextLoss()
    throw err
  }
}

async function buildFloor(renderer: THREE.WebGLRenderer, canvas: HTMLCanvasElement): Promise<CanvasFloor> {
  renderer.setPixelRatio(window.devicePixelRatio)

  const scene = new THREE.Scene()
  scene.add(new THREE.HemisphereLight(0xFFFFFF, 0x444444, 1.2))
  const directional = new THREE.DirectionalLight(0xFFFFFF, 1)
  directional.position.set(0.5, 1, 0.5)
  scene.add(directional)

  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 20)
  camera.position.set(0, 0.15, 0.9)

  const bee: LoadedBee = await loadBee()
  scene.add(bee.anchor)

  // The mic orb parents itself to bee.anchor, so it rides along with the bee.
  const orb = createMicOrb(bee)

  // Orbit around the bee's center (the anchor origin). enableDamping needs
  // controls.update() every frame — done in the loop below.
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.target.copy(bee.anchor.position)
  controls.minDistance = 0.3
  controls.maxDistance = 3
  controls.update()

  function resize() {
    const width = canvas.clientWidth || 1
    const height = canvas.clientHeight || 1
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }
  resize()
  window.addEventListener('resize', resize)

  const camWorld = new THREE.Vector3()
  const timer = new THREE.Timer()
  function startLoop() {
    timer.reset() // swallow the pause gap so the bee doesn't jump
    renderer.setAnimationLoop(() => {
      timer.update()
      const dt = timer.getDelta()
      bee.controller.update(dt)
      orb.update(dt, camera.getWorldPosition(camWorld))
      controls.update()
      renderer.render(scene, camera)
    })
  }
  startLoop()

  // Click-to-cycle the orb demo, guarded so it doesn't fire on an orbit drag:
  // only a pointerup that barely moved from its pointerdown counts as a click.
  const CLICK_SLOP_PX = 6
  const downPos = new THREE.Vector2()
  const ndc = new THREE.Vector2()
  const clickRaycaster = new THREE.Raycaster()
  function onPointerDown(event: PointerEvent) {
    downPos.set(event.clientX, event.clientY)
  }
  function onPointerUp(event: PointerEvent) {
    if (Math.hypot(event.clientX - downPos.x, event.clientY - downPos.y) >= CLICK_SLOP_PX)
      return
    const rect = canvas.getBoundingClientRect()
    ndc.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    )
    clickRaycaster.setFromCamera(ndc, camera)
    if (orb.raycast(clickRaycaster))
      orb.cycleDemo()
  }
  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointerup', onPointerUp)

  let running = true
  let disposed = false

  return {
    pause() {
      if (!running || disposed)
        return
      running = false
      renderer.setAnimationLoop(null)
    },
    resume() {
      if (running || disposed)
        return
      running = true
      resize() // the window may have changed size while paused
      startLoop()
    },
    dispose() {
      if (disposed)
        return
      disposed = true
      running = false
      renderer.setAnimationLoop(null)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointerup', onPointerUp)
      controls.dispose()
      orb.dispose()
      scene.remove(bee.anchor)
      bee.dispose()
      renderer.dispose()
    },
  }
}
