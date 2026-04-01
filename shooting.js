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
ASSETS.bg.src = "iceland.jpg";
ASSETS.explosion.src = "explosion.png";
ASSETS.bulletMark.src = "bullet_mark.png";
ASSETS.bulletIcon.src = "bullet.png";
ASSETS.guidingBulletIcon.src = "bullet_guiding.png";
ASSETS.gunshot.load();

/** * CONSTANTS & SETTINGS
 */

const T10_CONFIG = {
  x: 800,
  y: 425,
};

const T8_CONFIG = {
  startX: 450,
  startY: 350,
  moveX: 125,
  moveY: 175,
  scaleMin: 0.75,
  scaleMax: 1.25,
  spacing: 12,
};

const PHASE_SETTINGS = {
  TARGET_10: {
    duration: 30000,
    targetFn: drawTargetN10,
    center: { x: T10_CONFIG.x, y: T10_CONFIG.y },
  },
  DIALOG: { duration: 5000, targetFn: null, nextTarget: "TARGET_8" },
  TARGET_8: {
    duration: 20000,
    targetFn: drawTargetN8,
    center: { x: T8_CONFIG.startX, y: T8_CONFIG.startY },
  },
  FINISHED: { duration: 0, targetFn: null },
};

const SETTINGS = {
  worldScale: 2,
  weaponAim: { x: 638.5, y: 464 },
  explosionSize: 250,
  explosionDuration: 2,
  recoilPower: 125,
  recoilRecovery: 0.95,
  fireRate: 150,
};

/** * GAME STATE
 */
const state = {
  mouseX: 0,
  mouseY: 0,
  recoil: 0,
  isMouseInside: false,
  isMouseDown: false, // Tracked for auto-restart
  bgOffset: { x: 0, y: 0 },
  sway: { x: 0, y: 0 },
  breathTime: 0,
  shake: 0,
  explosion: { active: false, x: 0, y: 0, timer: 0 },
  phase: "TARGET_10",
  target10Hit: false,
  target8Animation: 0,
  phaseStartTime: Date.now(),
  isFiring: false,
  fireInterval: null,
  ammo: 12,
  bulletMarks: [],
  targetsHit: [false, false],
  finishTriggered: false,
};

/** * EVENT LISTENERS
 */
canvas.addEventListener("mouseenter", () => (state.isMouseInside = true));
canvas.addEventListener("mouseleave", () => (state.isMouseInside = false));

window.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  state.mouseX = e.clientX - rect.left;
  state.mouseY = e.clientY - rect.top;
});

canvas.addEventListener("mousedown", () => {
  state.isMouseDown = true;
  startFiring();
});

window.addEventListener("mouseup", () => {
  state.isMouseDown = false;
  stopFiring();
});

/** * CORE LOGIC
 */
function startFiring() {
  if (state.isFiring || state.ammo <= 0) return;
  state.isFiring = true;
  handleShoot();
  state.fireInterval = setInterval(handleShoot, SETTINGS.fireRate);
}

function stopFiring() {
  state.isFiring = false;
  clearInterval(state.fireInterval);
  state.fireInterval = null;
}

function playShootSound() {
  // 1. Rewind to the start so we can "overlap" shots
  ASSETS.gunshot.currentTime = 0;

  // 2. Play the sound
  ASSETS.gunshot.play().catch((e) => console.log("Audio play blocked:", e));
}

function handleShoot() {
  if (
    state.phase === "DIALOG" ||
    state.phase === "FINISHED" ||
    state.ammo <= 0
  ) {
    stopFiring();
    return;
  }

  playShootSound();

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

  // Hit Detection
  hitCtx.clearRect(0, 0, hitCanvas.width, hitCanvas.height);
  renderActiveTargets(hitCtx);
  const pixel = hitCtx.getImageData(shotX, shotY, 1, 1).data;

  if (pixel[3] > 0) {
    // Phase 8 Logic
    if (state.phase === "TARGET_8") {
      const progress = state.target8Animation;
      const currentScale =
        T8_CONFIG.scaleMin +
        (T8_CONFIG.scaleMax - T8_CONFIG.scaleMin) * progress;

      const targetX = T8_CONFIG.startX + T8_CONFIG.moveX * progress;
      const targetY = T8_CONFIG.startY + T8_CONFIG.moveY * progress;

      const hitboxW = 10 * currentScale;
      const hitboxH = 20 * currentScale;
      const visualCenterY = targetY - 18 * currentScale;

      // Check Target 1 (Left)
      const t1X = targetX - T8_CONFIG.spacing * currentScale;
      if (
        !state.targetsHit[0] &&
        Math.abs(hitRelX - t1X) < hitboxW &&
        Math.abs(hitRelY - visualCenterY) < hitboxH
      ) {
        state.targetsHit[0] = true;
      }

      // Check Target 2 (Right)
      const t2X = targetX + T8_CONFIG.spacing * currentScale;
      if (
        !state.targetsHit[1] &&
        Math.abs(hitRelX - t2X) < hitboxW &&
        Math.abs(hitRelY - visualCenterY) < hitboxH
      ) {
        state.targetsHit[1] = true;
      }
    }

    // Phase 10 Logic
    if (state.phase === "TARGET_10") {
      state.target10Hit = true;

      if (state.ammo <= 0) {
        state.finishTriggered = true;
        setTimeout(triggerFinish, 1000);
        return;
      }

      state.phaseStartTime = Date.now();
      setTimeout(() => {
        if (state.phase !== "FINISHED") {
          state.phase = "DIALOG";
          const d = document.getElementById("game-dialog");
          if (d) d.style.display = "flex";
        }
      }, 3000);
    }

    // Check for finish if both targets hit in T8
    if (state.targetsHit[0] && state.targetsHit[1]) {
      if (!state.finishTriggered) {
        state.finishTriggered = true;
        setTimeout(triggerFinish, 2000);
      }
    }
  }

  // Record bullet mark (isTargetHit tag for the hitmap)
  state.bulletMarks.push({
    relX: hitRelX,
    relY: hitRelY,
    isTargetHit: pixel[3] > 0,
  });

  if (state.ammo <= 0) {
    stopFiring();
    setTimeout(triggerFinish, 1000);
  }
}

function updatePhases() {
  // If ammo is out or game is finished, don't progress phases anymore
  if (state.ammo <= 0 || state.phase === "FINISHED" || state.finishTriggered)
    return;

  const elapsed = Date.now() - state.phaseStartTime;
  const config = PHASE_SETTINGS[state.phase];
  if (!config) return;

  if (elapsed >= config.duration) {
    if (state.phase === "TARGET_10") {
      state.phase = "DIALOG";
      const d = document.getElementById("game-dialog");
      if (d) d.style.display = "flex";
      stopFiring();
    } else if (state.phase === "DIALOG") {
      state.phase = config.nextTarget;
      state.bulletMarks = [];
      const d = document.getElementById("game-dialog");
      if (d) d.style.display = "none";
      if (state.isMouseDown) startFiring();
    } else if (state.phase === "TARGET_8") {
      triggerFinish();
    }
    state.phaseStartTime = Date.now();
  }
}
/** * UPDATERS
 */
function updateParallax() {
  if (!state.isMouseInside) return;
  const maxScrollX = canvas.width * SETTINGS.worldScale - canvas.width;
  const maxScrollY = canvas.height * SETTINGS.worldScale - canvas.height;
  state.bgOffset.x = (state.mouseX / canvas.width - 0.5) * maxScrollX;
  state.bgOffset.y = (state.mouseY / canvas.height - 0.5) * maxScrollY;
}

function updateWeaponSway() {
  if (!weapon) return;
  state.recoil *= SETTINGS.recoilRecovery;
  state.breathTime += 0.04;
  const tremor = Math.sin(state.breathTime * 5) * 2;
  state.sway.x =
    (state.mouseX - canvas.width / 2) / 30 +
    (Math.cos(state.breathTime) * 15 + tremor);
  state.sway.y =
    (state.mouseY - canvas.height / 2) / 60 +
    (Math.sin(state.breathTime * 1.5) * 20 + tremor * 0.5) -
    state.recoil;
  weapon.style.transform = `translateX(calc(-50% + ${state.sway.x}px)) translateY(${state.sway.y}px) rotate(${state.recoil * -0.05}deg)`;
}

/** * RENDERING
 */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  updatePhases();
  updateParallax();
  updateWeaponSway();
  updateClockUI();

  let shakeX = 0;
  let shakeY = 0;
  if (state.shake > 0) {
    // Generate a random jolt
    shakeX = (Math.random() - 0.5) * state.shake;
    shakeY = (Math.random() - 0.5) * state.shake;

    // Smoothly reduce shake intensity (the "decay")
    state.shake *= 0.85;
    if (state.shake < 0.1) state.shake = 0;
  }

  // 2. Apply Shake to Background Drawing
  if (ASSETS.bg.complete) {
    const w = canvas.width * SETTINGS.worldScale;
    const h = canvas.height * SETTINGS.worldScale;

    ctx.drawImage(
      ASSETS.bg,
      canvas.width / 2 - w / 2 - state.bgOffset.x + shakeX, // Added shakeX
      canvas.height / 2 - h / 2 - state.bgOffset.y + shakeY, // Added shakeY
      w,
      h,
    );
  }

  // // Draw Background
  // if (ASSETS.bg.complete) {
  //   const w = canvas.width * SETTINGS.worldScale;
  //   const h = canvas.height * SETTINGS.worldScale;
  //   ctx.drawImage(
  //     ASSETS.bg,
  //     canvas.width / 2 - w / 2 - state.bgOffset.x,
  //     canvas.height / 2 - h / 2 - state.bgOffset.y,
  //     w,
  //     h,
  //   );
  // }

  renderActiveTargets(ctx);
  drawHitmap();

  // Draw World Bullet Marks
  state.bulletMarks.forEach((m) => {
    const drawX = m.relX - state.bgOffset.x;
    const drawY = m.relY - state.bgOffset.y;

    // B. Draw the permanent bullet hole (if it didn't hit a target that disappeared)
    // if (!m.isTargetHit) {
    //   ctx.drawImage(ASSETS.bulletMark, drawX - 1.8, drawY - 1.8, 3.75, 3.75);
    // }
  });

  // Draw Explosion
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
    const duration = PHASE_SETTINGS.TARGET_8.duration;
    let rawProgress = Math.min(elapsed / duration, 1);

    // This creates a 0 -> 1 -> 0 curve
    // At 0% time, progress is 0. At 50% time, progress is 1. At 100% time, progress is 0.
    state.target8Animation = 1 - Math.abs(1 - rawProgress * 2);
  }

  drawAmmoCounter(ctx);
  requestAnimationFrame(draw);
}

function renderActiveTargets(tCtx) {
  const drawFn = PHASE_SETTINGS[state.phase].targetFn;
  if (drawFn) drawFn(tCtx);
}

function drawHitmap() {
  hitmapCtx.clearRect(0, 0, hitmapCanvas.width, hitmapCanvas.height);

  // 1. Grid
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

  // 2. Ghost Target
  let viewPhase = state.phase;
  if (state.phase === "DIALOG") {
    // If we just finished 10, stay on 10. If we are heading to 8, show 8.
    viewPhase = state.target10Hit ? "TARGET_10" : "TARGET_8";
  }

  const config = PHASE_SETTINGS[viewPhase];
  if (!config || !config.center) return;

  hitmapCtx.save();
  hitmapCtx.translate(hitmapCanvas.width / 2, hitmapCanvas.height / 2 + 20);
  hitmapCtx.scale(1.5, 1.5);
  hitmapCtx.strokeStyle =
    state.phase === "DIALOG" ? "rgba(0, 255, 0, 0.2)" : "rgba(0, 255, 0, 0.5)";

  const realOffset = { ...state.bgOffset };
  state.bgOffset.x = config.center.x;
  state.bgOffset.y = config.center.y;
  if (config.targetFn) config.targetFn(hitmapCtx);
  state.bgOffset = realOffset;
  hitmapCtx.restore();

  // 3. Mini Hits
  // 3. Mini Hits (Inside your existing drawHitmap function)
  state.bulletMarks.forEach((m) => {
    let mapX, mapY;

    // We need to find the "center" of the view for the minimap
    // to calculate where the bullet hole should appear relative to the target.
    if (state.phase === "TARGET_8") {
      const progress = state.target8Animation;
      // We use the SAME animation math as the drawing function
      const animCenterX = 450 + 150 * progress;
      const animCenterY = 350 + 200 * progress;

      // Calculate position relative to the moving target
      mapX = (m.relX - animCenterX) * 1.5 + hitmapCanvas.width / 2;
      mapY = (m.relY - animCenterY) * 1.5 + hitmapCanvas.height / 2 + 20;
    } else {
      // For Phase 10, the target is static at its config center
      const config = PHASE_SETTINGS["TARGET_10"];
      mapX = (m.relX - config.center.x) * 1.5 + hitmapCanvas.width / 2;
      mapY = (m.relY - config.center.y) * 1.5 + hitmapCanvas.height / 2 + 20;
    }

    // NOW WE USE THEM HERE TO DRAW:
    hitmapCtx.save();
    if (m.isTargetHit) {
      hitmapCtx.fillStyle = "red";
      hitmapCtx.shadowBlur = 8;
    } else {
      hitmapCtx.fillStyle = "orange";
      hitmapCtx.shadowBlur = 2;
    }

    hitmapCtx.beginPath();
    // Using the calculated mapX and mapY
    hitmapCtx.arc(mapX, mapY, 2, 0, Math.PI * 2);
    hitmapCtx.fill();
    hitmapCtx.restore();
  });
}

function updateClockUI() {
  const display = document.getElementById("time-display");
  const circle = document.querySelector(".progress-ring__circle");
  if (!display || !circle) return;

  const elapsed = Date.now() - state.phaseStartTime;
  const limit = PHASE_SETTINGS[state.phase].duration;
  const remain = Math.max(0, limit - elapsed);
  const sec = Math.ceil(remain / 1000);

  display.textContent = sec;
  const isWarn = sec < 5 && state.phase !== "DIALOG";
  display.classList.toggle("warning", isWarn);
  circle.setAttribute("stroke", isWarn ? "red" : "green");
  circle.style.strokeDashoffset =
    2 * Math.PI * 90 - (remain / (limit || 1)) * (2 * Math.PI * 90);
}

function triggerFinish() {
  state.phase = "FINISHED";
  state.phaseStartTime = Date.now();
  stopFiring();

  const t10 = state.target10Hit ? 1 : 0;
  const t8Count = state.targetsHit.filter((hit) => hit).length;
  const totalHits = t10 + t8Count;

  let grade = 2;
  if (totalHits === 3) grade = 5;
  else if (t10 === 1 && t8Count === 1) grade = 4;
  else if (totalHits >= 1) grade = 3;

  const d = document.getElementById("game-dialog");
  if (d) {
    const title = d.querySelector("h2");
    const message = d.querySelector("p");

    title.innerText = "ATYŞ TAMAMLANDY!";
    // Using the new .grade-output class for a better look
    message.innerHTML = `
      NYŞANLAR: ${totalHits} / 3<br>
      BAHA: <span class="grade-output">${grade}</span>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 10px; margin-top: 20px;">
        <button onclick="location.reload()">TÄZEDEN BAŞLA</button>
        <button onclick="window.location.href='zeroSession.html'">YZA</button>
      </div>
    `;
    d.style.display = "flex";
  }
}

function drawAmmoCounter(tCtx) {
  if (!ASSETS.bulletIcon.complete) return;
  tCtx.save();

  for (let i = 0; i < state.ammo; i++) {
    const isTracer = i % 3 == 0;
    const image = isTracer ? ASSETS.guidingBulletIcon : ASSETS.bulletIcon;

    if (isTracer) {
      tCtx.shadowBlur = 15;
      tCtx.shadowColor = "rgba(255, 50, 0, 0.8)"; // Red glow for tracer ammo
    } else {
      tCtx.shadowBlur = 5;
      tCtx.shadowColor = "rgba(141, 160, 112, 0.5)";
    }

    tCtx.drawImage(image, 20 + i * 25, canvas.height - 100, 20, 80);
  }
  tCtx.restore();
}

/** * TARGET DRAWING FUNCTIONS
 */
function drawTargetN10(tCtx) {
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

  if (tCtx === hitmapCtx) {
    tCtx.strokeStyle = "lime";
    tCtx.lineWidth = 1;
    tCtx.stroke();
  }
  tCtx.restore();
}

function drawTargetN8(tCtx) {
  const progress = state.target8Animation || 0;
  const currentScale =
    T8_CONFIG.scaleMin + (T8_CONFIG.scaleMax - T8_CONFIG.scaleMin) * progress;

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
    tCtx.strokeStyle = "white";
    tCtx.stroke();
    tCtx.fill();

    if (tCtx === hitmapCtx) {
      tCtx.strokeStyle = "lime";
      tCtx.lineWidth = 0.5;
      tCtx.stroke();
    }
    tCtx.restore();
  };

  tCtx.save();
  tCtx.fillStyle = "rgb(16, 153, 119)";
  if (tCtx !== hitmapCtx) {
    tCtx.save();
    tCtx.beginPath();
    tCtx.moveTo(
      T8_CONFIG.startX - state.bgOffset.x,
      T8_CONFIG.startY - state.bgOffset.y,
    );
    tCtx.lineTo(
      T8_CONFIG.startX + T8_CONFIG.moveX - state.bgOffset.x,
      T8_CONFIG.startY + T8_CONFIG.moveY - state.bgOffset.y,
    );
    tCtx.strokeStyle = "rgba(255, 255, 255, 0.3)"; // Semi-transparent white
    tCtx.setLineDash([5, 5]); // Optional: makes it a dashed line
    tCtx.lineWidth = 2;
    tCtx.stroke();
    tCtx.restore();
  }
  drawShape(-T8_CONFIG.spacing, state.targetsHit[0]);
  drawShape(T8_CONFIG.spacing, state.targetsHit[1]);
  tCtx.restore();
}

// Start Game Loop
draw();
