export type RoomId = 'living_room' | 'kitchen' | 'hallway' | 'bedroom' | 'balcony'

export interface RoomBounds {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export interface RoomDefinition {
  id: RoomId
  name: string
  center: [number, number, number]
  bounds: RoomBounds
  connectedRooms: RoomId[]
}

/**
 * Calibrated apartment room boundaries and centers.
 * Derived from physical GLB structural analysis and verified doorway portals.
 */
export const ROOMS: Record<RoomId, RoomDefinition> = {
  living_room: {
    id: 'living_room',
    name: 'Living Room & Lounge',
    center: [-0.50, 0.24, 2.70],
    bounds: {
      minX: -1.80,
      maxX: 0.35,
      minZ: 1.20,
      maxZ: 4.40
    },
    connectedRooms: ['hallway']
  },
  kitchen: {
    id: 'kitchen',
    name: 'Kitchen & Dining Station',
    center: [-5.00, 0.24, 2.50],
    bounds: {
      minX: -6.80,
      maxX: -3.80,
      minZ: 1.00,
      maxZ: 4.40
    },
    connectedRooms: ['hallway']
  },
  hallway: {
    id: 'hallway',
    name: 'Central Corridor & Hallway',
    center: [-2.40, 0.24, 0.00],
    bounds: {
      minX: -4.50,
      maxX: -0.40,
      minZ: -3.20,
      maxZ: 1.20
    },
    connectedRooms: ['living_room', 'kitchen', 'bedroom']
  },
  bedroom: {
    id: 'bedroom',
    name: 'Master Bedroom Suite',
    center: [-2.00, 0.24, -2.50],
    bounds: {
      minX: -3.80,
      maxX: 0.35,
      minZ: -6.30,
      maxZ: -0.30
    },
    connectedRooms: ['hallway']
  },
  balcony: {
    id: 'balcony',
    name: 'Outdoor Balcony Terrace',
    center: [-0.50, 0.24, 4.20],
    bounds: {
      minX: -1.80,
      maxX: 0.20,
      minZ: 4.10,
      maxZ: 4.40
    },
    connectedRooms: ['living_room']
  }
}

/**
 * Determines which room a world position falls inside.
 * Uses bounded 2D box test (X/Z), with nearest room center fallback if on boundary.
 */
export function getRoomFromPosition(
  pos: [number, number, number] | { x: number; y?: number; z: number }
): RoomId {
  const x = Array.isArray(pos) ? pos[0] : pos.x
  const z = Array.isArray(pos) ? pos[2] : pos.z

  // 1. Direct bounding box containment check
  for (const room of Object.values(ROOMS)) {
    const { minX, maxX, minZ, maxZ } = room.bounds
    if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
      return room.id
    }
  }

  // 2. Fallback: find nearest room center by Euclidean distance (2D X/Z)
  let bestRoom: RoomId = 'living_room'
  let minDistanceSq = Infinity

  for (const room of Object.values(ROOMS)) {
    const dx = x - room.center[0]
    const dz = z - room.center[2]
    const distSq = dx * dx + dz * dz
    if (distSq < minDistanceSq) {
      minDistanceSq = distSq
      bestRoom = room.id
    }
  }

  return bestRoom
}
