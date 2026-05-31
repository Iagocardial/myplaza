import { COUCH_POS } from '@/seat'

// Local player position — mutated by LocalPlayer every frame to avoid 60Hz Zustand updates.
export const localPos = { x: 0, z: 1 }

// Zone definitions — order matters, first match wins.
//
// private: true  → Gather-style private space: everyone inside hears everyone else at full volume.
//                  Players outside the zone can only hear in at very close range (CROSS_ZONE_RANGE).
// private: false → Standard distance-based falloff using maxRange.
//
// shape is exported so the renderer can draw zone floor markers without duplicating coordinates.

const LOUNGE_RADIUS = 1.8
const MTG = { x1: 2.5, z1: -4.5, x2: 6.8, z2: -2.0 }

export const ZONES = [
  {
    id: 'lounge',
    label: 'Lounge',
    private: true,
    shape: { type: 'circle', cx: COUCH_POS.x, cz: COUCH_POS.z, r: LOUNGE_RADIUS },
    test: (x, z) => {
      const dx = x - COUCH_POS.x
      const dz = z - COUCH_POS.z
      return dx * dx + dz * dz <= LOUNGE_RADIUS * LOUNGE_RADIUS
    },
  },
  {
    id: 'meeting',
    label: 'Reunião',
    private: true,
    shape: { type: 'rect', x1: MTG.x1, z1: MTG.z1, x2: MTG.x2, z2: MTG.z2 },
    test: (x, z) => x >= MTG.x1 && x <= MTG.x2 && z >= MTG.z1 && z <= MTG.z2,
  },
  {
    id: 'main',
    label: 'Café',
    private: false,
    maxRange: 5.5,
    test: () => true,
  },
]

// Range at which players from different zones can still faintly hear each other (zone boundary bleed).
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
// Called from RemotePlayer.useFrame every frame — keep it cheap.
export function computeVolume(remoteX, remoteZ) {
  const lZone = getZone(localPos.x, localPos.z)
  const rZone = getZone(remoteX, remoteZ)

  // Same private zone → full volume regardless of distance (Gather private-space behavior).
  if (lZone.id === rZone.id && lZone.private) return 1.0

  const dist = Math.hypot(remoteX - localPos.x, remoteZ - localPos.z)

  // Different zones → audible only at very close range near the boundary.
  if (lZone.id !== rZone.id) {
    if (dist >= CROSS_ZONE_RANGE) return 0
    return 1 - smoothstep(dist / CROSS_ZONE_RANGE)
  }

  // Same non-private zone → standard distance falloff.
  const maxRange = lZone.maxRange ?? 5.5
  if (dist >= maxRange) return 0
  return 1 - smoothstep(dist / maxRange)
}
