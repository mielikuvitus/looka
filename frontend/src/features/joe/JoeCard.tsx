import { AgentCard } from '../../shared/components/AgentCard'

// Joe owns this feature (gentle default) — OpenAI-backed agent.
export function JoeCard() {
  return (
    <AgentCard
      member="joe"
      title="Joe"
      provider="OpenAI"
      blurb="OpenAI-backed agent. Grab and reposition me in space."
      tilt="rotateY(7deg) rotateX(3deg)"
    />
  )
}
