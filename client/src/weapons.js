import * as THREE from 'three';

export class Weapon {
  constructor(camera, scene, options = {}) {
    this.camera = camera;
    this.scene = scene;
    this.raycaster = new THREE.Raycaster();
    this.onHit = options.onHit || (() => {});
    this.onAmmoChange = options.onAmmoChange || (() => {});
    this.onDryFire = options.onDryFire || (() => {});
    this.onShoot = options.onShoot || (() => {});

    this.magazineSize = 30;
    this.ammo = this.magazineSize;
    this.reserveAmmo = 90;
    this.reloadTimeMs = 1300;
    this.fireCooldownMs = 95;
    this.lastShotTime = 0;
    this.isReloading = false;

    // Voxel Rifle Model
    this.group = new THREE.Group();
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9, metalness: 0.4 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.8 });

    // Stock
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.25, 0.45), woodMat);
    stock.position.set(0, 0, 0.2);
    this.group.add(stock);

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.8), gunMat);
    body.position.set(0, 0.1, -0.2);
    this.group.add(body);

    // Barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 8), gunMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.15, -0.9);
    this.group.add(barrel);

    // Grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.25, 0.15), gunMat);
    grip.position.set(0, -0.15, -0.1);
    grip.rotation.x = -0.3;
    this.group.add(grip);

    // Scope/Iron Sights
    const scope = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.2), gunMat);
    scope.position.set(0, 0.25, -0.3);
    this.group.add(scope);

    this.group.position.set(0.25, -0.35, -0.6);
    this.group.rotation.y = Math.PI;

    this.muzzleFlash = new THREE.PointLight(0xffaa55, 0, 4, 2);
    this.muzzleFlash.position.set(0, 0.15, -1.4);
    this.group.add(this.muzzleFlash);

    this.camera.add(this.group);
    this.emitAmmo();
  }

  update(deltaTime) {
    // Breathing/Sway animation
    const time = performance.now() * 0.001;
    this.group.position.y = -0.35 + Math.sin(time * 2) * 0.005;
    this.group.position.x = 0.25 + Math.cos(time) * 0.003;
  }

  emitAmmo() {
    this.onAmmoChange({
      ammo: this.ammo,
      reserveAmmo: this.reserveAmmo,
      isReloading: this.isReloading
    });
  }

  async reload() {
    if (this.isReloading || this.ammo === this.magazineSize || this.reserveAmmo <= 0) return;
    this.isReloading = true;
    this.emitAmmo();

    await new Promise((resolve) => setTimeout(resolve, this.reloadTimeMs));

    const needed = this.magazineSize - this.ammo;
    const moved = Math.min(needed, this.reserveAmmo);
    this.ammo += moved;
    this.reserveAmmo -= moved;
    this.isReloading = false;
    this.emitAmmo();
  }

  shoot(shootableObjects) {
    const now = performance.now();
    if (this.isReloading || now - this.lastShotTime < this.fireCooldownMs) return;
    this.lastShotTime = now;

    if (this.ammo <= 0) {
      this.onDryFire();
      return;
    }

    this.ammo -= 1;
    this.emitAmmo();
    this.onShoot();

    this.muzzleFlash.intensity = 5.0;
    this.group.position.z += 0.15; // Recoil back
    this.group.rotation.x -= 0.1; // Recoil up
    
    setTimeout(() => {
      this.muzzleFlash.intensity = 0;
      this.group.position.z -= 0.15;
      this.group.rotation.x += 0.1;
    }, 45);

    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

    const intersects = this.raycaster.intersectObjects(shootableObjects);

    if (intersects.length > 0) {
      this.onHit(intersects[0]);
    }
  }
}