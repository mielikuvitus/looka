// import { ModelAsset, ModelEntity, Reality, World } from '@webspatial/react-sdk'
// import { useState } from 'react'
// import { reportAgent } from '../../shared/lib/api'
// import './WeatheryWindow.css'
import { XRCubeDemo } from './XRCubeDemo'

// const REPORT_MESSAGE = 'give me your report'

// juan — Weathery's materialized window. Owner: juan (gentle default).
// Opened by JuanCard's "Materialize agent" button as its own Spatial Scene
// (see .webspatial/docs/concepts/spatial-scenes.md#new-scenes), so it can be
// positioned independently in space instead of living inside the room grid.
//
// TEMP (WebXR cube experiment): the report/status-bar/bee content below is
// commented out, not deleted — the bee's rig still only partially renders
// through both <Model> and <Reality>/<ModelEntity> (see prior investigation),
// so this is now testing the other path entirely: a raw WebXR session via
// XRCubeDemo instead of WebSpatial's declarative 3D containers. Restore the
// commented block below once the XR experiment is done or abandoned.
export function WeatheryWindow() {
  return <XRCubeDemo />

  // const [loading, setLoading] = useState(false)
  // const [error, setError] = useState<string | null>(null)
  // const [reply, setReply] = useState<string | null>(null)
  // const [status, setStatus] = useState('Idle')
  // const [modelStatus, setModelStatus] = useState('Loading bee model…')
  //
  // function handleSend() {
  //   // Set synchronously, before anything async, so a click that never
  //   // reaches the network still turns the bar red and says "Working".
  //   setStatus('Working')
  //   setLoading(true)
  //   setError(null)
  //   setReply(null)
  //
  //   void (async () => {
  //     try {
  //       const res = await reportAgent('juan', REPORT_MESSAGE)
  //       setReply(res.message)
  //       setStatus('Done')
  //     }
  //     catch (err) {
  //       const message = err instanceof Error ? err.message : 'Report failed'
  //       setError(message)
  //       setStatus(message)
  //     }
  //     finally {
  //       setLoading(false)
  //     }
  //   })()
  // }
  //
  // return (
  //   <main className="weathery-window">
  //     <div className={`juan-status-bar${loading || error ? ' is-error' : ''}`}>
  //       {status}
  //     </div>
  //
  //     <section className="panel agent-card weathery-panel" enable-xr>
  //       <Reality style={{ 'width': '100%', 'height': '220px', '--xr-depth': 160 }}>
  //         <ModelAsset
  //           id="bee"
  //           src="/models/Bee_Kinde.glb"
  //           onLoad={() => {
  //             console.warn('[weathery] bee model loaded')
  //             setModelStatus('Bee model loaded')
  //           }}
  //           onError={(err: unknown) => {
  //             console.error('[weathery] bee model failed to load', err)
  //             setModelStatus('Bee model failed to load')
  //           }}
  //         />
  //         <World>
  //           <ModelEntity model="bee" />
  //         </World>
  //       </Reality>
  //       <p className={modelStatus.includes('failed') ? 'ping-error' : 'panel-copy'}>
  //         {modelStatus}
  //       </p>
  //
  //       <button
  //         type="button"
  //         className="ping-button"
  //         onClick={handleSend}
  //         disabled={loading}
  //       >
  //         {loading ? 'Working…' : 'Get report'}
  //       </button>
  //
  //       {reply && (
  //         <p className="ping-reply surface-card" enable-xr>
  //           {reply}
  //         </p>
  //       )}
  //       {error && <p className="ping-error">{error}</p>}
  //     </section>
  //   </main>
  // )
}
