import { RoomId } from './rooms'
import { TargetDefinition } from '@/types/mission'

export type SceneTarget = TargetDefinition

/**
 * Authoritative Centralized Target Registry for NaviMind.
 * Single source of truth for command parsing, navigation, optical scanning,
 * and mission intelligence.
 */
export const TARGETS: TargetDefinition[] = [
  {
    id: 'fire_extinguisher_01',
    label: 'Emergency Fire Extinguisher',
    name: 'Emergency Fire Extinguisher',
    aliases: ['fire extinguisher', 'extinguisher', 'safety extinguisher', 'red cylinder'],
    category: 'SAFETY SYSTEM',
    roomId: 'kitchen',
    position: [-5.00, 0.55, 3.50],
    approachWaypointId: 'wp_kitchen_extinguisher',
    approachDistance: 0.8,
    inspectionDistance: 1.2,
    searchable: true,
    inspectable: true,
    pickupAllowed: false,
    isEmergency: true,
    keywords: ['fire', 'extinguisher', 'safety', 'red', 'cylinder']
  },
  {
    id: 'smart_tv_console',
    label: 'Living Room Smart TV (4K OLED)',
    name: 'Living Room Smart TV (4K OLED)',
    aliases: ['tv', 'smart tv', 'television', 'oled tv', 'display', 'screen'],
    category: 'APPLIANCE',
    roomId: 'living_room',
    position: [-0.10, 1.20, 2.80],
    approachWaypointId: 'wp_living_tv',
    approachDistance: 0.8,
    inspectionDistance: 1.5,
    searchable: true,
    inspectable: true,
    pickupAllowed: false,
    keywords: ['tv', 'television', 'display', 'screen', 'oled', 'smart tv']
  },
  {
    id: 'kitchen_induction',
    label: 'Kitchen Induction Cooktop',
    name: 'Kitchen Induction Cooktop',
    aliases: ['cooktop', 'induction', 'induction cooktop', 'stove', 'kitchen stove', 'cooking range'],
    category: 'APPLIANCE',
    roomId: 'kitchen',
    position: [-5.00, 0.88, 2.80],
    approachWaypointId: 'wp_kitchen_cooktop',
    approachDistance: 0.8,
    inspectionDistance: 1.2,
    searchable: true,
    inspectable: true,
    pickupAllowed: false,
    keywords: ['kitchen', 'induction', 'stove', 'cooktop', 'cooking', 'range']
  },
  {
    id: 'smoke_detector_alpha',
    label: 'Smart Smoke & Gas Detector',
    name: 'Smart Smoke & Gas Detector',
    aliases: ['smoke detector', 'gas detector', 'detector', 'smoke alarm', 'gas alarm', 'fire alarm'],
    category: 'FIRE SAFETY',
    roomId: 'living_room',
    position: [-0.50, 2.44, 2.70],
    approachWaypointId: 'wp_living_center',
    approachDistance: 0.6,
    inspectionDistance: 2.2,
    searchable: true,
    inspectable: true,
    pickupAllowed: false,
    keywords: ['smoke', 'detector', 'alarm', 'sensor', 'gas']
  },
  {
    id: 'power_distribution',
    label: 'Main Power Breaker Panel',
    name: 'Main Power Breaker Panel',
    aliases: ['breaker', 'breaker panel', 'power breaker', 'fuse box', 'distribution panel', 'electric panel'],
    category: 'ELECTRICAL',
    roomId: 'hallway',
    position: [-1.50, 1.40, 0.80],
    approachWaypointId: 'wp_hallway_breaker',
    approachDistance: 0.8,
    inspectionDistance: 1.2,
    searchable: true,
    inspectable: true,
    pickupAllowed: false,
    keywords: ['power', 'breaker', 'panel', 'electric', 'fuse', 'distribution']
  },
  {
    id: 'master_bedroom_bed',
    label: 'Master Bedroom Bed Suite',
    name: 'Master Bedroom Bed Suite',
    aliases: ['bed', 'master bed', 'bedroom bed', 'mattress'],
    category: 'FURNITURE',
    roomId: 'bedroom',
    position: [-1.70, 0.70, -2.40],
    approachWaypointId: 'wp_bedroom_bed',
    approachDistance: 0.8,
    inspectionDistance: 1.5,
    searchable: true,
    inspectable: true,
    pickupAllowed: false,
    keywords: ['bed', 'bedroom', 'mattress', 'furniture', 'pillow']
  },
  {
    id: 'balcony_glazing',
    label: 'Living Room Balcony Window',
    name: 'Living Room Balcony Window',
    aliases: ['balcony', 'balcony window', 'terrace window', 'glass door', 'balcony glass'],
    category: 'STRUCTURAL',
    roomId: 'balcony',
    position: [-0.50, 1.40, 4.30],
    approachWaypointId: 'wp_balcony_center',
    approachDistance: 0.8,
    inspectionDistance: 1.5,
    searchable: true,
    inspectable: true,
    pickupAllowed: false,
    keywords: ['balcony', 'window', 'glass', 'glazing', 'terrace']
  },
  {
    id: 'tv_remote_control',
    label: 'Smart TV Remote Control',
    name: 'Smart TV Remote Control',
    aliases: ['remote', 'tv remote', 'television remote', 'controller', 'smart remote', 'remote control'],
    category: 'RETRIEVABLE PROP',
    roomId: 'living_room',
    position: [-0.95, 0.465, 3.10],
    approachWaypointId: 'wp_living_table',
    approachDistance: 0.6,
    inspectionDistance: 1.0,
    searchable: true,
    inspectable: true,
    pickupAllowed: true,
    keywords: ['remote', 'tv', 'television', 'controller', 'clicker', 'smart']
  }
]

export function matchesTarget(target: TargetDefinition, query: string): boolean {
  if (!query || !query.trim()) return false
  const q = query.toLowerCase().trim()
  if (target.id.toLowerCase() === q) return true
  if (target.label.toLowerCase() === q || target.name.toLowerCase() === q) return true
  if (target.aliases.some((a) => a.toLowerCase() === q)) return true
  if (target.label.toLowerCase().includes(q) || target.name.toLowerCase().includes(q)) return true
  if (target.aliases.some((a) => a.length >= 4 && q.includes(a.toLowerCase()))) return true
  if (target.category.toLowerCase().includes(q)) return true
  return target.keywords.some((k) => k.length >= 4 && (q.includes(k) || k.includes(q)))
}
