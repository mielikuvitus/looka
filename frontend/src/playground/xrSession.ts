// Looka playground — AR session lifecycle. This module owns the ONLY
// `requestSession` call in the playground, and it only ever asks for
// 'immersive-ar' (never 'immersive-vr'). Plain three.js + WebXR, no
// WebSpatial, no React (see main.ts header).
//
// Hard-won WebXR gotchas carried over from features/juan/useBeeLaunch.ts —
// keep all of these when refactoring:
// 1. `navigator.xr.requestSession` must be the VERY FIRST await after the
//    user click; any await before it can burn through the browser's
//    user-activation window. (Capability checks belong at page load —
//    main.ts does that — never in the click handler.)
// 2. The request is wrapped in an 8s timeout: the PICO emulator can hang
//    forever instead of rejecting.
// 3. Reference space: try 'local-floor', fall back to 'local', and remember
//    which one won — content height differs (y=1.4 vs y=0), see
//    `gotFloorSpace` and headsetAdapter.ts.
// 4. Escape ends the session (desktop-testing fallback; headsets have their
//    own system gesture, phones get the dom-overlay exit button).

import * as THREE from 'three'

const SESSION_REQUEST_TIMEOUT_MS = 8000

export type FrameCallback = (time: number, frame: XRFrame) => void

export interface ArSessionContext {
  session: XRSession
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  /** True when 'local-floor' won: y=0 is the floor. False: y=0 is head height. */
  gotFloorSpace: boolean
  /** Run `cb` every XR frame, before the scene renders. */
  addFrameCallback: (cb: FrameCallback) => void
  removeFrameCallback: (cb: FrameCallback) => void
}

export interface StartArSessionOptions {
  /**
   * Root element for the (optional) dom-overlay feature — only meaningful on
   * handheld AR; headsets simply don't grant the feature.
   */
  domOverlayRoot?: HTMLElement | null
  /** Called exactly once, after all session cleanup, when the session ends for any reason. */
  onEnd: () => void
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
  onLateResolve?: (value: T) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let timedOut = false
    const timer = window.setTimeout(() => {
      timedOut = true
      reject(new Error(`${label} timed out after ${ms}ms`))
    }, ms)
    promise.then(
      (value) => {
        window.clearTimeout(timer)
        // A value that arrives after the timeout already rejected must not be
        // silently dropped — the caller may need to release it (e.g. end an
        // XRSession granted late, so a retry isn't bricked by InvalidStateError).
        if (timedOut)
          onLateResolve?.(value)
        else
          resolve(value)
      },
      (err) => {
        window.clearTimeout(timer)
        reject(err instanceof Error ? err : new Error(String(err)))
      },
    )
  })
}

/**
 * Request an immersive-ar session and stand up a dedicated renderer/scene
 * for it (disposed automatically on session end). MUST be the first call —
 * with no awaits before it — inside a user-gesture handler (gotcha 1).
 */
export async function startArSession(options: StartArSessionOptions): Promise<ArSessionContext> {
  if (!navigator.xr) {
    throw new Error(
      'navigator.xr is unavailable. WebXR needs a secure context — use localhost '
      + '(e.g. via `adb reverse`); plain http:// on a LAN/emulator address isn\'t treated as secure.',
    )
  }

  const sessionInit: XRSessionInit = {
    optionalFeatures: ['local-floor', 'hit-test', 'dom-overlay'],
  }
  if (options.domOverlayRoot)
    sessionInit.domOverlay = { root: options.domOverlayRoot }

  // Gotchas 1 + 2: first await after the click, wrapped in a timeout.
  const session = await withTimeout(
    navigator.xr.requestSession('immersive-ar', sessionInit),
    SESSION_REQUEST_TIMEOUT_MS,
    'immersive-ar session request',
    // Granted after the timeout (e.g. a slow permission prompt): close it
    // immediately so the browser drops back to the page and a retry works.
    lateSession => lateSession.end().catch(() => {}),
  )

  // Dedicated renderer per session — the page canvas keeps its own renderer
  // (paused by main.ts), so AR teardown can be a clean full dispose.
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.xr.enabled = true
  document.body.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera()
  scene.add(new THREE.HemisphereLight(0xFFFFFF, 0x444444, 1.2))
  const directional = new THREE.DirectionalLight(0xFFFFFF, 1)
  directional.position.set(0.5, 1, 0.5)
  scene.add(directional)

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape')
      session.end().catch(() => {})
  }
  window.addEventListener('keydown', onKeyDown)

  session.addEventListener('end', () => {
    renderer.setAnimationLoop(null)
    renderer.dispose()
    renderer.domElement.remove()
    window.removeEventListener('keydown', onKeyDown)
    options.onEnd()
  })

  // Gotcha 3: local-floor first, plain local as the fallback.
  let gotFloorSpace = true
  try {
    renderer.xr.setReferenceSpaceType('local-floor')
    await renderer.xr.setSession(session)
  }
  catch (err) {
    console.warn('[playground] local-floor unsupported, falling back to local:', err)
    gotFloorSpace = false
    try {
      renderer.xr.setReferenceSpaceType('local')
      await renderer.xr.setSession(session)
    }
    catch (err2) {
      session.end().catch(() => {})
      throw new Error(`Failed to attach the XR session to the renderer: ${err2 instanceof Error ? err2.message : String(err2)}`)
    }
  }

  const frameCallbacks = new Set<FrameCallback>()
  renderer.setAnimationLoop((time: number, frame?: XRFrame) => {
    if (frame) {
      for (const cb of frameCallbacks)
        cb(time, frame)
    }
    renderer.render(scene, camera)
  })

  return {
    session,
    renderer,
    scene,
    camera,
    gotFloorSpace,
    addFrameCallback: cb => void frameCallbacks.add(cb),
    removeFrameCallback: cb => void frameCallbacks.delete(cb),
  }
}
