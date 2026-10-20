import * as THREE from "three";

// Minimal first-person "walk/fly" controller written for this demo.
// - Desktop: WASD / arrows move, hold left mouse to look, Q/E down/up, Shift sprint, L pointer lock.
// - Touch: virtual joystick (element) moves, single-finger drag elsewhere looks, pinch changes speed.
// Movement is frame-time based with exponential acceleration/deceleration and clamped to a box.
export class WalkControls {
  constructor(camera, canvas, joystickEl, { onSpeedChange } = {}) {
    this.camera = camera;
    this.canvas = canvas;
    this.joy = joystickEl;
    this.knob = joystickEl.querySelector(".joy-knob");
    this.onSpeedChange = onSpeedChange;
    this.enabled = false;
    this.yaw = 0;
    this.pitch = 0;
    this.velocity = new THREE.Vector3();
    this.speed = 2.5; // units/s, set per scene
    this.speedMul = 1;
    this.bounds = null; // {min:[x,y,z], max:[x,y,z]}
    this.keys = new Set();
    this.joyVec = { x: 0, y: 0 };
    this.lookPointers = new Map();
    this.pinchStart = null;
    this.mouseDrag = null;

    this._onKeyDown = (e) => {
      if (!this.enabled || e.target?.tagName === "INPUT") return;
      if (e.code === "KeyL") { this.togglePointerLock(); return; }
      if (MOVE_KEYS.has(e.code)) { this.keys.add(e.code); e.preventDefault(); }
    };
    this._onKeyUp = (e) => this.keys.delete(e.code);
    this._onBlur = () => { this.keys.clear(); this.joyVec = { x: 0, y: 0 }; this.mouseDrag = null; };
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("blur", this._onBlur);

    // ----- look: mouse drag / touch drag / pinch on the canvas -----
    canvas.addEventListener("pointerdown", (e) => {
      if (!this.enabled) return;
      if (e.pointerType === "mouse") {
        if (e.button !== 0) return;
        this.mouseDrag = { x: e.clientX, y: e.clientY };
      } else {
        this.lookPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.lookPointers.size === 2) this.pinchStart = { d: this._pinchDist(), mul: this.speedMul };
      }
      canvas.setPointerCapture?.(e.pointerId);
      e.preventDefault();
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!this.enabled) return;
      if (e.pointerType === "mouse") {
        if (document.pointerLockElement === canvas) { this._look(e.movementX, e.movementY, 0.0022); return; }
        if (!this.mouseDrag) return;
        this._look(e.clientX - this.mouseDrag.x, e.clientY - this.mouseDrag.y, 0.0035);
        this.mouseDrag = { x: e.clientX, y: e.clientY };
        return;
      }
      const p = this.lookPointers.get(e.pointerId);
      if (!p) return;
      if (this.lookPointers.size === 1) this._look(e.clientX - p.x, e.clientY - p.y, 0.005);
      p.x = e.clientX; p.y = e.clientY;
      if (this.lookPointers.size === 2 && this.pinchStart) {
        const ratio = this._pinchDist() / Math.max(1, this.pinchStart.d);
        this.setSpeedMul(this.pinchStart.mul * ratio);
      }
    });
    const end = (e) => {
      if (e.pointerType === "mouse") this.mouseDrag = null;
      this.lookPointers.delete(e.pointerId);
      if (this.lookPointers.size < 2) this.pinchStart = null;
    };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);

    // ----- joystick -----
    let joyId = null, center = null;
    const R = () => this.joy.clientWidth / 2;
    const setKnob = (dx, dy) => { this.knob.style.transform = `translate(${dx}px, ${dy}px)`; };
    this.joy.addEventListener("pointerdown", (e) => {
      if (!this.enabled || joyId !== null) return;
      joyId = e.pointerId;
      const r = this.joy.getBoundingClientRect();
      center = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      this.joy.setPointerCapture?.(e.pointerId);
      moveJoy(e);
      e.preventDefault();
      e.stopPropagation();
    });
    const moveJoy = (e) => {
      if (e.pointerId !== joyId) return;
      let dx = e.clientX - center.x, dy = e.clientY - center.y;
      const max = R() * 0.6, len = Math.hypot(dx, dy);
      if (len > max) { dx *= max / len; dy *= max / len; }
      setKnob(dx, dy);
      // small dead zone
      const nx = dx / max, ny = dy / max;
      const m = Math.hypot(nx, ny);
      this.joyVec = m < 0.12 ? { x: 0, y: 0 } : { x: nx, y: ny };
    };
    this.joy.addEventListener("pointermove", moveJoy);
    const endJoy = (e) => {
      if (e.pointerId !== joyId) return;
      joyId = null; this.joyVec = { x: 0, y: 0 }; setKnob(0, 0);
    };
    this.joy.addEventListener("pointerup", endJoy);
    this.joy.addEventListener("pointercancel", endJoy);
  }

  _pinchDist() {
    const [a, b] = [...this.lookPointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  _look(dx, dy, sens) {
    this.yaw -= dx * sens;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * sens, -1.45, 1.45);
  }

  setSpeedMul(m) {
    this.speedMul = THREE.MathUtils.clamp(m, 0.3, 4);
    this.onSpeedChange?.(this.speedMul);
  }

  togglePointerLock() {
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    else this.canvas.requestPointerLock?.();
  }

  setEnabled(on) {
    this.enabled = on;
    if (!on) {
      this._onBlur();
      this.velocity.set(0, 0, 0);
      if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    }
  }

  setScene({ bounds, speed }) {
    this.bounds = bounds;
    this.speed = speed || 2.5;
  }

  // Adopt the camera's current position/orientation (e.g. when switching from orbit).
  syncFromCamera() {
    const e = new THREE.Euler().setFromQuaternion(this.camera.quaternion, "YXZ");
    this.yaw = e.y;
    this.pitch = THREE.MathUtils.clamp(e.x, -1.45, 1.45);
    this.velocity.set(0, 0, 0);
    this.clamp();
    this.apply();
  }

  clamp() {
    if (!this.bounds) return;
    const p = this.camera.position, { min, max } = this.bounds;
    const axes = ["x", "y", "z"];
    axes.forEach((a, i) => {
      if (p[a] < min[i]) { p[a] = min[i]; if (this.velocity[a] < 0) this.velocity[a] = 0; }
      if (p[a] > max[i]) { p[a] = max[i]; if (this.velocity[a] > 0) this.velocity[a] = 0; }
    });
  }

  apply() {
    this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
  }

  input() {
    const k = this.keys;
    let f = 0, s = 0, u = 0;
    if (k.has("KeyW") || k.has("ArrowUp")) f += 1;
    if (k.has("KeyS") || k.has("ArrowDown")) f -= 1;
    if (k.has("KeyD") || k.has("ArrowRight")) s += 1;
    if (k.has("KeyA") || k.has("ArrowLeft")) s -= 1;
    if (k.has("KeyE")) u += 1;
    if (k.has("KeyQ")) u -= 1;
    f -= this.joyVec.y;
    s += this.joyVec.x;
    const sprint = k.has("ShiftLeft") || k.has("ShiftRight");
    return { f, s, u, sprint };
  }

  update(dt) {
    if (!this.enabled) return;
    dt = Math.min(dt, 0.25); // avoid big jumps after tab switches / stalls
    const { f, s, u, sprint } = this.input();
    // Horizontal movement follows yaw only, so W never changes height.
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const wish = new THREE.Vector3().addScaledVector(fwd, f).addScaledVector(right, s);
    if (wish.lengthSq() > 1) wish.normalize();
    wish.y = THREE.MathUtils.clamp(u, -1, 1) * 0.6;
    wish.multiplyScalar(this.speed * this.speedMul * (sprint ? 2.5 : 1));
    // Inertia: accelerate a bit faster than we brake.
    const rate = wish.lengthSq() > 0 ? 7 : 5;
    this.velocity.lerp(wish, 1 - Math.exp(-rate * dt));
    if (this.velocity.lengthSq() < 1e-6 && wish.lengthSq() === 0) this.velocity.set(0, 0, 0);
    this.camera.position.addScaledVector(this.velocity, dt);
    this.clamp();
    this.apply();
  }
}

const MOVE_KEYS = new Set([
  "KeyW", "KeyA", "KeyS", "KeyD", "KeyQ", "KeyE", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ShiftLeft", "ShiftRight",
]);
