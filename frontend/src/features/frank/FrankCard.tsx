import { AgentCard } from '../../shared/components/AgentCard'

// Frank owns this feature (gentle default) — OpenClaw-backed agent.
export function FrankCard() {
  return (
    <AgentCard
      member="frank"
      title="Frank"
      provider="OpenClaw"
      blurb="OpenClaw-backed agent. Drag me anywhere in the room."
      tilt="rotateY(-6deg) rotateX(2deg)"
    />
  )
}
