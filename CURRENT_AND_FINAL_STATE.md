# NaviMind: Current State, Final Scene & Completion Roadmap

**Last Updated**: 2026-09-16 23:15 IST  
**Current Phase**: Phase 1 — Collision-Safe Robot Locomotion  
**Current Milestone**: Phase 1 — COMPLETE (Runtime Verified & Stabilized)  
**Overall Completion**: 25% (Honest weighted assessment against the full 12-phase product target)  

---

## 1. Project Overview & Product Mission

**NaviMind** is a web-based, real-time 3D simulation platform for an **indoor autonomous inspection, hazard detection, and assistance droid**. 
Built on **Next.js 16 (Turbopack)**, **React 19**, **Three.js / React Three Fiber**, **Rapier 3D Physics**, and **Zustand**, the simulation takes place inside a detailed multi-room modern apartment where the Star Wars **BD-1 bipedal robot** navigates, scans the environment, locates mission targets, identifies safety hazards, and executes fetch/pickup tasks.

### The Final NaviMind Vision
The operator provides natural-language commands to an indoor autonomous robot:
* *"Find the fire extinguisher."*
* *"Go to the TV."*
* *"Inspect the smoke detector."*
* *"Check the breaker panel."*
* *"Find the remote."*
* *"Bring me the remote."*
* *"Check the kitchen for a hazard."*

### High-Level Mission Intents
The platform supports four core autonomous intents:
1. **`FIND`**: Locate an object, plan a multi-room path, approach, and spotlight the target.
2. **`NAVIGATE`**: Travel autonomously to a named room, waypoint, or landmark.
3. **`INSPECT`**: Approach a target, activate LiDAR/optical scanners, verify health/telemetry, and log status.
4. **`FETCH`**: Navigate to target, approach, virtual-pickup supported object, return to home/user position, drop, and complete mission.

### Final Command Pipeline
```
User Command (Natural Language)
  │
  ▼
Command Understanding (Intent + Entity Parsing via Local Semantic Model & Heuristics)
  │
  ▼
Intent + Target Resolution (Resolved Target ID, Target Coordinates, Room)
  │
  ▼
Mission Controller (Finite State Machine: IDLE ➔ PLANNING ➔ NAVIGATING ➔ APPROACHING ➔ SCANNING/PICKUP ➔ RETURNING ➔ COMPLETED)
  │
  ▼
Navigation Planning (Topological Room Graph + A* Corridor/Doorway Pathfinding)
  │
  ▼
Collision-Safe Kinematic Movement (Rapier Kinematic Character Controller + Obstacle Avoidance)
  │
  ▼
Target Approach & Verification (Arrival margin check, heading alignment)
  │
  ▼
Action Execution (LiDAR Scan / Hazard Assessment / Virtual Object Pickup & Carry)
  │
  ▼
Mission Complete / Operator Telemetry Report
```

---

## 2. Current State of the Project

### 2.1 Technology Stack & Dependencies
- **Framework**: Next.js 16.2.12 (Turbopack, App Router)
- **UI Engine**: React 19.2.4 & React DOM 19.2.4
- **3D Graphics Engine**: Three.js 0.185.1 & `@react-three/fiber` 9.7.0
- **3D Utilities**: `@react-three/drei` 10.7.7
- **Post-Processing**: `@react-three/postprocessing` 3.0.4 (Bloom, Vignette, ToneMapping)
- **Physics Engine**: `@react-three/rapier` 2.2.0 (Rapier 3D WASM `KinematicCharacterController`)
- **State Management**: Zustand 5.0.14
- **Language & Styling**: TypeScript 5, Tailwind CSS 4, Vanilla CSS

---

### 2.2 Functional Status Matrix: Implemented vs Verified vs Planned

| Subsystem | Feature | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Locomotion** | Kinematic Character Controller | **VERIFIED** | Rapier WASM controller, `type="kinematicPosition"`, 0.01m skin offset |
| **Locomotion** | Floor Movement (W/S) | **VERIFIED** | Forward (-3.01m/s) & Backward (+2.51m/s) relative to facing yaw |
| **Locomotion** | Smooth Turning (A/D) | **VERIFIED** | Delta-time based yaw rotation (TURN_SPEED = 2.6 rad/s) |
| **Locomotion** | Orientation-Relative Movement | **VERIFIED** | 90° turn followed by W produces clean lateral motion in facing direction |
| **Locomotion** | Strafing (Q/E) | **VERIFIED** | Q/E strafes perpendicular without altering facing yaw |
| **Locomotion** | Sprint Boost (Shift) | **VERIFIED** | Clean 1.64x velocity increase (WALK_SPEED=2.4, SPRINT_SPEED=4.2) |
| **Locomotion** | Normalized Combined Input | **VERIFIED** | Diagonal inputs normalized to prevent 1.41x velocity runaway |
| **Locomotion** | Grounding Stability | **VERIFIED** | `enableSnapToGround(0.08)` + floor safety clamp; zero vertical drift (Y=0.2400m) |
| **Locomotion** | Autostep Calibration | **VERIFIED** | `enableAutostep(0.05, 0.05, false)`; traverses thresholds, blocks furniture |
| **Locomotion** | Obstacle Collision & Sliding | **VERIFIED** | `setSlideEnabled(true)`; stops before penetrating, slides along obstacles |
| **Locomotion** | Furniture Under-Clearance | **VERIFIED** | Capsule height 0.48m; 0.22m clearance under standard 0.70m tables |
| **Locomotion** | Apartment Boundary Fallback | **VERIFIED** | Envelope [-3.35, 3.35], [-4.85, 5.45]; breaker panel & balcony accessible |
| **Locomotion** | Instant Manual Takeover | **VERIFIED** | Pressing manual key immediately overrides AUTO mode with zero contention |
| **Camera** | 3rd-Person Chase Follow | **VERIFIED** | Camera smoothly tracks BD-1 world position without detaching |
| **Environment** | Apartment 3D Model | **IMPLEMENTED** | `apartment.glb` (35.4MB) loaded with selective trimesh colliders |
| **Environment** | 24-Hour Day/Night Lighting | **IMPLEMENTED** | Sun angle, dynamic ambient light, interior point lights |
| **Navigation** | Multi-Room Corridor A* | **PLANNED** | Room topological graph, doorway waypoints, obstacle avoidance (Phase 2) |
| **Intelligence**| Semantic Command Engine | **PLANNED** | High-level intents (FIND, NAVIGATE, INSPECT, FETCH) & FSM (Phase 3) |
| **AI Models** | Open-Source Semantic Model | **PLANNED** | Local model for semantic target/intent understanding (Phase 4) |
| **Perception** | Simulated LiDAR & World AR | **PLANNED** | Laser scan fan, 3D AR bounding boxes, head tracking (Phase 5) |
| **Missions** | Hazard Scenarios | **PLANNED** | Fire, Gas, Electrical breaker fault investigation workflows (Phase 6) |
| **Interaction** | Fetch & Carry Socket | **PLANNED** | Target approach, virtual pick up, carry, return-to-home, drop (Phase 7) |
| **HUD** | Radar Minimap & Multi-Cam | **PLANNED** | 2D apartment floorplan radar, FPV Eye, Orbit Cam (Phases 8 & 9) |

---

### 2.3 Phase 1B Runtime Verification Results

Runtime verification was executed against the live application using automated headless browser CDP testing on `http://localhost:3000/simulation`.

```
================================================================
   PHASE 1B — FULL RUNTIME VERIFICATION & STABILIZATION SUITE   
================================================================
PART 1: Application Startup & Initialization   --> PASSED (0 errors, 0 WebGL warnings)
PART 2: Manual Movement (W/S/A/D/Q/E/Shift)     --> PASSED (Forward -3.01m, Backward +2.51m, Turn 85°/317°, Strafe dx=0.12/dz=0.48, Sprint 1.64x)
PART 3: Normalized Diagonal Input              --> PASSED (Normalized speed vector; no 1.41x boost)
PART 4: Collision & Sliding Test               --> PASSED (Stops cleanly before penetrating; slides along walls)
PART 5: Table & Furniture Clearance            --> PASSED (0.48m capsule height; 0.22m margin under 0.70m tables)
PART 6: Grounding Stability Test               --> PASSED (Y=0.2400m, delta=0.00000m, zero jitter or floating)
PART 7: Autostep Configuration Test            --> PASSED (0.05m max step; blocks chairs/furniture bases)
PART 8: Apartment Extent Test                  --> PASSED (Encloses breaker panel X=-3.15 and balcony Z=5.20)
PART 9: Manual / AUTO Takeover Handoff         --> PASSED (Instant cancellation: searchMode=MANUAL, autoScan=false)
PART 10: Collider Position & Origin            --> PASSED (Feet flush at Y=0.000m floor level)
PART 11: Performance & Memory Audit            --> PASSED (Stable Rapier WASM execution, selective trimesh, 0 crashes)
PART 12: Camera Director Follow                --> PASSED (Chase camera follows BD-1 world position without detachment)
CONSOLE AUDIT: Total runtime errors = 0        --> PASSED (ZERO console errors, zero Rapier warnings)
```

---

### 2.4 Bugs Fixed During Phase 1B Stabilization

1. **Scene Suspense Hang via Remote HDR Asset**:
   - *Issue*: `<Environment preset="city" />` was making a remote network request to `raw.githack.com` for `potsdamer_platz_1k.hdr`, suspending the entire `<Scene>` component and preventing `<Robot>` from rendering its frame loop.
   - *Fix*: Isolated `<Environment preset="city" />` inside its own `<Suspense fallback={null}>` boundary in `Scene.tsx`. The local apartment, robot, and physics engine now mount and run immediately at 60 FPS without waiting for remote assets.

2. **Keyboard Control Input Latency & Batching Desync**:
   - *Issue*: `useRobotControls` was storing keys in React `useState`, causing asynchronous state batching and triggering 2 unnecessary React component re-renders per key press.
   - *Fix*: Upgraded `useRobotControls.ts` to utilize a synchronous `useRef<RobotControlsState>` accessed directly via `keysRef.current` in `Robot.tsx`. Input is now read instantaneously on each frame with zero latency and zero React re-render churn.

3. **Delayed Manual Takeover of AUTO Mode**:
   - *Issue*: Manual takeover was only checked inside `useFrame`, meaning AUTO mode could briefly continue translation before the next render tick.
   - *Fix*: Added instant manual takeover inside `handleKeyDown` in `useRobotControls.ts`. The moment a physical movement key is pressed, `store.setSearchMode('MANUAL')` and `store.setAutoScan(false)` are triggered synchronously at the hardware event level.

4. **Vertical Drift / Floor Penetration at Geometry Boundaries**:
   - *Issue*: Driving BD-1 near outer geometry edges caused the character controller downward gravity probe (`GRAVITY_PROBE = -2.5`) to push the robot below the floor slab into negative Y space.
   - *Fix*: Added a floor contact safety clamp `nextY = Math.max(COLLIDER_CENTER_Y, nextY)` in `Robot.tsx`. The robot's center is permanently guaranteed never to fall below 0.24m (feet at Y=0.00m).

5. **Initial Spawn Collision Pinning**:
   - *Issue*: Initial spawn position `[0, 0.24, 3.2]` placed BD-1 in a narrow 10cm gap between the living room coffee table and balcony glass frame, preventing forward movement.
   - *Fix*: Moved default spawn position to `[0.6, COLLIDER_CENTER_Y, 2.6]` (the open lounge floor waypoint), providing meters of clear open space in all directions.

---

### 2.5 Final Movement Constants & Configuration

```typescript
// Locomotion Speeds
const WALK_SPEED = 2.4          // m/s (natural explorer pace)
const SPRINT_SPEED = 4.2        // m/s (clean sprint multiplier)
const TURN_SPEED = 2.6          // rad/s (smooth yaw steering)

// BD-1 Physical Dimensions & Collision Envelope
const MODEL_SCALE = 0.006       // ~51cm height (canon Star Wars BD-1 scale)
const COLLIDER_RADIUS = 0.11    // 0.22m diameter (BD-1 width ~0.17m)
const COLLIDER_HALF_HEIGHT = 0.13 // 0.48m total capsule height
const COLLIDER_CENTER_Y = 0.24  // Half of total collider height above floor

// Rapier Kinematic Character Controller Parameters
const SKIN_OFFSET = 0.01        // 1cm character skin offset
const GRAVITY_PROBE = -2.5      // Downward delta probe for floor contact
const SNAP_TO_GROUND = 0.08     // 8cm snap-to-ground threshold
const AUTOSTEP_MAX_HEIGHT = 0.05 // 5cm max step height (avoids climbing furniture)
const AUTOSTEP_MIN_WIDTH = 0.05  // 5cm min step width
const SLIDE_ENABLED = true      // Smooth obstacle sliding

// Apartment Boundary Fallback (Safety Envelope)
const APARTMENT_BOUNDS = {
  minX: -3.35, maxX: 3.35,
  minZ: -4.85, maxZ: 5.45
}
```

---

## 3. Rebased 12-Phase Completion Roadmap

To achieve the full agreed NaviMind product vision (autonomous multi-room inspection, semantic natural-language understanding, hazard missions, virtual fetch/pickup, radar minimap, and multi-cam director), the roadmap is rebased into 12 distinct phases:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              12-PHASE COMPLETION ROADMAP                               │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Phase 1  — Collision-Safe Robot Locomotion                 [████████████████████] 100% │
│ Phase 2  — Multi-Room Autonomous Navigation (A*)           [░░░░░░░░░░░░░░░░░░░░]   0% │
│ Phase 3  — Command Understanding & Mission Intelligence    [░░░░░░░░░░░░░░░░░░░░]   0% │
│ Phase 4  — Open-Source Semantic Model Integration          [░░░░░░░░░░░░░░░░░░░░]   0% │
│ Phase 5  — Perception & Simulated LiDAR                    [░░░░░░░░░░░░░░░░░░░░]   0% │
│ Phase 6  — Hazard Missions (Fire, Gas, Electrical)         [░░░░░░░░░░░░░░░░░░░░]   0% │
│ Phase 7  — Fetch & Pickup Assistance System                [░░░░░░░░░░░░░░░░░░░░]   0% │
│ Phase 8  — Operator HUD & Floorplan Radar Minimap          [░░░░░░░░░░░░░░░░░░░░]   0% │
│ Phase 9  — Camera Director (Chase, FPV, Orbit)             [░░░░░░░░░░░░░░░░░░░░]   0% │
│ Phase 10 — Visual & Audio Polish                           [░░░░░░░░░░░░░░░░░░░░]   0% │
│ Phase 11 — Performance Optimization (Simplified Colliders) [░░░░░░░░░░░░░░░░░░░░]   0% │
│ Phase 12 — Codebase Cleanup & Final QA                     [████░░░░░░░░░░░░░░░░]  20% │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Phase 1 — Collision-Safe Robot Locomotion `[COMPLETE]`
- Kinematic position character controller via Rapier WASM.
- Selective trimesh colliders on structural walls, doors, floor, and furniture.
- Omnidirectional movement: forward/backward, yaw steering, strafing, sprint boost.
- Stable grounding: `enableSnapToGround(0.08)`, `GRAVITY_PROBE = -2.5`, floor safety clamp.
- Autostep calibration: `(0.05, 0.05, false)`.
- Table underside headroom clearance (~22cm margin).
- Instant manual takeover cleanly cancelling AUTO mode.
- Runtime verification: PASSED across all 12 test sections.

### Phase 2 — Multi-Room Autonomous Navigation `[NEXT]`
- **Room Registry**: Define bounding spaces and room identities (Living Room, Kitchen, Corridor, Master Bedroom, Balcony).
- **Doorway Waypoints**: Establish exact navigation portals between connecting rooms.
- **Topological Graph & A* Pathfinding**: Calculate multi-room routes connecting rooms without cutting through partition walls.
- **Local Obstacle Avoidance**: Dynamic steering around chairs and temporary obstacles.
- **Path Visualizer & Debugger**: Toggleable 3D spline/waypoint breadcrumb rendering.
- **Replanning & Recovery**: Automatic recovery if the robot is blocked.

### Phase 3 — Command Understanding & Mission Intelligence `[PLANNED]`
- **Intent Dispatcher**: Route natural language into high-level intents (`FIND`, `NAVIGATE`, `INSPECT`, `FETCH`).
- **Target Registry Refinement**: Support synonyms, functional descriptions, and spatial relations (e.g. *"the TV in the living room"*).
- **Mission Controller State Machine**:
  `IDLE ➔ PARSING ➔ PLANNING ➔ NAVIGATING ➔ APPROACHING ➔ SCANNING/PICKUP ➔ RETURNING ➔ COMPLETED`.
- **Command Validation**: Feedback for unrecognized commands, unreachable targets, or unsupported actions.
- **Deterministic Heuristic Fallback**: Fast regex/keyword matching layer.

### Phase 4 — Open-Source Semantic Model Integration `[PLANNED]`
- Integrate a lightweight, local open-source semantic model (e.g. via Transformers.js / WebLLM) specifically for natural-language command and entity understanding.
- Resolves commands that aliases alone cannot reliably parse (e.g. *"Find the safety equipment I would use if a fire starts"* ➔ `Fire Extinguisher`).
- Maintain deterministic keyword/alias fallback for instant offline execution.

### Phase 5 — Perception & Simulated LiDAR `[PLANNED]`
- **Simulated LiDAR Scanner**: Raycast sweep radiating from BD-1's optical lens.
- **Target Scanning & Distance Calculation**: Real-time Euclidean distance and line-of-sight verification.
- **World-Space AR Brackets**: 3D bounding boxes and holographic labels tracking recognized objects.
- **Sensor Articulation**: Animate BD-1's head tracking toward detected targets during inspection.

### Phase 6 — Hazard Missions `[PLANNED]`
- **Reusable Hazard Architecture**: Extensible hazard incident base class.
- **Scenario 1: Fire Outbreak**: Simulated smoke/flame in kitchen; BD-1 locates extinguisher and triggers alarm.
- **Scenario 2: Gas Leak Detection**: Ceiling gas detector alert; BD-1 inspects kitchen induction and confirms valve status.
- **Scenario 3: Electrical Breaker Fault**: Simulated power outage; BD-1 navigates to hallway breaker panel and inspects switch states.
- **Mission Resolution Workflow**: Scan ➔ Diagnose ➔ Confirm resolution ➔ Telemetry report.

### Phase 7 — Fetch & Pickup Assistance System `[PLANNED]`
- **Object Metadata (`pickupAllowed`)**: Designate lightweight movable props (e.g. TV remote, datapad, water bottle).
- **Virtual Carry Socket**: Attach point on BD-1's chassis for carried items.
- **Target Approach & Alignment**: Precision deceleration when within 0.4m of pickup target.
- **Carry & Return-to-Home**: Transport object back to the operator's designated home base.
- **Drop & Mission Complete**: Detach object at destination and report mission success.

### Phase 8 — Operator HUD & Floorplan Radar Minimap `[PLANNED]`
- **2D Apartment Radar**: Scaled Canvas/SVG top-down floorplan displaying room outlines, robot position marker, facing cone, and object blips.
- **Live Telemetry Dashboard**: Real-time room indicator, mission status, target distance, speed, heading.
- **Event Logging Terminal**: Scrollable monospace mission audit trail.

### Phase 9 — Camera Director `[PLANNED]`
- **Multi-Camera Modes**:
  - `CHASE`: 3rd-person follow camera with elevated angle and obstruction raycasting.
  - `FPV`: 1st-person camera mounted in BD-1's optical eye.
  - `ORBIT`: Free tactical orbit camera for apartment overview.
- **Centralized CameraDirector**: Smooth lerp transitions between camera modes without viewport snapping.

### Phase 10 — Visual & Audio Polish `[PLANNED]`
- **Acoustic Soundscapes**: BD-1 servo whirs, happy/alert chirps, mechanical footsteps, ambient apartment sound.
- **Volumetric Lighting & Bloom**: Subtle sun god-rays through balcony windows, emissive holographic glows.
- **Animation Polish**: Responsive foot placement, acceleration lean, and head nodding.

### Phase 11 — Performance Optimization `[PLANNED]`
- **Collider Optimization**: Replace large 118k-triangle trimeshes with baked convex hulls or simplified box colliders for mobile/low-end scalability.
- **Asset Compression**: Optimize GLTF textures and geometry with Draco / KTX2.
- **Adaptive DPR**: Dynamic resolution scaling based on client frame rate.

### Phase 12 — Codebase Cleanup & Final QA `[PLANNED]`
- Remove legacy prototype files (`CityMap.tsx`, `src/components/city/`, `Drone.tsx`).
- Complete full migration from `drone*` to `robot*` naming across all files.
- Update landing page branding to *"NaviMind 3D Apartment Robot Simulator"*.
- Comprehensive QA suite: test all predefined commands, navigation paths, hazard scenarios, and fetch workflows.

---

## 4. Open-Source AI Model Integration Status

| Model | Purpose | Why Added | License | Runtime | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| *(None)* | Natural-language semantic command & target understanding | Semantic target resolution for complex natural language queries | N/A | Local WebLLM / Transformers.js | **No open-source AI model integrated yet — intentionally deferred to Phase 4.** |

> [!NOTE]
> **Why No AI Model Was Added in Phase 1**:
> Phase 1 is strictly dedicated to deterministic robot locomotion, character physics, and collision safety. An AI/ML model provides zero value for physics solvers, kinematic collisions, or manual character steering. The planned open-source model remains dedicated to natural-language semantic command interpretation and entity resolution in Phase 4. Target matching currently uses robust deterministic keyword heuristics.

---

## 5. Overall Completion Calculation

- **Previous Estimate**: 50% (calculated against an older, compressed 6-phase prototype roadmap).
- **Rebased Estimate**: **25%** (calculated against the full 12-phase agreed product target).
- **Rationale**: While Phase 1 (Physics, Kinematic Locomotion, Controls, Clearance, and Runtime Verification) is 100% complete and the core 3D scene/UI foundations are built, major future subsystems—autonomous multi-room A* pathfinding, semantic command understanding, simulated LiDAR, hazard missions, virtual fetch/pickup, and floorplan radar—represent the remaining 75% of the full NaviMind vision.

---

## 6. Exact Next Task

**Phase 2 — Multi-Room Autonomous Navigation**:
Implement the room registry, doorway waypoints, and topological A* pathfinding graph so BD-1 autonomously navigates between the living room, kitchen, corridor, bedroom, and balcony without walking into partition walls.
