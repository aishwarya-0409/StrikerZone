import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Player {
  constructor(camera, world) {
    this.camera = camera;
    this.world = world;

    // Movement settings
    this.speed = 7.0;
    this.jumpSpeed = 5.8;
    this.keys = { KeyW: false, KeyA: false, KeyS: false, KeyD: false };
    this.canJump = false;
    this.lookSensitivity = 0.002;
    this.invertY = false;

    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.PI_2 = Math.PI / 2;

    // Physics body for gravity and collision.
    this.body = new CANNON.Body({
      mass: 70,
      shape: new CANNON.Sphere(0.4),
      position: new CANNON.Vec3(0, 1.6, 0),
      linearDamping: 0.1
    });
    this.body.fixedRotation = true;
    this.body.updateMassProperties();
    this.world.addBody(this.body);

    this.body.addEventListener('collide', (event) => {
      const contact = event.contact;
      const normal = new CANNON.Vec3();
      if (contact.bi.id === this.body.id) {
        contact.ni.negate(normal);
      } else {
        normal.copy(contact.ni);
      }

      // If collision normal points up, treat as grounded.
      if (normal.y > 0.5) {
        this.canJump = true;
      }
    });

    this.setupInputs();
  }

  setupInputs() {
    // Lock the mouse cursor to the game when clicking
    document.body.addEventListener('click', () => {
      document.body.requestPointerLock();
    });

    //  Mouse Look (Aiming)
    document.addEventListener('mousemove', (event) => {
      
      if (document.pointerLockElement === document.body) {
        this.euler.setFromQuaternion(this.camera.quaternion);
        
        
        this.euler.y -= event.movementX * this.lookSensitivity;
        const pitchDelta = event.movementY * this.lookSensitivity * (this.invertY ? -1 : 1);
        this.euler.x -= pitchDelta;
      
        this.euler.x = Math.max(-this.PI_2, Math.min(this.PI_2, this.euler.x));
        
        this.camera.quaternion.setFromEuler(this.euler);
      }
    });

    //  Keyboard (WASD)
    document.addEventListener('keydown', (event) => {
      if (this.keys.hasOwnProperty(event.code)) this.keys[event.code] = true;
      if (event.code === 'Space' && this.canJump) {
        this.body.velocity.y = this.jumpSpeed;
        this.canJump = false;
      }
    });

    document.addEventListener('keyup', (event) => {
      if (this.keys.hasOwnProperty(event.code)) this.keys[event.code] = false;
    });
  }

  update(deltaTime) {
    const direction = new THREE.Vector3();

    const frontVector = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    frontVector.y = 0;
    frontVector.normalize();

    const sideVector = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    sideVector.y = 0;
    sideVector.normalize();

    // Adding inputs
    if (this.keys.KeyW) direction.add(frontVector);
    if (this.keys.KeyS) direction.sub(frontVector);
    if (this.keys.KeyA) direction.sub(sideVector);
    if (this.keys.KeyD) direction.add(sideVector);

    if (direction.lengthSq() > 0) {
      direction.normalize();
      this.body.velocity.x = direction.x * this.speed;
      this.body.velocity.z = direction.z * this.speed;
    } else {
      this.body.velocity.x = 0;
      this.body.velocity.z = 0;
    }

    this.camera.position.set(this.body.position.x, this.body.position.y, this.body.position.z);
  }

  setLookSettings({ sensitivity, invertY }) {
    if (typeof sensitivity === 'number' && Number.isFinite(sensitivity)) {
      this.lookSensitivity = Math.max(0.0005, Math.min(0.01, sensitivity));
    }
    if (typeof invertY === 'boolean') {
      this.invertY = invertY;
    }
  }
}