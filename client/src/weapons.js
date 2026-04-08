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

    const gunGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.4);
    const gunMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    this.mesh = new THREE.Mesh(gunGeometry, gunMaterial);

    this.mesh.position.set(0.2, -0.2, -0.5);

    this.muzzleFlash = new THREE.PointLight(0xffaa55, 0, 2.5, 2);
    this.muzzleFlash.position.set(0.05, 0.02, -0.25);
    this.mesh.add(this.muzzleFlash);

    this.camera.add(this.mesh);
    this.emitAmmo();
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

    this.muzzleFlash.intensity = 2.2;
    setTimeout(() => {
      this.muzzleFlash.intensity = 0;
    }, 35);

    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

    const intersects = this.raycaster.intersectObjects(shootableObjects);

    if (intersects.length > 0) {
      this.onHit(intersects[0]);
    }
  }
}