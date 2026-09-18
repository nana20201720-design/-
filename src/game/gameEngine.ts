import {
  CharacterState,
  Projectile,
  GameMode,
  Team,
  WeaponType,
  KillFeedItem,
  Platform,
  WoodenCrate,
  PlayerCustomization,
  GameSettings,
} from '../types';
import { ARENA_MAP, MapData, MAP_WIDTH, MAP_HEIGHT } from './mapData';
import { WEAPON_CONFIGS, GRENADE_CONFIG } from './weapons';
import { ParticleSystem } from './particles';
import { GameRenderer } from './renderer';
import { BotAIController } from './botAI';
import { soundManager } from '../audio/soundManager';

export interface GameEngineEvents {
  onKillFeed: (item: KillFeedItem) => void;
  onGameOver: (
    isVictory: boolean,
    score: number,
    kills: number,
    deaths: number,
    headshots: number,
    maxStreak: number,
    damage: number,
    mvpName?: string,
    mvpKills?: number
  ) => void;
  onWaveComplete?: (wave: number) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderer: GameRenderer;
  private particles: ParticleSystem;
  private botAI: BotAIController;

  // Game Entities
  private map: MapData;
  public players: CharacterState[] = [];
  public activePlayerIndex = 0;
  public bots: CharacterState[] = [];
  private projectiles: Projectile[] = [];
  private nextProjId = 1;
  private nextKillFeedId = 1;

  // Game Loop
  private lastTime = 0;
  private isRunning = false;
  private isPaused = false;
  private animFrameId: number | null = null;

  // Match State
  private mode: GameMode = 'deathmatch';
  private matchTimer = 180; // 3 minutes default
  private targetScore = 15;
  private blueScore = 0;
  private redScore = 0;
  private wave = 1;
  private weaponDropTimer = 15;
  private nextPickupId = 100;
  private events: GameEngineEvents;

  // Active Player Controls State
  private inputMoveX = 0;
  private inputMoveY = 0;
  private inputAimX = 0;
  private inputAimY = 0;
  private inputJump = false;
  private inputJetpack = false;
  private inputShoot = false;
  private settings: GameSettings;

  // Multi-Keyboard State for simultaneous local players
  private p2Input = { moveX: 0, moveY: 0, aimX: -1, aimY: 0, jump: false, jetpack: false, shoot: false };
  private p3Input = { moveX: 0, moveY: 0, aimX: 1, aimY: 0, jump: false, jetpack: false, shoot: false };
  private p4Input = { moveX: 0, moveY: 0, aimX: -1, aimY: 0, jump: false, jetpack: false, shoot: false };

  constructor(
    canvas: HTMLCanvasElement,
    mode: GameMode,
    customization: PlayerCustomization,
    settings: GameSettings,
    events: GameEngineEvents
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.mode = mode;
    this.settings = settings;
    this.events = events;

    this.renderer = new GameRenderer(this.ctx);
    this.particles = new ParticleSystem();
    this.botAI = new BotAIController(mode);

    // Clone map data so state is fresh
    this.map = JSON.parse(JSON.stringify(ARENA_MAP));

    // Setup exactly 4 players in Free-For-All (No bots!)
    this.setupFourPlayers(customization);
  }

  public get player(): CharacterState {
    return this.players[this.activePlayerIndex] || this.players[0];
  }

  public setActivePlayerIndex(index: number) {
    if (index < 0 || index >= this.players.length) return;
    this.activePlayerIndex = index;
    this.players.forEach((p, idx) => {
      p.isPlayer = (idx === index);
    });
  }

  public setActivePlayer(index: number) {
    this.setActivePlayerIndex(index);
  }

  private setupFourPlayers(customization: PlayerCustomization) {
    this.players = [];
    this.bots = [];

    // Player 1 (Green Tactical Camo - Far Left Outpost)
    const p1 = this.createCharacter(
      'player-1',
      customization.playerName || 'القائد (P1)',
      true,
      'ffa',
      customization
    );
    p1.aiProfile = {
      personality: 'balanced',
      targetId: null,
      stateTimer: 0,
      preferredDistance: 280,
      reactionDelay: 0.18,
      accuracySpread: 0.1,
    };
    this.respawnAt(p1, 0);
    this.players.push(p1);

    // Player 2 (Red Urban Camo - Far Right Cliffside)
    const p2 = this.createCharacter(
      'player-2',
      'صخر (Rex P2)',
      false,
      'ffa',
      {
        camoColor: '#b91c1c',
        headgear: 'beret',
        skinTone: '#e0ac69',
        sunglasses: true,
      }
    );
    p2.aiProfile = {
      personality: 'rusher',
      targetId: null,
      stateTimer: 0,
      preferredDistance: 210,
      reactionDelay: 0.15,
      accuracySpread: 0.12,
    };
    p2.facingRight = false;
    p2.aimAngle = Math.PI; // Face inward towards center
    this.respawnAt(p2, 1);
    this.players.push(p2);

    // Player 3 (Desert Amber Camo - Lower Caves Grotto)
    const p3 = this.createCharacter(
      'player-3',
      'الشبح (Ghost P3)',
      false,
      'ffa',
      {
        camoColor: '#d97706',
        headgear: 'bandana',
        skinTone: '#fcd34d',
        sunglasses: false,
      }
    );
    p3.aiProfile = {
      personality: 'sniper',
      targetId: null,
      stateTimer: 0,
      preferredDistance: 460,
      reactionDelay: 0.2,
      accuracySpread: 0.08,
    };
    p3.facingRight = true;
    p3.aimAngle = 0;
    this.respawnAt(p3, 2);
    this.players.push(p3);

    // Player 4 (Navy Indigo Camo - High Floating Sky Island)
    const p4 = this.createCharacter(
      'player-4',
      'النسر (Viper P4)',
      false,
      'ffa',
      {
        camoColor: '#4338ca',
        headgear: 'cap',
        skinTone: '#fbb587',
        sunglasses: true,
      }
    );
    p4.aiProfile = {
      personality: 'flier',
      targetId: null,
      stateTimer: 0,
      preferredDistance: 320,
      reactionDelay: 0.16,
      accuracySpread: 0.1,
    };
    p4.facingRight = false;
    p4.aimAngle = Math.PI * 0.75;
    this.respawnAt(p4, 3);
    this.players.push(p4);
  }

  private respawnAt(char: CharacterState, spawnIndex: number) {
    const spawns = this.map.playerSpawns;
    const chosen = spawns[spawnIndex % spawns.length];

    char.x = chosen.x;
    char.y = chosen.y;
    char.vx = 0;
    char.vy = 0;
    char.health = char.maxHealth;
    char.fuel = char.maxFuel;
    char.isDead = false;
    char.respawnTimer = 0;
    char.isReloading = false;

    // Default loadout: Single Starting Weapon (Pistol)
    char.weapons = ['pistol'];
    char.currentWeaponIndex = 0;
    char.ammo.pistol = WEAPON_CONFIGS.pistol.magazineSize;
  }

  private createCharacter(
    id: string,
    name: string,
    isPlayer: boolean,
    team: Team,
    customization?: Partial<PlayerCustomization>
  ): CharacterState {
    return {
      id,
      name,
      isPlayer,
      team,
      x: 300,
      y: 900,
      vx: 0,
      vy: 0,
      width: 32,
      height: 48,
      facingRight: true,
      aimAngle: 0,
      isGrounded: false,
      isJetpacking: false,
      isCrouching: false,
      meleeTimer: 0,
      inBush: false,
      health: 100,
      maxHealth: 100,
      fuel: 100,
      maxFuel: 100,
      isDead: false,
      respawnTimer: 0,
      weapons: ['pistol'],
      currentWeaponIndex: 0,
      ammo: {
        pistol: 12,
        rifle: 30,
        shotgun: 6,
        rocket: 3,
        sniper: 5,
      },
      reserveAmmo: {
        pistol: 60,
        rifle: 120,
        shotgun: 24,
        rocket: 6,
        sniper: 15,
      },
      isReloading: false,
      reloadTimer: 0,
      reloadDuration: 1.5,
      lastShotTime: 0,
      grenades: 2,
      killStreak: 0,
      multiKillCount: 0,
      lastKillTime: 0,
      walkCycle: 0,
      camoColor: customization?.camoColor || (isPlayer ? '#15803d' : '#1e3a8a'),
      headgear: customization?.headgear || 'helmet',
      sunglasses: customization?.sunglasses ?? true,
      skinTone: customization?.skinTone || '#fbb587',
      charAvatarIndex: customization?.charAvatarIndex || (isPlayer ? 1 : 2),
      recoilOffset: 0,
      muzzleFlashTimer: 0,
      hitFlinchTimer: 0,
      kills: 0,
      deaths: 0,
      damageDealt: 0,
      headshots: 0,
      maxKillStreak: 0,
    };
  }

  private setupBots() {
    this.bots = [];
    const botNames = [
      { name: 'العقيد صخر (Rex)', personality: 'rusher' as const, gear: 'beret' as const, color: '#991b1b' },
      { name: 'الشبح (Ghost)', personality: 'sniper' as const, gear: 'bandana' as const, color: '#334155' },
      { name: 'النسر (Viper)', personality: 'flier' as const, gear: 'helmet' as const, color: '#d97706' },
      { name: 'الدبابة (Tank)', personality: 'balanced' as const, gear: 'cap' as const, color: '#047857' },
    ];

    if (this.mode === 'team') {
      // 2 Blue bots (Allies), 3 Red bots (Enemies)
      const ally1 = this.createCharacter('bot-blue-1', 'الملازم فهد', false, 'blue', {
        camoColor: '#1d4ed8',
        headgear: 'helmet',
      });
      ally1.aiProfile = { personality: 'balanced', targetId: null, stateTimer: 0, preferredDistance: 280, reactionDelay: 0.2, accuracySpread: 0.1 };
      this.respawnCharacter(ally1);
      this.bots.push(ally1);

      const ally2 = this.createCharacter('bot-blue-2', 'الصقر', false, 'blue', {
        camoColor: '#2563eb',
        headgear: 'beret',
      });
      ally2.aiProfile = { personality: 'flier', targetId: null, stateTimer: 0, preferredDistance: 320, reactionDelay: 0.2, accuracySpread: 0.1 };
      this.respawnCharacter(ally2);
      this.bots.push(ally2);

      // Red Enemies
      for (let i = 0; i < 3; i++) {
        const info = botNames[i];
        const redBot = this.createCharacter(`bot-red-${i}`, info.name, false, 'red', {
          camoColor: '#b91c1c',
          headgear: info.gear,
        });
        redBot.aiProfile = {
          personality: info.personality,
          targetId: null,
          stateTimer: 0,
          preferredDistance: info.personality === 'sniper' ? 550 : 260,
          reactionDelay: 0.25,
          accuracySpread: 0.14,
        };
        this.respawnCharacter(redBot);
        this.bots.push(redBot);
      }
    } else if (this.mode === 'survival') {
      // Survival: wave of hostile militia bots
      const botCount = Math.min(6, 2 + this.wave);
      for (let i = 0; i < botCount; i++) {
        const info = botNames[i % botNames.length];
        const bot = this.createCharacter(`bot-surv-${i}`, `${info.name} [W${this.wave}]`, false, 'red', {
          camoColor: '#7f1d1d',
          headgear: info.gear,
        });
        bot.aiProfile = {
          personality: info.personality,
          targetId: 'player-1',
          stateTimer: 0,
          preferredDistance: 240,
          reactionDelay: 0.2,
          accuracySpread: 0.15,
        };
        this.respawnCharacter(bot);
        this.bots.push(bot);
      }
    } else {
      // Deathmatch (FFA): 4 Bots
      for (let i = 0; i < 4; i++) {
        const info = botNames[i];
        const bot = this.createCharacter(`bot-ffa-${i}`, info.name, false, 'ffa', {
          camoColor: info.color,
          headgear: info.gear,
        });
        bot.aiProfile = {
          personality: info.personality,
          targetId: null,
          stateTimer: 0,
          preferredDistance: info.personality === 'sniper' ? 520 : 280,
          reactionDelay: 0.25,
          accuracySpread: 0.12,
        };
        this.respawnCharacter(bot);
        this.bots.push(bot);
      }
    }
  }

  public scopeLevel: 1 | 2 | 3 = 1;

  public cycleScopeLevel(): number {
    if (this.scopeLevel === 1) this.scopeLevel = 2;
    else if (this.scopeLevel === 2) this.scopeLevel = 3;
    else this.scopeLevel = 1;
    return this.scopeLevel;
  }

  public respawnCharacter(char: CharacterState) {
    const spawns = char.isPlayer ? this.map.playerSpawns : this.map.botSpawns;
    const teamSpawns = spawns.filter(s => s.team === char.team || char.team === 'ffa');
    const chosen = teamSpawns.length > 0
      ? teamSpawns[Math.floor(Math.random() * teamSpawns.length)]
      : spawns[Math.floor(Math.random() * spawns.length)];

    char.x = chosen.x;
    char.y = chosen.y;
    char.vx = 0;
    char.vy = 0;
    char.health = char.maxHealth;
    char.fuel = char.maxFuel;
    char.isDead = false;
    char.respawnTimer = 0;
    char.isReloading = false;

    // Default loadout
    char.weapons = ['rifle', 'pistol'];
    char.currentWeaponIndex = 0;
    char.ammo.rifle = WEAPON_CONFIGS.rifle.magazineSize;
    char.ammo.pistol = WEAPON_CONFIGS.pistol.magazineSize;
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  public stop() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    soundManager.stopJetpack();
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
    if (paused) {
      soundManager.stopJetpack();
    }
  }

  public resize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.renderer.setDimensions(width, height);
  }

  // --- CONTROLS API ---
  public setMoveInput(x: number, y: number) {
    this.inputMoveX = x;
    this.inputMoveY = y;
  }

  public setAimInput(x: number, y: number, isFiring: boolean = false) {
    this.inputAimX = x;
    this.inputAimY = y;
    if (isFiring) {
      this.inputShoot = true;
    }
  }

  public setJetpack(active: boolean) {
    this.inputJetpack = active;
  }

  public setJump(active: boolean) {
    this.inputJump = active;
  }

  public setShoot(active: boolean) {
    this.inputShoot = active;
  }

  public reloadPlayer() {
    this.reloadCharacter(this.player);
  }

  public switchPlayerWeapon() {
    const prevFacing = this.player.facingRight;
    const prevAim = this.player.aimAngle;
    this.switchCharacterWeapon(this.player);
    this.player.facingRight = prevFacing;
    this.player.aimAngle = prevAim;
  }

  public throwPlayerGrenade() {
    this.throwCharacterGrenade(this.player);
  }

  public throwCharacterGrenade(char: CharacterState) {
    if (char.isDead || char.grenades <= 0) return;
    char.grenades--;
    soundManager.playPistol(); // throw whoosh

    const angle = char.aimAngle;
    const throwSpeed = GRENADE_CONFIG.throwSpeed;

    this.projectiles.push({
      id: this.nextProjId++,
      ownerId: char.id,
      ownerTeam: char.team,
      weaponType: 'grenade',
      x: char.x + char.width / 2 + Math.cos(angle) * 20,
      y: char.y + char.height / 2 + Math.sin(angle) * 20,
      vx: Math.cos(angle) * throwSpeed + char.vx * 0.3,
      vy: Math.sin(angle) * throwSpeed + char.vy * 0.3,
      damage: GRENADE_CONFIG.damage,
      radius: 6,
      color: '#15803d',
      life: 0,
      maxLife: GRENADE_CONFIG.fuseTime,
      bounces: 3,
      splashRadius: GRENADE_CONFIG.splashRadius,
      splashDamage: GRENADE_CONFIG.damage,
    });
  }

  public meleePlayer() {
    this.meleeCharacter(this.player);
  }

  public dropPlayerWeapon() {
    this.dropCharacterWeapon(this.player);
  }

  public dropCharacterWeapon(char: CharacterState) {
    if (char.isDead) return;
    if (char.weapons.length === 0) return;

    const currWeapon = char.weapons[char.currentWeaponIndex];
    if (!currWeapon) return;

    // Remove the current weapon from character's inventory
    char.weapons.splice(char.currentWeaponIndex, 1);
    if (char.currentWeaponIndex >= char.weapons.length) {
      char.currentWeaponIndex = Math.max(0, char.weapons.length - 1);
    }
    char.isReloading = false;

    // Eject weapon as dropped pickup entity with arc physics
    const throwDir = char.facingRight ? 1 : -1;
    const dropX = char.x + (char.facingRight ? char.width + 5 : -25);
    const dropY = char.y + 10;

    const droppedPickup = {
      id: Date.now() + Math.random(),
      type: 'weapon' as const,
      weapon: currWeapon,
      x: dropX,
      y: dropY,
      width: 44,
      height: 36,
      active: true,
      respawnTimer: 0,
      floatOffset: 0,
      isDropped: true,
      ammo: char.ammo[currWeapon] ?? WEAPON_CONFIGS[currWeapon].magazineSize,
      reserveAmmo: char.reserveAmmo[currWeapon] ?? WEAPON_CONFIGS[currWeapon].magazineSize * 2,
      vx: throwDir * 240 + char.vx * 0.4,
      vy: -140 + char.vy * 0.2,
    };

    this.map.pickups.push(droppedPickup);
    soundManager.playPickup('weapon');

    if (char.isPlayer) {
      this.particles.addFloatingText(
        char.x + char.width / 2,
        char.y - 18,
        `رمي: ${WEAPON_CONFIGS[currWeapon].nameAr} 🗑️`,
        '#f59e0b'
      );
    }
  }

  public meleeCharacter(char: CharacterState) {
    if (char.isDead) return;
    if (char.meleeTimer && char.meleeTimer > 0) return;
    char.meleeTimer = 0.28;

    soundManager.playMeleePunch();

    const reach = 58;
    const punchX = char.x + char.width / 2 + Math.cos(char.aimAngle) * reach;
    const punchY = char.y + char.height / 2 + Math.sin(char.aimAngle) * reach;

    this.particles.addMeleeEffect(punchX, punchY, char.aimAngle);

    // Hit check on opposing players/bots
    const allTargets = [...this.players, ...this.bots].filter(t => t.id !== char.id && !t.isDead);
    let hitAnything = false;

    for (const target of allTargets) {
      if (this.mode === 'team' && target.team === char.team) continue;
      const tx = target.x + target.width / 2;
      const ty = target.y + target.height / 2;
      if (Math.hypot(tx - punchX, ty - punchY) < 48) {
        hitAnything = true;
        this.applyDamage(target, 55, char.id, 'melee');
        target.vx += Math.cos(char.aimAngle) * 440;
        target.vy += Math.sin(char.aimAngle) * 260 - 150;
        this.particles.addBlood(tx, ty, Math.cos(char.aimAngle) * 200, Math.sin(char.aimAngle) * 200);
        this.particles.addFloatingText(tx, ty - 22, '👊 PUNCH!', '#facc15');
      }
    }

    // Hit check on barrels
    for (const barrel of this.map.barrels) {
      if (barrel.exploded) continue;
      const bx = barrel.x + barrel.width / 2;
      const by = barrel.y + barrel.height / 2;
      if (Math.hypot(bx - punchX, by - punchY) < 50) {
        hitAnything = true;
        barrel.health -= 30;
        this.particles.addHitSparks(bx, by);
        if (barrel.health <= 0) {
          this.explodeBarrel(barrel, char.id);
        }
      }
    }

    // Hit check on destructible wooden crates
    if (this.map.crates) {
      for (const crate of this.map.crates) {
        if (crate.destroyed) continue;
        const cx = crate.x + crate.width / 2;
        const cy = crate.y + crate.height / 2;
        if (Math.hypot(cx - punchX, cy - punchY) < 50) {
          hitAnything = true;
          crate.health -= 35;
          this.particles.addHitSparks(cx, cy);
          if (crate.health <= 0) {
            this.destroyCrate(crate);
          }
        }
      }
    }

    if (hitAnything) {
      soundManager.playMeleeHit();
      this.renderer.addScreenShake(5);
    }
  }

  // --- CORE GAME LOOP ---
  private loop = (currentTime: number) => {
    if (!this.isRunning) return;

    const dt = Math.min(0.05, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;

    if (!this.isPaused) {
      this.update(dt);
    }

    this.render();

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    // 1. Update Match Timer
    this.matchTimer -= dt;
    if (this.matchTimer <= 0) {
      this.checkMatchEnd();
    }

    // 2. Poll Gamepads for multi-player control
    this.pollGamepads();

    // 3. Update All 4 Players
    this.updatePlayers(dt);

    // 4. Update Projectiles & Collisions
    this.updateProjectiles(dt);

    // 5. Update Pickups & Barrels
    this.updatePickupsAndBarrels(dt);
    
    // 5.5 Update Weapon Drops
    this.updateWeaponDrops(dt);

    // 6. Update Particle System (with platform collision detection for blood splats)
    this.particles.update(dt, this.map.platforms);

    // 7. Update Camera follow active player with wide Mini Militia field-of-view & flight zoom
    const active = this.player;
    const currWeapon = active.weapons[active.currentWeaponIndex] || 'pistol';
    const isSniper = currWeapon === 'sniper';
    const lookMultiplier = isSniper ? 2.5 : 1.4;

    let lookAheadX = 0;
    let lookAheadY = 0;

    const aimDist = Math.hypot(this.inputAimX, this.inputAimY);
    // Apply camera dampening when scoped in to make precision aiming easier and less jittery
    const scopeDamp = this.scopeLevel === 2 ? 1.45 : (this.scopeLevel === 3 ? 1.9 : 1.0);

    if (aimDist > 0.15) {
      lookAheadX = (this.inputAimX * 180 * lookMultiplier) / scopeDamp;
      lookAheadY = (this.inputAimY * 130 * lookMultiplier) / scopeDamp;
    } else if (Math.abs(active.vx) > 30) {
      lookAheadX = ((active.vx > 0 ? 120 : -120) * (isSniper ? 1.5 : 1.0)) / scopeDamp;
    }

    if (active.isJetpacking) {
      lookAheadY = -180 / scopeDamp; // Look high upward during jetpack flight to see high fliers & platforms
    } else if (active.vy > 200) {
      lookAheadY = 140 / scopeDamp; // Look downward while diving/falling
    }

    // Dynamic Zoom Scale (Mini Militia Multiplayer wide perspective):
    // Base zoom is 0.78 (wider view showing the entire battleground)
    // Zoom out further when jetpacking (0.68) or aiming (0.65) or using Sniper (0.55)
    let targetZoom = 0.78;
    if (isSniper) {
      targetZoom = 0.55; // Extreme long-range scope view
    } else if (active.isJetpacking) {
      targetZoom = 0.68; // Wide aerial flight view
    } else if (aimDist > 0.3) {
      targetZoom = 0.70; // Extended target engagement view
    }

    // Apply manual Scope Zoom button modifier (1X -> 2X -> 3X)
    if (this.scopeLevel === 2) targetZoom *= 0.82; // 2X Scope Out
    if (this.scopeLevel === 3) targetZoom *= 0.65; // 3X Ultra Wide Scope Out

    if (active.isDead) {
      targetZoom = 1.4; // Last Moments focus zoom-in
      lookAheadX = 0;
      lookAheadY = 0;
    }

    this.renderer.updateCamera(
      active.x + active.width / 2,
      active.y + active.height / 2,
      dt,
      lookAheadX,
      lookAheadY,
      targetZoom
    );
  }

  private isGamepadActive(playerIndex: number): boolean {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return false;
    const gamepads = navigator.getGamepads();
    const gp = gamepads[playerIndex];
    if (!gp) return false;
    const lx = Math.abs(gp.axes[0] || 0);
    const ly = Math.abs(gp.axes[1] || 0);
    const rx = Math.abs(gp.axes[2] || 0);
    const ry = Math.abs(gp.axes[3] || 0);
    const anyBtn = gp.buttons.some(b => b?.pressed);
    return lx > 0.2 || ly > 0.2 || rx > 0.2 || ry > 0.2 || anyBtn;
  }

  private pollGamepads() {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < Math.min(gamepads.length, this.players.length); i++) {
      const gp = gamepads[i];
      if (!gp) continue;
      const targetChar = this.players[i];
      if (!targetChar || targetChar.isDead) continue;

      const lx = gp.axes[0] || 0;
      const ly = gp.axes[1] || 0;
      const rx = gp.axes[2] || 0;
      const ry = gp.axes[3] || 0;
      const jumpBtn = gp.buttons[0]?.pressed;
      const jetBtn = gp.buttons[1]?.pressed || gp.buttons[7]?.pressed; // B or RT
      const shootBtn = gp.buttons[5]?.pressed || gp.buttons[6]?.pressed; // RB or LT

      if (Math.abs(lx) > 0.2) {
        targetChar.vx += lx * 950 * 0.016;
        targetChar.walkCycle += 0.2;
      }
      if (jumpBtn && targetChar.isGrounded) {
        targetChar.vy = -420;
        targetChar.isGrounded = false;
      }
      if (jetBtn && targetChar.fuel > 0) {
        targetChar.isJetpacking = true;
        targetChar.vy -= 1150 * 0.016;
        targetChar.fuel = Math.max(0, targetChar.fuel - 32 * 0.016);
      }
      if (Math.hypot(rx, ry) > 0.25) {
        targetChar.aimAngle = Math.atan2(ry, rx);
        targetChar.facingRight = Math.cos(targetChar.aimAngle) >= 0;
      }
      if (shootBtn) {
        this.fireWeapon(targetChar);
      }
    }
  }

  private updatePlayers(dt: number) {
    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[i];

      // Respawn timer
      if (p.isDead) {
        p.respawnTimer -= dt;
        if (p.respawnTimer <= 0) {
          this.respawnAt(p, i);
        }
        continue;
      }

      // Bush concealment
      let inBush = false;
      if (this.map.scenery.bushes) {
        for (const bush of this.map.scenery.bushes) {
          if (
            p.x + p.width > bush.x &&
            p.x < bush.x + bush.width &&
            p.y + p.height > bush.y - 8 &&
            p.y < bush.y + bush.height
          ) {
            inBush = true;
            break;
          }
        }
      }
      p.inBush = inBush;

      // Mini Militia Health Auto-Regeneration:
      // If soldier hasn't sustained damage for 3 seconds, health recovers at 22 HP/sec
      p.timeSinceLastDamage = (p.timeSinceLastDamage || 0) + dt;
      if (p.timeSinceLastDamage > 3.0 && p.health < p.maxHealth && !p.isDead) {
        p.health = Math.min(p.maxHealth, p.health + 22 * dt);
      }

      // If active player, apply primary touch/mouse inputs
      if (i === this.activePlayerIndex) {
        // Aim Angle
        if (Math.hypot(this.inputAimX, this.inputAimY) > 0.2) {
          p.aimAngle = Math.atan2(this.inputAimY, this.inputAimX);
          // Apply hysteresis so aiming slightly left/right doesn't flip erratic face
          if (this.inputAimX > 0.15) {
            p.facingRight = true;
          } else if (this.inputAimX < -0.15) {
            p.facingRight = false;
          }
        } else if (Math.abs(this.inputMoveX) > 0.2) {
          p.facingRight = this.inputMoveX > 0;
        }

        // Crouch (When grounded and pushing down on joystick/keyboard)
        const wantsCrouch = p.isGrounded && this.inputMoveY > 0.45;
        p.isCrouching = wantsCrouch;

        // Mini Militia Omnidirectional Jetpack Flight
        // Jetpack activates on:
        // 1) Explicit jetpack button
        // 2) Pushing UP on move stick (inputMoveY < -0.25)
        // 3) Airborne and actively directing movement (stick push > 0.25 and not pulling hard down)
        const isAirborne = !p.isGrounded;
        const stickPush = Math.hypot(this.inputMoveX, this.inputMoveY);
        const wantsJetpack = this.inputJetpack || (this.inputMoveY < -0.25) || (isAirborne && stickPush > 0.25 && this.inputMoveY < 0.25);

        if (wantsJetpack && p.fuel > 0) {
          p.isJetpacking = true;
          // Smooth fuel drain (~4.5 seconds of full flight)
          p.fuel = Math.max(0, p.fuel - 24 * dt);

          // Upward lift - counteracts gravity smoothly
          const upFactor = this.inputMoveY < 0 ? -this.inputMoveY : (this.inputJetpack ? 1 : 0.65);
          p.vy -= (1280 + upFactor * 520) * dt;

          // Horizontal thruster acceleration
          if (Math.abs(this.inputMoveX) > 0.1) {
            p.vx += this.inputMoveX * 1350 * dt;
          }

          // Fast dive if pulling down while flying (great for dropping through the shaft)
          if (this.inputMoveY > 0.3) {
            p.vy += this.inputMoveY * 850 * dt;
          }

          // Aerial damping for responsive steering
          p.vx *= 0.945;
          p.vy *= 0.965;

          this.particles.addJetpackEffect(p.x + p.width / 2, p.y + p.height / 2, p.facingRight);
          soundManager.startJetpack();
        } else {
          p.isJetpacking = false;
          soundManager.stopJetpack();

          if (p.isGrounded) {
            // Ground running
            const groundSpeed = wantsCrouch ? 450 : 1200;
            if (Math.abs(this.inputMoveX) > 0.15) {
              p.vx += this.inputMoveX * groundSpeed * dt;
              p.walkCycle += dt * (wantsCrouch ? 8 : 16);
            }
            p.vx *= 0.80; // ground friction
            p.fuel = Math.min(p.maxFuel, p.fuel + 42 * dt);
          } else {
            // Air coasting
            if (Math.abs(this.inputMoveX) > 0.15) {
              p.vx += this.inputMoveX * 650 * dt;
            }
            p.vx *= 0.95;
            p.fuel = Math.min(p.maxFuel, p.fuel + 16 * dt);
          }
        }

        // Jump impulse
        if (this.inputJump && p.isGrounded) {
          p.vy = -450;
          p.isGrounded = false;
        }

        // Shooting
        if (this.inputShoot) {
          this.fireWeapon(p);
        }
      } else {
        // Other Players in FFA arena:
        // If controlled by active physical gamepad, gamepad inputs apply.
        // Otherwise, autonomous Mini Militia combat AI drives the soldier!
        const hasGamepad = this.isGamepadActive(i);
        if (!hasGamepad) {
          this.botAI.updateBot(
            p,
            this.players,
            this.map,
            dt,
            (bot) => this.fireWeapon(bot),
            (bot) => this.reloadCharacter(bot),
            (bot) => this.switchCharacterWeapon(bot),
            (bot) => this.meleeCharacter(bot),
            (bot) => this.throwCharacterGrenade(bot)
          );
        }

        // Animated jetpack thrusters for flying bots
        if (p.isJetpacking) {
          this.particles.addJetpackEffect(p.x + p.width / 2, p.y + p.height / 2, p.facingRight);
        }

        // Fuel and ground friction
        if (p.isGrounded) {
          p.vx *= 0.82;
          p.fuel = Math.min(p.maxFuel, p.fuel + 38 * dt);
        } else {
          p.vx *= 0.95;
          if (!p.isJetpacking) {
            p.fuel = Math.min(p.maxFuel, p.fuel + 15 * dt);
          }
        }
      }

      // Physics integration & Map Collision
      this.integratePhysics(p, dt);
    }
  }

  private integratePhysics(char: CharacterState, dt: number) {
    // Gravity
    char.vy += 780 * dt;

    // Terminal velocity clamp
    char.vx = Math.max(-550, Math.min(550, char.vx));
    char.vy = Math.max(-680, Math.min(800, char.vy));

    // Timers
    if (char.recoilOffset > 0) char.recoilOffset = Math.max(0, char.recoilOffset - 60 * dt);
    if (char.muzzleFlashTimer > 0) char.muzzleFlashTimer -= dt;
    if (char.hitFlinchTimer > 0) char.hitFlinchTimer -= dt;
    if (char.meleeTimer && char.meleeTimer > 0) char.meleeTimer -= dt;

    // Reload timer
    if (char.isReloading) {
      char.reloadTimer -= dt;
      if (char.reloadTimer <= 0) {
        this.finishReload(char);
      }
    }

    // Dynamic height based on crouch
    const curHeight = char.isCrouching ? 32 : char.height;

    // Tentative position
    let newX = char.x + char.vx * dt;
    let newY = char.y + char.vy * dt;

    // Map Boundaries Clamp
    newX = Math.max(10, Math.min(MAP_WIDTH - char.width - 10, newX));

    // Platform Collisions (Solid and One-Way)
    char.isGrounded = false;

    for (const plat of this.map.platforms) {
      if (plat.type === 'hazard') {
        // Toxic acid damage if touching
        if (
          newX + char.width > plat.x &&
          newX < plat.x + plat.width &&
          newY + curHeight > plat.y &&
          newY < plat.y + plat.height
        ) {
          this.applyDamage(char, 50 * dt, 'hazard', 'toxic');
        }
        continue;
      }

      if (plat.oneWay) {
        // Drop-through mechanism: if player is pressing DOWN, pass through one-way platforms
        const wantsDrop = (char.isPlayer && this.inputMoveY > 0.45);
        if (wantsDrop) {
          continue;
        }

        // One-Way Platform: only collide if falling downward and feet were above top edge
        const prevFeetY = char.y + curHeight;
        const newFeetY = newY + curHeight;

        if (
          char.vy >= 0 &&
          prevFeetY <= plat.y + 14 &&
          newFeetY >= plat.y &&
          newX + char.width - 6 > plat.x &&
          newX + 6 < plat.x + plat.width
        ) {
          newY = plat.y - curHeight;
          char.vy = 0;
          char.isGrounded = true;
        }
      } else {
        // Solid AABB Box Collision with Corner Sliding / Nudge Assistance
        if (
          newX + char.width > plat.x &&
          newX < plat.x + plat.width &&
          newY + curHeight > plat.y &&
          newY < plat.y + plat.height
        ) {
          const prevLeft = char.x;
          const prevRight = char.x + char.width;
          const prevTop = char.y;
          const prevBottom = char.y + curHeight;

          // Ceiling Lip Nudge: When flying up through the Drop Shaft or tunnel entrance,
          // if player's head clips the lip by <= 14px, slide them smoothly into the gap!
          if (char.vy < 0 && prevTop >= plat.y + plat.height - 14) {
            const overlapRight = (newX + char.width) - plat.x;
            const overlapLeft = (plat.x + plat.width) - newX;
            if (overlapRight > 0 && overlapRight <= 14) {
              newX = plat.x - char.width;
              continue;
            } else if (overlapLeft > 0 && overlapLeft <= 14) {
              newX = plat.x + plat.width;
              continue;
            } else {
              newY = plat.y + plat.height;
              char.vy = 0;
              continue;
            }
          }

          // Hit from above (landing)
          if (prevBottom <= plat.y + 14 && char.vy >= 0) {
            newY = plat.y - curHeight;
            char.vy = 0;
            char.isGrounded = true;
          }
          // Hit from below (ceiling)
          else if (prevTop >= plat.y + plat.height - 14 && char.vy < 0) {
            newY = plat.y + plat.height;
            // Floaty elastic bounce off ceiling when jetpacking
            char.vy = char.isJetpacking ? 50 : 0;
          }
          // Hit from left
          else if (prevRight <= plat.x + 14 && char.vx > 0) {
            newX = plat.x - char.width;
            // Floaty elastic bounce off walls when flying
            char.vx = char.isJetpacking ? -char.vx * 0.35 : 0;
          }
          // Hit from right
          else if (prevLeft >= plat.x + plat.width - 14 && char.vx < 0) {
            newX = plat.x + plat.width;
            // Floaty elastic bounce off walls when flying
            char.vx = char.isJetpacking ? -char.vx * 0.35 : 0;
          }
        }
      }
    }

    char.x = newX;
    char.y = newY;
  }

  private fireWeapon(char: CharacterState) {
    if (char.isDead || char.isReloading) return;

    const currWeapon = char.weapons[char.currentWeaponIndex] || 'pistol';
    const cfg = WEAPON_CONFIGS[currWeapon];
    const now = performance.now() / 1000;

    // Fire rate check
    if (now - char.lastShotTime < 1 / cfg.fireRate) return;

    // Ammo check
    if (char.ammo[currWeapon] <= 0) {
      this.reloadCharacter(char);
      return;
    }

    // Deduct ammo & trigger cooldown
    char.ammo[currWeapon]--;
    char.lastShotTime = now;
    char.recoilOffset = cfg.recoil;
    char.muzzleFlashTimer = 0.06;

    // Recoil knockback on character
    char.vx -= Math.cos(char.aimAngle) * cfg.recoil * 18;
    char.vy -= Math.sin(char.aimAngle) * cfg.recoil * 12;

    if (char.isPlayer) {
      this.renderer.addScreenShake(cfg.id === 'rocket' ? 12 : (cfg.id === 'shotgun' ? 6 : 2));
    }

    // Play procedural sound
    if (cfg.id === 'pistol') soundManager.playPistol();
    else if (cfg.id === 'rifle') soundManager.playRifle();
    else if (cfg.id === 'shotgun') soundManager.playShotgun();
    else if (cfg.id === 'rocket') soundManager.playRocketLaunch();
    else if (cfg.id === 'sniper') soundManager.playRifle();

    // Spawn Projectiles (e.g. 6 pellets for shotgun)
    const barrelX = char.x + char.width / 2 + Math.cos(char.aimAngle) * cfg.barrelLength;
    const barrelY = char.y + char.height / 2 + Math.sin(char.aimAngle) * cfg.barrelLength;

    this.particles.addWeaponFireEffect(
      cfg.id,
      barrelX,
      barrelY,
      char.aimAngle,
      char.x + char.width / 2,
      char.y + char.height / 2 - 2,
      char.facingRight
    );

    for (let i = 0; i < cfg.bulletCount; i++) {
      const spreadAngle = char.aimAngle + (Math.random() * 2 - 1) * cfg.spread;
      const speed = cfg.bulletSpeed * (0.95 + Math.random() * 0.1);

      this.projectiles.push({
        id: this.nextProjId++,
        ownerId: char.id,
        ownerTeam: char.team,
        weaponType: cfg.id,
        x: barrelX,
        y: barrelY,
        vx: Math.cos(spreadAngle) * speed,
        vy: Math.sin(spreadAngle) * speed,
        damage: cfg.damage,
        radius: cfg.id === 'rocket' ? 6 : (cfg.id === 'shotgun' ? 3 : 4),
        color: cfg.color,
        life: 0,
        maxLife: cfg.bulletLife,
        splashRadius: cfg.splashRadius,
        splashDamage: cfg.splashDamage,
      });
    }
  }

  private reloadCharacter(char: CharacterState) {
    if (char.isDead || char.isReloading) return;

    const currWeapon = char.weapons[char.currentWeaponIndex] || 'pistol';
    const cfg = WEAPON_CONFIGS[currWeapon];

    if (char.ammo[currWeapon] >= cfg.magazineSize) return; // Full already
    if (char.reserveAmmo[currWeapon] <= 0) return; // No reserves

    char.isReloading = true;
    char.reloadTimer = cfg.reloadTime;
    char.reloadDuration = cfg.reloadTime;

    if (char.isPlayer) {
      soundManager.playReload();
    }
  }

  private finishReload(char: CharacterState) {
    char.isReloading = false;
    const currWeapon = char.weapons[char.currentWeaponIndex] || 'pistol';
    const cfg = WEAPON_CONFIGS[currWeapon];
    const needed = cfg.magazineSize - char.ammo[currWeapon];
    const toLoad = Math.min(needed, char.reserveAmmo[currWeapon]);

    char.ammo[currWeapon] += toLoad;
    char.reserveAmmo[currWeapon] -= toLoad;
  }

  private switchCharacterWeapon(char: CharacterState) {
    if (char.isDead || char.weapons.length <= 1) return;
    char.currentWeaponIndex = (char.currentWeaponIndex + 1) % char.weapons.length;
    char.isReloading = false;
    char.lastShotTime = performance.now() / 1000;

    if (char.isPlayer) {
      soundManager.playSwitchWeapon();
    }
  }

  private updateProjectiles(dt: number) {
    const allCharacters = this.players;

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life += dt;

      // Rocket exhaust smoke
      if (p.weaponType === 'rocket') {
        this.particles.addRocketSmoke(p.x, p.y, p.vx, p.vy);
      }

      // Grenade physics (gravity + bounce)
      if (p.weaponType === 'grenade') {
        p.vy += GRENADE_CONFIG.gravity * dt;
        p.vx *= GRENADE_CONFIG.friction;
      }

      // Check lifespan
      if (p.life >= p.maxLife) {
        if (p.weaponType === 'rocket' || p.weaponType === 'grenade') {
          this.detonateExplosive(p);
        }
        this.projectiles.splice(i, 1);
        continue;
      }

      // Step position
      const nextX = p.x + p.vx * dt;
      const nextY = p.y + p.vy * dt;

      // Platform Collision
      let hitPlatform = false;
      for (const plat of this.map.platforms) {
        if (plat.type === 'hazard') continue;
        if (plat.oneWay) continue; // Bullets pass through one-way platforms

        if (
          nextX > plat.x &&
          nextX < plat.x + plat.width &&
          nextY > plat.y &&
          nextY < plat.y + plat.height
        ) {
          hitPlatform = true;
          if (p.weaponType === 'grenade' && (p.bounces || 0) > 0) {
            p.bounces!--;
            p.vy = -p.vy * GRENADE_CONFIG.bounciness;
            p.vx *= GRENADE_CONFIG.friction;
            soundManager.playGrenadeBounce();
          } else if (p.weaponType === 'rocket') {
            this.detonateExplosive(p);
            this.projectiles.splice(i, 1);
          } else {
            const normalX = p.vx > 0 ? -1 : 1;
            const normalY = p.vy > 0 ? -1 : 1;
            this.particles.addSurfaceImpact(p.x, p.y, plat.type, normalX, normalY);
            this.projectiles.splice(i, 1);
          }
          break;
        }
      }

      if (hitPlatform) continue;

      // Explosive Barrel Collision
      for (const barrel of this.map.barrels) {
        if (barrel.exploded) continue;
        if (
          nextX > barrel.x &&
          nextX < barrel.x + barrel.width &&
          nextY > barrel.y &&
          nextY < barrel.y + barrel.height
        ) {
          barrel.health -= p.damage;
          this.particles.addHitSparks(p.x, p.y);

          if (barrel.health <= 0) {
            this.explodeBarrel(barrel, p.ownerId);
          }

          if (p.weaponType === 'rocket') {
            this.detonateExplosive(p);
          }
          this.projectiles.splice(i, 1);
          hitPlatform = true;
          break;
        }
      }

      if (hitPlatform) continue;

      // Destructible Wooden Crate Collision
      if (this.map.crates) {
        for (const crate of this.map.crates) {
          if (crate.destroyed) continue;
          if (
            nextX > crate.x &&
            nextX < crate.x + crate.width &&
            nextY > crate.y &&
            nextY < crate.y + crate.height
          ) {
            crate.health -= p.damage;
            this.particles.addHitSparks(p.x, p.y);

            if (crate.health <= 0) {
              this.destroyCrate(crate);
            }

            if (p.weaponType === 'rocket') {
              this.detonateExplosive(p);
            }
            this.projectiles.splice(i, 1);
            hitPlatform = true;
            break;
          }
        }
      }

      if (hitPlatform) continue;

      // Character Hit Collision
      for (const char of allCharacters) {
        if (char.isDead || char.id === p.ownerId) continue;

        // Friendly fire check for team mode
        if (this.mode === 'team' && char.team === p.ownerTeam) continue;

        if (
          nextX > char.x &&
          nextX < char.x + char.width &&
          nextY > char.y &&
          nextY < char.y + char.height
        ) {
          // Direct hit!
          this.particles.addBlood(nextX, nextY, p.vx, p.vy);
          const isHeadshot = (nextY < char.y + char.height * 0.35) || (p.weaponType === 'sniper');
          const dmg = isHeadshot ? p.damage * 1.5 : p.damage;

          if (p.weaponType === 'rocket' || p.weaponType === 'grenade') {
            this.detonateExplosive(p);
          } else {
            this.applyDamage(char, dmg, p.ownerId, p.weaponType, isHeadshot);
          }

          this.projectiles.splice(i, 1);
          break;
        }
      }

      p.x = nextX;
      p.y = nextY;
    }
  }

  private detonateExplosive(p: Projectile) {
    soundManager.playExplosion(true);
    this.renderer.addScreenShake(18);
    this.particles.addExplosion(p.x, p.y, true);

    const radius = p.splashRadius || 150;
    const maxDamage = p.splashDamage || 85;
    const allCharacters = this.players;

    // Radial Damage to characters
    for (const char of allCharacters) {
      if (char.isDead) continue;
      const charCenterX = char.x + char.width / 2;
      const charCenterY = char.y + char.height / 2;
      const dist = Math.hypot(charCenterX - p.x, charCenterY - p.y);

      if (dist < radius) {
        const falloff = 1 - dist / radius;
        const damage = Math.round(maxDamage * falloff);

        // Explosive Knockback
        const angle = Math.atan2(charCenterY - p.y, charCenterX - p.x);
        char.vx += Math.cos(angle) * falloff * 550;
        char.vy += Math.sin(angle) * falloff * 450 - 150;

        this.applyDamage(char, damage, p.ownerId, p.weaponType);
      }
    }

    // Radial Damage to barrels
    for (const barrel of this.map.barrels) {
      if (barrel.exploded) continue;
      const dist = Math.hypot(barrel.x + barrel.width / 2 - p.x, barrel.y + barrel.height / 2 - p.y);
      if (dist < radius) {
        barrel.health -= maxDamage * (1 - dist / radius);
        if (barrel.health <= 0) {
          this.explodeBarrel(barrel, p.ownerId);
        }
      }
    }

    // Radial Damage to crates
    if (this.map.crates) {
      for (const crate of this.map.crates) {
        if (crate.destroyed) continue;
        const dist = Math.hypot(crate.x + crate.width / 2 - p.x, crate.y + crate.height / 2 - p.y);
        if (dist < radius) {
          crate.health -= maxDamage * (1 - dist / radius);
          if (crate.health <= 0) {
            this.destroyCrate(crate);
          }
        }
      }
    }
  }

  private explodeBarrel(barrel: { x: number; y: number; width: number; height: number; exploded: boolean; respawnTimer: number }, killerId: string) {
    barrel.exploded = true;
    barrel.respawnTimer = 20;

    const bx = barrel.x + barrel.width / 2;
    const by = barrel.y + barrel.height / 2;

    soundManager.playExplosion(true);
    this.renderer.addScreenShake(20);
    this.particles.addExplosion(bx, by, true);

    const radius = 200;
    const damage = 100;
    const allCharacters = this.players;

    for (const char of allCharacters) {
      if (char.isDead) continue;
      const dist = Math.hypot(char.x + char.width / 2 - bx, char.y + char.height / 2 - by);
      if (dist < radius) {
        const falloff = 1 - dist / radius;
        const dmg = Math.round(damage * falloff);
        char.vx += (char.x - bx) * 3;
        char.vy -= 250;
        this.applyDamage(char, dmg, killerId, 'barrel');
      }
    }

    // Radial Damage to crates from barrel explosion
    if (this.map.crates) {
      for (const crate of this.map.crates) {
        if (crate.destroyed) continue;
        const dist = Math.hypot(crate.x + crate.width / 2 - bx, crate.y + crate.height / 2 - by);
        if (dist < radius) {
          crate.health -= damage * (1 - dist / radius);
          if (crate.health <= 0) {
            this.destroyCrate(crate);
          }
        }
      }
    }
  }

  private destroyCrate(crate: WoodenCrate) {
    crate.destroyed = true;
    crate.respawnTimer = 25;

    const cx = crate.x + crate.width / 2;
    const cy = crate.y + crate.height / 2;

    soundManager.playMeleeHit();
    this.renderer.addScreenShake(6);
    this.particles.addWoodenDebris(cx, cy);
    this.particles.addFloatingText(cx, cy - 14, '📦 CRATE!', '#facc15');

    // Spawn pickup based on crate loot
    const weaponsList: WeaponType[] = ['shotgun', 'rifle', 'sniper', 'rocket'];
    const chosenWeapon = weaponsList[Math.floor(Math.random() * weaponsList.length)];
    const newPickup = {
      id: this.nextPickupId++,
      type: crate.lootType === 'weapon' ? ('weapon' as const) : crate.lootType,
      weapon: crate.lootType === 'weapon' ? chosenWeapon : undefined,
      x: crate.x + 4,
      y: crate.y - 12,
      width: 44,
      height: 36,
      active: true,
      respawnTimer: 0,
      floatOffset: 0,
    };
    this.map.pickups.push(newPickup);
  }

  private applyDamage(victim: CharacterState, damage: number, attackerId: string, weapon: string, isHeadshot: boolean = false) {
    if (victim.isDead) return;

    victim.health -= damage;
    victim.timeSinceLastDamage = 0;
    victim.hitFlinchTimer = 0.15;
    this.particles.addFloatingText(
      victim.x + victim.width / 2,
      victim.y - 10,
      isHeadshot ? `🎯 -${Math.round(damage)}` : `-${Math.round(damage)}`,
      isHeadshot ? '#f59e0b' : (damage > 50 ? '#ef4444' : '#f59e0b')
    );

    if (victim.isPlayer) {
      soundManager.playHit();
      if (this.settings.haptics && navigator.vibrate) {
        navigator.vibrate(50);
      }
    }

    // Check Death
    if (victim.health <= 0) {
      victim.health = 0;
      victim.isDead = true;
      victim.deaths++;
      victim.killStreak = 0;
      victim.multiKillCount = 0;
      victim.respawnTimer = 3.5;

      // Death explosion / ragdoll particles
      this.particles.addBlood(victim.x + victim.width / 2, victim.y + victim.height / 2, 0, -100);
      this.particles.addFloatingText(victim.x + victim.width / 2, victim.y - 18, isHeadshot ? '🎯 HEADSHOT!' : '💀', '#ef4444');
      soundManager.playKill();

      // Drop victim's weapon on the ground like in classic Mini Militia!
      const currWeapon = victim.weapons[victim.currentWeaponIndex];
      if (currWeapon && currWeapon !== 'pistol') {
        this.map.pickups.push({
          id: Date.now() + Math.random(),
          type: 'weapon',
          weapon: currWeapon,
          x: victim.x,
          y: victim.y,
          width: 44,
          height: 36,
          active: true,
          respawnTimer: 0,
          floatOffset: 0,
        });
      }

      // Find killer
      const allCharacters = this.players;
      const killer = allCharacters.find(c => c.id === attackerId);

      if (killer) {
        killer.kills++;
        killer.killStreak++;
        killer.maxKillStreak = Math.max(killer.maxKillStreak || 0, killer.killStreak);
        if (isHeadshot) {
          killer.headshots = (killer.headshots || 0) + 1;
        }
        killer.damageDealt += 100;
        
        const now = performance.now();
        if (now - killer.lastKillTime < 4000) {
          killer.multiKillCount++;
        } else {
          killer.multiKillCount = 1;
        }
        killer.lastKillTime = now;

        let streakMsg = '+1 KILL!';
        let streakColor = '#22c55e';
        let soundType = 'kill';

        if (killer.multiKillCount === 2) {
          streakMsg = 'DOUBLE KILL!';
          streakColor = '#eab308';
        } else if (killer.multiKillCount === 3) {
          streakMsg = 'TRIPLE KILL!';
          streakColor = '#f97316';
        } else if (killer.multiKillCount >= 4) {
          streakMsg = 'MONSTER KILL!';
          streakColor = '#ef4444';
        }

        if (killer.killStreak === 5) {
          streakMsg = 'RAMPAGE!';
          streakColor = '#9333ea';
        } else if (killer.killStreak === 10) {
          streakMsg = 'UNSTOPPABLE!';
          streakColor = '#c026d3';
        } else if (killer.killStreak >= 15 && killer.killStreak % 5 === 0) {
          streakMsg = 'GODLIKE!';
          streakColor = '#f43f5e';
        }

        if (killer.isPlayer) {
          this.particles.addFloatingText(victim.x, victim.y - 30, streakMsg, streakColor);
          if (killer.multiKillCount > 1 || killer.killStreak >= 5) {
             soundManager.playAnnouncer(streakMsg);
          }
        }

        // Team Scores
        if (this.mode === 'team') {
          if (killer.team === 'blue') this.blueScore++;
          else if (killer.team === 'red') this.redScore++;
        }
      }

      // Kill Feed Notification
      const killerName = killer ? killer.name : 'البرميل المتفجر';
      this.events.onKillFeed({
        id: this.nextKillFeedId++,
        killerName,
        victimName: victim.name,
        weapon: (weapon as WeaponType) || 'rifle',
        time: performance.now(),
        isPlayerInvolved: victim.isPlayer || killer?.isPlayer || false,
      });

      this.checkMatchEnd();
    }
  }

  private updatePickupsAndBarrels(dt: number) {
    // Pickups
    for (let i = this.map.pickups.length - 1; i >= 0; i--) {
      const p = this.map.pickups[i];

      // Physics for dynamic dropped weapons
      if (p.isDropped) {
        if (!p.active) {
          this.map.pickups.splice(i, 1);
          continue;
        }

        p.vy = (p.vy || 0) + 650 * dt;
        p.vx = (p.vx || 0) * (1 - 2.5 * dt);

        const nextX = p.x + (p.vx || 0) * dt;
        const nextY = p.y + p.vy * dt;

        // Platform collision for dropped weapon
        for (const plat of this.map.platforms) {
          if (
            nextX + p.width > plat.x &&
            nextX < plat.x + plat.width &&
            nextY + p.height > plat.y &&
            nextY < plat.y + plat.height
          ) {
            // Landing on top of platform
            if (p.y + p.height <= plat.y + 12 && p.vy > 0) {
              p.vy = -p.vy * 0.28;
              if (Math.abs(p.vy) < 30) p.vy = 0;
              p.y = plat.y - p.height;
            } else {
              p.vx = -(p.vx || 0) * 0.3;
            }
          }
        }

        p.x += (p.vx || 0) * dt;
        p.y += p.vy * dt;

        // Boundaries clamp
        p.x = Math.max(30, Math.min(MAP_WIDTH - 60, p.x));
        p.y = Math.max(20, Math.min(MAP_HEIGHT - 60, p.y));
      } else {
        // Static map pickups respawn timer
        if (!p.active) {
          p.respawnTimer -= dt;
          if (p.respawnTimer <= 0) {
            p.active = true;
          }
          continue;
        }
      }

      // Check pickup overlap with player or bots
      const allCharacters = this.players;
      for (const char of allCharacters) {
        if (char.isDead) continue;
        if (
          char.x + char.width > p.x &&
          char.x < p.x + p.width &&
          char.y + char.height > p.y &&
          char.y < p.y + p.height
        ) {
          this.collectPickup(char, p, i);
          break;
        }
      }
    }

    // Barrels respawn
    for (const b of this.map.barrels) {
      if (b.exploded) {
        b.respawnTimer -= dt;
        if (b.respawnTimer <= 0) {
          b.exploded = false;
          b.health = b.maxHealth;
        }
      }
    }

    // Crates respawn
    if (this.map.crates) {
      for (const c of this.map.crates) {
        if (c.destroyed) {
          c.respawnTimer -= dt;
          if (c.respawnTimer <= 0) {
            c.destroyed = false;
            c.health = c.maxHealth;
          }
        }
      }
    }
  }

  private updateWeaponDrops(dt: number) {
    this.weaponDropTimer -= dt;
    if (this.weaponDropTimer <= 0) {
      this.weaponDropTimer = 25; // drop a new weapon every 25 seconds
      
      const platforms = this.map.platforms.filter(p => p.label && !p.label.includes('Bedrock') && !p.label.includes('Ceiling') && p.width > 100);
      if (platforms.length > 0) {
        const plat = platforms[Math.floor(Math.random() * platforms.length)];
        const weapons: WeaponType[] = ['sniper', 'rocket', 'shotgun', 'rifle'];
        const chosenWeapon = weapons[Math.floor(Math.random() * weapons.length)];
        
        // Find a safe spot on the platform
        const dropX = plat.x + 20 + Math.random() * (plat.width - 40);
        const dropY = plat.y - 45; // slightly above platform
        
        const newDrop = {
          id: this.nextPickupId++,
          type: 'weapon' as const,
          weapon: chosenWeapon,
          x: dropX,
          y: dropY,
          width: 44,
          height: 36,
          active: true,
          respawnTimer: 0,
          floatOffset: 0
        };
        
        this.map.pickups.push(newDrop);
        soundManager.playPickup('weapon'); // notify player of drop
      }
    }
  }

  private collectPickup(char: CharacterState, pickup: (typeof this.map.pickups)[0], index?: number) {
    pickup.active = false;
    pickup.respawnTimer = 18; // 18 seconds respawn

    if (pickup.type === 'health') {
      char.health = Math.min(char.maxHealth, char.health + 50);
      if (char.isPlayer) {
        soundManager.playPickup('health');
        this.particles.addFloatingText(char.x, char.y - 15, '+50 HP', '#22c55e');
      }
    } else if (pickup.type === 'boost') {
      char.fuel = char.maxFuel;
      if (char.isPlayer) {
        soundManager.playPickup('boost');
        this.particles.addFloatingText(char.x, char.y - 15, 'وقود كامل ⚡', '#38bdf8');
      }
    } else if (pickup.type === 'ammo') {
      // Refill current weapon reserves
      const curr = char.weapons[char.currentWeaponIndex] || 'pistol';
      char.reserveAmmo[curr] = (char.reserveAmmo[curr] || 0) + WEAPON_CONFIGS[curr].magazineSize * 2;
      if (char.isPlayer) {
        soundManager.playPickup('ammo');
        this.particles.addFloatingText(char.x, char.y - 15, '+ذخيرة', '#eab308');
      }
    } else if (pickup.type === 'weapon' && pickup.weapon) {
      const targetWeapon = pickup.weapon;
      const alreadyHas = char.weapons.includes(targetWeapon);

      if (alreadyHas) {
        // Just replenish reserve ammo for this weapon
        const added = pickup.reserveAmmo ?? WEAPON_CONFIGS[targetWeapon].magazineSize * 2;
        char.reserveAmmo[targetWeapon] = (char.reserveAmmo[targetWeapon] || 0) + added;
      } else if (char.weapons.length < 2) {
        // Player has slot available (e.g. spawned with 1 weapon or unarmed)
        char.weapons.push(targetWeapon);
        char.currentWeaponIndex = char.weapons.length - 1;
        char.ammo[targetWeapon] = pickup.ammo ?? WEAPON_CONFIGS[targetWeapon].magazineSize;
        char.reserveAmmo[targetWeapon] = pickup.reserveAmmo ?? WEAPON_CONFIGS[targetWeapon].magazineSize * 2;
      } else {
        // Player already carrying 2 weapons! Swap out the active weapon and drop it on the ground
        const oldWeapon = char.weapons[char.currentWeaponIndex];
        const oldAmmo = char.ammo[oldWeapon] ?? WEAPON_CONFIGS[oldWeapon].magazineSize;
        const oldReserve = char.reserveAmmo[oldWeapon] ?? WEAPON_CONFIGS[oldWeapon].magazineSize * 2;

        // Replace slot with new weapon
        char.weapons[char.currentWeaponIndex] = targetWeapon;
        char.ammo[targetWeapon] = pickup.ammo ?? WEAPON_CONFIGS[targetWeapon].magazineSize;
        char.reserveAmmo[targetWeapon] = pickup.reserveAmmo ?? WEAPON_CONFIGS[targetWeapon].magazineSize * 2;

        // Drop the old weapon at the player's feet
        this.map.pickups.push({
          id: Date.now() + Math.random(),
          type: 'weapon',
          weapon: oldWeapon,
          x: char.x + (char.facingRight ? -20 : 20),
          y: char.y + 10,
          width: 44,
          height: 36,
          active: true,
          respawnTimer: 0,
          floatOffset: 0,
          isDropped: true,
          ammo: oldAmmo,
          reserveAmmo: oldReserve,
          vx: (char.facingRight ? -140 : 140),
          vy: -100,
        });
      }

      if (char.isPlayer) {
        soundManager.playPickup('weapon');
        this.particles.addFloatingText(char.x, char.y - 15, `سلاح: ${WEAPON_CONFIGS[targetWeapon].nameAr}`, '#facc15');
      }

      // If this was a dropped pickup, remove it from list permanently so it doesn't respawn
      if (pickup.isDropped && index !== undefined) {
        this.map.pickups.splice(index, 1);
      }
    } else if (pickup.type === 'grenade') {
      char.grenades = Math.min(GRENADE_CONFIG.maxGrenades, char.grenades + 1);
      if (char.isPlayer) {
        soundManager.playPickup('ammo');
        this.particles.addFloatingText(char.x, char.y - 15, '+قنبلة 💣', '#22c55e');
      }
    }
  }

  private checkMatchEnd() {
    let isGameOver = false;
    let isVictory = false;

    if (this.mode === 'survival') {
      // In survival mode, if player is dead with 0 lives, game over
      if (this.player.isDead && this.player.deaths >= 3) {
        isGameOver = true;
        isVictory = false;
      } else {
        // Check if all bots in wave eliminated
        const aliveBots = this.bots.filter(b => !b.isDead);
        if (aliveBots.length === 0 && this.bots.length > 0) {
          this.wave++;
          this.events.onWaveComplete?.(this.wave);
          this.particles.addFloatingText(this.player.x, this.player.y - 50, `الموجة ${this.wave}!`, '#facc15');
          this.setupBots();
        }
      }
    } else if (this.mode === 'team') {
      if (this.blueScore >= 25 || this.redScore >= 25 || this.matchTimer <= 0) {
        isGameOver = true;
        isVictory = this.blueScore >= this.redScore;
      }
    } else {
      // Deathmatch (Free-for-all among 4 players)
      const maxKills = Math.max(0, ...this.players.map(p => p.kills));
      if (maxKills >= this.targetScore || this.matchTimer <= 0) {
        isGameOver = true;
        const leader = this.players.slice().sort((a, b) => b.kills - a.kills)[0];
        isVictory = leader.id === this.player.id;
      }
    }

    if (isGameOver) {
      this.stop();
      const sortedByKills = this.players.slice().sort((a, b) => b.kills - a.kills);
      const mvp = sortedByKills[0];
      this.events.onGameOver(
        isVictory,
        this.player.kills * 100 - this.player.deaths * 25,
        this.player.kills,
        this.player.deaths,
        this.player.headshots || 0,
        this.player.maxKillStreak || 0,
        this.player.damageDealt || 0,
        mvp?.name,
        mvp?.kills
      );
    }
  }

  private render() {
    const otherPlayers = this.players.filter(p => p.id !== this.player.id);
    this.renderer.render(
      this.map,
      this.player,
      otherPlayers,
      this.projectiles,
      this.particles,
      undefined,
      this.scopeLevel
    );
  }

  // State Getters for HUD
  public getPlayerState(): CharacterState {
    return this.player;
  }

  public getMatchInfo() {
    return {
      timer: Math.max(0, Math.floor(this.matchTimer)),
      blueScore: this.blueScore,
      redScore: this.redScore,
      playerKills: this.player.kills,
      playerDeaths: this.player.deaths,
      wave: this.wave,
      mode: this.mode,
      activePlayerIndex: this.activePlayerIndex,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        kills: p.kills,
        deaths: p.deaths,
        health: p.health,
        maxHealth: p.maxHealth,
        fuel: p.fuel,
        camo: p.camoColor,
        isPlayer: p.isPlayer,
      })),
    };
  }
}
