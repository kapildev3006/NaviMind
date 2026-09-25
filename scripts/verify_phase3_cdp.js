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
  console.log('   PHASE 3: COMMAND UNDERSTANDING & MISSION INTELLIGENCE SUITE  ');
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
  await wait(2500);

  async function evalExpr(expr) {
    const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (res?.exceptionDetails) {
      console.error('CDP EVAL EXCEPTION:', res.exceptionDetails.text, res.exceptionDetails.exception?.description);
    }
    return res?.result?.value;
  }

  console.log('Waiting for simulation, store, and MissionController to initialize...');
  let initialized = false;
  for (let i = 0; i < 60; i++) {
    await wait(800);
    const probe = await evalExpr(`
      (function() {
        return {
          hasSimStore: typeof window !== 'undefined' && !!window.__simStore,
          hasMissionCtrl: typeof window !== 'undefined' && !!window.__missionController,
          hasNavDebug: typeof window !== 'undefined' && !!window.__navDebug,
          readyState: typeof document !== 'undefined' ? document.readyState : 'none',
          title: typeof document !== 'undefined' ? document.title : 'none'
        };
      })()
    `);

    if (probe?.hasSimStore && probe?.hasMissionCtrl && probe?.hasNavDebug) {
      initialized = true;
      console.log(`Mission Intelligence system initialized after ${(i * 0.8).toFixed(1)}s! (${JSON.stringify(probe)})`);
      break;
    } else if (i % 5 === 0) {
      console.log(`Waiting for 3D simulation to mount... Probe status: ${JSON.stringify(probe)}`);
    }
  }

  if (!initialized) {
    const bodyText = await evalExpr('document.body ? document.body.innerText : "no body"');
    console.error('FAILED TO INITIALIZE MISSION SYSTEM. Body text sample:', bodyText?.substring(0, 300));
    ws.close();
    chromeProc.kill();
    return;
  }

  const testResults = [];
  function assert(name, condition, details = '') {
    if (condition) {
      console.log(`  [PASS] ${name} ${details ? '(' + details + ')' : ''}`);
      testResults.push({ name, pass: true, details });
    } else {
      console.error(`  [FAIL] ${name} ${details ? '(' + details + ')' : ''}`);
      testResults.push({ name, pass: false, details });
    }
  }

  // ================================================================
  // SECTION 1: DETERMINISTIC PARSER & VALIDATOR UNIT TESTS
  // ================================================================
  console.log('\n--- SECTION 1: PARSER & VALIDATOR TESTS ---');

  const parserTests = [
    { cmd: 'Find the fire extinguisher', expIntent: 'FIND', expTarget: 'fire_extinguisher_01', expValid: true },
    { cmd: 'locate TV', expIntent: 'FIND', expTarget: 'smart_tv_console', expValid: true },
    { cmd: 'fire extinguisher dhoondo', expIntent: 'FIND', expTarget: 'fire_extinguisher_01', expValid: true },
    { cmd: 'Go to the TV', expIntent: 'NAVIGATE', expTarget: 'smart_tv_console', expValid: true },
    { cmd: 'move to breaker panel', expIntent: 'NAVIGATE', expTarget: 'power_distribution', expValid: true },
    { cmd: 'TV ke paas jao', expIntent: 'NAVIGATE', expTarget: 'smart_tv_console', expValid: true },
    { cmd: 'get to the TV', expIntent: 'NAVIGATE', expTarget: 'smart_tv_console', expValid: true },
    { cmd: 'Inspect smoke detector', expIntent: 'INSPECT', expTarget: 'smoke_detector_alpha', expValid: true },
    { cmd: 'check breaker panel', expIntent: 'INSPECT', expTarget: 'power_distribution', expValid: true },
    { cmd: 'smoke detector check karo', expIntent: 'INSPECT', expTarget: 'smoke_detector_alpha', expValid: true },
    { cmd: 'Bring me the remote', expIntent: 'FETCH', expTarget: 'tv_remote_control', expValid: true },
    { cmd: 'fetch remote', expIntent: 'FETCH', expTarget: 'tv_remote_control', expValid: true },
    { cmd: 'get the remote', expIntent: 'FETCH', expTarget: 'tv_remote_control', expValid: true },
    { cmd: 'remote leke aao', expIntent: 'FETCH', expTarget: 'tv_remote_control', expValid: true },
    // Rejections and ambiguities
    { cmd: 'Find laptop', expIntent: 'FIND', expTarget: null, expValid: false, desc: 'Rejects laptop (must not match cooktop)' },
    { cmd: 'Bring me the TV', expIntent: 'FETCH', expTarget: 'smart_tv_console', expValid: false, desc: 'Rejects unsupported FETCH on wall-mounted TV' },
    { cmd: 'Dance around the room', expIntent: null, expTarget: null, expValid: false, desc: 'Rejects unknown intent' },
    { cmd: 'Find it', expIntent: 'FIND', expTarget: null, expValid: false, desc: 'Rejects intent with no target' },
    { cmd: 'fire extinguisher', expIntent: null, expTarget: 'fire_extinguisher_01', expValid: false, desc: 'Rejects target with no action' }
  ];

  for (const pt of parserTests) {
    const res = await evalExpr(`
      (async function() {
        const ctrl = window.__missionController;
        const parsed = await (ctrl.parse ? ctrl.parse("${pt.cmd}") : (ctrl.getProvider ? ctrl.getProvider().parse("${pt.cmd}") : ctrl.provider.parse("${pt.cmd}")));
        return {
          rawText: parsed.rawText,
          intent: parsed.intent,
          targetId: parsed.targetId,
          valid: parsed.valid,
          errors: parsed.errors,
          method: parsed.resolutionMethod
        };
      })()
    `);

    const intentMatches = res?.intent === pt.expIntent;
    const targetMatches = res?.targetId === pt.expTarget;
    const validMatches = res?.valid === pt.expValid;
    const overall = intentMatches && targetMatches && validMatches;

    assert(
      `Parser: "${pt.cmd}"`,
      overall,
      `Intent=${res?.intent}, Target=${res?.targetId}, Valid=${res?.valid}, Method=${res?.method}${pt.desc ? ' - ' + pt.desc : ''}`
    );
  }

  // ================================================================
  // SECTION 2: RUNTIME MISSION 1 — FIND THE FIRE EXTINGUISHER
  // ================================================================
  console.log('\n--- SECTION 2: RUNTIME FIND MISSION ---');
  const findMission = await evalExpr(`
    (async function() {
      return await window.__missionController.submitCommand("Find the fire extinguisher");
    })()
  `);
  const findId = findMission?.id;
  await wait(500);

  let findPassed = false;
  let findFinalState = null;
  for (let s = 0; s < 70; s++) {
    await wait(400);
    const m = await evalExpr(`
      (function() {
        const s = window.__simStore.getState();
        if (s.activeMission && s.activeMission.id === "${findId}") return s.activeMission;
        return s.missionHistory.find(x => x.id === "${findId}") || null;
      })()
    `);
    findFinalState = m?.state;
    if (s % 10 === 0) {
      const dbg = await evalExpr('window.__navDebug');
      console.log(`    [FIND progress ${(s*0.4).toFixed(1)}s] state=${findFinalState}, navStatus=${dbg?.navStatus}, room=${dbg?.currentRoom}`);
    }
    if (m?.state === 'COMPLETED') {
      findPassed = true;
      console.log(`  FIND completed in ${(s * 0.4).toFixed(1)}s! Result: ${m?.resultMessage}`);
      break;
    }
  }
  assert('FIND mission executes to COMPLETED', findPassed, `State=${findFinalState}`);

  // ================================================================
  // SECTION 3: RUNTIME MISSION 2 — NAVIGATE TO BEDROOM BED
  // ================================================================
  console.log('\n--- SECTION 3: RUNTIME NAVIGATE MISSION ---');
  const navMission = await evalExpr(`
    (async function() {
      return await window.__missionController.submitCommand("Go to bedroom bed");
    })()
  `);
  const navId = navMission?.id;
  await wait(500);

  let navPassed = false;
  let navFinalState = null;
  for (let s = 0; s < 70; s++) {
    await wait(400);
    const m = await evalExpr(`
      (function() {
        const s = window.__simStore.getState();
        if (s.activeMission && s.activeMission.id === "${navId}") return s.activeMission;
        return s.missionHistory.find(x => x.id === "${navId}") || null;
      })()
    `);
    navFinalState = m?.state;
    if (s % 10 === 0) {
      const dbg = await evalExpr('window.__navDebug');
      console.log(`    [NAVIGATE progress ${(s*0.4).toFixed(1)}s] state=${navFinalState}, navStatus=${dbg?.navStatus}, room=${dbg?.currentRoom}`);
    }
    if (m?.state === 'COMPLETED') {
      navPassed = true;
      console.log(`  NAVIGATE completed in ${(s * 0.4).toFixed(1)}s! Result: ${m?.resultMessage}`);
      break;
    }
  }
  assert('NAVIGATE mission executes to COMPLETED', navPassed, `State=${navFinalState}`);

  // ================================================================
  // SECTION 4: RUNTIME MISSION 3 — INSPECT SMOKE DETECTOR
  // ================================================================
  console.log('\n--- SECTION 4: RUNTIME INSPECT MISSION ---');
  const inspectMission = await evalExpr(`
    (async function() {
      return await window.__missionController.submitCommand("Inspect smoke detector");
    })()
  `);
  const inspectId = inspectMission?.id;
  await wait(500);

  let inspectPassed = false;
  let sawScanning = false;
  let sawInspecting = false;
  let inspectResult = null;

  for (let s = 0; s < 70; s++) {
    await wait(300);
    const m = await evalExpr(`
      (function() {
        const s = window.__simStore.getState();
        if (s.activeMission && s.activeMission.id === "${inspectId}") return s.activeMission;
        return s.missionHistory.find(x => x.id === "${inspectId}") || null;
      })()
    `);
    if (m?.state === 'SCANNING') sawScanning = true;
    if (m?.state === 'INSPECTING') sawInspecting = true;
    if (m?.state === 'COMPLETED') {
      inspectPassed = true;
      inspectResult = m?.inspectionResult;
      console.log(`  INSPECT completed in ${(s * 0.3).toFixed(1)}s! Status: ${inspectResult?.status}, Conf: ${inspectResult?.confidence}%`);
      break;
    }
  }
  const inspectLogs = await evalExpr('window.__simStore.getState().missionLog');
  const loggedScanning = inspectLogs?.some(l => l.missionId === inspectId && (l.message?.includes('sensor scan') || l.message?.includes('Scanning')));
  assert('INSPECT transitions through SCANNING state', sawScanning || loggedScanning);
  assert('INSPECT transitions through INSPECTING state', sawInspecting);
  assert('INSPECT executes to COMPLETED with valid telemetry', inspectPassed && !!inspectResult);

  // ================================================================
  // SECTION 5: RUNTIME MISSION 4 — HINGLISH "TV ke paas jao"
  // ================================================================
  console.log('\n--- SECTION 5: RUNTIME HINGLISH NAVIGATE ---');
  await evalExpr('window.__missionController.submitCommand("TV ke paas jao")');
  await wait(500);

  let hinglishPassed = false;
  for (let s = 0; s < 30; s++) {
    await wait(400);
    const m = await evalExpr('window.__simStore.getState().activeMission || window.__simStore.getState().missionHistory[0]');
    if (m?.state === 'COMPLETED') {
      hinglishPassed = true;
      console.log(`  Hinglish NAVIGATE completed in ${(s * 0.4).toFixed(1)}s!`);
      break;
    }
  }
  assert('Hinglish NAVIGATE "TV ke paas jao" reaches COMPLETED', hinglishPassed);

  // ================================================================
  // SECTION 6: RUNTIME MISSION 5 — UNKNOWN TARGET "Find laptop"
  // ================================================================
  console.log('\n--- SECTION 6: UNKNOWN TARGET REJECTION ---');
  const unknownRes = await evalExpr(`
    (async function() {
      const res = await window.__missionController.submitCommand("Find laptop");
      const store = window.__simStore.getState();
      return res || store.missionHistory[0];
    })()
  `);
  assert('Unknown target "Find laptop" returns state FAILED', unknownRes?.state === 'FAILED', `State=${unknownRes?.state}`);
  assert('Unknown target failureReason indicates target not in registry', unknownRes?.failureReason?.includes('not found in NaviMind target registry'), `Reason=${unknownRes?.failureReason}`);

  // ================================================================
  // SECTION 7: RUNTIME MISSION 6 — UNSUPPORTED FETCH "Bring me the TV"
  // ================================================================
  console.log('\n--- SECTION 7: UNSUPPORTED FETCH REJECTION ---');
  const unsupportedFetchRes = await evalExpr(`
    (async function() {
      const res = await window.__missionController.submitCommand("Bring me the TV");
      const store = window.__simStore.getState();
      return res || store.missionHistory[0];
    })()
  `);
  assert('Unsupported FETCH on TV returns state FAILED', unsupportedFetchRes?.state === 'FAILED', `State=${unsupportedFetchRes?.state}`);
  assert('Failure reason explains TV is not configured as retrievable', unsupportedFetchRes?.failureReason?.includes('not configured as a retrievable object'), `Reason=${unsupportedFetchRes?.failureReason}`);

  // ================================================================
  // SECTION 8: RUNTIME MISSION 7 — SUPPORTED FETCH "Bring me the remote"
  // ================================================================
  console.log('\n--- SECTION 8: SUPPORTED FETCH MISSION (Phase 3 Boundary) ---');
  // Teleport BD-1 to Hallway to guarantee a non-trivial route
  await evalExpr(`
    (function() {
      const store = window.__simStore.getState();
      store.setRobotWorldPos([-1.50, 0.24, 0.80]);
      if (window.__robotDebug) {
        // Position character in hallway
      }
    })()
  `);

  await evalExpr('window.__missionController.submitCommand("Bring me the remote")');
  await wait(500);

  let fetchPassed = false;
  let fetchState = null;
  let fetchResultMsg = null;

  for (let s = 0; s < 45; s++) {
    await wait(400);
    const m = await evalExpr('window.__simStore.getState().activeMission || window.__simStore.getState().missionHistory[0]');
    fetchState = m?.state;
    if (m?.state === 'READY_FOR_PICKUP') {
      fetchPassed = true;
      fetchResultMsg = m?.resultMessage;
      console.log(`  FETCH reached READY_FOR_PICKUP in ${(s * 0.4).toFixed(1)}s! Message: "${fetchResultMsg}"`);
      break;
    }
  }
  assert('Supported FETCH ends at READY_FOR_PICKUP (not COMPLETED)', fetchPassed && fetchState === 'READY_FOR_PICKUP');
  assert('Message indicates pickup is scheduled for Phase 7', fetchResultMsg?.includes('Phase 7'));

  // ================================================================
  // SECTION 9: RUNTIME MISSION 8 — MANUAL TAKEOVER CANCELLATION
  // ================================================================
  console.log('\n--- SECTION 9: MANUAL TAKEOVER CANCELLATION ---');
  await evalExpr('window.__missionController.submitCommand("Inspect smoke detector")');
  await wait(600); // Allow navigation to start

  // Trigger manual takeover
  await evalExpr('window.__missionController.handleManualTakeover()');
  await wait(200);

  const takeoverCheck = await evalExpr(`
    (function() {
      const s = window.__simStore.getState();
      const last = s.missionHistory[0];
      return {
        activeMission: s.activeMission,
        lastTerminalState: last?.state,
        lastFailureReason: last?.failureReason,
        navStatus: s.navigationStatus
      };
    })()
  `);

  assert('Manual takeover transitions mission to CANCELLED', takeoverCheck?.lastTerminalState === 'CANCELLED');
  assert('Cancellation reason records "Manual control takeover"', takeoverCheck?.lastFailureReason === 'Manual control takeover');

  // ================================================================
  // SECTION 10: RUNTIME MISSION 9 — ATOMIC COMMAND REPLACEMENT
  // ================================================================
  console.log('\n--- SECTION 10: ATOMIC COMMAND REPLACEMENT ---');
  await evalExpr('window.__missionController.submitCommand("Inspect smoke detector")');
  await wait(600); // Navigating mission A

  const missionAId = await evalExpr('window.__simStore.getState().activeMission?.id');
  console.log('Started Mission A ID:', missionAId);

  // Submit Mission B while Mission A is navigating
  await evalExpr('window.__missionController.submitCommand("Go to the TV")');
  await wait(300);

  const missionBState = await evalExpr(`
    (function() {
      const s = window.__simStore.getState();
      const hist = s.missionHistory;
      const oldMission = hist.find(m => m.id === "${missionAId}");
      const currOrLast = s.activeMission || hist[0];
      return {
        activeMissionId: s.activeMission?.id,
        activeIntent: currOrLast?.intent,
        activeTarget: currOrLast?.targetLabel,
        oldMissionState: oldMission?.state,
        oldMissionReason: oldMission?.failureReason
      };
    })()
  `);

  assert('Old mission is cancelled atomically', missionBState?.oldMissionState === 'CANCELLED');
  assert('Old mission cancelled with "Replaced by new command"', missionBState?.oldMissionReason === 'Replaced by new command');
  assert('New mission B is active with intent NAVIGATE', missionBState?.activeIntent === 'NAVIGATE');

  // Let Mission B finish
  let missionBCompleted = false;
  for (let s = 0; s < 30; s++) {
    await wait(400);
    const m = await evalExpr('window.__simStore.getState().activeMission || window.__simStore.getState().missionHistory[0]');
    if (m?.state === 'COMPLETED') {
      missionBCompleted = true;
      break;
    }
  }
  assert('Replacement mission completes cleanly without stale callback corruption', missionBCompleted);

  // ================================================================
  // SECTION 11: RUNTIME MISSION 10 — SCANNER FAILURE TIMEOUT
  // ================================================================
  console.log('\n--- SECTION 11: SENSOR TIMEOUT FAILURE TEST ---');
  await evalExpr('window.__missionController.setScanSuppressedForTesting(true)');
  await evalExpr('window.__missionController.submitCommand("Inspect smoke detector")');
  await wait(500);

  let scanFailTriggered = false;
  let scanFailReason = null;
  for (let s = 0; s < 65; s++) {
    await wait(300);
    const m = await evalExpr('window.__simStore.getState().activeMission || window.__simStore.getState().missionHistory[0]');
    if (m?.state === 'FAILED') {
      scanFailTriggered = true;
      scanFailReason = m?.failureReason;
      break;
    }
  }

  // Restore scanner
  await evalExpr('window.__missionController.setScanSuppressedForTesting(false)');

  assert('Scanner suppression triggers state FAILED after timeout', scanFailTriggered);
  assert('Failure reason records "Target could not be confirmed by scanner."', scanFailReason?.includes('Target could not be confirmed by scanner'));

  // ================================================================
  // SECTION 12: REGRESSION VERIFICATION
  // ================================================================
  console.log('\n--- SECTION 12: PHASE 1 & 2 REGRESSION ---');
  const regression = await evalExpr(`
    (function() {
      const s = window.__simStore.getState();
      const pos = s.robotWorldPos;
      return {
        groundY: pos[1],
        telemetry: s.robotTelemetry,
        room: s.currentRoom
      };
    })()
  `);

  assert('BD-1 vertical grounding remains stable (Y >= 0.20m)', regression?.groundY >= 0.20);
  assert('Current room tracking active', !!regression?.room);

  // Summary
  console.log('\n================================================================');
  const total = testResults.length;
  const passed = testResults.filter(r => r.pass).length;
  const failed = total - passed;
  console.log(`PHASE 3 TEST SUMMARY: ${passed}/${total} PASSED (${failed} FAILED)`);
  console.log('================================================================');

  ws.close();
  chromeProc.kill();

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
