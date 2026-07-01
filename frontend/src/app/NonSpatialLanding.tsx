import { useEffect } from 'react'
import './NonSpatialLanding.css'

// Fallback shown when the current browser has no WebSpatial Runtime
// (see useSpatialSupport). Figma: https://www.figma.com/design/jPbVynCnjTJS5cykIsZ73S/Looka?node-id=10-4
export function NonSpatialLanding() {
  // The room's global styles lock html/body/#root to overflow: hidden for
  // the fixed spatial scene; this is a plain scrollable page instead.
  useEffect(() => {
    document.body.classList.add('landing-mode')
    return () => document.body.classList.remove('landing-mode')
  }, [])

  return (
    <div className="landing-shell">
      <div className="landing-glow" aria-hidden="true">
        <img src="/landing/glow-center.svg" alt="" />
      </div>

      <header className="landing-navbar">
        <img className="landing-logo" src="/landing/logo-group.svg" alt="Looka" />
        <div className="landing-navbar-hint-wrap">
          <span className="landing-navbar-hint-arrow" aria-hidden="true">⤶</span>
          <p className="landing-navbar-hint">
            Psst, in Pico Browser,
            <br />
            click the folder icon to view the project
          </p>
        </div>
      </header>

      <main className="landing-hero">
        <div className="landing-headline-block">
          <span className="landing-badge">Hardware Required</span>

          <h1 className="landing-headline">
            Welcome to
            {' '}
            <img className="landing-headline-logo" src="/landing/looka-script.svg" alt="Looka" />
            !
          </h1>

          <p className="landing-subheading">Your agent workflow visualiser</p>

          <p className="landing-subcopy">
            This site is built for Spatial Browser experience, please use a
            supporting device to view the content.
          </p>
        </div>

        <div className="landing-visual">
          <div className="landing-visual-preview">
            <img src="/landing/preview-content.png" alt="" />
          </div>
          <div className="landing-visual-badge">
            <img src="/landing/view-icon.svg" alt="" />
            <span>Spatial Enabled</span>
          </div>
        </div>

        <div className="landing-cta-note">
            <img src="/landing/info-icon.svg" alt="" />
            <span>Optimization for non-spatial browsers is currently in beta.</span>
          </div>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-line" aria-hidden="true"></div>
        <div className="landing-footer-row">
          <span>© 2026 Looka Labs. All rights reserved.</span>
        </div>
      </footer>
    </div>
  )
}
