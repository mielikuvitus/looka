// Looka playground — bee model loading, shared by the page canvas and AR
// sessions. Plain three.js, no WebSpatial, no React (see main.ts header).
//
// The bee is loaded fresh per rendering context (page canvas + each AR
// session) because a GPU-uploaded model can't be shared across renderers
// safely; the second load hits the HTTP cache so the cost is parse-only.
// Expression/animation behaviour is delegated entirely to
// BeeExpressionController — see features/juan/beeExpressions.ts for the
// full API and .glb structure notes.

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { BeeExpressionController } from '../features/juan/beeExpressions'

const BEE_MODEL_URL = '/models/Bee_Kinde.glb'

/** The bee's longest bounding-box dimension after auto-fit, in meters. */
export const BEE_TARGET_SIZE_M = 0.4

export interface LoadedBee {
  /**
   * Group wrapping the (re-centered) model — position/attach this, never the
   * model itself. The bee's visual center sits at the anchor's origin.
   */
  anchor: THREE.Group
  /** Drives idle/thinking/speaking clips — call `controller.update(dt)` every frame. */
  controller: BeeExpressionController
  /** Stops animations and frees GPU resources. Remove `anchor` from the scene first. */
  dispose: () => void
}

/**
 * Load `Bee_Kinde.glb`, auto-fit it to {@link BEE_TARGET_SIZE_M} via its
 * bounding box, re-center it inside a fresh anchor group, and start the
 * idle animation.
 */
export async function loadBee(): Promise<LoadedBee> {
  const gltf = await new GLTFLoader().loadAsync(BEE_MODEL_URL)
  const model = gltf.scene

  // Auto-fit: scale so the longest side is BEE_TARGET_SIZE_M, then re-center
  // so the anchor origin is the bee's visual center (recompute the box after
  // scaling — the center moves with the scale).
  const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z) || 1
  model.scale.setScalar(BEE_TARGET_SIZE_M / maxDim)
  const center = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3())
  model.position.sub(center)

  const anchor = new THREE.Group()
  anchor.add(model)

  const controller = new BeeExpressionController(model, gltf.animations)
  controller.setState('idle')

  const dispose = () => {
    controller.dispose()
    model.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!(mesh instanceof THREE.Mesh))
        return
      mesh.geometry.dispose()
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const material of materials) {
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture)
            value.dispose()
        }
        material.dispose()
      }
    })
    anchor.remove(model)
  }

  return { anchor, controller, dispose }
}
