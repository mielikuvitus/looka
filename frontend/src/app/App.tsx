import { useSpatialSupport } from '../shared/composables/useSpatialSupport'
import { NonSpatialLanding } from './NonSpatialLanding'
import { Room } from './Room'

// Entry point: browsers without WebSpatial Runtime get a landing page
// instead of the room, with an explicit escape hatch to view it anyway.
export function App() {
  const { isSpatial } = useSpatialSupport()

  if (!isSpatial) {
    return <NonSpatialLanding />
  }

  return <Room />
}
