# NaviMind: Current State, Final Scene & Completion Roadmap

---

## 1. Project Overview

**NaviMind** is a web-based, real-time 3D simulation platform for an **indoor autonomous inspection and hazard detection droid**. 
Built on **Next.js 16 (Turbopack)**, **React 19**, **Three.js / React Three Fiber**, and **Zustand**, the simulation takes place inside a detailed multi-room modern apartment where the Star Wars **BD-1 bipedal robot** navigates, scans the environment, locates mission targets, and identifies safety hazards.

---

## 2. Current State of the Project

### 2.1 Technology Stack & Dependencies
- **Framework**: Next.js 16.2.12 (Turbopack, App Router)
- **UI Engine**: React 19.2.4 & React DOM 19.2.4
- **3D Graphics**: Three.js 0.185.1 & `@react-three/fiber` 9.7.0
- **3D Helper Utilities**: `@react-three/drei` 10.7.7
- **Post-Processing**: `@react-three/postprocessing` 3.0.4 (Bloom, Vignette, ToneMapping)
- **Physics**: `@react-three/rapier` 2.2.0
- **State Management**: Zustand 5.0.14
- **Language & Styling**: TypeScript 5, Tailwind CSS 4, Vanilla CSS

---

### 2.2 What Is Currently Built & Functional

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               CURRENT SIMULATION STACK                                 │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│ 3D WORLD & LIGHTING                       │ ROBOT & MOBILITY                           │
│ • apartment.glb (35.4MB, multi-room)      │ • bd1.glb (Star Wars BD-1 Droid)           │
│ • Living room, kitchen, bedroom, balcony  │ • Walking gait animation (bob, roll, pitch)│
│ • 24-hour dynamic sun & ambient lights    │ • 3rd-person chase camera (behind droid)   │
│ • Point lights across rooms               │ • Manual keyboard controls (W/A/S/D)       │
├───────────────────────────────────────────┼────────────────────────────────────────────┤
│ TARGETS & SENSORS                         │ OPERATOR HUD & STATE                       │
│ • 5 Physical props (Fire Ext, TV, etc.)   │ • Text command bar & quick chips           │
│ • Optical scanner cone (8m FOV ahead)     │ • Optical scanner card (Conf %, Dist, XYZ) │
│ • Target matching logic (NLP keywords)    │ • Day/Night scrubber & speed multipliers   │
│ • Target lock alert when object found     │ • Zustand store (useSimulationStore)       │
└───────────────────────────────────────────┴────────────────────────────────────────────┘
```

1. **The 3D Living Space ([Apartment.tsx](file:///c:/Users/kdev7/Desktop/NaviMind/navimind/src/components/Apartment.tsx))**:
   - Fully loaded apartment model (`public/apartment.glb`, 35.4 MB) featuring:
     - **Living Room & Dining Area**: Couches, media console, dining table, chairs.
     - **Kitchen**: Countertops, sink, induction cooktop.
     - **Hallway Corridor**: Entryway door, breaker panel, room connecting passages.
     - **Master Bedroom**: Bed suite, nightstands, wardrobe.
     - **Balcony**: Glass windows with city environment visibility.
   - Dynamic 24-hour daylight simulation ([Scene.tsx](file:///c:/Users/kdev7/Desktop/NaviMind/navimind/src/components/Scene.tsx)) with moving directional sun and warm interior downlights.

2. **The Robot Avatar: Star Wars BD-1 ([Robot.tsx](file:///c:/Users/kdev7/Desktop/NaviMind/navimind/src/components/Robot.tsx))**:
   - 3D Model: `public/bd1.glb` (bipedal explorer droid).
   - Walking animation: Real-time procedural bobbing on Y, subtle roll on Z, and forward pitch lean when moving.
   - Camera: Dedicated 3rd-person chase camera smoothly lerping behind BD-1's back, facing forward.

3. **Physical Apartment Targets ([ApartmentObjects.tsx](file:///c:/Users/kdev7/Desktop/NaviMind/navimind/src/components/ApartmentObjects.tsx))**:
   - 🧯 **Emergency Fire Extinguisher**: Kitchen wall-mounted with holographic safety beacon and pressure gauge.
   - 📺 **Living Room Smart TV**: Wall-mounted with glowing 4K OLED luminescence.
   - 🍳 **Kitchen Induction Cooktop**: Countertop unit with glowing red heating rings.
   - 🚨 **Smart Smoke & Gas Detector**: Ceiling-mounted with flashing green status LED.
   - ⚡ **Main Power Breaker Panel**: Wall-mounted in hallway corridor.
   - 🛏️ **Master Bedroom Bed Suite**: Placed inside the master bedroom.

4. **Perception & Mission Search System ([UIOverlay.tsx](file:///c:/Users/kdev7/Desktop/NaviMind/navimind/src/components/UIOverlay.tsx))**:
   - Natural text search input (e.g. *"Find fire extinguisher"*, *"Find TV"*, *"Find smoke detector"*).
   - Quick-select target chips for one-click target selection.
   - Optical vision scanner analyzing field of view ahead (distance, confidence %, category, 3D coordinates).
   - Autonomous patrol vs. manual takeover modes.

---

### 2.3 Existing Issues & Deficiencies in Current State

1. **Locomotion Sticking Under Tables & at Edges**:
   - BD-1 is currently wrapped in a dynamic Rapier physics body (`type="dynamic"` with `CapsuleCollider`).
   - Dynamic physics linear damping and contact resolution fight manual steering, causing the robot to snag or stop when touching table legs or chair geometry.
   - Position clamping bounds are artificially small (`X: [-3.1, 3.1]`, `Z: [-4.5, 5.15]`), causing the robot to freeze near outer rooms (such as the breaker panel at `X: -3.15` or balcony at `Z: 5.2`).
2. **Straight-Line Autonomous Pathfinding**:
   - In AUTO mode, BD-1 heads in a direct straight line toward target coordinates. If a target is in another room (e.g. the bedroom bed), it walks into the separating wall rather than routing through the hallway door.
3. **Camera Clipping Under Tables**:
   - The chase camera is set at table height (0.85m), causing it to clip into table tops or chair backs when BD-1 walks under furniture.
4. **Leftover Legacy Code**:
   - Dead files from previous prototypes (`CityMap.tsx`, `src/components/city/`, and `Drone.tsx`) are still present in `src/components/`.
   - Internal variable names in Zustand and hooks still use old terminology (e.g., `droneTelemetry`, `droneWorldPos`, `useDroneControls`).
   - Landing page (`src/app/page.tsx`) still displays *"NaviMind 3D City Simulator"*.

---

## 3. The Final Scene Specification (Target End-State)

The **Final Scene** represents the complete, production-ready vision: **an intelligent, frictionless indoor inspection droid simulator** where BD-1 acts as a fully autonomous home assistant and emergency hazard inspector.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        FINAL SCENE: SMART APARTMENT ROBOT SIMULATOR                    │
├──────────────────────────────────────────┬─────────────────────────────────────────────┤
│ 1. FRICTIONLESS FLOOR MOBILITY           │ 2. MULTI-ROOM CORRIDOR NAVIGATION           │
│ • Smooth kinematic position movement     │ • Door-to-door corridor pathfinding         │
│ • Slips effortlessly under tables/chairs │ • Room topological graph navigation         │
│ • Responsive W/A/S/D steering & strafe   │ • No wall collisions when switching rooms   │
│ • Sprint boost mode (Shift/Space)        │ • Dynamic avoidance around chairs           │
├──────────────────────────────────────────┼─────────────────────────────────────────────┤
│ 3. HOLOGRAM PERCEPTION & HAZARD MISSIONS │ 4. SCI-FI OPERATOR HUD & RADAR              │
│ • Holographic LiDAR scan fan from eye    │ • 2D Apartment Floorplan Radar Minimap      │
│ • 3D world-space AR glowing target boxes │ • Triple Camera: Chase, FPV Eye, Orbit Plan │
│ • Active hazard events: Gas, Fire, Power │ • Clean modern UI with zero legacy remnants │
│ • Droid head tracks detected objects     │ • Real-time telemetry & mission event logs  │
└──────────────────────────────────────────┴─────────────────────────────────────────────┘
```

### 3.1 Visual Atmosphere & Environment
- **Photorealistic Lighting**:
  - Soft sunlight streaming through balcony glazing with contact shadows (`PCFSoftShadowMap`).
  - Warm recessed ceiling downlights with natural falloff.
  - Realistic materials (reflective wooden floors, brushed metal fixtures, matte walls).
- **Acoustic Ambiance**:
  - Positional Star Wars BD-1 audio chirps, bleeps, and mechanical servo sounds on turns.
  - Subtle room ambiance (refrigerator hum, breeze outside balcony).

### 3.2 Droid Locomotion & Clearance
- **Kinematic Omnidirectional Controller**:
  - Zero-friction position-based movement with no physics solver snagging.
  - Calibrated droid height (~50cm) with generous open headroom under dining tables, coffee tables, and desks.
  - Elevated smart chase camera (1.05m height, slight downward tilt) ensuring continuous unobstructed visibility.
  - Full control suite: `W`/`S` (Forward/Backward), `A`/`D` (Smooth Steering), `Q`/`E` (Strafe Left/Right), `Shift` (Sprint).

### 3.3 Multi-Room Doorway Pathfinding
- **Topological Corridor Graph**:
  $$\text{Living Lounge} \longleftrightarrow \text{Kitchen} \longleftrightarrow \text{Central Hallway} \longleftrightarrow \text{Master Bedroom} \longleftrightarrow \text{Balcony}$$
- When instructed to find an object in any room, BD-1 navigates through doorways and corridors naturally without walking into partition walls.

### 3.4 Perception, AR & Hazard Missions
- **Holographic LiDAR Sweep**: A cyan laser scan fan sweeps outward from BD-1's optical lens when scanning.
- **3D World AR Brackets**: Recognized targets display an animated 3D bounding box with distance badge and status tag.
- **Head Articulation**: BD-1 pivots and tracks detected objects with its optical scanner head.
- **Interactive Hazard Scenarios**:
  - **Fire Incident**: Smoke detected in kitchen; BD-1 navigates to the fire extinguisher and initiates emergency alert.
  - **Gas Leak**: Gas detector flashes red; BD-1 isolates the leak source.
  - **Power Fault**: Breaker panel trips; BD-1 investigates and verifies electrical circuit integrity.

### 3.5 Operator HUD & Multi-Camera Director
- **Floorplan Radar Mini-Map**: Top-right HUD minimap displaying the apartment layout, BD-1's real-time position icon, heading cone, and target blips.
- **Multi-Camera Director**:
  - **Chase Cam**: 3rd-person follow camera with table clearance.
  - **FPV Eye Cam**: 1st-person camera seeing directly through BD-1's optical sensor.
  - **Tactical Orbit Cam**: Free orbital camera for full apartment overview.

---

## 4. What Left to Complete (Task Checklist)

The following actionable checklist breaks down everything required to transition from the Current State to the Final Scene:

### Phase 1: Free Locomotion & Clearance (Highest Priority)
- [ ] **Switch to Kinematic Controller** in `Robot.tsx`:
  - Replace dynamic Rapier body with `type="kinematicPositionBased"` and `colliders={false}`.
  - Implement direct position/yaw calculation (`newPos = currentPos + moveDir * speed * delta`).
- [ ] **Expand Floor Boundaries**:
  - Update clamping to full GLTF bounds (`X: [-3.35, 3.35]`, `Z: [-4.8, 5.4]`).
- [ ] **Calibrate Table & Furniture Clearance**:
  - Adjust BD-1 scale to `0.006` (~51cm tall) so it slips under tables with open space.
- [ ] **Elevate Chase Camera**:
  - Raise camera height to 1.05m to prevent clipping into dining and coffee table tops.
- [ ] **Full Steering Controls**:
  - Support `W`/`S` (forward/backward), `A`/`D` (turn), `Q`/`E` (strafe), and `Shift` (sprint).

### Phase 2: Multi-Room Corridor Navigation (AUTO Mode)
- [ ] **Define Room Waypoint Graph**:
  - Create graph nodes for Living Room, Kitchen, Corridor Entry, Bedroom Door, and Balcony.
- [ ] **Graph Pathfinding in AUTO Mode**:
  - When target is selected, find the shortest path along doorway waypoints before approaching the object.
- [ ] **Doorway Traversal**:
  - Prevent BD-1 from walking into partition walls when seeking objects in adjacent rooms.

### Phase 3: Visual & AR Perception Upgrades
- [ ] **Holographic LiDAR Scan Cone**:
  - Add transparent cyan scanner cone projecting from BD-1's eye when scanning.
- [ ] **3D World AR Target Brackets**:
  - Render glowing 3D bounding box corners and distance tag in world space around detected objects.
- [ ] **Head Look-At Articulation**:
  - Rotate BD-1's head toward the locked target during inspection.

### Phase 4: Operator HUD & Radar Mini-Map
- [ ] **2D Apartment Floorplan Radar**:
  - Add top-right HUD minimap showing apartment rooms, BD-1 position arrow, and detected object pings.
- [ ] **Multi-Camera Toggle**:
  - Support switching between 3rd-Person Chase Cam, 1st-Person FPV Droid Cam, and Free Orbit Cam.

### Phase 5: Interactive Hazard Inspection Scenarios
- [ ] **Simulated Hazard Events**:
  - Add interactive trigger for Fire Alert, Gas Leak, and Breaker Trip.
- [ ] **Hazard Remediation Workflow**:
  - BD-1 identifies emergency target, performs scan, and triggers "RESOLVED / SECURED" status.

### Phase 6: Codebase Hygiene & Refactoring
- [ ] **Remove Legacy Prototype Files**:
  - Delete `src/components/CityMap.tsx` and `src/components/city/`.
  - Delete `src/components/Drone.tsx`.
- [ ] **Rename Outdated Variables**:
  - Rename `droneTelemetry` -> `robotTelemetry`, `droneWorldPos` -> `robotWorldPos`, `useDroneControls` -> `useRobotControls`.
- [ ] **Update Landing Page**:
  - Update `src/app/page.tsx` from "NaviMind 3D City Simulator" to "NaviMind 3D Apartment Robot Simulator".

---

## 5. Summary Matrix

| Metric / Dimension | Current State | Final Scene Target | Status |
| :--- | :--- | :--- | :--- |
| **Primary Environment** | Apartment (`apartment.glb`, 35MB) | Apartment (`apartment.glb`) with enhanced lighting & acoustics | 80% Complete |
| **Robot Avatar** | BD-1 Droid (`bd1.glb`) | BD-1 Droid with head tracking & audio | 75% Complete |
| **Locomotion** | Dynamic Rapier (snags under tables/edges) | Frictionless Kinematic position controller | Needs Phase 1 |
| **Auto Navigation** | Straight-line (cuts into walls) | Multi-room corridor waypoint graph | Needs Phase 2 |
| **Perception & Sensors** | 2D HUD text/card data | 3D World AR brackets + LiDAR holographic fan | Needs Phase 3 |
| **HUD & Mini-Map** | Basic telemetry & command bar | Sci-Fi HUD + 2D Floorplan Radar + Multi-Cam | Needs Phase 4 |
| **Missions** | Object search only | Dynamic hazard inspection (Fire/Gas/Power) | Needs Phase 5 |
| **Codebase Cleanliness** | Leftover city files & drone names | 100% clean, modular apartment robot codebase | Needs Phase 6 |
