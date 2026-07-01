import { useState } from 'react'

// WebSpatial Runtime tags the UA string with `WebSpatial/<version>` when a
// browser can run the spatial APIs (see .webspatial/docs/api/react-sdk/dom-api/userAgent.md).
// Everywhere else — desktop/mobile Safari, Chrome, etc. — this is absent and
// the page renders as a normal, non-spatial webpage.
function hasWebSpatialRuntime() {
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
