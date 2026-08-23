import * as THREE from 'three';

export class AIController {
  constructor(difficulty = 'medium') {
    this.difficulty = difficulty; // 'easy' (Backbencher), 'medium' (Class Topper), 'hard' (School Champion)
  }

  setDifficulty(diff) {
    this.difficulty = diff;
  }

  // Calculate shot parameters against player's pen
  calculateShot(aiPen, playerPen, deskBounds, obstacles = []) {
    const aiPos = aiPen.pos;
    const playerPos = playerPen.pos;
    const playerEnds = playerPen.getEndpoints();

    // 1. Determine target point on player pen
    let targetPoint = playerPos.clone();
    if (this.difficulty === 'hard') {
      // Pick the endpoint that is closer to any desk edge
      const tipDistEdge = this.distToNearestEdge(playerEnds.tip, deskBounds);
      const tailDistEdge = this.distToNearestEdge(playerEnds.tail, deskBounds);
      targetPoint = (tipDistEdge < tailDistEdge) ? playerEnds.tip : playerEnds.tail;
    } else if (this.difficulty === 'medium') {
      // Sparring bot aims for realistic body/spin balance
      targetPoint = Math.random() > 0.65 ? playerEnds.tail : playerPos;
    }

    // 2. Vector from AI to Target
    const dir = new THREE.Vector2().subVectors(targetPoint, aiPos);
    const dist = dir.length();
    dir.normalize();

    // 3. Select AI's own flick hit point (Tail for spin flick vs Center for straight push)
    let hitOffset = -0.5; // Moderate spin flick
    if (this.difficulty === 'hard') {
      const angleDiff = Math.abs(aiPen.angle - Math.atan2(dir.x, dir.y));
      if (angleDiff < 0.3) {
        hitOffset = 0.0;
      } else {
        hitOffset = -0.75;
      }
    } else if (this.difficulty === 'medium') {
      hitOffset = Math.random() > 0.5 ? -0.45 : 0.0; // Mix straight and spin shots
    } else {
      hitOffset = -0.3;
    }

    // 4. Power calculation (Balanced for lively, competitive rallies without cheap 1-shot pushouts)
    let basePower = 0.35 + dist * 0.08;

    if (this.difficulty === 'hard') {
      const aiDistToEdge = this.distToNearestEdge(aiPos, deskBounds);
      if (aiDistToEdge < 1.0 && dir.dot(this.edgeNormal(aiPos, deskBounds)) > 0.5) {
        basePower = Math.min(basePower, 0.5);
      } else {
        basePower = Math.min(0.80, basePower * 1.1);
      }
      dir.rotateAround(new THREE.Vector2(0, 0), (Math.random() - 0.5) * 0.06);
    } else if (this.difficulty === 'easy') {
      basePower = Math.min(0.55, basePower + (Math.random() - 0.5) * 0.2);
      dir.rotateAround(new THREE.Vector2(0, 0), (Math.random() - 0.5) * 0.35);
    } else {
      // Medium / Sparring Bot: Healthy rally power (0.35 - 0.65) + human variance
      basePower = Math.max(0.35, Math.min(0.65, basePower + (Math.random() - 0.5) * 0.1));
      dir.rotateAround(new THREE.Vector2(0, 0), (Math.random() - 0.5) * 0.16);
    }

    const power = Math.max(0.28, Math.min(0.85, basePower));

    return {
      forceDir: dir,
      direction: dir,
      power: power,
      hitOffset: hitOffset,
      aimAngle: Math.atan2(dir.x, dir.y)
    };
  }

  distToNearestEdge(pos, bounds) {
    const dl = Math.abs(pos.x - bounds.minX);
    const dr = Math.abs(pos.x - bounds.maxX);
    const dt = Math.abs(pos.y - bounds.minZ);
    const db = Math.abs(pos.y - bounds.maxZ);
    return Math.min(dl, dr, dt, db);
  }

  edgeNormal(pos, bounds) {
    const dl = Math.abs(pos.x - bounds.minX);
    const dr = Math.abs(pos.x - bounds.maxX);
    const dt = Math.abs(pos.y - bounds.minZ);
    const db = Math.abs(pos.y - bounds.maxZ);
    const minD = Math.min(dl, dr, dt, db);

    if (minD === dl) return new THREE.Vector2(-1, 0);
    if (minD === dr) return new THREE.Vector2(1, 0);
    if (minD === dt) return new THREE.Vector2(0, -1);
    return new THREE.Vector2(0, 1);
  }
}
