import { useState } from 'react'

// WebSpatial Runtime tags the UA string with `WebSpatial/<version>` when a
// browser can run the spatial APIs (see .webspatial/docs/api/react-sdk/dom-api/userAgent.md).
// Everywhere else — desktop/mobile Safari, Chrome, etc. — this is absent and
// the page renders as a normal, non-spatial webpage.
function hasWebSpatialRuntime() {
  // `?spatial` forces the spatial UI in a plain browser tab. Needed on the
  // PICO emulator: inside the WebSpatial app container an immersive-ar
  // request hangs (nested XR session), so the bee must be materialized from
  // the flat PICO browser tab — which the UA sniff alone would send to the
  // non-spatial landing.
  if (new URLSearchParams(window.location.search).has('spatial'))
    return true
  return /WebSpatial\/\S+/.test(navigator.userAgent)
}

export function useSpatialSupport() {
  const [isSpatial] = useState(hasWebSpatialRuntime)
  const [continueAnyway, setContinueAnyway] = useState(false)

  return {
    isSpatial: isSpatial || continueAnyway,
    continueAnyway: () => setContinueAnyway(true),
  }
}
