import { useEffect, useState } from 'react'
import { ClaimsboardIcon, GridfinIcon, NextcloudIcon, SolidTimeIcon } from '../shared/icons'
import './NonSpatialLanding.css'

// Single source of truth for the four demo agents: the prompt shown in the
// "You ask" bubble, the chip name/sub, and the brand mark. The desktop SVG
// and the mobile chip grid both index into this by `active`.
const AGENTS = [
  { name: 'Nextcloud', sub: 'files & docs', Icon: NextcloudIcon, prompt: '“Share the Q2 report.”' },
  { name: 'gridfin', sub: 'the industry desk', Icon: GridfinIcon, prompt: '“Balance today’s grid load.”' },
  { name: 'SolidTime', sub: 'time & tracking', Icon: SolidTimeIcon, prompt: '“Log 3 h to the ERGO claim.”' },
  { name: 'Claimsboard', sub: 'insurance claims', Icon: ClaimsboardIcon, prompt: '“Open claim for case 4471.”' },
]

// Derived so the bubble and the mobile chips share one array; index-parallel
// with AGENTS drives the cycling `active` highlight in both representations.
const PROMPTS = AGENTS.map(a => a.prompt)

// Fallback shown when the current browser has no WebSpatial Runtime
// (see useSpatialSupport). Figma: https://www.figma.com/design/jPbVynCnjTJS5cykIsZ73S/Looka?node-id=10-4
export function NonSpatialLanding() {
  const [active, setActive] = useState(0)

  // The room's global styles lock html/body/#root to overflow: hidden for
  // the fixed spatial scene; this is a plain scrollable page instead.
  useEffect(() => {
    document.body.classList.add('landing-mode')
    return () => document.body.classList.remove('landing-mode')
  }, [])

  // Cycle the example prompt / highlighted agent, unless the user prefers
  // reduced motion (then it rests on the first prompt).
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      return
    const id = window.setInterval(() => {
      setActive(a => (a + 1) % PROMPTS.length)
    }, 2800)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="landing-shell">
      <header className="landing-navbar">
        <img className="landing-logo" src="/landing/logo-group.svg" alt="Looka" />
        <div className="landing-navbar-hint-wrap">
          <span className="landing-navbar-hint-arrow" aria-hidden="true">⤶</span>
          <p className="landing-navbar-hint">
            Psst, in Pico Browser
            <br />
            tap the folder icon to open the project
          </p>
        </div>
      </header>

      <main className="landing-hero">
        <div className="landing-headline-block">
          <span className="landing-badge">Best on a headset</span>

          <h1 className="landing-headline">
            Meet
            {' '}
            <img className="landing-headline-logo" src="/landing/looka-script.svg" alt="Looka" />
            <span className="landing-headline-excl">!</span>
          </h1>

          <p className="landing-subheading">The bee that runs your agents.</p>

          <p className="landing-subcopy">
            Your long-running agents get one friendly face. You
            {' '}
            <b>talk to the bee</b>
            ; it briefs an orchestrator, the agents do the real work (minutes,
            not seconds), and the bee
            {' '}
            <b>speaks the answer</b>
            {' '}
            back.
          </p>
        </div>

        {/* ============ COMPANION FLOW (how it works) ============ */}
        <div className="landing-visual">
          <div className="landing-visual-badge">
            <img src="/landing/view-icon.svg" alt="" />
            <span>Spatial Enabled</span>
          </div>

          <div className="landing-visual-inner">
            <svg
              className="flow"
              data-active={active}
              viewBox="0 0 820 470"
              width="100%"
              role="img"
              aria-label="How Looka works: you ask the bee, it briefs the orchestrator, the orchestrator runs the right agent (Nextcloud, gridfin, SolidTime or Claimsboard), and the bee speaks the answer."
            >
              <defs>
                <radialGradient id="beeBody" cx="50%" cy="38%" r="70%">
                  <stop offset="0%" stopColor="#ffd76a" />
                  <stop offset="100%" stopColor="#f2a922" />
                </radialGradient>
                <linearGradient id="orbGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff4fa3" />
                  <stop offset="100%" stopColor="#dc0073" />
                </linearGradient>
                <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
                  <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#0d0d0d" floodOpacity="0.12" />
                </filter>
              </defs>

              {/* ===== CONNECTORS (behind nodes; tucked under card edges) ===== */}
              <path className="flow-line" d="M232 132 C 288 128, 322 138, 362 150" fill="none" stroke="#dc0073" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
              <path className="flow-line" d="M410 232 L 410 286" fill="none" stroke="#dc0073" strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
              <path id="edge0" className="flow-line edge" d="M392 340 C 320 366, 210 366, 135 382" fill="none" stroke="#b98bd6" strokeWidth="2.2" strokeLinecap="round" opacity="0.3" />
              <path id="edge1" className="flow-line edge" d="M400 342 C 375 362, 345 368, 319 382" fill="none" stroke="#b98bd6" strokeWidth="2.2" strokeLinecap="round" opacity="0.3" />
              <path id="edge2" className="flow-line edge" d="M420 342 C 445 362, 475 368, 503 382" fill="none" stroke="#b98bd6" strokeWidth="2.2" strokeLinecap="round" opacity="0.3" />
              <path id="edge3" className="flow-line edge" d="M428 340 C 500 366, 610 366, 687 382" fill="none" stroke="#b98bd6" strokeWidth="2.2" strokeLinecap="round" opacity="0.3" />

              {/* ===== 1. YOU (speech bubble; text cycles) ===== */}
              <g className="ask-bubble">
                <g filter="url(#soft)">
                  <rect x="28" y="56" width="222" height="64" rx="18" fill="#ffffff" />
                </g>
                <path d="M212 118 l 20 16 l -6 -20 Z" fill="#ffffff" />
                <text x="46" y="82" fontFamily="Inter, sans-serif" fontSize="11.5" fontWeight="600" fill="#dc0073" letterSpacing="0.04em">YOU ASK</text>
                <text key={active} className="ask-text" x="46" y="103" fontFamily="Inter, sans-serif" fontSize="13" fontWeight="500" fill="#0d0d0d">{PROMPTS[active]}</text>
              </g>

              {/* ===== 2. THE BEE (hero) ===== */}
              <g className="bee-group">
                <ellipse cx="410" cy="238" rx="52" ry="9" fill="#0d0d0d" opacity="0.08" />
                <ellipse className="wing" style={{ transformOrigin: '398px 150px' }} cx="372" cy="140" rx="30" ry="18" fill="#ffffff" opacity="0.72" stroke="#e9e4d9" strokeWidth="1" />
                <ellipse className="wing right" style={{ transformOrigin: '422px 150px' }} cx="448" cy="140" rx="30" ry="18" fill="#ffffff" opacity="0.72" stroke="#e9e4d9" strokeWidth="1" />

                <ellipse cx="410" cy="176" rx="46" ry="42" fill="url(#beeBody)" />
                <path d="M382 158 q28 -12 56 0" stroke="#2a2118" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.85" />
                <path d="M372 182 q38 14 76 0" stroke="#2a2118" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.85" />
                <path d="M410 216 l 0 12" stroke="#2a2118" strokeWidth="4" strokeLinecap="round" />

                <circle cx="410" cy="130" r="30" fill="url(#beeBody)" />
                <path d="M398 106 q-8 -16 -18 -20" stroke="#2a2118" strokeWidth="3" fill="none" strokeLinecap="round" />
                <path d="M422 106 q8 -16 18 -20" stroke="#2a2118" strokeWidth="3" fill="none" strokeLinecap="round" />
                <circle cx="378" cy="84" r="4" fill="#dc0073" />
                <circle cx="442" cy="84" r="4" fill="#dc0073" />
                <circle cx="400" cy="128" r="7.5" fill="#ffffff" />
                <circle cx="420" cy="128" r="7.5" fill="#ffffff" />
                <circle cx="401.5" cy="129.5" r="3.6" fill="#2a2118" />
                <circle cx="421.5" cy="129.5" r="3.6" fill="#2a2118" />
                <circle cx="388" cy="140" r="4" fill="#dc0073" opacity="0.3" />
                <circle cx="432" cy="140" r="4" fill="#dc0073" opacity="0.3" />
                <path d="M402 142 q8 7 16 0" stroke="#2a2118" strokeWidth="2.4" fill="none" strokeLinecap="round" />

                {/* mic orb (voice) */}
                <g transform="translate(56 -8)">
                  <circle cx="410" cy="130" r="12" fill="url(#orbGrad)" />
                  <circle className="pulse" cx="410" cy="130" r="12" fill="none" stroke="#dc0073" strokeWidth="2" />
                  <rect x="407" y="124" width="6" height="9" rx="3" fill="#fff" />
                  <path d="M404 131 a6 6 0 0 0 12 0" stroke="#fff" strokeWidth="1.6" fill="none" />
                </g>
              </g>
              <text x="410" y="264" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="12" fontWeight="600" fill="#0d0d0d">The bee · listens &amp; speaks</text>

              {/* ===== 3. ORCHESTRATOR ===== */}
              <g filter="url(#soft)"><rect x="308" y="286" width="204" height="54" rx="16" fill="#ffffff" /></g>
              <circle cx="340" cy="313" r="11" fill="#f0e9ff" />
              <circle cx="340" cy="313" r="3.6" fill="#473198" />
              <circle cx="332" cy="307" r="2.2" fill="#473198" />
              <circle cx="348" cy="307" r="2.2" fill="#473198" />
              <circle cx="332" cy="319" r="2.2" fill="#473198" />
              <circle cx="348" cy="319" r="2.2" fill="#473198" />
              <text x="362" y="309" fontFamily="Inter, sans-serif" fontSize="13" fontWeight="600" fill="#0d0d0d">Orchestrator</text>
              <text x="362" y="325" fontFamily="Inter, sans-serif" fontSize="11" fill="#0d0d0d" opacity="0.6">plans &amp; routes the work</text>

              {/* ===== 4. AGENTS (real recoloured app marks) ===== */}
              {/* agent 0: Nextcloud */}
              <g className="agent" id="agent0">
                <rect id="glow0" className="agent-glow" x="46" y="380" width="178" height="56" rx="16" fill="none" stroke="#dc0073" strokeWidth="2" />
                <g filter="url(#soft)"><rect x="50" y="384" width="170" height="48" rx="14" fill="#ffffff" /></g>
                <circle cx="76" cy="408" r="9" fill="#f0e9ff" />
                <NextcloudIcon x={68} y={400} />
                <g className="orbit" style={{ transformOrigin: '76px 408px' }}><circle cx="76" cy="393" r="3" fill="#dc0073" /></g>
                <text x="94" y="404" fontFamily="Inter, sans-serif" fontSize="12.5" fontWeight="600" fill="#0d0d0d">Nextcloud</text>
                <text x="94" y="420" fontFamily="Inter, sans-serif" fontSize="10.5" fill="#0d0d0d" opacity="0.55">files &amp; docs</text>
              </g>
              {/* agent 1: gridfin */}
              <g className="agent" id="agent1">
                <rect id="glow1" className="agent-glow" x="230" y="380" width="178" height="56" rx="16" fill="none" stroke="#dc0073" strokeWidth="2" />
                <g filter="url(#soft)"><rect x="234" y="384" width="170" height="48" rx="14" fill="#ffffff" /></g>
                <circle cx="260" cy="408" r="9" fill="#f0e9ff" />
                <GridfinIcon x={252} y={400} />
                <g className="orbit" style={{ transformOrigin: '260px 408px', animationDelay: '.7s' }}><circle cx="260" cy="393" r="3" fill="#dc0073" /></g>
                <text x="278" y="404" fontFamily="Inter, sans-serif" fontSize="12.5" fontWeight="600" fill="#0d0d0d">gridfin</text>
                <text x="278" y="420" fontFamily="Inter, sans-serif" fontSize="10.5" fill="#0d0d0d" opacity="0.55">the industry desk</text>
              </g>
              {/* agent 2: SolidTime */}
              <g className="agent" id="agent2">
                <rect id="glow2" className="agent-glow" x="414" y="380" width="178" height="56" rx="16" fill="none" stroke="#dc0073" strokeWidth="2" />
                <g filter="url(#soft)"><rect x="418" y="384" width="170" height="48" rx="14" fill="#ffffff" /></g>
                <circle cx="444" cy="408" r="9" fill="#f0e9ff" />
                <SolidTimeIcon x={436} y={400} />
                <g className="orbit" style={{ transformOrigin: '444px 408px', animationDelay: '1.4s' }}><circle cx="444" cy="393" r="3" fill="#dc0073" /></g>
                <text x="462" y="404" fontFamily="Inter, sans-serif" fontSize="12.5" fontWeight="600" fill="#0d0d0d">SolidTime</text>
                <text x="462" y="420" fontFamily="Inter, sans-serif" fontSize="10.5" fill="#0d0d0d" opacity="0.55">time &amp; tracking</text>
              </g>
              {/* agent 3: Claimsboard */}
              <g className="agent" id="agent3">
                <rect id="glow3" className="agent-glow" x="598" y="380" width="178" height="56" rx="16" fill="none" stroke="#dc0073" strokeWidth="2" />
                <g filter="url(#soft)"><rect x="602" y="384" width="170" height="48" rx="14" fill="#ffffff" /></g>
                <circle cx="628" cy="408" r="9" fill="#f0e9ff" />
                <ClaimsboardIcon x={620} y={400} />
                <g className="orbit" style={{ transformOrigin: '628px 408px', animationDelay: '2.1s' }}><circle cx="628" cy="393" r="3" fill="#dc0073" /></g>
                <text x="646" y="404" fontFamily="Inter, sans-serif" fontSize="12.5" fontWeight="600" fill="#0d0d0d">Claimsboard</text>
                <text x="646" y="420" fontFamily="Inter, sans-serif" fontSize="10.5" fill="#0d0d0d" opacity="0.55">insurance claims</text>
              </g>
            </svg>

            <p className="flow-caption">
              <span><b>You</b> ask</span>
              <span className="sep">→</span>
              <span>the <b>bee</b> listens</span>
              <span className="sep">→</span>
              <span>the <b>orchestrator</b> routes</span>
              <span className="sep">→</span>
              <span>the right <b>agent</b> works</span>
              <span className="sep">→</span>
              <span>the <b>bee</b> speaks the answer</span>
            </p>

            {/* ===== MOBILE DIAGRAM (≤600px): DOM stack, hidden >600px by CSS =====
                aria-hidden: a visual duplicate of the labelled desktop <svg>;
                the hero subcopy already narrates this flow for assistive tech. */}
            <div className="flow-mobile" aria-hidden="true">
              <svg className="flow-mobile-bee" viewBox="336 74 152 182">
                <defs>
                  <radialGradient id="beeBodyM" cx="50%" cy="38%" r="70%">
                    <stop offset="0%" stopColor="#ffd76a" />
                    <stop offset="100%" stopColor="#f2a922" />
                  </radialGradient>
                  <linearGradient id="orbGradM" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff4fa3" />
                    <stop offset="100%" stopColor="#dc0073" />
                  </linearGradient>
                </defs>
                <g className="bee-group">
                  <ellipse cx="410" cy="238" rx="52" ry="9" fill="#0d0d0d" opacity="0.08" />
                  <ellipse className="wing" style={{ transformOrigin: '398px 150px' }} cx="372" cy="140" rx="30" ry="18" fill="#ffffff" opacity="0.72" stroke="#e9e4d9" strokeWidth="1" />
                  <ellipse className="wing right" style={{ transformOrigin: '422px 150px' }} cx="448" cy="140" rx="30" ry="18" fill="#ffffff" opacity="0.72" stroke="#e9e4d9" strokeWidth="1" />
                  <ellipse cx="410" cy="176" rx="46" ry="42" fill="url(#beeBodyM)" />
                  <path d="M382 158 q28 -12 56 0" stroke="#2a2118" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.85" />
                  <path d="M372 182 q38 14 76 0" stroke="#2a2118" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.85" />
                  <path d="M410 216 l 0 12" stroke="#2a2118" strokeWidth="4" strokeLinecap="round" />
                  <circle cx="410" cy="130" r="30" fill="url(#beeBodyM)" />
                  <path d="M398 106 q-8 -16 -18 -20" stroke="#2a2118" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <path d="M422 106 q8 -16 18 -20" stroke="#2a2118" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <circle cx="378" cy="84" r="4" fill="#dc0073" />
                  <circle cx="442" cy="84" r="4" fill="#dc0073" />
                  <circle cx="400" cy="128" r="7.5" fill="#ffffff" />
                  <circle cx="420" cy="128" r="7.5" fill="#ffffff" />
                  <circle cx="401.5" cy="129.5" r="3.6" fill="#2a2118" />
                  <circle cx="421.5" cy="129.5" r="3.6" fill="#2a2118" />
                  <circle cx="388" cy="140" r="4" fill="#dc0073" opacity="0.3" />
                  <circle cx="432" cy="140" r="4" fill="#dc0073" opacity="0.3" />
                  <path d="M402 142 q8 7 16 0" stroke="#2a2118" strokeWidth="2.4" fill="none" strokeLinecap="round" />
                  <g transform="translate(56 -8)">
                    <circle cx="410" cy="130" r="12" fill="url(#orbGradM)" />
                    <circle className="pulse" cx="410" cy="130" r="12" fill="none" stroke="#dc0073" strokeWidth="2" />
                    <rect x="407" y="124" width="6" height="9" rx="3" fill="#fff" />
                    <path d="M404 131 a6 6 0 0 0 12 0" stroke="#fff" strokeWidth="1.6" fill="none" />
                  </g>
                </g>
              </svg>
              <p className="flow-mobile-bee-label">The bee · listens &amp; speaks</p>

              <div className="flow-orch">
                <span className="flow-orch-mark">
                  <svg width="14" height="14" viewBox="0 0 22 22" aria-hidden="true">
                    <circle cx="11" cy="11" r="3.6" fill="#473198" />
                    <circle cx="3.5" cy="3.5" r="2.2" fill="#473198" />
                    <circle cx="18.5" cy="3.5" r="2.2" fill="#473198" />
                    <circle cx="3.5" cy="18.5" r="2.2" fill="#473198" />
                    <circle cx="18.5" cy="18.5" r="2.2" fill="#473198" />
                  </svg>
                </span>
                <span className="flow-orch-text">
                  <span className="flow-orch-name">Orchestrator</span>
                  <span className="flow-orch-sub">plans &amp; routes the work</span>
                </span>
              </div>

              <div className="flow-agents">
                {AGENTS.map((a, i) => {
                  const Icon = a.Icon
                  return (
                    <div key={a.name} className={`flow-chip${active === i ? ' is-active' : ''}`}>
                      <span className="flow-chip-mark"><Icon x={0} y={0} size={24} /></span>
                      <span className="flow-chip-text">
                        <span className="flow-chip-name">{a.name}</span>
                        <span className="flow-chip-sub">{a.sub}</span>
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="landing-cta-note">
          <img src="/landing/info-icon.svg" alt="" />
          <span>
            This page is the flat preview. Put on a headset to actually meet the
            bee. Non-spatial view is in beta.
          </span>
        </div>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-line" aria-hidden="true"></div>
        <div className="landing-footer-row">
          <span>© 2026 Looka Labs. All rights reserved.</span>
          <a className="landing-footer-link" href="/playground">meet the bee →</a>
        </div>
      </footer>
    </div>
  )
}
