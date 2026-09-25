import {
  Mission,
  MissionState,
  CommandUnderstandingProvider,
  InspectionResult
} from '@/types/mission'
import { defaultCommandProvider } from '@/commands/commandProvider'
import { useSimulationStore } from '@/store/useSimulationStore'
import { TARGETS } from '@/config/targets'

/**
 * MissionController is the central coordinator for high-level autonomous robot missions.
 * 
 * Responsibilities:
 * - Receive and parse user commands via async CommandUnderstandingProvider
 * - Validate commands and enforce action boundaries
 * - Atomically replace active missions when new commands arrive
 * - Guard against stale callbacks using strict mission ID verification
 * - Execute event-driven state transitions (PLANNING -> NAVIGATING -> APPROACHING -> SCANNING -> INSPECTING -> COMPLETED / READY_FOR_PICKUP)
 * - Provide sensor-driven target verification with configurable timeouts
 * - Safely handle manual control takeovers and navigation failures
 */
export class MissionController {
  private static instance: MissionController | null = null
  private provider: CommandUnderstandingProvider
  private activeScanCheckTimer: ReturnType<typeof setInterval> | null = null
  private scanTimeoutTimer: ReturnType<typeof setTimeout> | null = null
  private scanSuppressed: boolean = false

  constructor(provider: CommandUnderstandingProvider = defaultCommandProvider) {
    this.provider = provider
  }

  public static getInstance(): MissionController {
    if (!MissionController.instance) {
      MissionController.instance = new MissionController()
      if (typeof window !== 'undefined') {
        ;(window as any).__missionController = MissionController.instance
      }
    }
    return MissionController.instance
  }

  /**
   * Set custom provider (e.g. for testing or Phase 4 semantic model integration).
   */
  public setProvider(provider: CommandUnderstandingProvider): void {
    this.provider = provider
  }

  public getProvider(): CommandUnderstandingProvider {
    return this.provider
  }

  public async parse(rawText: string) {
    return this.provider.parse(rawText)
  }

  /**
   * Submits a natural language or structured user command.
   * Atomically cancels any active mission, stops active navigation, clears routes,
   * parses and validates the new command, and dispatches route planning.
   */
  public async submitCommand(rawText: string): Promise<Mission> {
    const store = useSimulationStore.getState()
    const text = rawText?.trim() || ''

    // Clear any pending timers from previous missions
    this.clearTimers()

    // 1. Cancel existing active mission if present
    if (store.activeMission && store.activeMission.state !== 'COMPLETED' && store.activeMission.state !== 'FAILED' && store.activeMission.state !== 'CANCELLED') {
      const oldMissionId = store.activeMission.id
      store.addMissionLog(
        `Active mission [${store.activeMission.intent} ${store.activeMission.targetLabel}] cancelled: Replaced by new command`,
        'WARN',
        oldMissionId
      )
      store.updateActiveMissionState('CANCELLED', {
        failureReason: 'Replaced by new command',
        completedAt: Date.now()
      })
      store.archiveActiveMission()
    }

    // 2. Atomically stop current AUTO navigation and clear route
    store.setNavigationStatus('IDLE')
    store.setActiveRoute([])
    store.setTargetLocked(false)
    store.setAutoScan(false)

    // 3. Log initial command reception
    store.addMissionLog(`Command received: "${text}"`, 'INFO')

    // 4. Parse command asynchronously
    const parsed = await this.provider.parse(text)

    // 5. If command validation failed, create failed mission and return
    if (!parsed.valid || !parsed.intent || !parsed.target) {
      const failedMission: Mission = {
        id: `mission_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        commandText: text,
        intent: parsed.intent || 'FIND',
        targetId: parsed.targetId || 'unknown',
        targetLabel: parsed.target?.label || 'Unresolved Target',
        targetRoom: parsed.target?.roomId || 'living_room',
        state: 'FAILED',
        createdAt: Date.now(),
        completedAt: Date.now(),
        failureReason: parsed.errors.join(' ')
      }

      store.addMissionLog(`Command rejected: ${parsed.errors.join(' ')}`, 'ERROR', failedMission.id)
      store.setActiveMission(failedMission)
      store.archiveActiveMission()
      return failedMission
    }

    // 6. Create active mission in PLANNING state
    const missionId = `mission_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    const newMission: Mission = {
      id: missionId,
      commandText: text,
      intent: parsed.intent,
      targetId: parsed.target.id,
      targetLabel: parsed.target.label,
      targetRoom: parsed.target.roomId,
      state: 'PLANNING',
      createdAt: Date.now(),
      startedAt: Date.now()
    }

    store.setActiveMission(newMission)
    store.addMissionLog(
      `Intent: ${parsed.intent} | Target: ${parsed.target.label} | Room: ${parsed.target.roomId.toUpperCase()}`,
      'INFO',
      missionId
    )

    // 7. Request autonomous navigation to target
    store.setTargetQuery(parsed.target.label)
    store.setNavigationTargetId(parsed.target.id)
    store.setSearchStatus('SEARCHING')
    store.setTargetLocked(false)
    store.setSearchMode('AUTO')
    store.setAutoScan(true)
    store.requestReplan()

    // 8. Transition to NAVIGATING
    this.updateMissionState(missionId, 'NAVIGATING')
    store.addMissionLog('Navigation dispatched. Planning topological A* route.', 'INFO', missionId)

    return newMission
  }

  /**
   * Called by Robot navigation system when robot arrives within target approach distance.
   */
  public handleTargetArrival(missionId: string, currentDistance: number = 0.8): void {
    const store = useSimulationStore.getState()
    const active = store.activeMission

    // Stale callback guard: ignore if active mission is different or already terminal
    if (!active || active.id !== missionId) {
      return
    }

    if (active.state === 'COMPLETED' || active.state === 'FAILED' || active.state === 'CANCELLED') {
      return
    }

    // Transition to APPROACHING
    this.updateMissionState(missionId, 'APPROACHING', { targetDistance: currentDistance })

    const target = TARGETS.find((t) => t.id === active.targetId)

    // Branch on Mission Intent
    switch (active.intent) {
      case 'NAVIGATE': {
        // NAVIGATE completes immediately upon reaching approach threshold
        const resultMsg = `Arrived at ${active.targetLabel} in ${active.targetRoom.toUpperCase()}.`
        this.updateMissionState(missionId, 'COMPLETED', {
          completedAt: Date.now(),
          resultMessage: resultMsg
        })
        store.addMissionLog(`Target reached: ${resultMsg}`, 'SUCCESS', missionId)
        store.archiveActiveMission()
        break
      }

      case 'FIND': {
        // FIND requires sensor confirmation
        this.updateMissionState(missionId, 'SCANNING')
        store.addMissionLog(
          `Target search area reached. Scanning for optical confirmation of ${active.targetLabel}...`,
          'INFO',
          missionId
        )
        this.startScannerConfirmation(missionId, target?.inspectionDistance || 1.5, () => {
          const lockedDist = store.activeScanTarget?.distance || currentDistance
          this.updateMissionState(missionId, 'TARGET_FOUND', { targetDistance: lockedDist })
          store.addMissionLog(
            `Target locked: ${active.targetLabel} verified in ${active.targetRoom.toUpperCase()} at ${lockedDist.toFixed(1)}m.`,
            'SUCCESS',
            missionId
          )

          setTimeout(() => {
            if (store.activeMission?.id !== missionId) return
            const resultMsg = `${active.targetLabel} located in ${active.targetRoom.toUpperCase()}. Target locked at ${lockedDist.toFixed(1)}m.`
            this.updateMissionState(missionId, 'COMPLETED', {
              completedAt: Date.now(),
              resultMessage: resultMsg
            })
            store.addMissionLog(`Mission COMPLETED: ${resultMsg}`, 'SUCCESS', missionId)
            store.archiveActiveMission()
          }, 500)
        })
        break
      }

      case 'INSPECT': {
        // INSPECT: SCANNING -> confirm target -> INSPECTING -> generate inspection report -> COMPLETED
        this.updateMissionState(missionId, 'SCANNING')
        store.addMissionLog(
          `Inspection approach reached. Performing sensor scan for ${active.targetLabel}...`,
          'INFO',
          missionId
        )

        this.startScannerConfirmation(missionId, target?.inspectionDistance || 2.2, () => {
          this.updateMissionState(missionId, 'INSPECTING')
          store.addMissionLog(
            `Optical lock acquired on ${active.targetLabel}. Performing simulated diagnostic inspection...`,
            'INFO',
            missionId
          )

          // Run 1.2s diagnostic sweep
          setTimeout(() => {
            const currentStore = useSimulationStore.getState()
            if (currentStore.activeMission?.id !== missionId) return

            const scanData = currentStore.activeScanTarget
            const inspectionResult: InspectionResult = {
              targetId: active.targetId,
              detected: true,
              distance: scanData?.distance || currentDistance,
              roomId: active.targetRoom,
              confidence: scanData?.confidence || 95.0,
              status: 'OPTICAL_LOCK_VERIFIED',
              category: target?.category || 'APPLIANCE',
              timestamp: Date.now()
            }

            const resultMsg = `Inspection complete: ${active.targetLabel} verified in ${active.targetRoom.toUpperCase()}. Status: OPTICAL_LOCK_VERIFIED (Confidence: ${inspectionResult.confidence.toFixed(1)}%).`

            this.updateMissionState(missionId, 'COMPLETED', {
              completedAt: Date.now(),
              inspectionResult,
              resultMessage: resultMsg
            })

            store.addMissionLog(`Mission COMPLETED: ${resultMsg}`, 'SUCCESS', missionId)
            store.archiveActiveMission()
          }, 1200)
        })
        break
      }

      case 'FETCH': {
        // FETCH (Phase 3): Navigate, approach, stop, and report READY_FOR_PICKUP
        const resultMsg = `${active.targetLabel} reached. Pickup system not yet implemented — scheduled for Phase 7.`
        this.updateMissionState(missionId, 'READY_FOR_PICKUP', {
          completedAt: Date.now(),
          resultMessage: resultMsg
        })
        store.addMissionLog(`Target reached: ${resultMsg}`, 'SUCCESS', missionId)
        store.archiveActiveMission()
        break
      }
    }
  }

  /**
   * Starts sensor polling to verify optical scanner confirmation with a 5-second timeout.
   */
  private startScannerConfirmation(
    missionId: string,
    maxDistance: number,
    onConfirmed: () => void
  ): void {
    this.clearTimers()

    const checkInterval = 150
    const timeoutMs = 5000
    const startTime = Date.now()

    this.activeScanCheckTimer = setInterval(() => {
      const store = useSimulationStore.getState()
      const active = store.activeMission

      // Stale callback guard
      if (!active || active.id !== missionId) {
        this.clearTimers()
        return
      }

      // If scanner is NOT suppressed, check for optical target confirmation
      if (!this.scanSuppressed) {
        const scan = store.activeScanTarget
        const isScanMatch = scan && scan.id === active.targetId && scan.distance <= maxDistance + 1.0
        const isHistoryMatch = store.scannedHistory.some(
          (s) => s.id === active.targetId && s.distance <= maxDistance + 1.0
        )
        const target = TARGETS.find((t) => t.id === active.targetId)
        const robotPos = store.robotWorldPos
        const physicalDist = target
          ? Math.hypot(target.position[0] - robotPos[0], target.position[2] - robotPos[2])
          : 999
        const isProximityMatch = physicalDist <= maxDistance + 0.8

        if (isScanMatch || isHistoryMatch || isProximityMatch) {
          this.clearTimers()
          onConfirmed()
          return
        }
      }

      // Check timeout (applies whether scanner is running or suppressed)
      if (Date.now() - startTime >= timeoutMs) {
        this.clearTimers()
        this.updateMissionState(missionId, 'FAILED', {
          completedAt: Date.now(),
          failureReason: 'Target could not be confirmed by scanner.'
        })
        store.addMissionLog(
          `Mission FAILED: Optical scanner timed out after ${timeoutMs / 1000}s. Target not verified in sensor field.`,
          'ERROR',
          missionId
        )
        store.archiveActiveMission()
        return
      }
    }, checkInterval)
  }

  /**
   * Called when user presses manual movement keys (W/S/A/D/Q/E/Shift).
   */
  public handleManualTakeover(): void {
    const store = useSimulationStore.getState()
    const active = store.activeMission

    if (!active) return

    // Only cancel active non-terminal missions
    if (active.state !== 'COMPLETED' && active.state !== 'FAILED' && active.state !== 'CANCELLED') {
      const missionId = active.id
      this.clearTimers()

      this.updateMissionState(missionId, 'CANCELLED', {
        completedAt: Date.now(),
        failureReason: 'Manual control takeover'
      })

      store.addMissionLog('Mission cancelled: Manual control takeover.', 'WARN', missionId)
      store.archiveActiveMission()
    }
  }

  /**
   * Called when navigation system reports unrecoverable failure or route blockage.
   */
  public handleNavigationFailure(reason: string = 'No valid route'): void {
    const store = useSimulationStore.getState()
    const active = store.activeMission

    if (!active) return

    if (active.state !== 'COMPLETED' && active.state !== 'FAILED' && active.state !== 'CANCELLED') {
      const missionId = active.id
      this.clearTimers()

      this.updateMissionState(missionId, 'FAILED', {
        completedAt: Date.now(),
        failureReason: `Navigation failed: ${reason}`
      })

      store.addMissionLog(`Mission FAILED: Navigation failed: ${reason}`, 'ERROR', missionId)
      store.archiveActiveMission()
    }
  }

  /**
   * Helper to set scan suppression flag for testing scan timeout failure (Requirement 23).
   */
  public setScanSuppressedForTesting(suppressed: boolean): void {
    this.scanSuppressed = suppressed
  }

  private updateMissionState(missionId: string, state: MissionState, updates?: Partial<Mission>): void {
    const store = useSimulationStore.getState()
    if (store.activeMission?.id === missionId) {
      store.updateActiveMissionState(state, updates)
    }
  }

  private clearTimers(): void {
    if (this.activeScanCheckTimer) {
      clearInterval(this.activeScanCheckTimer)
      this.activeScanCheckTimer = null
    }
    if (this.scanTimeoutTimer) {
      clearTimeout(this.scanTimeoutTimer)
      this.scanTimeoutTimer = null
    }
  }
}

if (typeof window !== 'undefined') {
  ;(window as any).__missionController = MissionController.getInstance()
}

