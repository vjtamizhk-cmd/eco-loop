import * as THREE from 'three';
import { TextureGenerator } from './TextureGenerator.js';

export class ClassroomScene {
  constructor(canvasContainer) {
    this.container = canvasContainer;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.container.appendChild(this.renderer.domElement);

    // Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#1a1614');
    this.scene.fog = new THREE.FogExp2('#1a1614', 0.035);

    this.camera = new THREE.PerspectiveCamera(
      42,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );

    // Camera Preset Modes
    this.cameraMode = 'bench'; // 'bench', 'top', 'pencam', 'orbit'
    this.camTargetPos = new THREE.Vector3(0, 5.2, 5.6);
    this.camTargetLookAt = new THREE.Vector3(0, 0, -0.2);
    this.currentLookAt = new THREE.Vector3(0, 0, -0.2);

    // Screen Shake state
    this.shakeIntensity = 0;
    this.shakeDecay = 6.0;

    // Contact Sparks / Particles
    this.sparks = [];

    // Ceiling fan reference
    this.fanBlades = null;

    // Interactive desk props
    this.deskProps = [];

    this.initLights();
    this.buildClassroomEnvironment();
    this.buildDesk();
    this.buildDeskProps();
    this.initParticlePool();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  initLights() {
    const hemiLight = new THREE.HemisphereLight(0xfff3e0, 0x3d2b1f, 0.75);
    this.scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff0d0, 1.8);
    sunLight.position.set(-8, 12, 6);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 30;
    sunLight.shadow.camera.left = -6;
    sunLight.shadow.camera.right = 6;
    sunLight.shadow.camera.top = 6;
    sunLight.shadow.camera.bottom = -6;
    sunLight.shadow.bias = -0.0004;
    sunLight.shadow.radius = 2.5;
    this.scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xb0c4de, 0.45);
    fillLight.position.set(6, 8, -4);
    this.scene.add(fillLight);

    const tableLight = new THREE.PointLight(0xffeedd, 0.6, 12);
    tableLight.position.set(0, 4, 0);
    this.scene.add(tableLight);
  }

  buildClassroomEnvironment() {
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xdfd5c6,
      roughness: 0.85,
      metalness: 0.05
    });

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(30, 15), wallMat);
    backWall.position.set(0, 5, -8);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    const boardTexture = TextureGenerator.createChalkboardTexture();
    const boardMat = new THREE.MeshStandardMaterial({
      map: boardTexture,
      roughness: 0.7,
      metalness: 0.05
    });
    const chalkboard = new THREE.Mesh(new THREE.PlaneGeometry(12, 5.5), boardMat);
    chalkboard.position.set(0, 4.5, -7.9);
    chalkboard.receiveShadow = true;
    this.scene.add(chalkboard);

    const woodFrameMat = new THREE.MeshStandardMaterial({ color: 0x5c3317, roughness: 0.5 });
    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(12.4, 0.25, 0.2), woodFrameMat);
    frameTop.position.set(0, 7.35, -7.85);
    this.scene.add(frameTop);

    const frameBottom = new THREE.Mesh(new THREE.BoxGeometry(12.4, 0.4, 0.35), woodFrameMat);
    frameBottom.position.set(0, 1.65, -7.8);
    this.scene.add(frameBottom);

    const duster = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.25), new THREE.MeshStandardMaterial({ color: 0x4a2e18 }));
    duster.position.set(2.5, 1.95, -7.75);
    this.scene.add(duster);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(35, 35),
      new THREE.MeshStandardMaterial({ color: 0x3d433b, roughness: 0.6, metalness: 0.1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -4.5;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(30, 15), wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-10, 5, 0);
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    const winFrame = new THREE.Mesh(new THREE.BoxGeometry(0.3, 6, 8), new THREE.MeshStandardMaterial({ color: 0x3e2723 }));
    winFrame.position.set(-9.85, 5.5, 0);
    this.scene.add(winFrame);

    const winGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(7.6, 5.6),
      new THREE.MeshBasicMaterial({ color: 0xfffae6, transparent: true, opacity: 0.85 })
    );
    winGlass.rotation.y = Math.PI / 2;
    winGlass.position.set(-9.8, 5.5, 0);
    this.scene.add(winGlass);

    // Ceiling Fan
    const fanGroup = new THREE.Group();
    fanGroup.position.set(0, 9.5, 0);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.5, 12), new THREE.MeshStandardMaterial({ color: 0x546e7a }));
    rod.position.y = 1.25;
    fanGroup.add(rod);
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.35, 16), new THREE.MeshStandardMaterial({ color: 0x546e7a }));
    fanGroup.add(motor);

    this.fanBlades = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const bladeAngle = (i * Math.PI * 2) / 3;
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.02, 2.2),
        new THREE.MeshStandardMaterial({ color: 0x455a64 })
      );
      blade.position.set(Math.sin(bladeAngle) * 1.3, 0, Math.cos(bladeAngle) * 1.3);
      blade.rotation.y = bladeAngle;
      blade.rotation.x = 0.1;
      this.fanBlades.add(blade);
    }
    fanGroup.add(this.fanBlades);
    this.scene.add(fanGroup);
  }

  buildDesk() {
    this.deskGroup = new THREE.Group();

    const deskTexture = TextureGenerator.createDeskTexture();
    const deskTopMat = new THREE.MeshStandardMaterial({
      map: deskTexture,
      roughness: 0.45,
      metalness: 0.08
    });

    const deskTopGeo = new THREE.BoxGeometry(7.6, 0.24, 4.8);
    const deskTop = new THREE.Mesh(deskTopGeo, deskTopMat);
    deskTop.position.set(0, -0.12, 0);
    deskTop.castShadow = true;
    deskTop.receiveShadow = true;
    this.deskGroup.add(deskTop);

    const ironMat = new THREE.MeshStandardMaterial({ color: 0x222224, roughness: 0.35, metalness: 0.8 });
    const legPositions = [
      [-3.4, -2.2, -2.0],
      [3.4, -2.2, -2.0],
      [-3.4, -2.2, 2.0],
      [3.4, -2.2, 2.0]
    ];
    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.2, 12), ironMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      leg.receiveShadow = true;
      this.deskGroup.add(leg);
    });

    const shelf = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.08, 4.0), new THREE.MeshStandardMaterial({ color: 0x4e270e, roughness: 0.6 }));
    shelf.position.set(0, -1.0, 0);
    shelf.receiveShadow = true;
    this.deskGroup.add(shelf);

    this.scene.add(this.deskGroup);
  }

  buildDeskProps() {
    this.propsGroup = new THREE.Group();

    // 1. Camlin Geometry Box
    const geomBoxTex = TextureGenerator.createGeometryBoxTexture();
    this.geomBox = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.12, 0.9),
      new THREE.MeshStandardMaterial({ map: geomBoxTex, metalness: 0.8, roughness: 0.25 })
    );
    this.geomBox.position.set(2.6, 0.06, -1.6);
    this.geomBox.rotation.y = -0.25;
    this.geomBox.castShadow = true;
    this.geomBox.receiveShadow = true;
    this.propsGroup.add(this.geomBox);

    // 2. Natraj Eraser
    const eraserTex = TextureGenerator.createEraserTexture();
    this.eraser = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.12, 0.38),
      new THREE.MeshStandardMaterial({ map: eraserTex, roughness: 0.85 })
    );
    this.eraser.position.set(-2.5, 0.06, -1.5);
    this.eraser.rotation.y = 0.4;
    this.eraser.castShadow = true;
    this.eraser.receiveShadow = true;
    this.propsGroup.add(this.eraser);

    // 3. Compact Wooden School Scales on Both Long Ends (Bank & Save Cushions)
    const rulerTex = TextureGenerator.createRulerTexture();
    const rulerGeo = new THREE.BoxGeometry(2.4, 0.02, 0.22);
    const rulerMat = new THREE.MeshStandardMaterial({ map: rulerTex, roughness: 0.5 });

    // Top Scale (At the very back edge behind Opponent / Bot)
    this.rulerTop = new THREE.Mesh(rulerGeo, rulerMat);
    this.rulerTop.position.set(0.0, 0.01, -2.25);
    this.rulerTop.rotation.y = 0.02;
    this.rulerTop.castShadow = true;
    this.rulerTop.receiveShadow = true;
    this.propsGroup.add(this.rulerTop);

    // Bottom Scale (At the very back edge behind Player 1)
    this.rulerBottom = new THREE.Mesh(rulerGeo, rulerMat);
    this.rulerBottom.position.set(0.0, 0.01, 2.25);
    this.rulerBottom.rotation.y = -0.02;
    this.rulerBottom.castShadow = true;
    this.rulerBottom.receiveShadow = true;
    this.propsGroup.add(this.rulerBottom);

    // Backward-compatibility alias for challenge modes
    this.ruler = this.rulerTop;

    // 4. School Notebook
    const notebookTex = TextureGenerator.createNotebookTexture();
    this.notebook = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.05, 2.4),
      new THREE.MeshStandardMaterial({ map: notebookTex, roughness: 0.9 })
    );
    this.notebook.position.set(-2.2, 0.025, 0.8);
    this.notebook.rotation.y = 0.15;
    this.notebook.castShadow = true;
    this.notebook.receiveShadow = true;
    this.notebook.visible = false;
    this.propsGroup.add(this.notebook);

    this.scene.add(this.propsGroup);
  }

  initParticlePool() {
    this.particleGroup = new THREE.Group();
    this.particlePool = [];

    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
    const sparkGeo = new THREE.SphereGeometry(0.025, 6, 6);

    for (let i = 0; i < 20; i++) {
      const p = new THREE.Mesh(sparkGeo, sparkMat);
      p.visible = false;
      this.particleGroup.add(p);
      this.particlePool.push({
        mesh: p,
        vel: new THREE.Vector3(),
        life: 0
      });
    }

    this.scene.add(this.particleGroup);
  }

  // Trigger impact spark particles & screen shake on collisions
  triggerCollisionEffects(pos2D, intensity = 1.0) {
    if (intensity > 0.8) {
      this.shakeIntensity = Math.min(0.25, intensity * 0.15);
    }

    let spawned = 0;
    const count = Math.min(10, Math.floor(intensity * 6) + 3);

    for (const p of this.particlePool) {
      if (!p.mesh.visible) {
        p.mesh.visible = true;
        p.mesh.position.set(pos2D.x, 0.08, pos2D.y);
        p.vel.set(
          (Math.random() - 0.5) * 3.5 * intensity,
          (Math.random() * 2.5 + 1.0) * intensity,
          (Math.random() - 0.5) * 3.5 * intensity
        );
        p.life = 0.35 + Math.random() * 0.25;
        spawned++;
        if (spawned >= count) break;
      }
    }
  }

  setCameraMode(mode, focusPenPos = null) {
    this.cameraMode = mode;
    switch (mode) {
      case 'bench':
        this.camTargetPos.set(0, 4.8, 5.2);
        this.camTargetLookAt.set(0, 0, -0.3);
        break;
      case 'top':
        // Pure static orthogonal top-down view of the table
        this.camTargetPos.set(0, 8.2, 0.0001);
        this.camTargetLookAt.set(0, 0, 0);
        this.camera.position.set(0, 8.2, 0.0001);
        this.currentLookAt.set(0, 0, 0);
        this.shakeIntensity = 0;
        break;
      case 'pencam':
        if (focusPenPos) {
          this.camTargetPos.set(focusPenPos.x * 0.75, 2.6, focusPenPos.y + 2.8);
          this.camTargetLookAt.set(focusPenPos.x, 0.1, focusPenPos.y - 1.0);
        } else {
          this.camTargetPos.set(0, 3.2, 4.0);
          this.camTargetLookAt.set(0, 0, -0.5);
        }
        break;
    }
  }

  setStageTheme(stageIndex) {
    if (stageIndex === 1) {
      this.notebook.visible = true;
      this.geomBox.position.set(0, 0.06, 0);
      this.geomBox.rotation.y = 0.1;
    } else if (stageIndex === 2) {
      this.notebook.visible = true;
      this.geomBox.position.set(2.0, 0.06, 0);
      this.eraser.position.set(-2.0, 0.06, 0);
    } else {
      this.notebook.visible = false;
      this.geomBox.position.set(2.6, 0.06, -1.6);
      this.eraser.position.set(-2.5, 0.06, -1.5);
    }
  }

  update(dt, activePen = null) {
    if (this.fanBlades) {
      this.fanBlades.rotation.y += 1.8 * dt;
    }

    // Update Spark Particles
    for (const p of this.particlePool) {
      if (p.mesh.visible) {
        p.life -= dt;
        if (p.life <= 0) {
          p.mesh.visible = false;
        } else {
          p.vel.y -= 9.8 * dt; // Gravity
          p.mesh.position.addScaledVector(p.vel, dt);
        }
      }
    }

    // Camera handling
    if (this.cameraMode === 'top') {
      // Strictly static top-down view: Zero movement, zero angle change, zero shake
      this.camera.position.set(0, 8.2, 0.0001);
      this.camera.lookAt(0, 0, 0);
      this.shakeIntensity = 0;
    } else {
      if (this.cameraMode === 'pencam' && activePen && !activePen.isFalling) {
        const pPos = activePen.pos;
        this.camTargetPos.set(pPos.x * 0.75, 2.4, pPos.y + 2.8);
        this.camTargetLookAt.set(pPos.x, 0.1, pPos.y - 1.0);
      }

      this.camera.position.lerp(this.camTargetPos, 4.5 * dt);
      this.currentLookAt.lerp(this.camTargetLookAt, 5.0 * dt);

      // Apply Screen Shake if active in 3D modes
      if (this.shakeIntensity > 0.001) {
        const sx = (Math.random() - 0.5) * this.shakeIntensity;
        const sy = (Math.random() - 0.5) * this.shakeIntensity;
        this.camera.position.x += sx;
        this.camera.position.y += sy;
        this.shakeIntensity = Math.max(0, this.shakeIntensity - this.shakeDecay * dt);
      }

      this.camera.lookAt(this.currentLookAt);
    }

    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
