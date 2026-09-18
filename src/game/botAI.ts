import { CharacterState, Team, GameMode } from '../types';
import { MapData } from './mapData';
import { WEAPON_CONFIGS } from './weapons';

export class BotAIController {
  private mode: GameMode;

  constructor(mode: GameMode) {
    this.mode = mode;
  }

  public setMode(mode: GameMode) {
    this.mode = mode;
  }

  public updateBot(
    bot: CharacterState,
    allCharacters: CharacterState[],
    map: MapData,
    dt: number,
    onShoot: (bot: CharacterState) => void,
    onReload: (bot: CharacterState) => void,
    onSwitchWeapon: (bot: CharacterState) => void,
    onMelee?: (bot: CharacterState) => void,
    onThrowGrenade?: (bot: CharacterState) => void
  ) {
    if (bot.isDead) return;

    if (!bot.aiProfile) {
      bot.aiProfile = {
        personality: 'balanced',
        targetId: null,
        stateTimer: 0,
        preferredDistance: 300,
        reactionDelay: 0.2,
        accuracySpread: 0.12,
      };
    }

    const ai = bot.aiProfile;
    ai.stateTimer += dt;

    // 1. Target Selection (Every 0.5s or if current target died)
    const currentTarget = allCharacters.find(c => c.id === ai.targetId && !c.isDead);
    if (!currentTarget || ai.stateTimer > 0.6) {
      ai.targetId = this.findBestTarget(bot, allCharacters);
      ai.stateTimer = 0;
    }

    const target = allCharacters.find(c => c.id === ai.targetId && !c.isDead);

    // 2. Health Seeking when low HP
    if (bot.health < bot.maxHealth * 0.4) {
      const nearestHealth = this.findNearestPickup(bot, map, 'health');
      if (nearestHealth) {
        this.navigateToward(bot, nearestHealth.x, nearestHealth.y, dt);
      }
    }

    // Weapon Seeking if only carrying standard pistol
    if (bot.weapons.length <= 1 && bot.weapons[0] === 'pistol') {
      const nearestWeapon = this.findNearestWeaponPickup(bot, map);
      if (nearestWeapon) {
        this.navigateToward(bot, nearestWeapon.x, nearestWeapon.y, dt);
      }
    }

    if (!target) {
      // Idle / Roam behavior
      bot.isJetpacking = false;
      bot.vx *= 0.9;
      return;
    }

    // 3. Combat Logic against Target
    const dx = (target.x + target.width / 2) - (bot.x + bot.width / 2);
    const dy = (target.y + target.height / 2) - (bot.y + bot.height / 2);
    const dist = Math.hypot(dx, dy);

    // Smooth aim angle with slight aim spread
    const desiredAngle = Math.atan2(dy, dx);
    const aimDiff = desiredAngle - bot.aimAngle;
    // Normalize angle difference to [-PI, PI]
    const normalizedDiff = Math.atan2(Math.sin(aimDiff), Math.cos(aimDiff));
    bot.aimAngle += normalizedDiff * Math.min(1, 12 * dt);
    bot.facingRight = Math.cos(bot.aimAngle) >= 0;

    // 4. Melee combat if within close punch range (< 62px)
    if (dist < 62 && onMelee) {
      onMelee(bot);
    }

    // 5. Tactical Grenade Throwing
    if (dist > 160 && dist < 360 && bot.grenades > 0 && onThrowGrenade && Math.random() < 0.02) {
      onThrowGrenade(bot);
    }

    // 6. Crouching in bushes or when suppressed
    bot.isCrouching = bot.isGrounded && (bot.inBush || (bot.health < bot.maxHealth * 0.35 && dist > 200));

    // 7. Movement & Jetpack navigation
    const targetDist = ai.preferredDistance;

    if (dist > targetDist + 60) {
      // Approach target
      const moveDir = dx > 0 ? 1 : -1;
      bot.vx += moveDir * 520 * dt;
    } else if (dist < targetDist - 70) {
      // Back away slightly (kiting)
      const moveDir = dx > 0 ? -1 : 1;
      bot.vx += moveDir * 380 * dt;
    } else {
      // Strafe / oscillate
      bot.vx *= 0.92;
    }

    // Jetpack Decision:
    // Fly if target is significantly higher, or if jumping over obstacles, or if personality is 'flier'/'rusher'
    const isTargetAbove = dy < -70;
    const shouldFlyAcrobatic = (ai.personality === 'flier' || ai.personality === 'rusher') && bot.fuel > 25 && Math.random() < 0.08;
    
    if ((isTargetAbove || shouldFlyAcrobatic) && bot.fuel > 15) {
      bot.isJetpacking = true;
      bot.fuel = Math.max(0, bot.fuel - 24 * dt);
      bot.vy -= 1420 * dt;
      if (Math.abs(dx) > 30) {
        bot.vx += (dx > 0 ? 1 : -1) * 600 * dt;
      }
    } else if (bot.fuel < 10 || (!isTargetAbove && !shouldFlyAcrobatic)) {
      bot.isJetpacking = false;
      if (bot.isGrounded) {
        bot.fuel = Math.min(bot.maxFuel, bot.fuel + 40 * dt);
      }
    }

    // 8. Weapon Management & Firing
    const currWeapon = bot.weapons[bot.currentWeaponIndex] || 'pistol';
    const cfg = WEAPON_CONFIGS[currWeapon];
    const currentAmmo = bot.ammo[currWeapon];

    // Reload if empty
    if (currentAmmo <= 0 && !bot.isReloading) {
      onReload(bot);
    }

    // Switch weapon if out of ammo or has a better weapon for the range
    if (bot.weapons.length > 1 && Math.random() < 0.03) {
      if (dist < 250 && bot.weapons.includes('shotgun') && currWeapon !== 'shotgun') {
        onSwitchWeapon(bot);
      } else if (dist > 500 && bot.weapons.includes('sniper') && currWeapon !== 'sniper') {
        onSwitchWeapon(bot);
      } else if (dist > 300 && bot.weapons.includes('rocket') && currWeapon !== 'rocket') {
        onSwitchWeapon(bot);
      }
    }

    // Shoot if in range, facing target, and ammo ready
    if (dist < cfg.range && !bot.isReloading && currentAmmo > 0) {
      // Check if aim is reasonably on target (within 35 degrees)
      if (Math.abs(normalizedDiff) < 0.6) {
        onShoot(bot);
      }
    }
  }

  private findBestTarget(bot: CharacterState, characters: CharacterState[]): string | null {
    let closestId: string | null = null;
    let closestDist = Infinity;

    for (const c of characters) {
      if (c.id === bot.id || c.isDead) continue;

      // Friendly fire check based on game mode
      if (this.mode === 'team') {
        if (c.team === bot.team) continue; // friendly
      } else if (this.mode === 'survival') {
        // In survival, bots only hunt the player
        if (!c.isPlayer) continue;
      }

      const dx = c.x - bot.x;
      const dy = c.y - bot.y;
      const dist = Math.hypot(dx, dy);

      if (dist < closestDist) {
        closestDist = dist;
        closestId = c.id;
      }
    }

    return closestId;
  }

  private findNearestPickup(bot: CharacterState, map: MapData, type: 'health' | 'boost' | 'ammo') {
    let bestPickup = null;
    let bestDist = Infinity;

    for (const p of map.pickups) {
      if (!p.active || p.type !== type) continue;
      const dist = Math.hypot(p.x - bot.x, p.y - bot.y);
      if (dist < bestDist && dist < 700) {
        bestDist = dist;
        bestPickup = p;
      }
    }
    return bestPickup;
  }

  private findNearestWeaponPickup(bot: CharacterState, map: MapData) {
    let bestPickup = null;
    let bestDist = Infinity;

    for (const p of map.pickups) {
      if (!p.active || p.type !== 'weapon') continue;
      const dist = Math.hypot(p.x - bot.x, p.y - bot.y);
      if (dist < bestDist && dist < 900) {
        bestDist = dist;
        bestPickup = p;
      }
    }
    return bestPickup;
  }

  private navigateToward(bot: CharacterState, targetX: number, targetY: number, dt: number) {
    const dx = targetX - bot.x;
    const dy = targetY - bot.y;
    const dir = dx > 0 ? 1 : -1;

    bot.vx += dir * 400 * dt;

    if (dy < -60 && bot.fuel > 20) {
      bot.isJetpacking = true;
    } else {
      bot.isJetpacking = false;
    }
  }
}
