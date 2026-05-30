import { COUCH_POS } from '@/seat'

// Local player position — mutated by LocalPlayer every frame to avoid 60Hz Zustand updates.
export const localPos = { x: 0, z: 1 }

// Zone definitions — order matters, first match wins.
//
// main  → open café floor: everyone in the same zone hears each other up to ~5.5 units
// lounge → intimate corner near the couch: hearing drops off after ~2 units
const LOUNGE_RADIUS = 1.8

const ZONES = [
  {
    id: 'lounge',
    label: 'Lounge',
    maxRange: 2.0,
    test: (x, z) => {
      const dx = x - COUCH_POS.x
      const dz = z - COUCH_POS.z
      return dx * dx + dz * dz <= LOUNGE_RADIUS * LOUNGE_RADIUS
    },
  },
  {
    id: 'main',
    label: 'Café',
    maxRange: 5.5,
    test: () => true,
  },
]

// Minimum distance required to hear someone in a different zone.
const CROSS_ZONE_RANGE = 1.0

function getZone(x, z) {
  return ZONES.find((zone) => zone.test(x, z)) ?? ZONES[ZONES.length - 1]
}

export function getLocalZone() {
  return getZone(localPos.x, localPos.z)
}

function smoothstep(t) {
  return t * t * (3 - 2 * t)
}

// Returns 0.0–1.0 target volume for a remote player at (remoteX, remoteZ).
// Same zone → zone's maxRange used. Different zones → CROSS_ZONE_RANGE.
export function computeVolume(remoteX, remoteZ) {
  const lZone = getZone(localPos.x, localPos.z)
  const rZone = getZone(remoteX, remoteZ)
  const dist = Math.hypot(remoteX - localPos.x, remoteZ - localPos.z)
  const maxRange = lZone.id === rZone.id ? lZone.maxRange : CROSS_ZONE_RANGE
  if (dist >= maxRange) return 0
  return 1 - smoothstep(dist / maxRange)
}
