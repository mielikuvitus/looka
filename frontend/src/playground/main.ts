// Looka playground — cross-platform WebXR entry point (playground.html).
//
// HARD CONSTRAINTS for everything under src/playground/ — do not relax:
// - No WebSpatial: no webspatial SDK imports, no UA sniffing, no ?spatial
//   param. This page must run on any WebXR browser (Android Chrome, PICO,
//   Quest) untouched by the spatial runtime.
// - No React and no JSX: plain TypeScript + DOM + three.js in .ts files
//   only. tsconfig.app.json sets jsxImportSource to the WebSpatial react-sdk
//   project-wide, so any JSX here would transitively pull WebSpatial into
//   this bundle.
// - Exactly one XR session type: 'immersive-ar' (owned by xrSession.ts).
//
// Flow: page loads -> canvas floor shows the idling bee -> a page-load
// capability check reveals the "Enter your space" button -> click starts an
// immersive-ar session -> inputRouter picks the phone or headset adapter
// from the session's input sources -> session end resumes the canvas floor.

import type { LoadedBee } from './beeLoader'
import type { CanvasFloor } from './canvasFloor'
import type { InputRouter } from './inputRouter'
import type { MicOrb } from './micOrb'
import type { ArSessionContext } from './xrSession'
import * as THREE from 'three'
import { loadBee } from './beeLoader'
import { startCanvasFloor } from './canvasFloor'
import { createHeadsetAdapter } from './headsetAdapter'
import { createInputRouter } from './inputRouter'
import { createMicOrb } from './micOrb'
import { createPhoneAdapter } from './phoneAdapter'
import { startArSession } from './xrSession'
import './playground.css'

const SECURE_CONTEXT_MESSAGE
  = 'WebXR is unavailable (navigator.xr is undefined). It needs a secure context — '
    + 'open this page via localhost (e.g. `adb reverse tcp:5173 tcp:5173` for a headset/'
    + 'phone), not a plain http:// LAN address.'

function requireElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id)
  if (!el)
    throw new Error(`[playground] missing required element #${id} in playground.html`)
  return el as T
}

const canvas = requireElement<HTMLCanvasElement>('playground-canvas')
const statusEl = requireElement<HTMLParagraphElement>('playground-status')
const enterButton = requireElement<HTMLButtonElement>('enter-ar')
const overlayRoot = requireElement<HTMLDivElement>('ar-overlay')

function setStatus(text: string, isError = false) {
  statusEl.textContent = text
  statusEl.classList.toggle('is-error', isError)
}

// --- canvas floor (the always-available page view of the bee) ---------------
let floor: CanvasFloor | null = null
let arActive = false

startCanvasFloor(canvas)
  .then((f) => {
    floor = f
    // The user may have entered AR while the floor was still loading — don't
    // let a second render loop fight the XR session for the GPU.
    if (arActive)
      f.pause()
  })
  .catch((err) => {
    console.error('[playground] canvas floor failed to start:', err)
    setStatus('The page preview failed to load — AR may still work.', true)
  })

// --- page-load capability gate ----------------------------------------------
// The isSessionSupported check happens here, NEVER in the click handler:
// requestSession must be the first await after the click (see xrSession.ts).
async function checkArSupport() {
  if (!navigator.xr) {
    setStatus(SECURE_CONTEXT_MESSAGE, true)
    return
  }
  let supported = false
  try {
    supported = await navigator.xr.isSessionSupported('immersive-ar')
  }
  catch (err) {
    console.warn('[playground] isSessionSupported check failed:', err)
  }
  if (supported) {
    enterButton.hidden = false
    setStatus('Your device supports AR. Drag to orbit the bee, or step into your space.')
  }
  else {
    setStatus('This browser has WebXR but no immersive-ar support — you can still orbit the bee here.')
  }
}
void checkArSupport()

// --- AR session flow ----------------------------------------------------------
async function enterAr() {
  enterButton.disabled = true
  arActive = true
  floor?.pause()

  let ended = false
  let bee: LoadedBee | null = null
  let orb: MicOrb | null = null
  let router: InputRouter | null = null
  let adapter: { dispose: () => void } | null = null
  // When the session is being torn down because of a failure, the error text
  // must survive the deferred 'end' event — otherwise handleSessionEnd would
  // clobber it with the benign message below.
  let endError: string | null = null

  const handleSessionEnd = () => {
    ended = true
    arActive = false
    adapter?.dispose()
    adapter = null
    router?.dispose()
    router = null
    orb?.dispose()
    orb = null
    bee?.dispose()
    bee = null
    floor?.resume()
    enterButton.disabled = false
    if (endError)
      setStatus(endError, true)
    else
      setStatus('AR session ended — the bee is back on the page.')
  }

  let ctx: ArSessionContext
  try {
    // No awaits above this line after the click (user-activation window) —
    // startArSession's first await is requestSession itself.
    ctx = await startArSession({ domOverlayRoot: overlayRoot, onEnd: handleSessionEnd })
  }
  catch (err) {
    console.error('[playground] failed to start AR session:', err)
    arActive = false
    floor?.resume()
    enterButton.disabled = false
    const detail = err instanceof Error ? err.message : String(err)
    // Keep the error visible even if a deferred 'end' event fires after this
    // catch (e.g. the reference-space attach failure path ends the session).
    endError = detail
    setStatus(detail, true)
    return
  }

  setStatus('In AR — loading the bee into your space…')

  // Fresh bee per session (the page bee lives in a different GL context);
  // this second load is served from the HTTP cache.
  try {
    bee = await loadBee()
  }
  catch (err) {
    console.error('[playground] bee failed to load in AR:', err)
    endError = 'The bee model failed to load — the AR session was ended.'
    setStatus(endError, true)
    ctx.session.end().catch(() => {})
    return
  }
  if (ended) {
    // The session died while the model was loading.
    bee.dispose()
    bee = null
    return
  }

  bee.anchor.visible = false // the winning adapter decides placement + visibility
  ctx.scene.add(bee.anchor)

  // The mic orb parents itself to bee.anchor, so it follows the bee wherever
  // an adapter places or carries it.
  orb = createMicOrb(bee)
  const sessionOrb = orb

  const timer = new THREE.Timer()
  const sessionBee = bee
  const camWorld = new THREE.Vector3()
  ctx.addFrameCallback(() => {
    timer.update()
    const dt = timer.getDelta()
    sessionBee.controller.update(dt)
    sessionOrb.update(dt, ctx.camera.getWorldPosition(camWorld))
  })

  router = createInputRouter({
    session: ctx.session,
    onAdapter: (kind) => {
      if (ended || !bee)
        return
      // A late 'headset' decision replaces the provisional phone adapter.
      adapter?.dispose()
      adapter = kind === 'headset'
        ? createHeadsetAdapter({ ctx, bee, orb: sessionOrb })
        : createPhoneAdapter({ ctx, bee, overlayRoot, orb: sessionOrb })
    },
  })

  setStatus('In AR — end the session from your device (or Escape on a desktop) to come back.')
}

enterButton.addEventListener('click', () => {
  void enterAr()
})
