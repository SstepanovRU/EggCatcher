"use strict";

// Размеры внутренней игровой сцены. CSS сам масштабирует её под экран.
const WORLD_WIDTH = 960;
const WORLD_HEIGHT = 640;

const canvas = document.querySelector("#gameCanvas");
const context = canvas.getContext("2d");
const scoreElement = document.querySelector("#score");
const livesElement = document.querySelector("#lives");
const finalScoreElement = document.querySelector("#finalScore");
const gameOverElement = document.querySelector("#gameOver");
const restartButton = document.querySelector("#restartButton");

// Четыре дорожки: сторона + высота должны совпасть с позой игрока.
const lanes = [
  {
    side: "left",
    height: "up",
    start: { x: 88, y: 120 },
    control: { x: 268, y: 168 },
    end: { x: 388, y: 326 },
  },
  {
    side: "left",
    height: "down",
    start: { x: 80, y: 326 },
    control: { x: 258, y: 350 },
    end: { x: 360, y: 475 },
  },
  {
    side: "right",
    height: "up",
    start: { x: 872, y: 120 },
    control: { x: 692, y: 168 },
    end: { x: 572, y: 326 },
  },
  {
    side: "right",
    height: "down",
    start: { x: 880, y: 326 },
    control: { x: 702, y: 350 },
    end: { x: 600, y: 475 },
  },
];

// Области исходного спрайта. Картинка делится на 2 столбца и 2 строки.
const poses = {
  // dy у верхних поз разный: так ступни всех четырёх кадров стоят на одной линии.
  "left-up": { sx: 0, sy: 0, sw: 724, sh: 610, dx: 250, dy: 195, dw: 460, dh: 388 },
  "right-up": { sx: 724, sy: 0, sw: 724, sh: 610, dx: 250, dy: 184, dw: 460, dh: 388 },
  "left-down": { sx: 0, sy: 595, sw: 724, sh: 491, dx: 250, dy: 278, dw: 460, dh: 312 },
  "right-down": { sx: 724, sy: 595, sw: 724, sh: 491, dx: 250, dy: 278, dw: 460, dh: 312 },
};

const playerImage = new Image();
playerImage.src = "assets/player-poses.png";

let player = { side: "left", height: "down" };
let eggs = [];
let particles = [];
let score = 0;
let lives = 3;
let playing = true;
let spawnTimer = 450;
let lastTime = 0;
let lastLaneIndex = -1;
let poseFlash = 0;

function resetGame() {
  player = { side: "left", height: "down" };
  eggs = [];
  particles = [];
  score = 0;
  lives = 3;
  spawnTimer = 500;
  lastLaneIndex = -1;
  poseFlash = 0;
  playing = true;
  gameOverElement.hidden = true;
  updateHud();
}

function updateHud() {
  scoreElement.textContent = String(score);
  livesElement.textContent = Array.from({ length: 3 }, (_, index) => index < lives ? "♥" : "♡").join(" ");
  livesElement.setAttribute("aria-label", `${lives} ${pluralizeLives(lives)}`);
}

function pluralizeLives(value) {
  if (value === 1) return "жизнь";
  if (value === 2 || value === 3 || value === 4) return "жизни";
  return "жизней";
}

function chooseLane() {
  let laneIndex = Math.floor(Math.random() * lanes.length);

  // Не повторяем одну дорожку слишком часто подряд.
  if (laneIndex === lastLaneIndex && Math.random() < 0.7) {
    laneIndex = (laneIndex + 1 + Math.floor(Math.random() * 3)) % lanes.length;
  }

  lastLaneIndex = laneIndex;
  return laneIndex;
}

function spawnEgg() {
  eggs.push({
    laneIndex: chooseLane(),
    progress: 0,
    rotation: (Math.random() - 0.5) * 0.5,
  });
}

function update(deltaSeconds) {
  poseFlash = Math.max(0, poseFlash - deltaSeconds);
  updateParticles(deltaSeconds);

  if (!playing) return;

  const speedMultiplier = Math.min(2.35, 1 + score * 0.045);
  spawnTimer -= deltaSeconds * 1000;

  if (spawnTimer <= 0) {
    spawnEgg();
    spawnTimer = Math.max(560, 1450 - score * 32) / speedMultiplier;
  }

  for (let index = eggs.length - 1; index >= 0; index -= 1) {
    const egg = eggs[index];
    egg.progress += deltaSeconds * 0.32 * speedMultiplier;
    egg.rotation += deltaSeconds * (egg.laneIndex < 2 ? 2.5 : -2.5);

    if (egg.progress >= 1) {
      resolveEgg(egg);
      eggs.splice(index, 1);
    }
  }
}

function resolveEgg(egg) {
  const lane = lanes[egg.laneIndex];
  const caught = player.side === lane.side && player.height === lane.height;

  if (caught) {
    score += 1;
    poseFlash = 0.14;
    createParticles(lane.end.x, lane.end.y, "#ffc94a", 9);
  } else {
    lives -= 1;
    createParticles(lane.end.x, 568, "#fff4d6", 14);
  }

  updateHud();

  if (lives <= 0) {
    endGame();
  }
}

function endGame() {
  playing = false;
  finalScoreElement.textContent = String(score);
  gameOverElement.hidden = false;
  restartButton.focus();
}

function setPlayerPosition(direction) {
  if (!playing) return;

  if (direction === "left" || direction === "right") {
    player.side = direction;
  } else if (direction === "up" || direction === "down") {
    player.height = direction;
  }
}

function createParticles(x, y, color, count) {
  for (let index = 0; index < count; index += 1) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 170,
      vy: -50 - Math.random() * 150,
      life: 0.5 + Math.random() * 0.35,
      size: 3 + Math.random() * 5,
      color,
    });
  }
}

function updateParticles(deltaSeconds) {
  for (let index = particles.length - 1; index >= 0; index -= 1) {
    const particle = particles[index];
    particle.life -= deltaSeconds;
    particle.vy += 420 * deltaSeconds;
    particle.x += particle.vx * deltaSeconds;
    particle.y += particle.vy * deltaSeconds;

    if (particle.life <= 0) particles.splice(index, 1);
  }
}

function quadraticPoint(lane, progress) {
  const opposite = 1 - progress;
  return {
    x: opposite * opposite * lane.start.x
      + 2 * opposite * progress * lane.control.x
      + progress * progress * lane.end.x,
    y: opposite * opposite * lane.start.y
      + 2 * opposite * progress * lane.control.y
      + progress * progress * lane.end.y,
  };
}

function draw() {
  context.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  drawBackground();
  drawLanes();
  drawTargetHints();
  drawPlayer();
  drawEggs();
  drawParticles();
  drawSpeedBadge();
}

function drawBackground() {
  const sky = context.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
  sky.addColorStop(0, "#99d3d0");
  sky.addColorStop(0.58, "#e9d8a7");
  sky.addColorStop(1, "#9a664d");
  context.fillStyle = sky;
  context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  // Мягкое солнце и далёкие холмы.
  context.beginPath();
  context.arc(480, 130, 76, 0, Math.PI * 2);
  context.fillStyle = "rgba(255, 239, 174, 0.68)";
  context.fill();

  context.beginPath();
  context.moveTo(0, 410);
  context.quadraticCurveTo(160, 310, 330, 420);
  context.quadraticCurveTo(510, 300, 700, 420);
  context.quadraticCurveTo(830, 350, 960, 405);
  context.lineTo(960, 640);
  context.lineTo(0, 640);
  context.closePath();
  context.fillStyle = "#76936f";
  context.fill();

  // Земля.
  const ground = context.createLinearGradient(0, 470, 0, 640);
  ground.addColorStop(0, "#a97852");
  ground.addColorStop(1, "#704332");
  context.fillStyle = ground;
  context.fillRect(0, 515, WORLD_WIDTH, 125);

  context.fillStyle = "rgba(64, 42, 35, 0.18)";
  for (let x = 30; x < WORLD_WIDTH; x += 80) {
    context.fillRect(x, 578 + (x % 3) * 5, 45, 3);
  }

  drawSideTower(0, "left");
  drawSideTower(824, "right");
}

function drawSideTower(x, side) {
  context.save();
  context.translate(x, 0);

  context.fillStyle = "#58382f";
  context.fillRect(0, 54, 136, 470);
  context.fillStyle = "#754837";
  context.fillRect(side === "left" ? 0 : 16, 54, 120, 470);

  context.fillStyle = "#f0b64c";
  context.beginPath();
  if (side === "left") {
    context.moveTo(0, 54);
    context.lineTo(136, 54);
    context.lineTo(0, 0);
  } else {
    context.moveTo(0, 54);
    context.lineTo(136, 54);
    context.lineTo(136, 0);
  }
  context.closePath();
  context.fill();

  [88, 294].forEach((y) => {
    context.fillStyle = "#2c2025";
    context.fillRect(side === "left" ? 30 : 26, y, 80, 78);
    context.fillStyle = "#18131b";
    context.fillRect(side === "left" ? 38 : 34, y + 8, 64, 62);
    context.fillStyle = "#ffc94a";
    context.fillRect(side === "left" ? 106 : 18, y + 27, 12, 22);
  });

  context.restore();
}

function drawLanes() {
  lanes.forEach((lane, laneIndex) => {
    const active = player.side === lane.side && player.height === lane.height;

    context.save();
    context.lineCap = "round";

    // Тёмная кромка желоба.
    context.beginPath();
    traceCurve(lane, 0, 0.82);
    context.lineWidth = 22;
    context.strokeStyle = "#4f3028";
    context.stroke();

    // Верхняя деревянная часть.
    context.beginPath();
    traceCurve(lane, 0, 0.82);
    context.lineWidth = 13;
    context.strokeStyle = active ? "#ffd76c" : "#c68142";
    context.stroke();

    // Продолжение пути до рук игрока.
    context.beginPath();
    traceCurve(lane, 0.83, 1);
    context.lineWidth = 3;
    context.setLineDash([7, 9]);
    context.strokeStyle = active ? "rgba(255, 201, 74, 0.85)" : "rgba(80, 54, 48, 0.32)";
    context.stroke();

    context.setLineDash([]);
    const labelPoint = quadraticPoint(lane, 0.26);
    context.fillStyle = "rgba(44, 32, 37, 0.75)";
    context.beginPath();
    context.arc(labelPoint.x, labelPoint.y - 18, 13, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#fff4d6";
    context.font = "800 13px system-ui";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(laneIndex + 1), labelPoint.x, labelPoint.y - 18);
    context.restore();
  });
}

function traceCurve(lane, start, end) {
  const firstPoint = quadraticPoint(lane, start);
  context.moveTo(firstPoint.x, firstPoint.y);

  for (let progress = start + 0.025; progress <= end + 0.001; progress += 0.025) {
    const point = quadraticPoint(lane, Math.min(progress, end));
    context.lineTo(point.x, point.y);
  }
}

function drawTargetHints() {
  lanes.forEach((lane) => {
    const active = player.side === lane.side && player.height === lane.height;
    context.beginPath();
    context.arc(lane.end.x, lane.end.y, active ? 20 : 12, 0, Math.PI * 2);
    context.fillStyle = active ? "rgba(255, 201, 74, 0.2)" : "rgba(255, 255, 255, 0.1)";
    context.fill();
    context.strokeStyle = active ? "#ffc94a" : "rgba(80, 54, 48, 0.28)";
    context.lineWidth = active ? 4 : 2;
    context.stroke();
  });
}

function drawPlayer() {
  const pose = poses[`${player.side}-${player.height}`];

  context.save();
  if (poseFlash > 0) {
    context.shadowColor = "#ffc94a";
    context.shadowBlur = 30;
  } else {
    context.shadowColor = "rgba(24, 16, 24, 0.35)";
    context.shadowBlur = 12;
  }

  if (playerImage.complete && playerImage.naturalWidth > 0) {
    context.drawImage(
      playerImage,
      pose.sx,
      pose.sy,
      pose.sw,
      pose.sh,
      pose.dx,
      pose.dy,
      pose.dw,
      pose.dh,
    );
  } else {
    // Простой запасной силуэт, пока картинка загружается.
    context.fillStyle = "#414052";
    context.beginPath();
    context.arc(480, 315, 92, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawEggs() {
  eggs.forEach((egg) => {
    const lane = lanes[egg.laneIndex];
    const point = quadraticPoint(lane, Math.min(egg.progress, 1));
    drawEgg(point.x, point.y, egg.rotation);
  });
}

function drawEgg(x, y, rotation) {
  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.shadowColor = "rgba(54, 33, 25, 0.35)";
  context.shadowBlur = 8;
  context.shadowOffsetY = 5;

  context.beginPath();
  context.moveTo(0, -19);
  context.bezierCurveTo(12, -17, 17, -4, 15, 7);
  context.bezierCurveTo(13, 20, -13, 20, -15, 7);
  context.bezierCurveTo(-17, -4, -12, -17, 0, -19);
  context.fillStyle = "#fff9e8";
  context.fill();
  context.strokeStyle = "#d1a96f";
  context.lineWidth = 2;
  context.stroke();

  context.beginPath();
  context.ellipse(-5, -8, 3, 6, 0.3, 0, Math.PI * 2);
  context.fillStyle = "rgba(255, 255, 255, 0.9)";
  context.fill();
  context.restore();
}

function drawParticles() {
  particles.forEach((particle) => {
    context.globalAlpha = Math.max(0, particle.life * 1.7);
    context.fillStyle = particle.color;
    context.beginPath();
    context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    context.fill();
  });
  context.globalAlpha = 1;
}

function drawSpeedBadge() {
  const level = Math.min(5, 1 + Math.floor(score / 6));
  context.save();
  context.fillStyle = "rgba(36, 32, 57, 0.82)";
  context.beginPath();
  context.roundRect(414, 18, 132, 34, 17);
  context.fill();
  context.fillStyle = "#fff4d6";
  context.font = "800 13px system-ui";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(`СКОРОСТЬ  ${level}/5`, 480, 35);
  context.restore();
}

function gameLoop(timestamp) {
  const deltaSeconds = Math.min((timestamp - lastTime) / 1000 || 0, 0.05);
  lastTime = timestamp;
  update(deltaSeconds);
  draw();
  requestAnimationFrame(gameLoop);
}

const keyToDirection = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
};

window.addEventListener("keydown", (event) => {
  const direction = keyToDirection[event.key];
  if (!direction) return;

  event.preventDefault();
  setPlayerPosition(direction);
});

document.querySelectorAll("[data-control]").forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    setPlayerPosition(button.dataset.control);
  });
});

restartButton.addEventListener("click", resetGame);

updateHud();
requestAnimationFrame(gameLoop);
