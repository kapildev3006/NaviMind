'use client'

import React, { useRef, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { RigidBody, RapierRigidBody, CapsuleCollider } from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useDroneControls } from '@/hooks/useDroneControls'
import { useSimulationStore, ScannedObjectInfo } from '@/store/useSimulationStore'

// Detectable objects physically present in the apartment
export const SCENE_OBJECTS = [
  { id: 'fire_extinguisher_01', name: 'Emergency Fire Extinguisher', category: 'SAFETY SYSTEM', pos: new THREE.Vector3(-2.2, 0.55, 1.8), isEmergency: true, keywords: ['fire', 'extinguisher', 'safety', 'red', 'cylinder'] },
  { id: 'smart_tv_console', name: 'Living Room Smart TV (4K OLED)', category: 'APPLIANCE', pos: new THREE.Vector3(2.4, 1.2, 3.8), keywords: ['tv', 'television', 'display', 'screen', 'oled', 'smart tv'] },
  { id: 'kitchen_induction', name: 'Kitchen Induction Cooktop', category: 'APPLIANCE', pos: new THREE.Vector3(-2.4, 0.88, 3.2), keywords: ['kitchen', 'induction', 'stove', 'cooktop', 'cooking', 'range'] },
  { id: 'smoke_detector_alpha', name: 'Smart Smoke & Gas Detector', category: 'FIRE SAFETY', pos: new THREE.Vector3(0, 2.44, 2.8), keywords: ['smoke', 'detector', 'alarm', 'sensor', 'gas'] },
  { id: 'power_distribution', name: 'Main Power Breaker Panel', category: 'ELECTRICAL', pos: new THREE.Vector3(-3.15, 1.4, -0.5), keywords: ['power', 'breaker', 'panel', 'electric', 'fuse', 'distribution'] },
  { id: 'master_bedroom_bed', name: 'Master Bedroom Bed Suite', category: 'FURNITURE', pos: new THREE.Vector3(1.5, 0.7, -2.5), keywords: ['bed', 'bedroom', 'mattress', 'furniture', 'pillow'] },
  { id: 'balcony_glazing', name: 'Living Room Balcony Window', category: 'STRUCTURAL', pos: new THREE.Vector3(0, 1.4, 5.2), keywords: ['balcony', 'window', 'glass', 'glazing', 'terrace'] },
  { id: 'hallway_access', name: 'Main Apartment Access Door', category: 'SECURITY', pos: new THREE.Vector3(-1.8, 1.2, -3.2), keywords: ['door', 'doorway', 'entrance', 'entry', 'exit', 'hallway'] }
]

// Open floor-space waypoints for patrol around furniture
const APARTMENT_PATROL_WAYPOINTS = [
  new THREE.Vector3(0, 0.35, 2.2),      // Living room open floor
  new THREE.Vector3(-1.4, 0.35, 2.2),   // Kitchen entryway corridor
  new THREE.Vector3(-2.0, 0.35, 1.6),   // Kitchen station
  new THREE.Vector3(-1.5, 0.35, -0.2),  // Central hallway
  new THREE.Vector3(-1.4, 0.35, -2.0),  // Bedroom approach
  new THREE.Vector3(1.0, 0.35, -2.2),   // Master bedroom suite
  new THREE.Vector3(1.0, 0.35, 0.2),    // Living room corridor
  new THREE.Vector3(0.6, 0.35, 2.6),    // Lounge open floor
]

// Helper function to test if an object matches the user's search query or image
export const matchesTarget = (obj: typeof SCENE_OBJECTS[0], query: string): boolean => {
  if (!query || !query.trim()) return false
  const q = query.toLowerCase().trim()
  if (obj.name.toLowerCase().includes(q)) return true
  if (obj.category.toLowerCase().includes(q)) return true
  return obj.keywords.some(k => q.includes(k) || k.includes(q))
}

// BD-1 Robot Model with walking animation
const BD1Model = ({ isMoving }: { isMoving: boolean }) => {
  const { scene } = useGLTF('/bd1.glb')
  const modelGroupRef = useRef<THREE.Group>(null)

  useMemo(() => {
    scene.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        if (child.material) {
          child.material.side = THREE.DoubleSide
          child.material.roughness = Math.max(0.25, child.material.roughness ?? 0.5)
          child.material.metalness = Math.min(0.85, child.material.metalness ?? 0.3)
        }
      }
    })
  }, [scene])

  useFrame((state) => {
    if (!modelGroupRef.current) return
    const time = state.clock.elapsedTime

    if (isMoving) {
      const walkBob = Math.abs(Math.sin(time * 12)) * 0.012
      const walkRoll = Math.sin(time * 6) * 0.02
      const walkPitch = -0.04 // Forward walking lean

      modelGroupRef.current.position.y = -0.32 + walkBob
      modelGroupRef.current.rotation.z = walkRoll
      modelGroupRef.current.rotation.x = walkPitch
    } else {
      const idleBob = Math.sin(time * 2) * 0.003
      modelGroupRef.current.position.y = -0.32 + idleBob
      modelGroupRef.current.rotation.z = 0
      modelGroupRef.current.rotation.x = 0
    }
  })

  // Scale 0.0075 sets BD-1 height to ~63cm (fits cleanly under tables and chairs without catching)
  return (
    <group ref={modelGroupRef} position={[0, -0.32, 0]} rotation={[0, 0, 0]} scale={0.0075}>
      <primitive object={scene} />
    </group>
  )
}

export const Robot = () => {
  const robotRef = useRef<RapierRigidBody>(null)
  const keys = useDroneControls()
  
  const currentVel = useRef(new THREE.Vector3())
  const robotDirection = useRef(new THREE.Vector3(0, 0, -1))
  const rightDirection = useRef(new THREE.Vector3(1, 0, 0))
  
  // Explicit Yaw angle tracking (0 = facing forward towards -Z)
  const currentYaw = useRef(0)
  
  // Camera smoothing targets: positioned behind BD-1 looking forward
  const currentCameraPosition = useRef(new THREE.Vector3(0, 0.95, 4.6))
  const currentCameraLookAt = useRef(new THREE.Vector3(0, 0.55, 1.0))

  const waypointIdx = useRef(0)
  const isMovingRef = useRef(false)

  useFrame((state, delta) => {
    if (!robotRef.current) return

    const { forward, backward, left, right, yawLeft, yawRight, up, down } = keys
    const { 
      cameraMode, 
      introActive, 
      setIntroActive, 
      autoScan, 
      setAutoScan, 
      targetLocked, 
      setTargetLocked, 
      isPickingUp, 
      setDroneWorldPos,
      targetQuery,
      searchStatus,
      setSearchStatus
    } = useSimulationStore.getState()

    // Seamless Manual Takeover: pressing ANY movement key immediately cancels auto mode & target lock!
    const anyManualKey = forward || backward || left || right || yawLeft || yawRight || up || down
    if (anyManualKey) {
      if (introActive) setIntroActive(false)
      if (autoScan) setAutoScan(false)
      if (targetLocked) setTargetLocked(false)
    }

    const walkSpeed = 3.6
    const rotSpeed = 2.8
    
    const pos = robotRef.current.translation()

    // Compute forward & right vectors based purely on current yaw angle
    robotDirection.current.set(-Math.sin(currentYaw.current), 0, -Math.cos(currentYaw.current)).normalize()
    rightDirection.current.set(Math.cos(currentYaw.current), 0, -Math.sin(currentYaw.current)).normalize()

    let targetVelocity = new THREE.Vector3(0, 0, 0)
    let targetYawDelta = 0
    
    const isAutoActive = !anyManualKey && (introActive || autoScan)

    // Identify matching target from user's active search query
    const targetObj = SCENE_OBJECTS.find(obj => matchesTarget(obj, targetQuery))

    if (isAutoActive) {
      if (isPickingUp) {
        targetVelocity.set(0, 0, 0)
        targetYawDelta = 0.4
      } else if (targetLocked) {
        // Target located: halt and hold position
        targetVelocity.set(0, 0, 0)
        targetYawDelta = 0
      } else {
        // In AUTO mode: If user specified an active target, navigate directly towards it!
        let destination = APARTMENT_PATROL_WAYPOINTS[waypointIdx.current]

        if (targetObj) {
          // Direct navigation towards user's requested object!
          destination = new THREE.Vector3(targetObj.pos.x, 0.35, targetObj.pos.z)
        }

        const toTarget = new THREE.Vector3(destination.x - pos.x, 0, destination.z - pos.z)
        const distToTarget = toTarget.length()

        if (distToTarget < 1.4 && targetObj) {
          // Reached target object!
          setTargetLocked(true)
          setSearchStatus('FOUND')
          targetVelocity.set(0, 0, 0)
        } else if (distToTarget < 0.5 && !targetObj) {
          waypointIdx.current = (waypointIdx.current + 1) % APARTMENT_PATROL_WAYPOINTS.length
        } else {
          const moveDir = toTarget.clone().normalize()
          targetVelocity.copy(moveDir.multiplyScalar(2.2))

          // Steer smoothly towards destination
          const targetHeading = Math.atan2(-moveDir.x, -moveDir.z)
          let angleDiff = targetHeading - currentYaw.current
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2
          targetYawDelta = THREE.MathUtils.clamp(angleDiff * 3.0, -rotSpeed, rotSpeed)
        }
      }
    } else {
      // Direct Manual Floor Movement:
      // W / ArrowUp: moves forward in direction BD-1 is facing (away from camera)
      if (forward) targetVelocity.addScaledVector(robotDirection.current, walkSpeed)
      // S / ArrowDown: moves backward (towards camera)
      if (backward) targetVelocity.addScaledVector(robotDirection.current, -walkSpeed)
      
      // Q / E: strafe left / right
      if (yawLeft) targetVelocity.addScaledVector(rightDirection.current, -walkSpeed * 0.8)
      if (yawRight) targetVelocity.addScaledVector(rightDirection.current, walkSpeed * 0.8)

      // A / ArrowLeft: turns left
      if (left) targetYawDelta += rotSpeed
      // D / ArrowRight: turns right
      if (right) targetYawDelta -= rotSpeed
    }

    // Update yaw angle smoothly
    currentYaw.current += targetYawDelta * delta

    // Smooth horizontal velocity on floor
    const currentLinVel = robotRef.current.linvel()
    currentVel.current.set(currentLinVel.x, 0, currentLinVel.z)
    currentVel.current.lerp(targetVelocity, delta * 8)
    
    // Apply strict upright rotation (X=0, Z=0) so BD-1 stays 100% vertical on floor
    const nextQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), currentYaw.current)
    robotRef.current.setRotation(nextQuat, true)
    robotRef.current.setLinvel(new THREE.Vector3(currentVel.current.x, 0, currentVel.current.z), true)
    
    // Confine robot strictly to apartment floor bounds and fixed floor height (Y=0.35)
    const clampedX = THREE.MathUtils.clamp(pos.x, -3.1, 3.1)
    const clampedZ = THREE.MathUtils.clamp(pos.z, -4.5, 5.15)
    const fixedY = 0.35
    if (Math.abs(pos.x - clampedX) > 0.05 || Math.abs(pos.z - clampedZ) > 0.05 || Math.abs(pos.y - fixedY) > 0.04) {
      robotRef.current.setTranslation({ x: clampedX, y: fixedY, z: clampedZ }, true)
    }

    const movingSpeed = currentVel.current.length()
    isMovingRef.current = movingSpeed > 0.15

    useSimulationStore.getState().setDroneTelemetry({
      altitude: 0.35,
      speed: movingSpeed,
      heading: (THREE.MathUtils.radToDeg(currentYaw.current) % 360 + 360) % 360
    })
    useSimulationStore.getState().setDroneWorldPos([clampedX, fixedY, clampedZ])

    // Optical Object Detection (Sensors analyze field of view ahead without focus light)
    let bestTarget = null
    let minAngle = 0.55
    const robotEyePos = new THREE.Vector3(pos.x, pos.y + 0.22, pos.z)

    for (const obj of SCENE_OBJECTS) {
      const dist = robotEyePos.distanceTo(obj.pos)
      if (dist < 8) {
        const dir = new THREE.Vector3().subVectors(obj.pos, robotEyePos).normalize()
        const dot = dir.dot(robotDirection.current)
        if (dot > minAngle) {
          minAngle = dot
          const isTargetMatch = matchesTarget(obj, targetQuery)
          bestTarget = {
            id: obj.id,
            name: obj.name,
            category: obj.category,
            distance: dist,
            confidence: Math.min(99.4, 88.0 + (dot - 0.55) * 25 + (8 - dist) * 1.2),
            coords: [obj.pos.x, obj.pos.y, obj.pos.z] as [number, number, number],
            isEmergency: isTargetMatch
          }
        }
      }
    }

    const { setActiveScanTarget, addScannedObject } = useSimulationStore.getState()
    setActiveScanTarget(bestTarget)
    if (bestTarget) {
      addScannedObject(bestTarget)
      // If user's designated target object is in sight within 1.8m, confirm search status
      const isMatch = targetObj && bestTarget.id === targetObj.id
      if (isMatch && bestTarget.distance < 1.8) {
        if (searchStatus !== 'FOUND') {
          setSearchStatus('FOUND')
        }
        if (isAutoActive && !targetLocked) {
          setTargetLocked(true)
        }
      }
    }

    if (cameraMode === 'DRONE') {
      // Third-person chase camera strictly positioned BEHIND BD-1's back, looking forward
      const camDist = 1.45
      const camHeight = 0.5
      const idealPosition = new THREE.Vector3(
        pos.x + Math.sin(currentYaw.current) * camDist,
        0.35 + camHeight,
        pos.z + Math.cos(currentYaw.current) * camDist
      )
      const idealLookAt = new THREE.Vector3(
        pos.x - Math.sin(currentYaw.current) * 2.5,
        0.55,
        pos.z - Math.cos(currentYaw.current) * 2.5
      )
      
      currentCameraPosition.current.lerp(idealPosition, delta * 6)
      currentCameraLookAt.current.lerp(idealLookAt, delta * 7)
      
      state.camera.position.copy(currentCameraPosition.current)
      state.camera.lookAt(currentCameraLookAt.current)
    }
  })

  return (
    <RigidBody 
      ref={robotRef} 
      position={[0, 0.35, 3.2]} 
      colliders={false}
      enabledRotations={[false, true, false]}
      type="dynamic"
      gravityScale={0}
      linearDamping={2}
      angularDamping={2}
    >
      {/* Smooth rounded CapsuleCollider: slides cleanly around table legs and obstacles without getting stuck */}
      <CapsuleCollider args={[0.16, 0.14]} position={[0, 0.16, 0]} friction={0.0} restitution={0.0} />
      <BD1Model isMoving={isMovingRef.current} />
    </RigidBody>
  )
}

useGLTF.preload('/bd1.glb')

export const Drone = Robot
