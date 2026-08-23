import * as THREE from 'three';
import { sound } from '../audio/SoundEngine.js';
import { PEN_CATALOG } from '../pens/PenModels.js';
import confetti from 'canvas-confetti';

export class UIManager {
  constructor(gameManager) {
    this.gm = gameManager;

    // Shot parameters
    this.aimAngle = 0; // In radians
    this.hitOffset = -0.75; // -0.75 (Tail spin) vs 0.0 (Center push)
    this.usedAutoLock = false;

    // Calm, readable Oscillating Power Bar
    this.oscillatingPower = 0.5;
    this.powerOscillationSpeed = 1.15; // Smooth relaxed rhythm

    // Smooth Keyboard Aiming State
    this.keyLeft = false;
    this.keyRight = false;
    this.aimTurnSpeed = 1.8; // Radians per second

    // Mouse aiming support
    this.raycaster = new THREE.Raycaster();
    this.mousePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.mouseVec = new THREE.Vector2();

    // 3D Shortened & Elegant Aim Guides
    this.aimGroup = null;
    this.aimChevron = null;
    this.aimTargetRing = null;
    this.hitPointMarker = null;
    this.init3DAimGuides();

    this.bindDOM();
    this.setupKeyboardControls();
    this.setupMouseAiming();
    this.bindMultiplayerLobby();
  }

  init3DAimGuides() {
    const scene = this.gm.classroom.scene;

    this.aimGroup = new THREE.Group();
    this.aimGroup.name = 'aim_group';

    // 1. Shortened, Elegant Dotted Arc Guideline (Length ~1.0m)
    const lineGeo = new THREE.BufferGeometry();
    const count = 16;
    const positions = new Float32Array(count * 3);
    lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const lineMat = new THREE.LineDashedMaterial({
      color: 0xffea78,
      dashSize: 0.08,
      gapSize: 0.05,
      linewidth: 3,
      transparent: true,
      opacity: 0.95
    });

    this.aimLine = new THREE.Line(lineGeo, lineMat);
    this.aimLine.computeLineDistances();
    this.aimGroup.add(this.aimLine);

    // 2. Compact Directional Arrow / Chevron at the tip of the guideline
    const chevronGeo = new THREE.ConeGeometry(0.06, 0.16, 3);
    const chevronMat = new THREE.MeshBasicMaterial({
      color: 0xffdd44,
      transparent: true,
      opacity: 0.9
    });
    this.aimChevron = new THREE.Mesh(chevronGeo, chevronMat);
    this.aimChevron.rotation.x = Math.PI / 2;
    this.aimGroup.add(this.aimChevron);

    // 3. Compact Target Ring Indicator
    const ringGeo = new THREE.RingGeometry(0.08, 0.12, 20);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff5555,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    this.aimTargetRing = new THREE.Mesh(ringGeo, ringMat);
    this.aimTargetRing.rotation.x = -Math.PI / 2;
    this.aimTargetRing.position.y = 0.02;
    this.aimGroup.add(this.aimTargetRing);

    // 4. Hit Point Contact Dot on Pen
    const hitDotGeo = new THREE.SphereGeometry(0.038, 12, 12);
    const hitDotMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
    this.hitPointMarker = new THREE.Mesh(hitDotGeo, hitDotMat);
    this.hitPointMarker.position.y = 0.06;
    this.aimGroup.add(this.hitPointMarker);

    this.aimGroup.visible = false;
    scene.add(this.aimGroup);
  }

  bindDOM() {
    // Top HUD Elements
    this.elTurnBanner = document.getElementById('turn-banner');
    this.elTurnText = document.getElementById('turn-text');
    this.elP1Score = document.getElementById('p1-score');
    this.elP2Score = document.getElementById('p2-score');
    this.elP1Name = document.getElementById('p1-name');
    this.elP2Name = document.getElementById('p2-name');
    this.elStatusMsg = document.getElementById('status-msg');

    // Minimal Power Bar Elements
    this.elPowerBar = document.getElementById('oscillating-power-bar');
    this.elPowerFill = document.getElementById('osc-power-fill');
    this.elPowerMarker = document.getElementById('osc-power-marker');
    this.elPowerPercent = document.getElementById('osc-power-val');
    this.elPowerZoneText = document.getElementById('osc-power-zone');

    // Practice Bar Elements
    this.elPracticeBar = document.getElementById('practice-bar');

    // Clicking / Tapping Power Bar locks power & shoots
    if (this.elPowerBar) {
      this.elPowerBar.addEventListener('click', (e) => {
        e.preventDefault();
        this.triggerTimedFlick();
      });
    }

    // Hitpoint mode buttons (Spin vs Drive)
    document.querySelectorAll('.mode-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playClick();
        document.querySelectorAll('.mode-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.hitOffset = parseFloat(btn.dataset.offset);
        this.update3DGuides();
      });
    });

    // Practice Toolbar Buttons
    this.bindClick('btn-practice-single', () => this.gm.setPracticeSubmode('single', 1));
    this.bindClick('btn-practice-multi', () => this.gm.setPracticeSubmode('multi', 3));
    this.bindClick('btn-practice-bot', () => this.gm.setPracticeSubmode('bot', 1));
    this.bindClick('btn-practice-reset', () => this.gm.setupRound());
    this.bindClick('btn-practice-exit', () => {
      this.setPracticeModeVisible(false);
      this.showMainMenu();
    });

    // Top actions
    this.bindClick('btn-toggle-sound', () => {
      const isMuted = sound.toggleMute();
      const icon = document.getElementById('sound-icon');
      if (icon) icon.textContent = isMuted ? '🔇' : '🔊';
    });

    this.bindClick('btn-pause-menu', () => this.togglePauseMenu(true));
    this.bindClick('btn-resume', () => this.togglePauseMenu(false));
    this.bindClick('btn-restart-match', () => {
      this.togglePauseMenu(false);
      this.gm.restartMatch();
    });
    this.bindClick('btn-quit-menu', () => {
      this.togglePauseMenu(false);
      this.showMainMenu();
    });

    // Main Menu Buttons
    this.bindClick('menu-btn-ai', () => this.gm.startQuickMatch('medium'));
    this.bindClick('menu-btn-multiplayer', () => this.showMultiplayerModal());
    this.bindClick('menu-btn-practice', () => this.showPracticeModal());
    this.bindClick('menu-btn-challenges', () => this.showChallengesModal());
    this.bindClick('menu-btn-locker', () => this.showLockerModal());
    this.bindClick('menu-btn-rules', () => this.showRulesModal());

    // Camera Switch Buttons
    this.bindClick('btn-cam-bench', () => {
      this.gm.classroom.setCameraMode('bench');
      this.updateCamBtn('btn-cam-bench');
    });
    this.bindClick('btn-cam-top', () => {
      this.gm.classroom.setCameraMode('top');
      this.updateCamBtn('btn-cam-top');
    });
    this.bindClick('btn-cam-pen', () => {
      this.gm.classroom.setCameraMode('pencam', this.gm.getActivePen());
      this.updateCamBtn('btn-cam-pen');
    });

    // Modals Close Buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        sound.playClick();
        document.querySelectorAll('.modal-screen').forEach(m => m.classList.add('hidden'));
      });
    });
  }

  bindClick(id, handler) {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        sound.playClick();
        handler();
      });
    }
  }

  updateCamBtn(activeId) {
    ['btn-cam-bench', 'btn-cam-top', 'btn-cam-pen'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('active', id === activeId);
    });
  }

  // Smooth mouse aiming over 3D desk plane
  setupMouseAiming() {
    const canvas = this.gm.classroom.renderer.domElement;
    let isMouseDown = false;

    canvas.addEventListener('mousemove', (e) => {
      if (this.gm.isTurnInProgress || this.gm.isAiTurn) return;

      const rect = canvas.getBoundingClientRect();
      this.mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouseVec, this.gm.classroom.camera);
      const intersectionPoint = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.mousePlane, intersectionPoint)) {
        const activePen = this.gm.getActivePen();
        if (activePen && !activePen.isFalling) {
          const deltaX = intersectionPoint.x - activePen.pos.x;
          const deltaZ = intersectionPoint.z - activePen.pos.y;
          if (deltaX * deltaX + deltaZ * deltaZ > 0.05) {
            this.aimAngle = Math.atan2(deltaX, deltaZ);
            this.usedAutoLock = false;
            this.update3DGuides();
          }
        }
      }
    });

    canvas.addEventListener('mousedown', (e) => {
      if (this.gm.isTurnInProgress || this.gm.isAiTurn) return;
      isMouseDown = true;
    });

    canvas.addEventListener('mouseup', (e) => {
      if (isMouseDown && !this.gm.isTurnInProgress && !this.gm.isAiTurn) {
        isMouseDown = false;
        this.triggerTimedFlick();
      }
    });
  }

  // Simple keyboard controls
  setupKeyboardControls() {
    window.addEventListener('keydown', (e) => {
      if (this.gm.isTurnInProgress || this.gm.isAiTurn) return;

      const code = e.code;
      const key = e.key.toLowerCase();

      // SHOOT ON SPACE OR ENTER
      if (code === 'Space' || code === 'Enter') {
        e.preventDefault();
        this.triggerTimedFlick();
        return;
      }

      // AIMING KEYS
      if (code === 'ArrowLeft' || key === 'a') {
        this.keyLeft = true;
        this.usedAutoLock = false;
      } else if (code === 'ArrowRight' || key === 'd') {
        this.keyRight = true;
        this.usedAutoLock = false;
      }

      // SHOT TYPE TOGGLE: Q / W
      else if (key === 'q') {
        this.hitOffset = -0.80; // Spin Whip
        this.updateShotTypeUI('spin');
        this.showMessage("🌪️ Spin Whip (Hits Tail)");
      } else if (key === 'w') {
        this.hitOffset = 0.0; // Straight Drive
        this.updateShotTypeUI('drive');
        this.showMessage("🚀 Straight Drive (Hits Center)");
      }

      // INSTANT RESET IN PRACTICE MODE (R)
      else if (key === 'r') {
        if (this.gm.gameMode === 'practice') {
          this.gm.setupRound();
          this.showMessage("🔄 Practice Round Reset!");
        }
      }

      // LOCK-ON (L)
      else if (key === 'l') {
        this.autoAimOpponent();
      }

      // CAMERA TOGGLES (1, 2, 3)
      else if (key === '1') {
        this.gm.classroom.setCameraMode('bench');
        this.updateCamBtn('btn-cam-bench');
      } else if (key === '2') {
        this.gm.classroom.setCameraMode('top');
        this.updateCamBtn('btn-cam-top');
      } else if (key === '3') {
        this.gm.classroom.setCameraMode('pencam', this.gm.getActivePen());
        this.updateCamBtn('btn-cam-pen');
      }
    });

    window.addEventListener('keyup', (e) => {
      const code = e.code;
      const key = e.key.toLowerCase();
      if (code === 'ArrowLeft' || key === 'a') this.keyLeft = false;
      if (code === 'ArrowRight' || key === 'd') this.keyRight = false;
    });
  }

  updateShotTypeUI(type) {
    document.querySelectorAll('.mode-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === type);
    });
    this.update3DGuides();
  }

  // Smooth continuous keyboard aiming
  updateContinuousAim(dt) {
    if (this.gm.isTurnInProgress || this.gm.isAiTurn) return;

    let changed = false;
    if (this.keyLeft) {
      this.aimAngle -= this.aimTurnSpeed * dt;
      changed = true;
    }
    if (this.keyRight) {
      this.aimAngle += this.aimTurnSpeed * dt;
      changed = true;
    }

    if (changed) {
      if (this.aimAngle > Math.PI) this.aimAngle -= Math.PI * 2;
      if (this.aimAngle < -Math.PI) this.aimAngle += Math.PI * 2;
      this.update3DGuides();
    }
  }

  // Oscillating power bar update
  updatePowerBarOscillation() {
    if (this.gm.isTurnInProgress || this.gm.isAiTurn) {
      if (this.elPowerBar) this.elPowerBar.classList.add('inactive');
      return;
    }

    if (this.elPowerBar) this.elPowerBar.classList.remove('inactive');

    const time = performance.now() * 0.001 * this.powerOscillationSpeed;
    const rawVal = (Math.sin(time) + 1) / 2;
    this.oscillatingPower = 0.18 + rawVal * 0.82;

    const pct = Math.round(this.oscillatingPower * 100);

    if (this.elPowerFill) this.elPowerFill.style.width = `${pct}%`;
    if (this.elPowerMarker) this.elPowerMarker.style.left = `${pct}%`;
    if (this.elPowerPercent) this.elPowerPercent.textContent = `${pct}%`;

    if (this.elPowerZoneText) {
      if (pct > 80) {
        this.elPowerZoneText.textContent = "🔥 SMASH!";
        this.elPowerZoneText.style.color = "#ff4444";
      } else if (pct > 45) {
        this.elPowerZoneText.textContent = "⚡ POWER";
        this.elPowerZoneText.style.color = "#ffbb00";
      } else {
        this.elPowerZoneText.textContent = "🛡️ SOFT";
        this.elPowerZoneText.style.color = "#44ff44";
      }
    }
  }

  triggerTimedFlick() {
    if (this.gm.isTurnInProgress || this.gm.isAiTurn) return;

    const lockedPower = this.oscillatingPower;
    const activePen = this.gm.getActivePen();
    if (!activePen) return;

    if (this.elPowerBar) {
      this.elPowerBar.classList.add('power-flash');
      setTimeout(() => this.elPowerBar.classList.remove('power-flash'), 250);
    }

    const pct = Math.round(lockedPower * 100);
    if (pct >= 82) {
      this.showMessage(`💥 CRITICAL SMASH! (${pct}% Power)`);
    } else if (pct <= 38) {
      this.showMessage(`🛡️ CONTROLLED TAP (${pct}% Power)`);
    } else {
      this.showMessage(`⚡ SOLID FLICK (${pct}% Power)`);
    }

    const forceDir = new THREE.Vector2(Math.sin(this.aimAngle), Math.cos(this.aimAngle));
    this.hide3DGuides();
    this.gm.onPlayerFlick(forceDir, lockedPower, this.hitOffset, this.usedAutoLock);
    this.usedAutoLock = false;
  }

  autoAimOpponent() {
    const activePen = this.gm.getActivePen();
    const opponentPen = this.gm.getOpponentPen();
    if (!activePen || !opponentPen) return;

    const dir = new THREE.Vector2().subVectors(opponentPen.pos, activePen.pos).normalize();
    this.aimAngle = Math.atan2(dir.x, dir.y);
    this.usedAutoLock = true;
    this.update3DGuides();
    this.showMessage("🎯 Locked onto Opponent Pen!");
  }

  // SHORTENED, COMPACT & CLEAN 3D AIM GUIDELINES
  update3DGuides() {
    const activePen = this.gm.getActivePen();
    if (!activePen || this.gm.isTurnInProgress || this.gm.isAiTurn) {
      this.hide3DGuides();
      return;
    }

    const { dir } = activePen.getEndpoints();
    const hitDist = this.hitOffset * activePen.halfLength;
    const contactPos = new THREE.Vector2(
      activePen.pos.x + dir.x * hitDist,
      activePen.pos.y + dir.y * hitDist
    );

    // Update Contact Marker
    this.hitPointMarker.position.set(contactPos.x, 0.08, contactPos.y);

    // Shortened length: ~1.15 meters
    const shortRange = 1.15;
    const shotDir = new THREE.Vector2(Math.sin(this.aimAngle), Math.cos(this.aimAngle));

    const positions = this.aimLine.geometry.attributes.position.array;
    const segments = 16;
    for (let i = 0; i < segments; i++) {
      const t = i / (segments - 1);
      const px = contactPos.x + shotDir.x * shortRange * t;
      const pz = contactPos.y + shotDir.y * shortRange * t;
      const py = 0.04;

      positions[i * 3] = px;
      positions[i * 3 + 1] = py;
      positions[i * 3 + 2] = pz;
    }
    this.aimLine.geometry.attributes.position.needsUpdate = true;
    this.aimLine.computeLineDistances();

    // Position Chevron at the end of the short line pointing forward
    const targetX = contactPos.x + shotDir.x * shortRange;
    const targetZ = contactPos.y + shotDir.y * shortRange;
    this.aimChevron.position.set(targetX, 0.04, targetZ);
    this.aimChevron.rotation.y = this.aimAngle + Math.PI;

    // Small target dot
    this.aimTargetRing.position.set(targetX, 0.03, targetZ);

    this.aimGroup.visible = true;
  }

  hide3DGuides() {
    if (this.aimGroup) this.aimGroup.visible = false;
  }

  setPracticeModeVisible(visible) {
    if (this.elPracticeBar) {
      this.elPracticeBar.classList.toggle('hidden', !visible);
    }
  }

  // -------------------------------------------------------------
  // MULTIPLAYER LOBBY BINDINGS (2, 3, 4 PLAYERS)
  // -------------------------------------------------------------
  bindMultiplayerLobby() {
    let mpSelectedCount = 2;

    const populatePlayerSwatches = (pKey, penId, preselectedColor = null) => {
      const swatchContainer = document.getElementById(`mp-colors-${pKey}`);
      if (!swatchContainer) return;

      const penData = PEN_CATALOG.find(p => p.id === penId) || PEN_CATALOG[0];
      const colors = (penData && penData.colors && penData.colors.length > 0) ? penData.colors : ['#0044cc', '#cc1122', '#118833', '#111111'];

      swatchContainer.innerHTML = '';
      const chosenColor = preselectedColor && colors.includes(preselectedColor) ? preselectedColor : colors[0];

      colors.forEach((colHex) => {
        const swatch = document.createElement('button');
        swatch.className = `mp-swatch ${colHex === chosenColor ? 'active' : ''}`;
        swatch.dataset.color = colHex;
        swatch.style.backgroundColor = colHex;
        swatch.title = `Color: ${colHex}`;

        swatch.addEventListener('click', (e) => {
          e.preventDefault();
          sound.playClick();
          swatchContainer.querySelectorAll('.mp-swatch').forEach(s => s.classList.remove('active'));
          swatch.classList.add('active');
        });

        swatchContainer.appendChild(swatch);
      });
    };

    // Initialize swatches for all 4 player cards and bind dropdown change listeners
    ['p1', 'p2', 'p3', 'p4'].forEach(pKey => {
      const penSelect = document.getElementById(`mp-pen-${pKey}`);
      if (penSelect) {
        populatePlayerSwatches(pKey, penSelect.value);
        penSelect.addEventListener('change', () => {
          sound.playClick();
          populatePlayerSwatches(pKey, penSelect.value);
        });
      }
    });

    const selectPlayerCount = (count, titleText) => {
      mpSelectedCount = count;
      document.getElementById('mp-step-choose-count').classList.add('hidden');
      document.getElementById('mp-step-setup-players').classList.remove('hidden');

      const titleEl = document.getElementById('mp-modal-title');
      const subEl = document.getElementById('mp-modal-subtitle');
      if (titleEl) titleEl.textContent = `👥 ${count}-PLAYER MATCH SETUP`;
      if (subEl) subEl.textContent = "Customize player profiles, names, and pens";

      const label = document.getElementById('mp-current-mode-label');
      if (label) label.textContent = titleText;

      // Show strictly the selected number of player cards
      document.getElementById('mp-card-p1').classList.remove('hidden');
      document.getElementById('mp-card-p2').classList.remove('hidden');
      document.getElementById('mp-card-p3').classList.toggle('hidden', count < 3);
      document.getElementById('mp-card-p4').classList.toggle('hidden', count < 4);
    };

    // Step 1 buttons
    this.bindClick('btn-select-2p', () => selectPlayerCount(2, '🎮 2-Player Match Setup'));
    this.bindClick('btn-select-3p', () => selectPlayerCount(3, '🎮 3-Player Match Setup (Triangle)'));
    this.bindClick('btn-select-4p', () => selectPlayerCount(4, '🎮 4-Player Match Setup (4 Corners)'));

    // Back to count selection
    this.bindClick('btn-mp-back-to-count', () => {
      document.getElementById('mp-step-choose-count').classList.remove('hidden');
      document.getElementById('mp-step-setup-players').classList.add('hidden');
      const titleEl = document.getElementById('mp-modal-title');
      const subEl = document.getElementById('mp-modal-subtitle');
      if (titleEl) titleEl.textContent = "👥 MULTIPLAYER";
      if (subEl) subEl.textContent = "Select your player mode to continue";
    });

    // Start Multiplayer Battle Button
    this.bindClick('btn-start-mp-match', () => {
      const configs = [];
      for (let i = 1; i <= mpSelectedCount; i++) {
        const pKey = `p${i}`;
        const nameInput = document.getElementById(`mp-name-${pKey}`);
        const penSelect = document.getElementById(`mp-pen-${pKey}`);
        const activeSwatch = document.querySelector(`#mp-colors-${pKey} .mp-swatch.active`);

        const name = (nameInput && nameInput.value.trim()) || `Player ${i}`;
        const penId = (penSelect && penSelect.value) || 'reynolds045';
        const color = (activeSwatch && activeSwatch.dataset.color) || '#0044cc';

        configs.push({
          id: pKey,
          name: name,
          penId: penId,
          color: color,
          capPos: 'back'
        });
      }

      document.getElementById('multiplayer-modal').classList.add('hidden');
      this.hideMainMenu();
      this.setPracticeModeVisible(false);
      this.gm.startMultiplayerMatch(configs);
    });
  }

  // Update Dynamic Scoreboard for 2, 3, or 4 Players
  updateHUD(p1Score, p2Score, activePlayer, p1Name = 'Player 1', p2Name = 'Opponent') {
    const p1Card = document.getElementById('p1-card');
    const p2Card = document.getElementById('p2-card');
    const p3Card = document.getElementById('p3-card');
    const p4Card = document.getElementById('p4-card');
    const vs1 = document.getElementById('vs-badge-1');
    const vs2 = document.getElementById('vs-badge-2');
    const vs3 = document.getElementById('vs-badge-3');

    if (this.gm.gameMode === 'multiplayer' && this.gm.players) {
      const count = this.gm.players.length;

      if (p1Card) { p1Card.classList.remove('hidden'); p1Card.style.display = 'flex'; }
      if (p2Card) { p2Card.classList.remove('hidden'); p2Card.style.display = 'flex'; }

      if (p3Card) {
        p3Card.classList.toggle('hidden', count < 3);
        p3Card.style.display = count >= 3 ? 'flex' : 'none';
      }
      if (p4Card) {
        p4Card.classList.toggle('hidden', count < 4);
        p4Card.style.display = count >= 4 ? 'flex' : 'none';
      }

      // VS Badges between players: P1 VS P2 VS P3 VS P4
      if (vs1) { vs1.classList.remove('hidden'); vs1.style.display = 'block'; }
      if (vs2) {
        vs2.classList.toggle('hidden', count < 3);
        vs2.style.display = count >= 3 ? 'block' : 'none';
      }
      if (vs3) {
        vs3.classList.toggle('hidden', count < 4);
        vs3.style.display = count >= 4 ? 'block' : 'none';
      }

      this.gm.players.forEach((p, idx) => {
        const card = document.getElementById(`p${idx + 1}-card`);
        const nameEl = document.getElementById(`p${idx + 1}-name`);
        const scoreEl = document.getElementById(`p${idx + 1}-score`);

        if (nameEl) nameEl.textContent = p.name;
        if (scoreEl) scoreEl.textContent = '★'.repeat(p.score) + '☆'.repeat(Math.max(0, 3 - p.score));

        if (card) {
          card.style.opacity = p.eliminated ? '0.35' : '1.0';
          card.style.transform = (idx === this.gm.activePlayerIndex) ? 'scale(1.08)' : 'scale(1.0)';
        }
      });

      const currPlayer = this.gm.players[this.gm.activePlayerIndex];
      if (this.elTurnText && currPlayer) {
        this.elTurnText.textContent = `${currPlayer.name}'s Turn (Press SPACE to Flick!)`;
        this.elTurnBanner.className = `turn-p${this.gm.activePlayerIndex + 1}`;
      }
      return;
    }

    // Standard 2P / AI / Practice HUD
    if (p1Card) { p1Card.classList.remove('hidden'); p1Card.style.display = 'flex'; }
    if (p2Card) { p2Card.classList.remove('hidden'); p2Card.style.display = 'flex'; }
    if (p3Card) { p3Card.classList.add('hidden'); p3Card.style.display = 'none'; }
    if (p4Card) { p4Card.classList.add('hidden'); p4Card.style.display = 'none'; }
    if (vs1) { vs1.classList.remove('hidden'); vs1.style.display = 'block'; }
    if (vs2) { vs2.classList.add('hidden'); vs2.style.display = 'none'; }
    if (vs3) { vs3.classList.add('hidden'); vs3.style.display = 'none'; }

    if (this.elP1Score) this.elP1Score.textContent = '★'.repeat(p1Score) + '☆'.repeat(Math.max(0, 3 - p1Score));
    if (this.elP2Score) this.elP2Score.textContent = '★'.repeat(p2Score) + '☆'.repeat(Math.max(0, 3 - p2Score));
    if (this.elP1Name) this.elP1Name.textContent = p1Name;
    if (this.elP2Name) this.elP2Name.textContent = p2Name;

    if (this.elTurnText) {
      if (this.gm.gameMode === 'practice') {
        this.elTurnText.textContent = "🎓 Practice Mode: Aim with Mouse/[A/D] & Press [SPACE] to Flick";
        this.elTurnBanner.className = 'turn-p1';
      } else if (activePlayer === 'player1') {
        this.elTurnText.textContent = `${p1Name}'s Turn (Press SPACE to Flick!)`;
        this.elTurnBanner.className = 'turn-p1';
      } else {
        this.elTurnText.textContent = `${p2Name}'s Turn...`;
        this.elTurnBanner.className = 'turn-p2';
      }
    }
  }

  showMessage(msg) {
    if (this.elStatusMsg) {
      this.elStatusMsg.textContent = msg;
      this.elStatusMsg.classList.remove('fade');
      void this.elStatusMsg.offsetWidth;
      this.elStatusMsg.classList.add('fade');
    }
  }

  showRoundResult(winner, p1Score, p2Score) {
    this.showMessage(winner === 'player1' ? "🏆 P1 SCORED A KNOCKOUT!" : "💥 OPPONENT SCORED A KNOCKOUT!");
    this.updateHUD(p1Score, p2Score, this.gm.activePlayer, this.gm.p1Name, this.gm.p2Name);
  }

  showMatchEndModal(winner, p1Score, p2Score) {
    sound.playVictory();
    confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 } });

    const modal = document.getElementById('match-end-modal');
    const title = document.getElementById('match-end-title');
    const subtitle = document.getElementById('match-end-subtitle');

    if (this.gm.gameMode === 'multiplayer') {
      title.textContent = `🏆 ${winner.name} WINS!`;
      title.style.color = "#ffea78";
      subtitle.textContent = `Champion of the Classroom Desk with ${winner.score} knockout points!`;
    } else if (winner === 'player1') {
      title.textContent = "🏆 CLASSROOM CHAMPION!";
      title.style.color = "#ffea78";
      subtitle.textContent = `You defeated ${this.gm.p2Name} ${p1Score} - ${p2Score}! Vintage Legend!`;
    } else {
      title.textContent = "💔 KNOCKED OFF BENCH!";
      title.style.color = "#ff6b6b";
      subtitle.textContent = `${this.gm.p2Name} won ${p2Score} - ${p1Score}. Better luck next period!`;
    }

    if (modal) modal.classList.remove('hidden');
  }

  showMainMenu() {
    document.querySelectorAll('.modal-screen').forEach(m => m.classList.add('hidden'));
    const menu = document.getElementById('main-menu');
    if (menu) menu.classList.remove('hidden');
  }

  hideMainMenu() {
    const menu = document.getElementById('main-menu');
    if (menu) menu.classList.add('hidden');
  }

  togglePauseMenu(show) {
    const pause = document.getElementById('pause-modal');
    if (pause) pause.classList.toggle('hidden', !show);
  }

  showMultiplayerModal() {
    const modal = document.getElementById('multiplayer-modal');
    if (modal) {
      document.getElementById('mp-step-choose-count').classList.remove('hidden');
      document.getElementById('mp-step-setup-players').classList.add('hidden');
      const titleEl = document.getElementById('mp-modal-title');
      const subEl = document.getElementById('mp-modal-subtitle');
      if (titleEl) titleEl.textContent = "👥 MULTIPLAYER";
      if (subEl) subEl.textContent = "Select your player mode to continue";
      modal.classList.remove('hidden');
    }
  }

  showPracticeModal() {
    const modal = document.getElementById('practice-modal');
    if (modal) modal.classList.remove('hidden');
  }

  showChallengesModal() {
    const modal = document.getElementById('challenges-modal');
    if (modal) modal.classList.remove('hidden');
  }

  showLockerModal() {
    const modal = document.getElementById('locker-modal');
    if (modal) {
      modal.classList.remove('hidden');
      if (this.gm.locker) {
        this.gm.locker.onOpen();
      }
    }
  }

  showRulesModal() {
    const modal = document.getElementById('rules-modal');
    if (modal) modal.classList.remove('hidden');
  }
}
