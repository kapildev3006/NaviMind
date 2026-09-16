import { useEffect, useRef } from 'react'
import { useSimulationStore } from '@/store/useSimulationStore'

export interface RobotControlsState {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
  strafeLeft: boolean
  strafeRight: boolean
  sprint: boolean
  // Legacy aliases for backward compatibility
  yawLeft: boolean
  yawRight: boolean
  up: boolean
  down: boolean
}

export const useRobotControls = () => {
  const keysRef = useRef<RobotControlsState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    strafeLeft: false,
    strafeRight: false,
    sprint: false,
    yawLeft: false,
    yawRight: false,
    up: false,
    down: false,
  })

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events when user is typing in an input field (e.g. search bar)
      const targetTag = (e.target as HTMLElement)?.tagName
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA') return

      const k = keysRef.current
      let isManualControlKey = false

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          k.forward = true
          isManualControlKey = true
          break
        case 'KeyS':
        case 'ArrowDown':
          k.backward = true
          isManualControlKey = true
          break
        case 'KeyA':
        case 'ArrowLeft':
          k.left = true
          isManualControlKey = true
          break
        case 'KeyD':
        case 'ArrowRight':
          k.right = true
          isManualControlKey = true
          break
        case 'KeyQ':
          k.strafeLeft = true
          k.yawLeft = true
          isManualControlKey = true
          break
        case 'KeyE':
          k.strafeRight = true
          k.yawRight = true
          isManualControlKey = true
          break
        case 'ShiftLeft':
        case 'ShiftRight':
          k.sprint = true
          k.down = true
          isManualControlKey = true
          break
        case 'Space':
        case 'KeyR':
          k.up = true
          break
      }

      // Seamless Instant Manual Takeover: any physical movement input instantly cancels AUTO mode
      if (isManualControlKey) {
        const store = useSimulationStore.getState()
        if (store.searchMode !== 'MANUAL' || store.autoScan) {
          store.setSearchMode('MANUAL')
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = keysRef.current
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          k.forward = false
          break
        case 'KeyS':
        case 'ArrowDown':
          k.backward = false
          break
        case 'KeyA':
        case 'ArrowLeft':
          k.left = false
          break
        case 'KeyD':
        case 'ArrowRight':
          k.right = false
          break
        case 'KeyQ':
          k.strafeLeft = false
          k.yawLeft = false
          break
        case 'KeyE':
          k.strafeRight = false
          k.yawRight = false
          break
        case 'ShiftLeft':
        case 'ShiftRight':
          k.sprint = false
          k.down = false
          break
        case 'Space':
        case 'KeyR':
          k.up = false
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  return keysRef
}
