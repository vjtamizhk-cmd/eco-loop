import * as THREE from 'three';
import { ClassroomScene } from '../scene/ClassroomScene.js';
import { PenModelBuilder, PEN_CATALOG } from '../pens/PenModels.js';
import { PenPhysicsObject, PenPhysicsWorld } from '../pens/PenPhysics.js';
import { AIController } from './AIController.js';
import { UIManager } from '../ui/UIManager.js';
import { LockerManager } from '../ui/LockerManager.js';
import { TRICK_CHALLENGES } from './GameData.js';
import { sound } from '../audio/SoundEngine.js';

export class GameManager {
  constructor() {
    this.canvasContainer = document.getElementById('canvas-container');
    this.classroom = new ClassroomScene(this.canvasContainer);
    this.physicsWorld = new PenPhysicsWorld();
    this.physicsWorld.onCollisionCallback = (pos2D, speed) => {
      this.classroom.triggerCollisionEffects(pos2D, speed);
    };
    this.physicsWorld.onRampOverCallback = (striker, defender) => {
      this.classroom.triggerCollisionEffects(defender.pos, 1.5);
      const strikerName = this.getActivePenName(striker);
      this.ui.showMessage(`🚀 RAMP OVER! ${strikerName} flew high over the opponent and crashed off the desk!`);
    };
    this.ai = new AIController('medium');

    // Player 1 Config
    this.p1PenId = 'reynolds045';
    this.p1Color = '#0044cc';
    this.p1CapPos = 'back';
    this.p1Name = 'Player 1';

    // Player 2 / AI Config
    this.p2PenId = 'cello_gripper';
    this.p2Color = '#222222';
    this.p2CapPos = 'back';
    this.p2Name = 'Opponent';

    // Multiplayer 2, 3, 4 Player Configs
    this.players = [];
    this.playerPenObjs = [];
    this.activePlayerIndex = 0;

    // Game Mode & Rules
    this.gameMode = 'quick_match';
    this.practiceSubmode = 'single'; // 'single', 'multi', 'bot'
    this.practiceDummyCount = 1;
    this.activePlayer = 'player1'; // 'player1', 'player2'
    this.isAiTurn = false;
    this.isTurnInProgress = false;

    this.p1Score = 0;
    this.p2Score = 0;
    this.targetScore = 3;
    this.turnCount = 0;

    // Challenge State
    this.currentChallengeIndex = 0;
    this.challengeShotsUsed = 0;

    // Active Pen Physics Objects
    this.p1PenObj = null;
    this.p2PenObj = null;
    this.extraTargetObjs = [];

    // UI & Locker
    this.ui = new UIManager(this);
    this.locker = new LockerManager(this);

    this.clock = new THREE.Clock();
    this.initGameLoop();
  }

  // Equip pen from Pen Locker
  setPlayerPenConfig(penId, color, capPos) {
    this.p1PenId = penId;
    this.p1Color = color;
    this.p1CapPos = capPos;
    if (this.gameMode !== 'multiplayer') {
      this.setupRound();
    }
  }

  getActivePenName(penObj) {
    if (this.gameMode === 'multiplayer' && this.players) {
      const idx = this.playerPenObjs.indexOf(penObj);
      if (idx !== -1 && this.players[idx]) return this.players[idx].name;
    }
    return penObj.owner === 'player1' ? this.p1Name : this.p2Name;
  }

  startQuickMatch(difficulty = 'medium') {
    sound.init();
    this.gameMode = 'quick_match';
    this.p1Name = 'Player';
    this.p2Name = difficulty === 'easy' ? 'Bunty (Rookie)' : (difficulty === 'hard' ? 'Rocky (Champ)' : 'Pooja (Topper)');
    this.p2PenId = difficulty === 'easy' ? 'natraj_pencil' : (difficulty === 'hard' ? 'parker_vector' : 'cello_gripper');
    this.p2Color = difficulty === 'easy' ? '#ff9800' : (difficulty === 'hard' ? '#333333' : '#222222');
    this.ai.setDifficulty(difficulty);
    this.targetScore = 3;

    this.ui.hideMainMenu();
    this.ui.setPracticeModeVisible(false);
    this.restartMatch();
  }

  // Start 2, 3, or 4 Player Pass & Play Match
  startMultiplayerMatch(playerConfigs) {
    sound.init();
    this.gameMode = 'multiplayer';
    this.players = playerConfigs.map(cfg => ({
      ...cfg,
      score: 0,
      eliminated: false
    }));
    this.activePlayerIndex = 0;
    this.targetScore = 3;

    this.ui.hideMainMenu();
    this.ui.setPracticeModeVisible(false);
    this.restartMatch();
  }

  startChallenge(challengeIdx) {
    sound.init();
    this.gameMode = 'challenges';
    this.currentChallengeIndex = challengeIdx;
    this.challengeShotsUsed = 0;

    document.getElementById('challenges-modal').classList.add('hidden');
    this.ui.hideMainMenu();
    this.ui.setPracticeModeVisible(false);
    this.restartMatch();
  }

  startPracticeMode(submode = 'single', dummyCount = 1) {
    sound.init();
    this.gameMode = 'practice';
    this.practiceSubmode = submode;
    this.practiceDummyCount = dummyCount;
    this.p1Name = 'Player';
    this.p2Name = submode === 'bot' ? 'Practice Bot' : 'Dummy Pen';

    document.getElementById('practice-modal').classList.add('hidden');
    this.ui.hideMainMenu();
    this.ui.setPracticeModeVisible(true);
    this.restartMatch();
  }

  setPracticeSubmode(submode, dummyCount = 1) {
    this.practiceSubmode = submode;
    this.practiceDummyCount = dummyCount;
    this.p2Name = submode === 'bot' ? 'Practice Bot' : (dummyCount > 1 ? `${dummyCount} Dummies` : 'Dummy Pen');
    this.setupRound();
    this.ui.showMessage(`🎯 Practice: ${submode.toUpperCase()} (${dummyCount} Pen${dummyCount > 1 ? 's' : ''})`);
  }

  restartMatch() {
    this.p1Score = 0;
    this.p2Score = 0;
    if (this.players) {
      this.players.forEach(p => p.score = 0);
    }
    this.turnCount = 0;
    this.activePlayerIndex = 0;
    this.activePlayer = 'player1';
    this.isAiTurn = false;
    this.isTurnInProgress = false;

    sound.playSchoolBell();
    this.setupRound();
  }

  // Synchronize 3D scene props with physical OBB obstacles in physics world
  syncDeskPropsToPhysics() {
    this.physicsWorld.clearObstacles();

    if (this.gameMode === 'challenges') {
      const ch = TRICK_CHALLENGES[this.currentChallengeIndex];
      const p = ch.props || {};

      // Camlin Geometry Box
      if (p.geomBox && p.geomBox.visible) {
        this.classroom.geomBox.visible = true;
        this.classroom.geomBox.position.set(p.geomBox.x, 0.06, p.geomBox.z);
        this.classroom.geomBox.rotation.y = p.geomBox.angle || 0;
        this.physicsWorld.addObstacle({
          type: 'box',
          pos: { x: p.geomBox.x, y: p.geomBox.z },
          size: { x: 1.6, y: 0.9 },
          angle: p.geomBox.angle || 0,
          bounce: 0.78
        });
      } else {
        this.classroom.geomBox.visible = false;
      }

      // Natraj Eraser
      if (p.eraser && p.eraser.visible) {
        this.classroom.eraser.visible = true;
        this.classroom.eraser.position.set(p.eraser.x, 0.06, p.eraser.z);
        this.classroom.eraser.rotation.y = p.eraser.angle || 0;
        this.physicsWorld.addObstacle({
          type: 'box',
          pos: { x: p.eraser.x, y: p.eraser.z },
          size: { x: 0.7, y: 0.38 },
          angle: p.eraser.angle || 0,
          bounce: 0.65
        });
      } else {
        this.classroom.eraser.visible = false;
      }

      // 30cm Wooden Ruler
      if (p.ruler && p.ruler.visible) {
        this.classroom.ruler.visible = true;
        this.classroom.ruler.position.set(p.ruler.x, 0.01, p.ruler.z);
        this.classroom.ruler.rotation.y = p.ruler.angle || 0;
        this.physicsWorld.addObstacle({
          type: 'box',
          pos: { x: p.ruler.x, y: p.ruler.z },
          size: { x: 2.8, y: 0.35 },
          angle: p.ruler.angle || 0,
          bounce: 0.78
        });
      } else {
        this.classroom.ruler.visible = false;
      }

      // School Notebook
      if (p.notebook && p.notebook.visible) {
        this.classroom.notebook.visible = true;
        this.classroom.notebook.position.set(p.notebook.x, 0.025, p.notebook.z);
        this.classroom.notebook.rotation.y = p.notebook.angle || 0;
        this.physicsWorld.addObstacle({
          type: 'box',
          pos: { x: p.notebook.x, y: p.notebook.z },
          size: { x: 2.0, y: 2.4 },
          angle: p.notebook.angle || 0,
          bounce: 0.45
        });
      } else {
        this.classroom.notebook.visible = false;
      }
    } else {
      // Standard Classroom Props active on desk in Quick Match, 2P, 3P, 4P, Practice
      this.classroom.geomBox.visible = true;
      this.classroom.geomBox.position.set(2.6, 0.06, -1.6);
      this.classroom.geomBox.rotation.y = -0.25;
      this.physicsWorld.addObstacle({
        type: 'box',
        pos: { x: 2.6, y: -1.6 },
        size: { x: 1.6, y: 0.9 },
        angle: -0.25,
        bounce: 0.78
      });

      this.classroom.eraser.visible = true;
      this.classroom.eraser.position.set(-2.5, 0.06, -1.5);
      this.classroom.eraser.rotation.y = 0.4;
      this.physicsWorld.addObstacle({
        type: 'box',
        pos: { x: -2.5, y: -1.5 },
        size: { x: 0.7, y: 0.38 },
        angle: 0.4,
        bounce: 0.65
      });

      // Compact Scale on Top Long End (Behind Opponent / Bot)
      if (this.classroom.rulerTop) {
        this.classroom.rulerTop.visible = true;
        this.classroom.rulerTop.position.set(0.0, 0.01, -2.25);
        this.classroom.rulerTop.rotation.y = 0.02;
        this.physicsWorld.addObstacle({
          type: 'box',
          pos: { x: 0.0, y: -2.25 },
          size: { x: 2.4, y: 0.22 },
          angle: 0.02,
          bounce: 0.82
        });
      }

      // Compact Scale on Bottom Long End (Behind Player 1 - Deflects & Saves from 1-Shot Knockouts)
      if (this.classroom.rulerBottom) {
        this.classroom.rulerBottom.visible = true;
        this.classroom.rulerBottom.position.set(0.0, 0.01, 2.25);
        this.classroom.rulerBottom.rotation.y = -0.02;
        this.physicsWorld.addObstacle({
          type: 'box',
          pos: { x: 0.0, y: 2.25 },
          size: { x: 2.4, y: 0.22 },
          angle: -0.02,
          bounce: 0.82
        });
      }

      this.classroom.notebook.visible = false;
    }
  }

  setupRound() {
    // 1. Remove old pens from scene & physics
    if (this.p1PenObj) {
      this.classroom.scene.remove(this.p1PenObj.mesh);
      this.physicsWorld.removePen(this.p1PenObj);
    }
    if (this.p2PenObj) {
      this.classroom.scene.remove(this.p2PenObj.mesh);
      this.physicsWorld.removePen(this.p2PenObj);
    }
    this.playerPenObjs.forEach(p => {
      if (p && p.mesh) {
        this.classroom.scene.remove(p.mesh);
        this.physicsWorld.removePen(p);
      }
    });
    this.playerPenObjs = [];

    this.extraTargetObjs.forEach(t => {
      this.classroom.scene.remove(t.mesh);
      this.physicsWorld.removePen(t);
    });
    this.extraTargetObjs = [];

    // 2. Synchronize Physical Obstacles with 3D Scene
    this.syncDeskPropsToPhysics();

    // 3. Mode-specific entities
    if (this.gameMode === 'multiplayer') {
      this.setupMultiplayerEntities();
    } else if (this.gameMode === 'challenges') {
      this.setupSinglePlayerPen();
      this.setupChallengeEntities();
    } else if (this.gameMode === 'practice') {
      this.setupSinglePlayerPen();
      this.setupPracticeEntities();
    } else {
      this.setupSinglePlayerPen();
      this.setupVsOpponentPen();
    }

    this.isTurnInProgress = false;
    this.isAiTurn = (this.gameMode !== 'two_player' && this.gameMode !== 'multiplayer' && this.gameMode !== 'practice') && this.activePlayer === 'player2';

    if (this.gameMode === 'practice' && this.practiceSubmode === 'bot') {
      this.isAiTurn = this.activePlayer === 'player2';
    }

    this.ui.updateHUD(this.p1Score, this.p2Score, this.activePlayer, this.p1Name, this.p2Name);
    this.ui.update3DGuides();

    if (this.isAiTurn) {
      this.scheduleAITurn();
    }
  }

  setupSinglePlayerPen() {
    const p1Data = PEN_CATALOG.find(p => p.id === this.p1PenId) || PEN_CATALOG[0];
    const p1Mesh = PenModelBuilder.createPenMesh(this.p1PenId, {
      color: this.p1Color,
      capPos: this.p1CapPos
    });
    this.classroom.scene.add(p1Mesh);

    this.p1PenObj = new PenPhysicsObject(p1Mesh, {
      id: 'p1',
      owner: 'player1',
      length: p1Data.length,
      radius: p1Data.radius,
      stats: p1Data.stats
    });
    this.p1PenObj.setPosition(0, 1.05, 0);
    this.physicsWorld.addPen(this.p1PenObj);
  }

  setupVsOpponentPen() {
    const p2Data = PEN_CATALOG.find(p => p.id === this.p2PenId) || PEN_CATALOG[1];
    const p2Mesh = PenModelBuilder.createPenMesh(this.p2PenId, {
      color: this.p2Color,
      capPos: this.p2CapPos
    });
    this.classroom.scene.add(p2Mesh);

    this.p2PenObj = new PenPhysicsObject(p2Mesh, {
      id: 'p2',
      owner: 'ai',
      length: p2Data.length,
      radius: p2Data.radius,
      stats: p2Data.stats
    });
    this.p2PenObj.setPosition(0, -1.05, Math.PI);
    this.physicsWorld.addPen(this.p2PenObj);
  }

  // Setup 2, 3, or 4 Players in Geometric Formations
  setupMultiplayerEntities() {
    const count = this.players.length;
    this.players.forEach(p => p.eliminated = false);

    // Initial Geometric Positions on Desk (Safely clear of the scales)
    const positions = [
      // P1 (Bottom Center or Bottom Left)
      count === 2 ? { x: 0, z: 1.05, a: 0 } : (count === 3 ? { x: 0, z: 1.05, a: 0 } : { x: -1.4, z: 0.85, a: 0.4 }),
      // P2 (Top Center or Top Left)
      count === 2 ? { x: 0, z: -1.05, a: Math.PI } : (count === 3 ? { x: -1.5, z: -0.85, a: 2.35 } : { x: 1.4, z: 0.85, a: -0.4 }),
      // P3 (Top Right or Bottom Right)
      count === 3 ? { x: 1.5, z: -0.85, a: -2.35 } : { x: -1.4, z: -0.85, a: 2.7 },
      // P4 (Top Right)
      { x: 1.4, z: -0.85, a: -2.7 }
    ];

    this.playerPenObjs = [];

    this.players.forEach((p, idx) => {
      const penData = PEN_CATALOG.find(cat => cat.id === p.penId) || PEN_CATALOG[idx % PEN_CATALOG.length];
      const mesh = PenModelBuilder.createPenMesh(p.penId, {
        color: p.color,
        capPos: p.capPos || 'back'
      });
      this.classroom.scene.add(mesh);

      const penObj = new PenPhysicsObject(mesh, {
        id: `mp_${p.id}`,
        owner: p.id,
        length: penData.length,
        radius: penData.radius,
        stats: penData.stats
      });

      const pos = positions[idx];
      penObj.setPosition(pos.x, pos.z, pos.a);
      this.physicsWorld.addPen(penObj);
      this.playerPenObjs.push(penObj);
    });

    this.activePlayerIndex = 0;
    this.p1PenObj = this.playerPenObjs[0];
    this.p2PenObj = this.playerPenObjs[1];
  }

  setupPracticeEntities() {
    this.p1PenObj.setPosition(0, 1.05, 0);

    if (this.practiceSubmode === 'single' || this.practiceSubmode === 'bot') {
      const dummyMesh = PenModelBuilder.createPenMesh('cello_gripper', { color: '#e53935', capPos: 'back' });
      this.classroom.scene.add(dummyMesh);
      this.p2PenObj = new PenPhysicsObject(dummyMesh, {
        id: 'dummy_1',
        owner: this.practiceSubmode === 'bot' ? 'ai' : 'target',
        length: 1.45,
        radius: 0.045
      });
      this.p2PenObj.setPosition(0, -0.85, Math.PI);
      this.physicsWorld.addPen(this.p2PenObj);
    } else if (this.practiceSubmode === 'multi') {
      const count = this.practiceDummyCount || 3;
      const offsets = [
        { x: -1.2, z: -0.65, a: 0.2 },
        { x: 0, z: -0.95, a: Math.PI },
        { x: 1.2, z: -0.65, a: -0.2 },
        { x: 0, z: -0.15, a: 1.57 }
      ];

      for (let i = 0; i < count; i++) {
        const off = offsets[i % offsets.length];
        const dummyMesh = PenModelBuilder.createPenMesh(
          i === 0 ? 'cello_gripper' : (i === 1 ? 'reynolds045' : 'natraj_pencil'),
          { color: i % 2 === 0 ? '#e53935' : '#ff9800', capPos: 'back' }
        );
        this.classroom.scene.add(dummyMesh);
        const dObj = new PenPhysicsObject(dummyMesh, {
          id: `dummy_${i}`,
          owner: 'target',
          length: 1.45,
          radius: 0.045
        });
        dObj.setPosition(off.x, off.z, off.a);
        this.physicsWorld.addPen(dObj);
        if (i === 0) this.p2PenObj = dObj;
        else this.extraTargetObjs.push(dObj);
      }
    }

    this.ui.showMessage("🎓 PRACTICE MODE: Aim with Mouse/[A/D] & Press [SPACE] to Flick!");
  }

  setupChallengeEntities() {
    const ch = TRICK_CHALLENGES[this.currentChallengeIndex];
    this.p1PenObj.setPosition(ch.playerPos.x, ch.playerPos.z, ch.playerPos.angle);

    if (ch.targetPos) {
      const penType = this.currentChallengeIndex === 4 ? 'parker_vector' : 'reynolds045';
      const targetMesh = PenModelBuilder.createPenMesh(penType, { color: '#ff2222', capPos: 'back' });
      this.classroom.scene.add(targetMesh);
      this.p2PenObj = new PenPhysicsObject(targetMesh, { id: 'target_1', owner: 'target' });
      this.p2PenObj.setPosition(ch.targetPos.x, ch.targetPos.z, ch.targetPos.angle || 0);
      this.physicsWorld.addPen(this.p2PenObj);
    } else if (ch.targets) {
      ch.targets.forEach((t, i) => {
        const tMesh = PenModelBuilder.createPenMesh(i === 0 ? 'cello_gripper' : 'pilot_v5', { color: '#ff5500', capPos: 'back' });
        this.classroom.scene.add(tMesh);
        const tObj = new PenPhysicsObject(tMesh, { id: `target_${i}`, owner: 'target' });
        tObj.setPosition(t.x, t.z, t.angle || 0);
        this.physicsWorld.addPen(tObj);
        this.extraTargetObjs.push(tObj);
      });
    }

    if (ch.hint) {
      this.ui.showMessage(`${ch.title}: ${ch.hint}`);
    } else {
      this.ui.showMessage(`🎯 ${ch.title}: ${ch.desc}`);
    }
  }

  getActivePen() {
    if (this.gameMode === 'multiplayer' && this.playerPenObjs.length > 0) {
      return this.playerPenObjs[this.activePlayerIndex] || this.playerPenObjs[0];
    }
    return this.activePlayer === 'player1' ? this.p1PenObj : this.p2PenObj;
  }

  getOpponentPen() {
    if (this.gameMode === 'multiplayer' && this.playerPenObjs.length > 0) {
      // Find nearest living opponent pen
      const myPen = this.getActivePen();
      let bestDist = Infinity;
      let targetPen = null;
      this.playerPenObjs.forEach((p, idx) => {
        if (idx !== this.activePlayerIndex && !p.hasFallenOff) {
          const d = myPen.pos.distanceTo(p.pos);
          if (d < bestDist) {
            bestDist = d;
            targetPen = p;
          }
        }
      });
      return targetPen;
    }
    return this.activePlayer === 'player1' ? this.p2PenObj : this.p1PenObj;
  }

  onPlayerFlick(forceDir, rawPower, hitOffset, usedAutoLock = false) {
    if (this.isTurnInProgress || this.isAiTurn) return;

    const pen = this.getActivePen();
    if (!pen) return;

    this.isTurnInProgress = true;
    pen.applyFlick(forceDir, rawPower, hitOffset, usedAutoLock);
    this.turnCount++;

    if (this.gameMode === 'challenges') {
      this.challengeShotsUsed++;
    }
  }

  scheduleAITurn() {
    if (!this.p2PenObj || !this.p1PenObj) return;

    this.ui.showMessage(`🤖 ${this.p2Name} is sizing up the shot...`);

    setTimeout(() => {
      if (!this.p2PenObj || !this.p1PenObj || this.p2PenObj.isFalling) return;

      const shot = this.ai.calculateShot(
        this.p2PenObj,
        this.p1PenObj,
        this.physicsWorld.deskBounds,
        this.physicsWorld.obstacles
      );

      const forceDir = (shot && (shot.forceDir || shot.direction)) ? (shot.forceDir || shot.direction) : new THREE.Vector2(0, 1);
      this.isTurnInProgress = true;
      this.p2PenObj.applyFlick(forceDir, shot.power || 0.6, shot.hitOffset !== undefined ? shot.hitOffset : -0.7);
      this.turnCount++;
    }, 900);
  }

  evaluateRoundEnd() {
    // -------------------------------------------------------------
    // MULTIPLAYER PASS & PLAY ROUND EVALUATION (2, 3, 4 PLAYERS)
    // -------------------------------------------------------------
    if (this.gameMode === 'multiplayer' && this.players) {
      // Mark fallen pens as eliminated
      this.playerPenObjs.forEach((p, idx) => {
        if (p.hasFallenOff) {
          this.players[idx].eliminated = true;
        }
      });

      const livingPlayers = this.players.filter(p => !p.eliminated);

      if (livingPlayers.length <= 1) {
        // Round Winner determined!
        const winner = livingPlayers.length === 1 ? livingPlayers[0] : this.players[this.activePlayerIndex];
        winner.score++;

        sound.playVictory();
        this.ui.showMessage(`🏆 ${winner.name} WINS THE ROUND! (Last Pen Standing!)`);
        this.ui.updateHUD();

        // Check Match Victory
        if (winner.score >= this.targetScore) {
          setTimeout(() => this.onMatchWon(winner), 1200);
          return;
        }

        setTimeout(() => this.setupRound(), 2200);
      } else {
        // Cycle turn to the next living player
        let nextIdx = this.activePlayerIndex;
        let attempts = 0;
        do {
          nextIdx = (nextIdx + 1) % this.players.length;
          attempts++;
        } while (this.players[nextIdx].eliminated && attempts < this.players.length * 2);

        this.activePlayerIndex = nextIdx;
        this.isTurnInProgress = false;
        this.ui.updateHUD();
        this.ui.update3DGuides();
      }
      return;
    }

    const p1Fell = this.p1PenObj ? this.p1PenObj.hasFallenOff : false;
    const p2Fell = this.p2PenObj ? this.p2PenObj.hasFallenOff : false;

    if (this.gameMode === 'practice') {
      if (p2Fell) {
        sound.playVictory();
        this.ui.showMessage("🎯 DUMMY PEN KNOCKED OUT! Practice reset in 2s...");
        setTimeout(() => this.setupRound(), 1800);
      } else if (p1Fell) {
        this.ui.showMessage("⚠️ Your pen fell off the desk! Resetting in 2s...");
        setTimeout(() => this.setupRound(), 1800);
      } else {
        this.isTurnInProgress = false;
        if (this.practiceSubmode === 'bot') {
          this.activePlayer = this.activePlayer === 'player1' ? 'player2' : 'player1';
          this.isAiTurn = this.activePlayer === 'player2';
          if (this.isAiTurn) this.scheduleAITurn();
        }
        this.ui.updateHUD(this.p1Score, this.p2Score, this.activePlayer, this.p1Name, this.p2Name);
        this.ui.update3DGuides();
      }
      return;
    }

    if (this.gameMode === 'challenges') {
      this.evaluateChallengeOutcome();
      return;
    }

    if (p1Fell && p2Fell) {
      if (this.activePlayer === 'player1') {
        this.p2Score++;
        this.ui.showRoundResult('player2', this.p1Score, this.p2Score);
      } else {
        this.p1Score++;
        this.ui.showRoundResult('player1', this.p1Score, this.p2Score);
      }
    } else if (p1Fell) {
      this.p2Score++;
      this.ui.showRoundResult('player2', this.p1Score, this.p2Score);
    } else if (p2Fell) {
      this.p1Score++;
      this.ui.showRoundResult('player1', this.p1Score, this.p2Score);
    }

    // Check Match Win Condition
    if (this.p1Score >= this.targetScore) {
      setTimeout(() => this.onMatchWon('player1'), 1000);
      return;
    } else if (this.p2Score >= this.targetScore) {
      setTimeout(() => this.onMatchWon('player2'), 1000);
      return;
    }

    if (p1Fell || p2Fell) {
      setTimeout(() => {
        this.activePlayer = p1Fell ? 'player2' : 'player1';
        this.setupRound();
      }, 1800);
    } else {
      this.activePlayer = (this.activePlayer === 'player1') ? 'player2' : 'player1';
      this.isTurnInProgress = false;
      this.isAiTurn = this.gameMode !== 'two_player' && this.activePlayer === 'player2';

      this.ui.updateHUD(this.p1Score, this.p2Score, this.activePlayer, this.p1Name, this.p2Name);
      this.ui.update3DGuides();

      if (this.isAiTurn) {
        this.scheduleAITurn();
      }
    }
  }

  evaluateChallengeOutcome() {
    const ch = TRICK_CHALLENGES[this.currentChallengeIndex];
    let won = false;

    if (ch.targetPos) {
      if (this.p2PenObj && this.p2PenObj.hasFallenOff && (!this.p1PenObj || !this.p1PenObj.hasFallenOff)) {
        won = true;
      }
    } else if (ch.targets) {
      const allTargetsFell = this.extraTargetObjs.every(t => t.hasFallenOff);
      if (allTargetsFell && (!this.p1PenObj || !this.p1PenObj.hasFallenOff)) {
        won = true;
      }
    }

    if (won) {
      sound.playVictory();
      this.ui.showMessage(`🎉 CHALLENGE CLEARED in ${this.challengeShotsUsed} shots!`);
      setTimeout(() => {
        this.ui.showMainMenu();
        this.ui.showChallengesModal();
      }, 2000);
    } else if (this.challengeShotsUsed >= ch.parShots || (this.p1PenObj && this.p1PenObj.hasFallenOff)) {
      this.ui.showMessage("❌ Challenge Failed. Try again!");
      setTimeout(() => this.setupRound(), 1500);
    } else {
      this.isTurnInProgress = false;
      this.ui.update3DGuides();
    }
  }

  onMatchWon(winner) {
    this.ui.showMatchEndModal(winner, this.p1Score, this.p2Score);
  }

  initGameLoop() {
    const animate = () => {
      requestAnimationFrame(animate);

      const dt = Math.min(this.clock.getDelta(), 0.05);

      // Smooth continuous keyboard aiming
      this.ui.updateContinuousAim(dt);

      // Step Physics with 4x sub-stepping
      this.physicsWorld.update(dt);

      // Check if all motion settled after a flick
      if (this.isTurnInProgress && this.physicsWorld.isAllSleeping()) {
        this.isTurnInProgress = false;
        this.evaluateRoundEnd();
      }

      // Update 3D Classroom Scene
      this.classroom.update(dt, this.getActivePen());

      // Update 3D Pen Locker Turntable Preview
      if (this.locker) {
        this.locker.update(dt);
      }

      // Update Oscillating Power Bar
      this.ui.updatePowerBarOscillation();
    };

    requestAnimationFrame(animate);
  }
}
