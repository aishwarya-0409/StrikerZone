import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { io } from 'socket.io-client';
import { Howl, Howler } from 'howler';
import { Player } from './player.js';
import { Weapon } from './weapons.js';
import { ParticleSystem } from './particles.js';
import { RescueSystem } from './rescueSystem.js';
import { VoxelCharacter } from './models.js';

// Scene & Sky
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a14);
scene.fog = new THREE.Fog(0x0a0a14, 20, 90);

function createNoiseTexture(base = '#4b5320', noise = '#3c4418', size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 2600; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const alpha = 0.08 + Math.random() * 0.2;
    ctx.fillStyle = `${noise}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
    ctx.fillRect(x, y, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

function createZombieSkinTexture(size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#80b05f');
  grad.addColorStop(1, '#3f6233');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 30; i += 1) {
    ctx.strokeStyle = `rgba(120, 10, 10, ${0.2 + Math.random() * 0.3})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(Math.random() * size, Math.random() * size);
    ctx.lineTo(Math.random() * size, Math.random() * size);
    ctx.stroke();
  }
  ctx.fillStyle = '#ff5e5e';
  ctx.beginPath();
  ctx.arc(size * 0.35, size * 0.34, size * 0.06, 0, Math.PI * 2);
  ctx.arc(size * 0.65, size * 0.34, size * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1d1d1d';
  ctx.fillRect(size * 0.3, size * 0.62, size * 0.4, size * 0.09);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 2);
  return texture;
}

const textureLoader = new THREE.TextureLoader();
const zombieTextures = {
  runner: textureLoader.load('/zombie-runner.svg'),
  tank: textureLoader.load('/zombie-tank.svg'),
  spitter: textureLoader.load('/zombie-spitter.svg'),
  fallback: createZombieSkinTexture()
};
for (const texture of Object.values(zombieTextures)) {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 2);
}

// Physics world
const world = new CANNON.World({
  gravity: new CANNON.Vec3(0, -9.82, 0)
});

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 0);
scene.add(camera);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Add Lights
const ambientLight = new THREE.AmbientLight(0x4040ff, 0.15); // Dim blue ambient
scene.add(ambientLight);

const moonLight = new THREE.DirectionalLight(0xaaccff, 0.5);
moonLight.position.set(20, 40, 20);
moonLight.castShadow = true;
moonLight.shadow.mapSize.width = 2048;
moonLight.shadow.mapSize.height = 2048;
scene.add(moonLight);

function addStreetLamp(x, z) {
  const group = new THREE.Group();
  
  // Pole
  const poleGeo = new THREE.CylinderGeometry(0.1, 0.15, 6, 8);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.y = 3;
  pole.castShadow = true;
  group.add(pole);

  // Arm
  const armGeo = new THREE.BoxGeometry(1.5, 0.1, 0.1);
  const arm = new THREE.Mesh(armGeo, poleMat);
  arm.position.set(0.7, 5.8, 0);
  group.add(arm);

  // Light House
  const headGeo = new THREE.BoxGeometry(0.5, 0.2, 0.5);
  const head = new THREE.Mesh(headGeo, poleMat);
  head.position.set(1.4, 5.7, 0);
  group.add(head);

  // Actual Light
  const light = new THREE.PointLight(0xffaa55, 12, 15, 1.5);
  light.position.set(1.4, 5.5, 0);
  light.castShadow = true;
  group.add(light);

  // Visual Bulb
  const bulbGeo = new THREE.SphereGeometry(0.15, 8, 8);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffcc88 });
  const bulb = new THREE.Mesh(bulbGeo, bulbMat);
  bulb.position.set(1.4, 5.5, 0);
  group.add(bulb);

  group.position.set(x, 0, z);
  scene.add(group);
}

addStreetLamp(15, -15);
addStreetLamp(-15, -35);
addStreetLamp(25, -55);
addStreetLamp(-25, 10);

// Add Ground
const floorGeo = new THREE.PlaneGeometry(100, 100);
const floorTexture = createNoiseTexture('#546a3e', '#344223');
floorTexture.repeat.set(25, 25);
const floorMat = new THREE.MeshStandardMaterial({
  map: floorTexture,
  roughness: 0.95,
  metalness: 0.02
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
const floorBody = new CANNON.Body({
  type: CANNON.Body.STATIC,
  shape: new CANNON.Plane()
});
floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(floorBody);

const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.9 });
const windowMaterial = new THREE.MeshStandardMaterial({ color: 0x88ccff, emissive: 0x224466, roughness: 0.2 });
const shootableObjects = [];

function addHouse(x, z, size = { w: 8, h: 6, d: 8 }) {
  const group = new THREE.Group();
  
  // Base House
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.w, size.h, size.d), wallMaterial);
  mesh.position.y = size.h / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  // Windows
  const winGeo = new THREE.BoxGeometry(1.2, 1.2, 0.1);
  for (let i = 0; i < 4; i++) {
    const win = new THREE.Mesh(winGeo, windowMaterial);
    const side = i % 2 === 0 ? 1 : -1;
    if (i < 2) win.position.set(side * 2, size.h / 2, size.d / 2 + 0.05);
    else win.position.set(side * 2, size.h / 2, -size.d / 2 - 0.05);
    group.add(win);
  }

  // Physics
  const body = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: new CANNON.Box(new CANNON.Vec3(size.w / 2, size.h / 2, size.d / 2)),
    position: new CANNON.Vec3(x, size.h / 2, z)
  });
  world.addBody(body);

  group.position.set(x, 0, z);
  scene.add(group);
  shootableObjects.push(mesh);
}

function generateTown() {
  const gridSize = 30;
  for (let x = -60; x <= 60; x += gridSize) {
    for (let z = -80; z <= 20; z += gridSize) {
      if (Math.abs(x) < 10 && Math.abs(z) < 10) continue; // Keep center clear for rescue zone
      
      const offsetX = (Math.random() - 0.5) * 10;
      const offsetZ = (Math.random() - 0.5) * 10;
      
      if (Math.random() > 0.4) {
        addHouse(x + offsetX, z + offsetZ);
      } else {
        // Add some crates/props
        const propMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), wallMaterial);
        propMesh.position.set(x + offsetX, 1, z + offsetZ);
        scene.add(propMesh);
        shootableObjects.push(propMesh);
        
        const propBody = new CANNON.Body({
          type: CANNON.Body.STATIC,
          shape: new CANNON.Box(new CANNON.Vec3(1, 1, 1)),
          position: new CANNON.Vec3(x + offsetX, 1, z + offsetZ)
        });
        world.addBody(propBody);
      }
    }
  }
}

generateTown();
const remotePlayers = new Map();
const zombieMeshes = new Map();
let localSocketId = null;
let health = 100;
let snapshotPlayerCount = 1;
let score = 0;
let wave = 1;
let damageFlashUntil = 0;

const healthValueEl = document.getElementById('healthValue');
const ammoValueEl = document.getElementById('ammoValue');
const serverStatusEl = document.getElementById('serverStatus');
const playersOnlineEl = document.getElementById('playersOnline');
const killFeedEl = document.getElementById('killFeed');
const centerMessageEl = document.getElementById('centerMessage');
const hitmarkerEl = document.getElementById('hitmarker');
const threatArrowEl = document.getElementById('threatArrow');
const threatTextEl = document.getElementById('threatText');
const radarEl = document.getElementById('radar');
const radarCtx = radarEl.getContext('2d');
const startMenuEl = document.getElementById('startMenu');
const gameOverOverlayEl = document.getElementById('gameOverOverlay');
const gameOverStatsEl = document.getElementById('gameOverStats');
const pauseOverlayEl = document.getElementById('pauseOverlay');
const startBtn = document.getElementById('startBtn');
const respawnBtn = document.getElementById('respawnBtn');
const resumeBtn = document.getElementById('resumeBtn');
const pauseSettingsBtn = document.getElementById('pauseSettingsBtn');
const exitMenuBtn = document.getElementById('exitMenuBtn');
const masterVolEl = document.getElementById('masterVol');
const sfxVolEl = document.getElementById('sfxVol');
const ambientVolEl = document.getElementById('ambientVol');
const masterVolTextEl = document.getElementById('masterVolText');
const sfxVolTextEl = document.getElementById('sfxVolText');
const ambientVolTextEl = document.getElementById('ambientVolText');
const muteToggleEl = document.getElementById('muteToggle');
const sensitivityEl = document.getElementById('sensitivity');
const fovEl = document.getElementById('fov');
const invertYEl = document.getElementById('invertY');
const sensitivityTextEl = document.getElementById('sensitivityText');
const fovTextEl = document.getElementById('fovText');
const sensLowBtn = document.getElementById('sensLow');
const sensMedBtn = document.getElementById('sensMed');
const sensHighBtn = document.getElementById('sensHigh');
const resetDefaultsBtn = document.getElementById('resetDefaults');
const hudSettingsBtn = document.getElementById('hudSettingsBtn');
const hudSettingsPanel = document.getElementById('hudSettingsPanel');
const hudMasterVolEl = document.getElementById('hudMasterVol');
const hudSfxVolEl = document.getElementById('hudSfxVol');
const hudAmbientVolEl = document.getElementById('hudAmbientVol');
const hudMasterVolTextEl = document.getElementById('hudMasterVolText');
const hudSfxVolTextEl = document.getElementById('hudSfxVolText');
const hudAmbientVolTextEl = document.getElementById('hudAmbientVolText');
const hudMuteToggleEl = document.getElementById('hudMuteToggle');
const hudSensitivityEl = document.getElementById('hudSensitivity');
const hudFovEl = document.getElementById('hudFov');
const hudInvertYEl = document.getElementById('hudInvertY');
const hudSensitivityTextEl = document.getElementById('hudSensitivityText');
const hudFovTextEl = document.getElementById('hudFovText');
const hudSensLowBtn = document.getElementById('hudSensLow');
const hudSensMedBtn = document.getElementById('hudSensMed');
const hudSensHighBtn = document.getElementById('hudSensHigh');
const hudResetDefaultsBtn = document.getElementById('hudResetDefaults');
let isAlive = true;
let gameStarted = false;
let isPaused = false;
let lastFootstepAt = 0;
let lastGroanAt = 0;
let lastHeartbeatAt = 0;
const audioSettings = {
  master: 0.6,
  sfx: 0.9,
  ambient: 0.55,
  muted: false
};
const AUDIO_SETTINGS_KEY = 'strikezone.audioSettings.v1';
const GAMEPLAY_SETTINGS_KEY = 'strikezone.gameplaySettings.v1';
const gameplaySettings = {
  sensitivity: 0.002,
  fov: 75,
  invertY: false
};
const DEFAULT_AUDIO_SETTINGS = { master: 0.6, sfx: 0.9, ambient: 0.55, muted: false };
const DEFAULT_GAMEPLAY_SETTINGS = { sensitivity: 0.002, fov: 75, invertY: false };

function clamp01(value, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(1, Math.max(0, num));
}

function loadAudioSettings() {
  try {
    const raw = localStorage.getItem(AUDIO_SETTINGS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    audioSettings.master = clamp01(parsed.master, audioSettings.master);
    audioSettings.sfx = clamp01(parsed.sfx, audioSettings.sfx);
    audioSettings.ambient = clamp01(parsed.ambient, audioSettings.ambient);
    audioSettings.muted = Boolean(parsed.muted);
  } catch {
    // Ignore invalid storage and continue with defaults.
  }
}

function saveAudioSettings() {
  try {
    localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(audioSettings));
  } catch {
    // Storage may be blocked; fail silently.
  }
}

function clampRange(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function loadGameplaySettings() {
  try {
    const raw = localStorage.getItem(GAMEPLAY_SETTINGS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    gameplaySettings.sensitivity = clampRange(parsed.sensitivity, 0.0005, 0.008, gameplaySettings.sensitivity);
    gameplaySettings.fov = clampRange(parsed.fov, 60, 110, gameplaySettings.fov);
    gameplaySettings.invertY = Boolean(parsed.invertY);
  } catch {
    // Ignore invalid storage and continue with defaults.
  }
}

function saveGameplaySettings() {
  try {
    localStorage.setItem(GAMEPLAY_SETTINGS_KEY, JSON.stringify(gameplaySettings));
  } catch {
    // Storage may be blocked; fail silently.
  }
}

function toneDataUri(frequency = 440, durationSec = 0.1, volume = 0.3) {
  const sampleRate = 22050;
  const sampleCount = Math.floor(sampleRate * durationSec);
  const channelCount = 1;
  const bitsPerSample = 16;
  const blockAlign = channelCount * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const dataSize = sampleCount * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(offset, text) {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / sampleRate;
    const env = Math.max(0, 1 - i / sampleCount);
    const sample = Math.sin(2 * Math.PI * frequency * t) * volume * env;
    view.setInt16(44 + i * 2, sample * 32767, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return `data:audio/wav;base64,${btoa(binary)}`;
}

const audio = {
  initialized: false,
  applySettings() {
    Howler.mute(audioSettings.muted);
    Howler.volume(audioSettings.master);
    if (!this.initialized) return;
    this.gun.volume(0.22 * audioSettings.sfx);
    this.step.volume(0.16 * audioSettings.sfx);
    this.hurt.volume(0.22 * audioSettings.sfx);
    this.headshot.volume(0.22 * audioSettings.sfx);
    this.groan.volume(0.13 * audioSettings.ambient);
    this.ambient.volume(0.1 * audioSettings.ambient);
    if (this.heartbeat) this.heartbeat.volume(0.4 * audioSettings.sfx);
  },
  init() {
    if (this.initialized) return;
    this.gun = new Howl({ src: [toneDataUri(180, 0.07, 0.42)], volume: 0.22 });
    this.step = new Howl({ src: [toneDataUri(95, 0.05, 0.22)], volume: 0.16 });
    this.groan = new Howl({ src: [toneDataUri(125, 0.28, 0.16)], volume: 0.13 });
    this.hurt = new Howl({ src: [toneDataUri(320, 0.12, 0.25)], volume: 0.22 });
    this.ambient = new Howl({ src: [toneDataUri(58, 0.8, 0.12)], volume: 0.1 });
    this.headshot = new Howl({ src: [toneDataUri(820, 0.07, 0.18)], volume: 0.22 });
    this.heartbeat = new Howl({ src: [toneDataUri(60, 0.15, 0.4)], volume: 0.4 });
    this.initialized = true;
    this.applySettings();
  }
};

function initAudio() {
  audio.init();
}

function syncAudioSettingsUI() {
  masterVolTextEl.textContent = `${Math.round(audioSettings.master * 100)}%`;
  sfxVolTextEl.textContent = `${Math.round(audioSettings.sfx * 100)}%`;
  ambientVolTextEl.textContent = `${Math.round(audioSettings.ambient * 100)}%`;
  masterVolEl.value = String(audioSettings.master);
  sfxVolEl.value = String(audioSettings.sfx);
  ambientVolEl.value = String(audioSettings.ambient);
  muteToggleEl.checked = audioSettings.muted;
  hudMasterVolTextEl.textContent = masterVolTextEl.textContent;
  hudSfxVolTextEl.textContent = sfxVolTextEl.textContent;
  hudAmbientVolTextEl.textContent = ambientVolTextEl.textContent;
  hudMasterVolEl.value = String(audioSettings.master);
  hudSfxVolEl.value = String(audioSettings.sfx);
  hudAmbientVolEl.value = String(audioSettings.ambient);
  hudMuteToggleEl.checked = audioSettings.muted;
}

function applyAudioSettings() {
  audio.applySettings();
  syncAudioSettingsUI();
  saveAudioSettings();
}

function syncGameplaySettingsUI() {
  const sensText = (gameplaySettings.sensitivity * 1000).toFixed(1);
  sensitivityEl.value = String(gameplaySettings.sensitivity);
  hudSensitivityEl.value = String(gameplaySettings.sensitivity);
  sensitivityTextEl.textContent = sensText;
  hudSensitivityTextEl.textContent = sensText;

  fovEl.value = String(gameplaySettings.fov);
  hudFovEl.value = String(gameplaySettings.fov);
  fovTextEl.textContent = String(gameplaySettings.fov);
  hudFovTextEl.textContent = String(gameplaySettings.fov);

  invertYEl.checked = gameplaySettings.invertY;
  hudInvertYEl.checked = gameplaySettings.invertY;
}

function applyGameplaySettings() {
  player.setLookSettings({
    sensitivity: gameplaySettings.sensitivity,
    invertY: gameplaySettings.invertY
  });
  camera.fov = gameplaySettings.fov;
  camera.updateProjectionMatrix();
  syncGameplaySettingsUI();
  saveGameplaySettings();
}

function setSensitivityPreset(value) {
  gameplaySettings.sensitivity = value;
  applyGameplaySettings();
}

function resetAllSettingsToDefaults() {
  Object.assign(audioSettings, DEFAULT_AUDIO_SETTINGS);
  Object.assign(gameplaySettings, DEFAULT_GAMEPLAY_SETTINGS);
  applyAudioSettings();
  applyGameplaySettings();
  setCenterMessage('Settings reset to defaults', 850);
}

function beginMatch() {
  gameStarted = true;
  isPaused = false;
  startMenuEl.classList.add('hidden');
  pauseOverlayEl.classList.add('hidden');
  document.body.requestPointerLock();
  initAudio();
  setCenterMessage('Survive the wave!', 1000);
}

function openPauseMenu() {
  if (!gameStarted || !isAlive) return;
  isPaused = true;
  pauseOverlayEl.classList.remove('hidden');
  hudSettingsPanel.classList.add('hidden');
  document.exitPointerLock();
}

function closePauseMenu() {
  if (!gameStarted || !isAlive) return;
  isPaused = false;
  pauseOverlayEl.classList.add('hidden');
  if (!startMenuEl.classList.contains('hidden')) return;
  if (gameOverOverlayEl.classList.contains('hidden')) {
    document.body.requestPointerLock();
  }
}

function setCenterMessage(text, ms = 800) {
  centerMessageEl.textContent = text;
  if (ms > 0) {
    setTimeout(() => {
      if (centerMessageEl.textContent === text) centerMessageEl.textContent = '';
    }, ms);
  }
}

function addKillFeed(text) {
  const row = document.createElement('div');
  row.textContent = text;
  killFeedEl.prepend(row);
  while (killFeedEl.childElementCount > 5) {
    killFeedEl.removeChild(killFeedEl.lastElementChild);
  }
}

function flashHitmarker() {
  hitmarkerEl.classList.add('show');
  setTimeout(() => hitmarkerEl.classList.remove('show'), 90);
}

function removeZombieMesh(id) {
  const zombie = zombieMeshes.get(id);
  if (!zombie) return;
  const idx = shootableObjects.indexOf(zombie.mesh);
  if (idx !== -1) shootableObjects.splice(idx, 1);
  zombie.model.dispose();
  zombieMeshes.delete(id);
}

function flashHitmarkerCritical() {
  hitmarkerEl.style.filter = 'drop-shadow(0 0 8px #ff5555)';
  hitmarkerEl.classList.add('show');
  setTimeout(() => {
    hitmarkerEl.classList.remove('show');
    hitmarkerEl.style.filter = '';
  }, 120);
}

function drawThreatHud() {
  const playerPos = camera.position;
  let nearest = null;
  let nearestDistSq = Infinity;

  radarCtx.clearRect(0, 0, radarEl.width, radarEl.height);
  radarCtx.fillStyle = 'rgba(15, 30, 20, 0.55)';
  radarCtx.fillRect(0, 0, radarEl.width, radarEl.height);
  radarCtx.strokeStyle = 'rgba(130, 185, 255, 0.25)';
  radarCtx.beginPath();
  radarCtx.arc(80, 80, 62, 0, Math.PI * 2);
  radarCtx.stroke();
  radarCtx.beginPath();
  radarCtx.moveTo(80, 10);
  radarCtx.lineTo(80, 150);
  radarCtx.moveTo(10, 80);
  radarCtx.lineTo(150, 80);
  radarCtx.stroke();

  const view = camera.getWorldDirection(new THREE.Vector3());
  const yaw = Math.atan2(view.x, view.z);
  const maxRadarDist = 38;

  for (const zombie of zombieMeshes.values()) {
    const dx = zombie.mesh.position.x - playerPos.x;
    const dz = zombie.mesh.position.z - playerPos.z;
    const distSq = dx * dx + dz * dz;
    if (distSq < nearestDistSq) {
      nearestDistSq = distSq;
      nearest = zombie;
    }

    const angle = Math.atan2(dx, dz) - yaw;
    const dist = Math.sqrt(distSq);
    const r = Math.min(62, (dist / maxRadarDist) * 62);
    const px = 80 + Math.sin(angle) * r;
    const py = 80 - Math.cos(angle) * r;
    radarCtx.fillStyle = dist < 10 ? '#ff6666' : '#ff9a66';
    radarCtx.beginPath();
    radarCtx.arc(px, py, 3, 0, Math.PI * 2);
    radarCtx.fill();
  }

  // Draw Survivors on Radar
  for (const survivor of rescueSystem.survivors) {
    const dx = survivor.mesh.position.x - playerPos.x;
    const dz = survivor.mesh.position.z - playerPos.z;
    const angle = Math.atan2(dx, dz) - yaw;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const r = Math.min(62, (dist / maxRadarDist) * 62);
    const px = 80 + Math.sin(angle) * r;
    const py = 80 - Math.cos(angle) * r;
    radarCtx.fillStyle = '#ffff00'; // Yellow for survivors
    radarCtx.beginPath();
    radarCtx.arc(px, py, 4, 0, Math.PI * 2);
    radarCtx.fill();
  }

  radarCtx.fillStyle = '#8ed0ff';
  radarCtx.beginPath();
  radarCtx.arc(80, 80, 4, 0, Math.PI * 2);
  radarCtx.fill();

  if (!nearest) {
    threatTextEl.textContent = 'THREAT: CLEAR';
    threatArrowEl.style.transform = 'rotate(0deg)';
    return;
  }

  const dx = nearest.mesh.position.x - playerPos.x;
  const dz = nearest.mesh.position.z - playerPos.z;
  const angleDeg = (Math.atan2(dx, dz) * 180) / Math.PI;
  const dist = Math.sqrt(nearestDistSq);
  threatArrowEl.style.transform = `rotate(${angleDeg}deg)`;
  const label = nearest.type ? nearest.type.toUpperCase() : 'ZOMBIE';
  if (dist < 8) threatTextEl.textContent = `THREAT: ${label} ON TOP`;
  else if (dist < 16) threatTextEl.textContent = `THREAT: ${label} CLOSE`;
  else threatTextEl.textContent = `THREAT: ${label} INCOMING`;
}

const socket = io('http://localhost:3001', {
  transports: ['websocket']
});

socket.on('welcome', ({ id, wave: serverWave }) => {
  localSocketId = id;
  wave = serverWave ?? 1;
  serverStatusEl.textContent = 'CONNECTED';
  addKillFeed('Joined match');
  setCenterMessage(`Wave ${wave} incoming...`, 1000);
});

socket.on('connect', () => {
  serverStatusEl.textContent = 'CONNECTED';
});

socket.on('disconnect', () => {
  serverStatusEl.textContent = 'DISCONNECTED';
  setCenterMessage('Connection lost', 1200);
});

socket.on('player:left', (playerId) => {
  const remote = remotePlayers.get(playerId);
  if (!remote) return;
  scene.remove(remote.mesh);
  remote.mesh.geometry.dispose();
  remote.mesh.material.dispose();
  remotePlayers.delete(playerId);
});

socket.on('players:snapshot', (players) => {
  const activeIds = new Set();
  snapshotPlayerCount = players.length;
  playersOnlineEl.textContent = `PLAYERS: ${snapshotPlayerCount}`;

  for (const netPlayer of players) {
    if (netPlayer.id === localSocketId) continue;
    activeIds.add(netPlayer.id);

    let remote = remotePlayers.get(netPlayer.id);
    if (!remote) {
      const mesh = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.35, 1.0, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x3366ff })
      );
      mesh.castShadow = true;
      scene.add(mesh);
      remote = { mesh };
      remotePlayers.set(netPlayer.id, remote);
    }

    remote.mesh.position.set(
      netPlayer.position.x,
      netPlayer.position.y - 0.8,
      netPlayer.position.z
    );
    remote.mesh.quaternion.set(
      netPlayer.quaternion.x,
      netPlayer.quaternion.y,
      netPlayer.quaternion.z,
      netPlayer.quaternion.w
    );
  }

  for (const [id, remote] of remotePlayers.entries()) {
    if (activeIds.has(id)) continue;
    scene.remove(remote.mesh);
    remote.mesh.geometry.dispose();
    remote.mesh.material.dispose();
    remotePlayers.delete(id);
  }
});

socket.on('zombies:snapshot', ({ wave: serverWave, zombies }) => {
  if (typeof serverWave === 'number' && serverWave !== wave) {
    wave = serverWave;
  }

  const activeIds = new Set();
  for (const zombieState of zombies) {
    activeIds.add(zombieState.id);
    let zombie = zombieMeshes.get(zombieState.id);
    if (!zombie) {
      const zombieType = zombieState.type || 'runner';
      const tint = zombieType === 'tank' ? 0xb8d0a2 : zombieType === 'spitter' ? 0x9ed9c4 : 0x80b05f;
      const model = new VoxelCharacter(scene, tint, zombieType === 'tank' ? 1.3 : 1.0);
      model.group.userData.zombieId = zombieState.id;
      
      zombie = { 
        model, 
        mesh: model.group, // For backward compatibility with raycasting
        type: zombieType 
      };
      zombieMeshes.set(zombieState.id, zombie);
      shootableObjects.push(model.group);
    }

    zombie.model.group.position.set(zombieState.position.x, zombieState.position.y - 0.5, zombieState.position.z);
    zombie.model.group.lookAt(camera.position.x, zombie.model.group.position.y, camera.position.z);
  }

  for (const [id] of zombieMeshes.entries()) {
    if (!activeIds.has(id)) removeZombieMesh(id);
  }
});

socket.on('zombie:dead', ({ zombieId, by, isHeadshot }) => {
  removeZombieMesh(zombieId);
  if (by === localSocketId) {
    score += isHeadshot ? 150 : 100;
    const text = isHeadshot ? 'Headshot zombie eliminated' : 'Zombie eliminated';
    addKillFeed(text);
  }
});

socket.on('wave:started', ({ wave: serverWave }) => {
  wave = serverWave;
  setCenterMessage(`Wave ${wave}`, 1200);
  addKillFeed(`Wave ${wave} started`);
  if (audio.initialized) audio.ambient.play();

  // Spawn a survivor at wave start
  const spawnPos = new THREE.Vector3(
    (Math.random() - 0.5) * 40,
    0.6,
    -20 - Math.random() * 30
  );
  rescueSystem.spawnSurvivor(spawnPos);
  addKillFeed('Survivor detected! Find them!');
});

socket.on('player:damage', ({ health: serverHealth, byType, zone, byId }) => {
  health = serverHealth;
  healthValueEl.textContent = String(health);
  damageFlashUntil = performance.now() + 140;
  
  // Trigger attack animation on the zombie that hit us
  if (byId) {
    const zombie = zombieMeshes.get(byId);
    if (zombie && zombie.model) {
      zombie.model.attack();
    }
  }

  const typeText = byType ? byType.toUpperCase() : 'ZOMBIE';
  const zoneText = zone ? ` from ${zone.toUpperCase()}` : '';
  addKillFeed(`${typeText} hit you${zoneText}`);
  if (audio.initialized) audio.hurt.play();
  if (health <= 0) {
    isAlive = false;
    isPaused = false;
    pauseOverlayEl.classList.add('hidden');
    gameOverStatsEl.textContent = `Wave ${wave} · Score ${score}`;
    gameOverOverlayEl.classList.remove('hidden');
    setCenterMessage('You were overrun!', 2000);
    setTimeout(() => setCenterMessage('Press F to respawn', 0), 700);
  }
});

socket.on('player:respawned', ({ health: serverHealth, position }) => {
  health = serverHealth;
  isAlive = true;
  gameOverOverlayEl.classList.add('hidden');
  healthValueEl.textContent = String(health);
  player.body.position.set(position.x, position.y, position.z);
  player.body.velocity.set(0, 0, 0);
  setCenterMessage('Respawned. Fight!', 1000);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initialize Player & Clock
const player = new Player(camera, world);
const clock = new THREE.Clock();
const particles = new ParticleSystem(scene);
const rescueSystem = new RescueSystem(scene, player, particles);
let rescueScore = 0;

const weapon = new Weapon(camera, scene, {
  onHit: (hit) => {
    let obj = hit.object;
    let zombieId = null;
    let zombieGroup = null;

    while (obj) {
      if (obj.userData.zombieId) {
        zombieId = obj.userData.zombieId;
        zombieGroup = obj;
        break;
      }
      obj = obj.parent;
    }

    if (zombieId) {
      // Emit Blood
      particles.emit(hit.point, 0xff0000, 15, 0.08, 0.15);
      
      const localPointY = zombieGroup.worldToLocal(hit.point.clone()).y;
      const isHeadshot = localPointY > 0.65;
      if (isHeadshot) {
        flashHitmarkerCritical();
        addKillFeed('Critical headshot');
        if (audio.initialized) audio.headshot.play();
      } else {
        flashHitmarker();
        addKillFeed('Zombie hit confirmed');
      }
      socket.emit('zombie:hit', { zombieId, isHeadshot });
      return;
    }
    // Emit Sparks
    particles.emit(hit.point, 0xffff00, 8, 0.04, 0.1);
    flashHitmarker();
    addKillFeed('You hit cover');
  },
  onAmmoChange: ({ ammo, reserveAmmo, isReloading }) => {
    ammoValueEl.textContent = isReloading ? `RELOADING... (${ammo} / ${reserveAmmo})` : `${ammo} / ${reserveAmmo}`;
  },
  onDryFire: () => {
    setCenterMessage('No ammo! Press R to reload', 650);
  },
  onShoot: () => {
    if (audio.initialized) audio.gun.play();
    player.shake(0.02);
  }
});

const rescueValueEl = document.getElementById('rescueValue');
rescueValueEl.textContent = '0';
window.addEventListener('rescue-complete', (e) => {
  rescueScore = e.detail.count;
  rescueValueEl.textContent = String(rescueScore);
  score += 500;
  setCenterMessage('SURVIVOR RESCUED! +500', 1500);
});

setCenterMessage('Waiting for server wave...', 1000);

window.addEventListener('mousedown', (event) => {
  initAudio();
  if (event.button === 0 && document.pointerLockElement === document.body) {
    if (!gameStarted) return;
    if (!isAlive) return;
    if (isPaused) return;
    weapon.shoot(shootableObjects);
  }
});

window.addEventListener('keydown', (event) => {
  initAudio();
  if (!gameStarted) return;
  if (event.code === 'Escape') {
    if (hudSettingsPanel.classList.contains('hidden') && pauseOverlayEl.classList.contains('hidden')) {
      openPauseMenu();
    } else if (!hudSettingsPanel.classList.contains('hidden')) {
      hudSettingsPanel.classList.add('hidden');
      openPauseMenu();
    } else {
      closePauseMenu();
    }
    return;
  }
  if (isPaused) return;
  if (event.code === 'KeyR') {
    if (!isAlive) return;
    weapon.reload();
  }
  if (event.code === 'KeyF' && !isAlive) {
    socket.emit('player:respawn');
  }
});

startBtn.addEventListener('click', beginMatch);
respawnBtn.addEventListener('click', () => {
  if (!isAlive) socket.emit('player:respawn');
});
resumeBtn.addEventListener('click', closePauseMenu);
pauseSettingsBtn.addEventListener('click', () => {
  pauseOverlayEl.classList.add('hidden');
  hudSettingsPanel.classList.remove('hidden');
});
exitMenuBtn.addEventListener('click', () => {
  isPaused = false;
  gameStarted = false;
  isAlive = true;
  pauseOverlayEl.classList.add('hidden');
  hudSettingsPanel.classList.add('hidden');
  gameOverOverlayEl.classList.add('hidden');
  startMenuEl.classList.remove('hidden');
  document.exitPointerLock();
  setCenterMessage('Back to menu', 800);
});
masterVolEl.addEventListener('input', (event) => {
  audioSettings.master = Number(event.target.value);
  applyAudioSettings();
});
sfxVolEl.addEventListener('input', (event) => {
  audioSettings.sfx = Number(event.target.value);
  applyAudioSettings();
});
ambientVolEl.addEventListener('input', (event) => {
  audioSettings.ambient = Number(event.target.value);
  applyAudioSettings();
});
muteToggleEl.addEventListener('change', (event) => {
  audioSettings.muted = Boolean(event.target.checked);
  applyAudioSettings();
});
sensitivityEl.addEventListener('input', (event) => {
  gameplaySettings.sensitivity = Number(event.target.value);
  applyGameplaySettings();
});
fovEl.addEventListener('input', (event) => {
  gameplaySettings.fov = Number(event.target.value);
  applyGameplaySettings();
});
invertYEl.addEventListener('change', (event) => {
  gameplaySettings.invertY = Boolean(event.target.checked);
  applyGameplaySettings();
});
hudMasterVolEl.addEventListener('input', (event) => {
  audioSettings.master = Number(event.target.value);
  applyAudioSettings();
});
hudSfxVolEl.addEventListener('input', (event) => {
  audioSettings.sfx = Number(event.target.value);
  applyAudioSettings();
});
hudAmbientVolEl.addEventListener('input', (event) => {
  audioSettings.ambient = Number(event.target.value);
  applyAudioSettings();
});
hudMuteToggleEl.addEventListener('change', (event) => {
  audioSettings.muted = Boolean(event.target.checked);
  applyAudioSettings();
});
hudSensitivityEl.addEventListener('input', (event) => {
  gameplaySettings.sensitivity = Number(event.target.value);
  applyGameplaySettings();
});
hudFovEl.addEventListener('input', (event) => {
  gameplaySettings.fov = Number(event.target.value);
  applyGameplaySettings();
});
hudInvertYEl.addEventListener('change', (event) => {
  gameplaySettings.invertY = Boolean(event.target.checked);
  applyGameplaySettings();
});
sensLowBtn.addEventListener('click', () => setSensitivityPreset(0.0012));
sensMedBtn.addEventListener('click', () => setSensitivityPreset(0.0020));
sensHighBtn.addEventListener('click', () => setSensitivityPreset(0.0035));
hudSensLowBtn.addEventListener('click', () => setSensitivityPreset(0.0012));
hudSensMedBtn.addEventListener('click', () => setSensitivityPreset(0.0020));
hudSensHighBtn.addEventListener('click', () => setSensitivityPreset(0.0035));
resetDefaultsBtn.addEventListener('click', resetAllSettingsToDefaults);
hudResetDefaultsBtn.addEventListener('click', resetAllSettingsToDefaults);
hudSettingsBtn.addEventListener('click', () => {
  const opening = hudSettingsPanel.classList.contains('hidden');
  if (opening) {
    isPaused = false;
    pauseOverlayEl.classList.add('hidden');
    hudSettingsPanel.classList.remove('hidden');
    document.exitPointerLock();
  } else {
    hudSettingsPanel.classList.add('hidden');
    if (gameStarted && isAlive) document.body.requestPointerLock();
  }
});
window.addEventListener('keydown', (event) => {
  if (event.code === 'Escape' && !hudSettingsPanel.classList.contains('hidden')) {
    hudSettingsPanel.classList.add('hidden');
  }
});
loadAudioSettings();
loadGameplaySettings();
syncAudioSettingsUI();
applyAudioSettings();
syncGameplaySettingsUI();
applyGameplaySettings();

//  Game Loop
function animate() {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();
  world.step(1 / 60, deltaTime, 3);
  particles.update();
  rescueSystem.update(deltaTime);

  // Update the player movement
  if (gameStarted && isAlive && !isPaused) {
    player.update(deltaTime);
    weapon.update(deltaTime);
  }
  for (const zombie of zombieMeshes.values()) {
    zombie.model.update(deltaTime, true);
  }

  const speed2d = Math.hypot(player.body.velocity.x, player.body.velocity.z);
  if (gameStarted && isAlive && !isPaused && speed2d > 1.0 && performance.now() - lastFootstepAt > 340) {
    if (audio.initialized) audio.step.play();
    lastFootstepAt = performance.now();
  }

  if (gameStarted && zombieMeshes.size > 0 && performance.now() - lastGroanAt > 1800) {
    if (audio.initialized) audio.groan.play();
    lastGroanAt = performance.now();
  }

  if (gameStarted && isAlive && health < 35 && performance.now() - lastHeartbeatAt > 1000) {
    if (audio.initialized) audio.heartbeat.play();
    lastHeartbeatAt = performance.now();
    player.shake(0.015);
  }

  if (performance.now() < damageFlashUntil) {
    renderer.domElement.style.filter = 'saturate(0.5) brightness(0.6) sepia(0.3) hue-rotate(-20deg)';
  } else if (health < 35) {
    renderer.domElement.style.filter = `saturate(0.7) brightness(0.8) sepia(${(35 - health) / 70})`;
  } else {
    renderer.domElement.style.filter = 'none';
  }

  if (socket.connected && gameStarted && !isPaused) {
    playersOnlineEl.textContent = `PLAYERS: ${snapshotPlayerCount}  SCORE: ${score}`;
    socket.emit('player:update', {
      position: {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z
      },
      quaternion: {
        x: camera.quaternion.x,
        y: camera.quaternion.y,
        z: camera.quaternion.z,
        w: camera.quaternion.w
      }
    });
  }

  drawThreatHud();

  renderer.render(scene, camera);
}

animate();