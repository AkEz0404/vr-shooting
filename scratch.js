function drawTargetN8(ctx) {
  const ax = 450 - state.bgOffset.x;
  const ay = 350 - state.bgOffset.y;
  // const ax = 650;
  // const ay = 450;
  ctx.save();
  ctx.strokeStyle = "lime";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(ax + 25, ay);
  ctx.lineTo(ax + 37.5, ay - 50);
  ctx.lineTo(ax + 37.5, ay - 50 - 82);
  ctx.lineTo(ax + 24, ay - 50 - 82);
  ctx.lineTo(ax + 24, ay - 50 - 82 - 18);
  ctx.lineTo(ax + 1, ay - 50 - 82 - 18);
  ctx.lineTo(ax + 1, ay - 50 - 82);
  ctx.lineTo(ax - 13, ay - 50 - 82);
  ctx.lineTo(ax - 13, ay - 50);
  ctx.lineTo(ax, ay);

  ctx.fill();
}

function drawTargetN10(ctx) {
  const ax = 500 - state.bgOffset.x;
  const ay = 350 - state.bgOffset.y;
  // const ax = 650;
  // const ay = 450;
  ctx.strokeStyle = "lime";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(ax + 75, ay);
  ctx.lineTo(ax + 75, ay - 37);
  ctx.lineTo(ax + 65, ay - 37);
  ctx.lineTo(ax + 65, ay - 37 - 18);
  ctx.lineTo(ax + 37, ay - 37 - 18);
  ctx.lineTo(ax + 37, ay - 35);
  ctx.lineTo(ax + 10, ay - 35);
  ctx.lineTo(ax + 10, ay - 23);
  ctx.lineTo(ax, ay - 23);
  ctx.lineTo(ax, ay);

  ctx.fill();
}

function drawTargetN7(ctx) {
  const ax = 600 - state.bgOffset.x;
  const ay = 350 - state.bgOffset.y;
  // const ax = 650;
  // const ay = 450;
  ctx.strokeStyle = "lime";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.fillStyle = "rgba(66, 78, 66, 1)";
  ctx.moveTo(ax, ay);
  ctx.lineTo(ax + 50, ay);
  ctx.lineTo(ax + 50, ay - 75);
  ctx.lineTo(ax + 36.5, ay - 75);
  ctx.lineTo(ax + 36.5, ay - 100);
  ctx.lineTo(ax + 13.5, ay - 100);
  ctx.lineTo(ax + 13.5, ay - 75);
  ctx.lineTo(ax, ay - 75);
  ctx.lineTo(ax, ay);

  ctx.fill();
}

function drawAimAssist(sx, sy) {
  const shift = 5;

  const ax = SETTINGS.weaponAim.x + sx;
  const ay = SETTINGS.weaponAim.y + sy - shift;

  ctx.strokeStyle = "lime";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ax - 15, ay);
  ctx.lineTo(ax + 15, ay);
  ctx.moveTo(ax, ay - 15);
  ctx.lineTo(ax, ay + 15);

  ctx.stroke();
}

function drawCrosshair(x, y) {
  ctx.strokeStyle = "lime";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 15, y);
  ctx.lineTo(x + 15, y);
  ctx.moveTo(x, y - 15);
  ctx.lineTo(x, y + 15);
  ctx.stroke();

  ctx.fillStyle = "red";
  ctx.fillRect(x - 1, y - 1, 2, 2);
}
