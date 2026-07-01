import { useRef } from 'react'

interface SpatialDragEvent {
  translationX: number
  translationY: number
  translationZ: number
}

export function useSpatialDrag(baseTransform = '') {
  const ref = useRef<HTMLElement>(null)
  const offset = useRef({ x: 0, y: 0 })
  const dragStartOffset = useRef({ x: 0, y: 0 })

  return {
    ref,
    style: {
      transform: `translate3d(0px, 0px, 0) ${baseTransform}`,
    },
    onSpatialDragStart: () => {
      dragStartOffset.current = offset.current
    },
    onSpatialDrag: (event: SpatialDragEvent) => {
      const x = dragStartOffset.current.x + event.translationX
      const y = dragStartOffset.current.y + event.translationY
      offset.current = { x, y }
      if (ref.current) {
        ref.current.style.transform = `translate3d(${x}px, ${y}px, 0) ${baseTransform}`
      }
    },
  }
}
