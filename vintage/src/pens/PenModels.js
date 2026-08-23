import * as THREE from 'three';

export const PEN_CATALOG = [
  {
    id: 'reynolds045',
    name: 'Reynolds 045',
    tagline: 'The Legendary White Carbure',
    description: 'The undefeated king of school pen fights. Hexagonal white barrel with maximum spin whip balance.',
    era: 'Vintage 90s / 2000s Classic',
    unlocked: true,
    stats: {
      mass: 0.85,
      spin: 0.95,
      knockback: 0.85,
      speed: 0.90,
      stability: 0.75
    },
    colors: ['#0044cc', '#cc1122', '#118833', '#111111'],
    length: 1.45,
    radius: 0.045
  },
  {
    id: 'cello_gripper',
    name: 'Cello Gripper',
    tagline: 'The Tactile Brawler',
    description: 'Comfortable rubber grip gives high traction and controlled impact resistance against heavy pens.',
    era: 'Millennium Favorite',
    unlocked: true,
    stats: {
      mass: 0.95,
      spin: 0.80,
      knockback: 0.88,
      speed: 0.82,
      stability: 0.90
    },
    colors: ['#0033aa', '#222222', '#aa0022', '#16a34a'],
    length: 1.48,
    radius: 0.05
  },
  {
    id: 'parker_vector',
    name: 'Parker Vector',
    tagline: 'Heavy Steel Juggernaut',
    description: 'Brushed stainless steel heavyweight with the iconic arrow clip. Devastating knockout power.',
    era: 'Executive Luxury',
    unlocked: true,
    stats: {
      mass: 1.40,
      spin: 0.65,
      knockback: 1.00,
      speed: 0.70,
      stability: 0.95
    },
    colors: ['#cccccc', '#222222', '#224488', '#d97706'],
    length: 1.40,
    radius: 0.052
  },
  {
    id: 'pilot_v5',
    name: 'Pilot Hi-Tecpoint V5',
    tagline: 'Laser Precision Needle',
    description: 'Japanese needle point with streamlined cylindrical flow. Pinpoint straight-line drive accuracy.',
    era: 'High-Tech Class',
    unlocked: true,
    stats: {
      mass: 0.80,
      spin: 0.85,
      knockback: 0.80,
      speed: 0.95,
      stability: 0.80
    },
    colors: ['#0055dd', '#222222', '#cc0033', '#059669'],
    length: 1.42,
    radius: 0.046
  },
  {
    id: 'hero_fountain',
    name: 'Hero 329 Fountain Pen',
    tagline: 'Vintage Hooded Gold Nib',
    description: 'Classic burgundy vintage pen with hooded golden nib and stainless cap. Heavy rear spin weight.',
    era: 'Vintage 1980s Heritage',
    unlocked: true,
    stats: {
      mass: 1.15,
      spin: 0.92,
      knockback: 0.90,
      speed: 0.78,
      stability: 0.85
    },
    colors: ['#5a1827', '#0e3d36', '#1a1a1a', '#1e3a8a'],
    length: 1.46,
    radius: 0.05
  },
  {
    id: 'natraj_pencil',
    name: 'Natraj 621 Pencil',
    tagline: 'The Red-Black Spin Cyclone',
    description: 'Ultra-lightweight wooden body with red and black stripes. Insane helicopter spin tricks!',
    era: 'All-Time Nostalgia',
    unlocked: true,
    stats: {
      mass: 0.55,
      spin: 1.00,
      knockback: 0.65,
      speed: 0.92,
      stability: 0.60
    },
    colors: ['#d32f2f'],
    length: 1.55,
    radius: 0.042
  }
];

export class PenModelBuilder {
  static createPenMesh(penId, options = {}) {
    const color = options.color || '#0044cc';
    const capPos = options.capPos || 'back'; // 'back', 'front', 'none'
    const penData = PEN_CATALOG.find(p => p.id === penId) || PEN_CATALOG[0];

    const penGroup = new THREE.Group();
    penGroup.name = `pen_${penId}`;

    switch (penId) {
      case 'reynolds045':
        this.buildReynolds045(penGroup, color, capPos);
        break;
      case 'cello_gripper':
        this.buildCelloGripper(penGroup, color, capPos);
        break;
      case 'parker_vector':
        this.buildParkerVector(penGroup, color, capPos);
        break;
      case 'pilot_v5':
        this.buildPilotV5(penGroup, color, capPos);
        break;
      case 'hero_fountain':
        this.buildHeroFountain(penGroup, color, capPos);
        break;
      case 'natraj_pencil':
        this.buildNatrajPencil(penGroup);
        break;
      default:
        this.buildReynolds045(penGroup, color, capPos);
        break;
    }

    // Enable shadows for all sub-meshes
    penGroup.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    penGroup.userData = {
      penId: penId,
      penData: penData,
      length: penData.length,
      radius: penData.radius,
      capPos: capPos
    };

    return penGroup;
  }

  // 1. REYNOLDS 045: White Hexagonal Barrel + Cap + Pointed Forward Nib
  static buildReynolds045(group, capColorHex, capPos) {
    const barrelLength = 1.25;
    const barrelRadius = 0.042;

    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.35, metalness: 0.05 });
    const capMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(capColorHex), roughness: 0.25, metalness: 0.1 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.2, metalness: 0.85 });
    const inkMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.9 });

    // Hexagonal White Barrel (aligned along Z axis)
    const barrelGeo = new THREE.CylinderGeometry(barrelRadius, barrelRadius, barrelLength, 6);
    const barrel = new THREE.Mesh(barrelGeo, whiteMat);
    barrel.rotation.x = Math.PI / 2;
    group.add(barrel);

    // Front Cone / Tip holder (tapering down towards front +Z)
    const coneGeo = new THREE.CylinderGeometry(barrelRadius * 0.45, barrelRadius, 0.15, 6);
    const cone = new THREE.Mesh(coneGeo, capMat);
    cone.rotation.x = Math.PI / 2;
    cone.position.z = barrelLength / 2 + 0.075;
    group.add(cone);

    // Brass Needle Tip (tapering towards the front +Z apex)
    const tipGeo = new THREE.CylinderGeometry(0.008, 0.018, 0.08, 12);
    const tip = new THREE.Mesh(tipGeo, brassMat);
    tip.rotation.x = Math.PI / 2;
    tip.position.z = barrelLength / 2 + 0.15 + 0.04;
    group.add(tip);

    // Ballpoint
    const ballGeo = new THREE.SphereGeometry(0.008, 8, 8);
    const ball = new THREE.Mesh(ballGeo, inkMat);
    ball.position.z = barrelLength / 2 + 0.15 + 0.08;
    group.add(ball);

    // Rear Plug
    const plugGeo = new THREE.CylinderGeometry(barrelRadius * 0.95, barrelRadius * 0.95, 0.08, 6);
    const plug = new THREE.Mesh(plugGeo, capMat);
    plug.rotation.x = Math.PI / 2;
    plug.position.z = -barrelLength / 2 - 0.04;
    group.add(plug);

    // Cap
    if (capPos !== 'none') {
      const capGroup = new THREE.Group();
      const capLength = 0.38;
      const capRadius = barrelRadius * 1.14;

      const capBodyGeo = new THREE.CylinderGeometry(capRadius * 0.85, capRadius, capLength, 12);
      const capBody = new THREE.Mesh(capBodyGeo, capMat);
      capBody.rotation.x = Math.PI / 2;
      capGroup.add(capBody);

      const clipGeo = new THREE.BoxGeometry(0.014, 0.02, capLength * 0.85);
      const clip = new THREE.Mesh(clipGeo, capMat);
      clip.position.set(0, capRadius + 0.01, -0.02);
      capGroup.add(clip);

      if (capPos === 'back') {
        capGroup.position.z = -barrelLength / 2 - capLength * 0.4;
      } else {
        capGroup.rotation.y = Math.PI;
        capGroup.position.z = barrelLength / 2 + 0.08;
      }
      group.add(capGroup);
    }
  }

  // 2. CELLO GRIPPER: Translucent Barrel + Rubber Grip + Pointed Forward Nib & Dynamic Cap
  static buildCelloGripper(group, colorHex, capPos) {
    const barrelLength = 1.30;
    const radius = 0.046;

    const clearMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.6,
      opacity: 1.0,
      transparent: true,
      roughness: 0.15,
      ior: 1.45
    });
    const rubberMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.85 });
    const colorMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(colorHex), roughness: 0.3, metalness: 0.2 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.1, metalness: 0.95 });

    // Translucent Barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, barrelLength, 16), clearMat);
    barrel.rotation.x = Math.PI / 2;
    group.add(barrel);

    // Inner Refill
    const refill = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.35, radius * 0.35, barrelLength * 0.85, 8), colorMat);
    refill.rotation.x = Math.PI / 2;
    group.add(refill);

    // Rubber Grip
    const gripLength = 0.32;
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.08, radius * 1.08, gripLength, 16), rubberMat);
    grip.rotation.x = Math.PI / 2;
    grip.position.z = barrelLength / 2 - gripLength / 2;
    group.add(grip);

    // Chrome Tip Nose (tapering forward to +Z)
    const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.015, radius, 0.14, 16), chromeMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = barrelLength / 2 + 0.07;
    group.add(nose);

    // Ball tip
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 8), chromeMat);
    ball.position.z = barrelLength / 2 + 0.14;
    group.add(ball);

    // Rear Plug
    const rear = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.9, radius * 0.9, 0.10, 16), colorMat);
    rear.rotation.x = Math.PI / 2;
    rear.position.z = -barrelLength / 2 - 0.05;
    group.add(rear);

    // Cap (Rear, Front, or None)
    if (capPos !== 'none') {
      const capGroup = new THREE.Group();
      const capLen = 0.38;
      const capR = radius * 1.15;
      const capMesh = new THREE.Mesh(new THREE.CylinderGeometry(capR * 0.9, capR, capLen, 16), colorMat);
      capMesh.rotation.x = Math.PI / 2;
      capGroup.add(capMesh);

      const clip = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.022, capLen * 0.8), colorMat);
      clip.position.set(0, capR + 0.012, 0);
      capGroup.add(clip);

      if (capPos === 'back') {
        capGroup.position.z = -barrelLength / 2 - capLen * 0.4;
      } else {
        capGroup.rotation.y = Math.PI;
        capGroup.position.z = barrelLength / 2 + 0.08;
      }
      group.add(capGroup);
    }
  }

  // 3. PARKER VECTOR: Brushed Stainless Steel + Arrow Clip + Pointed Nib
  static buildParkerVector(group, trimColor, capPos) {
    const length = 1.35;
    const radius = 0.05;

    const steelMat = new THREE.MeshStandardMaterial({ color: 0xdcdcdc, roughness: 0.22, metalness: 0.92 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.15, metalness: 0.9 });
    const darkGripMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3 });

    // Steel Barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length * 0.65, 20), steelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -length * 0.15;
    group.add(barrel);

    // Front Grip (tapering forward)
    const front = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.65, radius, length * 0.32, 20), darkGripMat);
    front.rotation.x = Math.PI / 2;
    front.position.z = length * 0.25;
    group.add(front);

    // Steel Rollerball / Nib Cone (pointing forward towards +Z)
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.008, radius * 0.65, 0.08, 16), steelMat);
    tip.rotation.x = Math.PI / 2;
    tip.position.z = length * 0.41 + 0.04;
    group.add(tip);

    // Ball
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 8), goldMat);
    ball.position.z = length * 0.41 + 0.08;
    group.add(ball);

    // Cap (Rear, Front, or None)
    if (capPos !== 'none') {
      const capGroup = new THREE.Group();
      const capLength = length * 0.45;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.05, radius * 1.05, capLength, 20), steelMat);
      cap.rotation.x = Math.PI / 2;
      capGroup.add(cap);

      // Parker Arrow Clip
      const arrowShaft = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.025, capLength * 0.75), goldMat);
      arrowShaft.position.set(0, radius * 1.05 + 0.015, 0);
      capGroup.add(arrowShaft);

      const arrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.05, 3), goldMat);
      arrowHead.rotation.x = -Math.PI / 2;
      arrowHead.position.set(0, radius * 1.05 + 0.015, capLength * 0.35);
      capGroup.add(arrowHead);

      if (capPos === 'back') {
        capGroup.position.z = -length * 0.42;
      } else {
        capGroup.rotation.y = Math.PI;
        capGroup.position.z = length * 0.22;
      }
      group.add(capGroup);
    }
  }

  // 4. PILOT HI-TECPOINT V5: Streamlined Needle Point (Pointing forward)
  static buildPilotV5(group, colorHex, capPos) {
    const length = 1.38;
    const radius = 0.046;

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x333338, roughness: 0.3, metalness: 0.1 });
    const accentMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(colorHex), roughness: 0.25, metalness: 0.2 });
    const needleMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.15, metalness: 0.95 });

    // Barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length * 0.7, 16), bodyMat);
    barrel.rotation.x = Math.PI / 2;
    group.add(barrel);

    // Ink Window Ring
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.02, radius * 1.02, 0.08, 16), accentMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.z = 0.15;
    group.add(ring);

    // Front Nose Cone (tapering down towards forward +Z)
    const cone1 = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.45, radius, 0.15, 16), bodyMat);
    cone1.rotation.x = Math.PI / 2;
    cone1.position.z = length * 0.35 + 0.075;
    group.add(cone1);

    // Ultra fine metal needle tip (pointing forward)
    const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.015, 0.12, 12), needleMat);
    needle.rotation.x = Math.PI / 2;
    needle.position.z = length * 0.35 + 0.15 + 0.06;
    group.add(needle);

    // Ball
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 8), needleMat);
    ball.position.z = length * 0.35 + 0.15 + 0.12;
    group.add(ball);

    // Rear Plug
    const rearPlug = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.9, radius * 0.9, 0.08, 16), accentMat);
    rearPlug.rotation.x = Math.PI / 2;
    rearPlug.position.z = -length * 0.35 - 0.04;
    group.add(rearPlug);

    // Cap
    if (capPos !== 'none') {
      const capGroup = new THREE.Group();
      const capLen = 0.38;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.06, radius * 1.06, capLen, 16), accentMat);
      cap.rotation.x = Math.PI / 2;
      capGroup.add(cap);

      const clip = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.02, capLen * 0.75), needleMat);
      clip.position.set(0, radius * 1.06 + 0.012, 0);
      capGroup.add(clip);

      if (capPos === 'back') {
        capGroup.position.z = -length * 0.35 - 0.16;
      } else {
        capGroup.rotation.y = Math.PI;
        capGroup.position.z = length * 0.30;
      }
      group.add(capGroup);
    }
  }

  // 5. HERO 329 FOUNTAIN PEN: Hooded Gold Nib Pointing Forward
  static buildHeroFountain(group, bodyColorHex, capPos) {
    const length = 1.42;
    const radius = 0.05;

    const resinMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(bodyColorHex), roughness: 0.15, metalness: 0.1 });
    const steelCapMat = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.2, metalness: 0.9 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.15, metalness: 0.85 });

    // Cigar Shaped Body
    const body = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.85, radius, length * 0.6, 20), resinMat);
    body.rotation.x = Math.PI / 2;
    body.position.z = -length * 0.15;
    group.add(body);

    // Hooded Section (tapering forward)
    const hood = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.45, radius * 0.85, length * 0.28, 20), resinMat);
    hood.rotation.x = Math.PI / 2;
    hood.position.z = length * 0.25;
    group.add(hood);

    // Classic Hooded Gold Nib peeking forward towards +Z
    const nib = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.06, 4), goldMat);
    nib.rotation.x = Math.PI / 2;
    nib.position.z = length * 0.25 + length * 0.14 + 0.03;
    group.add(nib);

    // Metallic Cap Posted on Rear or Front
    if (capPos !== 'none') {
      const capGroup = new THREE.Group();
      const capLength = length * 0.48;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.08, radius * 1.05, capLength, 20), steelCapMat);
      cap.rotation.x = Math.PI / 2;
      capGroup.add(cap);

      const clip = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.025, capLength * 0.75), goldMat);
      clip.position.set(0, radius * 1.08 + 0.015, 0);
      capGroup.add(clip);

      if (capPos === 'back') {
        capGroup.position.z = -length * 0.45;
      } else {
        capGroup.rotation.y = Math.PI;
        capGroup.position.z = length * 0.20;
      }
      group.add(capGroup);
    }
  }

  // 6. NATRAJ 621 PENCIL: Sharpened Wooden Cone & Graphite Lead Pointing Forward
  static buildNatrajPencil(group) {
    const length = 1.55;
    const radius = 0.042;

    const redMat = new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.4, metalness: 0.05 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0xdec096, roughness: 0.6, metalness: 0.0 });
    const leadMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3, metalness: 0.7 });
    const ferruleMat = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, roughness: 0.2, metalness: 0.9 });
    const eraserMat = new THREE.MeshStandardMaterial({ color: 0xef9a9a, roughness: 0.9, metalness: 0.0 });

    // Hexagonal Body
    const bodyLength = length * 0.78;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, bodyLength, 6), redMat);
    body.rotation.x = Math.PI / 2;
    group.add(body);

    // Black stripes
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 });
    for (let i = 0; i < 3; i++) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.002, bodyLength), blackMat);
      const angle = (i * Math.PI * 2) / 3;
      stripe.position.set(Math.cos(angle) * radius * 0.95, Math.sin(angle) * radius * 0.95, 0);
      group.add(stripe);
    }

    // Sharpened Wooden Cone (Apex pointing forward towards +Z)
    const coneLength = 0.20;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(radius, coneLength, 16), woodMat);
    cone.rotation.x = Math.PI / 2;
    cone.position.z = bodyLength / 2 + coneLength / 2;
    group.add(cone);

    // Graphite Lead Tip (Sharp point at the very front +Z)
    const leadLength = 0.07;
    const lead = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.35, leadLength, 12), leadMat);
    lead.rotation.x = Math.PI / 2;
    lead.position.z = bodyLength / 2 + coneLength - leadLength / 2 + 0.035;
    group.add(lead);

    // Silver Ferrule (Rear)
    const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.02, radius * 1.02, 0.08, 16), ferruleMat);
    ferrule.rotation.x = Math.PI / 2;
    ferrule.position.z = -bodyLength / 2 - 0.04;
    group.add(ferrule);

    // Pink Eraser (Rear)
    const eraser = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.95, radius * 0.95, 0.10, 16), eraserMat);
    eraser.rotation.x = Math.PI / 2;
    eraser.position.z = -bodyLength / 2 - 0.08 - 0.05;
    group.add(eraser);
  }
}
