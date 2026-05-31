// Sofá reposicionado no canto esquerdo do café expandido.
export const COUCH_POS = { x: -9.0, z: -8.0 }

export const SEAT_POS = { x: COUCH_POS.x, z: COUCH_POS.z - 0.05 }
export const SEAT_HEADING = 0
export const EXIT_POS = { x: COUCH_POS.x, z: COUCH_POS.z + 0.85 }
export const SEAT_HEIGHT = 0.45
export const INTERACT_RADIUS = 1.2

export const COUCH_BOX = {
  minX: COUCH_POS.x - 1.1, maxX: COUCH_POS.x + 1.1,
  minZ: COUCH_POS.z - 0.55, maxZ: COUCH_POS.z + 0.35,
}

export const PLAYER_RADIUS = 0.25
