import type { AgentIconProps } from './types'

// Claimsboard's shield mark (claimsboard/public/favicon.svg), recoloured.
// `cutout` is the colour of the three bars — set it to the chip circle's
// fill so the bars read as knock-outs of the shield.
interface ClaimsboardIconProps extends AgentIconProps {
  cutout?: string
}

export function ClaimsboardIcon({ x, y, size = 16, cutout = '#f0e9ff' }: ClaimsboardIconProps) {
  return (
    <svg x={x} y={y} width={size} height={size} viewBox="23 24 54 60" preserveAspectRatio="xMidYMid meet">
      <path d="M27 28 H73 V52 Q73 70 50 80 Q27 70 27 52 Z" fill="#473198" />
      <rect x="36" y="44" width="8" height="16" rx="2" fill={cutout} />
      <rect x="46" y="44" width="8" height="16" rx="2" fill={cutout} />
      <rect x="56" y="44" width="8" height="16" rx="2" fill={cutout} />
    </svg>
  )
}
