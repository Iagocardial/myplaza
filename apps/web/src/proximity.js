import { COUCH_POS } from '@/seat'

// Local player position — mutated by LocalPlayer every frame to avoid 60Hz Zustand updates.
export const localPos = { x: 0, z: 1 }

// Zone definitions — order matters, first match wins.
//
// private: true  → Gather-style private space:
//   - Same zone: full volume regardless of distance.
//   - Different zone (even main↔private): complete silence — no leakage.
// private: false → Standard distance falloff using maxRange.

const LOUNGE_RADIUS = 1.8

// Individual workstation zones — each is an isolated audio bubble.
const DESK_ZONES = [
  { id: 'desk_1', label: 'Mesa 1', x1: -5.0, z1: -11.0, x2: -3.0, z2: -8.4 },
  { id: 'desk_2', label: 'Mesa 2', x1: -1.0, z1: -11.0, x2:  1.0, z2: -8.4 },
  { id: 'desk_3', label: 'Mesa 3', x1:  4.0, z1: -11.0, x2:  6.0, z2: -8.4 },
  { id: 'desk_4', label: 'Mesa 4', x1:  8.5, z1: -11.0, x2: 10.5, z2: -8.4 },
  { id: 'desk_5', label: 'Mesa 5', x1: 11.5, z1:  -7.2, x2: 13.5, z2: -4.8 },
  { id: 'desk_6', label: 'Mesa 6', x1: 11.5, z1:  -3.2, x2: 13.5, z2: -0.8 },
]

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
  ...DESK_ZONES.map((d) => ({
    id: d.id,
    label: d.label,
    private: true,
    shape: { type: 'rect', x1: d.x1, z1: d.z1, x2: d.x2, z2: d.z2 },
    test: (x, z) => x >= d.x1 && x <= d.x2 && z >= d.z1 && z <= d.z2,
  })),
  {
    id: 'main',
    label: 'Café',
    private: false,
    maxRange: 6.0,
    test: () => true,
  },
]

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
// Private zones are fully isolated — zero leakage between zones or to the open floor.
export function computeVolume(remoteX, remoteZ) {
  const lZone = getZone(localPos.x, localPos.z)
  const rZone = getZone(remoteX, remoteZ)

  // Same private zone → full volume (Gather private-space behavior).
  if (lZone.id === rZone.id && lZone.private) return 1.0

  // Any cross involving a private zone → complete silence (no leakage).
  if (lZone.private || rZone.private) return 0

  // Both in the open floor → standard distance falloff.
  const dist = Math.hypot(remoteX - localPos.x, remoteZ - localPos.z)
  const maxRange = lZone.maxRange ?? 6.0
  if (dist >= maxRange) return 0
  return 1 - smoothstep(dist / maxRange)
}
