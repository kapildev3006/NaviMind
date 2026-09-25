import { RoomId } from './rooms'

export type WaypointType = 'ROOM_CENTER' | 'DOORWAY' | 'CORRIDOR' | 'TRANSITION' | 'TARGET_APPROACH'

export interface NavigationWaypoint {
  id: string
  name: string
  roomId: RoomId
  position: [number, number, number]
  neighbors: string[]
  type?: WaypointType
}

/**
 * Calibrated navigation waypoint nodes.
 * Coordinates are verified against apartment collision geometry to ensure
 * all direct line-of-travel segments between connected neighbors are obstacle-free.
 */
export const WAYPOINTS: Record<string, NavigationWaypoint> = {
  // --- LIVING ROOM & BALCONY ---
  wp_living_center: {
    id: 'wp_living_center',
    name: 'Living Room Center',
    roomId: 'living_room',
    position: [-0.50, 0.24, 2.70],
    neighbors: ['wp_living_tv', 'wp_living_portal', 'wp_living_table'],
    type: 'ROOM_CENTER'
  },
  wp_living_tv: {
    id: 'wp_living_tv',
    name: 'Living TV Approach',
    roomId: 'living_room',
    position: [-0.20, 0.24, 2.80],
    neighbors: ['wp_living_center'],
    type: 'TARGET_APPROACH'
  },
  wp_living_table: {
    id: 'wp_living_table',
    name: 'Living Table Approach',
    roomId: 'living_room',
    position: [-1.00, 0.24, 2.50],
    neighbors: ['wp_living_center', 'wp_living_portal'],
    type: 'TARGET_APPROACH'
  },
  wp_living_portal: {
    id: 'wp_living_portal',
    name: 'Living / Hallway Portal',
    roomId: 'living_room',
    position: [-0.60, 0.24, 1.40],
    neighbors: ['wp_living_center', 'wp_living_table', 'wp_hallway_portal'],
    type: 'TRANSITION'
  },
  wp_balcony_center: {
    id: 'wp_balcony_center',
    name: 'Balcony Viewpoint',
    roomId: 'balcony',
    position: [-0.50, 0.24, 4.20],
    neighbors: ['wp_living_center'],
    type: 'ROOM_CENTER'
  },

  // --- CENTRAL HALLWAY / CORRIDOR ---
  wp_hallway_portal: {
    id: 'wp_hallway_portal',
    name: 'Hallway East Junction',
    roomId: 'hallway',
    position: [-1.00, 0.24, 1.00],
    neighbors: ['wp_living_portal', 'wp_hallway_breaker', 'wp_hallway_spine'],
    type: 'DOORWAY'
  },
  wp_hallway_breaker: {
    id: 'wp_hallway_breaker',
    name: 'Breaker Panel Approach',
    roomId: 'hallway',
    position: [-1.50, 0.24, 0.80],
    neighbors: ['wp_hallway_portal', 'wp_hallway_spine'],
    type: 'TARGET_APPROACH'
  },
  wp_hallway_spine: {
    id: 'wp_hallway_spine',
    name: 'Central Hallway Spine',
    roomId: 'hallway',
    position: [-2.40, 0.24, 1.00],
    neighbors: ['wp_hallway_portal', 'wp_hallway_breaker', 'wp_kitchen_portal', 'wp_corridor_west_north'],
    type: 'CORRIDOR'
  },

  // --- KITCHEN & DINING ---
  wp_kitchen_portal: {
    id: 'wp_kitchen_portal',
    name: 'Kitchen Entry Portal',
    roomId: 'kitchen',
    position: [-4.68, 0.24, 1.00],
    neighbors: ['wp_hallway_spine', 'wp_kitchen_center'],
    type: 'DOORWAY'
  },
  wp_kitchen_center: {
    id: 'wp_kitchen_center',
    name: 'Kitchen Station Center',
    roomId: 'kitchen',
    position: [-5.00, 0.24, 2.50],
    neighbors: ['wp_kitchen_portal', 'wp_kitchen_extinguisher', 'wp_kitchen_cooktop'],
    type: 'ROOM_CENTER'
  },
  wp_kitchen_extinguisher: {
    id: 'wp_kitchen_extinguisher',
    name: 'Fire Extinguisher Station',
    roomId: 'kitchen',
    position: [-5.00, 0.24, 3.50],
    neighbors: ['wp_kitchen_center'],
    type: 'TARGET_APPROACH'
  },
  wp_kitchen_cooktop: {
    id: 'wp_kitchen_cooktop',
    name: 'Kitchen Cooktop Approach',
    roomId: 'kitchen',
    position: [-5.00, 0.24, 2.80],
    neighbors: ['wp_kitchen_center'],
    type: 'TARGET_APPROACH'
  },

  // --- WESTERN CORRIDOR (CONNECTING TO MASTER BEDROOM) ---
  wp_corridor_west_north: {
    id: 'wp_corridor_west_north',
    name: 'Corridor North Junction',
    roomId: 'hallway',
    position: [-4.20, 0.24, 1.00],
    neighbors: ['wp_hallway_spine', 'wp_corridor_west_mid', 'wp_kitchen_portal'],
    type: 'CORRIDOR'
  },
  wp_corridor_west_mid: {
    id: 'wp_corridor_west_mid',
    name: 'Corridor Mid Spine',
    roomId: 'hallway',
    position: [-4.20, 0.24, -1.00],
    neighbors: ['wp_corridor_west_north', 'wp_corridor_west_south'],
    type: 'CORRIDOR'
  },
  wp_corridor_west_south: {
    id: 'wp_corridor_west_south',
    name: 'Corridor South Portal Junction',
    roomId: 'hallway',
    position: [-4.20, 0.24, -2.90],
    neighbors: ['wp_corridor_west_mid', 'wp_bedroom_doorway'],
    type: 'CORRIDOR'
  },

  // --- MASTER BEDROOM ---
  wp_bedroom_doorway: {
    id: 'wp_bedroom_doorway',
    name: 'Master Bedroom Doorway Portal',
    roomId: 'bedroom',
    position: [-3.40, 0.24, -2.90],
    neighbors: ['wp_corridor_west_south', 'wp_bedroom_center'],
    type: 'DOORWAY'
  },
  wp_bedroom_center: {
    id: 'wp_bedroom_center',
    name: 'Master Bedroom Center',
    roomId: 'bedroom',
    position: [-2.00, 0.24, -2.90],
    neighbors: ['wp_bedroom_doorway', 'wp_bedroom_bed'],
    type: 'ROOM_CENTER'
  },
  wp_bedroom_bed: {
    id: 'wp_bedroom_bed',
    name: 'Master Bed Approach',
    roomId: 'bedroom',
    position: [-1.70, 0.24, -2.40],
    neighbors: ['wp_bedroom_center'],
    type: 'TARGET_APPROACH'
  }
}

/**
 * Array of all registered waypoints for quick enumeration.
 */
export const ALL_WAYPOINTS: NavigationWaypoint[] = Object.values(WAYPOINTS)
