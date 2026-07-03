// Looka playground — decides which interaction adapter an AR session gets.
// Plain WebXR + DOM, no WebSpatial, no React (see main.ts header).
//
// The decision is based ONLY on the session's XR input sources, never on
// user-agent sniffing:
// - a 'tracked-pointer' source means real tracked controllers, and a
//   'transient-pointer' source means visionOS-style pinch input (a transient
//   tracked source spawned per pinch) -> headset adapter, chosen immediately
//   — even if the source shows up late, which also rescues a session that
//   was initially misrouted to phone (some headsets attach their controllers
//   noticeably after session start, and pinch sources only exist mid-pinch);
// - a 'screen' source means handheld-style taps -> phone adapter;
// - no sources at all after a short grace window -> phone adapter (handheld
//   AR sessions often have zero persistent input sources until the first
//   touch).
//
// The router can therefore fire onAdapter twice: 'phone' first, then
// 'headset' if tracked controllers appear. It never downgrades to 'phone'
// once 'headset' won.

export type AdapterKind = 'headset' | 'phone'

const PHONE_GRACE_WINDOW_MS = 500

export interface InputRouterOptions {
  session: XRSession
  /** May fire twice: once with 'phone', later with 'headset' (never the reverse). */
  onAdapter: (kind: AdapterKind, reason: string) => void
}

export interface InputRouter {
  dispose: () => void
}

function hasHeadsetStyleInput(sources: readonly XRInputSource[]): boolean {
  return sources.some(source =>
    source.targetRayMode === 'tracked-pointer' || source.targetRayMode === 'transient-pointer',
  )
}

function hasScreenStyleInput(sources: readonly XRInputSource[]): boolean {
  return sources.some(source => source.targetRayMode === 'screen')
}

export function createInputRouter(options: InputRouterOptions): InputRouter {
  const { session, onAdapter } = options

  let current: AdapterKind | null = null
  let graceTimer: number | null = null
  let disposed = false

  function clearGraceTimer() {
    if (graceTimer !== null) {
      window.clearTimeout(graceTimer)
      graceTimer = null
    }
  }

  function pick(kind: AdapterKind, reason: string) {
    if (disposed || current === kind)
      return
    current = kind
    clearGraceTimer()
    // eslint-disable-next-line no-console
    console.log(`[playground] input router picked "${kind}" adapter — ${reason}`)
    onAdapter(kind, reason)
    if (kind === 'headset') {
      // Final: nothing can override a headset decision, stop listening.
      session.removeEventListener('inputsourceschange', evaluate)
    }
  }

  function evaluate() {
    if (disposed || current === 'headset')
      return
    const sources = Array.from(session.inputSources)
    if (hasHeadsetStyleInput(sources)) {
      pick('headset', `tracked/transient-pointer input source present (${sources.length} source(s))`)
      return
    }
    if (current === null && hasScreenStyleInput(sources))
      pick('phone', 'screen input source present')
  }

  session.addEventListener('inputsourceschange', evaluate)

  // Initial scan; if it's inconclusive, fall back to phone after the grace
  // window — a late tracked-pointer will still flip us to headset above.
  evaluate()
  if (current === null) {
    graceTimer = window.setTimeout(() => {
      graceTimer = null
      if (!disposed && current === null)
        pick('phone', `no headset-style input source within ${PHONE_GRACE_WINDOW_MS}ms grace window`)
    }, PHONE_GRACE_WINDOW_MS)
  }

  return {
    dispose() {
      disposed = true
      clearGraceTimer()
      session.removeEventListener('inputsourceschange', evaluate)
    },
  }
}
