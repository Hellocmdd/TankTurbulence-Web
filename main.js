const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const hudLevel = document.getElementById("hud-level");
const hudLives = document.getElementById("hud-lives");
const hudEnemies = document.getElementById("hud-enemies");
const hudStatus = document.getElementById("hud-status");
const startScreen = document.getElementById("start-screen");
const startButton = document.getElementById("start-button");
const modalScreen = document.getElementById("modal-screen");
const modalTitle = document.getElementById("modal-title");
const modalDesc = document.getElementById("modal-desc");
const modalButton = document.getElementById("modal-button");
const modalSecondaryButton = document.getElementById("modal-secondary-button");
const gameWrap = document.querySelector(".game-wrap");
const modeScreen = document.getElementById("mode-screen");
const modeNormalBtn = document.getElementById("mode-normal-btn");
const modeOneLifeBtn = document.getElementById("mode-one-life-btn");
const playerStyleOptions = document.getElementById("player-style-options");

const tile = 64;
let walls = [];
let bulletColor = "#8ce1ff";
const enemySpawnCount = 3;
const defaultBgmConfig = {
  tempo: 112,
  roots: [57, 60, 55, 62], // midi note roots for a simple progression
  melody: [0, 2, 3, 5, 7, 5, 3, 2, 0, 2, 3, 5, 7, 9, 7, 5],
  arp: [0, 7, 12, 7],
  leadWave: "triangle",
  bassWave: "sawtooth",
  arpWave: "square",
  accentWave: "sine",
  melodyVolume: 0.35,
  bassVolume: 0.6,
  arpVolume: 0.28,
  accentVolume: 0.18,
  accentOffset: 3,
  hatVolume: 0.035,
  hatEvery: 2,
  bassEvery: 4,
  arpEvery: 8,
  arpPhase: 4,
  accentEvery: 8,
  accentPhase: 6,
  bassOffset: 0,
};
const powerupTypes = ["shield", "heart", "laser", "cannon", "mine", "missile"];
const basePowerupWeights = [
  { type: "shield", w: 0.8 }, // 略低
  { type: "heart", w: 0.8 }, // 略低
  { type: "laser", w: 1 },
  { type: "cannon", w: 1 },
  { type: "mine", w: 1 },
  { type: "missile", w: 0.8 }, // 略低
];
let laserColor = "#ff8cff";
const missileColor = "#43ff9e";
const missileAccentColor = "#ff4fb8";
const missileDarkColor = "#0b2a22";
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
const playerSkins = [
  {
    id: "vanguard",
    name: "先锋绿",
    desc: "均衡装甲，带侧裙",
    color: "#7fe495",
    turretColor: "#d5ffe4",
    accentColor: "#1f4a35",
    detailColor: "#0f1d16",
    skin: "panel",
  },
  {
    id: "glacier",
    name: "冰霜蓝",
    desc: "冷色涂装，前盖高亮",
    color: "#8ad0ff",
    turretColor: "#d9ecff",
    accentColor: "#3c6fa3",
    detailColor: "#0f1a2a",
    skin: "split",
  },
  {
    id: "ember",
    name: "余烬红",
    desc: "高对比条纹，攻击感",
    color: "#ff7f91",
    turretColor: "#ffd8c2",
    accentColor: "#7a1f32",
    detailColor: "#1b0f18",
    skin: "stripe",
  },
  {
    id: "shadow",
    name: "夜袭黑",
    desc: "暗色镶边，金色炮塔",
    color: "#6d6f8a",
    turretColor: "#ffe17a",
    accentColor: "#3d4166",
    detailColor: "#0f111b",
    skin: "rogue",
  },
  {
    id: "aurora",
    name: "极光幻彩",
    desc: "蓝紫渐变，霓虹外圈",
    color: "#5ecbff",
    turretColor: "#d2e6ff",
    accentColor: "#b48bff",
    detailColor: "#0e1826",
    skin: "prism",
  },
  {
    id: "phoenix",
    name: "金焰流光",
    desc: "金橙渐变，前甲高亮",
    color: "#ffb36b",
    turretColor: "#ffe8b8",
    accentColor: "#ff6f3c",
    detailColor: "#20130b",
    skin: "royal",
  },
];
const enemySkinsNormal = [
  { color: "#ffb36b", turretColor: "#ffd9a1", accentColor: "#7a4925", detailColor: "#1a120c", skin: "panel" },
  { color: "#6f9cff", turretColor: "#ffe17a", accentColor: "#243b73", detailColor: "#0e1426", skin: "stripe" },
  { color: "#77d79c", turretColor: "#f1ffcc", accentColor: "#1d5035", detailColor: "#0d1c14", skin: "split" },
  { color: "#c97bff", turretColor: "#ffe17a", accentColor: "#4a2d73", detailColor: "#170e24", skin: "vanguard" },
];
const enemySkinsOneLife = [
  { color: "#78d4ff", turretColor: "#ffe17a", accentColor: "#1e4a68", detailColor: "#0e1c24", skin: "rogue" },
  { color: "#ff9f7a", turretColor: "#ffe8b8", accentColor: "#6c2f1f", detailColor: "#1a0f0b", skin: "stripe" },
  { color: "#9ad59c", turretColor: "#e8ffc9", accentColor: "#235330", detailColor: "#0f1c15", skin: "panel" },
  { color: "#7ab5ff", turretColor: "#ffe17a", accentColor: "#2b4c88", detailColor: "#0f1a28", skin: "split" },
];
let selectedPlayerSkinId = playerSkins[0]?.id ?? "vanguard";

const game = {
  level: 1,
  lives: 3,
  enemies: [],
  bullets: [],
  enemyQueue: 0,
  spawnTimer: 0,
  pendingSpawns: [],
  spawnWarnings: [],
  maxAlive: 3,
  player: null,
  status: "",
  respawnTimer: 0,
  gameOver: false,
  paused: false,
  modalAction: null,
  modalSecondaryAction: null,
  modalActionStatus: null,
  modalSecondaryActionStatus: null,
  lastTime: 0,
  started: false,
  loopStarted: false,
  powerups: [],
  powerupTimer: 0,
  mines: [],
  shieldHitCooldown: 0,
  mode: "normal",
  oneLife: false,
  livesInitialized: false,
};

const keys = {};
let audioCtx = null;
let masterGain = null;
let bgmTimer = null;
let bgmStep = 0;
let activeBgmConfig = null;

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
    bgm: {
      tempo: 116,
      roots: [57, 62, 59, 64],
      melody: [0, 2, 5, 7, 9, 7, 5, 2, 0, 2, 3, 7, 9, 7, 5, 3],
      arp: [0, 7, 12, 19],
      accentOffset: 5,
      accentWave: "triangle",
    },
  },
  {
    name: "紫雾黄昏",
    canvasBg: "linear-gradient(140deg,#1b0f2a,#3a1a5a,#6b2a73)",
    gridColor: "rgba(255,220,255,0.14)",
    wallFill: "#3a234e",
    wallStroke: "rgba(255,220,255,0.22)",
    canvasBorder: "#7a3fa3",
    wrapBg: "#120714",
    bulletColor: "#4f6bff", // 靛蓝色：避开炮弹/炮台的暖黄橙，也和第3关的冰蓝区分
    laserColor: "#ffb86b",
    bgm: {
      tempo: 104,
      roots: [60, 63, 58, 65],
      melody: [0, 3, 5, 7, 10, 7, 5, 3, 0, 3, 5, 8, 10, 8, 5, 3],
      arp: [0, 10, 15, 10],
      leadWave: "sine",
      bassWave: "triangle",
      arpWave: "triangle",
      hatVolume: 0.028,
      accentOffset: 2,
      accentWave: "triangle",
      accentVolume: 0.14,
    },
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
    bgm: {
      tempo: 96,
      roots: [52, 55, 48, 50],
      melody: [0, 2, 7, 5, 4, 2, 0, 2, 0, 5, 7, 9, 7, 5, 4, 2],
      arp: [0, 7, 12, 19],
      hatEvery: 4,
      hatVolume: 0.022,
      bassEvery: 8,
      leadWave: "triangle",
      bassWave: "sine",
      arpWave: "triangle",
      accentOffset: 7,
      accentVolume: 0.16,
    },
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
    bgm: {
      tempo: 102,
      roots: [55, 57, 53, 60],
      melody: [0, 2, 5, 7, 5, 2, 0, -2, 0, 2, 5, 9, 7, 5, 2, 0],
      arp: [0, 5, 12, 5],
      leadWave: "square",
      bassWave: "triangle",
      arpWave: "square",
      hatEvery: 1,
      hatVolume: 0.02,
      accentOffset: 5,
      accentWave: "triangle",
      accentVolume: 0.14,
    },
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
    bgm: {
      tempo: 122,
      roots: [52, 54, 50, 57],
      melody: [0, 3, 7, 10, 7, 3, 0, -2, 0, 3, 7, 12, 10, 7, 3, 0],
      arp: [0, 7, 10, 14],
      leadWave: "square",
      bassWave: "sawtooth",
      arpWave: "sawtooth",
      hatVolume: 0.04,
      bassEvery: 2,
      accentOffset: 4,
      accentWave: "square",
      accentVolume: 0.22,
    },
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

function baseLivesForLevel(level) {
  return 2 + level;
}

function currentPowerupWeights() {
  if (!game.oneLife) return basePowerupWeights;
  return basePowerupWeights.map((p) => ({
    ...p,
    w: p.type === "heart" ? p.w * 1.2 : p.w,
  }));
}

function powerupFreqMultiplier() {
  return game.oneLife ? 1 / 1.5 : 1;
}

function initialPowerupDelay() {
  return (3 + Math.random() * 3) * powerupFreqMultiplier();
}

function powerupRespawnDelay() {
  return (7 + Math.random() * 5) * powerupFreqMultiplier();
}

function buildBgmConfig(theme) {
  const base = defaultBgmConfig;
  const cfg = (theme && theme.bgm) || {};
  const merged = { ...base, ...cfg };
  merged.roots = (cfg.roots && cfg.roots.length ? cfg.roots : base.roots).slice();
  merged.melody = (cfg.melody && cfg.melody.length ? cfg.melody : base.melody).slice();
  const hasArp = Object.prototype.hasOwnProperty.call(cfg, "arp");
  const arpSource = hasArp ? cfg.arp : base.arp;
  merged.arp = Array.isArray(arpSource) && arpSource.length ? arpSource.slice() : [];
  merged.tempo = cfg.tempo ?? base.tempo;
  merged.hatEvery = Math.max(1, cfg.hatEvery ?? base.hatEvery ?? 2);
  merged.bassEvery = Math.max(1, cfg.bassEvery ?? base.bassEvery ?? 4);
  merged.arpEvery = Math.max(1, cfg.arpEvery ?? base.arpEvery ?? 8);
  merged.arpPhase = cfg.arpPhase ?? base.arpPhase ?? Math.floor(merged.arpEvery / 2);
  merged.accentEvery = Math.max(1, cfg.accentEvery ?? base.accentEvery ?? 8);
  merged.accentPhase = cfg.accentPhase ?? base.accentPhase ?? Math.max(1, merged.accentEvery - 2);
  merged.bassOffset = cfg.bassOffset ?? base.bassOffset ?? 0;
  return merged;
}

function currentBgmConfig() {
  if (!activeBgmConfig) {
    activeBgmConfig = buildBgmConfig(currentTheme());
  }
  return activeBgmConfig;
}

function setBgmTheme(theme) {
  activeBgmConfig = buildBgmConfig(theme);
}

function syncBgmToTheme(theme) {
  setBgmTheme(theme);
  if (bgmTimer) {
    startBgm(true);
  }
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

function playerStyleById(id) {
  return playerSkins.find((s) => s.id === id) ?? playerSkins[0];
}

function currentPlayerStyle() {
  return playerStyleById(selectedPlayerSkinId);
}

function applyStyleToTank(tank, style) {
  if (!tank || !style) return;
  tank.color = style.color ?? tank.color;
  tank.turretColor = style.turretColor ?? tank.color;
  tank.skin = style.skin ?? tank.skin ?? "default";
  tank.accentColor = style.accentColor ?? null;
  tank.detailColor = style.detailColor ?? null;
}

function pickEnemyStyle(oneLife = false) {
  const pool = oneLife ? enemySkinsOneLife : enemySkinsNormal;
  if (!pool.length) return null;
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}

function createTank(opts) {
  return {
    x: opts.x,
    y: opts.y,
    angle: opts.angle ?? -Math.PI / 2,
    turretAngle: opts.turretAngle ?? opts.angle ?? -Math.PI / 2,
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
    turretColor: opts.turretColor ?? null,
    skin: opts.skin ?? "default",
    accentColor: opts.accentColor ?? null,
    detailColor: opts.detailColor ?? null,
    alive: true,
    spawnShield: opts.spawnShield ?? 0,
    ai: opts.ai ?? null,
    powerShieldTimer: 0,
    laserAmmo: 0,
    cannonAmmo: 0,
    mineAmmo: 0,
    missileAmmo: 0,
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

function playMissileLaunchSound() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const oscGain = audioCtx.createGain();
  const noise = audioCtx.createBufferSource();
  const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.18, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const decay = 1 - i / data.length;
    data[i] = (Math.random() * 2 - 1) * decay * 0.6;
  }
  noise.buffer = buf;
  const filter = audioCtx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1800;
  filter.Q.value = 0.8;

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(420, t);
  osc.frequency.exponentialRampToValueAtTime(750, t + 0.18);
  oscGain.gain.setValueAtTime(0.18, t);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

  noise.connect(filter).connect(masterGain);
  osc.connect(oscGain).connect(masterGain);
  osc.start(t);
  noise.start(t);
  osc.stop(t + 0.2);
  noise.stop(t + 0.18);
}

function playMissileExplosionSound() {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime;
  const noiseBuf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.7, audioCtx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const decay = 1 - i / data.length;
    data[i] = (Math.random() * 2 - 1) * decay * decay * 1.1;
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuf;
  const whoosh = audioCtx.createOscillator();
  const whooshGain = audioCtx.createGain();
  whoosh.type = "triangle";
  whoosh.frequency.setValueAtTime(180, t);
  whoosh.frequency.exponentialRampToValueAtTime(60, t + 0.4);
  whooshGain.gain.setValueAtTime(0.4, t);
  whooshGain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);

  const filter = audioCtx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1200;
  filter.Q.value = 0.6;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.65, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
  noise.connect(filter).connect(gain).connect(masterGain);
  whoosh.connect(whooshGain).connect(masterGain);
  whoosh.start(t);
  noise.start(t);
  noise.stop(t + 0.7);
  whoosh.stop(t + 0.42);
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
    case "missile":
      playMissileExplosionSound();
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

function startBgm(forceRestart = false) {
  if (!audioCtx || !masterGain) return;
  if (bgmTimer) {
    if (!forceRestart) return;
    stopBgm();
  }
  const config = currentBgmConfig();
  bgmStep = 0;
  const intervalMs = (60 / (config.tempo ?? defaultBgmConfig.tempo) / 2) * 1000; // eighth note timing
  const tick = () => {
    if (!audioCtx || !masterGain) return;
    const bar = Math.floor(bgmStep / 16);
    const root = config.roots[bar % config.roots.length];

    const melodyOffset = config.melody[bgmStep % config.melody.length];
    playTone(midiToFreq(root + melodyOffset), config.melodyVolume ?? 0.35, 0.07, config.leadWave ?? "triangle");

    if (bgmStep % config.bassEvery === 0) {
      playTone(
        midiToFreq(root - 12 + (config.bassOffset ?? 0)),
        config.bassVolume ?? 0.6,
        0.09,
        config.bassWave ?? "sawtooth"
      );
    }
    if (config.arp.length) {
      const phase = config.arpPhase ?? Math.floor(config.arpEvery / 2);
      if (bgmStep % config.arpEvery === phase % config.arpEvery) {
        const arp = config.arp[Math.floor(bgmStep / config.arpEvery) % config.arp.length];
        playTone(midiToFreq(root + arp), config.arpVolume ?? 0.28, 0.06, config.arpWave ?? "square");
      }
    }
    if (bgmStep % config.hatEvery === 0) {
      playHat(config.hatVolume ?? 0.035);
    }
    const accentPhase = config.accentPhase ?? Math.max(1, config.accentEvery - 2);
    if (bgmStep % config.accentEvery === accentPhase % config.accentEvery) {
      playTone(
        midiToFreq(root + (config.accentOffset ?? 3)),
        config.accentVolume ?? 0.18,
        0.05,
        config.accentWave ?? "sine"
      );
    }

    bgmStep += 1;
  };
  tick();
  bgmTimer = setInterval(tick, intervalMs);
}

function stopBgm() {
  if (bgmTimer) {
    clearInterval(bgmTimer);
    bgmTimer = null;
  }
  bgmStep = 0;
}

function clearActiveObjects() {
  game.powerups.length = 0;
  game.pendingSpawns.length = 0;
  game.spawnWarnings.length = 0;
  game.enemies.length = 0;
  game.bullets.length = 0;
  game.mines.length = 0;
}

function returnToSkinSelect(statusText = "返回皮肤/模式选择") {
  stopBgm();
  game.started = false;
  game.paused = true;
  game.gameOver = true;
  game.modalAction = null;
  game.modalSecondaryAction = null;
  game.modalActionStatus = null;
  game.modalSecondaryActionStatus = null;
  clearActiveObjects();
  for (const key in keys) {
    delete keys[key];
  }
  if (modeScreen) modeScreen.classList.remove("hidden");
  if (startScreen) startScreen.classList.add("hidden");
  if (modalScreen) modalScreen.classList.add("hidden");
  game.status = statusText;
  updateHud();
}

function returnToMenuAfterFailOneLife(statusText = "一命用尽，返回模式选择") {
  returnToSkinSelect(statusText);
}

function showModal(opts) {
  if (!modalScreen) return;
  modalTitle.textContent = opts.title ?? "提示";
  modalDesc.textContent = opts.desc ?? "";
  modalButton.textContent = opts.buttonText ?? "确认";
  modalButton.classList.toggle("retry", opts.action === "retryLevel");
  const hasSecondary = !!(opts.secondaryText || typeof opts.secondaryAction !== "undefined");
  if (modalSecondaryButton) {
    modalSecondaryButton.textContent = opts.secondaryText ?? "取消";
    modalSecondaryButton.style.display = hasSecondary ? "block" : "none";
    modalSecondaryButton.classList.toggle("retry", opts.secondaryAction === "retryLevel");
  }
  modalScreen.classList.remove("hidden");
  game.paused = true;
  game.modalAction = opts.action ?? null;
  game.modalSecondaryAction = hasSecondary ? opts.secondaryAction ?? null : null;
  game.modalActionStatus = opts.actionStatus ?? null;
  game.modalSecondaryActionStatus = hasSecondary ? opts.secondaryActionStatus ?? null : null;
}

function hideModal() {
  if (!modalScreen) return;
  modalScreen.classList.add("hidden");
  game.paused = false;
  game.modalAction = null;
  game.modalSecondaryAction = null;
  game.modalActionStatus = null;
  game.modalSecondaryActionStatus = null;
}

function confirmModal(which = "primary") {
  if (!game.modalAction && !game.modalSecondaryAction) {
    hideModal();
    return;
  }
  const action = which === "secondary" ? game.modalSecondaryAction : game.modalAction;
  const statusText = which === "secondary" ? game.modalSecondaryActionStatus : game.modalActionStatus;
  hideModal();
  handleModalAction(action, statusText);
}

function handleModalAction(action, statusText) {
  if (!action) return;
  if (action === "nextLevel") {
    startLevel(game.level + 1);
  } else if (action === "retryLevel") {
    retryCurrentLevel();
  } else if (action === "backToModeSelect" || action === "backToSkinSelect") {
    returnToSkinSelect(statusText ?? "选择模式重新挑战");
  }
}

function beginGame() {
  if (modeScreen) modeScreen.classList.remove("hidden");
  if (startScreen) startScreen.classList.add("hidden");
  game.started = false;
  game.paused = true;
  game.status = "请选择模式开始战斗";
  updateHud();
}

function startGameWithMode(mode) {
  const oneLife = mode === "oneLife";
  game.mode = oneLife ? "oneLife" : "normal";
  game.oneLife = oneLife;
  game.livesInitialized = false;
  game.started = true;
  game.gameOver = false;
  game.paused = false;
  game.status = "";
  game.lastTime = performance.now();
  if (modeScreen) modeScreen.classList.add("hidden");
  if (startScreen) startScreen.classList.add("hidden");
  if (modalScreen) modalScreen.classList.add("hidden");
  for (const key in keys) {
    delete keys[key];
  }
  initAudio();
  resetGame();
  startBgm();
  if (!game.loopStarted) {
    game.loopStarted = true;
    requestAnimationFrame(update);
  }
}

function resetGame() {
  game.level = 1;
  game.lives = baseLivesForLevel(1);
  game.status = "";
  game.enemies = [];
  game.bullets = [];
  game.enemyQueue = 0;
  game.pendingSpawns = [];
  game.spawnWarnings = [];
  game.powerups = [];
  game.powerupTimer = initialPowerupDelay();
  game.mines = [];
  game.gameOver = false;
  game.paused = false;
  game.modalAction = null;
  game.modalSecondaryAction = null;
  game.modalActionStatus = null;
  game.modalSecondaryActionStatus = null;
  game.shieldHitCooldown = 0;
  game.livesInitialized = false;
  if (modalScreen) modalScreen.classList.add("hidden");
  startLevel(1);
}

function startLevel(level) {
  game.level = level;
  applyTheme(level);
  syncBgmToTheme(currentTheme());
  const isOneLife = game.oneLife;
  const baseLives = baseLivesForLevel(level);
  if (isOneLife) {
    if (!game.livesInitialized || level === 1 || game.lives <= 0) {
      game.lives = baseLives;
      game.livesInitialized = true;
    }
  } else {
    game.lives = baseLives;
  }
  game.gameOver = false;
  game.paused = false;
  game.modalAction = null;
  game.modalSecondaryAction = null;
  game.modalActionStatus = null;
  game.modalSecondaryActionStatus = null;
  game.enemies.length = 0;
  game.bullets.length = 0;
  game.enemyQueue = 3 + Math.max(0, level - 1);
  game.spawnTimer = 0.6;
  game.pendingSpawns.length = 0;
  game.spawnWarnings.length = 0;
  game.powerups.length = 0;
  game.powerupTimer = initialPowerupDelay();
  game.mines.length = 0;
  const themeName = currentTheme().name ? ` · ${currentTheme().name}` : "";
  const modeLabel = isOneLife ? " · 一命过关" : "";
  game.status = `第 ${level} 关${themeName}${modeLabel}`;
  game.respawnTimer = 0;
  const previousSpawn = playerSpawn;
  playerSpawn = pickPlayerSpawn(previousSpawn, level);
  enemySpawns = generateEnemySpawns(playerSpawn, enemySpawnCount, level);
  walls = buildWalls(level, playerSpawn, enemySpawns);
  const playerStyle = currentPlayerStyle();
  if (!game.player) {
    game.player = createTank({
      x: playerSpawn.x,
      y: playerSpawn.y,
      color: playerStyle.color ?? "#7fe495",
      turretColor: playerStyle.turretColor,
      skin: playerStyle.skin,
      accentColor: playerStyle.accentColor,
      detailColor: playerStyle.detailColor,
      speed: 220,
      fireRate: 0.3,
      clipSize: 5,
      reloadTime: 3,
      isPlayer: true,
      spawnShield: 1.2,
    });
  } else {
    applyStyleToTank(game.player, playerStyle);
    respawnPlayer();
  }
  updateHud();
}

function retryCurrentLevel() {
  startLevel(game.level);
}

function respawnPlayer() {
  game.player.x = playerSpawn.x;
  game.player.y = playerSpawn.y;
  game.player.angle = -Math.PI / 2;
  game.player.turretAngle = game.player.angle;
  game.player.alive = true;
  game.player.spawnShield = 1.2;
  game.player.powerShieldTimer = 0;
  game.player.laserAmmo = 0;
  game.player.cannonAmmo = 0;
  game.player.mineAmmo = 0;
  game.player.missileAmmo = 0;
  game.player.ammo = game.player.clipSize;
  game.player.reloadTimer = 0;
  game.player.fireCooldown = 0;
  game.player.deathTimer = 0;
}

function pickEnemySpawnPoint() {
  const slots = enemySpawns.length ? enemySpawns : defaultEnemySpawns;
  const slot = slots[Math.floor(Math.random() * slots.length)];
  return findFreePosition(slot.x, slot.y, minEnemyPlayerDistance(game.level));
}

function spawnEnemy(posOverride) {
  const pos = posOverride ?? pickEnemySpawnPoint();
  const pickedSkin =
    pickEnemyStyle(game.oneLife) ||
    (game.oneLife
      ? { color: "#78d4ff", turretColor: "#ffe17a", skin: "rogue" }
      : { color: "#ffb36b", turretColor: null, skin: "default" });
  const enemy = createTank({
    x: pos.x,
    y: pos.y,
    color: pickedSkin.color,
    turretColor: pickedSkin.turretColor,
    skin: pickedSkin.skin,
    accentColor: pickedSkin.accentColor,
    detailColor: pickedSkin.detailColor,
    speed: 150,
    fireRate: 1.2,
    clipSize: 5,
    reloadTime: 3,
    ai: {
      changeTimer: 0.2,
      targetAngle: Math.atan2(canvas.height * 0.6 - pos.y, canvas.width / 2 - pos.x),
      backoffTimer: 0,
    },
  });
  enemy.spawnShield = 0.8;
  enemy.deathTimer = 0;
  game.enemies.push(enemy);
}

function scheduleEnemySpawn() {
  const pos = pickEnemySpawnPoint();
  const warningTime = 1;
  if (!pos) return;
  game.pendingSpawns.push({ x: pos.x, y: pos.y, timer: warningTime });
  game.spawnWarnings.push({ x: pos.x, y: pos.y, ttl: warningTime, life: warningTime });
  game.enemyQueue = Math.max(0, game.enemyQueue - 1);
  game.spawnTimer = 1.1;
}

function updatePendingSpawns(dt) {
  if (game.gameOver) return;
  for (let i = game.pendingSpawns.length - 1; i >= 0; i--) {
    const pending = game.pendingSpawns[i];
    pending.timer -= dt;
    if (pending.timer <= 0) {
      spawnEnemy({ x: pending.x, y: pending.y });
      game.pendingSpawns.splice(i, 1);
    }
  }
}

function updateSpawnWarnings(dt) {
  for (let i = game.spawnWarnings.length - 1; i >= 0; i--) {
    const warn = game.spawnWarnings[i];
    warn.ttl -= dt;
    if (warn.ttl <= 0) {
      game.spawnWarnings.splice(i, 1);
    }
  }
}

function spawnPowerup() {
  const weights = currentPowerupWeights();
  const totalWeight = weights.reduce((sum, p) => sum + p.w, 0);
  let pick = Math.random() * totalWeight;
  let type = powerupTypes[0];
  for (const p of weights) {
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

  // Final fallback: clamp and probe a few relaxed options that still avoid walls/tanks.
  const fallback = {
    x: clamp(x, temp.w / 2, canvas.width - temp.w / 2),
    y: clamp(y, temp.h / 2, canvas.height - temp.h / 2),
  };
  const fallbackDist = minDistanceFromPlayer > 0 ? minDistanceFromPlayer * 0.8 : 0;
  const fallbackOffsets = [
    { ox: 0, oy: 0, dist: fallbackDist },
    { ox: tile * 2, oy: -tile * 2, dist: fallbackDist * 0.7 },
    { ox: -tile * 2, oy: tile * 2, dist: fallbackDist * 0.5 },
  ];
  for (const opt of fallbackOffsets) {
    const cx = clamp(fallback.x + opt.ox, temp.w / 2, canvas.width - temp.w / 2);
    const cy = clamp(fallback.y + opt.oy, temp.h / 2, canvas.height - temp.h / 2);
    if (tryCandidate(cx, cy, opt.dist)) return { x: cx, y: cy };
  }

  // Wider scatter with relaxed distance to guarantee an empty tile that is not inside walls.
  for (let i = 0; i < 260; i++) {
    const relaxDist = i < 160 ? fallbackDist * 0.6 : fallbackDist * 0.3;
    const cx = clamp(Math.random() * canvas.width, temp.w / 2, canvas.width - temp.w / 2);
    const cy = clamp(Math.random() * canvas.height, temp.h / 2, canvas.height - temp.h / 2);
    if (tryCandidate(cx, cy, relaxDist)) return { x: cx, y: cy };
  }

  // Last resort deterministic sweep, ignoring player distance but still avoiding walls.
  const step = tile * 0.5;
  for (let cy = temp.h / 2; cy <= canvas.height - temp.h / 2; cy += step) {
    for (let cx = temp.w / 2; cx <= canvas.width - temp.w / 2; cx += step) {
      if (tryCandidate(cx, cy, 0)) return { x: cx, y: cy };
    }
  }

  return fallback;
}

function update(time) {
  const dt = Math.min((time - game.lastTime) / 1000, 0.05);
  game.lastTime = time;
  game.shieldHitCooldown = Math.max(0, game.shieldHitCooldown - dt);

  if (game.paused) {
    draw();
    updateHud();
    requestAnimationFrame(update);
    return;
  }

  if (!game.player) return;

  tickTankTimers(game.player, dt);

  handleInput(dt);

  game.spawnTimer -= dt;
  if (
    !game.gameOver &&
    game.enemyQueue > 0 &&
    game.enemies.length + game.pendingSpawns.length < game.maxAlive &&
    game.spawnTimer <= 0
  ) {
    scheduleEnemySpawn();
  }

  updatePendingSpawns(dt);
  updateSpawnWarnings(dt);
  updateEnemies(dt);
  updateBullets(dt);
  updatePowerups(dt);
  updateMines(dt);
  updatePlayerRespawn(dt);

  if (
    !game.gameOver &&
    !game.paused &&
    game.enemyQueue === 0 &&
    game.pendingSpawns.length === 0 &&
    game.enemies.length === 0
  ) {
    showModal({
      title: `第 ${game.level} 关通过！`,
      desc: "干得漂亮，点击确认进入下一关。",
      buttonText: "确认继续",
      action: "nextLevel",
    });
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
    p.turretAngle = p.angle;
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
  const enemyFireChance = game.oneLife ? 0.16 : 0.2;
  for (const e of game.enemies) {
    tickTankTimers(e, dt);
    if (!e.alive) continue;
    const prevX = e.x;
    const prevY = e.y;
    e.ai.stuckTime = e.ai.stuckTime ?? 0;
    e.ai.lingerTime = e.ai.lingerTime ?? 0;
    e.ai.lingerCenter = e.ai.lingerCenter ?? { x: e.x, y: e.y };
    e.ai.wallHugTime = e.ai.wallHugTime ?? 0;
    e.ai.lingerBreakTimer = Math.max(0, (e.ai.lingerBreakTimer ?? 0) - dt);
    e.ai.noProgress = Math.max(0, (e.ai.noProgress ?? 0) - dt * 0.5);
    e.ai.contactTime = Math.max(0, (e.ai.contactTime ?? 0) - dt * 0.6);
    e.ai.changeTimer -= dt;
    const inLingerBreak = e.ai.lingerBreakTimer > 0;

    const playerAlive = game.player.alive && !game.gameOver;
    const distToPlayer = playerAlive ? Math.hypot(game.player.x - e.x, game.player.y - e.y) : Infinity;
    const chase = playerAlive && distToPlayer < 320;
    const desiredRange = 80;
    const tooClose = playerAlive && distToPlayer < desiredRange;
    e.ai.backoffTimer = Math.max(0, (e.ai.backoffTimer ?? 0) - dt);
    const backoffing = e.ai.backoffTimer > 0;
    let desiredTurret = e.turretAngle ?? e.angle;
    let shouldShoot = false;
    if (!inLingerBreak && e.ai.changeTimer <= 0) {
      if (chase) {
        const dx = game.player.x - e.x;
        const dy = game.player.y - e.y;
        e.ai.targetAngle = Math.atan2(dy, dx);
      } else {
        e.ai.targetAngle = Math.random() * Math.PI * 2;
      }
      e.ai.changeTimer = (chase ? 0.4 : 0.8) + Math.random() * (chase ? 0.5 : 0.8);
    } else if (inLingerBreak) {
      // Hold the course a bit during break to避免重新随机导致兜圈。
      e.ai.changeTimer = Math.max(e.ai.changeTimer, 0.12);
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

    if (tooClose && !backoffing) {
      // Enter short backoff mode to avoid抖动; prioritize moving away from player.
      e.ai.backoffTimer = 0.5;
    }

    if (backoffing && playerAlive) {
      const away = Math.atan2(e.y - game.player.y, e.x - game.player.x);
      const jitter = (Math.random() * 0.3 - 0.15);
      e.ai.targetAngle = away + jitter;
      e.ai.changeTimer = Math.min(e.ai.changeTimer, 0.15);
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

    // Continuous steering vector：指向玩家/中心 + 近墙斥力，减少来回抖动/兜圈。
    const goalAng = playerAlive
      ? Math.atan2(game.player.y - e.y, game.player.x - e.x)
      : Math.atan2(canvas.height / 2 - e.y, canvas.width / 2 - e.x);
    let steerX = Math.cos(goalAng);
    let steerY = Math.sin(goalAng);
    const wallRepulseRange = tile * 1.05;
    for (const w of walls) {
      const cx = clamp(e.x, w.x, w.x + w.w);
      const cy = clamp(e.y, w.y, w.y + w.h);
      const dx = e.x - cx;
      const dy = e.y - cy;
      const dist = Math.hypot(dx, dy);
      if (dist < wallRepulseRange) {
        const strength = (wallRepulseRange - dist) / wallRepulseRange;
        const len = dist || 1;
        steerX += (dx / len) * strength * 1.1;
        steerY += (dy / len) * strength * 1.1;
      }
    }
    // Border repulse (lighter to avoid挤出窄路)
    const borderPad = tile * 0.8;
    if (e.x < borderPad) steerX += (1 - e.x / borderPad) * 1.0;
    if (canvas.width - e.x < borderPad) steerX -= (1 - (canvas.width - e.x) / borderPad) * 1.0;
    if (e.y < borderPad) steerY += (1 - e.y / borderPad) * 1.0;
    if (canvas.height - e.y < borderPad) steerY -= (1 - (canvas.height - e.y) / borderPad) * 1.0;

    const steerLen = Math.hypot(steerX, steerY) || 1;
    const steerAng = Math.atan2(steerY, steerX);
    const needSteer = steerLen > 0.75 || e.ai.lingerTime > 1.2;
    if (needSteer) {
      e.ai.targetAngle = bestOpenAngle(e, steerAng);
      e.ai.changeTimer = Math.min(e.ai.changeTimer, 0.22);
    }

    const avoidDist = Math.max(96, e.speed * dt * 4);
    if (willHitWall(e, e.ai.targetAngle ?? e.angle, avoidDist)) {
      e.ai.targetAngle = bestOpenAngle(e, e.ai.targetAngle ?? e.angle);
      e.ai.changeTimer = 0.35;
    }

    const diff = wrapAngle(e.ai.targetAngle - e.angle);
    e.angle += clamp(diff, -2.5 * dt, 2.5 * dt);

    const speedScale = backoffing
      ? 1.05
      : tooClose
      ? clamp(distToPlayer / desiredRange, 0.35, 1)
      : 1;
    const mv = { x: Math.cos(e.angle) * e.speed * dt * speedScale, y: Math.sin(e.angle) * e.speed * dt * speedScale };
    const moved = moveTank(e, mv.x, mv.y);
    const movedLen = Math.hypot(moved.dx, moved.dy);
    const frameMoved = Math.hypot(e.x - prevX, e.y - prevY);
    if (frameMoved < 1.2) {
      e.ai.noProgress += dt;
    } else {
      e.ai.noProgress = Math.max(0, e.ai.noProgress - dt * 1.5);
    }
    const nearWall = willHitWall(e, e.angle, tile * 0.9);
    if (movedLen < 1.5 || nearWall) {
      e.ai.stuckTime += dt;
      // If stuck or nudging a wall, pick a clear angle away from obstacles (prefer deterministic clear angle over random).
      e.ai.targetAngle = bestOpenAngle(e, e.ai.targetAngle ?? e.angle);
      e.ai.changeTimer = 0.14;
    } else {
      e.ai.stuckTime = Math.max(0, e.ai.stuckTime - dt * 0.5);
    }

    // Wall-hug detection: if staying close to a wall for too long, force a turn away.
    const wallInfo = nearestWallNormal(e.x, e.y);
    if (wallInfo.dist < 48) {
      e.ai.wallHugTime += dt;
    } else {
      e.ai.wallHugTime = Math.max(0, e.ai.wallHugTime - dt);
    }

    const touchingEnemy = game.enemies.some(
      (o) => o !== e && o.alive && Math.hypot(o.x - e.x, o.y - e.y) < e.size * 0.95
    );
    if (touchingEnemy) {
      e.ai.contactTime += dt;
    }

    if (e.ai.contactTime > 0.45 && wallInfo.dist < 22) {
      const tang1 = Math.atan2(-wallInfo.nx, wallInfo.ny);
      const tang2 = Math.atan2(wallInfo.nx, -wallInfo.ny);
      const d1 = raycastClearDistance(e, tang1);
      const d2 = raycastClearDistance(e, tang2);
      const along = d1 >= d2 ? tang1 : tang2;
      e.ai.targetAngle = bestOpenAngle(e, along);
      e.ai.changeTimer = 0.12;
      e.ai.backoffTimer = Math.max(e.ai.backoffTimer ?? 0, 0.35);
      e.ai.contactTime = 0;
    }

    const lingerRadius = 72;
    const distFromLinger = Math.hypot(e.x - e.ai.lingerCenter.x, e.y - e.ai.lingerCenter.y);
    if (distFromLinger < lingerRadius) {
      e.ai.lingerTime += dt;
    } else {
      e.ai.lingerCenter = { x: e.x, y: e.y };
      e.ai.lingerTime = 0;
    }

    if (e.ai.stuckTime > 0.6) {
      const escape = Math.atan2(canvas.height / 2 - e.y, canvas.width / 2 - e.x) + (Math.random() * 0.6 - 0.3);
      e.ai.targetAngle = bestOpenAngle(e, escape);
      e.ai.changeTimer = 0.12;
      e.ai.backoffTimer = Math.max(e.ai.backoffTimer ?? 0, 0.45);
    }

    if (e.ai.noProgress > 0.9) {
      const escape = Math.atan2(canvas.height / 2 - e.y, canvas.width / 2 - e.x) + (Math.random() * 0.5 - 0.25);
      e.ai.targetAngle = bestOpenAngle(e, escape);
      e.ai.changeTimer = 0.16;
      e.ai.backoffTimer = Math.max(e.ai.backoffTimer ?? 0, 0.4);
      e.ai.noProgress = 0;
      e.ai.lingerBreakTimer = 0.6;
    }

    // Hard nudge away from nearby wall if we keep not moving.
    const stuckNow = movedLen < 0.3 || frameMoved < 0.3;
    const shallowWall = wallInfo.dist < 14;
    if ((e.ai.noProgress > 1 || e.ai.stuckTime > 1 || stuckNow) && shallowWall) {
      if (nudgeTankAway(e, wallInfo, 10)) {
        e.ai.noProgress = 0;
        e.ai.stuckTime = Math.max(0, e.ai.stuckTime - 0.5);
        e.ai.changeTimer = 0.14;
      }
    }

    const circling =
      e.ai.lingerTime > 2.4 &&
      distToPlayer > desiredRange * 0.8 &&
      Math.hypot(e.x - canvas.width / 2, e.y - canvas.height / 2) > tile * 0.5;
    if (circling) {
      const escapeTarget = playerAlive
        ? Math.atan2(game.player.y - e.y, game.player.x - e.x)
        : Math.atan2(canvas.height / 2 - e.y, canvas.width / 2 - e.x);
      e.ai.targetAngle = bestOpenAngle(e, escapeTarget + (Math.random() * 0.8 - 0.4));
      e.ai.changeTimer = 0.15;
      e.ai.backoffTimer = Math.max(e.ai.backoffTimer ?? 0, 0.35);
      e.ai.lingerCenter = { x: e.x, y: e.y };
      e.ai.lingerTime = 0;
    }

    if (e.ai.wallHugTime > 0.5 && wallInfo.dist < 48) {
      const awayFromWall = Math.atan2(wallInfo.ny, wallInfo.nx);
      // move slightly diagonally away to reduce lateral oscillation
      const jitter = Math.random() * 0.4 - 0.2;
      e.ai.targetAngle = bestOpenAngle(e, awayFromWall + jitter);
      e.ai.changeTimer = 0.12;
      e.ai.backoffTimer = Math.max(e.ai.backoffTimer ?? 0, 0.4);
      e.ai.wallHugTime = 0;
    }

    // If lingering in a pocket, force a blended escape toward目标并远离最近墙。
    if (e.ai.lingerTime > 1.8 && e.ai.lingerBreakTimer <= 0) {
      const toPlayer = playerAlive
        ? Math.atan2(game.player.y - e.y, game.player.x - e.x)
        : Math.atan2(canvas.height / 2 - e.y, canvas.width / 2 - e.x);
      const wallDir = Math.atan2(wallInfo.ny, wallInfo.nx);
      // blend toward player but add wall normal to avoid sideways loops
      const vx = Math.cos(toPlayer) * 1.2 + Math.cos(wallDir) * 0.8;
      const vy = Math.sin(toPlayer) * 1.2 + Math.sin(wallDir) * 0.8;
      const blended = Math.atan2(vy, vx);
      e.ai.targetAngle = bestOpenAngle(e, blended + (Math.random() * 0.4 - 0.2));
      e.ai.changeTimer = 0.22;
      e.ai.backoffTimer = Math.max(e.ai.backoffTimer ?? 0, 0.35);
      e.ai.lingerCenter = { x: e.x, y: e.y };
      e.ai.lingerTime = 0;
      e.ai.lingerBreakTimer = 1.1; // hold this course briefly to避免继续原地兜圈
    }

    if (playerAlive && hasLineOfSight(e.x, e.y, game.player.x, game.player.y)) {
      const aimAngle = Math.atan2(game.player.y - e.y, game.player.x - e.x);
      desiredTurret = aimAngle;
      const stucking = e.ai.stuckTime > 0.35 || e.ai.backoffTimer > 0;
      if (!stucking) {
        e.angle = aimAngle;
      }
      if (canShoot(e) && distToPlayer < 500 && Math.random() < enemyFireChance) {
        shouldShoot = true;
      }
    } else {
      desiredTurret = e.ai.targetAngle ?? e.angle;
    }

    // Smooth turret rotation independent of body to avoid “shoot before turning” visuals.
    const turretTurnRate = 6; // radians/sec
    const currTurret = e.turretAngle ?? e.angle;
    const deltaTurret = wrapAngle(desiredTurret - currTurret);
    const maxTurretStep = turretTurnRate * dt;
    e.turretAngle = currTurret + clamp(deltaTurret, -maxTurretStep, maxTurretStep);

    if (shouldShoot) {
      const aligned = Math.abs(wrapAngle(desiredTurret - e.turretAngle)) < 0.3; // about 17°
      if (aligned) {
        shoot(e);
      }
    }
  }
}

function shoot(tank) {
  if (!tank.alive) return;
  const angle = tank.turretAngle ?? tank.angle;
  const isLaser = tank.isPlayer && tank.laserAmmo > 0;
  const useCannon = tank.isPlayer && tank.cannonAmmo > 0 && !isLaser;
  const useMissile = tank.isPlayer && tank.missileAmmo > 0 && !isLaser && !useCannon;
  const useMine = tank.isPlayer && tank.mineAmmo > 0 && !isLaser && !useCannon && !useMissile;
  const useSpecial = isLaser || useCannon || useMissile || useMine;

  if (!useSpecial) {
    if (tank.reloadTimer > 0) return;
    if (tank.ammo <= 0) {
      tank.reloadTimer = tank.reloadTime;
      return;
    }
  }
  if (tank.fireCooldown > 0) return;
  const speed = 420;
  // Spawn muzzle a bit farther to avoid colliding with the shooter on spawn.
  const offset = tank.size * 0.8;
  const spawnX = tank.x + Math.cos(angle) * offset;
  const spawnY = tank.y + Math.sin(angle) * offset;
  let firedMissile = false;
  if (isLaser) {
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
    tank.laserAmmo = Math.max(0, tank.laserAmmo - 1); // consume one charge
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
  } else if (useMissile) {
    game.bullets.push({
      x: spawnX,
      y: spawnY,
      dx: Math.cos(angle) * 260,
      dy: Math.sin(angle) * 260,
      speed: 260,
      owner: tank.isPlayer ? "player" : "enemy",
      color: "#ffd27f",
      ttl: 4,
      r: 6,
      turnRate: 5.5,
      seekRadius: 380,
      type: "missile",
      rotation: angle,
    });
    tank.missileAmmo -= 1;
    firedMissile = true;
  } else if (useMine) {
    dropMine(tank);
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
  } else if (firedMissile) {
    playMissileLaunchSound();
  } else {
    playShootSound();
  }
  tank.fireCooldown = tank.fireRate;
  if (!useSpecial) {
    tank.ammo -= 1;
    if (tank.ammo <= 0) {
      tank.reloadTimer = tank.reloadTime;
    }
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
    game.status = game.oneLife ? "一命挑战失败" : "遗憾落败";
    game.respawnTimer = 0;
    if (game.oneLife) {
      stopBgm();
      showModal({
        title: "遗憾！一命挑战失败",
        desc: `你在第 ${game.level} 关失利，点击确认返回模式选择。`,
        buttonText: "返回模式选择",
        action: "backToModeSelect",
        actionStatus: "选择模式重新挑战",
      });
    } else {
      showModal({
        title: "遗憾！生命耗尽",
        desc: `你在第 ${game.level} 关耗尽生命。点击“重试”重新开始本关。`,
        buttonText: "重试",
        action: "retryLevel",
        secondaryText: "返回皮肤选择",
        secondaryAction: "backToModeSelect",
        secondaryActionStatus: "返回皮肤选择，重新装扮后再战",
      });
    }
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

    if (b.type === "missile") {
      const missileExplosion = {
        radius: 95,
        fragments: 12,
        fragmentStyle: "poly",
        randomFragments: true,
        randomFragmentDirection: true,
        flash: true,
        flashRadius: 120,
        sound: "missile",
        avoidWalls: true,
        avoidWallsDistance: 50,
        avoidWallsPadding: 14,
        clampToBounds: true,
        clearPad: 8,
      };
      b.ttl -= dt;
      if (b.ttl <= 0) {
        explodeAt(b.x, b.y, b.owner, missileExplosion);
        game.bullets.splice(i, 1);
        continue;
      }
      const target = acquireMissileTarget(b);
      if (target) {
        const desired = Math.atan2(target.y - b.y, target.x - b.x);
        const current = Math.atan2(b.dy, b.dx);
        const diff = wrapAngle(desired - current);
        const maxTurn = (b.turnRate ?? 4.5) * dt;
        const nextAng = current + clamp(diff, -maxTurn, maxTurn);
        const spd = b.speed ?? Math.hypot(b.dx, b.dy);
        b.dx = Math.cos(nextAng) * spd;
        b.dy = Math.sin(nextAng) * spd;
        b.rotation = nextAng;
      } else {
        b.rotation = Math.atan2(b.dy, b.dx);
      }
      b.x += b.dx * dt;
      b.y += b.dy * dt;
      const circle = { x: b.x, y: b.y, r: b.r ?? 6 };
      const hitWall = collidesWalls({ x: circle.x - circle.r, y: circle.y - circle.r, w: circle.r * 2, h: circle.r * 2 });
      const hitBorder = circle.x < circle.r || circle.x > canvas.width - circle.r || circle.y < circle.r || circle.y > canvas.height - circle.r;
      const playerHit = b.owner !== "player" && game.player.alive && circleRect(circle, tankRect(game.player));
      const enemyIndex = b.owner === "player" ? game.enemies.findIndex((e) => e.alive && circleRect(circle, tankRect(e))) : -1;
      if (hitWall || hitBorder || playerHit || enemyIndex !== -1) {
        if (playerHit) {
          if (!playerShielded()) {
            killPlayer({ silent: true });
          } else {
            triggerShieldHitSound();
          }
        } else if (enemyIndex !== -1) {
          const targetEnemy = game.enemies[enemyIndex];
          if (targetEnemy.spawnShield <= 0) {
            targetEnemy.alive = false;
            targetEnemy.deathTimer = 0.6;
          }
        }
        explodeAt(circle.x, circle.y, b.owner, missileExplosion);
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

function acquireMissileTarget(bullet) {
  const radius = bullet.seekRadius ?? 340;
  if (bullet.owner === "player") {
    let closest = null;
    let bestDist = radius + 1;
    for (const e of game.enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - bullet.x, e.y - bullet.y);
      if (d > radius || d >= bestDist) continue;
      if (!hasLineOfSight(bullet.x, bullet.y, e.x, e.y)) continue;
      closest = e;
      bestDist = d;
    }
    return closest;
  }
  if (bullet.owner === "enemy" && game.player?.alive) {
    const d = Math.hypot(game.player.x - bullet.x, game.player.y - bullet.y);
    if (d <= radius && hasLineOfSight(bullet.x, bullet.y, game.player.x, game.player.y)) {
      return game.player;
    }
  }
  return null;
}

function updatePowerups(dt) {
  game.powerupTimer -= dt;
  const maxPowerups = 3;
  if (!game.gameOver && game.powerups.length < maxPowerups && game.powerupTimer <= 0) {
    spawnPowerup();
    game.powerupTimer = powerupRespawnDelay();
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
      game.lives = Math.min(maxLives(), game.lives + 1);
      game.status = "生命 +1";
      break;
    case "laser":
      p.laserAmmo = 1; // 单发激光，持续存储直到使用
      game.status = "激光弹药就绪（无限时效）";
      break;
    case "cannon":
      p.cannonAmmo = 2;
      game.status = "炮弹已装填";
      break;
    case "mine":
      p.mineAmmo = 2;
      game.status = "地雷可用";
      break;
    case "missile":
      p.missileAmmo = 2;
      game.status = "导弹锁定就绪";
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
      // Corner deadlock: try a small nudge away from nearest wall.
      const normal = nearestWallNormal(tank.x, tank.y);
      if (normal.dist < tile * 0.6) {
        nudgeTankAway(tank, normal, 8);
      }
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

  // Avoid sitting inside the player (prevents抖动/重叠)
  if (!tank.isPlayer && game.player && game.player.alive && tankTouches(tank, game.player)) {
    const dxp = tank.x - game.player.x || (Math.random() * 2 - 1) * 0.01;
    const dyp = tank.y - game.player.y || (Math.random() * 2 - 1) * 0.01;
    const len = Math.hypot(dxp, dyp) || 1;
    const push = 10;
    const nxp = clamp(tank.x + (dxp / len) * push, w / 2, canvas.width - w / 2);
    const nyp = clamp(tank.y + (dyp / len) * push, h / 2, canvas.height - h / 2);
    const rectP = { x: nxp - w / 2, y: nyp - h / 2, w, h };
    if (!collidesWalls(rectP)) {
      tank.x = nxp;
      tank.y = nyp;
    }
  }

  return { dx: tank.x - beforeX, dy: tank.y - beforeY };
}

function nudgeTankAway(tank, normal, dist = 14) {
  const w = tank.size;
  const h = tank.size;
  const tryMove = (vx, vy) => {
    const nx = clamp(tank.x + vx, w / 2, canvas.width - w / 2);
    const ny = clamp(tank.y + vy, h / 2, canvas.height - h / 2);
    const rect = { x: nx - w / 2, y: ny - h / 2, w, h };
    if (!collidesWalls(rect)) {
      tank.x = nx;
      tank.y = ny;
      return true;
    }
    return false;
  };
  // Push directly away from the nearest wall.
  if (tryMove(normal.nx * dist, normal.ny * dist)) return true;
  // Try diagonals to slide out of corners.
  const perp1 = { nx: -normal.ny, ny: normal.nx };
  const perp2 = { nx: normal.ny, ny: -normal.nx };
  if (tryMove((normal.nx + perp1.nx) * dist * 0.7, (normal.ny + perp1.ny) * dist * 0.7)) return true;
  if (tryMove((normal.nx + perp2.nx) * dist * 0.7, (normal.ny + perp2.ny) * dist * 0.7)) return true;
  return false;
}

function tanksCollide(temp, list) {
  return list.some((t) => tankTouches(temp, t));
}

function tickTankTimers(tank, dt) {
  if (!tank) return;
  if (tank.spawnShield > 0) tank.spawnShield -= dt;
  if (tank.powerShieldTimer > 0) tank.powerShieldTimer = Math.max(0, tank.powerShieldTimer - dt);
  if (tank.cannonAmmo < 0) tank.cannonAmmo = 0;
  if (tank.mineAmmo < 0) tank.mineAmmo = 0;
  if (tank.missileAmmo < 0) tank.missileAmmo = 0;
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

function nearestWallNormal(x, y) {
  let minDist = Math.min(x, canvas.width - x, y, canvas.height - y);
  let best = { nx: 0, ny: 0, dist: minDist };
  if (minDist === x) best = { nx: 1, ny: 0, dist: minDist };
  else if (minDist === canvas.width - x) best = { nx: -1, ny: 0, dist: minDist };
  else if (minDist === y) best = { nx: 0, ny: 1, dist: minDist };
  else if (minDist === canvas.height - y) best = { nx: 0, ny: -1, dist: minDist };

  for (const w of walls) {
    const cx = clamp(x, w.x, w.x + w.w);
    const cy = clamp(y, w.y, w.y + w.h);
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.hypot(dx, dy);
    if (dist < minDist) {
      minDist = dist;
      const len = dist || 1;
      best = { nx: dx / len, ny: dy / len, dist };
    }
  }
  return best;
}

function raycastClearDistance(tank, ang, maxDist = tile * 4, step = tile * 0.35) {
  for (let d = step; d <= maxDist; d += step) {
    if (willHitWall(tank, ang, d)) {
      return d - step;
    }
  }
  return maxDist;
}

function bestOpenAngle(tank, preferred) {
  const samples = 24;
  let bestAng = preferred;
  let bestScore = -Infinity;
  for (let i = 0; i < samples; i++) {
    const ang = wrapAngle((Math.PI * 2 * i) / samples);
    const dist = raycastClearDistance(tank, ang);
    const angPenalty = Math.abs(wrapAngle(ang - preferred));
    const score = dist - angPenalty * tile * 0.2;
    if (score > bestScore) {
      bestScore = score;
      bestAng = ang;
    }
  }
  return wrapAngle(bestAng);
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
  drawSpawnWarnings();
  drawPowerups();
  drawMines();
  drawBullets();
  drawIngameCounters();
  drawPlayer();
  drawEnemies();
  if (game.gameOver && !game.modalAction && !game.modalSecondaryAction) {
    drawOverlay("游戏结束", "按 R 重试本关");
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

function drawSpawnWarnings() {
  for (const warn of game.spawnWarnings) {
    const t = clamp(warn.ttl / (warn.life || 1), 0, 1);
    const baseR = 24;
    const pulse = 10 * (1 - t);
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = `rgba(255,138,160,${0.4 + 0.35 * t})`;
    ctx.beginPath();
    ctx.arc(warn.x, warn.y, baseR + pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = `rgba(255,221,153,${0.35 + 0.25 * t})`;
    ctx.beginPath();
    ctx.arc(warn.x, warn.y, baseR * 0.6 + pulse * 0.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawIngameCounters() {
  const remaining = remainingEnemiesTotal();
  const pad = 14;
  const gap = 6;
  const boxW = 168;
  const boxH = 66;
  const x = pad;
  const y = pad;

  ctx.save();
  ctx.fillStyle = "rgba(12,14,22,0.65)";
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;
  drawRoundedRectPath(ctx, x, y, boxW, boxH, 10);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText(`关卡 ${game.level}`, x + pad, y + pad);
  ctx.fillStyle = "#ffd27f";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText(`本关剩余 ${remaining}`, x + pad, y + pad + 22 + gap);
  ctx.restore();
}

function drawPowerups() {
  const visuals = {
    shield: { fill: "rgba(120,200,255,0.18)", stroke: "#8ce1ff" },
    heart: { fill: "rgba(255,120,140,0.2)", stroke: "#ff8aa0" },
    laser: { fill: "rgba(200,160,255,0.18)", stroke: "#c592ff" },
    cannon: { fill: "rgba(255,204,140,0.2)", stroke: "#ffb36b" },
    mine: { fill: "rgba(120,220,200,0.2)", stroke: "#6de0c1" },
    missile: { fill: "rgba(67,255,158,0.18)", stroke: missileColor },
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
    case "missile": {
      // Make missile visually distinct from bullet/cannon: neon-green body + magenta accents.
      const bodyW = r * 0.55;
      const bodyH = r * 1.35;
      const bodyY = -bodyH * 0.15;
      const noseY = -bodyH * 0.75;
      const bodyTop = bodyY - bodyH * 0.45;
      const bodyBottom = bodyY + bodyH * 0.5;

      // Body capsule
      ctx.lineWidth = 2;
      ctx.strokeStyle = missileColor;
      ctx.fillStyle = "rgba(67,255,158,0.26)";
      drawRoundedRectPath(ctx, -bodyW / 2, bodyTop, bodyW, bodyH * 0.95, bodyW * 0.45);
      ctx.fill();
      ctx.stroke();

      // Nose cone
      ctx.fillStyle = missileDarkColor;
      ctx.strokeStyle = missileColor;
      ctx.beginPath();
      ctx.moveTo(0, noseY);
      ctx.lineTo(bodyW * 0.55, bodyTop + bodyH * 0.18);
      ctx.lineTo(-bodyW * 0.55, bodyTop + bodyH * 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Fins
      ctx.strokeStyle = missileAccentColor;
      ctx.fillStyle = "rgba(255,79,184,0.5)";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-bodyW / 2, bodyBottom - bodyH * 0.2);
      ctx.lineTo(-bodyW * 0.95, bodyBottom);
      ctx.lineTo(-bodyW / 2, bodyBottom + bodyH * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bodyW / 2, bodyBottom - bodyH * 0.2);
      ctx.lineTo(bodyW * 0.95, bodyBottom);
      ctx.lineTo(bodyW / 2, bodyBottom + bodyH * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Exhaust flame
      ctx.strokeStyle = missileAccentColor;
      ctx.fillStyle = "rgba(255,79,184,0.35)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-bodyW * 0.22, bodyBottom + bodyH * 0.12);
      ctx.lineTo(0, bodyBottom + bodyH * 0.45);
      ctx.lineTo(bodyW * 0.22, bodyBottom + bodyH * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Small "window"/lock point
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.beginPath();
      ctx.arc(0, bodyTop + bodyH * 0.3, r * 0.09, 0, Math.PI * 2);
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
  const bodyAngle = angle ?? 0;
  const turretAngle = tank.turretAngle ?? bodyAngle;
  ctx.rotate(bodyAngle);
  const w = size;
  const h = size * 0.7;
  const skin = tank.skin ?? "default";
  const accent = tank.accentColor ?? tank.turretColor ?? tank.color;
  const detail = tank.detailColor ?? "#161722";
  ctx.strokeStyle = "rgba(0,0,0,0.35)";

  // Base fill (allow simple gradients per皮肤)
  if (skin === "split") {
    const g = ctx.createLinearGradient(-w / 2, -h / 2, -w / 2, h / 2);
    g.addColorStop(0, hexToRgba(accent, 0.5));
    g.addColorStop(0.55, tank.color);
    ctx.fillStyle = g;
  } else if (skin === "vanguard") {
    const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    g.addColorStop(0, hexToRgba(tank.color, 0.95));
    g.addColorStop(1, hexToRgba(accent, 0.55));
    ctx.fillStyle = g;
  } else if (skin === "prism") {
    const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    g.addColorStop(0, hexToRgba(tank.color, 0.9));
    g.addColorStop(0.5, hexToRgba(accent, 0.75));
    g.addColorStop(1, hexToRgba("#6fffff", 0.8));
    ctx.fillStyle = g;
  } else if (skin === "royal") {
    const g = ctx.createLinearGradient(-w / 2, h / 2, w / 2, -h / 2);
    g.addColorStop(0, hexToRgba(tank.color, 0.9));
    g.addColorStop(0.6, hexToRgba(accent, 0.65));
    g.addColorStop(1, hexToRgba("#fff5c0", 0.8));
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = tank.color;
  }
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeRect(-w / 2, -h / 2, w, h);

  // Accent patterns per皮肤
  if (skin === "panel") {
    ctx.strokeStyle = hexToRgba(accent, 0.3);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 4, 0);
    ctx.lineTo(w / 2 - 4, 0);
    ctx.moveTo(-w / 2 + 8, -h / 2 + 6);
    ctx.lineTo(-w / 2 + 8, h / 2 - 6);
    ctx.moveTo(w / 2 - 8, -h / 2 + 6);
    ctx.lineTo(w / 2 - 8, h / 2 - 6);
    ctx.stroke();
  } else if (skin === "stripe") {
    ctx.save();
    ctx.translate(0, 0);
    ctx.rotate(-Math.PI / 9);
    ctx.fillStyle = hexToRgba(accent, 0.35);
    ctx.fillRect(-w * 0.7, -h * 0.15, w * 1.4, h * 0.3);
    ctx.fillStyle = hexToRgba(accent, 0.18);
    ctx.fillRect(-w * 0.7, -h * 0.4, w * 1.4, h * 0.18);
    ctx.restore();
  } else if (skin === "vanguard") {
    ctx.fillStyle = hexToRgba(accent, 0.25);
    ctx.fillRect(-w / 2, -h / 2, w * 0.2, h);
    ctx.fillRect(w / 2 - w * 0.2, -h / 2, w * 0.2, h);
    ctx.fillRect(-w * 0.18, h * 0.05, w * 0.36, h * 0.4);
  } else if (skin === "prism") {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = hexToRgba("#b48bff", 0.4);
    ctx.beginPath();
    ctx.moveTo(-w * 0.25, -h * 0.15);
    ctx.lineTo(w * 0.05, -h * 0.45);
    ctx.lineTo(w * 0.35, -h * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = hexToRgba("#5ecbff", 0.35);
    ctx.beginPath();
    ctx.moveTo(-w * 0.05, h * 0.45);
    ctx.lineTo(w * 0.32, h * 0.1);
    ctx.lineTo(w * 0.6, h * 0.48);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = hexToRgba(accent, 0.35);
    ctx.lineWidth = 2;
    ctx.strokeRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8);
  } else if (skin === "rogue") {
    const glow = accent ?? "#ffe17a";
    ctx.strokeStyle = hexToRgba(glow, 0.5);
    ctx.lineWidth = 2;
    ctx.strokeRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
    ctx.fillStyle = hexToRgba(glow, 0.12);
    ctx.fillRect(-w * 0.18, -h * 0.25, w * 0.36, h * 0.5);
  } else if (skin === "royal") {
    ctx.strokeStyle = hexToRgba("#fff5c0", 0.55);
    ctx.lineWidth = 2.2;
    ctx.strokeRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
    ctx.fillStyle = hexToRgba(accent, 0.22);
    ctx.fillRect(-w * 0.14, -h * 0.12, w * 0.28, h * 0.7);
    ctx.fillStyle = hexToRgba("#fff5c0", 0.35);
    ctx.fillRect(-w * 0.26, h * 0.12, w * 0.52, h * 0.16);
  }

  // Hatch
  ctx.fillStyle = detail;
  ctx.fillRect(-w * 0.2, -h * 0.2, w * 0.4, h * 0.4);
  // Player-only glow halo for更华丽观感
  if (tank.isPlayer) {
    ctx.strokeStyle = hexToRgba(accent, 0.28);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect?.(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 8);
    ctx.stroke();
  }
  ctx.save();
  ctx.rotate(turretAngle - bodyAngle);
  drawTurret(tank, w, h);
  ctx.restore();
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
    if (tank.laserAmmo > 0) return "laser";
    if (tank.cannonAmmo > 0) return "cannon";
    if (tank.missileAmmo > 0) return "missile";
    if (tank.mineAmmo > 0) return "mine";
  }
  return "normal";
}

function drawTurret(tank, w, h) {
  const mode = turretMode(tank);
  const barrelY = 0;
  ctx.save();
  switch (mode) {
    case "laser": {
      const railG = ctx.createLinearGradient(w * 0.05, barrelY, w * 0.78, barrelY);
      railG.addColorStop(0, "#1c1238");
      railG.addColorStop(1, "#704dff");
      ctx.fillStyle = railG;
      ctx.strokeStyle = hexToRgba("#ffffff", 0.6);
      ctx.lineWidth = 2.4;
      drawRoundedRectPath(ctx, w * 0.05, barrelY - 6, w * 0.72, 12, 5);
      ctx.fill();
      ctx.stroke();

      const coreG = ctx.createLinearGradient(w * 0.12, barrelY, w * 0.74, barrelY);
      coreG.addColorStop(0, hexToRgba(laserColor, 0.1));
      coreG.addColorStop(0.4, hexToRgba(laserColor, 0.55));
      coreG.addColorStop(1, "#ffffff");
      ctx.fillStyle = coreG;
      ctx.shadowColor = laserColor;
      ctx.shadowBlur = 14;
      drawRoundedRectPath(ctx, w * 0.14, barrelY - 3.5, w * 0.55, 7, 3);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = laserColor;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(w * 0.79, barrelY, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "cannon": {
      const steel = ctx.createLinearGradient(w * 0.04, barrelY, w * 0.68, barrelY);
      steel.addColorStop(0, "#3b2d17");
      steel.addColorStop(0.45, "#ffdd99");
      steel.addColorStop(1, "#c4742a");
      ctx.fillStyle = steel;
      ctx.strokeStyle = "rgba(0,0,0,0.45)";
      ctx.lineWidth = 2.4;
      drawRoundedRectPath(ctx, w * 0.04, barrelY - 7, w * 0.68, 14, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = hexToRgba("#ffb36b", 0.65);
      drawRoundedRectPath(ctx, w * 0.12, barrelY - 3.5, w * 0.5, 7, 3);
      ctx.fill();

      ctx.strokeStyle = "#ffc868";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(w * 0.7, barrelY, 6, -Math.PI / 6, Math.PI / 6);
      ctx.stroke();

      ctx.fillStyle = hexToRgba("#472b12", 0.4);
      const vents = 3;
      for (let i = 0; i < vents; i++) {
        const t = i / (vents - 1);
        const vx = w * (0.18 + t * 0.38);
        drawRoundedRectPath(ctx, vx, barrelY - 2, w * 0.08, 4, 2);
        ctx.fill();
      }

      ctx.fillStyle = "#ffb36b";
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(w * 0.08, barrelY, 3, 0, Math.PI * 2);
      ctx.arc(w * 0.12, barrelY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "missile": {
      // Missile rack: dark pod + neon green missiles, clearly different from bullet/cannon barrels.
      ctx.lineWidth = 2;
      const podG = ctx.createLinearGradient(w * 0.06, barrelY - 8, w * 0.74, barrelY + 8);
      podG.addColorStop(0, hexToRgba("#0b2a22", 0.9));
      podG.addColorStop(1, hexToRgba("#113a2e", 0.9));
      ctx.fillStyle = podG;
      ctx.strokeStyle = missileColor;
      drawRoundedRectPath(ctx, w * 0.06, barrelY - 8, w * 0.68, 16, 6);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = hexToRgba(missileColor, 0.45);
      ctx.lineWidth = 1.6;
      drawRoundedRectPath(ctx, w * 0.12, barrelY - 5, w * 0.52, 10, 4);
      ctx.stroke();

      const slots = 3;
      for (let i = 0; i < slots; i++) {
        const t = i / (slots - 1);
        const mx = w * (0.18 + t * 0.3);
        ctx.fillStyle = hexToRgba(missileDarkColor, 0.9);
        ctx.strokeStyle = hexToRgba(missileColor, 0.85);
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(mx, barrelY, 4.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = hexToRgba("#ffffff", 0.75);
        ctx.beginPath();
        ctx.arc(mx - 1.2, barrelY, 1.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = missileAccentColor;
        ctx.beginPath();
        ctx.moveTo(mx + 4.8, barrelY - 4.4);
        ctx.lineTo(mx + 8.5, barrelY);
        ctx.lineTo(mx + 4.8, barrelY + 4.4);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case "mine": {
      const baseG = ctx.createLinearGradient(w * 0.12, barrelY - 6, w * 0.52, barrelY + 6);
      baseG.addColorStop(0, "#2a203f");
      baseG.addColorStop(1, "#6046ad");
      ctx.fillStyle = baseG; // deep purple base
      ctx.strokeStyle = "#9b7cff"; // bright violet accent
      ctx.lineWidth = 2.2;
      drawRoundedRectPath(ctx, w * 0.12, barrelY - 6, w * 0.5, 12, 4);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "#c9b1ff";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(w * 0.18, barrelY - 4);
      ctx.lineTo(w * 0.18, barrelY + 4);
      ctx.moveTo(w * 0.58, barrelY - 4);
      ctx.lineTo(w * 0.58, barrelY + 4);
      ctx.stroke();

      ctx.fillStyle = "#e6ddff";
      ctx.beginPath();
      ctx.arc(w * 0.38, barrelY, 4.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#6de0c1";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(w * 0.38, barrelY, 7.8, -Math.PI * 0.2, Math.PI * 0.2);
      ctx.arc(w * 0.38, barrelY, 7.8, Math.PI * 0.8, Math.PI * 1.2);
      ctx.stroke();
      break;
    }
    default: {
      ctx.fillStyle = tank.turretColor ?? tank.color;
      drawRoundedRectPath(ctx, w * 0.1, barrelY - 5, w * 0.5, 10, 3);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
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
    } else if (b.type === "missile") {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rotation ?? 0);
      const bodyLen = (b.r ?? 6) * 2.2;
      const bodyRad = (b.r ?? 6) * 0.7;
      ctx.shadowColor = missileColor;
      ctx.shadowBlur = 10;
      ctx.fillStyle = missileColor;
      ctx.strokeStyle = missileAccentColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-bodyLen * 0.4, -bodyRad);
      ctx.lineTo(bodyLen * 0.35, -bodyRad);
      ctx.lineTo(bodyLen * 0.6, 0);
      ctx.lineTo(bodyLen * 0.35, bodyRad);
      ctx.lineTo(-bodyLen * 0.4, bodyRad);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-bodyLen * 0.45, -bodyRad * 0.9);
      ctx.lineTo(-bodyLen * 0.8, 0);
      ctx.lineTo(-bodyLen * 0.45, bodyRad * 0.9);
      ctx.fillStyle = "rgba(255,79,184,0.6)";
      ctx.fill();
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
  const remaining = remainingEnemiesTotal();
  hudEnemies.textContent = `敌人 ${remaining}`;
  hudStatus.textContent = game.status;
}

function remainingEnemiesTotal() {
  const aliveEnemies = game.enemies.filter((e) => e.alive).length;
  return game.enemyQueue + game.pendingSpawns.length + aliveEnemies;
}

function maxLives() {
  return baseLivesForLevel(game.level);
}

function setPlayerSkin(id) {
  selectedPlayerSkinId = id;
  updateStylePickerActive();
  if (game.player) {
    applyStyleToTank(game.player, currentPlayerStyle());
  }
}

function renderPlayerStyleOptions() {
  if (!playerStyleOptions) return;
  playerStyleOptions.innerHTML = "";
  const frag = document.createDocumentFragment();
  for (const skin of playerSkins) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "style-card";
    btn.dataset.skinId = skin.id;
    const accent = skin.accentColor ?? skin.turretColor ?? skin.color;
    btn.innerHTML = `
      <span class="style-swatch" style="background: linear-gradient(135deg, ${skin.color}, ${hexToRgba(
      accent,
      0.9
    )});"></span>
      <span class="style-card-text">
        <span class="style-label">${skin.name}</span>
        <span class="style-sub">${skin.desc}</span>
      </span>
    `;
    btn.addEventListener("click", () => setPlayerSkin(skin.id));
    frag.appendChild(btn);
  }
  playerStyleOptions.appendChild(frag);
  updateStylePickerActive();
}

function updateStylePickerActive() {
  if (!playerStyleOptions) return;
  const cards = playerStyleOptions.querySelectorAll(".style-card");
  cards.forEach((card) => {
    const active = card.dataset.skinId === selectedPlayerSkinId;
    card.classList.toggle("active", active);
  });
}

function setupControls() {
  window.addEventListener("keydown", (e) => {
    const key = normalizeKey(e);
    if (["w", "a", "s", "d", " ", "space", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
      e.preventDefault();
    }
    if (game.modalAction || game.modalSecondaryAction) {
      if (key === "enter" || key === " ") {
        e.preventDefault();
        confirmModal();
      } else if (key === "r" && game.modalAction === "retryLevel") {
        e.preventDefault();
        confirmModal();
      } else if (key === "q") {
        if (game.modalSecondaryAction === "backToModeSelect" || game.modalSecondaryAction === "backToSkinSelect") {
          e.preventDefault();
          confirmModal("secondary");
        } else if (game.modalAction === "backToModeSelect" || game.modalAction === "backToSkinSelect") {
          e.preventDefault();
          confirmModal();
        }
      }
      return;
    }
    if (key === "q") {
      if (game.started && !game.gameOver) {
        e.preventDefault();
        promptReturnToSkinSelect();
      }
      return;
    }
    if (key === "r") {
      if (game.started) {
        retryCurrentLevel();
      }
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

function promptReturnToSkinSelect() {
  showModal({
    title: "返回皮肤选择？",
    desc: "当前战斗将结束，返回皮肤/模式选择界面后可重新装扮再出发。",
    buttonText: "返回皮肤选择",
    action: "backToModeSelect",
    actionStatus: "已返回皮肤/模式选择，可重新装扮后再战",
    secondaryText: "继续战斗",
    secondaryAction: null,
  });
}

setupControls();
game.status = "阅读说明后点击“前往模式选择”";
updateHud();
renderPlayerStyleOptions();
if (startButton) {
  startButton.addEventListener("click", beginGame);
}
if (modalButton) {
  modalButton.addEventListener("click", confirmModal);
}
if (modalSecondaryButton) {
  modalSecondaryButton.addEventListener("click", () => confirmModal("secondary"));
}
if (modeNormalBtn) {
  modeNormalBtn.addEventListener("click", () => startGameWithMode("normal"));
}
if (modeOneLifeBtn) {
  modeOneLifeBtn.addEventListener("click", () => startGameWithMode("oneLife"));
}
