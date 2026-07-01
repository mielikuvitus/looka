import { useState } from 'react'
import { useSpatialDrag } from '../composables/useSpatialDrag'
import { pingAgent } from '../lib/api'

// Optional shared kit. Members can use this or hand-roll their own card —
// each agent panel is just HTML on the page (a gentle default, not a rule).

export interface AgentCardProps {
  /** Person-only folder / route name, e.g. "frank". */
  member: string
  /** Card heading. */
  title: string
  /** Which LLM backs this agent, e.g. "OpenClaw". */
  provider: string
  /** One-line description of the agent. */
  blurb: string
  /** Optional CSS 3D tilt so panels feel distinct in space. */
  tilt?: string
}

export function AgentCard({
  member,
  title,
  provider,
  blurb,
  tilt = 'rotateY(-3deg) rotateX(2deg)',
}: AgentCardProps) {
  const drag = useSpatialDrag(tilt)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reply, setReply] = useState<string | null>(null)

  async function handlePing() {
    setLoading(true)
    setError(null)
    setReply(null)
    try {
      const res = await pingAgent(member)
      setReply(res.message)
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Ping failed')
    }
    finally {
      setLoading(false)
    }
  }

  return (
    <section className="panel agent-card" enable-xr {...drag}>
      <div className="surface-chip panel-tag" enable-xr>
        {provider}
      </div>
      <h2 className="panel-title">{title}</h2>
      <p className="panel-copy">{blurb}</p>

      <button
        type="button"
        className="ping-button"
        onClick={handlePing}
        disabled={loading}
      >
        {loading ? 'Pinging…' : 'Ping agent'}
      </button>

      {reply && (
        <p className="ping-reply surface-card" enable-xr>
          {reply}
        </p>
      )}
      {error && <p className="ping-error">{error}</p>}
    </section>
  )
}
