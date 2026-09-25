import { RoomId } from '@/config/rooms'
import { NavigationStatus } from '@/store/useSimulationStore'

export type CommandIntent = 'FIND' | 'NAVIGATE' | 'INSPECT' | 'FETCH'

export type MissionState =
  | 'IDLE'
  | 'PARSING'
  | 'VALIDATING'
  | 'PLANNING'
  | 'NAVIGATING'
  | 'APPROACHING'
  | 'SCANNING'
  | 'TARGET_FOUND'
  | 'INSPECTING'
  | 'READY_FOR_PICKUP'
  | 'RETURNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'

export interface TargetDefinition {
  id: string
  label: string
  name: string // Backwards compatibility with SceneTarget
  aliases: string[]
  roomId: RoomId
  position: [number, number, number]
  approachWaypointId: string
  approachDistance: number
  inspectionDistance: number
  category: string

  searchable: boolean
  inspectable: boolean
  pickupAllowed: boolean

  description?: string
  keywords: string[]
  isEmergency?: boolean
}

export interface InspectionResult {
  targetId: string
  detected: boolean
  distance: number
  roomId: RoomId
  confidence: number
  status: string
  category: string
  timestamp: number
}

export interface Mission {
  id: string
  commandText: string
  intent: CommandIntent
  targetId: string
  targetLabel: string
  targetRoom: RoomId
  state: MissionState
  createdAt: number
  startedAt?: number
  completedAt?: number
  failureReason?: string
  resultMessage?: string
  navigationStatus?: NavigationStatus
  targetDistance?: number
  inspectionResult?: InspectionResult
}

export interface MissionLogEntry {
  id: string
  missionId: string
  timestamp: number
  formattedTime: string
  message: string
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR'
}

export interface ParsedCommand {
  rawText: string
  intent: CommandIntent | null
  targetId: string | null
  target: TargetDefinition | null
  intentConfidence: number
  targetConfidence: number
  matchedIntentPattern?: string
  matchedTargetAlias?: string
  resolutionMethod?: string
  valid: boolean
  errors: string[]
}

export interface CommandUnderstandingProvider {
  parse(text: string): Promise<ParsedCommand>
}
