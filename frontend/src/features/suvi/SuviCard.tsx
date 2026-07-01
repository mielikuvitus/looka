import { AgentCard } from '../../shared/components/AgentCard'

// Suvi owns this feature (gentle default) — OpenAI-backed agent.
export function SuviCard() {
  return (
    <AgentCard
      member="suvi"
      title="Suvi"
      provider="OpenAI"
      blurb="OpenAI-backed agent. A floating panel of your own."
      tilt="rotateY(4deg) rotateX(2deg)"
    />
  )
}
