// Looka playground — placement reticle for phone AR (hit-test) sessions.
// Plain three.js, no WebSpatial, no React (see main.ts header).

import * as THREE from 'three'

export interface Reticle {
  /** Add this to the AR scene. Hidden until a hit-test result comes in. */
  mesh: THREE.Mesh
  /**
   * Update the reticle from this frame's hit-test results. Returns true when
   * a surface was hit (the reticle is visible and its matrix is current).
   */
  updateFromHitTest: (frame: XRFrame, hitTestSource: XRHitTestSource, referenceSpace: XRReferenceSpace) => boolean
  dispose: () => void
}

export function createReticle(): Reticle {
  const geometry = new THREE.RingGeometry(0.06, 0.08, 32)
  geometry.rotateX(-Math.PI / 2) // flat on the floor, facing up
  const material = new THREE.MeshBasicMaterial({
    color: 0xDC0073, // Looka pink
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
  })

  const mesh = new THREE.Mesh(geometry, material)
  // Pose comes straight from the hit-test result matrix each frame.
  mesh.matrixAutoUpdate = false
  mesh.visible = false

  return {
    mesh,
    updateFromHitTest(frame, hitTestSource, referenceSpace) {
      const hit = frame.getHitTestResults(hitTestSource)[0]
      const pose = hit?.getPose(referenceSpace)
      if (!pose) {
        mesh.visible = false
        return false
      }
      mesh.visible = true
      mesh.matrix.fromArray(pose.transform.matrix)
      return true
    },
    dispose() {
      mesh.removeFromParent()
      geometry.dispose()
      material.dispose()
    },
  }
}
