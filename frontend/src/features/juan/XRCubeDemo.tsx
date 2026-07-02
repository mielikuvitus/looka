import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import './XRCubeDemo.css'

type XRStatus = 'idle' | 'starting' | 'in-session' | 'ending' | 'unsupported' | 'error'

const SESSION_REQUEST_TIMEOUT_MS = 8000

// Session requests can hang forever instead of rejecting — e.g. immersive-ar
// on an emulator with no real passthrough camera to grant permission for.
// Race against a timeout so that shows up as a message instead of a frozen
// "Requesting…" state with no way out.
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

// juan — WebXR cube experiment. Owner: juan (gentle default).
//
// Raw WebXR + three.js, NOT WebSpatial's <Model>/<Reality> — neither of
// those expose animation/rig control (see the bee investigation), so this
// is a from-scratch test of the other path: a real immersive-vr/ar session
// rendering a plain cube. Per .webspatial/docs/concepts/webspatial-app.md,
// starting a WebXR session takes over the whole space and hides the app's
// 2D/spatialized UI while it's active — that's expected and fine here,
// which is exactly why this lives in its own materialized window rather
// than the main room. Because the 2D DOM is hidden during the session, any
// in-page "Exit" button would be unreachable while immersive — exiting has
// to come from the system/headset's own affordance (Home button, browser's
// built-in Exit-VR control) or the Escape key as a desktop-testing fallback.
// Both paths end up firing the standard `sessionend` event, which we use to
// close this window and return to the room. Starting a session requires a
// fresh user gesture, so it can't auto-start when the window opens — it
// waits for an "Enter AR"/"Enter VR" tap. AR and VR are separate buttons
// rather than an automatic AR-then-VR fallback: a hung AR request (e.g. no
// real passthrough camera on an emulator) can't be reliably cancelled from
// JS, so chaining a VR attempt right after risks the same stuck state.
export function XRCubeDemo() {
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

  async function handleEnterXR(mode: XRSessionMode) {
    if (!navigator.xr) {
      setStatus('unsupported')
      setMessage('navigator.xr is unavailable. WebXR needs a secure context — plain http:// on a LAN/emulator address (e.g. 10.0.2.2) usually isn’t treated as secure.')
      return
    }

    setStatus('starting')
    setMessage(`Checking ${mode} support…`)

    let session: XRSession
    try {
      const supported = await withTimeout(
        navigator.xr.isSessionSupported(mode),
        SESSION_REQUEST_TIMEOUT_MS,
        `${mode} support check`,
      )
      if (!supported) {
        setStatus('unsupported')
        setMessage(`${mode} is not supported here.`)
        return
      }

      setMessage(`Requesting ${mode}… (waiting up to ${SESSION_REQUEST_TIMEOUT_MS / 1000}s)`)
      session = await withTimeout(
        navigator.xr.requestSession(mode, { optionalFeatures: ['local-floor'] }),
        SESSION_REQUEST_TIMEOUT_MS,
        `${mode} session request`,
      )
    }
    catch (err) {
      // A timeout here means the underlying request may still be pending at
      // the OS/runtime level (e.g. stuck on a passthrough-camera permission
      // that can't be granted on an emulator with no real camera) — we can't
      // cancel that from JS. Reloading this window (close + re-materialize)
      // clears it; a same-tab retry of a *different* mode is not guaranteed
      // to work while the old request is still outstanding.
      console.error(`[xr-cube] ${mode} request failed:`, err)
      setStatus('error')
      setMessage(`${err instanceof Error ? err.message : `${mode} failed`}. If this was a timeout, close and re-materialize the agent before trying another mode.`)
      return
    }

    sessionRef.current = session
    setMessage(`Session started (${mode}) — rendering cube…`)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.xr.enabled = true
    document.body.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera()

    // Unlit on purpose: guaranteed visible regardless of lighting/angle,
    // ruling out "the color/shading made it invisible" as a variable.
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.3, 0.3),
      new THREE.MeshBasicMaterial({ color: 0xFF3B30 }),
    )
    scene.add(cube)

    session.addEventListener('end', () => {
      setStatus('ending')
      setMessage('XR session ended — closing window…')
      cleanupRenderer()
      sessionRef.current = null
      window.setTimeout(() => window.close(), 500)
    })

    // 'local-floor' makes y mean "meters above the floor", so a cube at
    // y: 1.4 sits at roughly eye height. Not every device tracks a floor
    // plane though — this emulator doesn't, and throws NotSupportedError
    // for it — so fall back to 'local', whose origin is wherever the
    // headset was when the session started (roughly eye height already),
    // meaning y: 0 is the right "in front of you" height there instead.
    let gotFloorSpace = true
    try {
      renderer.xr.setReferenceSpaceType('local-floor')
      await renderer.xr.setSession(session)
    }
    catch (err) {
      console.warn('[xr-cube] local-floor unsupported, falling back to local:', err)
      gotFloorSpace = false
      try {
        renderer.xr.setReferenceSpaceType('local')
        await renderer.xr.setSession(session)
      }
      catch (err2) {
        console.error('[xr-cube] setSession failed even with local reference space:', err2)
        setStatus('error')
        setMessage('Failed to attach the XR session to the renderer.')
        cleanupRenderer()
        return
      }
    }

    cube.position.set(0, gotFloorSpace ? 1.4 : 0, -0.6)
    setStatus('in-session')
    renderer.setAnimationLoop(() => {
      cube.rotation.y += 0.01
      cube.rotation.x += 0.005
      renderer.render(scene, camera)
    })
  }

  const isErrorStatus = status === 'unsupported' || status === 'error'

  return (
    <main className="xr-cube-shell">
      <div className={`xr-cube-status${isErrorStatus ? ' is-error' : ''}`}>
        {message}
      </div>

      {status !== 'in-session' && status !== 'ending' && (
        <div className="xr-cube-actions">
          <button
            type="button"
            className="ping-button"
            onClick={() => handleEnterXR('immersive-ar')}
            disabled={status === 'starting'}
          >
            {status === 'starting' ? 'Starting…' : 'Enter AR (see your room)'}
          </button>
          <button
            type="button"
            className="ping-button"
            onClick={() => handleEnterXR('immersive-vr')}
            disabled={status === 'starting'}
          >
            {status === 'starting' ? 'Starting…' : 'Enter VR (cube only)'}
          </button>
        </div>
      )}
    </main>
  )
}
