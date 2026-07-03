// Looka playground — headset AR interaction: fixed floating placement, a
// controller ray, and ray-grab (squeeze the trigger on the bee to carry it).
// No DOM UI — headsets don't get the dom-overlay. Plain three.js + WebXR,
// no WebSpatial, no React (see main.ts header).
//
// Grab targeting uses an invisible sphere proxy (ported from
// features/juan/useBeeLaunch.ts): three.js raycasts a SkinnedMesh against
// its static bind-pose geometry, not its currently animated pose, so
// raycasting the bee's real mesh is unreliable — a generously-sized
// invisible sphere gives a stable, pose-independent grab target.

import type { LoadedBee } from './beeLoader'
import type { MicOrb } from './micOrb'
import type { VoiceLoop } from './voiceLoop'
import type { ArSessionContext } from './xrSession'
import * as THREE from 'three'
import { BEE_TARGET_SIZE_M } from './beeLoader'

export interface HeadsetAdapterOptions {
  ctx: ArSessionContext
  bee: LoadedBee
  /** The mic orb — aiming at it + trigger taps the voice loop instead of grabbing the bee. */
  orb: MicOrb
  /** The voice loop — invoked when the orb ray hits. */
  voiceLoop: VoiceLoop
}

export interface HeadsetAdapter {
  dispose: () => void
}

export function createHeadsetAdapter(options: HeadsetAdapterOptions): HeadsetAdapter {
  const { ctx, bee, orb, voiceLoop } = options
  const { renderer, scene } = ctx

  // Eye height with a floor-relative space, floor height otherwise (the
  // reference-space fallback moves the origin to the head — see xrSession.ts).
  bee.anchor.position.set(0, ctx.gotFloorSpace ? 1.4 : 0, -0.6)
  bee.anchor.visible = true

  const grabProxy = new THREE.Mesh(
    new THREE.SphereGeometry(BEE_TARGET_SIZE_M * 0.75),
    new THREE.MeshBasicMaterial({ visible: false }),
  )
  bee.anchor.add(grabProxy)

  const controller = renderer.xr.getController(0)
  scene.add(controller)

  const rayLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]),
    new THREE.LineBasicMaterial({ color: 0xFFFFFF }),
  )
  rayLine.scale.z = 5
  controller.add(rayLine)

  const raycaster = new THREE.Raycaster()
  const controllerRotation = new THREE.Matrix4()
  let heldByController = false

  function onSelectStart() {
    controllerRotation.identity().extractRotation(controller.matrixWorld)
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld)
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(controllerRotation)
    // Orb wins over the bee grab: aiming at it + trigger taps the voice loop.
    if (orb.raycast(raycaster)) {
      voiceLoop.tap()
      return
    }
    // Grab-test ONLY the bee's invisible sphere proxy (non-recursive), never
    // the whole bee.anchor subtree: the mic orb is a child of bee.anchor, so
    // a recursive test would let the orb's label/dots register as a bee grab.
    if (raycaster.intersectObject(grabProxy, false).length > 0) {
      controller.attach(bee.anchor)
      heldByController = true
    }
  }

  function onSelectEnd() {
    if (heldByController) {
      scene.attach(bee.anchor)
      heldByController = false
    }
  }

  controller.addEventListener('selectstart', onSelectStart)
  controller.addEventListener('selectend', onSelectEnd)

  return {
    dispose() {
      if (heldByController) {
        scene.attach(bee.anchor)
        heldByController = false
      }
      controller.removeEventListener('selectstart', onSelectStart)
      controller.removeEventListener('selectend', onSelectEnd)
      controller.remove(rayLine)
      rayLine.geometry.dispose()
      ;(rayLine.material as THREE.Material).dispose()
      scene.remove(controller)
      bee.anchor.remove(grabProxy)
      grabProxy.geometry.dispose()
      ;(grabProxy.material as THREE.Material).dispose()
    },
  }
}
