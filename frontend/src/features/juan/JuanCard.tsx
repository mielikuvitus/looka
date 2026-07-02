import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { BeeExpressionController } from './beeExpressions'
import './JuanCard.css'

type XRStatus = 'idle' | 'starting' | 'in-session' | 'unsupported' | 'error'

const SESSION_REQUEST_TIMEOUT_MS = 8000
const BEE_MODEL_URL = '/models/Bee_Kinde.glb'
const BEE_TARGET_SIZE_M = 0.4

// TEMP debug: PICO controller face buttons (X/Y on the left controller,
// A/B on the right) -> bee actions, so states can be triggered without
// touching JS. Two independent input paths are wired to the same actions,
// since it isn't certain which one the emulator actually surfaces to the
// page:
//
// 1. WebXR gamepad buttons — the standard "xr-standard" mapping for
//    Quest/PICO-style controllers puts each controller's two face buttons
//    at indices 4 and 5 (X/Y on 'left', A/B on 'right'). This is the path
//    real hardware uses. EVERY button press, on any controller/index, is
//    still logged to console as
//    `[bee-debug] gamepad button <N> pressed (source <M>, <handedness>)`
//    regardless of whether it's mapped below, in case the real layout
//    differs — watch the console and correct DEBUG_GAMEPAD_BUTTON_MAP if so.
// 2. Plain keyboard keys — this emulator maps physical controller presses
//    to keyboard input (X -> 'x', Y -> 'z', A -> Space, B -> 'Delete'), so
//    this listens for those directly as a guaranteed-to-work fallback.
//
// Both are freely remappable; edit the two tables below.
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

// Session requests (or the bee load) can hang instead of rejecting — e.g.
// immersive-ar with no real passthrough camera to grant permission for on
// an emulator. Race against a timeout so that shows up as a message instead
// of a frozen "Requesting…" state with no way out.
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
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

// juan — SolidTime Bee's launcher card. Owner: juan (gentle default).
//
// "Materialize agent" goes straight into an immersive-ar session showing
// the bee — AR only now (VR was a fallback while diagnosing the emulator's
// activation/reference-space quirks; no longer needed). The bee's
// expression/speech state machine (idle/thinking/speaking clips, blink and
// mouth-flap morph targets) lives in ./beeExpressions.ts — see that file's
// header comment for the full API and .glb structure notes. Debug WebXR
// controller buttons/keyboard keys trigger states too, see
// DEBUG_GAMEPAD_BUTTON_MAP/DEBUG_KEYBOARD_MAP above.
//
// The card intentionally has no `enable-xr` anywhere in its tree — AR
// worked when this lived in XRCubeDemo/weathery.html (zero enable-xr
// markers), and broke with a "requires user activation" SecurityError once
// moved inside an enable-xr section, most likely because WebSpatial's
// synthetic spatial-tap event pipeline (natural-interactions.md) doesn't
// carry trusted user activation the way a plain click does. Confirmed fix:
// keep this whole card off the enable-xr pipeline.
//
// Repositioning: grab-and-drag via the WebXR controller's primary select
// action — point the controller ray at the bee, hold select to pick it up
// (Object3D.attach() reparents it to the controller, preserving world
// transform), release to drop it wherever the controller is. This is the
// standard WebXR interaction pattern; a thin ray line is added so there's
// visual feedback for where the controller is pointing.
//
// The old materialize-into-a-separate-window approach (window.open +
// initScene + polling Window.closed) is preserved as a comment at the
// bottom of this file, since nothing was committed to git history in
// between to fall back on.
export function JuanCard() {
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
      setMessage('navigator.xr is unavailable. WebXR needs a secure context — plain http:// on a LAN/emulator address (e.g. 10.0.2.2) usually isn’t treated as secure.')
      return
    }

    setStatus('starting')
    setMessage(`Requesting ${mode}… (waiting up to ${SESSION_REQUEST_TIMEOUT_MS / 1000}s)`)

    let session: XRSession
    try {
      // requestSession must be the very first await after the click — any
      // await before it (even a fast one, like a separate isSessionSupported
      // check) can burn through the browser's "this came from a real user
      // gesture" window, causing SecurityError: requires user activation.
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

    // Everything about the bee's own geometry (native scale, native origin)
    // is unknown until it loads, so it's built as a child of this anchor —
    // the anchor gets the "float in front of the user" / "held in hand"
    // position, the model gets auto-scaled/re-centered into its local space.
    const beeAnchor = new THREE.Group()
    scene.add(beeAnchor)

    // Invisible grab-target proxy: three.js raycasts a SkinnedMesh against
    // its static bind-pose geometry, not its currently animated pose, so
    // precise raycasting against the bee's real (animated) mesh is
    // unreliable. A generously-sized invisible sphere, matching the bee's
    // known auto-fit size, gives a reliable, pose-independent grab target
    // instead — see onSelectStart below, which raycasts beeAnchor
    // (recursively, so it still also tests the real mesh — harmless,
    // just redundant).
    const grabProxy = new THREE.Mesh(
      new THREE.SphereGeometry(BEE_TARGET_SIZE_M * 0.75),
      new THREE.MeshBasicMaterial({ visible: false }),
    )
    beeAnchor.add(grabProxy)

    // --- Controller: grab-and-drag repositioning -----------------------
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

      if (raycaster.intersectObject(beeAnchor, true).length > 0) {
        controller.attach(beeAnchor)
        heldByController = true
      }
    }

    function onSelectEnd() {
      if (heldByController) {
        scene.attach(beeAnchor)
        heldByController = false
      }
    }

    controller.addEventListener('selectstart', onSelectStart)
    controller.addEventListener('selectend', onSelectEnd)

    session.addEventListener('end', () => {
      cleanupRenderer()
      window.removeEventListener('keydown', onDebugKeyDown)
      sessionRef.current = null
      setStatus('idle')
      setMessage('XR session ended — ready to materialize again.')
    })

    // 'local-floor' makes the anchor's y mean "meters above the floor" (so
    // 1.4 ~ eye height). Not every device tracks a floor plane — this was
    // confirmed missing on the dev emulator (NotSupportedError) — so fall
    // back to 'local', whose origin is wherever the headset was when the
    // session started (already roughly eye height), meaning y: 0 there.
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

    beeAnchor.position.set(0, gotFloorSpace ? 1.4 : 0, -0.6)
    setStatus('in-session')
    setMessage('Loading bee model…')

    let beeController: BeeExpressionController | null = null

    new GLTFLoader().load(
      BEE_MODEL_URL,
      (gltf) => {
        const model = gltf.scene

        // Auto-fit: the .glb's native export scale/units are unknown, so
        // rather than guess (and risk a bee the size of a building or a
        // grain of sand — both effectively invisible), measure it and scale
        // to a known real-world size, then re-center it on its own origin.
        const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z) || 1
        model.scale.setScalar(BEE_TARGET_SIZE_M / maxDim)

        const center = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3())
        model.position.sub(center)

        beeAnchor.add(model)

        beeController = new BeeExpressionController(model, gltf.animations)
        beeController.setState('idle')

        setMessage('Bee model loaded.')
      },
      undefined,
      (err) => {
        console.error('[solidtime-bee] bee model failed to load:', err)
        setMessage('Bee model failed to load — see console.')
      },
    )

    function runDebugAction(action: BeeDebugAction) {
      if (action === 'blink')
        beeController?.blink()
      else
        beeController?.setState(action)
    }

    // Path 1: WebXR gamepad buttons. Tracks each (input source, button)
    // pair's previous pressed state to fire only on the rising edge (press,
    // not hold/repeat-per-frame). See DEBUG_GAMEPAD_BUTTON_MAP above.
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

    // Path 2: plain keyboard fallback (see DEBUG_KEYBOARD_MAP above).
    function onDebugKeyDown(event: KeyboardEvent) {
      const action = DEBUG_KEYBOARD_MAP[event.key]
      if (action) {
        console.warn(`[bee-debug] key "${event.key}" pressed -> ${action}`)
        runDebugAction(action)
      }
    }
    window.addEventListener('keydown', onDebugKeyDown)

    const clock = new THREE.Clock()
    renderer.setAnimationLoop(() => {
      beeController?.update(clock.getDelta())
      pollDebugControllerButtons()
      renderer.render(scene, camera)
    })
  }

  const isBusy = status === 'starting' || status === 'in-session'
  const isErrorStatus = status === 'unsupported' || status === 'error'

  return (
    <>
      {/* TEMP: hidden via CSS (.juan-status-bar { display: none } in
          JuanCard.css) for a clean demo/upload — still rendering/updating
          underneath, just not visible. Remove that CSS rule to bring it
          back for debugging. */}
      <div className={`juan-status-bar${isErrorStatus ? ' is-error' : ''}`}>
        {message}
      </div>

      {/* No "card" wrapper on purpose — with only one agent and one action,
          the panel/title chrome was an unnecessary extra screen between
          landing and AR. This button IS the landing UI now: tap it and go
          straight into the WebXR scene. No enable-xr anywhere here either —
          see the file-level comment for why (WebXR user-activation broke
          with it, worked without). */}
      <button
        type="button"
        className={`bee-launch-button${isBusy ? ' is-busy' : ''}`}
        onClick={() => handleMaterialize('immersive-ar')}
        disabled={isBusy}
      >
        {status === 'starting' ? 'Starting…' : 'Tap to see the bee in AR'}
      </button>
    </>
  )
}

// OLD APPROACH (materialize -> separate weathery.html window, opened via
// window.open + initScene, tracked via polling Window.closed to grey out
// this card). Superseded by the inline AR flow above, kept here for
// reference since nothing was committed to git history in between:
//
// import { initScene } from '@webspatial/react-sdk'
//
// export function JuanCard() {
//   const [materialized, setMaterialized] = useState(false)
//   const windowRef = useRef<Window | null>(null)
//
//   useEffect(() => {
//     if (!materialized)
//       return
//
//     const interval = setInterval(() => {
//       if (windowRef.current?.closed) {
//         windowRef.current = null
//         setMaterialized(false)
//       }
//     }, 500)
//
//     return () => clearInterval(interval)
//   }, [materialized])
//
//   function handleMaterialize() {
//     initScene('weathery', defaultConfig => ({
//       ...defaultConfig,
//       defaultSize: { width: '420px', height: '520px' },
//     }))
//     windowRef.current = window.open('/weathery.html', 'weathery')
//     if (windowRef.current)
//       setMaterialized(true)
//   }
//
//   return (
//     <section
//       className={`panel agent-card${materialized ? ' is-materialized' : ''}`}
//       enable-xr
//     >
//       <h2 className="panel-title">Weathery</h2>
//
//       <button
//         type="button"
//         className="ping-button"
//         onClick={handleMaterialize}
//         disabled={materialized}
//       >
//         {materialized ? 'Agent materialized' : 'Materialize agent'}
//       </button>
//     </section>
//   )
// }
