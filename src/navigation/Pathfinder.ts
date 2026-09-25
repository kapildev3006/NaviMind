import { NavigationWaypoint, WAYPOINTS, ALL_WAYPOINTS } from '../config/waypoints'
import { RoomId, getRoomFromPosition } from '../config/rooms'
import { SceneTarget } from '../config/targets'

export interface RoutePlanResult {
  success: boolean
  route: NavigationWaypoint[]
  startRoom: RoomId
  targetRoom: RoomId
  reason?: string
}

/**
 * Calculates Euclidean distance between two 3D points.
 */
export function euclideanDistance(
  a: [number, number, number],
  b: [number, number, number]
): number {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  const dz = a[2] - b[2]
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

/**
 * Deterministic A* Pathfinding across the navigation waypoint graph.
 *
 * Guarantees:
 * - Euclidean distance heuristic (admissible & consistent)
 * - Returns ordered route from start to goal
 * - Handles start === goal gracefully
 * - Returns empty array for unreachable targets
 * - Never mutates global waypoint definitions
 */
export function findAStarPath(
  startWaypointId: string,
  goalWaypointId: string,
  waypointGraph: Record<string, NavigationWaypoint> = WAYPOINTS
): NavigationWaypoint[] {
  const startNode = waypointGraph[startWaypointId]
  const goalNode = waypointGraph[goalWaypointId]

  if (!startNode || !goalNode) {
    return []
  }

  if (startWaypointId === goalWaypointId) {
    return [startNode]
  }

  // Open set priority queue (min-heap or sorted array since N <= 50)
  const openSet = new Set<string>([startWaypointId])
  const cameFrom = new Map<string, string>()

  // Cost from start along best known path
  const gScore = new Map<string, number>()
  gScore.set(startWaypointId, 0)

  // Estimated total cost from start to goal through node
  const fScore = new Map<string, number>()
  fScore.set(startWaypointId, euclideanDistance(startNode.position, goalNode.position))

  while (openSet.size > 0) {
    // Find node in openSet with lowest fScore
    let currentId = ''
    let lowestF = Infinity

    for (const nodeId of openSet) {
      const score = fScore.get(nodeId) ?? Infinity
      if (score < lowestF) {
        lowestF = score
        currentId = nodeId
      }
    }

    if (!currentId) break

    // Reached goal! Reconstruct path
    if (currentId === goalWaypointId) {
      const path: NavigationWaypoint[] = []
      let curr: string | undefined = currentId
      while (curr) {
        const node = waypointGraph[curr]
        if (node) path.unshift(node)
        curr = cameFrom.get(curr)
      }
      return path
    }

    openSet.delete(currentId)
    const currentNode = waypointGraph[currentId]
    if (!currentNode) continue

    const currentG = gScore.get(currentId) ?? Infinity

    for (const neighborId of currentNode.neighbors) {
      const neighborNode = waypointGraph[neighborId]
      if (!neighborNode) continue

      const edgeCost = euclideanDistance(currentNode.position, neighborNode.position)
      const tentativeG = currentG + edgeCost

      if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
        cameFrom.set(neighborId, currentId)
        gScore.set(neighborId, tentativeG)
        const h = euclideanDistance(neighborNode.position, goalNode.position)
        fScore.set(neighborId, tentativeG + h)
        openSet.add(neighborId)
      }
    }
  }

  // Unreachable
  return []
}

/**
 * Finds the nearest waypoint in a specific room to the given position.
 */
export function findNearestWaypointInRoom(
  pos: [number, number, number],
  roomId: RoomId,
  waypointGraph: Record<string, NavigationWaypoint> = WAYPOINTS
): NavigationWaypoint | null {
  let bestWp: NavigationWaypoint | null = null
  let minDistance = Infinity

  for (const wp of Object.values(waypointGraph)) {
    if (wp.roomId === roomId) {
      const dist = euclideanDistance(pos, wp.position)
      if (dist < minDistance) {
        minDistance = dist
        bestWp = wp
      }
    }
  }

  return bestWp
}

/**
 * Finds the absolute nearest waypoint regardless of room.
 */
export function findNearestWaypoint(
  pos: [number, number, number],
  waypointGraph: Record<string, NavigationWaypoint> = WAYPOINTS
): NavigationWaypoint | null {
  let bestWp: NavigationWaypoint | null = null
  let minDistance = Infinity

  for (const wp of Object.values(waypointGraph)) {
    const dist = euclideanDistance(pos, wp.position)
    if (dist < minDistance) {
      minDistance = dist
      bestWp = wp
    }
  }

  return bestWp
}

/**
 * High-level path planner:
 * Maps current robot position to start room, finds topological waypoint route to target room,
 * and constructs the full collision-safe route.
 */
export function planNavigationRoute(
  robotPosition: [number, number, number],
  target: SceneTarget,
  waypointGraph: Record<string, NavigationWaypoint> = WAYPOINTS
): RoutePlanResult {
  const currentRoom = getRoomFromPosition(robotPosition)
  const targetRoom = target.roomId

  // Verify target approach waypoint exists in graph
  const goalWaypoint = waypointGraph[target.approachWaypointId]
  if (!goalWaypoint) {
    return {
      success: false,
      route: [],
      startRoom: currentRoom,
      targetRoom,
      reason: `Target approach waypoint '${target.approachWaypointId}' not found in waypoint registry`
    }
  }

  // Scenario A: Robot is already in the same room as the target
  if (currentRoom === targetRoom) {
    // If already very close to the goal waypoint, return direct to goal
    const distToGoalWp = euclideanDistance(robotPosition, goalWaypoint.position)
    if (distToGoalWp < 1.0) {
      return {
        success: true,
        route: [goalWaypoint],
        startRoom: currentRoom,
        targetRoom
      }
    }

    // Otherwise find nearest waypoint in the room to safely navigate local room space
    const roomWp = findNearestWaypointInRoom(robotPosition, currentRoom, waypointGraph)
    if (roomWp && roomWp.id !== goalWaypoint.id) {
      const internalPath = findAStarPath(roomWp.id, goalWaypoint.id, waypointGraph)
      if (internalPath.length > 0) {
        return {
          success: true,
          route: internalPath,
          startRoom: currentRoom,
          targetRoom
        }
      }
    }

    return {
      success: true,
      route: [goalWaypoint],
      startRoom: currentRoom,
      targetRoom
    }
  }

  // Scenario B: Multi-Room Navigation
  // 1. Find entry/start waypoint in current room closest to BD-1
  const startWaypoint = findNearestWaypointInRoom(robotPosition, currentRoom, waypointGraph) 
    || findNearestWaypoint(robotPosition, waypointGraph)

  if (!startWaypoint) {
    return {
      success: false,
      route: [],
      startRoom: currentRoom,
      targetRoom,
      reason: `No valid entry waypoint located in starting room '${currentRoom}'`
    }
  }

  // 2. Run A* from start waypoint to goal approach waypoint
  const route = findAStarPath(startWaypoint.id, goalWaypoint.id, waypointGraph)

  if (route.length === 0) {
    return {
      success: false,
      route: [],
      startRoom: currentRoom,
      targetRoom,
      reason: `No traversable topological route found between '${startWaypoint.id}' and '${goalWaypoint.id}'`
    }
  }

  return {
    success: true,
    route,
    startRoom: currentRoom,
    targetRoom
  }
}
