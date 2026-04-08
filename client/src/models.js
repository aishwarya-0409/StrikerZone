import * as THREE from 'three';

export class VoxelCharacter {
  constructor(scene, color = 0x80b05f, scale = 1.0) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.parts = {};
    this.color = color;
    this.scale = scale;
    this.walkPhase = Math.random() * Math.PI * 2;
    this.isAttacking = false;
    this.attackPhase = 0;

    this.init();
  }

  init() {
    const mat = new THREE.MeshStandardMaterial({ color: this.color, roughness: 0.8 });

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.25), mat);
    torso.position.y = 1.0;
    torso.castShadow = true;
    this.group.add(torso);
    this.parts.torso = torso;

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), mat);
    head.position.y = 0.5; // Relative to torso
    torso.add(head);
    this.parts.head = head;

    // Head eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    if (this.color === 0xffff00) eyeMat.color.set(0x000000); // Black eyes for survivors
    
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.05), eyeMat);
    eyeL.position.set(-0.1, 0.05, 0.18);
    head.add(eyeL);
    
    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.05), eyeMat);
    eyeR.position.set(0.1, 0.05, 0.18);
    head.add(eyeR);

    // Arms
    this.parts.armL = this.createLimb(0.15, 0.5, mat);
    this.parts.armL.position.set(-0.33, 0.2, 0);
    torso.add(this.parts.armL);

    this.parts.armR = this.createLimb(0.15, 0.5, mat);
    this.parts.armR.position.set(0.33, 0.2, 0);
    torso.add(this.parts.armR);

    // Legs
    this.parts.legL = this.createLimb(0.18, 0.6, mat);
    this.parts.legL.position.set(-0.15, -0.3, 0);
    torso.add(this.parts.legL);

    this.parts.legR = this.createLimb(0.18, 0.6, mat);
    this.parts.legR.position.set(0.15, -0.3, 0);
    torso.add(this.parts.legR);

    this.group.scale.setScalar(this.scale);
    this.scene.add(this.group);
  }

  createLimb(w, h, mat) {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat);
    mesh.position.y = -h / 2; // Move pivot to top
    mesh.castShadow = true;
    group.add(mesh);
    return group;
  }

  update(deltaTime, isMoving = true) {
    if (isMoving) {
      this.walkPhase += deltaTime * 8;
      const angle = Math.sin(this.walkPhase) * 0.5;
      
      // Walking animation
      this.parts.legL.rotation.x = angle;
      this.parts.legR.rotation.x = -angle;
      this.parts.armL.rotation.x = -angle * 0.8;
      this.parts.armR.rotation.x = angle * 0.8;
      
      this.parts.torso.position.y = 1.0 + Math.abs(Math.cos(this.walkPhase * 2)) * 0.05;
    } else {
        // Idle breathing
        const idle = Math.sin(performance.now() * 0.002) * 0.05;
        this.parts.armL.rotation.x = 0.1 + idle;
        this.parts.armR.rotation.x = 0.1 + idle;
    }

    if (this.isAttacking) {
      this.attackPhase += deltaTime * 10;
      this.parts.armL.rotation.x = -1.2 + Math.sin(this.attackPhase * 4) * 0.2;
      this.parts.armR.rotation.x = -1.2 + Math.sin(this.attackPhase * 4) * 0.2;
      
      if (this.attackPhase > Math.PI) {
        this.isAttacking = false;
        this.attackPhase = 0;
      }
    }
  }

  attack() {
    this.isAttacking = true;
    this.attackPhase = 0;
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            else obj.material.dispose();
        }
    });
  }
}
