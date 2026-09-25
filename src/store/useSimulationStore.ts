import { create } from 'zustand'
import { RoomId } from '@/config/rooms'
import { NavigationWaypoint } from '@/config/waypoints'
import { Mission, MissionLogEntry, MissionState } from '@/types/mission'

export type CameraMode = 'CHASE' | 'FPV' | 'ORBIT' | 'DRONE' | 'FREE'
export type ChaseDistancePreset = 'CLOSE' | 'NORMAL' | 'FAR'

export type NavigationStatus =
  | 'IDLE'
  | 'PLANNING'
  | 'FOLLOWING_PATH'
  | 'AVOIDING_OBSTACLE'
  | 'APPROACHING_TARGET'
  | 'ARRIVED'
  | 'STUCK'
  | 'FAILED'

export interface ScannedObjectInfo {
  id: string
  name: string
  category: string
  distance: number
  confidence: number
  coords?: [number, number, number]
  isEmergency?: boolean
  thumbnail?: string
}

interface SimulationState {
  debugMode: boolean
  toggleDebugMode: () => void

  cameraMode: CameraMode
  setCameraMode: (m: CameraMode) => void
  chasePreset: ChaseDistancePreset
  setChasePreset: (p: ChaseDistancePreset) => void
  desiredChaseDistance: number
  setDesiredChaseDistance: (dist: number) => void
  robotYaw: number
  setRobotYaw: (yaw: number) => void

  introActive: boolean
  setIntroActive: (active: boolean) => void

  autoScan: boolean
  setAutoScan: (active: boolean) => void

  targetLocked: boolean
  setTargetLocked: (locked: boolean) => void

  isPickingUp: boolean
  setIsPickingUp: (picking: boolean) => void

  robotWorldPos: [number, number, number]
  setRobotWorldPos: (pos: [number, number, number]) => void
  droneWorldPos: [number, number, number]
  setDroneWorldPos: (pos: [number, number, number]) => void

  activeScanTarget: ScannedObjectInfo | null
  setActiveScanTarget: (target: ScannedObjectInfo | null) => void

  scannedHistory: ScannedObjectInfo[]
  addScannedObject: (target: ScannedObjectInfo) => void

  robotTelemetry: { altitude: number; speed: number; heading: number }
  setRobotTelemetry: (telemetry: { altitude: number; speed: number; heading: number }) => void
  droneTelemetry: { altitude: number; speed: number; heading: number }
  setDroneTelemetry: (telemetry: { altitude: number; speed: number; heading: number }) => void

  time: number // 0 to 24
  timeSpeed: number
  setTime: (time: number) => void
  setTimeSpeed: (speed: number) => void
  tickTime: (delta: number) => void

  // Dynamic Mission / Target Search System
  targetQuery: string
  setTargetQuery: (query: string) => void

  searchStatus: 'IDLE' | 'SEARCHING' | 'FOUND'
  setSearchStatus: (status: 'IDLE' | 'SEARCHING' | 'FOUND') => void

  searchMode: 'AUTO' | 'MANUAL'
  setSearchMode: (mode: 'AUTO' | 'MANUAL') => void

  // Phase 2 Navigation State
  navigationStatus: NavigationStatus
  setNavigationStatus: (status: NavigationStatus) => void
  currentRoom: RoomId | null
  setCurrentRoom: (room: RoomId | null) => void
  activeRoute: NavigationWaypoint[]
  setActiveRoute: (route: NavigationWaypoint[]) => void
  currentWaypointIndex: number
  setCurrentWaypointIndex: (idx: number) => void
  navigationTargetId: string | null
  setNavigationTargetId: (id: string | null) => void
  replanRequested: boolean
  requestReplan: () => void
  clearReplanRequest: () => void

  // Phase 3 Mission Intelligence State
  activeMission: Mission | null
  setActiveMission: (mission: Mission | null) => void
  updateActiveMissionState: (state: MissionState, updates?: Partial<Mission>) => void
  archiveActiveMission: () => void
  missionHistory: Mission[]
  missionLog: MissionLogEntry[]
  addMissionLog: (message: string, level?: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR', missionId?: string) => void
  clearMissions: () => void
}

export const useSimulationStore = create<SimulationState>((set) => ({
  debugMode: false,
  toggleDebugMode: () => set((state) => ({ debugMode: !state.debugMode })),

  cameraMode: 'CHASE',
  setCameraMode: (cameraMode) => {
    const normalized: CameraMode = cameraMode === 'DRONE' ? 'CHASE' : cameraMode === 'FREE' ? 'ORBIT' : cameraMode
    set({ cameraMode: normalized })
  },
  chasePreset: 'NORMAL',
  desiredChaseDistance: 1.8,
  setChasePreset: (chasePreset) => {
    const distMap: Record<ChaseDistancePreset, number> = {
      CLOSE: 1.1,
      NORMAL: 1.8,
      FAR: 3.2
    }
    set({ chasePreset, desiredChaseDistance: distMap[chasePreset] })
  },
  setDesiredChaseDistance: (desiredChaseDistance) =>
    set({ desiredChaseDistance: Math.max(0.8, Math.min(4.5, desiredChaseDistance)) }),
  robotYaw: 0,
  setRobotYaw: (robotYaw) => set({ robotYaw }),

  introActive: false,
  setIntroActive: (introActive) => set({ introActive }),

  autoScan: false,
  setAutoScan: (autoScan) => set({ autoScan }),

  targetLocked: false,
  setTargetLocked: (targetLocked) => set({ targetLocked }),

  isPickingUp: false,
  setIsPickingUp: (isPickingUp) => set({ isPickingUp }),

  robotWorldPos: [-0.50, 0.24, 2.70],
  setRobotWorldPos: (pos) => set({ robotWorldPos: pos, droneWorldPos: pos }),
  droneWorldPos: [-0.50, 0.24, 2.70],
  setDroneWorldPos: (pos) => set({ robotWorldPos: pos, droneWorldPos: pos }),

  activeScanTarget: null,
  setActiveScanTarget: (activeScanTarget) => set({ activeScanTarget }),

  scannedHistory: [],
  addScannedObject: (target) =>
    set((state) => {
      if (state.scannedHistory.some((item) => item.id === target.id)) {
        return state
      }
      return { scannedHistory: [target, ...state.scannedHistory] }
    }),

  robotTelemetry: { altitude: 0, speed: 0, heading: 0 },
  setRobotTelemetry: (telemetry) => set({ robotTelemetry: telemetry, droneTelemetry: telemetry }),
  droneTelemetry: { altitude: 0, speed: 0, heading: 0 },
  setDroneTelemetry: (telemetry) => set({ robotTelemetry: telemetry, droneTelemetry: telemetry }),

  time: 14,
  timeSpeed: 1,
  setTime: (time) => set({ time }),
  setTimeSpeed: (timeSpeed) => set({ timeSpeed }),
  tickTime: (delta) =>
    set((state) => ({
      time: (state.time + (delta * state.timeSpeed) / 10) % 24,
    })),

  // Default target mission: Fire Extinguisher (can be changed to any object via command input)
  targetQuery: 'Fire Extinguisher',
  setTargetQuery: (targetQuery) => set({ targetQuery, searchStatus: 'SEARCHING', targetLocked: false, replanRequested: true }),

  searchStatus: 'SEARCHING',
  setSearchStatus: (searchStatus) => set({ searchStatus }),

  searchMode: 'MANUAL',
  setSearchMode: (searchMode) => {
    const isAuto = searchMode === 'AUTO'
    set({ 
      searchMode, 
      autoScan: isAuto, 
      targetLocked: false,
      replanRequested: isAuto // Request route plan immediately when switching to AUTO
    })
  },

  // Phase 2 Navigation State
  navigationStatus: 'IDLE',
  setNavigationStatus: (navigationStatus) => set({ navigationStatus }),
  currentRoom: 'living_room',
  setCurrentRoom: (currentRoom) => set({ currentRoom }),
  activeRoute: [],
  setActiveRoute: (activeRoute) => set({ activeRoute, currentWaypointIndex: 0 }),
  currentWaypointIndex: 0,
  setCurrentWaypointIndex: (currentWaypointIndex) => set({ currentWaypointIndex }),
  navigationTargetId: null,
  setNavigationTargetId: (navigationTargetId) => set({ navigationTargetId }),
  replanRequested: false,
  requestReplan: () => set({ replanRequested: true }),
  clearReplanRequest: () => set({ replanRequested: false }),

  // Phase 3 Mission Intelligence State
  activeMission: null,
  setActiveMission: (activeMission) => set({ activeMission }),

  updateActiveMissionState: (state, updates = {}) =>
    set((s) => {
      if (!s.activeMission) return s
      const updated: Mission = {
        ...s.activeMission,
        ...updates,
        state
      }
      return { activeMission: updated }
    }),

  archiveActiveMission: () =>
    set((s) => {
      if (!s.activeMission) return s
      const terminalMission = s.activeMission
      const updatedHistory = [terminalMission, ...s.missionHistory].slice(0, 20)
      return {
        activeMission: null,
        missionHistory: updatedHistory
      }
    }),

  missionHistory: [],
  missionLog: [],

  addMissionLog: (message, level = 'INFO', missionId = '') =>
    set((s) => {
      const now = new Date()
      const pad = (n: number) => n.toString().padStart(2, '0')
      const formattedTime = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
      const entry: MissionLogEntry = {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        missionId: missionId || s.activeMission?.id || 'sys',
        timestamp: Date.now(),
        formattedTime,
        message,
        level
      }
      return {
        missionLog: [entry, ...s.missionLog].slice(0, 50)
      }
    }),

  clearMissions: () => set({ activeMission: null, missionHistory: [], missionLog: [] })
}))

if (typeof window !== 'undefined') {
  ;(window as any).__simStore = useSimulationStore
}
