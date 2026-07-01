import { AgentCard } from '../../shared/components/AgentCard'

// Juan owns this feature (gentle default) — OpenAI-backed agent.
export function JuanCard() {
  return (
    <AgentCard
      member="juan"
      title="Juan"
      provider="OpenAI"
      blurb="OpenAI-backed agent. Float me forward and back on Z."
      tilt="rotateY(-2deg) rotateX(3deg)"
    />
  )
}
