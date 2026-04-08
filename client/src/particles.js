import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
  }

  emit(position, color, count = 18, size = 0.12, speed = 0.2) {
    for (let i = 0; i < count; i++) {
        const geometry = new THREE.BoxGeometry(size, size, size);
        const material = new THREE.MeshBasicMaterial({ color: color });
        const mesh = new THREE.Mesh(geometry, material);
        
        mesh.position.copy(position);
        
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * speed,
            (Math.random() + 0.5) * speed, // Upwards bias
            (Math.random() - 0.5) * speed
        );

        this.particles.push({
            mesh: mesh,
            velocity: velocity,
            life: 1.0,
            decay: 0.02 + Math.random() * 0.05
        });

        this.scene.add(mesh);
    }
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.mesh.position.add(p.velocity);
        p.velocity.y -= 0.005; // Gravity
        p.life -= p.decay;
        p.mesh.scale.setScalar(p.life);

        if (p.life <= 0) {
            this.scene.remove(p.mesh);
            p.mesh.geometry.dispose();
            p.mesh.material.dispose();
            this.particles.splice(i, 1);
        }
    }
  }
}
