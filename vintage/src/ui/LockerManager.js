import * as THREE from 'three';
import { PEN_CATALOG, PenModelBuilder } from '../pens/PenModels.js';
import { sound } from '../audio/SoundEngine.js';

export class LockerManager {
  constructor(gameManager) {
    this.gm = gameManager;
    this.currentPenIndex = 0;
    this.selectedPenId = 'reynolds045';
    this.selectedColor = '#0044cc';
    this.selectedCapPos = 'back';

    this.previewScene = null;
    this.previewCamera = null;
    this.previewRenderer = null;
    this.previewPenMesh = null;

    this.initLockerPreview();
    this.bindLockerUI();
  }

  initLockerPreview() {
    const container = document.getElementById('locker-3d-preview');
    if (!container) return;

    const width = 340;
    const height = 240;

    this.previewRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.previewRenderer.setSize(width, height);
    this.previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.previewRenderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(this.previewRenderer.domElement);

    this.previewScene = new THREE.Scene();
    this.previewCamera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    this.previewCamera.position.set(0, 1.6, 3.2);
    this.previewCamera.lookAt(0, 0, 0);

    // Studio lights for pen locker turntable
    const ambient = new THREE.AmbientLight(0xffffff, 1.4);
    this.previewScene.add(ambient);

    const dirLight1 = new THREE.DirectionalLight(0xffeedd, 2.2);
    dirLight1.position.set(3, 4, 3);
    this.previewScene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x99ccff, 1.4);
    dirLight2.position.set(-3, -1, -2);
    this.previewScene.add(dirLight2);

    this.updatePreviewMesh();
  }

  onOpen() {
    const container = document.getElementById('locker-3d-preview');
    if (!container || !this.previewRenderer) return;

    // Measure real dimensions once modal is visible
    setTimeout(() => {
      const width = container.clientWidth || 320;
      const height = container.clientHeight || 240;
      if (width > 0 && height > 0) {
        this.previewRenderer.setSize(width, height);
        this.previewCamera.aspect = width / height;
        this.previewCamera.updateProjectionMatrix();
      }
      this.updatePreviewMesh();
    }, 50);
  }

  updatePreviewMesh() {
    if (!this.previewScene) return;

    if (this.previewPenMesh) {
      this.previewScene.remove(this.previewPenMesh);
    }

    const penData = PEN_CATALOG[this.currentPenIndex];
    this.selectedPenId = penData.id;

    this.previewPenMesh = PenModelBuilder.createPenMesh(penData.id, {
      color: this.selectedColor,
      capPos: this.selectedCapPos
    });

    this.previewPenMesh.scale.set(1.4, 1.4, 1.4);
    this.previewScene.add(this.previewPenMesh);

    this.updateLockerInfo(penData);
  }

  updateLockerInfo(penData) {
    const nameEl = document.getElementById('locker-pen-name');
    const tagEl = document.getElementById('locker-pen-tag');
    const descEl = document.getElementById('locker-pen-desc');
    const eraEl = document.getElementById('locker-pen-era');

    if (nameEl) nameEl.textContent = penData.name;
    if (tagEl) tagEl.textContent = penData.tagline;
    if (descEl) descEl.textContent = penData.description;
    if (eraEl) eraEl.textContent = `Era: ${penData.era}`;

    // Update Stats Bars
    this.setStatBar('stat-mass', penData.stats.mass / 1.5);
    this.setStatBar('stat-spin', penData.stats.spin);
    this.setStatBar('stat-knock', penData.stats.knockback);
    this.setStatBar('stat-speed', penData.stats.speed);

    // Color Swatches
    const colorContainer = document.getElementById('locker-colors');
    if (colorContainer) {
      colorContainer.innerHTML = '';
      penData.colors.forEach((colHex) => {
        const swatch = document.createElement('div');
        swatch.className = `color-swatch ${colHex === this.selectedColor ? 'active' : ''}`;
        swatch.style.backgroundColor = colHex;
        swatch.addEventListener('click', () => {
          sound.playClick();
          this.selectedColor = colHex;
          document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
          swatch.classList.add('active');
          this.updatePreviewMesh();
        });
        colorContainer.appendChild(swatch);
      });
    }
  }

  setStatBar(id, val) {
    const el = document.getElementById(id);
    if (el) {
      el.style.width = `${Math.min(100, Math.round(val * 100))}%`;
    }
  }

  bindLockerUI() {
    const btnPrev = document.getElementById('btn-locker-prev');
    const btnNext = document.getElementById('btn-locker-next');

    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        sound.playClick();
        this.currentPenIndex = (this.currentPenIndex - 1 + PEN_CATALOG.length) % PEN_CATALOG.length;
        this.selectedColor = PEN_CATALOG[this.currentPenIndex].colors[0];
        this.updatePreviewMesh();
      });
    }

    if (btnNext) {
      btnNext.addEventListener('click', () => {
        sound.playClick();
        this.currentPenIndex = (this.currentPenIndex + 1) % PEN_CATALOG.length;
        this.selectedColor = PEN_CATALOG[this.currentPenIndex].colors[0];
        this.updatePreviewMesh();
      });
    }

    // Cap Position Selector Buttons
    document.querySelectorAll('.cap-pos-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playClick();
        document.querySelectorAll('.cap-pos-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedCapPos = btn.dataset.pos;
        this.updatePreviewMesh();
      });
    });

    // Equip Button
    const btnEquip = document.getElementById('btn-equip-pen');
    if (btnEquip) {
      btnEquip.addEventListener('click', () => {
        sound.playClick();
        this.gm.setPlayerPenConfig(this.selectedPenId, this.selectedColor, this.selectedCapPos);
        document.getElementById('locker-modal').classList.add('hidden');
        this.gm.ui.showMessage(`🖋️ Equipped ${PEN_CATALOG[this.currentPenIndex].name}!`);
      });
    }
  }

  update(dt) {
    if (this.previewPenMesh) {
      this.previewPenMesh.rotation.y += 1.4 * dt;
      this.previewPenMesh.rotation.x = Math.sin(Date.now() * 0.002) * 0.15 + 0.1;
    }
    if (this.previewRenderer && this.previewScene && this.previewCamera) {
      this.previewRenderer.render(this.previewScene, this.previewCamera);
    }
  }
}
