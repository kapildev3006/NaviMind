'use client'

import React, { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useRapier } from '@react-three/rapier'
import * as THREE from 'three'
import { CameraMode, ChaseDistancePreset, useSimulationStore } from '@/store/useSimulationStore'

const APARTMENT_CAMERA_BOUNDS = {
  minX: -6.70,
  maxX: 0.25,
  minZ: -6.20,
  maxZ: 4.40,
  minY: 0.25,
  maxY: 2.65
}

export const CameraDirector = () => {
  const cameraMode = useSimulationStore((state) => state.cameraMode)
  const chasePreset = useSimulationStore((state) => state.chasePreset)
  const desiredChaseDistance = useSimulationStore((state) => state.desiredChaseDistance)

  const { rapier, world } = useRapier()
  const { camera, gl } = useThree()

  const orbitRef = useRef<any>(null)
  const currentCameraPos = useRef(new THREE.Vector3(0, 1.8, 4.2))
  const currentCameraLookAt = useRef(new THREE.Vector3(0, 0.45, 1.0))
  const effectiveDistance = useRef(1.8)
  const wasOrbiting = useRef(false)

  // 1. Mouse wheel zoom listener for CHASE mode distance adjustment
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const currentMode = useSimulationStore.getState().cameraMode
      if (currentMode !== 'CHASE') return

      e.preventDefault()
      const delta = e.deltaY * 0.002
      const curDist = useSimulationStore.getState().desiredChaseDistance
      const nextDist = Math.max(0.8, Math.min(4.5, curDist + delta))
      useSimulationStore.getState().setDesiredChaseDistance(nextDist)
    }

    const domElement = gl.domElement
    domElement.addEventListener('wheel', handleWheel, { passive: false })
    return () => domElement.removeEventListener('wheel', handleWheel)
  }, [gl])

  // 2. Global hotkeys: 'C' to cycle camera modes, 'V' to cycle chase distance presets
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return

      if (e.key.toLowerCase() === 'c') {
        const curMode = useSimulationStore.getState().cameraMode
        const modes: CameraMode[] = ['CHASE', 'FPV', 'ORBIT']
        const nextIdx = (modes.indexOf(curMode as any) + 1) % modes.length
        useSimulationStore.getState().setCameraMode(modes[nextIdx])
      } else if (e.key.toLowerCase() === 'v') {
        const curPreset = useSimulationStore.getState().chasePreset
        const presets: ChaseDistancePreset[] = ['CLOSE', 'NORMAL', 'FAR']
        const nextIdx = (presets.indexOf(curPreset) + 1) % presets.length
        useSimulationStore.getState().setChasePreset(presets[nextIdx])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 3. Centralized per-frame camera controller
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1)
    const { cameraMode: curMode, desiredChaseDistance: curDesiredDist, robotWorldPos, robotYaw } =
      useSimulationStore.getState()
    const [rx, ry, rz] = robotWorldPos

    // Expose runtime camera debug info for headless testing & diagnostics
    if (typeof window !== 'undefined') {
      ;(window as any).__cameraDebug = {
        cameraMode: curMode,
        chasePreset: useSimulationStore.getState().chasePreset,
        desiredChaseDistance: curDesiredDist,
        effectiveDistance: effectiveDistance.current,
        pos: { x: state.camera.position.x, y: state.camera.position.y, z: state.camera.position.z },
        lookAt: {
          x: currentCameraLookAt.current.x,
          y: currentCameraLookAt.current.y,
          z: currentCameraLookAt.current.z
        }
      }
    }

    // --- ORBIT MODE ---
    if (curMode === 'ORBIT') {
      if (!wasOrbiting.current) {
        wasOrbiting.current = true
        if (orbitRef.current) {
          orbitRef.current.target.set(rx, ry + 0.35, rz)
          orbitRef.current.update()
        }
      }
      return
    }

    // Returning from ORBIT mode: smoothly transition from where OrbitControls left the camera
    if (wasOrbiting.current) {
      wasOrbiting.current = false
      currentCameraPos.current.copy(state.camera.position)
    }

    // --- FPV MODE (Calibrated synthetic eye anchor) ---
    if (curMode === 'FPV') {
      // BD-1 optical sensor eye anchor: Y+0.22m, forward offset +0.12m along yaw
      const eyeX = rx - Math.sin(robotYaw) * 0.12
      const eyeY = ry + 0.22
      const eyeZ = rz - Math.cos(robotYaw) * 0.12
      const eyePos = new THREE.Vector3(eyeX, eyeY, eyeZ)

      const fpvLookTarget = new THREE.Vector3(
        eyeX - Math.sin(robotYaw) * 4.0,
        eyeY - 0.05,
        eyeZ - Math.cos(robotYaw) * 4.0
      )

      // High-responsiveness lerp to avoid high-frequency jitter while preserving 1-to-1 head motion
      currentCameraPos.current.lerp(eyePos, Math.min(1, dt * 25))
      currentCameraLookAt.current.lerp(fpvLookTarget, Math.min(1, dt * 25))

      state.camera.position.copy(currentCameraPos.current)
      state.camera.lookAt(currentCameraLookAt.current)
      return
    }

    // --- CHASE MODE (3rd-person follow with wall collision raycasting) ---
    // Anchor point on BD-1 character controller center
    const anchor = new THREE.Vector3(rx, ry + 0.22, rz)

    // Camera height dynamically scales with follow distance
    const camHeight = 0.25 + curDesiredDist * 0.20

    const idealPos = new THREE.Vector3(
      rx + Math.sin(robotYaw) * curDesiredDist,
      ry + camHeight,
      rz + Math.cos(robotYaw) * curDesiredDist
    )

    // Raycast query from robot anchor to desired camera position
    const rayDir = new THREE.Vector3().subVectors(idealPos, anchor)
    const targetRayDist = rayDir.length()
    let safeDistance = curDesiredDist

    if (targetRayDist > 0.001) {
      rayDir.normalize()
      const ray = new rapier.Ray(anchor, rayDir)
      // Filter flag 2 = EXCLUDE_KINEMATIC (ignores BD-1 capsule, hits static walls and furniture)
      const hit = world.castRay(ray, targetRayDist, true, 2)
      if (hit && hit.timeOfImpact < targetRayDist) {
        // Contract camera in front of wall with 0.20m safety buffer (min clamp 0.40m)
        const hitDistance = Math.max(0.40, hit.timeOfImpact - 0.20)
        safeDistance = Math.min(curDesiredDist, hitDistance)
      }
    }

    // Adaptive damping: fast contraction when blocked by wall (14x), smooth unhurried release (5x)
    const lerpSpeed = safeDistance < effectiveDistance.current ? 14 : 5
    effectiveDistance.current += (safeDistance - effectiveDistance.current) * Math.min(1, dt * lerpSpeed)

    const actualCamHeight = 0.25 + effectiveDistance.current * 0.20
    const targetX = rx + Math.sin(robotYaw) * effectiveDistance.current
    const targetY = ry + actualCamHeight
    const targetZ = rz + Math.cos(robotYaw) * effectiveDistance.current

    // Clamp camera within apartment bounding envelope so it never clips into outer void
    const clampedX = Math.max(
      APARTMENT_CAMERA_BOUNDS.minX,
      Math.min(APARTMENT_CAMERA_BOUNDS.maxX, targetX)
    )
    const clampedY = Math.max(
      APARTMENT_CAMERA_BOUNDS.minY,
      Math.min(APARTMENT_CAMERA_BOUNDS.maxY, targetY)
    )
    const clampedZ = Math.max(
      APARTMENT_CAMERA_BOUNDS.minZ,
      Math.min(APARTMENT_CAMERA_BOUNDS.maxZ, targetZ)
    )

    const clampedPos = new THREE.Vector3(clampedX, clampedY, clampedZ)
    currentCameraPos.current.lerp(clampedPos, Math.min(1, dt * 8))

    // LookAt follows BD-1 forward path
    const idealLookAt = new THREE.Vector3(
      rx - Math.sin(robotYaw) * 1.8,
      ry + 0.28,
      rz - Math.cos(robotYaw) * 1.8
    )
    currentCameraLookAt.current.lerp(idealLookAt, Math.min(1, dt * 9))

    state.camera.position.copy(currentCameraPos.current)
    state.camera.lookAt(currentCameraLookAt.current)
  })

  return (
    <OrbitControls
      ref={orbitRef}
      makeDefault={cameraMode === 'ORBIT'}
      enableDamping
      dampingFactor={0.05}
      minDistance={0.5}
      maxDistance={16}
      maxPolarAngle={Math.PI / 2 + 0.05}
      enabled={cameraMode === 'ORBIT'}
    />
  )
}
