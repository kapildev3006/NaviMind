const { spawn } = require('child_process');
const http = require('http');

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const port = 9222;
  const targetUrl = 'http://localhost:3000/simulation';
  const userDir = 'C:\\Users\\kdev7\\.gemini\\antigravity-ide\\brain\\15271d08-3a8b-4acd-973d-8f4bcd8a0a5e\\scratch\\chrome_test_' + Date.now();

  console.log('================================================================');
  console.log('   PHASE 3.5: CAMERA DIRECTOR & HUD ACCESSIBILITY SUITE        ');
  console.log('================================================================');
  console.log('Launching headless Chrome on port', port);

  const chromeProc = spawn(chromePath, [
    '--headless=new',
    `--user-data-dir=${userDir}`,
    `--remote-debugging-port=${port}`,
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--use-gl=angle',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1280,800',
    targetUrl
  ], { detached: false });

  chromeProc.on('error', (err) => console.error('Chrome spawn error:', err));

  let targets = null;
  for (let i = 0; i < 25; i++) {
    await wait(500);
    try {
      targets = await fetchJson(`http://127.0.0.1:${port}/json/list`);
      if (targets && targets.length > 0) break;
    } catch (e) {}
  }

  if (!targets || targets.length === 0) {
    console.error('Failed to connect to Chrome debugging port');
    chromeProc.kill();
    return;
  }

  let pageTarget = targets.find(t => t.type === 'page' && t.url.includes('simulation'));
  if (!pageTarget) {
    pageTarget = targets.find(t => t.type === 'page') || targets[0];
  }
  console.log('Connecting to target:', pageTarget.title, pageTarget.url);

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  let msgId = 1;
  const pending = new Map();

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve } = pending.get(data.id);
      pending.delete(data.id);
      resolve(data.result);
      return;
    }
    if (data.method === 'Runtime.consoleAPICalled') {
      const args = data.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
      if (!args.includes('DEBUG DUMP') && !args.includes('Download the React DevTools')) {
        console.log('[BROWSER LOG]:', args);
      }
    }
  };

  await new Promise((resolve) => { ws.onopen = resolve; });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Console.enable');

  console.log('Navigating page to targetUrl...');
  await send('Page.navigate', { url: targetUrl });
  await wait(3000);

  async function evalExpr(expr) {
    const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (res?.exceptionDetails) {
      console.error('CDP EVAL EXCEPTION:', res.exceptionDetails.text, res.exceptionDetails.exception?.description);
    }
    return res?.result?.value;
  }

  console.log('Waiting for simulation, CameraDirector, and MissionController to mount...');
  let initialized = false;
  for (let i = 0; i < 60; i++) {
    await wait(800);
    const probe = await evalExpr(`
      (function() {
        return {
          hasSimStore: typeof window !== 'undefined' && !!window.__simStore,
          hasMissionCtrl: typeof window !== 'undefined' && !!window.__missionController,
          hasNavDebug: typeof window !== 'undefined' && !!window.__navDebug,
          hasCameraDebug: typeof window !== 'undefined' && !!window.__cameraDebug,
          hasRobotDebug: typeof window !== 'undefined' && !!window.__robotDebug
        };
      })()
    `);

    if (probe?.hasSimStore && probe?.hasMissionCtrl && probe?.hasCameraDebug) {
      initialized = true;
      console.log(`Phase 3.5 systems ready after ${(i * 0.8).toFixed(1)}s! (${JSON.stringify(probe)})`);
      break;
    } else if (i % 5 === 0) {
      console.log(`Waiting for CameraDirector... Probe status: ${JSON.stringify(probe)}`);
    }
  }

  if (!initialized) {
    console.error('FAILED TO INITIALIZE PHASE 3.5 SYSTEMS.');
    ws.close();
    chromeProc.kill();
    return;
  }

  const testResults = [];
  function assert(name, condition, details = '') {
    const passed = !!condition;
    testResults.push({ name, passed, details });
    const mark = passed ? '  [PASS]' : '  [FAIL]';
    console.log(`${mark} ${name}${details ? ' - ' + details : ''}`);
  }

  // ================================================================
  // SECTION 1: CAMERA MODES & CENTRALIZED AUTHORITY
  // ================================================================
  console.log('\n--- SECTION 1: CAMERA MODES (CHASE | FPV | ORBIT) ---');

  const initialCam = await evalExpr('window.__cameraDebug');
  assert('Default camera mode is CHASE', initialCam?.cameraMode === 'CHASE', `mode=${initialCam?.cameraMode}`);
  assert('Default chase preset is NORMAL', initialCam?.chasePreset === 'NORMAL', `preset=${initialCam?.chasePreset}`);

  // Test FPV mode
  await evalExpr('window.__simStore.getState().setCameraMode("FPV")');
  await wait(600);
  const fpvCam = await evalExpr(`
    (function() {
      const c = window.__cameraDebug;
      const r = window.__robotDebug;
      const eyeX = r.pos.x - Math.sin(r.yaw) * 0.12;
      const eyeY = r.pos.y + 0.22;
      const eyeZ = r.pos.z - Math.cos(r.yaw) * 0.12;
      const dist = Math.hypot(c.pos.x - eyeX, c.pos.y - eyeY, c.pos.z - eyeZ);
      return { cameraMode: c.cameraMode, distToEyeAnchor: dist };
    })()
  `);
  assert('CameraMode switches to FPV', fpvCam?.cameraMode === 'FPV');
  assert('FPV camera aligns with BD-1 eye anchor (<0.15m)', fpvCam?.distToEyeAnchor < 0.15, `dist=${fpvCam?.distToEyeAnchor?.toFixed(3)}m`);

  // Test ORBIT mode
  await evalExpr('window.__simStore.getState().setCameraMode("ORBIT")');
  await wait(400);
  const orbitCam = await evalExpr('window.__cameraDebug');
  assert('CameraMode switches to ORBIT', orbitCam?.cameraMode === 'ORBIT');

  // Switch back to CHASE
  await evalExpr('window.__simStore.getState().setCameraMode("CHASE")');
  await wait(500);
  const chaseCam = await evalExpr('window.__cameraDebug');
  assert('CameraMode returns cleanly to CHASE', chaseCam?.cameraMode === 'CHASE');

  // Test hotkey 'C' cycling
  await evalExpr(`
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', code: 'KeyC', bubbles: true }));
  `);
  await wait(200);
  const keyMode1 = await evalExpr('window.__simStore.getState().cameraMode');
  assert('Hotkey "C" cycles CHASE -> FPV', keyMode1 === 'FPV', `mode=${keyMode1}`);

  await evalExpr(`
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', code: 'KeyC', bubbles: true }));
  `);
  await wait(200);
  const keyMode2 = await evalExpr('window.__simStore.getState().cameraMode');
  assert('Hotkey "C" cycles FPV -> ORBIT', keyMode2 === 'ORBIT', `mode=${keyMode2}`);

  await evalExpr(`
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', code: 'KeyC', bubbles: true }));
  `);
  await wait(200);
  const keyMode3 = await evalExpr('window.__simStore.getState().cameraMode');
  assert('Hotkey "C" cycles ORBIT -> CHASE', keyMode3 === 'CHASE', `mode=${keyMode3}`);

  // ================================================================
  // SECTION 2: CHASE DISTANCE PRESETS & DYNAMIC ZOOM
  // ================================================================
  console.log('\n--- SECTION 2: CHASE DISTANCE PRESETS & ZOOM ---');

  // Preset CLOSE
  await evalExpr('window.__simStore.getState().setChasePreset("CLOSE")');
  await wait(200);
  const closeDebug = await evalExpr('window.__cameraDebug');
  assert('Chase preset CLOSE sets desired distance to 1.1m', closeDebug?.desiredChaseDistance === 1.1, `dist=${closeDebug?.desiredChaseDistance}`);

  // Preset FAR
  await evalExpr('window.__simStore.getState().setChasePreset("FAR")');
  await wait(200);
  const farDebug = await evalExpr('window.__cameraDebug');
  assert('Chase preset FAR sets desired distance to 3.2m', farDebug?.desiredChaseDistance === 3.2, `dist=${farDebug?.desiredChaseDistance}`);

  // Preset NORMAL
  await evalExpr('window.__simStore.getState().setChasePreset("NORMAL")');
  await wait(200);
  const normDebug = await evalExpr('window.__cameraDebug');
  assert('Chase preset NORMAL sets desired distance to 1.8m', normDebug?.desiredChaseDistance === 1.8, `dist=${normDebug?.desiredChaseDistance}`);

  // Hotkey 'V' cycling
  await evalExpr(`
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', code: 'KeyV', bubbles: true }));
  `);
  await wait(200);
  const vPreset1 = await evalExpr('window.__simStore.getState().chasePreset');
  assert('Hotkey "V" cycles NORMAL -> FAR', vPreset1 === 'FAR', `preset=${vPreset1}`);

  await evalExpr(`
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', code: 'KeyV', bubbles: true }));
  `);
  await wait(200);
  const vPreset2 = await evalExpr('window.__simStore.getState().chasePreset');
  assert('Hotkey "V" cycles FAR -> CLOSE', vPreset2 === 'CLOSE', `preset=${vPreset2}`);

  // Restore NORMAL
  await evalExpr('window.__simStore.getState().setChasePreset("NORMAL")');
  await wait(200);

  // Wheel zoom
  await evalExpr(`
    window.dispatchEvent(new WheelEvent('wheel', { deltaY: -150, bubbles: true }));
  `);
  await wait(200);
  const wheelDist = await evalExpr('window.__simStore.getState().desiredChaseDistance');
  assert('Wheel event adjusts desired chase distance', wheelDist !== 1.8 && wheelDist >= 0.8 && wheelDist <= 4.5, `newDist=${wheelDist?.toFixed(2)}m`);

  // Reset back to 1.8m
  await evalExpr('window.__simStore.getState().setChasePreset("NORMAL")');
  await wait(400);

  // ================================================================
  // SECTION 3: WALL COLLISION & OBSTRUCTION AVOIDANCE
  // ================================================================
  console.log('\n--- SECTION 3: WALL COLLISION & OBSTRUCTION AVOIDANCE ---');

  // Position BD-1 near the living room wall facing -Z, with wall behind (+Z)
  // Wall at maxZ ~ 4.40. Move BD-1 to z = 4.00 facing -Z (yaw = 0)
  // Desired camera is at z = 4.00 + 1.8 = 5.80 (beyond wall).
  await evalExpr(`
    (function() {
      const pos = { x: -0.50, y: 0.24, z: 4.05 };
      window.__simStore.getState().setRobotWorldPos([pos.x, pos.y, pos.z]);
      window.__simStore.getState().setRobotYaw(0);
      return pos;
    })()
  `);
  await wait(1500); // Allow raycasting and damping to respond

  const wallCam = await evalExpr('window.__cameraDebug');
  const isContracted = wallCam?.effectiveDistance < 1.70;
  const isInsideApartment =
    wallCam?.pos?.x >= -6.70 && wallCam?.pos?.x <= 0.25 &&
    wallCam?.pos?.z >= -6.20 && wallCam?.pos?.z <= 4.40 &&
    wallCam?.pos?.y >= 0.25 && wallCam?.pos?.y <= 2.65;

  assert('Camera contracts in front of wall obstacle', isContracted, `effectiveDist=${wallCam?.effectiveDistance?.toFixed(2)}m (desired=1.80m)`);
  assert('Camera position clamped strictly inside apartment bounds', isInsideApartment, `pos=(${wallCam?.pos?.x?.toFixed(2)}, ${wallCam?.pos?.y?.toFixed(2)}, ${wallCam?.pos?.z?.toFixed(2)})`);

  // Move BD-1 back into center open living room space
  await evalExpr(`
    (function() {
      const pos = { x: -0.50, y: 0.24, z: 2.70 };
      window.__simStore.getState().setRobotWorldPos([pos.x, pos.y, pos.z]);
      window.__simStore.getState().setRobotYaw(0);
      return pos;
    })()
  `);
  await wait(1800); // Allow camera to smoothly expand

  const openCam = await evalExpr('window.__cameraDebug');
  const hasExpanded = openCam?.effectiveDistance >= 1.60;
  assert('Camera expands smoothly back towards desired distance when clear', hasExpanded, `effectiveDist=${openCam?.effectiveDistance?.toFixed(2)}m`);

  // ================================================================
  // SECTION 4: HUD ACCESSIBILITY & DRAWERS
  // ================================================================
  console.log('\n--- SECTION 4: HUD ACCESSIBILITY & DRAWER TOGGLES ---');

  const hudCheck = await evalExpr(`
    (function() {
      return {
        hasCommandInput: !!document.getElementById('mission-command-input'),
        hasExecuteBtn: !!document.getElementById('mission-execute-btn'),
        hasQuickToggle: !!document.getElementById('quick-missions-toggle-btn'),
        hasLogsToggle: !!document.getElementById('mission-logs-toggle-btn'),
        hasExpandToggle: !!document.getElementById('console-expand-toggle-btn'),
        hasAiScannerToggle: !!document.getElementById('ai-scanner-toggle-btn'),
        hasHelpPopover: !!document.getElementById('help-popover-btn'),
        hasCamChaseBtn: !!document.getElementById('cam-chase-btn'),
        hasCamFpvBtn: !!document.getElementById('cam-fpv-btn'),
        hasCamOrbitBtn: !!document.getElementById('cam-orbit-btn'),
        hasViewCloseBtn: !!document.getElementById('view-close-btn')
      };
    })()
  `);

  assert('Command input element rendered', hudCheck?.hasCommandInput);
  assert('Execute button rendered', hudCheck?.hasExecuteBtn);
  assert('Top control bar camera buttons rendered', hudCheck?.hasCamChaseBtn && hudCheck?.hasCamFpvBtn && hudCheck?.hasCamOrbitBtn);
  assert('Top control bar view preset buttons rendered', hudCheck?.hasViewCloseBtn);

  // Test Quick Missions Drawer Toggle
  await evalExpr('document.getElementById("quick-missions-toggle-btn").click()');
  await wait(200);
  const quickChipsVisible = await evalExpr('document.body.innerText.includes("QUICK TARGETS")');
  assert('Quick Missions drawer expands on click', quickChipsVisible);

  // Test Mission Logs Drawer Toggle
  await evalExpr('document.getElementById("mission-logs-toggle-btn").click()');
  await wait(200);
  const logTerminalMounted = await evalExpr('!!document.getElementById("mission-intelligence-console")');
  assert('Mission Logs drawer responds to toggle', logTerminalMounted);

  // Test AI Scanner Drawer Toggle
  await evalExpr('document.getElementById("ai-scanner-toggle-btn").click()');
  await wait(200);
  const aiPanelOpen = await evalExpr('!!document.getElementById("ai-object-detector-panel")');
  assert('AI Object Detector expands on header toggle', aiPanelOpen);

  // Close AI Scanner Drawer
  await evalExpr('document.getElementById("ai-scanner-toggle-btn").click()');
  await wait(200);
  const aiPanelClosed = await evalExpr('!document.getElementById("ai-object-detector-panel")');
  assert('AI Object Detector collapses cleanly', aiPanelClosed);

  // Test Help Modal
  await evalExpr('document.getElementById("help-popover-btn").click()');
  await wait(200);
  const helpOpen = await evalExpr('document.body.innerText.includes("NAVIMIND CONTROLS GUIDE")');
  assert('Controls guide modal opens on "?" click', helpOpen);

  // Close Help Modal
  await evalExpr(`
    (function() {
      const modal = document.querySelector('[style*="position: fixed"]');
      if (modal) modal.click();
    })()
  `);
  await wait(200);
  const helpClosed = await evalExpr('!document.body.innerText.includes("NAVIMIND CONTROLS GUIDE")');
  assert('Controls guide modal closes cleanly', helpClosed);

  // ================================================================
  // SECTION 5: NON-TRIVIAL MULTI-ROOM FETCH MISSION
  // ================================================================
  console.log('\n--- SECTION 5: NON-TRIVIAL MULTI-ROOM FETCH MISSION ---');

  // Teleport BD-1 far away in Master Bedroom
  await evalExpr(`
    (function() {
      const bedPos = [-1.75, 0.24, -3.20];
      window.__simStore.getState().setRobotWorldPos(bedPos);
      window.__simStore.getState().setCurrentRoom('bedroom');
      return bedPos;
    })()
  `);
  await wait(500);

  const startFetchPos = await evalExpr('window.__robotDebug.pos');
  console.log(`  Starting non-trivial FETCH test from Bedroom: (${startFetchPos?.x?.toFixed(2)}, ${startFetchPos?.y?.toFixed(2)}, ${startFetchPos?.z?.toFixed(2)})`);

  const fetchMission = await evalExpr(`
    (async function() {
      return await window.__missionController.submitCommand("Bring me the remote");
    })()
  `);
  const fetchId = fetchMission?.id;
  assert('FETCH command dispatched from Master Bedroom', !!fetchId, `id=${fetchId}`);

  let fetchPassed = false;
  let fetchFinalState = null;
  let maxTraversedDist = 0;

  for (let s = 0; s < 80; s++) {
    await wait(400);
    const probe = await evalExpr(`
      (function() {
        const s = window.__simStore.getState();
        const m = (s.activeMission && s.activeMission.id === "${fetchId}")
          ? s.activeMission
          : (s.missionHistory.find(x => x.id === "${fetchId}") || null);
        const r = window.__robotDebug;
        return {
          mission: m,
          pos: r?.pos,
          currentRoom: s.currentRoom,
          navStatus: s.navigationStatus
        };
      })()
    `);

    fetchFinalState = probe?.mission?.state;
    if (probe?.pos) {
      const distFromStart = Math.hypot(probe.pos.x - startFetchPos.x, probe.pos.z - startFetchPos.z);
      if (distFromStart > maxTraversedDist) maxTraversedDist = distFromStart;
    }

    if (s % 10 === 0) {
      console.log(`    [FETCH progress ${(s*0.4).toFixed(1)}s] state=${fetchFinalState}, room=${probe?.currentRoom}, traversed=${maxTraversedDist.toFixed(2)}m`);
    }

    if (probe?.mission?.state === 'READY_FOR_PICKUP') {
      fetchPassed = true;
      console.log(`  Non-trivial FETCH reached READY_FOR_PICKUP in ${(s * 0.4).toFixed(1)}s! Traversed: ${maxTraversedDist.toFixed(2)}m`);
      break;
    }
  }

  assert('Non-trivial multi-room FETCH reaches READY_FOR_PICKUP', fetchPassed, `FinalState=${fetchFinalState}`);
  assert('BD-1 traversed multi-room distance (>3.5m) to coffee table', maxTraversedDist > 3.5, `traversed=${maxTraversedDist.toFixed(2)}m`);

  // Verify remote table target distance
  const tableDist = await evalExpr(`
    (function() {
      const r = window.__robotDebug?.pos;
      // Coffee table remote waypoint: [-1.00, 0.24, 2.50]
      return Math.hypot(r.x - (-1.00), r.z - 2.50);
    })()
  `);
  assert('BD-1 arrived at table approach waypoint (<1.0m)', tableDist < 1.0, `tableDist=${tableDist?.toFixed(2)}m`);

  // ================================================================
  // SECTION 6: PHASE 1 & 2 REGRESSIONS
  // ================================================================
  console.log('\n--- SECTION 6: REGRESSION TESTS (TAKEOVER & LOCOMOTION) ---');

  // Takeover test: dispatch keydown 'w' to cancel AUTO mode
  await evalExpr(`
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'w', bubbles: true }));
  `);
  await wait(400);

  const takeoverState = await evalExpr(`
    (function() {
      const s = window.__simStore.getState();
      return {
        searchMode: s.searchMode,
        autoScan: s.autoScan,
        activeMission: s.activeMission
      };
    })()
  `);
  assert('Manual keypress switches searchMode to MANUAL', takeoverState?.searchMode === 'MANUAL');
  assert('Manual keypress cancels AUTO scan', takeoverState?.autoScan === false);

  await evalExpr(`
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', key: 'w', bubbles: true }));
  `);

  // ================================================================
  // FINAL SUMMARY REPORT
  // ================================================================
  console.log('\n================================================================');
  console.log('   PHASE 3.5 VERIFICATION SUMMARY REPORT                        ');
  console.log('================================================================');

  const total = testResults.length;
  const passed = testResults.filter(r => r.passed).length;
  const failed = testResults.filter(r => !r.passed);

  console.log(`TOTAL TESTS:  ${total}`);
  console.log(`PASSED:       ${passed}`);
  console.log(`FAILED:       ${failed.length}`);

  if (failed.length > 0) {
    console.log('\nFailed Tests:');
    failed.forEach(f => console.log(`  - ${f.name}: ${f.details}`));
  }

  ws.close();
  chromeProc.kill();

  if (failed.length === 0) {
    console.log('\n>>> PHASE 3.5 CAMERA DIRECTOR & HUD ACCESSIBILITY: 100% PASS <<<');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
