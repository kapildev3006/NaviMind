'use client'

import React, { useRef, useMemo, useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import { RigidBody, RapierRigidBody, CapsuleCollider, RapierCollider, useRapier } from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useRobotControls } from '@/hooks/useRobotControls'
import { useSimulationStore, ScannedObjectInfo, NavigationStatus } from '@/store/useSimulationStore'
import { getRoomFromPosition, RoomId } from '@/config/rooms'
import { NavigationWaypoint, WAYPOINTS } from '@/config/waypoints'
import { TARGETS, SceneTarget, matchesTarget } from '@/config/targets'
import { planNavigationRoute } from '@/navigation/Pathfinder'
import { MissionController } from '@/missions/MissionController'

// Backwards-compatible export for existing components
export const SCENE_OBJECTS = TARGETS.map((t) => ({
  ...t,
  pos: new THREE.Vector3(...t.position)
}))
export { matchesTarget }

// Movement & physical configuration constants
const WALK_SPEED = 2.4       // m/s (natural explorer pace)
const SPRINT_SPEED = 4.2     // m/s (clean sprint boost)
const TURN_SPEED = 2.8       // rad/s (smooth yaw steering)

// Collider dimensions: calibrated so BD-1 easily clears dining and coffee table aprons (~0.68m)
const COLLIDER_RADIUS = 0.11        // 0.22m diameter (BD-1 width ~0.17m)
const COLLIDER_HALF_HEIGHT = 0.13   // 0.48m total capsule height
const COLLIDER_CENTER_Y = 0.24      // Half of total collider height (0.13 + 0.11) above floor
const COLLIDER_MIN_Y = 0.20         // Ground safety clamp (prevents falling below floor slab)
const MODEL_SCALE = 0.006           // ~51cm height (canon Star Wars BD-1 scale)

// Character controller physics parameters
const GRAVITY_PROBE = -2.5          // Gentle downward gravity probe for stable floor contact
const SNAP_TO_GROUND = 0.08         // 8cm snap-to-ground threshold
const AUTOSTEP_MAX_HEIGHT = 0.05    // 5cm max step for floor/carpet transitions (avoids climbing furniture)
const AUTOSTEP_MIN_WIDTH = 0.05

// Outer boundaries of the apartment model (fallback safety envelope only)
const APARTMENT_BOUNDS = {
  minX: -6.90,
  maxX: 0.35,
  minZ: -6.40,
  maxZ: 4.50
}

// BD-1 Robot Visual Model with procedural walking gait animation
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
      const walkBob = Math.abs(Math.sin(time * 12)) * 0.010
      const walkRoll = Math.sin(time * 6) * 0.02
      const walkPitch = -0.04 // Forward walking lean

      modelGroupRef.current.position.y = -COLLIDER_CENTER_Y + walkBob
      modelGroupRef.current.rotation.z = walkRoll
      modelGroupRef.current.rotation.x = walkPitch
    } else {
      const idleBob = Math.sin(time * 2) * 0.002
      modelGroupRef.current.position.y = -COLLIDER_CENTER_Y + idleBob
      modelGroupRef.current.rotation.z = 0
      modelGroupRef.current.rotation.x = 0
    }
  })

  return (
    <group ref={modelGroupRef} position={[0, -COLLIDER_CENTER_Y, 0]} rotation={[0, 0, 0]} scale={MODEL_SCALE}>
      <primitive object={scene} />
    </group>
  )
}

export const Robot = () => {
  const robotRef = useRef<RapierRigidBody>(null)
  const colliderRef = useRef<RapierCollider>(null)
  const keysRef = useRobotControls()
  const { rapier, world } = useRapier()

  // Rapier Kinematic Character Controller instance
  const characterControllerRef = useRef<ReturnType<typeof world.createCharacterController> | null>(null)

  if (typeof window !== 'undefined') {
    ;(window as any).__rapierWorld = world
    ;(window as any).__rapier = rapier
  }

  useEffect(() => {
    const controller = world.createCharacterController(0.01)
    controller.setSlideEnabled(true)
    controller.setUp({ x: 0, y: 1, z: 0 })
    controller.enableSnapToGround(SNAP_TO_GROUND)
    controller.enableAutostep(AUTOSTEP_MAX_HEIGHT, AUTOSTEP_MIN_WIDTH, false)
    characterControllerRef.current = controller

    return () => {
      world.removeCharacterController(controller)
      characterControllerRef.current = null
    }
  }, [world])

  const robotDirection = useRef(new THREE.Vector3(0, 0, -1))
  const rightDirection = useRef(new THREE.Vector3(1, 0, 0))

  // Explicit Yaw angle tracking (0 = facing forward towards -Z)
  const currentYaw = useRef(0)

  // Phase 2 Autonomous Waypoint Navigation State
  const activeRouteRef = useRef<NavigationWaypoint[]>([])
  const currentWaypointIdxRef = useRef<number>(0)
  const navStatusRef = useRef<NavigationStatus>('IDLE')
  const lastTargetQueryRef = useRef<string>('')
  const lastRoomRef = useRef<RoomId | null>(null)

  // Stuck detection & recovery tracking
  const stuckTimerRef = useRef<number>(0)
  const stuckCounterRef = useRef<number>(0)
  const lastProgressPosRef = useRef<THREE.Vector3>(new THREE.Vector3(-0.50, 0.24, 2.70))

  // Local obstacle avoidance hysteresis & bias
  const avoidanceBiasRef = useRef<number>(0)
  const avoidanceTimerRef = useRef<number>(0)

  const isMovingRef = useRef(false)

  useFrame((state, delta) => {
    if (!robotRef.current) return

    const { forward, backward, left, right, strafeLeft, strafeRight, sprint } = keysRef.current
    const {
      introActive,
      setIntroActive,
      autoScan,
      setAutoScan,
      targetLocked,
      setTargetLocked,
      isPickingUp,
      setRobotWorldPos,
      setRobotYaw,
      setRobotTelemetry,
      targetQuery,
      searchStatus,
      setSearchStatus,
      searchMode,
      setSearchMode,
      replanRequested,
      clearReplanRequest,
      setNavigationStatus,
      setCurrentRoom,
      setActiveRoute,
      setCurrentWaypointIndex,
      requestReplan
    } = useSimulationStore.getState()

    // 1. Seamless Manual Takeover: pressing ANY manual key immediately cancels AUTO mode and clears route
    const anyManualKey = forward || backward || left || right || strafeLeft || strafeRight || sprint
    if (anyManualKey) {
      if (introActive) setIntroActive(false)
      if (autoScan) setAutoScan(false)
      if (targetLocked) setTargetLocked(false)
      if (searchMode !== 'MANUAL') setSearchMode('MANUAL')
      if (navStatusRef.current !== 'IDLE') {
        navStatusRef.current = 'IDLE'
        setNavigationStatus('IDLE')
        activeRouteRef.current = []
        setActiveRoute([])
      }
      avoidanceBiasRef.current = 0
      avoidanceTimerRef.current = 0
      stuckCounterRef.current = 0
      MissionController.getInstance().handleManualTakeover()
    }

    const pos = robotRef.current.translation()

    // 2. Track current room (throttled check on room boundary crossing)
    const currentRoom = getRoomFromPosition(pos)
    if (currentRoom !== lastRoomRef.current) {
      lastRoomRef.current = currentRoom
      setCurrentRoom(currentRoom)
    }

    // 3. Compute facing directions from current yaw angle
    robotDirection.current.set(-Math.sin(currentYaw.current), 0, -Math.cos(currentYaw.current)).normalize()
    rightDirection.current.set(Math.cos(currentYaw.current), 0, -Math.sin(currentYaw.current)).normalize()

    let targetVelocity = new THREE.Vector3(0, 0, 0)
    let targetYawDelta = 0

    const isAutoActive = !anyManualKey && (introActive || autoScan)

    // Identify matching physical target from active search query
    const targetObj = TARGETS.find((t) => matchesTarget(t, targetQuery))

    if (isAutoActive) {
      if (isPickingUp) {
        targetVelocity.set(0, 0, 0)
        targetYawDelta = 0.4
      } else if (targetLocked) {
        targetVelocity.set(0, 0, 0)
        targetYawDelta = 0
        if (navStatusRef.current !== 'ARRIVED') {
          navStatusRef.current = 'ARRIVED'
          setNavigationStatus('ARRIVED')
        }
        const activeMission = useSimulationStore.getState().activeMission
        if (activeMission && (activeMission.state === 'NAVIGATING' || activeMission.state === 'PLANNING')) {
          const dist = targetObj
            ? Math.hypot(targetObj.position[0] - pos.x, targetObj.position[2] - pos.z)
            : 0.8
          MissionController.getInstance().handleTargetArrival(activeMission.id, dist)
        }
      } else {
        // Check if replanning is needed (target query changed, user requested replan, or route is uninitialized)
        const targetChanged = targetQuery !== lastTargetQueryRef.current
        if (targetChanged) {
          lastTargetQueryRef.current = targetQuery
        }

        const needsPlan = replanRequested || targetChanged || (activeRouteRef.current.length === 0 && !targetLocked)

        if (needsPlan) {
          clearReplanRequest()
          if (targetObj) {
            navStatusRef.current = 'PLANNING'
            setNavigationStatus('PLANNING')

            const plan = planNavigationRoute([pos.x, pos.y, pos.z], targetObj)
            if (plan.success && plan.route.length > 0) {
              activeRouteRef.current = plan.route
              currentWaypointIdxRef.current = 0
              setActiveRoute(plan.route)
              setCurrentWaypointIndex(0)
              navStatusRef.current = 'FOLLOWING_PATH'
              setNavigationStatus('FOLLOWING_PATH')
            } else {
              activeRouteRef.current = []
              setActiveRoute([])
              navStatusRef.current = 'FAILED'
              setNavigationStatus('FAILED')
              MissionController.getInstance().handleNavigationFailure(plan.reason || 'No valid route')
            }
          }
        }

        // Autonomous Waypoint Follower
        const route = activeRouteRef.current
        if (route.length > 0 && currentWaypointIdxRef.current < route.length) {
          // Advance past any intermediate waypoints already reached (within 0.32m)
          while (currentWaypointIdxRef.current < route.length - 1) {
            const wp = route[currentWaypointIdxRef.current]
            const d = Math.hypot(wp.position[0] - pos.x, wp.position[2] - pos.z)
            if (d <= 0.32) {
              currentWaypointIdxRef.current++
              setCurrentWaypointIndex(currentWaypointIdxRef.current)
            } else {
              break
            }
          }

          const currentWp = route[currentWaypointIdxRef.current]
          const isFinalWaypoint = currentWaypointIdxRef.current === route.length - 1

          // Vector from robot to waypoint
          const toWp = new THREE.Vector3(currentWp.position[0] - pos.x, 0, currentWp.position[2] - pos.z)
          const distToWp = toWp.length()

          // Calibrated arrival thresholds:
          // Intermediate nodes: 0.32m
          // Final approach node: target approach distance (or 0.35m minimum)
          const arrivalThreshold = isFinalWaypoint
            ? Math.max(0.35, targetObj ? targetObj.approachDistance * 0.75 : 0.4)
            : 0.32

          if (isFinalWaypoint && distToWp <= arrivalThreshold) {
            // Reached final target approach point!
            navStatusRef.current = 'ARRIVED'
            setNavigationStatus('ARRIVED')
            setTargetLocked(true)
            setSearchStatus('FOUND')
            targetVelocity.set(0, 0, 0)
            const activeMission = useSimulationStore.getState().activeMission
            if (activeMission && (activeMission.state === 'NAVIGATING' || activeMission.state === 'PLANNING')) {
              MissionController.getInstance().handleTargetArrival(activeMission.id, distToWp)
            }
          } else {
            // Traverse towards current waypoint
            const moveDir = toWp.clone().normalize()

            // Local Obstacle Avoidance (Raycast sensing)
            // Doorway safeguard: suppress obstacle avoidance near doorways or final target stop
            const isNearDoorway = currentWp.type === 'DOORWAY' || currentWp.type === 'TRANSITION' || distToWp < 0.60
            const isFinalApproach = isFinalWaypoint && distToWp < (targetObj?.approachDistance ?? 0.8) + 0.35

            if (!isNearDoorway && !isFinalApproach) {
              // Cast 3 rays from front of robot at knee/torso height (Y + 0.1)
              // Use EXCLUDE_KINEMATIC flag (2) so the ray never hits BD-1 itself
              const rayOrigin = {
                x: pos.x + robotDirection.current.x * 0.18,
                y: pos.y + 0.1,
                z: pos.z + robotDirection.current.z * 0.18
              }

              // Center forward ray
              const centerRay = new rapier.Ray(rayOrigin, {
                x: robotDirection.current.x,
                y: 0,
                z: robotDirection.current.z
              })
              const centerHit = world.castRay(centerRay, 0.45, true, 2)

              if (centerHit && centerHit.timeOfImpact < 0.40) {
                // Center blocked! Test side rays for clearance
                const leftAngle = currentYaw.current + 0.45
                const leftDir = { x: -Math.sin(leftAngle), y: 0, z: -Math.cos(leftAngle) }
                const leftRay = new rapier.Ray(rayOrigin, leftDir)
                const leftHit = world.castRay(leftRay, 0.38, true, 2)

                const rightAngle = currentYaw.current - 0.45
                const rightDir = { x: -Math.sin(rightAngle), y: 0, z: -Math.cos(rightAngle) }
                const rightRay = new rapier.Ray(rayOrigin, rightDir)
                const rightHit = world.castRay(rightRay, 0.38, true, 2)

                const leftClear = !leftHit || leftHit.timeOfImpact > 0.35
                const rightClear = !rightHit || rightHit.timeOfImpact > 0.35

                if (rightClear && !leftClear) {
                  avoidanceBiasRef.current = -1.2 // Steer right
                  avoidanceTimerRef.current = 0.35
                } else if (leftClear && !rightClear) {
                  avoidanceBiasRef.current = 1.2 // Steer left
                  avoidanceTimerRef.current = 0.35
                } else if (rightClear && leftClear) {
                  avoidanceBiasRef.current = -1.0
                  avoidanceTimerRef.current = 0.35
                } else {
                  // Completely blocked locally
                  navStatusRef.current = 'AVOIDING_OBSTACLE'
                }
              }
            }

            // Decay avoidance hysteresis timer
            if (avoidanceTimerRef.current > 0) {
              avoidanceTimerRef.current -= delta
              if (avoidanceTimerRef.current <= 0) {
                avoidanceBiasRef.current = 0
              }
            }

            targetVelocity.copy(moveDir.multiplyScalar(WALK_SPEED))

            // Smooth Yaw Steering towards waypoint with shortest-angle wraparound
            const targetHeading = Math.atan2(-moveDir.x, -moveDir.z)
            let angleDiff = targetHeading - currentYaw.current
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2

            const blendedSteer = angleDiff * 3.2 + avoidanceBiasRef.current
            targetYawDelta = THREE.MathUtils.clamp(blendedSteer, -TURN_SPEED, TURN_SPEED)
          }
        }

        // Stuck Progress Monitor: check movement every 1.2s
        stuckTimerRef.current += delta
        if (stuckTimerRef.current >= 1.2) {
          stuckTimerRef.current = 0
          if (isAutoActive && navStatusRef.current === 'FOLLOWING_PATH') {
            const distMoved = lastProgressPosRef.current.distanceTo(new THREE.Vector3(pos.x, pos.y, pos.z))
            if (distMoved < 0.08) {
              stuckCounterRef.current++
              if (stuckCounterRef.current >= 2) {
                navStatusRef.current = 'STUCK'
                setNavigationStatus('STUCK')
                requestReplan()
                stuckCounterRef.current = 0
              }
            } else {
              stuckCounterRef.current = 0
            }
            lastProgressPosRef.current.set(pos.x, pos.y, pos.z)
          }
        }
      }
    } else {
      // Manual Floor Movement
      const moveIntent = new THREE.Vector3(0, 0, 0)
      if (forward) moveIntent.add(robotDirection.current)
      if (backward) moveIntent.sub(robotDirection.current)
      if (strafeLeft) moveIntent.sub(rightDirection.current)
      if (strafeRight) moveIntent.add(rightDirection.current)

      if (moveIntent.lengthSq() > 0.001) {
        moveIntent.normalize()
        const speed = sprint ? SPRINT_SPEED : WALK_SPEED
        targetVelocity.copy(moveIntent.multiplyScalar(speed))
      }

      // Smooth turning with A / D
      if (left) targetYawDelta += TURN_SPEED
      if (right) targetYawDelta -= TURN_SPEED
    }

    // 4. Update yaw angle smoothly via delta time
    currentYaw.current += targetYawDelta * delta

    // 5. Compute collider movement using Kinematic Character Controller
    const collider = colliderRef.current || robotRef.current.collider(0)
    let nextX = pos.x
    let nextY = pos.y
    let nextZ = pos.z

    if (collider && characterControllerRef.current) {
      const desiredDelta = {
        x: targetVelocity.x * delta,
        y: GRAVITY_PROBE * delta, // gentle downward probe for floor contact
        z: targetVelocity.z * delta
      }

      characterControllerRef.current.computeColliderMovement(collider, desiredDelta)
      const computed = characterControllerRef.current.computedMovement()

      nextX = pos.x + computed.x
      nextY = pos.y + computed.y
      nextZ = pos.z + computed.z

      // Floor contact safety clamp: BD-1 floor level is Y=0, collider center minimum is 0.18m.
      nextY = Math.max(COLLIDER_MIN_Y, nextY)

      // Outer safety boundary fallback
      nextX = THREE.MathUtils.clamp(nextX, APARTMENT_BOUNDS.minX, APARTMENT_BOUNDS.maxX)
      nextZ = THREE.MathUtils.clamp(nextZ, APARTMENT_BOUNDS.minZ, APARTMENT_BOUNDS.maxZ)

      robotRef.current.setNextKinematicTranslation({ x: nextX, y: nextY, z: nextZ })
    }

    // 6. Set kinematic upright rotation
    const nextQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), currentYaw.current)
    robotRef.current.setNextKinematicRotation(nextQuat)

    const movingSpeed = targetVelocity.length()
    isMovingRef.current = movingSpeed > 0.15

    // Expose runtime debug states for verification
    if (typeof window !== 'undefined') {
      ;(window as any).__robotDebug = {
        keys: { ...keysRef.current },
        hasCollider: !!collider,
        hasController: !!characterControllerRef.current,
        targetVelocity: { x: targetVelocity.x, y: targetVelocity.y, z: targetVelocity.z },
        computed: characterControllerRef.current ? characterControllerRef.current.computedMovement() : null,
        pos: { x: pos.x, y: pos.y, z: pos.z },
        yaw: currentYaw.current,
        headingDeg: ((THREE.MathUtils.radToDeg(currentYaw.current) % 360) + 360) % 360
      }
      ;(window as any).__navDebug = {
        currentRoom,
        navStatus: navStatusRef.current,
        routeLength: activeRouteRef.current.length,
        waypointIdx: currentWaypointIdxRef.current,
        targetObj: targetObj?.name || null,
        targetLocked,
        pos: { x: pos.x, y: pos.y, z: pos.z }
      }
      ;(window as any).__missionController = MissionController.getInstance()
      ;(window as any).__missionDebug = {
        activeMission: useSimulationStore.getState().activeMission,
        missionHistory: useSimulationStore.getState().missionHistory,
        missionLog: useSimulationStore.getState().missionLog
      }
    }

    // 7. Update telemetry & position in Zustand store
    setRobotTelemetry({
      altitude: Math.max(0, nextY - COLLIDER_CENTER_Y),
      speed: movingSpeed,
      heading: ((THREE.MathUtils.radToDeg(currentYaw.current) % 360) + 360) % 360
    })
    setRobotWorldPos([nextX, nextY, nextZ])
    setRobotYaw(currentYaw.current)

    // 8. Optical Object Detection (Sensors analyze field of view ahead)
    let bestTarget: ScannedObjectInfo | null = null
    let bestScore = -999
    const robotEyePos = new THREE.Vector3(nextX, nextY + 0.18, nextZ)
    const activeTargetId = targetObj?.id || useSimulationStore.getState().navigationTargetId || useSimulationStore.getState().activeMission?.targetId

    for (const obj of TARGETS) {
      const targetPos = new THREE.Vector3(...obj.position)
      const dist = robotEyePos.distanceTo(targetPos)
      const horizDist = Math.hypot(targetPos.x - robotEyePos.x, targetPos.z - robotEyePos.z)

      if (dist < 8) {
        const horizDir = new THREE.Vector3(targetPos.x - robotEyePos.x, 0, targetPos.z - robotEyePos.z)
        const hasHoriz = horizDist > 0.05
        if (hasHoriz) horizDir.normalize()
        const horizDot = hasHoriz ? horizDir.dot(robotDirection.current) : 1.0

        const isElevated = Math.abs(targetPos.y - robotEyePos.y) > 0.6
        const isClose = horizDist < 1.5
        const isActivelySought = obj.id === activeTargetId || matchesTarget(obj, targetQuery)

        // FOV gate: standard 0.50 dot (~60 deg cone), or wider (0.15 dot) if elevated or close or actively sought
        const minDot = isElevated || isClose || isActivelySought ? 0.15 : 0.50

        if (horizDot > minDot || horizDist < 0.6) {
          // Score prioritizing actively sought target, closeness, and visual alignment
          let score = (1.0 - Math.min(1.0, dist / 8.0)) * 2.0 + Math.max(0, horizDot) * 2.0
          if (isActivelySought) score += 10.0

          if (score > bestScore) {
            bestScore = score
            const isTargetMatch = matchesTarget(obj, targetQuery)
            bestTarget = {
              id: obj.id,
              name: obj.name,
              category: obj.category,
              distance: dist,
              confidence: Math.min(99.4, 88.0 + (Math.max(0, horizDot) - 0.5) * 20 + Math.max(0, 8 - dist) * 1.2),
              coords: [targetPos.x, targetPos.y, targetPos.z],
              isEmergency: isTargetMatch
            }
          }
        }
      }
    }

    const { setActiveScanTarget, addScannedObject } = useSimulationStore.getState()
    setActiveScanTarget(bestTarget)
    if (bestTarget) {
      addScannedObject(bestTarget)
      const isMatch = targetObj && bestTarget.id === targetObj.id
      if (isMatch && bestTarget.distance < (targetObj.approachDistance ?? 0.8) + 0.5) {
        if (searchStatus !== 'FOUND') {
          setSearchStatus('FOUND')
        }
        if (isAutoActive && !targetLocked) {
          setTargetLocked(true)
          const activeMission = useSimulationStore.getState().activeMission
          if (activeMission && (activeMission.state === 'NAVIGATING' || activeMission.state === 'PLANNING')) {
            MissionController.getInstance().handleTargetArrival(activeMission.id, bestTarget.distance)
          }
        }
      }
    }
  })

  return (
    <RigidBody
      ref={robotRef}
      position={[-0.50, COLLIDER_CENTER_Y, 2.70]}
      colliders={false}
      type="kinematicPosition"
    >
      {/* Physical capsule collider: calibrated to enclose BD-1 and pass under standard tables without catching */}
      <CapsuleCollider
        ref={colliderRef}
        args={[COLLIDER_HALF_HEIGHT, COLLIDER_RADIUS]}
        position={[0, 0, 0]}
        friction={0.0}
        restitution={0.0}
      />
      <BD1Model isMoving={isMovingRef.current} />
    </RigidBody>
  )
}

useGLTF.preload('/bd1.glb')

export const Drone = Robot
