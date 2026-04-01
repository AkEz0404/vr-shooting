const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const weapon = document.getElementById("weapon-overlay");

const hitCanvas = document.createElement("canvas");
const hitCtx = hitCanvas.getContext("2d");
hitCanvas.width = canvas.width;
hitCanvas.height = canvas.height;

const hitmapCanvas = document.getElementById("hitmapCanvas");
const hitmapCtx = hitmapCanvas.getContext("2d");

const ASSETS = {
  bg: new Image(),
  explosion: new Image(),
  bulletMark: new Image(),
  bulletIcon: new Image(),
  guidingBulletIcon: new Image(),
  gunshot: new Audio("ak74_shot.mp3"),
};
ASSETS.bg.src = "secondShootingBg.jpg";
ASSETS.explosion.src = "explosion.png";
ASSETS.bulletMark.src = "bullet_mark.png";
ASSETS.bulletIcon.src = "bullet.png";
ASSETS.guidingBulletIcon.src = "bullet_guiding.png";
ASSETS.gunshot.load();

/** * CONSTANTS & SETTINGS */
const T10_CONFIG = { x: 800, y: 425 };
const T8_CONFIG = {
  startX: 400,
  startY: 275,
  moveX: 200,
  moveY: 92,
  scaleMin: 0.75,
  scaleMax: 1.25,
  spacing: 12,
};
const T3_CONFIG = { x: 100, y: 400 }; // Added Stage 3 Position

const PHASE_SETTINGS = {
  TARGET_8: {
    duration: 20000,
    targetFn: drawTargetN8,
    center: { x: T8_CONFIG.startX, y: T8_CONFIG.startY },
  },
  DIALOG_1: { duration: 3000, nextTarget: "T10_R1", text: "Atyş dowam edýär" },

  // Stage 2
  T10_R1: {
    duration: 10000,
    targetFn: drawTargetN10,
    center: { x: T10_CONFIG.x, y: T10_CONFIG.y },
  },
  T7_R1: {
    duration: 10000,
    targetFn: drawTargetN7,
    center: { x: 500, y: 300 },
  },
  T10_R2: {
    duration: 10000,
    targetFn: drawTargetN10,
    center: { x: T10_CONFIG.x, y: T10_CONFIG.y },
  },
  T7_R2: {
    duration: 10000,
    targetFn: drawTargetN7,
    center: { x: 500, y: 300 },
  },

  STAGE2_BREAK: { duration: 5000, targetFn: null },

  DIALOG_2: {
    duration: 3000,
    nextTarget: "TARGET_3",
    text: "Atyş dowam edýär",
  },
  TARGET_3: {
    duration: 15000,
    targetFn: drawTargetN7,
    center: { x: T3_CONFIG.x, y: T3_CONFIG.y },
  },
  FINISHED: { duration: 0, targetFn: null },
};

const SETTINGS = {
  worldScale: 3, // Back to original scale so parallax matches old feel
  weaponAim: { x: 638.5, y: 464 },
  explosionSize: 250,
  explosionDuration: 2,
  recoilPower: 75,
  recoilRecovery: 0.9,
  fireRate: 150,
};

const state = {
  mouseX: 0,
  mouseY: 0,
  recoil: 0,
  isMouseInside: false,
  isMouseDown: false,
  bgOffset: { x: 0, y: 0 },
  sway: { x: 0, y: 0 },
  breathTime: 0,
  shake: 0,
  explosion: { active: false, x: 0, y: 0, timer: 0 },
  phase: "TARGET_8",
  target10Hit: false,
  target7Hit: false,
  target3Hit: false,
  nextAfterBreak: null,
  target8Animation: 0,
  phaseStartTime: Date.now(),
  isFiring: false,
  fireInterval: null,
  ammo: 30, // Updated to 30
  bulletMarks: [],
  targetsHit: [false, false],
  finishTriggered: false,
  gunPosition: 0,
  visualGunPos: 0,
};

/** * EVENT LISTENERS */
canvas.addEventListener("mouseenter", () => (state.isMouseInside = true));
canvas.addEventListener("mouseleave", () => (state.isMouseInside = false));

window.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  // Clamping to keep weapon inside canvas
  const rawX = e.clientX - rect.left;
  const rawY = e.clientY - rect.top;
  state.mouseX = Math.max(0, Math.min(canvas.width, rawX));
  state.mouseY = Math.max(0, Math.min(canvas.height, rawY));
});

canvas.addEventListener("mousedown", () => {
  state.isMouseDown = true;
  startFiring();
});

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") {
    state.gunPosition = Math.min(1, state.gunPosition + 1);
  } else if (e.key === "ArrowLeft") {
    state.gunPosition = Math.max(-1, state.gunPosition - 1);
  }
});

window.addEventListener("mouseup", () => {
  state.isMouseDown = false;
  stopFiring();
});

/** * CORE LOGIC */
function startFiring() {
  if (state.isFiring || state.ammo <= 0 || state.phase.includes("DIALOG"))
    return;
  state.isFiring = true;
  handleShoot();
  state.fireInterval = setInterval(handleShoot, SETTINGS.fireRate);
}

function stopFiring() {
  state.isFiring = false;
  clearInterval(state.fireInterval);
  state.fireInterval = null;
}

function handleShoot() {
  if (
    state.phase.includes("DIALOG") ||
    state.phase === "FINISHED" ||
    state.ammo <= 0
  ) {
    stopFiring();
    return;
  }

  ASSETS.gunshot.currentTime = 0;
  ASSETS.gunshot.play().catch(() => {});

  state.ammo--;
  state.recoil = SETTINGS.recoilPower;

  const shotX = SETTINGS.weaponAim.x + state.sway.x;
  const shotY = SETTINGS.weaponAim.y + state.sway.y;
  const hitRelX = shotX + state.bgOffset.x;
  const hitRelY = shotY + state.bgOffset.y;

  state.explosion = {
    active: true,
    x: shotX,
    y: shotY,
    timer: SETTINGS.explosionDuration,
  };

  hitCtx.clearRect(0, 0, hitCanvas.width, hitCanvas.height);
  renderActiveTargets(hitCtx);
  const pixel = hitCtx.getImageData(shotX, shotY, 1, 1).data;
  const isHit = pixel[3] > 0;

  if (isHit) {
    if (state.phase.startsWith("T10") || state.phase.startsWith("T7")) {
      if (state.phase.startsWith("T10")) state.target10Hit = true;
      if (state.phase.startsWith("T7")) state.target7Hit = true;

      stopFiring();
      setTimeout(() => {
        // Force the current phase to end immediately
        state.phaseStartTime = 0;
        updatePhases();
      }, 1000);
    }

    // Handling Target 3
    if (state.phase === "TARGET_3") {
      state.target3Hit = true;
      stopFiring();
      setTimeout(() => {
        triggerFinish();
      }, 1000);
    }

    // Handling Target 8 (Stage 1)
    if (state.phase === "TARGET_8") {
      const targetX =
        T8_CONFIG.startX + T8_CONFIG.moveX * state.target8Animation;
      if (hitRelX < targetX) state.targetsHit[0] = true;
      else state.targetsHit[1] = true;

      if (state.targetsHit[0] && state.targetsHit[1]) {
        setTimeout(() => stopFiring(), 500);
        setTimeout(() => {
          if (state.phase === "TARGET_8") {
            transitionTo("DIALOG_1");
            state.phaseStartTime = Date.now();
          }
        }, 1000);
      }
    }
  }

  state.bulletMarks.push({ relX: hitRelX, relY: hitRelY, isTargetHit: isHit });

  if (state.ammo <= 0) {
    stopFiring();
    setTimeout(triggerFinish, 1000);
  }
}

function updatePhases() {
  if (state.ammo <= 0 || state.phase === "FINISHED") return;
  const elapsed = Date.now() - state.phaseStartTime;
  const config = PHASE_SETTINGS[state.phase];

  if (elapsed >= config.duration) {
    let nextPhase;

    // helper to find the next logical target or dialog
    const getNextStep = (current) => {
      if (current === "TARGET_8") return "DIALOG_1";
      if (current === "DIALOG_1") return "T10_R1";

      // Stage 2 sequence logic
      if (current === "T10_R1") return state.target7Hit ? "T10_R2" : "T7_R1";
      if (current === "T7_R1") {
        if (!state.target10Hit) return "T10_R2";
        if (!state.target7Hit) return "T7_R2";
        return "DIALOG_2";
      }
      if (current === "T10_R2") return state.target7Hit ? "DIALOG_2" : "T7_R2";
      if (current === "T7_R2") return "DIALOG_2";

      if (current === "DIALOG_2") return "TARGET_3";
      if (current === "TARGET_3") return "FINISHED";
      return null;
    };

    if (state.phase === "STAGE2_BREAK") {
      nextPhase = state.nextAfterBreak;
    } else {
      const potentialNext = getNextStep(state.phase);

      // Only insert STAGE2_BREAK if we are switching between targets in Stage 2
      const isCurrentlyTarget =
        state.phase.startsWith("T10") || state.phase.startsWith("T7");
      const isNextTarget =
        potentialNext &&
        (potentialNext.startsWith("T10") || potentialNext.startsWith("T7"));

      if (isCurrentlyTarget && isNextTarget) {
        nextPhase = "STAGE2_BREAK";
        state.nextAfterBreak = potentialNext;
      } else {
        nextPhase = potentialNext;
      }
    }

    if (nextPhase === "FINISHED") {
      triggerFinish();
      return;
    }

    if (nextPhase) {
      transitionTo(nextPhase);
      state.phaseStartTime = Date.now();
    }
  }
}

function transitionTo(next) {
  state.phase = next;
  const d = document.getElementById("game-dialog");
  const config = PHASE_SETTINGS[next];

  // Show dialog ONLY if the phase has text defined (like DIALOG_1 or DIALOG_2)
  if (config && config.text) {
    d.style.display = "flex";
    d.querySelector("h2").innerText = config.text;
  } else {
    d.style.display = "none";
  }
}

function updateParallax() {
  if (!state.isMouseInside) return;
  // This uses the old math for a worldScale of 2
  const maxScrollX = canvas.width * SETTINGS.worldScale - canvas.width;
  const maxScrollY = canvas.height * SETTINGS.worldScale - canvas.height;
  state.bgOffset.x = (state.mouseX / canvas.width - 0.5) * maxScrollX;
  state.bgOffset.y = (state.mouseY / canvas.height - 0.5) * maxScrollY;
}

function updateWeaponSway() {
  if (!weapon) return;

  // 1. Move visual position toward target position smoothly
  const slideSpeed = 0.05; // Adjust this (0.01 to 1.0) for faster/slower sliding
  state.visualGunPos += (state.gunPosition - state.visualGunPos) * slideSpeed;

  state.recoil *= SETTINGS.recoilRecovery;
  state.breathTime += 0.03;
  const tremor = Math.sin(state.breathTime * 5) * 2;

  // 2. Use the visualGunPos for the offset
  const positionOffset = state.visualGunPos * 300;

  state.sway.x =
    (state.mouseX - canvas.width / 2) / 30 +
    (Math.cos(state.breathTime) * 15 + tremor) +
    positionOffset;

  state.sway.y =
    (state.mouseY - canvas.height / 2) / 60 +
    (Math.sin(state.breathTime * 1.5) * 20 + tremor * 0.5) -
    state.recoil;

  weapon.style.transform = `translateX(calc(-50% + ${state.sway.x}px)) translateY(${state.sway.y}px) rotate(${state.recoil * -0.05}deg)`;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  updatePhases();
  updateParallax();
  updateWeaponSway();
  updateClockUI();

  let shakeX = 0,
    shakeY = 0; // Fixes your Uncaught ReferenceError
  if (state.shake > 0) {
    shakeX = (Math.random() - 0.5) * state.shake;
    shakeY = (Math.random() - 0.5) * state.shake;
    state.shake *= 0.85;
  }

  if (ASSETS.bg.complete) {
    const w = canvas.width * SETTINGS.worldScale;
    const h = canvas.height * SETTINGS.worldScale;
    ctx.drawImage(
      ASSETS.bg,
      (canvas.width - w) / 2 - state.bgOffset.x + shakeX,
      (canvas.height - h) / 2 - state.bgOffset.y + shakeY,
      w,
      h,
    );
  }

  renderActiveTargets(ctx);
  drawHitmap();

  if (state.explosion.active) {
    const s = SETTINGS.explosionSize;
    ctx.drawImage(
      ASSETS.explosion,
      state.explosion.x - s / 2,
      state.explosion.y - s / 2,
      s,
      s,
    );
    if (--state.explosion.timer <= 0) state.explosion.active = false;
  }

  if (state.phase === "TARGET_8") {
    const elapsed = Date.now() - state.phaseStartTime;
    state.target8Animation =
      1 - Math.abs(1 - (elapsed / PHASE_SETTINGS.TARGET_8.duration) * 2);
  }

  drawAmmoCounter(ctx);
  requestAnimationFrame(draw);
}

function drawAmmoCounter(tCtx) {
  if (!ASSETS.bulletIcon.complete) return;
  const spacingX = 20;
  const spacingY = 82.5; // Distance between rows

  for (let i = 0; i < state.ammo; i++) {
    const row = Math.floor(i / 15); // 0 for first 15, 1 for next 15
    const col = i % 15;
    const isTracer = (i + 1) % 3 == 0;
    const img = isTracer ? ASSETS.guidingBulletIcon : ASSETS.bulletIcon;

    // We subtract (row * spacingY) to make row 1 appear ABOVE row 0
    // Base height is canvas.height - 100 (bottom row)
    const drawY = canvas.height - 80 - row * spacingY;

    tCtx.drawImage(img, 5 + col * spacingX, drawY, 20, 80);
  }
}

function drawTargetN10(tCtx) {
  // If hit, don't draw (unless it's the hitmap/ghost outline)
  if (state.target10Hit && tCtx !== hitmapCtx) return;

  const ax = T10_CONFIG.x - state.bgOffset.x;
  const ay = T10_CONFIG.y - state.bgOffset.y;
  tCtx.save();
  tCtx.fillStyle = "rgb(16, 153, 119)";
  tCtx.beginPath();
  tCtx.moveTo(ax, ay);
  tCtx.lineTo(ax + 18.75, ay);
  tCtx.lineTo(ax + 18.75, ay - 9.25);
  tCtx.lineTo(ax + 16.25, ay - 9.25);
  tCtx.lineTo(ax + 16.25, ay - 13.75);
  tCtx.lineTo(ax + 9.25, ay - 13.75);
  tCtx.lineTo(ax + 9.25, ay - 8.75);
  tCtx.lineTo(ax + 2.5, ay - 8.75);
  tCtx.lineTo(ax + 2.5, ay - 5.75);
  tCtx.lineTo(ax, ay - 5.75);
  tCtx.closePath();
  tCtx.fill();
  tCtx.strokeStyle = "white";
  tCtx.stroke();
  tCtx.restore();
}

function drawTargetN7(tCtx, x = 500, y = 300) {
  // 1. Determine which hit state to check based on the current phase
  const isStage3 = state.phase === "TARGET_3";
  const isHit = isStage3 ? state.target3Hit : state.target7Hit;

  // 2. Only skip drawing if the target for THIS specific stage was hit
  // (We allow it to draw if tCtx is the hitmapCtx so the ghost outline stays visible)
  if (isHit && tCtx !== hitmapCtx && !state.phase.includes("DIALOG")) return;

  const ax = tCtx === hitmapCtx ? 0 : x - state.bgOffset.x;
  const ay = tCtx === hitmapCtx ? 0 : y - state.bgOffset.y;

  tCtx.save();
  tCtx.fillStyle = "rgb(16, 153, 119)";
  tCtx.beginPath();
  tCtx.moveTo(ax, ay);
  tCtx.lineTo(ax + 12.5, ay);
  tCtx.lineTo(ax + 12.5, ay - 18.75);
  tCtx.lineTo(ax + 9.125, ay - 18.75);
  tCtx.lineTo(ax + 9.125, ay - 25);
  tCtx.lineTo(ax + 3.375, ay - 25);
  tCtx.lineTo(ax + 3.375, ay - 18.75);
  tCtx.lineTo(ax, ay - 18.75);
  tCtx.closePath();
  tCtx.fill();
  tCtx.strokeStyle = "white";
  tCtx.stroke();
  tCtx.restore();
}

function drawTargetN8(tCtx) {
  const progress = state.target8Animation || 0;
  const currentScale =
    T8_CONFIG.scaleMin + (T8_CONFIG.scaleMax - T8_CONFIG.scaleMin) * progress;

  // 1. Calculate the static start and end points for the path line
  const startX = T8_CONFIG.startX - state.bgOffset.x;
  const startY = T8_CONFIG.startY - state.bgOffset.y;
  const endX = T8_CONFIG.startX + T8_CONFIG.moveX - state.bgOffset.x;
  const endY = T8_CONFIG.startY + T8_CONFIG.moveY - state.bgOffset.y;

  // 2. Draw the Path Line (only if not drawing on the hitmap)
  if (tCtx !== hitmapCtx) {
    tCtx.save();
    tCtx.beginPath();
    tCtx.moveTo(startX, startY);
    tCtx.lineTo(endX, endY);
    tCtx.strokeStyle = "rgba(255, 255, 255, 0.3)"; // Semi-transparent white
    tCtx.setLineDash([5, 5]); // Optional: makes it a dashed line
    tCtx.lineWidth = 2;
    tCtx.stroke();
    tCtx.restore();
  }

  // 3. Logic for the moving targets
  let centerX, centerY;
  if (tCtx === hitmapCtx) {
    centerX = 0;
    centerY = 0;
  } else {
    centerX = T8_CONFIG.startX + T8_CONFIG.moveX * progress - state.bgOffset.x;
    centerY = T8_CONFIG.startY + T8_CONFIG.moveY * progress - state.bgOffset.y;
  }

  const drawShape = (offsetX, isHit) => {
    if (isHit && tCtx !== hitmapCtx) return;

    tCtx.save();
    tCtx.translate(centerX + offsetX * currentScale, centerY);
    tCtx.scale(currentScale, currentScale);

    tCtx.beginPath();
    tCtx.moveTo(0, 0);
    tCtx.lineTo(6.25, 0);
    tCtx.lineTo(9.375, -12.5);
    tCtx.lineTo(9.375, -33);
    tCtx.lineTo(6, -33);
    tCtx.lineTo(6, -37.5);
    tCtx.lineTo(0.25, -37.5);
    tCtx.lineTo(0.25, -33);
    tCtx.lineTo(-3.25, -33);
    tCtx.lineTo(-3.25, -12.5);
    tCtx.closePath();
    tCtx.fill();
    tCtx.strokeStyle = "white";
    tCtx.stroke();

    if (tCtx === hitmapCtx) {
      tCtx.strokeStyle = "lime";
      tCtx.lineWidth = 0.5;
      tCtx.stroke();
    }
    tCtx.restore();
  };

  tCtx.save();
  tCtx.fillStyle = "rgb(16, 153, 119)";
  drawShape(-T8_CONFIG.spacing, state.targetsHit[0]);
  drawShape(T8_CONFIG.spacing, state.targetsHit[1]);
  tCtx.restore();
}

function drawThirdTarget(tCtx) {
  if (state.target3Hit && tCtx !== hitmapCtx) return;
  const ax = T3_CONFIG.x - (tCtx === hitmapCtx ? 0 : state.bgOffset.x);
  const ay = T3_CONFIG.y - (tCtx === hitmapCtx ? 0 : state.bgOffset.y);
  tCtx.fillStyle = "#2d372d";
  tCtx.fillRect(ax - 20, ay - 60, 40, 60);
}

function renderActiveTargets(tCtx) {
  const config = PHASE_SETTINGS[state.phase];
  if (config && config.targetFn) {
    // Check if the current phase has a "center" (like T10 or T3)
    if (config.center) {
      // Pass tCtx AND the specific x/y coordinates to the function
      config.targetFn(tCtx, config.center.x, config.center.y);
    } else {
      // For phases like TARGET_8 which handle their own internal math
      config.targetFn(tCtx);
    }
  }
}

function drawHitmap() {
  hitmapCtx.clearRect(0, 0, hitmapCanvas.width, hitmapCanvas.height);

  // 1. Draw the Grid
  hitmapCtx.strokeStyle = "rgba(0, 255, 0, 0.1)";
  for (let i = 0; i < hitmapCanvas.width; i += 20) {
    hitmapCtx.beginPath();
    hitmapCtx.moveTo(i, 0);
    hitmapCtx.lineTo(i, hitmapCanvas.height);
    hitmapCtx.stroke();
    hitmapCtx.beginPath();
    hitmapCtx.moveTo(0, i);
    hitmapCtx.lineTo(hitmapCanvas.width, i);
    hitmapCtx.stroke();
  }

  // 2. Draw the Ghost Target (The green outline)
  let viewPhase = state.phase;
  if (state.phase.includes("DIALOG")) {
    // Show Target 8 if in first break, Target 10 if in second break
    viewPhase = state.phase === "DIALOG_1" ? "TARGET_8" : "TARGET_10";
  }

  const config = PHASE_SETTINGS[viewPhase];
  if (config && config.center) {
    hitmapCtx.save();
    hitmapCtx.translate(hitmapCanvas.width / 2, hitmapCanvas.height / 2 + 20);
    hitmapCtx.scale(1.5, 1.5);

    // Dim the ghost during dialogs
    hitmapCtx.strokeStyle = state.phase.includes("DIALOG")
      ? "rgba(0, 255, 0, 0.2)"
      : "rgba(0, 255, 0, 0.5)";

    const realOffset = { ...state.bgOffset };
    state.bgOffset.x = config.center.x;
    state.bgOffset.y = config.center.y;
    if (config.targetFn) config.targetFn(hitmapCtx);
    state.bgOffset = realOffset;
    hitmapCtx.restore();
  }

  // 3. Draw the Bullet Hits
  state.bulletMarks.forEach((m) => {
    let mapX, mapY;
    const centerW = hitmapCanvas.width / 2;
    const centerH = hitmapCanvas.height / 2 + 20;

    if (state.phase === "TARGET_8") {
      const p = state.target8Animation;
      const animX = T8_CONFIG.startX + T8_CONFIG.moveX * p;
      const animY = T8_CONFIG.startY + T8_CONFIG.moveY * p;
      mapX = (m.relX - animX) * 1.5 + centerW;
      mapY = (m.relY - animY) * 1.5 + centerH;
    } else if (state.phase.includes("T10")) {
      mapX = (m.relX - T10_CONFIG.x) * 1.5 + centerW;
      mapY = (m.relY - T10_CONFIG.y) * 1.5 + centerH;
    } else if (state.phase.includes("T7")) {
      mapX = (m.relX - 500) * 1.5 + centerW;
      mapY = (m.relY - 300) * 1.5 + centerH;
    } else if (state.phase === "TARGET_3") {
      mapX = (m.relX - T3_CONFIG.x) * 1.5 + centerW;
      mapY = (m.relY - T3_CONFIG.y) * 1.5 + centerH;
    } else {
      mapX = (m.relX - T10_CONFIG.x) * 1.5 + centerW;
      mapY = (m.relY - T10_CONFIG.y) * 1.5 + centerH;
    }

    hitmapCtx.fillStyle = m.isTargetHit ? "red" : "orange";
    hitmapCtx.beginPath();
    hitmapCtx.arc(mapX, mapY, 2, 0, Math.PI * 2);
    hitmapCtx.fill();
  });
}

function updateClockUI() {
  const display = document.getElementById("time-display");
  const circle = document.querySelector(".progress-ring__circle");
  if (!display || !circle) return;

  if (state.phase === "TARGET_8" && state.targetsHit[0] && state.targetsHit[1])
    return;

  const elapsed = Date.now() - state.phaseStartTime;
  const config = PHASE_SETTINGS[state.phase];
  if (!config) return;

  const limit = config.duration;
  const remain = Math.max(0, limit - elapsed);
  const sec = Math.ceil(remain / 1000);

  display.textContent = sec;

  // Warning logic
  const isWarn = sec < 5 && !state.phase.includes("DIALOG");
  display.classList.toggle("warning", isWarn);
  circle.setAttribute("stroke", isWarn ? "red" : "green");

  // Progress ring logic (assuming 90px radius)
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  circle.style.strokeDashoffset =
    circumference - (remain / (limit || 1)) * circumference;
}

function triggerFinish() {
  if (state.phase === "FINISHED") return;
  state.phase = "FINISHED";
  stopFiring();

  // 1. Calculate hits per phase
  const phase1Hits = state.targetsHit.filter((h) => h).length; // Max 2 (Target 8)
  const phase2Hits = (state.target10Hit ? 1 : 0) + (state.target7Hit ? 1 : 0); // Max 2 (T10 & T7)
  const phase3Hits = state.target3Hit ? 1 : 0; // Max 1 (T3)

  const totalHits = phase1Hits + phase2Hits + phase3Hits;

  // 2. Grading Logic
  let grade = 2; // Default (0 hits)

  if (totalHits === 5) {
    // All targets hit
    grade = 5;
  } else if (phase1Hits === 2 && phase2Hits === 2) {
    // Both Phase 1 and Both Phase 2 hit (Total 4)
    grade = 4;
  } else if (totalHits >= 1) {
    // Any target hit
    grade = 3;
  }

  // 3. Update UI
  const d = document.getElementById("game-dialog");
  if (d) {
    d.style.display = "flex";
    d.querySelector(".dialog-content").innerHTML = `
      <h2>ATYŞ TAMAMLANDY!</h2>
      <p>NYŞANLAR: ${totalHits} / 5<br>BAHA: <span class="grade-output">${grade}</span></p>
      <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
        <button onclick="location.reload()">TÄZEDEN BAŞLA</button>
        <button onclick="window.location.href='secondSession.html'">YZA</button>
      </div>
    `;
  }
}

draw();
