import { createServer } from 'node:http';
import { Server } from 'socket.io';

const PORT = process.env.PORT || 3001;
const TICK_RATE_MS = 50; // 20 updates per second 
const MAP_RADIUS = 36;
const BASE_WAVE_SIZE = 4;
const MAX_ZOMBIES = 24;

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*'
  }
});

const players = new Map();
const zombies = new Map();
let zombieIdCounter = 1;
let wave = 1;
let spawnTimerMs = 0;
const SPAWN_ZONES = [
  { name: 'north', x: 0, z: -1 },
  { name: 'east', x: 1, z: 0 },
  { name: 'south', x: 0, z: 1 },
  { name: 'west', x: -1, z: 0 }
];

function getSpawnPoint(zone) {
  const radius = 24 + Math.random() * 12;
  const spread = (Math.random() - 0.5) * 0.55;
  const baseAngle = Math.atan2(zone.z, zone.x);
  const angle = baseAngle + spread;
  return { x: Math.cos(angle) * radius, y: 0.95, z: Math.sin(angle) * radius };
}

function pickZombieType() {
  const roll = Math.random();
  if (wave >= 4 && roll < 0.2) return 'tank';
  if (wave >= 3 && roll < 0.45) return 'spitter';
  return 'runner';
}

function spawnZombie() {
  const id = `z_${zombieIdCounter++}`;
  const zone = SPAWN_ZONES[Math.floor(Math.random() * SPAWN_ZONES.length)];
  const type = pickZombieType();
  let hp = 100;
  let speed = 1.0;
  let damage = 7;
  let attackRange = 1.7;

  if (type === 'runner') {
    hp = 85 + wave * 4;
    speed = 1.45 + wave * 0.12 + Math.random() * 0.25;
    damage = 6;
    attackRange = 1.7;
  } else if (type === 'tank') {
    hp = 210 + wave * 12;
    speed = 0.72 + wave * 0.06;
    damage = 12;
    attackRange = 1.95;
  } else if (type === 'spitter') {
    hp = 115 + wave * 6;
    speed = 0.95 + wave * 0.08;
    damage = 9;
    attackRange = 5.6;
  }

  const position = getSpawnPoint(zone);
  zombies.set(id, {
    id,
    type,
    zone: zone.name,
    position,
    hp,
    speed,
    damage,
    attackRange,
    attackCooldown: 0
  });
}

function nearestPlayer(position) {
  let target = null;
  let bestDist = Infinity;
  for (const player of players.values()) {
    if (player.health <= 0) continue;
    const dx = player.position.x - position.x;
    const dz = player.position.z - position.z;
    const distSq = dx * dx + dz * dz;
    if (distSq < bestDist) {
      bestDist = distSq;
      target = player;
    }
  }
  return target;
}

function clampMap(position) {
  const mag = Math.hypot(position.x, position.z);
  if (mag > MAP_RADIUS) {
    position.x = (position.x / mag) * MAP_RADIUS;
    position.z = (position.z / mag) * MAP_RADIUS;
  }
}

io.on('connection', (socket) => {
  players.set(socket.id, {
    id: socket.id,
    position: { x: 0, y: 1.6, z: 0 },
    quaternion: { x: 0, y: 0, z: 0, w: 1 },
    health: 100
  });

  socket.emit('welcome', { id: socket.id, wave });

  socket.on('player:update', (state) => {
    const player = players.get(socket.id);
    if (!player) return;
    if (!state?.position || !state?.quaternion) return;

    player.position = state.position;
    player.quaternion = state.quaternion;
    clampMap(player.position);
  });

  socket.on('player:respawn', () => {
    const player = players.get(socket.id);
    if (!player) return;
    player.health = 100;
    player.position = { x: 0, y: 1.6, z: 0 };
    player.quaternion = { x: 0, y: 0, z: 0, w: 1 };
    socket.emit('player:respawned', { health: player.health, position: player.position });
  });

  socket.on('zombie:hit', ({ zombieId, isHeadshot }) => {
    const zombie = zombies.get(zombieId);
    if (!zombie) return;

    zombie.hp -= isHeadshot ? 80 : 38;
    if (zombie.hp <= 0) {
      zombies.delete(zombieId);
      io.emit('zombie:dead', { zombieId, by: socket.id, isHeadshot: Boolean(isHeadshot) });
      if (zombies.size === 0) {
        wave += 1;
        io.emit('wave:started', { wave });
      }
    }
  });

  socket.on('disconnect', () => {
    players.delete(socket.id);
    io.emit('player:left', socket.id);
  });
});

setInterval(() => {
  // Server-side zombie AI update
  for (const zombie of zombies.values()) {
    const target = nearestPlayer(zombie.position);
    if (!target) continue;

    const dx = target.position.x - zombie.position.x;
    const dz = target.position.z - zombie.position.z;
    const dist = Math.hypot(dx, dz);

    if (dist > zombie.attackRange) {
      const inv = 1 / Math.max(dist, 0.0001);
      zombie.position.x += dx * inv * zombie.speed * (TICK_RATE_MS / 1000);
      zombie.position.z += dz * inv * zombie.speed * (TICK_RATE_MS / 1000);
      clampMap(zombie.position);
    } else if (zombie.attackCooldown <= 0) {
      target.health = Math.max(0, target.health - zombie.damage);
      io.to(target.id).emit('player:damage', { health: target.health, byType: zombie.type, zone: zombie.zone });
      zombie.attackCooldown = 850;
    }

    zombie.attackCooldown = Math.max(0, zombie.attackCooldown - TICK_RATE_MS);
  }

  // Wave-aware spawning
  const wantedZombies = Math.min(BASE_WAVE_SIZE + wave * 2, MAX_ZOMBIES);
  spawnTimerMs -= TICK_RATE_MS;
  if (players.size > 0 && zombies.size < wantedZombies && spawnTimerMs <= 0) {
    spawnZombie();
    spawnTimerMs = Math.max(350, 1100 - wave * 45);
  }

  io.emit('players:snapshot', Array.from(players.values()));
  io.emit('zombies:snapshot', { wave, zombies: Array.from(zombies.values()) });
}, TICK_RATE_MS);

httpServer.listen(PORT, () => {
  console.log(`StrikeZone server running on http://localhost:${PORT}`);
});
