import * as THREE from 'three';
import { sound } from '../audio/SoundEngine.js';

export class PenPhysicsObject {
  constructor(mesh, data = {}) {
    this.mesh = mesh;
    this.id = data.id || 'pen';
    this.owner = data.owner || 'player1'; // 'player1', 'player2', 'ai', 'target'

    this.length = data.length || 1.45;
    this.radius = data.radius || 0.045;
    this.halfLength = this.length / 2;

    const stats = data.stats || {};
    this.mass = (stats.mass || 1.0) * 0.85;

    // Wood sliding friction & spin damping (Natural, velocity-proportional deceleration)
    this.frictionDecelRate = 2.35; // Friction deceleration rate (1/s)
    this.spinDecelRate = 2.65;     // Angular spin deceleration rate (1/s)

    this.spinEase = stats.spin || 1.0;
    this.knockbackMult = stats.knockback || 1.0;

    // Moment of inertia: I = 1/12 * m * L^2
    this.inertia = (1 / 12) * this.mass * Math.pow(this.length, 2) * (1.1 / this.spinEase);

    // State
    this.pos = new THREE.Vector2(0, 0); // (X, Z) on desk
    this.angle = 0; // Rotation around Y axis in radians
    this.vel = new THREE.Vector2(0, 0);
    this.angVel = 0;
    this.usedAutoLock = false;

    // 3D Visual & Airborne State
    this.heightY = this.radius;
    this.rotX = 0;
    this.rotZ = 0;
    this.isWobbling = false;
    this.wobbleTime = 0;
    this.wobbleIntensity = 0;

    this.isFalling = false;
    this.isAirborneJump = false;
    this.hasFallenOff = false;
    this.fallVelocity = new THREE.Vector3(0, 0, 0);
    this.fallRotVel = new THREE.Vector3(0, 0, 0);

    this.sleepThreshold = 0.008;
    this.isSleeping = true;
  }

  setPosition(x, z, angle = 0) {
    this.pos.set(x, z);
    this.angle = angle;
    this.vel.set(0, 0);
    this.angVel = 0;
    this.usedAutoLock = false;
    this.heightY = this.radius;
    this.rotX = 0;
    this.rotZ = 0;
    this.isWobbling = false;
    this.wobbleTime = 0;
    this.isFalling = false;
    this.isAirborneJump = false;
    this.hasFallenOff = false;
    this.isSleeping = true;
    this.updateMeshTransform();
  }

  getEndpoints() {
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);

    const dirX = sin;
    const dirZ = cos;

    const tip = new THREE.Vector2(
      this.pos.x + dirX * this.halfLength,
      this.pos.y + dirZ * this.halfLength
    );

    const tail = new THREE.Vector2(
      this.pos.x - dirX * this.halfLength,
      this.pos.y - dirZ * this.halfLength
    );

    return { tip, tail, dir: new THREE.Vector2(dirX, dirZ) };
  }

  applyFlick(forceDir, power, hitOffset = -0.75, usedAutoLock = false) {
    this.usedAutoLock = !!usedAutoLock;
    // Power scale:
    // 0.25 (Soft Tap)   -> force ~ 4.1
    // 0.60 (Yellow Med) -> force ~ 7.8 (Smooth, responsive slide & solid push)
    // 0.95 (Red Smash)  -> force ~ 11.5 (Explosive knockout punch)
    const forceMagnitude = (power * 10.5 + 1.5) * (1 / this.mass);
    const clampedOffset = Math.max(-0.95, Math.min(0.95, hitOffset));
    const hitDist = clampedOffset * this.halfLength;

    const { dir } = this.getEndpoints();
    const rx = dir.x * hitDist;
    const rz = dir.y * hitDist;

    const fx = forceDir.x * forceMagnitude;
    const fz = forceDir.y * forceMagnitude;

    this.vel.x += fx;
    this.vel.y += fz;

    const torque = rx * fz - rz * fx;
    this.angVel += (torque / this.inertia) * 0.95;

    this.isSleeping = false;
    this.isWobbling = false;
    sound.playFlick(power);
  }

  // 3D Airborne Jump: Pen ramps over opponent and flies over the table into the floor!
  launchAirborneJump(forwardVel, lift = 4.5) {
    if (this.isFalling) return;
    this.isFalling = true;
    this.isAirborneJump = true;
    this.isSleeping = false;
    this.isWobbling = false;

    this.fallVelocity.set(
      forwardVel.x * 0.88,
      lift,
      forwardVel.y * 0.88
    );

    this.fallRotVel.set(
      (Math.random() - 0.5) * 14,
      12.0 * (Math.random() > 0.5 ? 1 : -1),
      (Math.random() - 0.5) * 14
    );

    sound.playFlick(1.0);
  }

  update(dt, deskBounds) {
    if (this.isFalling) {
      this.updateFallPhysics(dt);
      return;
    }

    if (this.isWobbling) {
      this.updateWobble(dt, deskBounds);
    }

    if (this.isSleeping) return;

    // Integrate linear motion
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;

    // Integrate angular motion
    this.angle += this.angVel * dt;

    // Natural wood sliding friction deceleration
    const speedDamping = Math.max(0, 1 - this.frictionDecelRate * dt);
    this.vel.multiplyScalar(speedDamping);

    const spinDamping = Math.max(0, 1 - this.spinDecelRate * dt);
    this.angVel *= spinDamping;

    // Check if motion has settled
    const speedSq = this.vel.lengthSq();
    const spinSq = this.angVel * this.angVel;

    if (speedSq < this.sleepThreshold * this.sleepThreshold && spinSq < 0.02) {
      this.vel.set(0, 0);
      this.angVel = 0;
      this.usedAutoLock = false;
      if (!this.isWobbling) {
        this.isSleeping = true;
      }
    }

    // Check desk edge overhang & realistic tipping
    this.checkDeskEdge(deskBounds);

    this.updateMeshTransform();
  }

  checkDeskEdge(deskBounds) {
    if (this.isFalling || !deskBounds) return;

    const { tip, tail } = this.getEndpoints();
    const minX = deskBounds.minX;
    const maxX = deskBounds.maxX;
    const minZ = deskBounds.minZ;
    const maxZ = deskBounds.maxZ;

    const cmOff = this.pos.x < minX || this.pos.x > maxX || this.pos.y < minZ || this.pos.y > maxZ;

    const samples = 10;
    let outsideCount = 0;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const sx = tail.x + (tip.x - tail.x) * t;
      const sz = tail.y + (tip.y - tail.y) * t;
      if (sx < minX || sx > maxX || sz < minZ || sz > maxZ) {
        outsideCount++;
      }
    }
    const overHangFraction = outsideCount / (samples + 1);

    if (cmOff || overHangFraction > 0.55) {
      this.startFalling(deskBounds);
    } else if (overHangFraction > 0.40 && !this.isWobbling && this.vel.length() < 0.25) {
      this.isWobbling = true;
      this.wobbleTime = 0;
      this.wobbleIntensity = (overHangFraction - 0.40) * 0.35;
    }
  }

  updateWobble(dt, deskBounds) {
    this.wobbleTime += dt * 8.0;
    this.rotZ = Math.sin(this.wobbleTime) * this.wobbleIntensity;
    this.rotX = Math.cos(this.wobbleTime * 1.2) * (this.wobbleIntensity * 0.5);

    this.wobbleIntensity = Math.max(0, this.wobbleIntensity - 0.45 * dt);

    if (this.wobbleIntensity <= 0.005) {
      this.isWobbling = false;
      this.rotX = 0;
      this.rotZ = 0;
      this.isSleeping = true;
    }
  }

  startFalling(deskBounds) {
    if (this.isFalling) return;
    this.isFalling = true;
    this.isSleeping = false;
    this.isWobbling = false;

    const speed = this.vel.length();
    const fallDir = speed > 0.1 ? this.vel.clone().normalize() : new THREE.Vector2(
      Math.sign(this.pos.x) || 1,
      Math.sign(this.pos.y) || 1
    ).normalize();

    this.fallVelocity.set(
      fallDir.x * (speed * 0.75 + 1.0),
      -0.6,
      fallDir.y * (speed * 0.75 + 1.0)
    );

    this.fallRotVel.set(
      (Math.random() - 0.5) * 6 + this.angVel * 0.4,
      this.angVel * 1.1,
      (Math.random() - 0.5) * 6
    );

    sound.playDrop();
  }

  updateFallPhysics(dt) {
    const gravity = -16.0;
    this.fallVelocity.y += gravity * dt;

    this.pos.x += this.fallVelocity.x * dt;
    this.heightY += this.fallVelocity.y * dt;
    this.pos.y += this.fallVelocity.z * dt;

    this.rotX += this.fallRotVel.x * dt;
    this.angle += this.fallRotVel.y * dt;
    this.rotZ += this.fallRotVel.z * dt;

    this.updateMeshTransform();

    if (this.heightY < -7.5) {
      this.hasFallenOff = true;
      this.isSleeping = true;
    }
  }

  updateMeshTransform() {
    if (!this.mesh) return;
    this.mesh.position.set(this.pos.x, this.heightY, this.pos.y);
    this.mesh.rotation.set(this.rotX, this.angle, this.rotZ);
  }
}

// -------------------------------------------------------------
// PEN FIGHT PHYSICS WORLD (With 4x Sub-Stepping & OBB Prop Deflection)
// -------------------------------------------------------------
export class PenPhysicsWorld {
  constructor() {
    this.pens = [];
    this.obstacles = [];
    this.deskBounds = {
      minX: -3.8,
      maxX: 3.8,
      minZ: -2.4,
      maxZ: 2.4
    };
    this.onCollisionCallback = null;
    this.onRampOverCallback = null;
    this.lastClackTime = 0;
  }

  addPen(penObj) {
    this.pens.push(penObj);
  }

  removePen(penObj) {
    this.pens = this.pens.filter(p => p !== penObj);
  }

  addObstacle(obstacle) {
    this.obstacles.push(obstacle);
  }

  clearObstacles() {
    this.obstacles = [];
  }

  setDeskBounds(minX, maxX, minZ, maxZ) {
    this.deskBounds = { minX, maxX, minZ, maxZ };
  }

  // 4x Sub-Stepping + 2x Iterative Collision passes: Full chain reaction support (P1 -> P2 -> P3 -> P4)
  update(dt) {
    const subSteps = 4;
    const subDt = Math.min(0.02, dt) / subSteps;
    const solverIterations = 2;

    for (let step = 0; step < subSteps; step++) {
      // 1. Update individual pen movement
      for (const pen of this.pens) {
        pen.update(subDt, this.deskBounds);
      }

      // 2. Iterative Multi-Pen & Prop Collision passes for seamless chain reactions
      for (let iter = 0; iter < solverIterations; iter++) {
        // Resolve Pen vs Pen collisions with continuous separation & solid deflection
        for (let i = 0; i < this.pens.length; i++) {
          for (let j = i + 1; j < this.pens.length; j++) {
            const p1 = this.pens[i];
            const p2 = this.pens[j];
            if (p1.isFalling || p2.isFalling) continue;
            this.resolvePenPenCollision(p1, p2);
          }
        }

        // Resolve Pen vs Desk Props (OBB Deflections)
        for (const pen of this.pens) {
          if (pen.isFalling) continue;
          for (const obs of this.obstacles) {
            this.resolvePenObstacleCollision(pen, obs);
          }
        }
      }
    }
  }

  // Clean, Solid Physical Deflection (Zero Jitter, Solid Bounces)
  resolvePenPenCollision(p1, p2) {
    const end1 = p1.getEndpoints();
    const end2 = p2.getEndpoints();

    const { dist, pA, pB } = this.closestPointsOnSegments(
      end1.tail, end1.tip,
      end2.tail, end2.tip
    );

    const minDist = p1.radius + p2.radius;
    if (dist >= minDist) return;

    let normal = new THREE.Vector2().subVectors(pA, pB);
    if (dist < 0.001) {
      normal.subVectors(p1.pos, p2.pos);
      if (normal.lengthSq() < 0.0001) {
        normal.set(0, 1);
      } else {
        normal.normalize();
      }
    } else {
      normal.divideScalar(dist);
    }

    const penetration = minDist - dist + 0.002;

    const r1 = new THREE.Vector2().subVectors(pA, p1.pos);
    const r2 = new THREE.Vector2().subVectors(pB, p2.pos);

    const v1_contact = new THREE.Vector2(
      p1.vel.x - p1.angVel * r1.y,
      p1.vel.y + p1.angVel * r1.x
    );
    const v2_contact = new THREE.Vector2(
      p2.vel.x - p2.angVel * r2.y,
      p2.vel.y + p2.angVel * r2.x
    );

    const v_rel = new THREE.Vector2().subVectors(v1_contact, v2_contact);
    const velAlongNormal = v_rel.dot(normal);

    // Identify Striker (faster pen) and Defender (slower pen)
    const speed1 = p1.vel.length();
    const speed2 = p2.vel.length();
    const isP1Striker = speed1 > speed2;
    const striker = isP1Striker ? p1 : p2;
    const defender = isP1Striker ? p2 : p1;
    const strikerSpeed = isP1Striker ? speed1 : speed2;

    // LUCK PROBABILITY ONLY WHEN [L] AUTO-LOCK KEY IS USED ON MAX POWER:
    if (striker.usedAutoLock && strikerSpeed > 6.0) {
      const strikerDir = striker.vel.clone().normalize();
      const collisionAngleCos = Math.abs(strikerDir.dot(normal));

      if (collisionAngleCos > 0.65) {
        const rampRoll = Math.random();
        if (rampRoll < 0.55) {
          striker.launchAirborneJump(striker.vel, 4.2 + THREE.MathUtils.randFloat(0.3, 1.2));
          defender.vel.addScaledVector(normal, (isP1Striker ? -1 : 1) * 2.2);
          defender.angVel += (Math.random() - 0.5) * 4.0;
          defender.isSleeping = false;

          sound.playClack(1.4);
          if (this.onRampOverCallback) {
            this.onRampOverCallback(striker, defender);
          }
          return;
        }
      }
    }

    // Clean positional separation strictly along contact normal
    const totalMass = p1.mass + p2.mass;
    const sepRatio1 = p2.mass / totalMass;
    const sepRatio2 = p1.mass / totalMass;

    p1.pos.addScaledVector(normal, penetration * sepRatio1);
    p2.pos.addScaledVector(normal, -penetration * sepRatio2);
    p1.updateMeshTransform();
    p2.updateMeshTransform();

    if (velAlongNormal > 0) return; // Already separating

    // Elastic restitution for crisp plastic deflection
    const restitution = 0.78;

    const r1CrossN = r1.x * normal.y - r1.y * normal.x;
    const r2CrossN = r2.x * normal.y - r2.y * normal.x;

    const invMassSum = (1 / p1.mass) + (1 / p2.mass) +
      (r1CrossN * r1CrossN) / p1.inertia +
      (r2CrossN * r2CrossN) / p2.inertia;

    // Minimum separating speed ensures pens cleanly deflect away immediately
    const minDeflectSpeed = Math.max(Math.abs(velAlongNormal) * (1 + restitution), 0.65);
    const impulseMag = minDeflectSpeed / invMassSum;
    const impulse = normal.clone().multiplyScalar(impulseMag * Math.sqrt(p1.knockbackMult * p2.knockbackMult));

    // Apply linear impulse directly to both pens
    p1.vel.addScaledVector(impulse, 1 / p1.mass);
    p2.vel.addScaledVector(impulse, -1 / p2.mass);

    // Apply angular spin impulse with realistic rotational inertia
    p1.angVel += (r1CrossN * impulseMag) / p1.inertia;
    p2.angVel -= (r2CrossN * impulseMag) / p2.inertia;

    // Clamp excessive rotational velocity to keep motion clean
    p1.angVel = Math.max(-28, Math.min(28, p1.angVel));
    p2.angVel = Math.max(-28, Math.min(28, p2.angVel));

    // Tangential friction spin transfer
    const tangent = new THREE.Vector2(-normal.y, normal.x);
    const velAlongTangent = v_rel.dot(tangent);
    const frictionImpulseMag = -velAlongTangent * 0.18;
    p1.angVel += ((r1.x * tangent.y - r1.y * tangent.x) * frictionImpulseMag) / p1.inertia;
    p2.angVel -= ((r2.x * tangent.y - r2.y * tangent.x) * frictionImpulseMag) / p2.inertia;

    p1.isSleeping = false;
    p2.isSleeping = false;

    // Debounced, crisp impact clack sound
    const impactSpeed = Math.abs(velAlongNormal);
    const now = performance.now();
    if (now - this.lastClackTime > 70 && impactSpeed > 0.15) {
      sound.playClack(Math.min(1.4, Math.max(0.35, impactSpeed * 0.45)));
      this.lastClackTime = now;
      if (this.onCollisionCallback) {
        this.onCollisionCallback(pA, impactSpeed);
      }
    }
  }

  closestPointsOnSegments(p1, q1, p2, q2) {
    const d1 = new THREE.Vector2().subVectors(q1, p1);
    const d2 = new THREE.Vector2().subVectors(q2, p2);
    const r = new THREE.Vector2().subVectors(p1, p2);

    const a = d1.dot(d1);
    const e = d2.dot(d2);
    const f = d2.dot(r);

    let s = 0;
    let t = 0;

    if (a <= 0.00001 && e <= 0.00001) {
      return { dist: r.length(), pA: p1.clone(), pB: p2.clone(), sA: 0, sB: 0 };
    }

    if (a <= 0.00001) {
      s = 0;
      t = Math.max(0, Math.min(1, f / e));
    } else {
      const c = d1.dot(r);
      if (e <= 0.00001) {
        t = 0;
        s = Math.max(0, Math.min(1, -c / a));
      } else {
        const b = d1.dot(d2);
        const denom = a * e - b * b;

        if (denom !== 0) {
          s = Math.max(0, Math.min(1, (b * f - c * e) / denom));
        } else {
          s = 0;
        }

        t = (b * s + f) / e;

        if (t < 0) {
          t = 0;
          s = Math.max(0, Math.min(1, -c / a));
        } else if (t > 1) {
          t = 1;
          s = Math.max(0, Math.min(1, (b - c) / a));
        }
      }
    }

    const pA = new THREE.Vector2().addVectors(p1, d1.clone().multiplyScalar(s));
    const pB = new THREE.Vector2().addVectors(p2, d2.clone().multiplyScalar(t));
    const dist = pA.distanceTo(pB);

    return { dist, pA, pB, sA: s, sB: t };
  }

  // Robust Oriented Bounding Box (OBB) Prop Deflection (Eraser, Geometry Box, Ruler, Notebook)
  resolvePenObstacleCollision(pen, obs) {
    const obsPos = obs.pos;
    const obsSize = obs.size;
    const obsAngle = obs.angle || 0;
    const halfW = obsSize.x / 2;
    const halfH = obsSize.y / 2;

    const cosA = Math.cos(-obsAngle);
    const sinA = Math.sin(-obsAngle);

    const { tip, tail } = pen.getEndpoints();
    const samples = 10;
    let maxPenetration = 0;
    let contactWorldPos = null;
    let collisionNormalWorld = null;

    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const wx = tail.x + (tip.x - tail.x) * t;
      const wz = tail.y + (tip.y - tail.y) * t;

      // Transform sample point into Obstacle local space
      const dx = wx - obsPos.x;
      const dz = wz - obsPos.y;
      const lx = cosA * dx - sinA * dz;
      const lz = sinA * dx + cosA * dz;

      const skinRadius = pen.radius;
      if (lx >= -halfW - skinRadius && lx <= halfW + skinRadius &&
          lz >= -halfH - skinRadius && lz <= halfH + skinRadius) {

        const dl = (lx - (-halfW - skinRadius));
        const dr = (halfW + skinRadius - lx);
        const dt = (lz - (-halfH - skinRadius));
        const db = (halfH + skinRadius - lz);

        const minD = Math.min(dl, dr, dt, db);
        if (minD > maxPenetration) {
          maxPenetration = minD;
          contactWorldPos = new THREE.Vector2(wx, wz);

          // Local normal
          const localNormal = new THREE.Vector2(0, 0);
          if (minD === dl) localNormal.set(-1, 0);
          else if (minD === dr) localNormal.set(1, 0);
          else if (minD === dt) localNormal.set(0, -1);
          else localNormal.set(0, 1);

          // Rotate normal back to world space
          const cosW = Math.cos(obsAngle);
          const sinW = Math.sin(obsAngle);
          collisionNormalWorld = new THREE.Vector2(
            cosW * localNormal.x - sinW * localNormal.y,
            sinW * localNormal.x + cosW * localNormal.y
          ).normalize();
        }
      }
    }

    if (maxPenetration > 0 && collisionNormalWorld) {
      // Positional separation (push out of prop)
      pen.pos.addScaledVector(collisionNormalWorld, maxPenetration * 1.05);
      pen.updateMeshTransform();

      // Velocity reflection & deflection
      const vn = pen.vel.dot(collisionNormalWorld);
      if (vn < 0) {
        const bounce = obs.bounce || 0.72;
        pen.vel.addScaledVector(collisionNormalWorld, -(1 + bounce) * vn);

        // Impart realistic torque from point of contact
        if (contactWorldPos) {
          const r = new THREE.Vector2().subVectors(contactWorldPos, pen.pos);
          const torque = r.x * collisionNormalWorld.y - r.y * collisionNormalWorld.x;
          pen.angVel += (torque / pen.inertia) * (Math.abs(vn) * 0.4);
        }

        pen.angVel *= 0.85;
        pen.isSleeping = false;

        sound.playClack(Math.min(1.2, Math.abs(vn) * 0.4 + 0.3));

        if (this.onCollisionCallback && contactWorldPos) {
          this.onCollisionCallback(contactWorldPos, Math.abs(vn));
        }
      }
    }
  }

  isAllSleeping() {
    return this.pens.every(p => (p.isSleeping && !p.isWobbling) || p.hasFallenOff);
  }
}
