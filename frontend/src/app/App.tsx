import { useSpatialSupport } from '../shared/composables/useSpatialSupport'
import { NonSpatialLanding } from './NonSpatialLanding'
import { SpatialLanding } from './SpatialLanding'

export function App() {
  const { isSpatial } = useSpatialSupport()

  if (!isSpatial) {
    return <NonSpatialLanding />
  }

  return <SpatialLanding />
}
