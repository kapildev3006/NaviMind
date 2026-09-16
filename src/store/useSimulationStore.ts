import { create } from 'zustand'

export type CameraMode = 'FREE' | 'DRONE'

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
}

export const useSimulationStore = create<SimulationState>((set) => ({
  debugMode: false,
  toggleDebugMode: () => set((state) => ({ debugMode: !state.debugMode })),

  cameraMode: 'DRONE',
  setCameraMode: (cameraMode) => set({ cameraMode }),

  introActive: false,
  setIntroActive: (introActive) => set({ introActive }),

  autoScan: false,
  setAutoScan: (autoScan) => set({ autoScan }),

  targetLocked: false,
  setTargetLocked: (targetLocked) => set({ targetLocked }),

  isPickingUp: false,
  setIsPickingUp: (isPickingUp) => set({ isPickingUp }),

  robotWorldPos: [0.6, 0.24, 2.6],
  setRobotWorldPos: (pos) => set({ robotWorldPos: pos, droneWorldPos: pos }),
  droneWorldPos: [0.6, 0.24, 2.6],
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
  setTargetQuery: (targetQuery) => set({ targetQuery, searchStatus: 'SEARCHING', targetLocked: false }),

  searchStatus: 'SEARCHING',
  setSearchStatus: (searchStatus) => set({ searchStatus }),

  searchMode: 'MANUAL',
  setSearchMode: (searchMode) => set({ searchMode, autoScan: searchMode === 'AUTO', targetLocked: false }),
}))

if (typeof window !== 'undefined') {
  ;(window as any).__simStore = useSimulationStore
}
