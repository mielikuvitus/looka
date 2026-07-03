import type { BeeExpressionController } from './beeExpressions'
import type { LoadedBee } from '../../playground/beeLoader'
import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { BEE_TARGET_SIZE_M, loadBee } from '../../playground/beeLoader'
import { createMicOrb, type MicOrb } from '../../playground/micOrb'
import { createVoiceLoop, type VoiceLoop } from '../../playground/voiceLoop'

type XRStatus = 'idle' | 'starting' | 'in-session' | 'unsupported' | 'error'

const SESSION_REQUEST_TIMEOUT_MS = 8000

// TEMP debug: PICO controller face buttons (X/Y on the left controller,
// A/B on the right) -> bee actions, so states can be triggered without
// touching JS. Two independent input paths are wired to the same actions,
// since it isn't certain which one the emulator actually surfaces to the
// page — see frontend/src/features/juan/README.md's "Debugging with PICO
// controller buttons" section for the full explanation. Freely remappable.
type BeeDebugAction = 'idle' | 'thinking' | 'speaking' | 'blink'

const DEBUG_GAMEPAD_BUTTON_MAP: Record<'left' | 'right', Partial<Record<number, BeeDebugAction>>> = {
  left: { 4: 'idle', 5: 'thinking' }, // X, Y
  right: { 4: 'speaking', 5: 'blink' }, // A, B
}

const DEBUG_KEYBOARD_MAP: Record<string, BeeDebugAction> = {
  'x': 'idle', // X
  'z': 'thinking', // Y
  ' ': 'speaking', // A (Space)
  'Delete': 'blink', // B (Del)
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    )
    promise.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        window.clearTimeout(timer)
        reject(err instanceof Error ? err : new Error(String(err)))
      },
    )
  })
}

// juan — SolidTime Bee's AR launch hook. Owner: juan (gentle default).
//
// Used by SpatialLanding.tsx (the app's live entry point once WebSpatial
// Runtime is detected — see App.tsx). The bee's expression/speech state
// machine (idle/thinking/speaking clips, blink and mouth-flap morph
// targets) lives in ./beeExpressions.ts — see that file's header comment
// for the full API and .glb structure notes.
export function useBeeLaunch() {
  const [status, setStatus] = useState<XRStatus>('idle')
  const [message, setMessage] = useState('Idle')
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sessionRef = useRef<XRSession | null>(null)

  const cleanupRenderer = useCallback(() => {
    const renderer = rendererRef.current
    if (renderer) {
      renderer.setAnimationLoop(null)
      renderer.dispose()
      renderer.domElement.remove()
      rendererRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      cleanupRenderer()
      sessionRef.current?.end().catch(() => {})
    }
  }, [cleanupRenderer])

  useEffect(() => {
    if (status !== 'in-session')
      return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape')
        sessionRef.current?.end().catch(() => {})
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [status])

  async function handleMaterialize(mode: XRSessionMode) {
    if (!navigator.xr) {
      setStatus('unsupported')
      setMessage('navigator.xr is unavailable. WebXR needs a secure context — plain http:// on a LAN/emulator address (e.g. 10.0.2.2) usually isn\'t treated as secure.')
      return
    }

    setStatus('starting')
    setMessage(`Requesting ${mode}… (waiting up to ${SESSION_REQUEST_TIMEOUT_MS / 1000}s)`)

    let session: XRSession
    try {
      // requestSession must be the very first await after the click — see
      // README.md's "Key gotchas" section (any await before it can burn
      // through the browser's user-activation window).
      session = await withTimeout(
        navigator.xr.requestSession(mode, { optionalFeatures: ['local-floor'] }),
        SESSION_REQUEST_TIMEOUT_MS,
        `${mode} session request`,
      )
    }
    catch (err) {
      console.error(`[solidtime-bee] ${mode} request failed:`, err)
      setStatus('error')
      setMessage(`${err instanceof Error ? err.message : String(err)}. If this was a timeout, reload the page before trying another mode.`)
      return
    }

    sessionRef.current = session
    setMessage(`Session started (${mode}) — loading bee…`)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.xr.enabled = true
    document.body.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera()
    scene.add(new THREE.HemisphereLight(0xFFFFFF, 0x444444, 1.2))
    const directional = new THREE.DirectionalLight(0xFFFFFF, 1)
    directional.position.set(0.5, 1, 0.5)
    scene.add(directional)

    // bee/beeAnchor/grabProxy/orb/voiceLoop only exist once loadBee()
    // resolves below — onSelectStart/onSelectEnd guard on them being
    // non-null so the controller is interactive from the first frame
    // without waiting on the model load.
    let bee: LoadedBee | null = null
    let beeAnchor: THREE.Group | null = null
    let grabProxy: THREE.Mesh | null = null
    let orb: MicOrb | null = null
    let voiceLoop: VoiceLoop | null = null
    let sessionEnded = false

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
      if (!beeAnchor || !grabProxy)
        return
      controllerRotation.identity().extractRotation(controller.matrixWorld)
      raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld)
      raycaster.ray.direction.set(0, 0, -1).applyMatrix4(controllerRotation)
      // The mic orb wins over the bee grab: aiming at it + trigger taps the
      // voice loop instead of picking up the bee (ported from
      // playground/headsetAdapter.ts — same reason it lives in-scene there:
      // a DOM mic button racing a live XR session for getUserMedia is what
      // used to kill the session and look like a page reload).
      if (orb?.raycast(raycaster)) {
        voiceLoop?.tap()
        return
      }
      // Grab-test ONLY the invisible sphere proxy (non-recursive), never the
      // whole beeAnchor subtree: raycasting a SkinnedMesh hits its static
      // bind pose, not the animated pose (unreliable), and the mic orb is
      // itself a child of beeAnchor, so a recursive test would let the
      // orb's label/dots register as a bee grab too.
      if (raycaster.intersectObject(grabProxy, false).length > 0) {
        controller.attach(beeAnchor)
        heldByController = true
      }
    }

    function onSelectEnd() {
      if (heldByController && beeAnchor) {
        scene.attach(beeAnchor)
        heldByController = false
      }
    }

    controller.addEventListener('selectstart', onSelectStart)
    controller.addEventListener('selectend', onSelectEnd)

    session.addEventListener('end', () => {
      sessionEnded = true
      controller.removeEventListener('selectstart', onSelectStart)
      controller.removeEventListener('selectend', onSelectEnd)
      rayLine.geometry.dispose()
      ;(rayLine.material as THREE.Material).dispose()
      grabProxy?.geometry.dispose()
      ;(grabProxy?.material as THREE.Material | undefined)?.dispose()
      voiceLoop?.dispose()
      orb?.dispose()
      bee?.dispose()
      cleanupRenderer()
      window.removeEventListener('keydown', onDebugKeyDown)
      sessionRef.current = null
      setStatus('idle')
      setMessage('XR session ended — ready to materialize again.')
    })

    let gotFloorSpace = true
    try {
      renderer.xr.setReferenceSpaceType('local-floor')
      await renderer.xr.setSession(session)
    }
    catch (err) {
      console.warn('[solidtime-bee] local-floor unsupported, falling back to local:', err)
      gotFloorSpace = false
      try {
        renderer.xr.setReferenceSpaceType('local')
        await renderer.xr.setSession(session)
      }
      catch (err2) {
        console.error('[solidtime-bee] setSession failed even with local reference space:', err2)
        setStatus('error')
        setMessage('Failed to attach the XR session to the renderer.')
        cleanupRenderer()
        return
      }
    }

    setStatus('in-session')
    setMessage('Loading bee model…')

    let beeController: BeeExpressionController | null = null

    loadBee().then((loadedBee) => {
      // The session (Escape / headset exit gesture) can end before the
      // model finishes loading — don't wire a freshly loaded bee into a
      // scene that's already torn down, and don't leak it either.
      if (sessionEnded) {
        loadedBee.dispose()
        return
      }

      bee = loadedBee
      beeAnchor = bee.anchor
      scene.add(beeAnchor)
      beeAnchor.position.set(0, gotFloorSpace ? 1.4 : 0, -0.6)

      // Invisible grab-target proxy: three.js raycasts a SkinnedMesh against
      // its static bind-pose geometry, not its currently animated pose, so
      // precise raycasting against the bee's real (animated) mesh is
      // unreliable. A generously-sized invisible sphere gives a reliable,
      // pose-independent grab target instead.
      grabProxy = new THREE.Mesh(
        new THREE.SphereGeometry(BEE_TARGET_SIZE_M * 0.75),
        new THREE.MeshBasicMaterial({ visible: false }),
      )
      beeAnchor.add(grabProxy)

      beeController = bee.controller

      // The mic orb: a small tappable sphere floating above the bee's head,
      // reflecting the voice loop's state. Ported from
      // playground/{micOrb,voiceLoop}.ts — see useBeeLaunch's own comment
      // above onSelectStart for why voice lives in-scene now instead of a
      // separate DOM button.
      orb = createMicOrb(bee)
      voiceLoop = createVoiceLoop({ orb, controller: bee.controller })

      setMessage('Bee model loaded.')
    }).catch((err) => {
      console.error('[solidtime-bee] bee model failed to load:', err)
      setMessage('Bee model failed to load — see console.')
    })

    function runDebugAction(action: BeeDebugAction) {
      if (action === 'blink')
        beeController?.blink()
      else
        beeController?.setState(action)
    }

    // Path 1: WebXR gamepad buttons.
    const prevButtonPressed = new Map<string, boolean>()
    function pollDebugControllerButtons() {
      session.inputSources.forEach((inputSource, sourceIndex) => {
        const gamepad = inputSource.gamepad
        if (!gamepad)
          return

        gamepad.buttons.forEach((button, buttonIndex) => {
          const key = `${sourceIndex}:${buttonIndex}`
          const wasPressed = prevButtonPressed.get(key) ?? false
          if (button.pressed && !wasPressed) {
            console.warn(`[bee-debug] gamepad button ${buttonIndex} pressed (source ${sourceIndex}, ${inputSource.handedness})`)
            const handednessMap = inputSource.handedness === 'left' || inputSource.handedness === 'right'
              ? DEBUG_GAMEPAD_BUTTON_MAP[inputSource.handedness]
              : undefined
            const action = handednessMap?.[buttonIndex]
            if (action)
              runDebugAction(action)
          }
          prevButtonPressed.set(key, button.pressed)
        })
      })
    }

    // Path 2: plain keyboard fallback.
    function onDebugKeyDown(event: KeyboardEvent) {
      const action = DEBUG_KEYBOARD_MAP[event.key]
      if (action) {
        console.warn(`[bee-debug] key "${event.key}" pressed -> ${action}`)
        runDebugAction(action)
      }
    }
    window.addEventListener('keydown', onDebugKeyDown)

    const clock = new THREE.Clock()
    const camWorld = new THREE.Vector3()
    renderer.setAnimationLoop(() => {
      const dt = clock.getDelta()
      beeController?.update(dt)
      if (orb) {
        orb.update(dt, camera.getWorldPosition(camWorld))
        // Continuous hover check (same ray math as onSelectStart, run every
        // frame instead of only on trigger-pull) so aiming at the orb is
        // visually obvious — the orb highlights white — before tapping it.
        controllerRotation.identity().extractRotation(controller.matrixWorld)
        raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld)
        raycaster.ray.direction.set(0, 0, -1).applyMatrix4(controllerRotation)
        orb.setHovered(orb.raycast(raycaster))
      }
      pollDebugControllerButtons()
      renderer.render(scene, camera)
    })
  }

  return {
    status,
    message,
    handleMaterialize,
    isBusy: status === 'starting' || status === 'in-session',
    isErrorStatus: status === 'unsupported' || status === 'error',
  }
}
