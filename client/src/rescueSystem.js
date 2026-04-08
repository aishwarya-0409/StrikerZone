import * as THREE from 'three';
import { VoxelCharacter } from './models.js';

export class RescueSystem {
  constructor(scene, player, particles) {
    this.scene = scene;
    this.player = player;
    this.particles = particles;
    this.survivors = [];
    this.rescueZone = null;
    this.rescueCount = 0;
    this.setupRescueZone();
  }

  setupRescueZone() {
    const geo = new THREE.CylinderGeometry(4, 4, 0.2, 32);
    const mat = new THREE.MeshStandardMaterial({ 
      color: 0x00ff00, 
      transparent: true, 
      opacity: 0.3,
      emissive: 0x00ff00,
      emissiveIntensity: 0.5
    });
    this.rescueZone = new THREE.Mesh(geo, mat);
    this.rescueZone.position.set(0, 0.1, 0); // Near spawn
    this.scene.add(this.rescueZone);

    // Zone Marker (Light)
    const light = new THREE.PointLight(0x00ff00, 5, 10);
    light.position.set(0, 2, 0);
    this.scene.add(light);
  }

  spawnSurvivor(position) {
    const model = new VoxelCharacter(this.scene, 0xffff00, 0.9); // Yellow for survivors
    model.group.position.copy(position);
    model.group.position.y -= 0.5;

    const survivor = {
      model,
      mesh: model.group,
      state: 'idle', // 'idle' or 'following'
      speed: 5.5
    };
    this.survivors.push(survivor);
    return survivor;
  }

  update(deltaTime) {
    const playerPos = this.player.camera.position;

    for (let i = this.survivors.length - 1; i >= 0; i--) {
      const s = this.survivors[i];
      const distToPlayer = s.mesh.position.distanceTo(playerPos);

      if (s.state === 'idle' && distToPlayer < 5) {
        s.state = 'following';
        this.particles.emit(s.mesh.position, 0x00ff00, 20, 0.1, 0.2); // Green sparkle on rescue start
      }

      if (s.state === 'following') {
        const dir = new THREE.Vector3().subVectors(playerPos, s.mesh.position);
        dir.y = 0;
        const dist = dir.length();
        const isMoving = dist > 2;

        if (isMoving) {
          dir.normalize();
          s.mesh.position.addScaledVector(dir, s.speed * deltaTime);
          s.mesh.lookAt(playerPos.x, s.mesh.position.y, playerPos.z);
        }
        
        s.model.update(deltaTime, isMoving);

        // Check for Rescue Zone
        const distToZone = s.mesh.position.distanceTo(this.rescueZone.position);
        if (distToZone < 4) {
          this.completeRescue(i);
        }
      } else {
        s.model.update(deltaTime, false);
      }
    }
  }

  completeRescue(index) {
    const s = this.survivors[index];
    this.particles.emit(s.mesh.position, 0x00ff00, 50, 0.15, 0.4);
    s.model.dispose();
    this.survivors.splice(index, 1);
    this.rescueCount++;
    
    // Dispatch custom event for UI updates
    window.dispatchEvent(new CustomEvent('rescue-complete', { detail: { count: this.rescueCount } }));
  }
}
