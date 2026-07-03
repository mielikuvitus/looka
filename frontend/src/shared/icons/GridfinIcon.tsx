import type { AgentIconProps } from './types'

// gridfin's grid mark (gridfin/frontend/public/icon.svg), recoloured.
export function GridfinIcon({ x, y, size = 16 }: AgentIconProps) {
  return (
    <svg x={x} y={y} width={size} height={size} viewBox="0 0 32 32" preserveAspectRatio="xMidYMid meet">
      <g fill="none" stroke="#473198" strokeWidth={1.8} strokeLinecap="round">
        <line x1="12" y1="7" x2="12" y2="25" />
        <line x1="20" y1="7" x2="20" y2="25" />
        <line x1="7" y1="12" x2="25" y2="12" />
        <line x1="7" y1="20" x2="25" y2="20" />
      </g>
      <rect x="13.5" y="13.5" width="5" height="5" rx="1" fill="#473198" />
    </svg>
  )
}
