import { useState } from 'react'
import { useSpatialDrag } from '../../shared/composables/useSpatialDrag'
import { reportAgent } from '../../shared/lib/api'

// Juan owns this feature (gentle default) — OpenAI-backed agent.
// Hand-rolled instead of the shared AgentCard: juan is interactive — you tell
// him what you want, he does his job (right now: check Berlin's weather) and
// gives you a brief summary back.
export function JuanCard() {
  const drag = useSpatialDrag('rotateY(-2deg) rotateX(3deg)')
  const [input, setInput] = useState('give me your report')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reply, setReply] = useState<string | null>(null)

  async function handleSend() {
    const message = input.trim()
    if (!message)
      return

    setLoading(true)
    setError(null)
    setReply(null)
    try {
      const res = await reportAgent('juan', message)
      setReply(res.message)
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Report failed')
    }
    finally {
      setLoading(false)
    }
  }

  return (
    <section className="panel agent-card" enable-xr {...drag}>
      <div className="surface-chip panel-tag" enable-xr>
        OpenAI
      </div>
      <h2 className="panel-title">Juan</h2>
      <p className="panel-copy">Tell me what to look into — try asking for today's report.</p>

      <input
        type="text"
        className="chat-input"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSend()}
        placeholder="give me your report"
        disabled={loading}
      />

      <button
        type="button"
        className="ping-button"
        onClick={handleSend}
        disabled={loading}
      >
        {loading ? 'Working…' : 'Send'}
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
