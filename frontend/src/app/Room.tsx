import { JuanCard } from '../features/juan/JuanCard'
import './Room.css'

// The room shell: common ground, no owner. It holds the spatial scene —
// enable-xr surfaces and background/guide chrome.
//
// Per team feedback, the room now lands directly on JuanCard's full-screen
// "tap to enter AR" button — no agent grid, no "Create agent" button, no
// diorama picker, and (per a follow-up round of feedback) no card chrome
// around the button either: with only one agent and one action, a title +
// panel wrapping a button was an unnecessary extra screen between landing
// and AR. FrankCard/SuviCard/JoeCard and the diorama feature are untouched
// and still exist under features/<name>/ — they're just not wired into
// this shell at the moment. See frontend/src/features/juan/README.md for
// the fuller picture, and `git log -- frontend/src/app/Room.tsx` for the
// previous 4-card grid layout if this direction changes again.
export function Room() {
  return (
    <main className="scene-shell" enable-xr-monitor>
      <div className="scene-bg" aria-hidden="true" />

      <div className="scene-guides" aria-hidden="true">
        <span className="guide guide-ring"></span>
        <span className="guide guide-axis"></span>
        <span className="guide guide-horizon"></span>
      </div>

      <div className="bee-stage">
        <JuanCard />
      </div>
    </main>
  )
}
