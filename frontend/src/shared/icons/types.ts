// Props for the agent brand marks used inside the landing's flow <svg>.
// They render as nested <svg> nodes positioned in the parent's viewBox,
// so callers pass an absolute x/y (top-left) and an optional size.
export interface AgentIconProps {
  x: number
  y: number
  size?: number
}
