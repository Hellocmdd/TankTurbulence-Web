const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const hudLevel = document.getElementById("hud-level");
const hudLives = document.getElementById("hud-lives");
const hudEnemies = document.getElementById("hud-enemies");
const hudStatus = document.getElementById("hud-status");
const startScreen = document.getElementById("start-screen");
const startButton = document.getElementById("start-button");
const gameWrap = document.querySelector(".game-wrap");

const tile = 64;
let walls = [];
let bulletColor = "#8ce1ff";
const enemySpawnCount = 3;
const bgmTempo = 112;
const bgmIntervalMs = (60 / bgmTempo / 2) * 1000; // eighth note timing
const bgmRoots = [57, 60, 55, 62]; // midi note roots for a simple progression
const bgmMelodyOffsets = [0, 2, 3, 5, 7, 5, 3, 2, 0, 2, 3, 5, 7, 9, 7, 5]; // semitone offsets from root
const bgmArpOffsets = [0, 7, 12, 7];
const powerupTypes = ["shield", "heart", "laser", "cannon", "mine"];
const powerupWeights = [
  { type: "shield", w: 0.7 }, // 略低概率
  { type: "heart", w: 1 },
  { type: "laser", w: 1 },
  { type: "cannon", w: 1 },
  { type: "mine", w: 1 },
];
let laserColor = "#ff8cff";
const defaultEnemySpawns = [
  { x: tile * 1 + tile / 2, y: tile / 2 },
  { x: tile * 7 + tile / 2, y: tile / 2 },
  { x: tile * 13 + tile / 2, y: tile / 2 },
];
let enemySpawns = defaultEnemySpawns.map((s) => ({ ...s }));
// Spawn player away from bottom wall so movement/bullets are not blocked at start.
const defaultPlayerSpawn = { x: canvas.width / 2, y: canvas.height - tile * 0.6 };
let playerSpawn = { ...defaultPlayerSpawn };
const minPlayerSpawnShift = Math.min(canvas.width, canvas.height) * 0.35;
const minEnemyPlayerDistanceBase = Math.min(canvas.width, canvas.height) * 0.6;

const game = {
  level: 1,
  lives: 3,
  enemies: [],
  bullets: [],
  enemyQueue: 0,
  spawnTimer: 0,
  maxAlive: 3,
  player: null,
  status: "",
  respawnTimer: 0,
  gameOver: false,
  lastTime: 0,
  started: false,
  powerups: [],
  powerupTimer: 0,
  mines: [],
  shieldHitCooldown: 0,
};

const keys = {};
let audioCtx = null;
let masterGain = null;
let bgmTimer = null;
let bgmStep = 0;

const levelThemes = [
  {
    name: "霓虹夜幕",
    canvasBg:
      "repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 64px), repeating-linear-gradient(rgba(255,255,255,0.02) 0, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 64px), #161722",
    gridColor: "rgba(255,255,255,0.05)",
    wallFill: "#2d3246",
    wallStroke: "rgba(255,255,255,0.08)",
    canvasBorder: "#303244",
    wrapBg: "#0c0d12",
    bulletColor: "#8ce1ff",
    laserColor: "#ff8cff",
  },
  {
    name: "沙漠日落",
    canvasBg: "linear-gradient(135deg,#4f2d1a,#a15c27,#d99a52)",
    gridColor: "rgba(255,235,200,0.18)",
    wallFill: "#9b6b3d",
    wallStroke: "rgba(255,235,200,0.25)",
    canvasBorder: "#c48745",
    wrapBg: "#20140d",
    bulletColor: "#ffd27f",
    laserColor: "#ff9f6e",
  },
  {
    name: "极地霜寒",
    canvasBg: "radial-gradient(circle at 30% 30%, #1c2d36, #0f1b24 60%, #0a131a)",
    gridColor: "rgba(180,240,255,0.11)",
    wallFill: "#264754",
    wallStroke: "rgba(170,230,255,0.24)",
    canvasBorder: "#2f5a6b",
    wrapBg: "#0e1a22",
    bulletColor: "#9ef0ff",
    laserColor: "#c4a3ff",
  },
  {
    name: "丛林迷雾",
    canvasBg: "linear-gradient(160deg,#0f1f14,#153426,#1f4a2f)",
    gridColor: "rgba(180,255,200,0.1)",
    wallFill: "#1f3929",
    wallStroke: "rgba(170,255,200,0.2)",
    canvasBorder: "#2e5a3c",
    wrapBg: "#0c1a12",
    bulletColor: "#a6ff8a",
    laserColor: "#92ffd9",
  },
  {
    name: "熔炉工厂",
    canvasBg: "linear-gradient(135deg,#151821,#242c3a)",
    gridColor: "rgba(255,180,130,0.08)",
    wallFill: "#2d2f36",
    wallStroke: "rgba(255,200,140,0.18)",
    canvasBorder: "#44474f",
    wrapBg: "#10131c",
    bulletColor: "#ffdd99",
    laserColor: "#ff8cff",
  },
];

function themeForLevel(level) {
  return levelThemes[(level - 1) % levelThemes.length] ?? levelThemes[0];
}

function applyTheme(level) {
  const theme = themeForLevel(level);
  game.theme = theme;
  bulletColor = theme.bulletColor ?? bulletColor;
  laserColor = theme.laserColor ?? laserColor;
  if (canvas && theme.canvasBg) {
    canvas.style.background = theme.canvasBg;
  }
  if (canvas && theme.canvasBorder) {
    canvas.style.borderColor = theme.canvasBorder;
  }
  if (canvas && theme.canvasShadow) {
    canvas.style.boxShadow = theme.canvasShadow;
  }
  if (gameWrap && theme.wrapBg) {
    gameWrap.style.background = theme.wrapBg;
  }
}

function currentTheme() {
  return game.theme ?? levelThemes[0];
}

function minEnemyPlayerDistance(level = 1) {
  const levelBonus = Math.min(Math.max(level - 1, 0), 6) * tile * 0.1;
  return minEnemyPlayerDistanceBase + levelBonus;
}

function pickPlayerSpawn(previousSpawn, level = 1) {
  const margin = tile * 1.2;
  const minShift = minPlayerSpawnShift;
  const anchors = [
    { x: canvas.width * 0.18, y: canvas.height * 0.82 },
    { x: canvas.width * 0.5, y: canvas.height * 0.82 },
    { x: canvas.width * 0.82, y: canvas.height * 0.82 },
    { x: canvas.width * 0.18, y: canvas.height * 0.52 },
    { x: canvas.width * 0.82, y: canvas.height * 0.52 },
    { x: canvas.width * 0.18, y: canvas.height * 0.22 },
    { x: canvas.width * 0.5, y: canvas.height * 0.22 },
    { x: canvas.width * 0.82, y: canvas.height * 0.22 },
  ];
  const anchor = anchors[(level - 1) % anchors.length];
  const attempts = 120;
  const jitter = tile * 1.4;

  for (let i = 0; i < attempts; i++) {
    const x = clamp(anchor.x + (Math.random() * 2 - 1) * jitter, margin, canvas.width - margin);
    const y = clamp(anchor.y + (Math.random() * 2 - 1) * jitter, margin, canvas.height - margin);
    if (previousSpawn && Math.hypot(x - previousSpawn.x, y - previousSpawn.y) < minShift) continue;
    return { x, y };
  }

  // Fallback: shift away from the previous (or default) spot by a sizable distance.
  const base = previousSpawn ?? defaultPlayerSpawn;
  const ang = Math.random() * Math.PI * 2;
  const dist = minShift + tile * 0.8;
  return {
    x: clamp(base.x + Math.cos(ang) * dist, margin, canvas.width - margin),
    y: clamp(base.y + Math.sin(ang) * dist, margin, canvas.height - margin),
  };
}

function generateEnemySpawns(playerPos, count = enemySpawnCount, level = 1) {
  const margin = tile * 0.8;
  const minBetween = tile * 2.5;
  const minDistance = minEnemyPlayerDistance(level);
  const maxEnemyBandY = Math.max(margin, canvas.height * 0.45);
  const spawns = [];
  const tryFill = (requiredDist, attempts = 240) => {
    for (let i = 0; i < attempts && spawns.length < count; i++) {
      const x = clamp(Math.random() * canvas.width, margin, canvas.width - margin);
      const y = clamp(Math.random() * maxEnemyBandY, margin, maxEnemyBandY);
      if (Math.hypot(x - playerPos.x, y - playerPos.y) < requiredDist) continue;
      if (spawns.some((s) => Math.hypot(x - s.x, y - s.y) < minBetween)) continue;
      spawns.push({ x, y });
    }
  };

  tryFill(minDistance, 240);
  if (spawns.length < count) tryFill(minDistance * 0.95, 180);
  if (spawns.length < count) tryFill(minDistance * 0.9, 180);

  if (spawns.length < count) {
    for (const def of defaultEnemySpawns) {
      if (spawns.length >= count) break;
      if (Math.hypot(def.x - playerPos.x, def.y - playerPos.y) < minDistance * 0.9) continue;
      spawns.push({ ...def });
    }
  }

  if (spawns.length < count) {
    const needed = count - spawns.length;
    const baseAng = Math.random() * Math.PI * 2;
    for (let i = 0; i < needed * 3 && spawns.length < count; i++) {
      const ang = baseAng + (i * Math.PI * 2) / Math.max(needed, 3);
      const dist = minDistance * 0.92 + tile * 0.8;
      const x = clamp(playerPos.x + Math.cos(ang) * dist, margin, canvas.width - margin);
      const y = clamp(playerPos.y + Math.sin(ang) * dist, margin, canvas.height - margin);
      if (Math.hypot(x - playerPos.x, y - playerPos.y) < minDistance * 0.85) continue;
      if (spawns.some((s) => Math.hypot(x - s.x, y - s.y) < minBetween)) continue;
      spawns.push({ x, y });
    }
  }

  if (spawns.length < count) {
    return defaultEnemySpawns
      .filter((s) => Math.hypot(s.x - playerPos.x, s.y - playerPos.y) >= minDistance * 0.85)
      .map((s) => ({ ...s }))
      .slice(0, count);
  }

  return spawns;
}

function buildWalls(level, playerSpawnPoint, enemySpawnPoints) {
  const cols = Math.floor(canvas.width / tile);
  const rows = Math.floor(canvas.height / tile);
  const baseTarget = 8 + Math.min(level - 1, 6);
  const targetPieces = Math.round(baseTarget * 3); // ~300% density (tripled)
  const maxAttempts = 1500; // allow many retries for high density
  const wallsPlaced = [];
  let pieces = 0;
  const padReserved = 6;
  const padWalls = 6; // still separated, but allows more placements

  const reserved = [];
  if (playerSpawnPoint) {
    reserved.push({
      x: playerSpawnPoint.x - tile * 1.5,
      y: playerSpawnPoint.y - tile * 1.5,
      w: tile * 3,
      h: tile * 3,
    });
  }
  if (enemySpawnPoints && enemySpawnPoints.length) {
    for (const s of enemySpawnPoints) {
      reserved.push({ x: s.x - tile, y: s.y - tile, w: tile * 2, h: tile * 2.5 });
    }
  }

  const toRect = (gx, gy, wCells, hCells) => ({
    x: gx * tile,
    y: gy * tile,
    w: wCells * tile,
    h: hCells * tile,
  });
  const inBand = (rect, x0, x1, y0, y1) => rect.x >= x0 && rect.x + rect.w <= x1 && rect.y >= y0 && rect.y + rect.h <= y1;

  for (let attempt = 0; attempt < maxAttempts && pieces < targetPieces; attempt++) {
    const tryLShape = Math.random() < 0.2;

    if (tryLShape) {
      const hx = randInt(2, 3);
      const hy = randInt(2, 3);
      const orient = randInt(0, 3);
      let gx = randInt(0, cols - hx);
      let gy = randInt(1, rows - hy - 1);

      let rectH, rectV;
      switch (orient) {
        case 0: // right + down
          rectH = toRect(gx, gy, hx, 1);
          rectV = toRect(gx, gy, 1, hy);
          break;
        case 1: // right + up
          gy = randInt(hy, rows - 2);
          rectH = toRect(gx, gy, hx, 1);
          rectV = toRect(gx, gy - hy + 1, 1, hy);
          break;
        case 2: // left + down
          gx = randInt(hx - 1, cols - 2);
          rectH = toRect(gx - hx + 1, gy, hx, 1);
          rectV = toRect(gx - hx + 1, gy, 1, hy);
          break;
        default: // left + up
          gx = randInt(hx - 1, cols - 2);
          gy = randInt(hy, rows - 2);
          rectH = toRect(gx - hx + 1, gy, hx, 1);
          rectV = toRect(gx - hx + 1, gy - hy + 1, 1, hy);
          break;
      }

      const candidates = [rectH, rectV];
      const overlapsReserved = candidates.some((r) => reserved.some((res) => rectsIntersect(inflate(r, padReserved), inflate(res, padReserved))));
      const overlapsWalls = candidates.some((r) => wallsPlaced.some((w) => rectsIntersect(inflate(r, padWalls), inflate(w, padWalls))));
      if (!overlapsReserved && !overlapsWalls) {
        wallsPlaced.push(...candidates);
        pieces += 2;
      }
      continue;
    }

    // Single block placement
    const wCells = randInt(1, 2);
    const hCells = randInt(1, 2);
    const gx = randInt(0, cols - wCells);
    const gy = randInt(1, rows - hCells - 1); // avoid top/bottom edges a bit

    const rect = toRect(gx, gy, wCells, hCells);

    if (reserved.some((r) => rectsIntersect(inflate(rect, padReserved), inflate(r, padReserved)))) continue;
    if (wallsPlaced.some((w) => rectsIntersect(inflate(rect, padWalls), inflate(w, padWalls)))) continue;

    wallsPlaced.push(rect);
    pieces += 1;
  }

  // Fallback fill: if still short, place simpler blocks with padding.
  let fallbackAttempts = 0;
  while (pieces < targetPieces && fallbackAttempts < 300) {
    fallbackAttempts += 1;
    const wCells = randInt(1, 2);
    const hCells = randInt(1, 2);
    const gx = randInt(0, cols - wCells);
    const gy = randInt(1, rows - hCells - 1);
    const rect = toRect(gx, gy, wCells, hCells);
    if (reserved.some((r) => rectsIntersect(inflate(rect, padReserved), inflate(r, padReserved)))) continue;
    if (wallsPlaced.some((w) => rectsIntersect(inflate(rect, padWalls), inflate(w, padWalls)))) continue;
    wallsPlaced.push(rect);
    pieces += 1;
  }

  // Ensure central band gets obstacles: bias placement to middle area if still lacking.
  const centerTarget = clamp(Math.floor(targetPieces * 0.5), 10, 20); // between 10 and 20
  let centerAttempts = 0;
  const gxMin = Math.max(0, Math.floor(cols * 0.25));
  const gxMax = Math.max(gxMin, Math.min(cols - 1, Math.ceil(cols * 0.75)));
  const gyMin = Math.max(1, Math.floor(rows * 0.35));
  const gyMax = Math.max(gyMin, Math.min(rows - 2, Math.ceil(rows * 0.8)));
  let centerPlaced = wallsPlaced.filter((r) =>
    inBand(r, gxMin * tile, gxMax * tile, gyMin * tile, gyMax * tile)
  ).length;

  while (centerPlaced < centerTarget && centerAttempts < 600 && pieces < targetPieces + 10) {
    centerAttempts += 1;
    const wCells = randInt(1, 2);
    const hCells = randInt(1, 2);
    const gx = randInt(gxMin, Math.max(gxMin, gxMax - wCells));
    const gy = randInt(gyMin, Math.max(gyMin, gyMax - hCells));
    const rect = toRect(gx, gy, wCells, hCells);
    if (reserved.some((r) => rectsIntersect(inflate(rect, padReserved), inflate(r, padReserved)))) continue;
    if (wallsPlaced.some((w) => rectsIntersect(inflate(rect, padWalls), inflate(w, padWalls)))) continue;
    wallsPlaced.push(rect);
    pieces += 1;
    centerPlaced += 1;
  }

  // Boost side bands (left/right) if sparse.
  const sideTarget = Math.max(10, Math.floor(targetPieces * 0.3));
  const leftMaxX = Math.max(tile * 2, Math.floor(cols * 0.22) * tile);
  const rightMinX = Math.min(canvas.width - tile * 2, Math.floor(cols * 0.78) * tile);
  let leftPlaced = wallsPlaced.filter((r) => r.x + r.w <= leftMaxX).length;
  let rightPlaced = wallsPlaced.filter((r) => r.x >= rightMinX).length;
  let sideAttempts = 0;

  while (leftPlaced < sideTarget && sideAttempts < 600 && pieces < targetPieces + 16) {
    sideAttempts += 1;
    const wCells = randInt(1, 2);
    const hCells = randInt(1, 2);
    const gx = randInt(0, Math.max(0, Math.floor(leftMaxX / tile) - wCells));
    const gy = randInt(1, rows - hCells - 1);
    const rect = toRect(gx, gy, wCells, hCells);
    if (reserved.some((r) => rectsIntersect(inflate(rect, padReserved), inflate(r, padReserved)))) continue;
    if (wallsPlaced.some((w) => rectsIntersect(inflate(rect, padWalls), inflate(w, padWalls)))) continue;
    wallsPlaced.push(rect);
    pieces += 1;
    leftPlaced += 1;
  }

  sideAttempts = 0;
  while (rightPlaced < sideTarget && sideAttempts < 600 && pieces < targetPieces + 22) {
    sideAttempts += 1;
    const wCells = randInt(1, 2);
    const hCells = randInt(1, 2);
    const gx = randInt(Math.floor(rightMinX / tile), Math.max(Math.floor(rightMinX / tile), cols - wCells));
    const gy = randInt(1, rows - hCells - 1);
    const rect = toRect(gx, gy, wCells, hCells);
    if (reserved.some((r) => rectsIntersect(inflate(rect, padReserved), inflate(r, padReserved)))) continue;
    if (wallsPlaced.some((w) => rectsIntersect(inflate(rect, padWalls), inflate(w, padWalls)))) continue;
    wallsPlaced.push(rect);
    pieces += 1;
    rightPlaced += 1;
  }

  return wallsPlaced;
}

function createTank(opts) {
  return {
    x: opts.x,
    y: opts.y,
    angle: opts.angle ?? -Math.PI / 2,
    speed: opts.speed ?? 180,
    size: 40,
    color: opts.color ?? "#6cf",
    fireCooldown: 0,
    fireRate: opts.fireRate ?? 0.4,
    clipSize: opts.clipSize ?? 5,
    ammo: opts.clipSize ?? 5,
    reloadTime: opts.reloadTime ?? 3,
    reloadTimer: 0,
    isPlayer: !!opts.isPlayer,
    alive: true,
    spawnShield: opts.spawnShield ?? 0,
    ai: opts.ai ?? null,
    powerShieldTimer: 0,
    laserTimer: 0,
    cannonAmmo: 0,
    mineAmmo: 0,
  };
}

function initAudio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctx();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.32;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function playTone(freq, duration, volume, type = "sine") {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(masterGain);
  osc.start(t);
  osc.stop(t + duration);
}

function playHat(volume = 0.04) {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.08, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 5500;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  noise.connect(filter).connect(gain).connect(masterGain);
  noise.start(t);
  noise.stop(t + 0.09);
}

function playShootSound() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  osc.type = "square";
  osc.frequency.setValueAtTime(560, t);
  osc.frequency.exponentialRampToValueAtTime(240, t + 0.12);
  filter.type = "lowpass";
  filter.frequency.value = 1100;
  gain.gain.setValueAtTime(0.16, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
  osc.connect(filter).connect(gain).connect(masterGain);
  osc.start(t);
  osc.stop(t + 0.18);
}

function playLaserSound() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  // Distinct "zap" that sweeps upward plus a crisp hiss to separate from bullet/cannon sounds.
  const osc = audioCtx.createOscillator();
  const wobble = audioCtx.createOscillator();
  const oscGain = audioCtx.createGain();
  const noiseGain = audioCtx.createGain();
  const noise = audioCtx.createBufferSource();
  const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.08, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  noise.buffer = buf;
  const noiseFilter = audioCtx.createBiquadFilter();
  noiseFilter.type = "highpass";
  noiseFilter.frequency.value = 4500;

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(480, t);
  osc.frequency.exponentialRampToValueAtTime(2600, t + 0.18);

  wobble.type = "sine";
  wobble.frequency.value = 22;
  wobble.connect(osc.frequency);

  oscGain.gain.setValueAtTime(0.24, t);
  oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.23);

  noiseGain.gain.setValueAtTime(0.12, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

  osc.connect(oscGain).connect(masterGain);
  noise.connect(noiseFilter).connect(noiseGain).connect(masterGain);

  wobble.start(t);
  osc.start(t);
  noise.start(t);
  osc.stop(t + 0.23);
  noise.stop(t + 0.14);
  wobble.stop(t + 0.23);
}

function playExplosionSound() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.45, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const decay = 1 - i / data.length;
    data[i] = (Math.random() * 2 - 1) * decay * decay;
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1700;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.38, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  noise.connect(filter).connect(gain).connect(masterGain);
  noise.start(t);
  noise.stop(t + 0.5);
}

function playCannonExplosionSound() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const noiseBuf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.8, audioCtx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const decay = 1 - i / data.length;
    data[i] = (Math.random() * 2 - 1) * decay * decay * 1.3;
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuf;
  const thump = audioCtx.createOscillator();
  const thumpGain = audioCtx.createGain();
  thump.type = "sine";
  thump.frequency.setValueAtTime(95, t);
  thump.frequency.exponentialRampToValueAtTime(35, t + 0.38);
  thumpGain.gain.setValueAtTime(0.52, t);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);

  const filter = audioCtx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 240;
  filter.Q.value = 0.7;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.7, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
  noise.connect(filter).connect(gain).connect(masterGain);
  thump.connect(thumpGain).connect(masterGain);
  thump.start(t);
  noise.start(t);
  noise.stop(t + 0.8);
  thump.stop(t + 0.42);
}

function playMineExplosionSound() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const noiseBuf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.6, audioCtx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const decay = 1 - i / data.length;
    data[i] = (Math.random() * 2 - 1) * decay * decay * 1.15;
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuf;
  const ping = audioCtx.createOscillator();
  const pingGain = audioCtx.createGain();
  ping.type = "triangle";
  ping.frequency.setValueAtTime(1300, t);
  ping.frequency.exponentialRampToValueAtTime(520, t + 0.24);
  pingGain.gain.setValueAtTime(0.26, t);
  pingGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);

  const spark = audioCtx.createOscillator();
  const sparkGain = audioCtx.createGain();
  spark.type = "square";
  spark.frequency.setValueAtTime(2200, t);
  spark.frequency.exponentialRampToValueAtTime(900, t + 0.18);
  sparkGain.gain.setValueAtTime(0.12, t);
  sparkGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);

  const filter = audioCtx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1400;
  filter.Q.value = 1.5;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.52, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  noise.connect(filter).connect(gain).connect(masterGain);
  ping.connect(pingGain).connect(masterGain);
  spark.connect(sparkGain).connect(masterGain);
  ping.start(t);
  spark.start(t);
  noise.start(t);
  noise.stop(t + 0.6);
  ping.stop(t + 0.32);
  spark.stop(t + 0.2);
}

function playShieldHitSound() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const shimmer = audioCtx.createOscillator();
  const shimmerGain = audioCtx.createGain();
  const fizz = audioCtx.createBufferSource();
  const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.12, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  fizz.buffer = buf;
  const fizzFilter = audioCtx.createBiquadFilter();
  fizzFilter.type = "highpass";
  fizzFilter.frequency.value = 3200;

  shimmer.type = "triangle";
  shimmer.frequency.setValueAtTime(1350, t);
  shimmer.frequency.exponentialRampToValueAtTime(1800, t + 0.12);
  shimmerGain.gain.setValueAtTime(0.22, t);
  shimmerGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

  const fizzGain = audioCtx.createGain();
  fizzGain.gain.setValueAtTime(0.16, t);
  fizzGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

  shimmer.connect(shimmerGain).connect(masterGain);
  fizz.connect(fizzFilter).connect(fizzGain).connect(masterGain);
  shimmer.start(t);
  fizz.start(t);
  shimmer.stop(t + 0.2);
  fizz.stop(t + 0.12);
}

function playExplosionVariant(tag, opts = {}) {
  const includeBase = opts.includeBase ?? true;
  switch (tag) {
    case "cannon":
      playCannonExplosionSound();
      if (includeBase) playExplosionSound();
      return;
    case "mine":
      playMineExplosionSound();
      if (includeBase) playExplosionSound();
      return;
    case "none":
      return;
    default:
      playExplosionSound();
  }
}

function hitSoundTag(tank) {
  if (!tank) return "default";
  if (tank.cannonAmmo > 0) return "cannon";
  if (tank.mineAmmo > 0) return "mine";
  return "default";
}

function triggerShieldHitSound() {
  if (game.shieldHitCooldown > 0) return;
  playShieldHitSound();
  game.shieldHitCooldown = 0.18;
}

function startBgm() {
  if (!audioCtx || !masterGain) return;
  if (bgmTimer) return;
  bgmStep = 0;
  const tick = () => {
    if (!audioCtx || !masterGain) return;
    const bar = Math.floor(bgmStep / 16);
    const root = bgmRoots[bar % bgmRoots.length];

    const melodyOffset = bgmMelodyOffsets[bgmStep % bgmMelodyOffsets.length];
    playTone(midiToFreq(root + melodyOffset), 0.35, 0.07, "triangle");

    if (bgmStep % 4 === 0) {
      playTone(midiToFreq(root - 12), 0.6, 0.09, "sawtooth");
    }
    if (bgmStep % 8 === 4) {
      const arp = bgmArpOffsets[Math.floor(bgmStep / 8) % bgmArpOffsets.length];
      playTone(midiToFreq(root + arp), 0.28, 0.06, "square");
    }
    if (bgmStep % 2 === 0) {
      playHat(0.035);
    }
    if (bgmStep % 8 === 6) {
      playTone(midiToFreq(root + 3), 0.18, 0.05, "sine");
    }

    bgmStep += 1;
  };
  tick();
  bgmTimer = setInterval(tick, bgmIntervalMs);
}

function stopBgm() {
  if (bgmTimer) {
    clearInterval(bgmTimer);
    bgmTimer = null;
  }
  bgmStep = 0;
}

function beginGame() {
  if (game.started) return;
  game.started = true;
  game.lastTime = performance.now();
  if (startScreen) startScreen.classList.add("hidden");
  for (const key in keys) {
    delete keys[key];
  }
  initAudio();
  startBgm();
  resetGame();
  requestAnimationFrame(update);
}

function resetGame() {
  game.level = 1;
  game.lives = 3;
  game.status = "";
  game.enemies = [];
  game.bullets = [];
  game.enemyQueue = 0;
  game.powerups = [];
  game.powerupTimer = 2.5;
  game.mines = [];
  game.gameOver = false;
  game.shieldHitCooldown = 0;
  startLevel(1);
}

function startLevel(level) {
  game.level = level;
  applyTheme(level);
  game.enemies.length = 0;
  game.bullets.length = 0;
  game.enemyQueue = 3 + Math.max(0, level - 1);
  game.spawnTimer = 0.6;
  game.powerups.length = 0;
  game.powerupTimer = 3 + Math.random() * 3;
  game.mines.length = 0;
  const themeName = currentTheme().name ? ` · ${currentTheme().name}` : "";
  game.status = `第 ${level} 关${themeName}`;
  game.respawnTimer = 0;
  const previousSpawn = playerSpawn;
  playerSpawn = pickPlayerSpawn(previousSpawn, level);
  enemySpawns = generateEnemySpawns(playerSpawn, enemySpawnCount, level);
  walls = buildWalls(level, playerSpawn, enemySpawns);
  if (!game.player) {
    game.player = createTank({
      x: playerSpawn.x,
      y: playerSpawn.y,
      color: "#7fe495",
      speed: 220,
      fireRate: 0.3,
      clipSize: 5,
      reloadTime: 3,
      isPlayer: true,
      spawnShield: 1.2,
    });
  } else {
    respawnPlayer();
  }
  updateHud();
}

function respawnPlayer() {
  game.player.x = playerSpawn.x;
  game.player.y = playerSpawn.y;
  game.player.angle = -Math.PI / 2;
  game.player.alive = true;
  game.player.spawnShield = 1.2;
  game.player.powerShieldTimer = 0;
  game.player.laserTimer = 0;
  game.player.cannonAmmo = 0;
  game.player.mineAmmo = 0;
  game.player.ammo = game.player.clipSize;
  game.player.reloadTimer = 0;
  game.player.fireCooldown = 0;
  game.player.deathTimer = 0;
}

function spawnEnemy() {
  const slots = enemySpawns.length ? enemySpawns : defaultEnemySpawns;
  const slot = slots[Math.floor(Math.random() * slots.length)];
  const pos = findFreePosition(slot.x, slot.y, minEnemyPlayerDistance(game.level));
  const enemy = createTank({
    x: pos.x,
    y: pos.y,
    color: "#ffb36b",
    speed: 150,
    fireRate: 1.2,
    clipSize: 5,
    reloadTime: 3,
    ai: {
      changeTimer: 0.2,
      targetAngle: Math.atan2(canvas.height * 0.6 - pos.y, canvas.width / 2 - pos.x),
    },
  });
  enemy.spawnShield = 0.8;
  enemy.deathTimer = 0;
  game.enemies.push(enemy);
}

function spawnPowerup() {
  const totalWeight = powerupWeights.reduce((sum, p) => sum + p.w, 0);
  let pick = Math.random() * totalWeight;
  let type = powerupTypes[0];
  for (const p of powerupWeights) {
    if (pick <= p.w) {
      type = p.type;
      break;
    }
    pick -= p.w;
  }
  const size = 26;
  const pos = findPowerupPosition(size);
  if (!pos) return;
  game.powerups.push({
    x: pos.x,
    y: pos.y,
    r: size / 2,
    type,
    ttl: 14 + Math.random() * 8,
  });
}

function findPowerupPosition(size) {
  const r = size / 2;
  for (let i = 0; i < 30; i++) {
    const x = clamp(Math.random() * canvas.width, r + 6, canvas.width - r - 6);
    const y = clamp(Math.random() * canvas.height, r + 6, canvas.height - r - 6);
    const rect = { x: x - r, y: y - r, w: size, h: size };
    if (collidesWalls(rect)) continue;
    if (game.player && rectsIntersect(rect, tankRect(game.player))) continue;
    if (game.enemies.some((e) => rectsIntersect(rect, tankRect(e)))) continue;
    return { x, y };
  }
  return null;
}

function dropMine(tank) {
  const size = 20;
  const r = size / 2;
  const mx = clamp(tank.x + Math.cos(tank.angle) * 18, r, canvas.width - r);
  const my = clamp(tank.y + Math.sin(tank.angle) * 18, r, canvas.height - r);
  const rect = { x: mx - r, y: my - r, w: size, h: size };
  if (collidesWalls(rect)) return;
  game.mines.push({
    x: mx,
    y: my,
    r,
    owner: tank.isPlayer ? "player" : "enemy",
    ttl: 18,
    armed: 0.4,
  });
  tank.mineAmmo = Math.max(0, tank.mineAmmo - 1);
}

function findFreePosition(x, y, minDistanceFromPlayer = 0) {
  const temp = { x, y, w: 40, h: 40 };
  const rect = (cx, cy) => ({
    x: cx - temp.w / 2,
    y: cy - temp.h / 2,
    w: temp.w,
    h: temp.h,
  });
  const farFromPlayer = (cx, cy, dist = minDistanceFromPlayer) => {
    if (!game.player || dist <= 0) return true;
    return Math.hypot(cx - game.player.x, cy - game.player.y) >= dist;
  };
  const tryCandidate = (cx, cy, dist = minDistanceFromPlayer) => {
    if (!farFromPlayer(cx, cy, dist)) return false;
    const r = rect(cx, cy);
    if (collidesWalls(r)) return false;
    if (tanksCollide({ ...temp, x: cx, y: cy }, game.enemies)) return false;
    if (game.player && tankTouches({ ...temp, x: cx, y: cy }, game.player)) return false;
    return true;
  };

  const radii = [tile * 0.5, tile * 1, tile * 1.8, tile * 2.6];
  for (const r of radii) {
    for (let i = 0; i < 18; i++) {
      const cx = clamp(x + (Math.random() * 2 - 1) * r, temp.w / 2, canvas.width - temp.w / 2);
      const cy = clamp(y + (Math.random() * 2 - 1) * r, temp.h / 2, canvas.height - temp.h / 2);
      if (tryCandidate(cx, cy)) {
        return { x: cx, y: cy };
      }
    }
  }

  if (game.player && minDistanceFromPlayer > 0) {
    const dx = x - game.player.x || (Math.random() * 2 - 1);
    const dy = y - game.player.y || (Math.random() * 2 - 1);
    const len = Math.hypot(dx, dy) || 1;
    const baseCx = clamp(game.player.x + (dx / len) * minDistanceFromPlayer, temp.w / 2, canvas.width - temp.w / 2);
    const baseCy = clamp(game.player.y + (dy / len) * minDistanceFromPlayer, temp.h / 2, canvas.height - temp.h / 2);
    const soften = [0.95, 0.9, 0.85];
    for (const factor of soften) {
      const dist = minDistanceFromPlayer * factor;
      if (tryCandidate(baseCx, baseCy, dist)) return { x: baseCx, y: baseCy };
      const ang = Math.random() * Math.PI * 2;
      const cx = clamp(game.player.x + Math.cos(ang) * dist, temp.w / 2, canvas.width - temp.w / 2);
      const cy = clamp(game.player.y + Math.sin(ang) * dist, temp.h / 2, canvas.height - temp.h / 2);
      if (tryCandidate(cx, cy, dist)) return { x: cx, y: cy };
    }
  }

  // Final fallback: clamp the requested slot into bounds, but still insist on being away from the player if possible.
  const fallback = {
    x: clamp(x, temp.w / 2, canvas.width - temp.w / 2),
    y: clamp(y, temp.h / 2, canvas.height - temp.h / 2),
  };
  if (farFromPlayer(fallback.x, fallback.y, minDistanceFromPlayer * 0.8)) return fallback;
  return {
    x: clamp(fallback.x + tile * 2, temp.w / 2, canvas.width - temp.w / 2),
    y: clamp(fallback.y - tile * 2, temp.h / 2, canvas.height - temp.h / 2),
  };
}

function update(time) {
  const dt = Math.min((time - game.lastTime) / 1000, 0.05);
  game.lastTime = time;
  game.shieldHitCooldown = Math.max(0, game.shieldHitCooldown - dt);

  if (!game.player) return;

  tickTankTimers(game.player, dt);

  handleInput(dt);

  game.spawnTimer -= dt;
  if (!game.gameOver && game.enemyQueue > 0 && game.enemies.length < game.maxAlive && game.spawnTimer <= 0) {
    spawnEnemy();
    game.enemyQueue -= 1;
    game.spawnTimer = 1.1;
  }

  updateEnemies(dt);
  updateBullets(dt);
  updatePowerups(dt);
  updateMines(dt);
  updatePlayerRespawn(dt);

  if (!game.gameOver && game.enemyQueue === 0 && game.enemies.length === 0) {
    startLevel(game.level + 1);
  }

  draw();
  updateHud();
  requestAnimationFrame(update);
}

function handleInput(dt) {
  const p = game.player;
  if (!p.alive) return;
  const rotateSpeed = 4;
  let moveDir = 0;
  if (keys["w"] || keys["arrowup"]) moveDir += 1;
  if (keys["s"] || keys["arrowdown"]) moveDir -= 1;

  let rotate = 0;
  if (keys["a"] || keys["arrowleft"]) rotate -= 1;
  if (keys["d"] || keys["arrowright"]) rotate += 1;

  if (rotate !== 0) {
    p.angle = wrapAngle(p.angle + rotate * rotateSpeed * dt);
  }

  if (moveDir !== 0) {
    const dx = Math.cos(p.angle) * p.speed * dt * moveDir;
    const dy = Math.sin(p.angle) * p.speed * dt * moveDir;
    moveTank(p, dx, dy);
  }

  if (keys[" "] || keys["space"]) {
    shoot(p);
  }
}

function updatePlayerRespawn(dt) {
  const p = game.player;
  if (p.alive) return;
  game.respawnTimer -= dt;
  if (game.respawnTimer <= 0 && game.lives > 0) {
    respawnPlayer();
  }
}

function updateEnemies(dt) {
  for (const e of game.enemies) {
    tickTankTimers(e, dt);
    if (!e.alive) continue;
    e.ai.changeTimer -= dt;

    const playerAlive = game.player.alive && !game.gameOver;
    const distToPlayer = playerAlive ? Math.hypot(game.player.x - e.x, game.player.y - e.y) : Infinity;
    const chase = playerAlive && distToPlayer < 320;
    if (e.ai.changeTimer <= 0) {
      if (chase) {
        const dx = game.player.x - e.x;
        const dy = game.player.y - e.y;
        e.ai.targetAngle = Math.atan2(dy, dx);
      } else {
        e.ai.targetAngle = Math.random() * Math.PI * 2;
      }
      e.ai.changeTimer = (chase ? 0.4 : 0.8) + Math.random() * (chase ? 0.5 : 0.8);
    }

    if (!chase) {
      const margin = 64;
      const nearEdge =
        e.x < margin || e.x > canvas.width - margin || e.y < margin || e.y > canvas.height - margin;
      if (nearEdge) {
        e.ai.targetAngle = Math.atan2(canvas.height / 2 - e.y, canvas.width / 2 - e.x);
        e.ai.changeTimer = 0.3;
      }
    }

    let pushX = 0;
    let pushY = 0;
    const edgeRange = 140;
    if (e.x < edgeRange) pushX += (edgeRange - e.x) / edgeRange;
    if (e.x > canvas.width - edgeRange) pushX -= (e.x - (canvas.width - edgeRange)) / edgeRange;
    if (e.y < edgeRange) pushY += (edgeRange - e.y) / edgeRange;
    if (e.y > canvas.height - edgeRange) pushY -= (e.y - (canvas.height - edgeRange)) / edgeRange;
    if (!chase && (pushX !== 0 || pushY !== 0)) {
      const baseX = Math.cos(e.ai.targetAngle ?? e.angle);
      const baseY = Math.sin(e.ai.targetAngle ?? e.angle);
      const mixX = baseX + pushX * 1.8;
      const mixY = baseY + pushY * 1.8;
      e.ai.targetAngle = Math.atan2(mixY, mixX);
      e.ai.changeTimer = Math.min(e.ai.changeTimer, 0.25);
    }

    const avoidDist = Math.max(64, e.speed * dt * 3.5);
    if (willHitWall(e, e.ai.targetAngle ?? e.angle, avoidDist)) {
      e.ai.targetAngle = findClearAngle(e, e.ai.targetAngle ?? e.angle, avoidDist);
      e.ai.changeTimer = 0.35;
    }

    const diff = wrapAngle(e.ai.targetAngle - e.angle);
    e.angle += clamp(diff, -2.5 * dt, 2.5 * dt);

    const mv = { x: Math.cos(e.angle) * e.speed * dt, y: Math.sin(e.angle) * e.speed * dt };
    const moved = moveTank(e, mv.x, mv.y);
    if (Math.hypot(moved.dx, moved.dy) < 1.5) {
      // If stuck (e.g., blocked by a wall), quickly pick a new direction.
      const turn = (Math.random() * 0.8 + 0.6) * (Math.random() < 0.5 ? 1 : -1);
      e.ai.targetAngle = wrapAngle(e.angle + turn);
      e.ai.changeTimer = 0.15;
    }

    if (playerAlive && hasLineOfSight(e.x, e.y, game.player.x, game.player.y)) {
      e.angle = Math.atan2(game.player.y - e.y, game.player.x - e.x);
      if (canShoot(e) && distToPlayer < 500 && Math.random() < 0.2) {
        shoot(e);
      }
    }
  }
}

function shoot(tank) {
  if (!tank.alive) return;
  if (tank.reloadTimer > 0) return;
  if (tank.ammo <= 0) {
    tank.reloadTimer = tank.reloadTime;
    return;
  }
  if (tank.fireCooldown > 0) return;
  const speed = 420;
  const isLaser = tank.isPlayer && tank.laserTimer > 0;
  const useCannon = tank.isPlayer && tank.cannonAmmo > 0 && !isLaser;
  const useMine = tank.isPlayer && tank.mineAmmo > 0 && !isLaser && !useCannon;
  // Spawn muzzle a bit farther to avoid colliding with the shooter on spawn.
  const offset = tank.size * 0.8;
  const angle = tank.angle;
  const spawnX = tank.x + Math.cos(angle) * offset;
  const spawnY = tank.y + Math.sin(angle) * offset;
  if (useMine) {
    dropMine(tank);
  } else if (useCannon) {
    game.bullets.push({
      x: spawnX,
      y: spawnY,
      dx: Math.cos(angle) * 320,
      dy: Math.sin(angle) * 320,
      owner: "player",
      color: "#ffdd99",
      ttl: 2,
      r: 5,
      bouncesLeft: 0,
      pierceWalls: false,
      type: "cannonShell",
    });
    tank.cannonAmmo -= 1;
  } else if (isLaser) {
    const end = computeLaserEnd(spawnX, spawnY, angle);
    game.bullets.push({
      x: spawnX,
      y: spawnY,
      ex: end.x,
      ey: end.y,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      owner: tank.isPlayer ? "player" : "enemy",
      color: laserColor,
      ttl: 0.2,
      type: "laserBeam",
      pierceWalls: true,
    });
  } else {
    game.bullets.push({
      x: spawnX,
      y: spawnY,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      owner: tank.isPlayer ? "player" : "enemy",
      color: bulletColor,
      ttl: 2.5,
      r: 4,
      bouncesLeft: 5,
      pierceWalls: false,
      type: "normal",
    });
  }
  if (isLaser) {
    playLaserSound();
  } else {
    playShootSound();
  }
  tank.fireCooldown = tank.fireRate;
  tank.ammo -= 1;
  if (tank.ammo <= 0) {
    tank.reloadTimer = tank.reloadTime;
  }
}

function killPlayer(opts = {}) {
  if (!game.player.alive) return;
  const { silent = false, ignoreShield = false } = opts;
  if (!ignoreShield && playerShielded()) return;
  if (!silent) {
    const tag = hitSoundTag(game.player);
    const includeBase = tag === "default";
    playExplosionVariant(tag, { includeBase });
  }
  game.player.alive = false;
  game.lives -= 1;
  game.player.deathTimer = 0.6;
  if (game.lives <= 0) {
    game.gameOver = true;
    game.status = "战败，按 R 重新开始";
  } else {
    game.respawnTimer = 1.2;
    game.status = "你被击中，准备复活";
  }
}

function playerShielded() {
  return game.player.spawnShield > 0 || game.player.powerShieldTimer > 0;
}

function updateBullets(dt) {
  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const b = game.bullets[i];
    if (b.type === "flash") {
      b.ttl -= dt;
      if (b.ttl <= 0) {
        game.bullets.splice(i, 1);
      }
      continue;
    }
    if (b.type === "laserBeam") {
      b.ttl -= dt;
      if (b.ttl <= 0) {
        game.bullets.splice(i, 1);
        continue;
      }

      if (game.player.alive && segmentIntersectsRect(b.x, b.y, b.ex, b.ey, tankRect(game.player))) {
        if (!playerShielded()) {
          killPlayer();
        } else {
          triggerShieldHitSound();
        }
      }

      for (let j = game.enemies.length - 1; j >= 0; j--) {
        const e = game.enemies[j];
        if (!e.alive) continue;
        if (segmentIntersectsRect(b.x, b.y, b.ex, b.ey, tankRect(e))) {
          if (e.spawnShield > 0) continue;
          playExplosionSound();
          e.alive = false;
          e.deathTimer = 0.6;
        }
      }
      continue;
    }

    if (b.type === "cannonShell") {
      const cannonExplosion = {
        radius: 95,
        fragments: 12,
        fragmentStyle: "poly",
        randomFragments: true,
        randomFragmentDirection: true,
        flash: true,
        flashRadius: 120,
        sound: "cannon",
        avoidWalls: true,
        avoidWallsDistance: 50,
        avoidWallsPadding: 14,
        clampToBounds: true,
        clearPad: 8,
      };
      b.ttl -= dt;
      if (b.ttl <= 0) {
        explodeAt(b.x, b.y, b.owner, cannonExplosion);
        game.bullets.splice(i, 1);
        continue;
      }
      b.x += b.dx * dt;
      b.y += b.dy * dt;
      const hitWall = collidesWalls({ x: b.x - 3, y: b.y - 3, w: 6, h: 6 });
      const hitBorder = b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height;
      if (hitWall || hitBorder) {
        let ex = b.x;
        let ey = b.y;
        if (hitWall) {
          const len = Math.hypot(b.dx, b.dy) || 1;
          const step = 6;
          let attempts = 0;
          while (
            attempts < 10 &&
            collidesWalls({ x: ex - 3, y: ey - 3, w: 6, h: 6 })
          ) {
            ex -= (b.dx / len) * step;
            ey -= (b.dy / len) * step;
            attempts += 1;
          }
        }
        ex = clamp(ex, 4, canvas.width - 4);
        ey = clamp(ey, 4, canvas.height - 4);
        explodeAt(ex, ey, b.owner, cannonExplosion);
        game.bullets.splice(i, 1);
        continue;
      }
      const playerHit = game.player.alive && circleRect({ x: b.x, y: b.y, r: 4 }, tankRect(game.player));
      if (playerHit) {
        if (!playerShielded()) {
          killPlayer({ silent: true });
        } else {
          triggerShieldHitSound();
        }
        explodeAt(b.x, b.y, b.owner, cannonExplosion);
        game.bullets.splice(i, 1);
        continue;
      }
    const enemyIndex = game.enemies.findIndex((e) => circleRect({ x: b.x, y: b.y, r: 4 }, tankRect(e)) && e.alive);
      if (enemyIndex !== -1) {
        const target = game.enemies[enemyIndex];
        if (target.spawnShield <= 0) {
          explodeAt(b.x, b.y, b.owner, cannonExplosion);
          target.alive = false;
          target.deathTimer = 0.6;
        }
        game.bullets.splice(i, 1);
        continue;
      }
      continue;
    }

    b.ttl -= dt;
    b.x += b.dx * dt;
    b.y += b.dy * dt;
    if (typeof b.spin === "number") {
      b.rotation = (b.rotation ?? 0) + b.spin * dt;
    }

    if (b.ttl <= 0) {
      game.bullets.splice(i, 1);
      continue;
    }

    if (handleBulletBounce(b)) {
      if (b.bouncesLeft < 0) {
        game.bullets.splice(i, 1);
        continue;
      }
    }

    const p = game.player;
    if (p.alive && circleRect(b, tankRect(p))) {
      game.bullets.splice(i, 1);
      if (!playerShielded()) {
        killPlayer();
      } else {
        triggerShieldHitSound();
      }
      continue;
    }

    const hitIndex = game.enemies.findIndex((e) => circleRect(b, tankRect(e)) && e.alive);
    if (hitIndex !== -1) {
      const target = game.enemies[hitIndex];
      game.bullets.splice(i, 1);
      if (target.spawnShield > 0) {
        continue;
      }
      playExplosionSound();
      target.alive = false;
      target.deathTimer = 0.6;
    }
  }
}

function updatePowerups(dt) {
  game.powerupTimer -= dt;
  const maxPowerups = 3;
  if (!game.gameOver && game.powerups.length < maxPowerups && game.powerupTimer <= 0) {
    spawnPowerup();
    game.powerupTimer = 7 + Math.random() * 5;
  }

  game.enemies = game.enemies.filter((e) => e.alive || (e.deathTimer ?? 0) > 0);

  for (let i = game.powerups.length - 1; i >= 0; i--) {
    const pwr = game.powerups[i];
    pwr.ttl -= dt;
    if (pwr.ttl <= 0) {
      game.powerups.splice(i, 1);
      continue;
    }
    const playerRect = tankRect(game.player);
    const circle = { x: pwr.x, y: pwr.y, r: pwr.r };
    if (circleRect(circle, playerRect) && game.player.alive) {
      applyPowerup(pwr.type);
      game.powerups.splice(i, 1);
    }
  }
}

function updateMines(dt) {
  const mineExplosion = {
    radius: 110,
    fragments: 0,
    flash: true,
    flashRadius: 140,
    sound: "mine",
    clampToBounds: true,
    clearPad: 10,
  };
  for (let i = game.mines.length - 1; i >= 0; i--) {
    const m = game.mines[i];
    m.ttl -= dt;
    if (m.ttl <= 0) {
      game.mines.splice(i, 1);
      continue;
    }
    if (m.armed > 0) {
      m.armed -= dt;
      continue;
    }
    const triggerRadius = 26;
    if (game.player.alive && m.owner !== "player") {
      if (Math.hypot(game.player.x - m.x, game.player.y - m.y) < triggerRadius) {
        explodeAt(m.x, m.y, m.owner, mineExplosion);
        game.mines.splice(i, 1);
        continue;
      }
    }
    if (m.owner === "player") {
      const hitIndex = game.enemies.findIndex((e) => Math.hypot(e.x - m.x, e.y - m.y) < triggerRadius);
      if (hitIndex !== -1) {
        explodeAt(m.x, m.y, m.owner, mineExplosion);
        game.mines.splice(i, 1);
        continue;
      }
    }
  }
}

function applyPowerup(type) {
  const p = game.player;
  switch (type) {
    case "shield":
      p.powerShieldTimer = 8;
      game.status = "护盾已激活";
      break;
    case "heart":
      game.lives = Math.min(5, game.lives + 1);
      game.status = "生命 +1";
      break;
    case "laser":
      p.laserTimer = 8;
      game.status = "激光弹药就绪";
      break;
    case "cannon":
      p.cannonAmmo = 3;
      game.status = "炮弹已装填";
      break;
    case "mine":
      p.mineAmmo = 2;
      game.status = "地雷可用";
      break;
    default:
      break;
  }
}

function handleBulletBounce(b) {
  let bounced = false;

  if (b.type === "laserBeam") {
    return false;
  }

  // Border bounce
  if (b.x < b.r) {
    b.x = b.r;
    b.dx *= -1;
    b.bouncesLeft -= 1;
    bounced = true;
  } else if (b.x > canvas.width - b.r) {
    b.x = canvas.width - b.r;
    b.dx *= -1;
    b.bouncesLeft -= 1;
    bounced = true;
  }
  if (b.y < b.r) {
    b.y = b.r;
    b.dy *= -1;
    b.bouncesLeft -= 1;
    bounced = true;
  } else if (b.y > canvas.height - b.r) {
    b.y = canvas.height - b.r;
    b.dy *= -1;
    b.bouncesLeft -= 1;
    bounced = true;
  }

  if (b.pierceWalls) {
    return bounced;
  }

  // Wall bounce
  for (const w of walls) {
    if (!circleRect(b, w)) continue;
    const overlapLeft = b.x + b.r - w.x;
    const overlapRight = w.x + w.w - (b.x - b.r);
    const overlapTop = b.y + b.r - w.y;
    const overlapBottom = w.y + w.h - (b.y - b.r);
    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

    if (minOverlap === overlapLeft) {
      b.x = w.x - b.r;
      b.dx = -Math.abs(b.dx);
    } else if (minOverlap === overlapRight) {
      b.x = w.x + w.w + b.r;
      b.dx = Math.abs(b.dx);
    } else if (minOverlap === overlapTop) {
      b.y = w.y - b.r;
      b.dy = -Math.abs(b.dy);
    } else {
      b.y = w.y + w.h + b.r;
      b.dy = Math.abs(b.dy);
    }

    b.bouncesLeft -= 1;
    bounced = true;
    break; // Resolve one wall per frame for stability.
  }

  return bounced;
}

function moveTank(tank, dx, dy) {
  const beforeX = tank.x;
  const beforeY = tank.y;
  const w = tank.size;
  const h = tank.size;
  let nx = tank.x + dx;
  let ny = tank.y + dy;

  let rect = { x: nx - w / 2, y: ny - h / 2, w, h };
  if (collidesWalls(rect)) {
    const rectX = { x: tank.x + dx - w / 2, y: tank.y - h / 2, w, h };
    const rectY = { x: tank.x - w / 2, y: tank.y + dy - h / 2, w, h };
    if (!collidesWalls(rectX)) {
      ny = tank.y;
      rect = rectX;
    } else if (!collidesWalls(rectY)) {
      nx = tank.x;
      rect = rectY;
    } else {
      nx = tank.x;
      ny = tank.y;
      rect = { x: tank.x - w / 2, y: tank.y - h / 2, w, h };
    }
  }

  tank.x = clamp(nx, w / 2, canvas.width - w / 2);
  tank.y = clamp(ny, h / 2, canvas.height - h / 2);

  // Avoid overlapping other enemies crudely by nudging away.
  if (!tank.isPlayer) {
    for (const other of game.enemies) {
      if (other === tank) continue;
      if (tankTouches(tank, other)) {
        const dxn = tank.x - other.x || 0.01;
        const dyn = tank.y - other.y || 0.01;
        const len = Math.hypot(dxn, dyn);
        tank.x += (dxn / len) * 8;
        tank.y += (dyn / len) * 8;
      }
    }
  }

  return { dx: tank.x - beforeX, dy: tank.y - beforeY };
}

function tanksCollide(temp, list) {
  return list.some((t) => tankTouches(temp, t));
}

function tickTankTimers(tank, dt) {
  if (!tank) return;
  if (tank.spawnShield > 0) tank.spawnShield -= dt;
  if (tank.powerShieldTimer > 0) tank.powerShieldTimer = Math.max(0, tank.powerShieldTimer - dt);
  if (tank.laserTimer > 0) tank.laserTimer = Math.max(0, tank.laserTimer - dt);
  if (tank.cannonAmmo < 0) tank.cannonAmmo = 0;
  if (tank.mineAmmo < 0) tank.mineAmmo = 0;
  tank.fireCooldown = Math.max(0, tank.fireCooldown - dt);
  if (tank.reloadTimer > 0) {
    tank.reloadTimer -= dt;
    if (tank.reloadTimer <= 0) {
      tank.reloadTimer = 0;
      tank.ammo = tank.clipSize;
    }
  }
  if (tank.deathTimer !== undefined && tank.deathTimer > 0) {
    tank.deathTimer = Math.max(0, tank.deathTimer - dt);
  }
}

function tankTouches(a, b) {
  const wa = a.w ?? a.size ?? 40;
  const ha = a.h ?? a.size ?? 40;
  const rectA = { x: a.x - wa / 2, y: a.y - ha / 2, w: wa, h: ha };
  const rectB = tankRect(b);
  return rectsIntersect(rectA, rectB);
}

function hasLineOfSight(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy);
  const steps = Math.ceil(dist / 16);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = ax + dx * t;
    const py = ay + dy * t;
    if (pointHitsWall(px, py)) return false;
  }
  return true;
}

function pointHitsWall(x, y) {
  return walls.some((w) => x >= w.x && x <= w.x + w.w && y >= w.y && y <= w.y + w.h);
}

function findClearExplosionPoint(x, y, pad = 4) {
  let px = clamp(x, pad, canvas.width - pad);
  let py = clamp(y, pad, canvas.height - pad);
  if (!pointHitsWall(px, py)) return { x: px, y: py };
  const radii = [8, 16, 24, 32];
  const steps = 16;
  for (const r of radii) {
    for (let i = 0; i < steps; i++) {
      const ang = (Math.PI * 2 * i) / steps;
      const nx = px + Math.cos(ang) * r;
      const ny = py + Math.sin(ang) * r;
      if (!inBoundsPad(nx, ny, pad)) continue;
      if (!pointHitsWall(nx, ny)) {
        return { x: nx, y: ny };
      }
    }
  }
  return { x: px, y: py };
}

function collidesWalls(rect) {
  return walls.some((w) => rectsIntersect(rect, w));
}

function willHitWall(tank, angle, dist) {
  const size = tank.size;
  const nx = tank.x + Math.cos(angle) * dist;
  const ny = tank.y + Math.sin(angle) * dist;
  const rect = { x: nx - size / 2, y: ny - size / 2, w: size, h: size };
  const hitsBounds = rect.x < 0 || rect.y < 0 || rect.x + rect.w > canvas.width || rect.y + rect.h > canvas.height;
  return hitsBounds || collidesWalls(rect);
}

function findClearAngle(tank, preferred, dist) {
  const options = [
    preferred + Math.PI / 2,
    preferred - Math.PI / 2,
    preferred + Math.PI / 3,
    preferred - Math.PI / 3,
    preferred + Math.PI,
    Math.random() * Math.PI * 2,
  ];
  for (const ang of options) {
    if (!willHitWall(tank, ang, dist * 0.9)) {
      return wrapAngle(ang);
    }
  }
  return wrapAngle(preferred + Math.PI / 2);
}

function rectsIntersect(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function inflate(rect, pad) {
  return { x: rect.x - pad, y: rect.y - pad, w: rect.w + pad * 2, h: rect.h + pad * 2 };
}

function circleRect(circle, rect) {
  const cx = clamp(circle.x, rect.x, rect.x + rect.w);
  const cy = clamp(circle.y, rect.y, rect.y + rect.h);
  const dx = circle.x - cx;
  const dy = circle.y - cy;
  return dx * dx + dy * dy <= circle.r * circle.r;
}

function segmentsIntersect(a1, a2, b1, b2) {
  const cross = (x1, y1, x2, y2) => x1 * y2 - y1 * x2;
  const d1x = a2.x - a1.x;
  const d1y = a2.y - a1.y;
  const d2x = b2.x - b1.x;
  const d2y = b2.y - b1.y;

  const denom = cross(d1x, d1y, d2x, d2y);
  if (denom === 0) return false;

  const dx = b1.x - a1.x;
  const dy = b1.y - a1.y;
  const t = cross(dx, dy, d2x, d2y) / denom;
  const u = cross(dx, dy, d1x, d1y) / denom;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

function segmentIntersectsRect(x1, y1, x2, y2, rect) {
  // Inside check
  if (x1 >= rect.x && x1 <= rect.x + rect.w && y1 >= rect.y && y1 <= rect.y + rect.h) return true;
  if (x2 >= rect.x && x2 <= rect.x + rect.w && y2 >= rect.y && y2 <= rect.y + rect.h) return true;
  const r1 = { x: rect.x, y: rect.y };
  const r2 = { x: rect.x + rect.w, y: rect.y };
  const r3 = { x: rect.x + rect.w, y: rect.y + rect.h };
  const r4 = { x: rect.x, y: rect.y + rect.h };
  const p1 = { x: x1, y: y1 };
  const p2 = { x: x2, y: y2 };
  return (
    segmentsIntersect(p1, p2, r1, r2) ||
    segmentsIntersect(p1, p2, r2, r3) ||
    segmentsIntersect(p1, p2, r3, r4) ||
    segmentsIntersect(p1, p2, r4, r1)
  );
}

function tankRect(t) {
  const size = t.size;
  return { x: t.x - size / 2, y: t.y - size / 2, w: size, h: size };
}

function outOfBounds(x, y, r) {
  return x < -r || x > canvas.width + r || y < -r || y > canvas.height + r;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function inBoundsPad(x, y, pad = 0) {
  return x >= pad && x <= canvas.width - pad && y >= pad && y <= canvas.height - pad;
}

function hexToRgba(hex, alpha = 1) {
  if (!hex) return `rgba(255,255,255,${alpha})`;
  const h = hex.replace("#", "");
  const parse = (str) => parseInt(str, 16);
  const r = h.length === 3 ? parse(h[0] + h[0]) : parse(h.slice(0, 2));
  const g = h.length === 3 ? parse(h[1] + h[1]) : parse(h.slice(2, 4));
  const b = h.length === 3 ? parse(h[2] + h[2]) : parse(h.slice(4, 6));
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawRoundedRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function randInt(min, maxInclusive) {
  return Math.floor(Math.random() * (maxInclusive - min + 1)) + min;
}

function canShoot(tank) {
  return tank.alive && tank.fireCooldown <= 0 && tank.reloadTimer <= 0 && tank.ammo > 0;
}

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function clearShot(x, y, angle, dist, pad = 0) {
  const endX = x + Math.cos(angle) * dist;
  const endY = y + Math.sin(angle) * dist;
  if (!inBoundsPad(endX, endY, pad)) return false;
  for (const w of walls) {
    if (segmentIntersectsRect(x, y, endX, endY, w)) return false;
  }
  return true;
}

function computeLaserEnd(x, y, angle) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let tMax = Infinity;
  if (Math.abs(dx) > 1e-6) {
    const tx = dx > 0 ? (canvas.width - x) / dx : (0 - x) / dx;
    tMax = Math.min(tMax, tx);
  }
  if (Math.abs(dy) > 1e-6) {
    const ty = dy > 0 ? (canvas.height - y) / dy : (0 - y) / dy;
    tMax = Math.min(tMax, ty);
  }
  const len = Math.max(0, tMax);
  return { x: x + dx * len, y: y + dy * len };
}

function explodeAt(x, y, owner, opts = {}) {
  let ex = x;
  let ey = y;
  if (opts.clampToBounds) {
    ex = clamp(x, 4, canvas.width - 4);
    ey = clamp(y, 4, canvas.height - 4);
  }
  const clearPos = findClearExplosionPoint(ex, ey, opts.clearPad ?? 6);
  ex = clearPos.x;
  ey = clearPos.y;
  const sound = opts.sound ?? "default";

  const radius = opts.radius ?? 90;
  const baseFragments = opts.fragments ?? 8;
  const usePolyFragments = opts.fragmentStyle === "poly";
  const randomFragmentCount = opts.randomFragments ?? false;
  const fragmentCount = randomFragmentCount
    ? randInt(Math.max(4, Math.floor(baseFragments * 0.6)), Math.max(6, Math.ceil(baseFragments * 1.4)))
    : baseFragments;
  const randomFragmentDir = opts.randomFragmentDirection ?? usePolyFragments;
  const fragSpeed = opts.fragmentSpeed ?? 420;
  const fragTtl = opts.fragmentTtl ?? 1;
  const fragColor = owner === "player" ? "#ffd27f" : "#ff9f6e";
  const avoidWalls = opts.avoidWalls ?? false;
  const avoidWallsDist = opts.avoidWallsDistance ?? 48;
  const avoidWallsPad = opts.avoidWallsPadding ?? 10;
  const maxTravel = fragSpeed * fragTtl;

  if (opts.flash) {
    const flashTtl = opts.flashTtl ?? 0.25;
    game.bullets.push({
      type: "flash",
      x: ex,
      y: ey,
      r: opts.flashRadius ?? radius * 0.9,
      ttl: flashTtl,
      life: flashTtl,
      color: fragColor,
      dx: 0,
      dy: 0,
      owner,
    });
  }

  const playerInBlast = game.player.alive && Math.hypot(game.player.x - ex, game.player.y - ey) <= radius;
  if (playerInBlast) {
    if (playerShielded()) {
      triggerShieldHitSound();
    } else {
      killPlayer({ silent: true });
    }
  }

  for (let i = game.enemies.length - 1; i >= 0; i--) {
    const e = game.enemies[i];
    if (!e.alive) continue;
    if (Math.hypot(e.x - ex, e.y - ey) <= radius && e.spawnShield <= 0) {
      e.alive = false;
      e.deathTimer = 0.6;
    }
  }

  for (let i = 0; i < fragmentCount; i++) {
    const baseAng = (Math.PI * 2 * i) / fragmentCount;
    let ang = randomFragmentDir ? Math.random() * Math.PI * 2 : baseAng;
    if (avoidWalls) {
      const travel = Math.max(maxTravel, avoidWallsDist);
      const clearDir = (candidate) => clearShot(ex, ey, candidate, travel, avoidWallsPad);
      let found = false;
      for (let attempt = 0; attempt < 8; attempt++) {
        const cand = randomFragmentDir ? Math.random() * Math.PI * 2 : baseAng + (Math.random() * 0.6 - 0.3);
        if (clearDir(cand)) {
          ang = cand;
          found = true;
          break;
        }
      }
      if (!found) {
        const centerAng = Math.atan2(canvas.height / 2 - y, canvas.width / 2 - x);
        if (clearDir(centerAng)) {
          ang = centerAng;
          found = true;
        }
      }
      if (!found && randomFragmentDir) {
        const cand = Math.random() * Math.PI * 2;
        if (clearDir(cand)) {
          ang = cand;
          found = true;
        }
      }
    }
    const speed = fragSpeed * (0.65 + Math.random() * 0.55);
    const sides = usePolyFragments ? randInt(3, 5) : null;
    const r = usePolyFragments ? 4 + Math.random() * 2.5 : 3.5;
    game.bullets.push({
      x: ex,
      y: ey,
      dx: Math.cos(ang) * speed,
      dy: Math.sin(ang) * speed,
      owner,
      color: fragColor,
      ttl: fragTtl * (0.8 + Math.random() * 0.4),
      life: fragTtl,
      r,
      bouncesLeft: usePolyFragments ? 0 : 1,
      pierceWalls: false,
      type: "fragment",
      sides,
      rotation: Math.random() * Math.PI * 2,
      spin: usePolyFragments ? (Math.random() * 2 - 1) * 1 : 0,
    });
  }

  playExplosionVariant(sound);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawWalls();
  drawPowerups();
  drawMines();
  drawBullets();
  drawPlayer();
  drawEnemies();
  if (game.gameOver) {
    drawOverlay("游戏结束", "按 R 重新开始");
  }
}

function drawGrid() {
  const theme = currentTheme();
  ctx.strokeStyle = theme.gridColor ?? "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  for (let x = tile; x < canvas.width; x += tile) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = tile; y < canvas.height; y += tile) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawWalls() {
  const theme = currentTheme();
  ctx.fillStyle = theme.wallFill ?? "#2d3246";
  for (const w of walls) {
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeStyle = theme.wallStroke ?? "rgba(255,255,255,0.05)";
    ctx.strokeRect(w.x + 1, w.y + 1, w.w - 2, w.h - 2);
  }
}

function drawPowerups() {
  const visuals = {
    shield: { fill: "rgba(120,200,255,0.18)", stroke: "#8ce1ff" },
    heart: { fill: "rgba(255,120,140,0.2)", stroke: "#ff8aa0" },
    laser: { fill: "rgba(200,160,255,0.18)", stroke: "#c592ff" },
    cannon: { fill: "rgba(255,204,140,0.2)", stroke: "#ffb36b" },
    mine: { fill: "rgba(120,220,200,0.2)", stroke: "#6de0c1" },
  };

  for (const p of game.powerups) {
    const visual = visuals[p.type] ?? visuals.laser;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.beginPath();
    ctx.arc(0, 0, p.r, 0, Math.PI * 2);
    ctx.fillStyle = visual.fill;
    ctx.strokeStyle = visual.stroke;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.stroke();

    drawPowerupGlyph(p.type, p.r * 0.9);
    ctx.restore();
  }
}

function drawPowerupGlyph(type, r) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  switch (type) {
    case "shield": {
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.65);
      ctx.lineTo(r * 0.55, -r * 0.2);
      ctx.lineTo(r * 0.4, r * 0.65);
      ctx.lineTo(0, r * 0.85);
      ctx.lineTo(-r * 0.4, r * 0.65);
      ctx.lineTo(-r * 0.55, -r * 0.2);
      ctx.closePath();
      ctx.fillStyle = "rgba(140,225,255,0.16)";
      ctx.strokeStyle = "#8ce1ff";
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "heart": {
      const h = r * 1.15;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.6);
      ctx.bezierCurveTo(h * 0.7, h * 0.35, h * 0.75, -h * 0.12, 0, -h * 0.38);
      ctx.bezierCurveTo(-h * 0.75, -h * 0.12, -h * 0.7, h * 0.35, 0, h * 0.6);
      ctx.fillStyle = "rgba(255,120,140,0.4)";
      ctx.strokeStyle = "#ff6f8c";
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "laser": {
      ctx.strokeStyle = "#c592ff";
      ctx.lineWidth = r * 0.14;
      const offsets = [-r * 0.42, 0, r * 0.42];
      for (const off of offsets) {
        ctx.beginPath();
        ctx.moveTo(-r * 0.7, -r * 0.5 + off);
        ctx.lineTo(r * 0.7, r * 0.5 + off);
        ctx.stroke();
      }
      break;
    }
    case "cannon": {
      ctx.strokeStyle = "#ffb36b";
      ctx.fillStyle = "rgba(255,179,107,0.28)";
      ctx.lineWidth = 2;
      // Round base
      ctx.beginPath();
      ctx.arc(-r * 0.1, 0, r * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Barrel
      ctx.beginPath();
      ctx.rect(-r * 0.05, -r * 0.16, r * 0.8, r * 0.32);
      ctx.fill();
      ctx.stroke();
      // Muzzle ring
      ctx.beginPath();
      ctx.arc(r * 0.75, 0, r * 0.11, 0, Math.PI * 2);
      ctx.fillStyle = "#ffb36b";
      ctx.fill();
      break;
    }
    case "mine":
    default: {
      ctx.strokeStyle = "#6de0c1";
      ctx.lineWidth = 2;
      // Spikes
      for (let i = 0; i < 8; i++) {
        const ang = (Math.PI * 2 * i) / 8;
        const inner = r * 0.3;
        const outer = r * 0.75;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * inner, Math.sin(ang) * inner);
        ctx.lineTo(Math.cos(ang) * outer, Math.sin(ang) * outer);
        ctx.stroke();
      }
      // Core
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(109,224,193,0.25)";
      ctx.fill();
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

function drawMines() {
  for (const m of game.mines) {
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.beginPath();
    ctx.arc(0, 0, m.r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(30,35,50,0.55)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
}

function drawTank(tank) {
  const { x, y, angle, size } = tank;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = tank.color;
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  const w = size;
  const h = size * 0.7;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = "#161722";
  ctx.fillRect(-w * 0.2, -h * 0.2, w * 0.4, h * 0.4);
  drawTurret(tank, w, h);
  ctx.restore();

  if (tank.spawnShield > 0 && tank.alive) {
    ctx.strokeStyle = "rgba(140,225,255,0.5)";
    ctx.beginPath();
    ctx.arc(x, y, size * 0.65, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (tank.powerShieldTimer > 0 && tank.alive) {
    ctx.strokeStyle = "rgba(255,225,122,0.7)";
    ctx.beginPath();
    ctx.arc(x, y, size * 0.8, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawPlayer() {
  const p = game.player;
  if (p.alive) {
    drawTank(p);
    // HP label above player
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.font = "13px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = `HP: ${game.lives}`;
    const y = p.y - p.size * 0.6 - 10;
    ctx.fillText(label, p.x, y);
    ctx.restore();
  } else {
    drawDeathEffect(p);
  }
}

function drawEnemies() {
  for (const e of game.enemies) {
    if (e.alive) {
      drawTank(e);
    } else {
      drawDeathEffect(e);
    }
  }
}

function drawDeathEffect(entity) {
  const t = clamp((entity.deathTimer ?? 0) / 0.6, 0, 1);
  const baseR = 8 + t * 20;
  const ringR = baseR + 10;
  const colorCore = entity.isPlayer ? "#ffd27f" : "#ff9f6e";
  const colorRing = entity.isPlayer ? "#ff8aa0" : "#ffb36b";
  ctx.save();
  // Core fade
  ctx.fillStyle = hexToRgba(colorCore, 0.4 * (1 - t));
  ctx.beginPath();
  ctx.arc(entity.x, entity.y, baseR, 0, Math.PI * 2);
  ctx.fill();
  // Ring
  ctx.strokeStyle = hexToRgba(colorRing, 0.6 * (1 - t));
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(entity.x, entity.y, ringR, 0, Math.PI * 2);
  ctx.stroke();
  // Sparks
  ctx.strokeStyle = hexToRgba(colorCore, 0.8 * (1 - t));
  ctx.lineWidth = 2;
  const sparks = 10;
  for (let i = 0; i < sparks; i++) {
    const ang = (Math.PI * 2 * i) / sparks + t * 4;
    const len = 6 + t * 14;
    ctx.beginPath();
    ctx.moveTo(entity.x + Math.cos(ang) * (baseR - 4), entity.y + Math.sin(ang) * (baseR - 4));
    ctx.lineTo(entity.x + Math.cos(ang) * (baseR - 4 + len), entity.y + Math.sin(ang) * (baseR - 4 + len));
    ctx.stroke();
  }
  ctx.restore();
}

function turretMode(tank) {
  if (tank.isPlayer) {
    if (tank.laserTimer > 0) return "laser";
    if (tank.cannonAmmo > 0) return "cannon";
    if (tank.mineAmmo > 0) return "mine";
  }
  return "normal";
}

function drawTurret(tank, w, h) {
  const mode = turretMode(tank);
  const barrelY = 0;
  switch (mode) {
    case "laser": {
      ctx.fillStyle = "#c592ff";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      drawRoundedRectPath(ctx, w * 0.1, barrelY - 4, w * 0.65, 8, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(w * 0.75, barrelY, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "cannon": {
      ctx.fillStyle = "#ffdd99";
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 2;
      drawRoundedRectPath(ctx, w * 0.05, barrelY - 6, w * 0.55, 12, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffb36b";
      ctx.beginPath();
      ctx.arc(w * 0.6, barrelY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "mine": {
      ctx.fillStyle = "#3f2f6b"; // deep purple base
      ctx.strokeStyle = "#9b7cff"; // bright violet accent
      ctx.lineWidth = 2;
      drawRoundedRectPath(ctx, w * 0.12, barrelY - 4, w * 0.4, 8, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#c9b1ff";
      ctx.beginPath();
      ctx.arc(w * 0.35, barrelY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e6ddff";
      ctx.beginPath();
      ctx.arc(w * 0.12, barrelY, 3, 0, Math.PI * 2);
      ctx.arc(w * 0.52, barrelY, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    default: {
      ctx.fillStyle = tank.color;
      drawRoundedRectPath(ctx, w * 0.1, barrelY - 5, w * 0.5, 10, 3);
      ctx.fill();
      break;
    }
  }
}

function drawBullets() {
  for (const b of game.bullets) {
    if (b.type === "laserBeam") {
      ctx.save();
      ctx.strokeStyle = laserColor;
      ctx.lineWidth = 6;
      ctx.shadowColor = laserColor;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.ex, b.ey);
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.ex, b.ey);
      ctx.stroke();
      ctx.restore();
    } else if (b.type === "flash") {
      const life = b.life ?? b.ttl;
      const t = clamp(b.ttl / life, 0, 1);
      ctx.save();
      const g = ctx.createRadialGradient(b.x, b.y, b.r * 0.1, b.x, b.y, b.r);
      g.addColorStop(0, `${hexToRgba(b.color ?? "#ffd27f", 0.7 * t)}`);
      g.addColorStop(0.6, `${hexToRgba(b.color ?? "#ffd27f", 0.35 * t)}`);
      g.addColorStop(1, `${hexToRgba(b.color ?? "#ffd27f", 0)}`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (b.type === "fragment" && b.sides) {
      const life = b.life ?? b.ttl;
      const t = clamp(b.ttl / life, 0, 1);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rotation ?? 0);
      ctx.fillStyle = hexToRgba(b.color, 0.75 * t + 0.15);
      ctx.strokeStyle = hexToRgba(b.color, 0.9 * t);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < b.sides; i++) {
        const ang = (Math.PI * 2 * i) / b.sides;
        const px = Math.cos(ang) * b.r;
        const py = Math.sin(ang) * b.r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawOverlay(title, subtitle) {
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, canvas.height / 2 - 60, canvas.width, 120);
  ctx.fillStyle = "#fff";
  ctx.font = "32px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 10);
  ctx.font = "18px sans-serif";
  ctx.fillStyle = "#cdd3ff";
  ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 20);
}

function updateHud() {
  hudLevel.textContent = `关卡 ${game.level}`;
  hudLives.textContent = `生命 ${game.lives}`;
  const remaining = game.enemyQueue + game.enemies.length;
  hudEnemies.textContent = `敌人 ${remaining}`;
  hudStatus.textContent = game.status;
}

function setupControls() {
  window.addEventListener("keydown", (e) => {
    const key = normalizeKey(e);
    if (["w", "a", "s", "d", " ", "space", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
      e.preventDefault();
    }
    if (key === "r") {
      if (game.started) resetGame();
      return;
    }
    if (!game.started) return;
    keys[key] = true;
  });
  window.addEventListener("keyup", (e) => {
    if (!game.started) return;
    keys[normalizeKey(e)] = false;
  });
}

function normalizeKey(e) {
  return e.key === " " ? " " : e.key.toLowerCase();
}

setupControls();
game.status = "阅读说明后点击“确认”开始";
updateHud();
if (startButton) {
  startButton.addEventListener("click", beginGame);
}
