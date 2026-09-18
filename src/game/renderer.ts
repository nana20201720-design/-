import { CharacterState, Projectile, Pickup, ExplosiveBarrel, WoodenCrate, Platform, WeaponType, BloodDecal } from '../types';
import { ParticleSystem } from './particles';
import { MAP_WIDTH, MAP_HEIGHT, MapData } from './mapData';
import { WEAPON_CONFIGS } from './weapons';
import { drawWeaponSprite2D } from './weaponSprites';

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private camera = { x: 0, y: 0, width: 800, height: 450, zoom: 1 };
  private screenShake = 0;
  private animTime = 0;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  public setDimensions(width: number, height: number) {
    this.camera.width = width;
    this.camera.height = height;
  }

  public updateCamera(
    targetX: number,
    targetY: number,
    dt: number,
    lookAheadX: number = 0,
    lookAheadY: number = 0,
    targetZoom: number = 1
  ) {
    this.animTime += dt;
    
    // Smooth zoom lerp
    const zoomLerpSpeed = 4 * dt;
    this.camera.zoom += (targetZoom - this.camera.zoom) * zoomLerpSpeed;
    
    // Smooth camera follow with look-ahead, factoring in zoom
    const visibleW = this.camera.width / this.camera.zoom;
    const visibleH = this.camera.height / this.camera.zoom;
    const targetCamX = (targetX + lookAheadX) - visibleW / 2;
    const targetCamY = (targetY + lookAheadY) - visibleH / 2;

    // Bounds clamp (ensures camera stays cleanly inside the arena)
    const minX = 0;
    const maxX = Math.max(0, MAP_WIDTH - visibleW);
    const minY = 0;
    const maxY = Math.max(0, MAP_HEIGHT - visibleH);

    const lerpSpeed = 6.5 * dt;
    this.camera.x += (Math.max(minX, Math.min(maxX, targetCamX)) - this.camera.x) * lerpSpeed;
    this.camera.y += (Math.max(minY, Math.min(maxY, targetCamY)) - this.camera.y) * lerpSpeed;

    // Screen shake decay
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - 20 * dt);
    }
  }

  public addScreenShake(amount: number) {
    // Screen shake completely disabled per user request for rock-solid, smooth camera
    this.screenShake = 0;
  }

  public render(
    map: MapData,
    player: CharacterState,
    bots: CharacterState[],
    projectiles: Projectile[],
    particles: ParticleSystem,
    crosshairPos?: { x: number; y: number },
    scopeLevel: number = 1
  ) {
    const ctx = this.ctx;
    const w = this.camera.width;
    const h = this.camera.height;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // Apply Screen Shake
    let shakeX = 0;
    let shakeY = 0;
    if (this.screenShake > 0) {
      shakeX = (Math.random() * 2 - 1) * this.screenShake;
      shakeY = (Math.random() * 2 - 1) * this.screenShake;
    }

    // 1. Draw Parallax Background (Sky, Mountains, Rolling Hills, Clouds)
    this.renderParallaxBackground(ctx, w, h);

    // Translate to World coordinates and apply zoom
    ctx.save();
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.x + shakeX / this.camera.zoom, -this.camera.y + shakeY / this.camera.zoom);

    // 1.5 Draw Underground Tunnel Back-Walls & Depth Layering (Underground interior depth)
    this.renderTunnelDepthBackdrop(ctx);

    // 1.8 Draw Suspension Chains for floating decks
    if (map.scenery.chains) {
      this.renderChains(ctx, map.scenery.chains);
    }

    // 2. Draw Map Structures & Platforms (Foreground terrain)
    this.renderPlatforms(ctx, map.platforms);

    // 2.2 Draw Permanent/Decaying Blood Splat Decals on stone & ground surfaces
    this.renderBloodDecals(ctx, particles.getDecals());

    // 3. Draw Scenery (Bunkers, Outposts, Log Piles, Trees, Signs)
    this.renderScenery(ctx, map.scenery);

    // 4. Draw Explosive Barrels
    this.renderBarrels(ctx, map.barrels);

    // 4.5 Draw Destructible Wooden Crates
    if (map.crates) {
      this.renderCrates(ctx, map.crates);
    }

    // 5. Draw Pickups
    this.renderPickups(ctx, map.pickups);

    // 6. Draw Characters (Player and Bots)
    for (const bot of bots) {
      if (!bot.isDead) {
        this.renderCharacter(ctx, bot);
      }
    }
    if (!player.isDead) {
      this.renderCharacter(ctx, player, crosshairPos);
    }

    // 6.5 Draw Camouflage Bushes (Rendered in front of soldiers so they can hide inside!)
    if (map.scenery.bushes && map.scenery.bushes.length > 0) {
      this.renderBushes(ctx, map.scenery.bushes);
    }

    // Spawn subterranean falling dust motes
    particles.spawnSubterraneanDust(this.camera.x, this.camera.y, w / this.camera.zoom, h / this.camera.zoom);

    // 7. Draw Projectiles (Bullets, Rockets, Grenades)
    this.renderProjectiles(ctx, projectiles);

    // 8. Draw Particles (Jetpack flames, smoke rings, blood, sparks, shockwaves)
    this.renderParticles(ctx, particles);

    // 9. Draw Atmospheric Lighting & Tunnel Occlusion Shadows
    this.renderLightingOverlay(ctx, map.scenery.lamps);

    ctx.restore(); // Restore world translation

    // 10. Draw Floating Damage Texts (World coordinates mapped)
    this.renderFloatingTexts(ctx, particles);

    // 11. Draw Offscreen Enemy Indicators (Mini Militia Radar Arrows)
    this.renderOffscreenEnemyIndicators(ctx, player, bots);

    // 12. Draw Sniper Scope Vignette & Tactical Reticle when zoomed in
    if (scopeLevel > 1) {
      const cx = w / 2;
      const cy = h / 2;
      const outerRadius = Math.sqrt(cx * cx + cy * cy);
      // Contract circle based on scope zoom depth
      const innerRadius = scopeLevel === 2 ? outerRadius * 0.45 : outerRadius * 0.3;

      const grad = ctx.createRadialGradient(cx, cy, innerRadius, cx, cy, outerRadius);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(0.3, 'rgba(0, 0, 0, 0.1)');
      grad.addColorStop(0.65, 'rgba(0, 0, 0, 0.6)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.96)');

      ctx.save();
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Draw Sniper Tactical crosshairs
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      // Horizontal
      ctx.moveTo(cx - outerRadius * 0.3, cy);
      ctx.lineTo(cx + outerRadius * 0.3, cy);
      // Vertical
      ctx.moveTo(cx, cy - outerRadius * 0.3);
      ctx.lineTo(cx, cy + outerRadius * 0.3);
      ctx.stroke();

      // Tactical green circles and lock-on indicator
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.22)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(16, 185, 129, 0.08)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.arc(cx, cy, innerRadius + 15, 0, Math.PI * 2);
      ctx.stroke();

      // Tactical HUD scope labels
      ctx.fillStyle = 'rgba(16, 185, 129, 0.55)';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`TARGET ACQUIRED • ${scopeLevel}X SCOPE`, cx, cy - 35);
      ctx.fillText('CAMERA STABILIZED', cx, cy + 45);

      ctx.restore();
    }

    ctx.restore();
  }

  private renderParallaxBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // Mini Militia classic soft pale sage/blue sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#dce7e9');
    skyGrad.addColorStop(0.5, '#cbdcdb');
    skyGrad.addColorStop(1, '#b6c8c2');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    const worldW = w + 1200;

    // Layer 0: Distant Horizon Sun / Atmospheric Haze Glow
    const sunGrad = ctx.createRadialGradient(w * 0.75, h * 0.3, 20, w * 0.75, h * 0.3, 350);
    sunGrad.addColorStop(0, 'rgba(255, 255, 240, 0.35)');
    sunGrad.addColorStop(1, 'rgba(255, 255, 240, 0)');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, w, h);

    // Layer 1: Soft cartoon drifting clouds (Speed: 0.02)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    const cloudOffset = (this.animTime * 8 + this.camera.x * 0.02) % worldW;
    this.drawCloud(ctx, (worldW - cloudOffset + 100) % worldW - 150, 70, 180);
    this.drawCloud(ctx, (worldW - cloudOffset + 520) % worldW - 150, 120, 240);
    this.drawCloud(ctx, (worldW - cloudOffset + 950) % worldW - 150, 60, 160);

    // Layer 2: Distant soft misty blue-grey mountain peaks (Speed: 0.05, Height scale: 1.0)
    ctx.fillStyle = '#9cb5bc';
    const mOffset = (this.camera.x * 0.05) % worldW;
    ctx.beginPath();
    ctx.moveTo(0 - mOffset, h - 220);
    ctx.lineTo(280 - mOffset, h - 520);
    ctx.lineTo(620 - mOffset, h - 260);
    ctx.lineTo(980 - mOffset, h - 580);
    ctx.lineTo(1380 - mOffset, h - 280);
    ctx.lineTo(1800 - mOffset, h - 490);
    ctx.lineTo(worldW, h - 220);
    ctx.lineTo(worldW, h);
    ctx.lineTo(0, h);
    ctx.fill();

    // Layer 3: Mid-ground olive/green rolling hills (Speed: 0.12)
    ctx.fillStyle = '#7a9e75';
    const hOffset = (this.camera.x * 0.12) % worldW;
    ctx.beginPath();
    ctx.moveTo(0 - hOffset, h - 160);
    ctx.lineTo(350 - hOffset, h - 380);
    ctx.lineTo(740 - hOffset, h - 200);
    ctx.lineTo(1160 - hOffset, h - 420);
    ctx.lineTo(1580 - hOffset, h - 220);
    ctx.lineTo(2000 - hOffset, h - 350);
    ctx.lineTo(worldW, h - 160);
    ctx.lineTo(worldW, h);
    ctx.lineTo(0, h);
    ctx.fill();

    // Layer 4: Closer jagged pine/jungle silhouettes on ridge (Speed: 0.18)
    ctx.fillStyle = '#55754b';
    for (let tx = 0; tx < worldW; tx += 60) {
      const treeX = (tx - hOffset * 1.5 + worldW) % worldW;
      const treeY = h - 210 - Math.sin(tx * 0.015) * 45;
      const tHeight = 45 + (tx % 25);
      ctx.beginPath();
      ctx.moveTo(treeX, treeY);
      ctx.lineTo(treeX + 13, treeY - tHeight);
      ctx.lineTo(treeX + 26, treeY);
      ctx.fill();
    }

    // Layer 5: Foreground Parallax Ground Debris & Hanging Foliage Silhouettes (Speed: 0.30)
    ctx.fillStyle = 'rgba(56, 82, 48, 0.45)';
    const fgOffset = (this.camera.x * 0.30) % worldW;
    for (let fx = 0; fx < worldW; fx += 220) {
      const bushX = (fx - fgOffset + worldW) % worldW;
      ctx.beginPath();
      ctx.ellipse(bushX, h - 80, 55, 25, 0, 0, Math.PI * 2);
      ctx.ellipse(bushX + 35, h - 70, 40, 20, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Renders the authentic Mini Militia dark underground tunnel interior back-walls
   * creating genuine 2D parallax depth behind openings and under arches.
   */
  private renderTunnelDepthBackdrop(ctx: CanvasRenderingContext2D) {
    ctx.save();

    // 1. Dark Cavern Backwall Base Tone (#413d32 - #363228)
    ctx.fillStyle = '#3f3b30';
    // Deep catacombs entire continuous lower tunnel backwall (y: 1200 to 1900)
    ctx.fillRect(0, 1200, MAP_WIDTH, 700);

    // 2. Left Arch Cavern Passage Backwall (underneath left plateau between the pillars)
    ctx.fillRect(280, 680, 650, 600);

    // 3. Center-Left Chute Vertical Tunnel Backwall
    ctx.fillRect(1320, 850, 220, 500);

    // 4. Center Bowl Valley Drop Shaft Backwall
    ctx.fillRect(1900, 780, 500, 550);

    // 5. Right Ramp Arch Backwall
    ctx.fillRect(2650, 800, 650, 500);

    // 6. Underground Rocky Strata & Texture Details
    ctx.strokeStyle = '#2d2a21';
    ctx.lineWidth = 3;
    // Horizontal sedimentary rock bands
    for (let sy = 1260; sy < 1850; sy += 70) {
      ctx.beginPath();
      ctx.moveTo(0, sy + Math.sin(sy * 0.05) * 8);
      for (let sx = 0; sx < MAP_WIDTH; sx += 200) {
        ctx.lineTo(sx + 100, sy + Math.sin((sx + sy) * 0.02) * 12);
        ctx.lineTo(sx + 200, sy + Math.sin((sx + sy + 50) * 0.02) * 12);
      }
      ctx.stroke();
    }

    // 7. Atmospheric Tunnel Opening Shadows & Soft Depth Vignette
    // Soft radial shadow in Left Arch Cavern
    const leftArchShadow = ctx.createRadialGradient(600, 950, 40, 600, 950, 320);
    leftArchShadow.addColorStop(0, 'rgba(15, 15, 12, 0.65)');
    leftArchShadow.addColorStop(1, 'rgba(15, 15, 12, 0)');
    ctx.fillStyle = leftArchShadow;
    ctx.fillRect(280, 680, 650, 600);

    // Soft radial shadow in Center Drop Shaft
    const centerShaftShadow = ctx.createRadialGradient(2150, 1050, 50, 2150, 1050, 360);
    centerShaftShadow.addColorStop(0, 'rgba(15, 15, 12, 0.7)');
    centerShaftShadow.addColorStop(1, 'rgba(15, 15, 12, 0)');
    ctx.fillStyle = centerShaftShadow;
    ctx.fillRect(1900, 780, 500, 550);

    // Deep underground top shadow line (ceiling depth occlusion)
    const caveTopShadow = ctx.createLinearGradient(0, 1200, 0, 1320);
    caveTopShadow.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
    caveTopShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = caveTopShadow;
    ctx.fillRect(0, 1200, MAP_WIDTH, 120);

    ctx.restore();
  }

  private drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, width: number) {
    ctx.beginPath();
    ctx.arc(x, y, width * 0.2, Math.PI * 0.5, Math.PI * 1.5);
    ctx.arc(x + width * 0.25, y - width * 0.1, width * 0.25, Math.PI * 1, Math.PI * 2);
    ctx.arc(x + width * 0.6, y - width * 0.05, width * 0.2, Math.PI * 1, Math.PI * 2);
    ctx.arc(x + width, y, width * 0.2, Math.PI * 1.5, Math.PI * 0.5);
    ctx.closePath();
    ctx.fill();
  }

  private renderPlatforms(ctx: CanvasRenderingContext2D, platforms: Platform[]) {
    for (const p of platforms) {
      if (
        p.x + p.width < this.camera.x - 50 ||
        p.x > this.camera.x + this.camera.width + 50 ||
        p.y + p.height < this.camera.y - 50 ||
        p.y > this.camera.y + this.camera.height + 50
      ) continue;
      
      ctx.save();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3.5;
      
      if (p.type === 'ground' || p.type === 'rock') {
        // 1. Mini Militia Warm Matte Rock Base Tone
        ctx.fillStyle = '#9e9483';
        ctx.fillRect(p.x, p.y, p.width, p.height);

        // Lower darker earth shadow layer
        ctx.fillStyle = '#857b6b';
        ctx.fillRect(p.x, p.y + Math.min(22, p.height * 0.35), p.width, p.height - Math.min(22, p.height * 0.35));

        // Underground extra shadow if deep catacombs
        if (p.y >= 1200) {
          ctx.fillStyle = '#5c5447';
          ctx.fillRect(p.x, p.y + Math.min(45, p.height * 0.55), p.width, p.height - Math.min(45, p.height * 0.55));
        }

        // 2. Continuous Faceted Polygonal Rock Perimeter (The iconic Mini Militia stone borders!)
        const boulderSize = 32;
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = '#000000';

        // Top edge rock border
        for (let bx = p.x; bx < p.x + p.width; bx += boulderSize) {
          const bw = Math.min(boulderSize, p.x + p.width - bx);
          const bh = Math.min(20, p.height);
          
          // Light top-left facet
          ctx.fillStyle = '#ccc2b2';
          ctx.beginPath();
          ctx.moveTo(bx, p.y + bh * 0.7);
          ctx.lineTo(bx + bw * 0.4, p.y);
          ctx.lineTo(bx + bw, p.y + bh * 0.3);
          ctx.lineTo(bx + bw * 0.5, p.y + bh * 0.9);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Dark shadow facet
          ctx.fillStyle = '#7a7263';
          ctx.beginPath();
          ctx.moveTo(bx + bw * 0.5, p.y + bh * 0.9);
          ctx.lineTo(bx + bw, p.y + bh * 0.3);
          ctx.lineTo(bx + bw, p.y + bh);
          ctx.lineTo(bx, p.y + bh);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        // Left & Right edge boulders
        if (p.height > 30) {
          for (let by = p.y + 18; by < p.y + p.height - 10; by += 28) {
            // Left boulder
            ctx.fillStyle = '#b8ae9e';
            ctx.beginPath();
            ctx.moveTo(p.x, by);
            ctx.lineTo(p.x + 16, by + 6);
            ctx.lineTo(p.x + 12, by + 22);
            ctx.lineTo(p.x, by + 26);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Right boulder
            ctx.fillStyle = '#8f8677';
            ctx.beginPath();
            ctx.moveTo(p.x + p.width, by);
            ctx.lineTo(p.x + p.width - 16, by + 6);
            ctx.lineTo(p.x + p.width - 12, by + 22);
            ctx.lineTo(p.x + p.width, by + 26);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
        }

        // Interior stone embedded pebbles & cracks
        ctx.fillStyle = '#b5ab9b';
        for (let ox = 24; ox < p.width - 24; ox += 44) {
          const pr = 8 + (ox % 7);
          const pyOff = (p.height > 50 ? 28 + ((ox * 5) % 24) : p.height / 2);
          ctx.beginPath();
          ctx.arc(p.x + ox, p.y + pyOff, pr, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Highlight dot
          ctx.fillStyle = '#e2dacf';
          ctx.beginPath();
          ctx.arc(p.x + ox - pr * 0.3, p.y + pyOff - pr * 0.3, pr * 0.35, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#b5ab9b';
        }

        // 3. Spiky Vibrant Cartoon Grass along the top edges
        if (!p.oneWay) {
          ctx.lineWidth = 2.4;
          ctx.strokeStyle = '#000000';
          
          // Triple-tone jagged grass teeth
          ctx.fillStyle = '#559c25';
          ctx.beginPath();
          ctx.moveTo(p.x - 4, p.y + 4);
          for (let gx = p.x; gx < p.x + p.width + 4; gx += 10) {
            const toothH = 12 + ((gx * 3) % 9);
            ctx.lineTo(gx + 2, p.y - toothH);
            ctx.lineTo(gx + 5, p.y + 2);
            ctx.lineTo(gx + 8, p.y - toothH * 0.7);
            ctx.lineTo(gx + 10, p.y + 5);
          }
          ctx.lineTo(p.x + p.width + 4, p.y + 12);
          ctx.lineTo(p.x - 4, p.y + 12);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Yellow-green sunlit tip accents
          ctx.fillStyle = '#8ed438';
          for (let gx = p.x; gx < p.x + p.width; gx += 10) {
            const toothH = 12 + ((gx * 3) % 9);
            ctx.beginPath();
            ctx.moveTo(gx + 1, p.y - toothH * 0.4);
            ctx.lineTo(gx + 2, p.y - toothH);
            ctx.lineTo(gx + 4, p.y - toothH * 0.4);
            ctx.closePath();
            ctx.fill();
          }
        }

        // 4. Hanging rock stalactites on rock ceilings (underground caves)
        if (p.y >= 1150 && p.height >= 35) {
          ctx.fillStyle = '#857a6c';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2.4;
          for (let sx = 20; sx < p.width - 20; sx += 32) {
            const sLen = 18 + ((sx * 7) % 18);
            ctx.beginPath();
            ctx.moveTo(p.x + sx, p.y + p.height);
            ctx.lineTo(p.x + sx + 7, p.y + p.height + sLen);
            ctx.lineTo(p.x + sx + 14, p.y + p.height);
            ctx.fill();
            ctx.stroke();

            // Highlight facet on left of stalactite
            ctx.fillStyle = '#b0a494';
            ctx.beginPath();
            ctx.moveTo(p.x + sx, p.y + p.height);
            ctx.lineTo(p.x + sx + 7, p.y + p.height + sLen);
            ctx.lineTo(p.x + sx + 7, p.y + p.height);
            ctx.fill();
            ctx.fillStyle = '#857a6c';
          }
        }
      } else if (p.type === 'wood') {
        // Floating wooden suspension deck
        ctx.fillStyle = '#78350f';
        ctx.fillRect(p.x, p.y, p.width, p.height);
        ctx.fillStyle = '#92400e';
        ctx.fillRect(p.x, p.y, p.width, 5);

        // Plank divisions
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 2.2;
        for (let wx = 28; wx < p.width; wx += 32) {
          ctx.beginPath();
          ctx.moveTo(p.x + wx, p.y);
          ctx.lineTo(p.x + wx, p.y + p.height);
          ctx.stroke();
        }

        // Steel end brackets
        ctx.fillStyle = '#475569';
        ctx.fillRect(p.x, p.y, 8, p.height);
        ctx.fillRect(p.x + p.width - 8, p.y, 8, p.height);

      } else if (p.type === 'metal') {
        // Metallic steel suspension deck with yellow-black hazard stripes
        ctx.fillStyle = '#475569';
        ctx.fillRect(p.x, p.y, p.width, p.height);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(p.x, p.y, p.width, 4);

        // Cross-brace rivets
        ctx.fillStyle = '#0f172a';
        for (let mx = 12; mx < p.width - 8; mx += 26) {
          ctx.beginPath();
          ctx.arc(p.x + mx, p.y + p.height / 2, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Caution strip on bottom
        ctx.fillStyle = '#eab308';
        ctx.fillRect(p.x, p.y + p.height - 6, p.width, 6);
        ctx.fillStyle = '#000000';
        for (let hx = p.x; hx < p.x + p.width; hx += 16) {
          ctx.fillRect(hx, p.y + p.height - 6, 8, 6);
        }
      }
      
      ctx.strokeRect(p.x, p.y, p.width, p.height);
      ctx.restore();
    }
  }

  // Draw Persistent / Decaying Surface Blood Splat Decals on stone platforms
  private renderBloodDecals(ctx: CanvasRenderingContext2D, decals: BloodDecal[]) {
    if (!decals || decals.length === 0) return;
    ctx.save();
    for (const d of decals) {
      if (
        d.x + d.radius < this.camera.x - 50 ||
        d.x - d.radius > this.camera.x + this.camera.width + 50 ||
        d.y + d.radius < this.camera.y - 50 ||
        d.y - d.radius > this.camera.y + this.camera.height + 50
      ) {
        continue;
      }

      ctx.save();
      ctx.globalAlpha = d.alpha;
      ctx.fillStyle = d.color;
      ctx.strokeStyle = '#3b0707';
      ctx.lineWidth = 1.0;

      // Main central impact blotch
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
      ctx.fill();

      // Surrounding organic splat droplets
      for (const sp of d.splatPoints) {
        ctx.beginPath();
        ctx.arc(d.x + sp.dx, d.y + sp.dy, sp.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Downward drip streak if present on wall/ledge
      if (d.dripLength && d.dripLength > 0) {
        ctx.beginPath();
        ctx.moveTo(d.x - 1.5, d.y);
        ctx.lineTo(d.x - 0.8, d.y + d.dripLength);
        ctx.arc(d.x, d.y + d.dripLength, 1.6, 0, Math.PI);
        ctx.lineTo(d.x + 1.5, d.y);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }
    ctx.restore();
  }

  // Draw Steel Chains for floating suspension decks
  private renderChains(ctx: CanvasRenderingContext2D, chains: NonNullable<MapData['scenery']['chains']>) {
    ctx.save();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#64748b';

    for (const chain of chains) {
      const linkH = 14;
      const linkW = 8;
      for (let cy = chain.y1; cy < chain.y2; cy += linkH) {
        ctx.beginPath();
        ctx.roundRect(chain.x - linkW / 2, cy, linkW, linkH, 4);
        ctx.fill();
        ctx.stroke();

        // Inner hollow hole
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.roundRect(chain.x - linkW / 4, cy + 3, linkW / 2, linkH - 6, 2);
        ctx.fill();
        ctx.fillStyle = '#64748b';
      }
    }
    ctx.restore();
  }

  // Draw Destructible Wooden Crates
  private renderCrates(ctx: CanvasRenderingContext2D, crates: WoodenCrate[]) {
    for (const c of crates) {
      if (c.destroyed) continue;

      ctx.save();
      ctx.translate(c.x + c.width / 2, c.y + c.height / 2);

      // Wooden Crate Body
      ctx.fillStyle = '#92400e'; // pine wood
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.fillRect(-c.width / 2, -c.height / 2, c.width, c.height);
      ctx.strokeRect(-c.width / 2, -c.height / 2, c.width, c.height);

      // Inner lighter wood panel
      ctx.fillStyle = '#b45309';
      ctx.fillRect(-c.width / 2 + 5, -c.height / 2 + 5, c.width - 10, c.height - 10);
      ctx.strokeRect(-c.width / 2 + 5, -c.height / 2 + 5, c.width - 10, c.height - 10);

      // Cross Diagonal Bracing (X)
      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-c.width / 2 + 5, -c.height / 2 + 5);
      ctx.lineTo(c.width / 2 - 5, c.height / 2 - 5);
      ctx.moveTo(c.width / 2 - 5, -c.height / 2 + 5);
      ctx.lineTo(-c.width / 2 + 5, c.height / 2 - 5);
      ctx.stroke();

      // Steel Corner Brackets
      ctx.fillStyle = '#475569';
      const bSize = 8;
      // Top Left
      ctx.fillRect(-c.width / 2, -c.height / 2, bSize, bSize);
      // Top Right
      ctx.fillRect(c.width / 2 - bSize, -c.height / 2, bSize, bSize);
      // Bottom Left
      ctx.fillRect(-c.width / 2, c.height / 2 - bSize, bSize, bSize);
      // Bottom Right
      ctx.fillRect(c.width / 2 - bSize, c.height / 2 - bSize, bSize, bSize);

      // Stencil Loot Type Icon
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (c.lootType === 'health') {
        ctx.fillStyle = '#ef4444';
        ctx.fillText('➕', 0, 0);
      } else if (c.lootType === 'boost') {
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('⚡', 0, 0);
      } else if (c.lootType === 'grenade') {
        ctx.fillStyle = '#22c55e';
        ctx.fillText('💣', 0, 0);
      } else {
        ctx.fillStyle = '#facc15';
        ctx.fillText('📦', 0, 0);
      }

      // Health bar if damaged
      if (c.health < c.maxHealth) {
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(-16, -c.height / 2 - 8, 32, 5);
        ctx.fillStyle = '#eab308';
        ctx.fillRect(-16, -c.height / 2 - 8, (c.health / c.maxHealth) * 32, 5);
      }

      ctx.restore();
    }
  }

  private renderScenery(ctx: CanvasRenderingContext2D, scenery: MapData['scenery']) {
    // 1. Left Concrete Fortress Bunker (x: 350, y: 350, w: 440, h: 230)
    if (scenery.leftBunker) {
      const bk = scenery.leftBunker;
      ctx.save();
      // Main concrete base
      ctx.fillStyle = '#64748b';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3.5;
      ctx.fillRect(bk.x, bk.y, bk.width, bk.height);
      ctx.strokeRect(bk.x, bk.y, bk.width, bk.height);

      // Top parapet concrete bevel
      ctx.fillStyle = '#475569';
      ctx.fillRect(bk.x - 15, bk.y - 12, bk.width + 30, 20);
      ctx.strokeRect(bk.x - 15, bk.y - 12, bk.width + 30, 20);

      // Rocks and Boulders piled on Bunker Roof (Exact Mini Militia Outpost feature from screenshot)
      ctx.fillStyle = '#9e9483';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.4;
      for (let rx = bk.x - 6; rx < bk.x + bk.width + 6; rx += 36) {
        const rHeight = 22 + ((rx * 7) % 18);
        ctx.beginPath();
        ctx.moveTo(rx, bk.y - 12);
        ctx.lineTo(rx + 10, bk.y - 12 - rHeight * 0.8);
        ctx.lineTo(rx + 24, bk.y - 12 - rHeight);
        ctx.lineTo(rx + 36, bk.y - 12 - rHeight * 0.5);
        ctx.lineTo(rx + 40, bk.y - 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Facet highlight
        ctx.fillStyle = '#ccc2b2';
        ctx.beginPath();
        ctx.moveTo(rx, bk.y - 12);
        ctx.lineTo(rx + 10, bk.y - 12 - rHeight * 0.8);
        ctx.lineTo(rx + 24, bk.y - 12 - rHeight);
        ctx.lineTo(rx + 18, bk.y - 12);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#9e9483';

        // Grass tufts on rooftop rocks
        ctx.fillStyle = '#559c25';
        ctx.beginPath();
        ctx.moveTo(rx + 14, bk.y - 12 - rHeight + 2);
        ctx.lineTo(rx + 18, bk.y - 12 - rHeight - 8);
        ctx.lineTo(rx + 22, bk.y - 12 - rHeight + 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#9e9483';
      }

      // 3 Black Observation Window Slits (Mini Militia iconic bunker windows)
      ctx.fillStyle = '#0f172a';
      const slitW = 55;
      const slitH = 34;
      const startSlitX = bk.x + 60;
      for (let i = 0; i < 3; i++) {
        const sx = startSlitX + i * 110;
        ctx.fillRect(sx, bk.y + 45, slitW, slitH);
        ctx.strokeRect(sx, bk.y + 45, slitW, slitH);
        // Metal mesh grill
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx + slitW / 2, bk.y + 45);
        ctx.lineTo(sx + slitW / 2, bk.y + 45 + slitH);
        ctx.moveTo(sx, bk.y + 45 + slitH / 2);
        ctx.lineTo(sx + slitW, bk.y + 45 + slitH / 2);
        ctx.stroke();
      }

      // Concrete panel seams & warning stripes
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bk.x, bk.y + 120);
      ctx.lineTo(bk.x + bk.width, bk.y + 120);
      ctx.stroke();

      // Hazard yellow-black stripes on entrance
      ctx.fillStyle = '#eab308';
      ctx.fillRect(bk.x + 30, bk.y + bk.height - 24, bk.width - 60, 16);
      ctx.fillStyle = '#000000';
      for (let hx = bk.x + 30; hx < bk.x + bk.width - 60; hx += 24) {
        ctx.beginPath();
        ctx.moveTo(hx, bk.y + bk.height - 8);
        ctx.lineTo(hx + 12, bk.y + bk.height - 24);
        ctx.lineTo(hx + 20, bk.y + bk.height - 24);
        ctx.lineTo(hx + 8, bk.y + bk.height - 8);
        ctx.fill();
      }
      ctx.restore();
    }

    // 2. Right Timber Outpost Building (x: 3500, y: 880, w: 360, h: 270)
    if (scenery.rightOutpost) {
      const op = scenery.rightOutpost;
      ctx.save();
      // Stacked wooden logs facade
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      const logH = 26;
      for (let ly = op.y; ly < op.y + op.height; ly += logH) {
        const isDark = Math.floor((ly - op.y) / logH) % 2 === 0;
        ctx.fillStyle = isDark ? '#78350f' : '#854d0e';
        ctx.fillRect(op.x, ly, op.width, logH);
        ctx.strokeRect(op.x, ly, op.width, logH);

        // Circular cut log ends on edges
        ctx.fillStyle = '#a16207';
        ctx.beginPath();
        ctx.ellipse(op.x - 6, ly + logH / 2, 8, logH / 2 - 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(op.x + op.width + 6, ly + logH / 2, 8, logH / 2 - 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Outpost 3 Black Window Slits
      ctx.fillStyle = '#0f172a';
      const slitW = 46;
      const slitH = 32;
      for (let i = 0; i < 3; i++) {
        const sx = op.x + 40 + i * 105;
        ctx.fillRect(sx, op.y + 40, slitW, slitH);
        ctx.strokeRect(sx, op.y + 40, slitW, slitH);
      }

      // Rock corner reinforcements on Timber outpost
      ctx.fillStyle = '#9e9483';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.4;
      for (let rx = op.x - 10; rx < op.x + op.width + 10; rx += 45) {
        ctx.beginPath();
        ctx.arc(rx, op.y - 4, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    }

    // 3. Cut Wood Log Piles
    if (scenery.woodPiles) {
      for (const wp of scenery.woodPiles) {
        ctx.save();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        ctx.fillStyle = '#92400e';

        // Bottom row logs
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(wp.x + i * 22, wp.y - 12, 22, 14);
          ctx.strokeRect(wp.x + i * 22, wp.y - 12, 22, 14);
          ctx.fillStyle = '#b45309';
          ctx.beginPath();
          ctx.ellipse(wp.x + i * 22, wp.y - 5, 4, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#92400e';
        }
        // Top row log
        ctx.fillRect(wp.x + 11, wp.y - 24, 22, 14);
        ctx.strokeRect(wp.x + 11, wp.y - 24, 22, 14);
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.ellipse(wp.x + 11, wp.y - 17, 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    // 4. Trees
    for (const tree of scenery.trees) {
      ctx.save();
      ctx.translate(tree.x, tree.y);
      ctx.scale(tree.scale, tree.scale);

      // Trunk
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-10, -90, 20, 90);

      // Lush leafy canopy circles
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(-22, -110, 36, 0, Math.PI * 2);
      ctx.arc(22, -110, 36, 0, Math.PI * 2);
      ctx.arc(0, -145, 45, 0, Math.PI * 2);
      ctx.fill();

      // Highlight leaves
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(-10, -140, 25, 0, Math.PI * 2);
      ctx.arc(15, -120, 20, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // 5. Signs
    for (const sign of scenery.signs) {
      ctx.save();
      ctx.fillStyle = '#475569';
      ctx.fillRect(sign.x + 8, sign.y, 4, 25); // post
      
      // Board
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(sign.x - 36, sign.y - 20, 92, 22);
      ctx.strokeStyle = '#b91c1c';
      ctx.lineWidth = 2;
      ctx.strokeRect(sign.x - 36, sign.y - 20, 92, 22);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 9px Chakra Petch, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(sign.text, sign.x + 10, sign.y - 6);
      ctx.restore();
    }
  }

  // Camouflage Bushes (Rendered in front of characters so soldiers can hide inside!)
  private renderBushes(ctx: CanvasRenderingContext2D, bushes: MapData['scenery']['bushes']) {
    for (const b of bushes) {
      // Frustum culling
      if (
        b.x + b.width < this.camera.x - 50 ||
        b.x > this.camera.x + this.camera.width + 50 ||
        b.y + b.height < this.camera.y - 50 ||
        b.y > this.camera.y + this.camera.height + 50
      ) {
        continue;
      }

      ctx.save();
      // Semi-transparent so players can see their silhouette inside
      ctx.globalAlpha = 0.88;

      const clusterCount = 5;
      const radius = b.height * 0.55;

      // Dark foliage background layer
      ctx.fillStyle = '#14532d';
      for (let i = 0; i < clusterCount; i++) {
        const cx = b.x + (b.width / (clusterCount + 1)) * (i + 1);
        const cy = b.y - b.height * 0.35 + (i % 2 === 0 ? -4 : 4);
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 1.05, 0, Math.PI * 2);
        ctx.fill();
      }

      // Mid vibrant cartoon leaves
      ctx.fillStyle = '#16a34a';
      for (let i = 0; i < clusterCount; i++) {
        const cx = b.x + (b.width / (clusterCount + 1)) * (i + 1) + (i % 2 === 0 ? -3 : 3);
        const cy = b.y - b.height * 0.42;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.85, 0, Math.PI * 2);
        ctx.fill();
      }

      // Top sun-kissed leaf highlights
      ctx.fillStyle = '#4ade80';
      for (let i = 0; i < clusterCount; i++) {
        const cx = b.x + (b.width / (clusterCount + 1)) * (i + 1);
        const cy = b.y - b.height * 0.55;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }

      // Leaf cluster specks
      ctx.fillStyle = '#86efac';
      for (let i = 0; i < clusterCount; i++) {
        const cx = b.x + (b.width / (clusterCount + 1)) * (i + 1) + 4;
        const cy = b.y - b.height * 0.6;
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private renderBarrels(ctx: CanvasRenderingContext2D, barrels: ExplosiveBarrel[]) {
    for (const b of barrels) {
      if (b.exploded) continue;

      ctx.save();
      ctx.translate(b.x + b.width / 2, b.y + b.height / 2);

      // Red explosive barrel body
      const barrelGrad = ctx.createLinearGradient(-b.width / 2, 0, b.width / 2, 0);
      barrelGrad.addColorStop(0, '#991b1b');
      barrelGrad.addColorStop(0.5, '#dc2626');
      barrelGrad.addColorStop(1, '#7f1d1d');
      ctx.fillStyle = barrelGrad;

      // Rounded barrel cylinder
      ctx.beginPath();
      ctx.roundRect(-b.width / 2, -b.height / 2, b.width, b.height, 6);
      ctx.fill();

      // Metal bands
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-b.width / 2, -b.height / 2 + 8, b.width, 4);
      ctx.fillRect(-b.width / 2, b.height / 2 - 12, b.width, 4);

      // Yellow hazard flame symbol
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔥', 0, 0);

      // Health bar if damaged
      if (b.health < b.maxHealth) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(-16, -b.height / 2 - 8, 32, 5);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-16, -b.height / 2 - 8, (b.health / b.maxHealth) * 32, 5);
      }

      ctx.restore();
    }
  }

  private renderPickups(ctx: CanvasRenderingContext2D, pickups: Pickup[]) {
    for (const p of pickups) {
      if (!p.active) continue;

      ctx.save();
      const bobY = Math.sin(this.animTime * 3.5 + p.id) * 5;
      ctx.translate(p.x + p.width / 2, p.y + p.height / 2 + bobY);

      // Radial Ground Glow Aura
      const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 30);
      if (p.type === 'health') {
        glow.addColorStop(0, 'rgba(34, 197, 94, 0.45)');
        glow.addColorStop(1, 'rgba(34, 197, 94, 0)');
      } else if (p.type === 'boost') {
        glow.addColorStop(0, 'rgba(56, 189, 248, 0.55)');
        glow.addColorStop(1, 'rgba(56, 189, 248, 0)');
      } else if (p.type === 'weapon') {
        if (p.weapon === 'rocket') {
          glow.addColorStop(0, 'rgba(234, 179, 8, 0.6)');
        } else if (p.weapon === 'sniper') {
          glow.addColorStop(0, 'rgba(56, 189, 248, 0.6)');
        } else if (p.weapon === 'shotgun') {
          glow.addColorStop(0, 'rgba(168, 85, 247, 0.6)');
        } else {
          glow.addColorStop(0, 'rgba(34, 197, 94, 0.5)');
        }
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        glow.addColorStop(0, 'rgba(249, 115, 22, 0.45)');
        glow.addColorStop(1, 'rgba(249, 115, 22, 0)');
      }
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.fill();

      if (p.type === 'health') {
        // Authentic Medkit Pack
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.roundRect(-15, -11, 30, 22, 4);
        ctx.fill();
        ctx.stroke();

        // Steel Latches
        ctx.fillStyle = '#64748b';
        ctx.fillRect(-11, -13, 5, 4);
        ctx.fillRect(6, -13, 5, 4);

        // Bold Red Cross
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-3, -7, 6, 14);
        ctx.fillRect(-7, -3, 14, 6);

        // Name tag
        this.renderItemBadge(ctx, '➕ MEDKIT', '#22c55e', 0, -22);

      } else if (p.type === 'boost') {
        // Fuel / Nitro Booster Canister
        ctx.fillStyle = '#0284c7';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.roundRect(-9, -15, 18, 30, 6);
        ctx.fill();
        ctx.stroke();

        // Gauge / Level glass
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-5, -8, 10, 16);

        // Nozzle top
        ctx.fillStyle = '#64748b';
        ctx.fillRect(-4, -18, 8, 4);

        // Lightning Bolt Symbol
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡', 0, 0);

        this.renderItemBadge(ctx, '⚡ NITRO BOOST', '#38bdf8', 0, -26);

      } else if (p.type === 'ammo') {
        // Heavy Olive Drab Ammo Can
        ctx.fillStyle = '#166534';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.roundRect(-16, -11, 32, 22, 3);
        ctx.fill();
        ctx.stroke();

        // Metal Top Handle
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.strokeRect(-8, -14, 16, 4);

        // Stencil Text
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 9px Chakra Petch, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('AMMO', 0, 1);

        this.renderItemBadge(ctx, '📦 AMMO PACK', '#eab308', 0, -24);

      } else if (p.type === 'weapon' && p.weapon) {
        // REAL DROPPED WEAPON ON THE GROUND (NO BOXES!)
        ctx.save();
        ctx.rotate(-0.15); // subtle 9-degree floor tilt
        ctx.scale(1.15, 1.15);
        this.renderWeaponSprite(ctx, p.weapon);
        ctx.restore();

      } else if (p.type === 'grenade') {
        // Detailed Pineapple Frag Grenade
        ctx.fillStyle = '#166534';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(0, 2, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Grid Segments
        ctx.strokeStyle = '#14532d';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-10, 2); ctx.lineTo(10, 2);
        ctx.moveTo(0, -9); ctx.lineTo(0, 13);
        ctx.stroke();

        // Safety lever & pin cap
        ctx.fillStyle = '#64748b';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.fillRect(-3, -12, 6, 6);
        ctx.strokeRect(-3, -12, 6, 6);

        // Blinking Red LED
        const blink = Math.sin(this.animTime * 14) > 0;
        ctx.fillStyle = blink ? '#ef4444' : '#7f1d1d';
        ctx.beginPath();
        ctx.arc(0, 2, 3.5, 0, Math.PI * 2);
        ctx.fill();

        this.renderItemBadge(ctx, '💣 GRENADE', '#22c55e', 0, -22);
      }

      ctx.restore();
    }
  }

  private renderItemBadge(ctx: CanvasRenderingContext2D, text: string, color: string, x: number, y: number) {
    ctx.save();
    ctx.font = 'bold 10px Chakra Petch, Cairo, sans-serif';
    const textW = ctx.measureText(text).width;
    const padW = textW + 14;
    const padH = 16;

    // Dark pill container
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x - padW / 2, y - padH / 2, padW, padH, 6);
    ctx.fill();
    ctx.stroke();

    // Text label
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  /**
   * Renders the iconic Mini Militia style 2D cartoon soldier with custom avatars!
   */
  private renderCharacter(
    ctx: CanvasRenderingContext2D,
    char: CharacterState,
    crosshairPos?: { x: number; y: number }
  ) {
    ctx.save();
    const centerX = char.x + char.width / 2;
    const centerY = char.y + char.height / 2;
    ctx.translate(centerX, centerY);

    const isFacingRight = char.facingRight;
    const facingMultiplier = isFacingRight ? 1 : -1;
    const crouchShift = char.isCrouching ? 8 : 0;

    // Laser Sight Line & Dynamic Accuracy Crosshair
    if (char.isPlayer || char.aiProfile) {
      ctx.save();
      const currW = char.weapons[char.currentWeaponIndex] || 'pistol';
      const aimDist = currW === 'sniper' ? 440 : 280;
      const muzzleX = Math.cos(char.aimAngle) * 28;
      const muzzleY = Math.sin(char.aimAngle) * 28 + crouchShift;
      ctx.strokeStyle = char.isPlayer ? 'rgba(56, 189, 248, 0.5)' : 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(muzzleX, muzzleY);
      ctx.lineTo(
        muzzleX + Math.cos(char.aimAngle) * aimDist,
        muzzleY + Math.sin(char.aimAngle) * aimDist
      );
      ctx.stroke();

      // Dynamic Weapon Accuracy Crosshair (expands when moving/firing, shrinks when standing still)
      if (char.isPlayer) {
        const isMoving = Math.abs(char.vx) > 0.4 || Math.abs(char.vy) > 0.4;
        const isFiring = char.muzzleFlashTimer > 0;
        const spreadRadius = 6 + (isMoving ? 10 : 0) + (isFiring ? 14 : 0);
        const targetX = muzzleX + Math.cos(char.aimAngle) * aimDist;
        const targetY = muzzleY + Math.sin(char.aimAngle) * aimDist;
        const crosshairColor = (isMoving || isFiring) ? '#f59e0b' : '#38bdf8';

        ctx.save();
        ctx.strokeStyle = crosshairColor;
        ctx.fillStyle = crosshairColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([]); // solid crosshair brackets

        const tickLen = 6;
        // Top tick
        ctx.beginPath();
        ctx.moveTo(targetX, targetY - spreadRadius - tickLen);
        ctx.lineTo(targetX, targetY - spreadRadius);
        // Bottom tick
        ctx.moveTo(targetX, targetY + spreadRadius);
        ctx.lineTo(targetX, targetY + spreadRadius + tickLen);
        // Left tick
        ctx.moveTo(targetX - spreadRadius - tickLen, targetY);
        ctx.lineTo(targetX - spreadRadius, targetY);
        // Right tick
        ctx.moveTo(targetX + spreadRadius, targetY);
        ctx.lineTo(targetX + spreadRadius + tickLen, targetY);
        ctx.stroke();

        // Center precision dot
        ctx.beginPath();
        ctx.arc(targetX, targetY, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // Bot crosshair dot
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(
          muzzleX + Math.cos(char.aimAngle) * aimDist,
          muzzleY + Math.sin(char.aimAngle) * aimDist,
          3.5, 0, Math.PI * 2
        );
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.scale(facingMultiplier, 1);

    // Jetpack Body & Flight Exhaust
    const jetpackX = -13;
    const jetpackY = -6 + crouchShift;

    // Dual Jetpack Thruster Flames & Smoke Puffs
    if (char.isJetpacking) {
      const flameLen = 18 + Math.sin(this.animTime * 32) * 8;

      // Outer Orange Jet Flame Cones
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(jetpackX - 4, jetpackY + 22);
      ctx.lineTo(jetpackX + 1, jetpackY + 22 + flameLen);
      ctx.lineTo(jetpackX + 6, jetpackY + 22);
      ctx.fill();

      // Inner Bright Yellow / White Core
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.moveTo(jetpackX - 2, jetpackY + 22);
      ctx.lineTo(jetpackX + 1, jetpackY + 20 + flameLen * 0.65);
      ctx.lineTo(jetpackX + 4, jetpackY + 22);
      ctx.fill();

      // Expanding White Smoke Rings / Puffs trailing underneath boots (Iconic Doodle Army 2 look)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      for (let s = 1; s <= 3; s++) {
        const smokeOffset = (this.animTime * 50 + s * 14) % 45;
        const sRadius = 4 + smokeOffset * 0.25;
        ctx.beginPath();
        ctx.arc(jetpackX + 1, jetpackY + 22 + flameLen + smokeOffset, sRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Jetpack Metal Canister Unit
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.roundRect(jetpackX - 4, jetpackY, 15, 22, 4);
    ctx.fill();
    ctx.stroke();
    // Metal belt clip & indicator light
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(jetpackX - 2, jetpackY + 4, 11, 4);

    // Floating Cartoon Boots
    const legY = char.isCrouching ? 12 : 16;
    const walkSin = char.isGrounded ? Math.sin(char.walkCycle) * 6 : 0;
    
    // Back Boot
    ctx.fillStyle = '#1c1917';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(-6 + (char.isJetpacking ? -2 : walkSin), legY, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Boot sole
    ctx.fillStyle = '#44403c';
    ctx.fillRect(-10 + (char.isJetpacking ? -2 : walkSin), legY + 2, 8, 3);

    // Front Boot
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.ellipse(4 + (char.isJetpacking ? 2 : -walkSin), legY, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#44403c';
    ctx.fillRect(0 + (char.isJetpacking ? 2 : -walkSin), legY + 2, 8, 3);

    // Soldier Torso (Pill-shaped military camo vest)
    const charAvatarIndex = char.charAvatarIndex || 1;
    const camoBase = char.camoColor || '#365314';
    ctx.fillStyle = camoBase;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-9, -8 + crouchShift, 18, 21 - (char.isCrouching ? 6 : 0), 7);
    ctx.fill();
    ctx.stroke();

    // Camo Spot Details on Vest
    ctx.fillStyle = '#1e3a2f';
    ctx.beginPath();
    ctx.arc(-3, -2 + crouchShift, 4, 0, Math.PI * 2);
    ctx.arc(4, 3 + crouchShift, 3, 0, Math.PI * 2);
    ctx.fill();

    // Ammo Cross-Bandolier Strap across chest
    ctx.strokeStyle = '#292524';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-8, -6 + crouchShift);
    ctx.lineTo(7, 8 + crouchShift);
    ctx.stroke();
    // Brass Bullets on bandolier
    ctx.fillStyle = '#facc15';
    for (let bi = 0; bi < 3; bi++) {
      ctx.fillRect(-4 + bi * 4, -4 + bi * 4 + crouchShift, 2.5, 3.5);
    }

    // Belt & Buckle
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-9, 3 + crouchShift, 18, 4);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(-2, 3 + crouchShift, 4, 4);

    // Head
    const headX = 0;
    const headY = -15 + crouchShift;
    const headRadius = 13.5;

    // Skin Face
    ctx.fillStyle = char.skinTone || '#fbb587';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Ear
    ctx.fillStyle = char.skinTone || '#fbb587';
    ctx.beginPath();
    ctx.arc(headX - 11, headY, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Big White Cartoon Eyes with Black Pupils
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    // Front eye
    ctx.beginPath();
    ctx.ellipse(headX + 5, headY - 1, 5, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Back eye
    ctx.beginPath();
    ctx.ellipse(headX - 2, headY - 1, 4.5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Dynamic Black Pupils tracking aim direction
    const eyeLookAngle = isFacingRight ? char.aimAngle : Math.PI - char.aimAngle;
    const pupilOffsetX = Math.cos(eyeLookAngle) * 1.8;
    const pupilOffsetY = Math.sin(eyeLookAngle) * 1.5;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(headX + 5.5 + pupilOffsetX, headY - 1 + pupilOffsetY, 2.2, 0, Math.PI * 2);
    ctx.arc(headX - 1.5 + pupilOffsetX, headY - 1 + pupilOffsetY, 2.0, 0, Math.PI * 2);
    ctx.fill();

    // Eye catchlights (bright glint speck)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(headX + 5.5 + pupilOffsetX - 0.7, headY - 1 + pupilOffsetY - 0.7, 0.8, 0, Math.PI * 2);
    ctx.arc(headX - 1.5 + pupilOffsetX - 0.7, headY - 1 + pupilOffsetY - 0.7, 0.7, 0, Math.PI * 2);
    ctx.fill();

    // Angry / Fierce Eyebrows
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(headX - 5, headY - 6);
    ctx.lineTo(headX + 1, headY - 4);
    ctx.moveTo(headX + 2, headY - 4);
    ctx.lineTo(headX + 9, headY - 6);
    ctx.stroke();

    // Gritted Teeth Mouth (Iconic Mini Militia combat expression)
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.8;
    ctx.fillRect(headX + 1, headY + 5, 8, 4.5);
    ctx.strokeRect(headX + 1, headY + 5, 8, 4.5);
    // Vertical Teeth Separator Lines
    ctx.beginPath();
    ctx.moveTo(headX + 3.5, headY + 5);
    ctx.lineTo(headX + 3.5, headY + 9.5);
    ctx.moveTo(headX + 6, headY + 5);
    ctx.lineTo(headX + 6, headY + 9.5);
    ctx.moveTo(headX + 1, headY + 7.2);
    ctx.lineTo(headX + 9, headY + 7.2);
    ctx.stroke();

    // Facial Hair for Commando / Rebel avatars
    if (charAvatarIndex === 3 || charAvatarIndex === 4) {
      // Black Mustache & Goatee
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.arc(headX + 5, headY + 4, 3.5, 0, Math.PI * 2);
      ctx.fill();
      if (charAvatarIndex === 4) {
        // Beard stubble along jaw
        ctx.fillRect(headX - 4, headY + 9, 12, 3);
      }
    }

    // ==========================================
    // CUSTOM AVATAR HEADGEAR (Helmets / Berets / Bandana)
    // ==========================================
    if (charAvatarIndex === 2) {
      // AVATAR 2: Commando Bandana (Blonde/Brown hair + Camo Headband)
      ctx.fillStyle = '#ca8a04'; // Blonde hair fringe
      ctx.beginPath();
      ctx.arc(headX, headY - 4, 14.5, Math.PI * 0.9, Math.PI * 2.1, false);
      ctx.fill();
      // Olive Bandana Headband
      ctx.fillStyle = '#4d7c0f';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(headX - 14, headY - 7, 28, 6, 2);
      ctx.fill();
      ctx.stroke();
      // Tied knot dangling at back
      ctx.beginPath();
      ctx.moveTo(headX - 12, headY - 5);
      ctx.lineTo(headX - 18, headY);
      ctx.lineTo(headX - 14, headY - 3);
      ctx.stroke();

    } else if (charAvatarIndex === 3) {
      // AVATAR 3: Green Beret Special Forces
      ctx.fillStyle = '#3f6212';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.ellipse(headX + 2, headY - 9, 16, 8, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Beret Band
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(headX - 12, headY - 6, 24, 4);
      // Silver Star / Crest Emblem on Beret
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(headX + 7, headY - 9, 3, 0, Math.PI * 2);
      ctx.fill();

    } else if (charAvatarIndex === 4) {
      // AVATAR 4: Red Beret Rebel Commander (Che Guevara style)
      ctx.fillStyle = '#991b1b';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.ellipse(headX + 2, headY - 9, 16, 8, -0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Beret Band
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(headX - 12, headY - 6, 24, 4);
      // Yellow Star Emblem
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(headX + 7, headY - 9, 3, 0, Math.PI * 2);
      ctx.fill();

    } else {
      // AVATAR 1: Classic Mini Militia Military Helmet
      ctx.fillStyle = char.camoColor || '#4d7c0f';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(headX, headY - 3, 15, Math.PI, 0, false);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Helmet Lower Rim
      ctx.fillStyle = '#365314';
      ctx.beginPath();
      ctx.roundRect(headX - 15, headY - 4, 30, 4.5, 2);
      ctx.fill();
      ctx.stroke();

      // Helmet Chin Strap
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(headX - 10, headY);
      ctx.lineTo(headX - 4, headY + 11);
      ctx.stroke();
    }

    // ==========================================
    // PROCEDURAL WEAPON SWAY & WEIGHT DYNAMICS
    // ==========================================
    const currWeapon = char.weapons[char.currentWeaponIndex] || 'pistol';
    const charSeed = (parseInt(char.id.replace(/\D/g, '')) || 1) * 1.5;
    
    // Weapon Weight & Inertia Parameters
    let weightFactor = 1.0;
    let swayBobFactor = 1.0;
    let kickMuzzleLift = 0.12;
    let weaponScale = 1.0;
    let shoulderOffsetY = 0;

    if (currWeapon === 'pistol') {
      weightFactor = 0.6;
      swayBobFactor = 0.65;
      kickMuzzleLift = 0.08;
      weaponScale = 0.95;
    } else if (currWeapon === 'rifle') {
      weightFactor = 1.0;
      swayBobFactor = 1.0;
      kickMuzzleLift = 0.12;
      weaponScale = 1.0;
    } else if (currWeapon === 'shotgun') {
      weightFactor = 1.35;
      swayBobFactor = 1.25;
      kickMuzzleLift = 0.22;
      weaponScale = 1.05;
    } else if (currWeapon === 'sniper') {
      weightFactor = 1.75;
      swayBobFactor = 1.45;
      kickMuzzleLift = 0.28;
      weaponScale = 1.1;
    } else if (currWeapon === 'rocket') {
      weightFactor = 2.1;
      swayBobFactor = 1.6;
      kickMuzzleLift = 0.34;
      weaponScale = 1.15;
      shoulderOffsetY = -5; // Shoulder-mounted stance
    }

    // Crouch Stance Dampener
    const crouchDampener = char.isCrouching ? 0.35 : 1.0;

    // 1. Horizontal & Vertical Inertia Drag
    const speedRatioX = Math.max(-1, Math.min(1, char.vx / 360));
    const speedRatioY = Math.max(-1, Math.min(1, char.vy / 450));
    const inertiaDragX = -speedRatioX * 5.5 * weightFactor * crouchDampener;
    const inertiaDragY = speedRatioY * 4.0 * weightFactor * crouchDampener;
    const inertiaTilt = -speedRatioX * 0.05 * weightFactor * crouchDampener + (speedRatioY * 0.04 * weightFactor);

    // 2. Walking Harmonic Bob & Gait Cadence
    let walkBobX = 0;
    let walkBobY = 0;
    let walkBobTilt = 0;
    if (char.isGrounded && Math.abs(char.vx) > 15) {
      walkBobX = Math.cos(char.walkCycle) * 2.0 * swayBobFactor * crouchDampener;
      walkBobY = Math.sin(char.walkCycle * 2) * 2.8 * swayBobFactor * crouchDampener;
      walkBobTilt = Math.sin(char.walkCycle) * 0.05 * weightFactor * crouchDampener;
    }

    // 3. Idle / Breathing Harmonic Sway (Lissajous curve)
    const breathX = Math.cos(this.animTime * 2.2 + charSeed) * 0.8 * crouchDampener;
    const breathY = Math.sin(this.animTime * 2.8 + charSeed) * 1.2 * crouchDampener;
    const breathTilt = Math.sin(this.animTime * 2.0 + charSeed) * 0.02 * crouchDampener;

    // 4. Jetpack Motor Vibration Jitter
    let jetJitterX = 0;
    let jetJitterY = 0;
    let jetTilt = 0;
    if (char.isJetpacking) {
      jetJitterX = (Math.sin(this.animTime * 48) + Math.cos(this.animTime * 36)) * 0.7;
      jetJitterY = (Math.cos(this.animTime * 42) + Math.sin(this.animTime * 30)) * 0.9;
      jetTilt = Math.sin(this.animTime * 52) * 0.035;
    }

    // 5. Recoil Muzzle Climb Lift
    const recoilOffset = char.recoilOffset || 0;
    const recoilMuzzleClimb = -(recoilOffset / 14) * kickMuzzleLift;

    // Combine all procedural sway displacements
    const totalSwayX = (inertiaDragX + walkBobX + breathX + jetJitterX) * (isFacingRight ? 1 : -1);
    const totalSwayY = inertiaDragY + walkBobY + breathY + jetJitterY + shoulderOffsetY;
    const totalSwayTilt = inertiaTilt + walkBobTilt + breathTilt + jetTilt + recoilMuzzleClimb;

    // Arms & Weapon Transformation with Sway Matrix
    ctx.save();
    ctx.translate(totalSwayX, crouchShift + totalSwayY);

    let baseGunAngle = char.aimAngle;
    if (!isFacingRight) baseGunAngle = Math.PI - char.aimAngle;
    
    // Apply procedural tilt to weapon angle
    ctx.rotate(baseGunAngle + totalSwayTilt);
    ctx.translate(-recoilOffset, 0);

    if (char.weapons.length > 0) {
      this.renderWeaponSprite(ctx, currWeapon, weaponScale);

      // Dynamic Disembodied Hands with gripping fingers
      ctx.fillStyle = char.skinTone || '#fbb587';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.4;

      // Back Hand (Grip hand with thumb contour)
      ctx.beginPath();
      ctx.ellipse(3, 2, 5, 4, 0.1, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      // Thumb fold
      ctx.fillStyle = '#ea9c6d';
      ctx.beginPath();
      ctx.arc(4, 0, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Front Support Hand positioned per weapon archetype
      ctx.fillStyle = char.skinTone || '#fbb587';
      let frontHandX = 12;
      if (currWeapon === 'sniper') frontHandX = 26;
      else if (currWeapon === 'rifle') frontHandX = 18;
      else if (currWeapon === 'shotgun') frontHandX = 19;
      else if (currWeapon === 'rocket') frontHandX = 15;
      else if (currWeapon === 'pistol') frontHandX = 5; // close dual grip on magnum

      ctx.beginPath();
      ctx.ellipse(frontHandX, 2, 5, 4, -0.1, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      // Front hand thumb
      ctx.fillStyle = '#ea9c6d';
      ctx.beginPath();
      ctx.arc(frontHandX + 1, 0, 1.8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // UNARMED / FISTS MODE (Brawler Stance)
      ctx.fillStyle = char.skinTone || '#fbb587';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.6;
      // Left Guard Fist
      ctx.beginPath();
      ctx.ellipse(8, -4, 6, 5, 0.2, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      // Right Lead Fist
      ctx.beginPath();
      ctx.ellipse(16, 2, 6.5, 5.5, -0.1, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      // Knuckle creases
      ctx.fillStyle = '#ea9c6d';
      ctx.fillRect(17, 0, 3, 4);
    }

    // Muzzle Flash with dynamic radial flare
    if (char.muzzleFlashTimer > 0) {
      const cfg = WEAPON_CONFIGS[currWeapon];
      const barrelLen = (cfg?.barrelLength || 28) * weaponScale;
      
      // Star flare
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(barrelLen + 8, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(barrelLen + 8, 0, 6, 0, Math.PI * 2);
      ctx.fill();

      // Flame spikes
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(barrelLen + 2, -10); ctx.lineTo(barrelLen + 20, 0); ctx.lineTo(barrelLen + 2, 10);
      ctx.stroke();
    }

    // Melee Punch Effect
    if (char.meleeTimer && char.meleeTimer > 0) {
      const punchProg = Math.sin((char.meleeTimer / 0.28) * Math.PI);
      const punchDist = punchProg * 38;
      ctx.fillStyle = char.skinTone || '#fbb587';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.ellipse(punchDist + 16, 0, 8, 6.5, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      // Knuckle lines
      ctx.strokeStyle = '#9a3412';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(punchDist + 18, -3); ctx.lineTo(punchDist + 18, 3);
      ctx.moveTo(punchDist + 21, -2); ctx.lineTo(punchDist + 21, 2);
      ctx.stroke();
    }
    ctx.restore();

    ctx.restore(); // restore facing multiplier
    
    // Player Tag & Overhead Health Bar (Zoom-independent & Perfectly Stable/Crisp to avoid subpixel jitter)
    ctx.save();
    const currentZoom = this.camera.zoom || 1.0;
    // Translate using perfectly rounded integers to avoid subpixel rendering jitter (names shaking)
    ctx.translate(Math.round(centerX), Math.round(char.y - 12));
    ctx.scale(1 / currentZoom, 1 / currentZoom);

    if (char.inBush) {
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 10px Cairo, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🌿', 0, -32);
    }
    if (char.isPlayer) {
      const bob = Math.sin(this.animTime * 8) * 3;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(-5, -28 + bob);
      ctx.lineTo(5, -28 + bob);
      ctx.lineTo(0, -20 + bob);
      ctx.fill();
    }
    ctx.font = 'bold 12px Cairo, Arial, sans-serif';
    ctx.textAlign = 'center';
    let badgeColor = '#38bdf8';
    if (char.id === 'player-1') badgeColor = '#22c55e';
    else if (char.id === 'player-2') badgeColor = '#ef4444';
    else if (char.id === 'player-3') badgeColor = '#f59e0b';
    else if (char.id === 'player-4') badgeColor = '#a855f7';
    
    // Add black text border to make names super clear and non-glitched on any background
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3.5;
    ctx.strokeText(char.name, 0, -8);
    ctx.fillStyle = badgeColor;
    ctx.fillText(char.name, 0, -8);
    
    const barW = 44;
    const barH = 6;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(-barW / 2, -4, barW, barH);
    const hpPct = Math.max(0, Math.min(1, char.health / char.maxHealth));
    ctx.fillStyle = hpPct > 0.5 ? '#10b981' : (hpPct > 0.25 ? '#f59e0b' : '#ef4444');
    ctx.fillRect(-barW / 2, -4, barW * hpPct, barH);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-barW / 2, -4, barW, barH);
    ctx.restore();
  }

  private renderWeaponSprite(ctx: CanvasRenderingContext2D, weapon: string, scale: number = 1.0) {
    drawWeaponSprite2D(ctx, weapon as WeaponType, scale);
  }

  private renderProjectiles(ctx: CanvasRenderingContext2D, projectiles: Projectile[]) {
    for (const p of projectiles) {
      ctx.save();
      ctx.translate(p.x, p.y);

      if (p.weaponType === 'rocket') {
        // RPG Rocket
        const angle = Math.atan2(p.vy, p.vx);
        ctx.rotate(angle);

        // Rocket body
        ctx.fillStyle = '#15803d';
        ctx.fillRect(-12, -4, 20, 8);

        // Yellow nose cone
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.moveTo(8, -4);
        ctx.lineTo(16, 0);
        ctx.lineTo(8, 4);
        ctx.fill();

        // Stabilizer fins
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-12, -7, 4, 14);

        // Glowing motor exhaust
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(-14, 0, 4, 0, Math.PI * 2);
        ctx.fill();

      } else if (p.weaponType === 'grenade') {
        // Bouncing Frag Grenade
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Pin / cap
        ctx.fillStyle = '#64748b';
        ctx.fillRect(-2, -8, 4, 4);

        // Blinking red fuse LED
        const blink = Math.sin(this.animTime * 20) > 0;
        ctx.fillStyle = blink ? '#ef4444' : '#7f1d1d';
        ctx.beginPath();
        ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();

      } else {
        // Bullet / Pellet / Sniper Tracer
        const angle = Math.atan2(p.vy, p.vx);
        ctx.rotate(angle);

        // Neon tracer
        const bulletLen = p.weaponType === 'sniper' ? 24 : (p.weaponType === 'shotgun' ? 8 : 14);
        const grad = ctx.createLinearGradient(-bulletLen, 0, 0, 0);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        grad.addColorStop(1, p.color);
        ctx.fillStyle = grad;
        ctx.fillRect(-bulletLen, -p.radius, bulletLen, p.radius * 2);

        // Bright tip
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D, system: ParticleSystem) {
    const particles = system.getParticles();
    for (const pt of particles) {
      ctx.save();
      const alpha = Math.max(0, Math.min(1, pt.alpha));
      ctx.globalAlpha = alpha;

      if (pt.type === 'shockwave') {
        // High-energy kinetic shockwave ring
        ctx.strokeStyle = pt.color;
        ctx.lineWidth = Math.max(1.5, 4 * alpha);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.max(1, pt.radius), 0, Math.PI * 2);
        ctx.stroke();

        // Inner glowing wash
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = alpha * 0.15;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.max(1, pt.radius * 0.9), 0, Math.PI * 2);
        ctx.fill();

      } else if (pt.type === 'casing') {
        // Tumbling Brass/Red Shell Casing
        ctx.translate(pt.x, pt.y);
        if (pt.rotation) ctx.rotate(pt.rotation);
        const w = pt.width || 2.5;
        const h = pt.height || 5;

        ctx.fillStyle = pt.color;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.strokeRect(-w / 2, -h / 2, w, h);

        // Primer rim
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(-w / 2, -h / 2, w, 1.5);

      } else if (pt.type === 'splinter') {
        // Tumbling Wood Splinter Shard
        ctx.translate(pt.x, pt.y);
        if (pt.rotation) ctx.rotate(pt.rotation);
        const w = pt.width || 2.2;
        const h = pt.height || 7;

        ctx.fillStyle = pt.color;
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -h / 2);
        ctx.lineTo(w / 2, h / 2);
        ctx.lineTo(-w / 2, h / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

      } else if (pt.type === 'smoke') {
        // Multi-lobed Cartoon Smoke Cloud
        ctx.translate(pt.x, pt.y);
        if (pt.rotation) ctx.rotate(pt.rotation);

        ctx.fillStyle = pt.color;
        const r = Math.max(1, pt.radius);
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.arc(-r * 0.35, -r * 0.25, r * 0.65, 0, Math.PI * 2);
        ctx.arc(r * 0.35, -r * 0.25, r * 0.65, 0, Math.PI * 2);
        ctx.arc(0, r * 0.35, r * 0.6, 0, Math.PI * 2);
        ctx.fill();

      } else if (pt.type === 'dust') {
        // Sandy / Ground Dust Puff
        ctx.fillStyle = pt.color;
        const r = Math.max(1, pt.radius);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        ctx.fill();

      } else if (pt.type === 'fire') {
        // Fiery Fireball with Bright White/Yellow Center
        const r = Math.max(1, pt.radius);
        const grad = ctx.createRadialGradient(pt.x, pt.y, r * 0.2, pt.x, pt.y, r);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, pt.color);
        grad.addColorStop(1, 'rgba(239, 68, 68, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        ctx.fill();

      } else if (pt.type === 'blood') {
        // Teardrop Cartoon Blood Splatter
        ctx.fillStyle = pt.color;
        const r = Math.max(1, pt.radius);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        ctx.fill();

      } else if (pt.type === 'debris') {
        // Angular Stone Pebble Shard
        ctx.translate(pt.x, pt.y);
        if (pt.rotation) ctx.rotate(pt.rotation);
        const r = Math.max(1, pt.radius);
        ctx.fillStyle = pt.color;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-r, -r * 0.5);
        ctx.lineTo(r * 0.5, -r);
        ctx.lineTo(r, r * 0.3);
        ctx.lineTo(-r * 0.2, r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

      } else {
        // 4-Point Diamond Spark / Flash
        const r = Math.max(1, pt.radius);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y - r * 1.5);
        ctx.lineTo(pt.x + r * 0.6, pt.y);
        ctx.lineTo(pt.x, pt.y + r * 1.5);
        ctx.lineTo(pt.x - r * 0.6, pt.y);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private fcnGlowColor(hex: string, intensity: number): string {
    return hex;
  }

  private renderLightingOverlay(ctx: CanvasRenderingContext2D, lamps: MapData['scenery']['lamps']) {
    // Only render ambient lighting in deep underground areas (y > 1200)
    if (this.camera.y + this.camera.height < 1200) return;

    ctx.save();

    // 1. Draw Physical Hanging Lamp Fixtures
    for (const lamp of lamps) {
      if (
        lamp.x < this.camera.x - 100 ||
        lamp.x > this.camera.x + this.camera.width + 100 ||
        lamp.y < this.camera.y - 100 ||
        lamp.y > this.camera.y + this.camera.height + 100
      ) {
        continue;
      }

      // Ceiling anchor
      ctx.fillStyle = '#1c1917';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.fillRect(lamp.x - 8, lamp.y - 35, 16, 6);
      ctx.strokeRect(lamp.x - 8, lamp.y - 35, 16, 6);

      // Hanging electrical cord / chain
      ctx.beginPath();
      ctx.moveTo(lamp.x, lamp.y - 29);
      ctx.lineTo(lamp.x, lamp.y - 10);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#000000';
      ctx.stroke();

      // Metallic Lamp Dome Shade
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(lamp.x - 16, lamp.y - 10);
      ctx.lineTo(lamp.x + 16, lamp.y - 10);
      ctx.lineTo(lamp.x + 22, lamp.y - 2);
      ctx.lineTo(lamp.x - 22, lamp.y - 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glowing Bulb Core with flicker
      const flicker = 0.8 + 0.2 * Math.sin(this.animTime * 16 + lamp.x * 0.2) * (Math.sin(this.animTime * 42) > 0.88 ? 0.25 : 1.0);
      ctx.fillStyle = this.fcnGlowColor(lamp.color, flicker);
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y - 2, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // 2. Volumetric Flickering Light Cones
    ctx.globalCompositeOperation = 'screen';
    for (const lamp of lamps) {
      if (
        lamp.x < this.camera.x - 120 ||
        lamp.x > this.camera.x + this.camera.width + 120 ||
        lamp.y < this.camera.y - 120 ||
        lamp.y > this.camera.y + this.camera.height + 120
      ) {
        continue;
      }

      const flicker = 0.85 + 0.15 * Math.sin(this.animTime * 14 + lamp.x * 0.1) * (Math.sin(this.animTime * 38) > 0.9 ? 0.3 : 1.0);
      const radius = 160 * flicker;

      const glow = ctx.createRadialGradient(lamp.x, lamp.y, 10, lamp.x, lamp.y, radius);
      glow.addColorStop(0, lamp.color + '88');
      glow.addColorStop(0.5, lamp.color + '33');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private renderFloatingTexts(ctx: CanvasRenderingContext2D, system: ParticleSystem) {
    const texts = system.getFloatingTexts();
    for (const t of texts) {
      const screenX = t.x - this.camera.x;
      const screenY = t.y - this.camera.y;

      if (screenX < -50 || screenX > this.camera.width + 50 || screenY < -50 || screenY > this.camera.height + 50) {
        continue;
      }

      ctx.save();
      ctx.globalAlpha = t.alpha;
      ctx.font = 'bold 16px Chakra Petch, Cairo, sans-serif';
      ctx.fillStyle = t.color;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeText(t.text, screenX, screenY);
      ctx.fillText(t.text, screenX, screenY);
      ctx.restore();
    }
  }

  /**
   * Mini Militia Radar Arrows: Shows offscreen enemies with directional pointer, distance in meters,
   * mini health bar, and jetpack icon when airborne.
   */
  private renderOffscreenEnemyIndicators(
    ctx: CanvasRenderingContext2D,
    player: CharacterState,
    bots: CharacterState[]
  ) {
    if (player.isDead) return;

    const w = this.camera.width;
    const h = this.camera.height;
    const zoom = this.camera.zoom;
    const margin = 45;

    // Filter enemy targets
    const enemies = bots.filter((b) => !b.isDead && (b.team === 'ffa' || b.team !== player.team));

    for (const opp of enemies) {
      // Screen space position of opponent center
      const oppWorldCenterX = opp.x + opp.width / 2;
      const oppWorldCenterY = opp.y + opp.height / 2;
      const screenX = (oppWorldCenterX - this.camera.x) * zoom;
      const screenY = (oppWorldCenterY - this.camera.y) * zoom;

      // Check if enemy is offscreen (or near edge)
      const isOffScreen =
        screenX < margin || screenX > w - margin || screenY < margin || screenY > h - margin;

      if (!isOffScreen) continue;

      // Calculate direction vector from screen center
      const cx = w / 2;
      const cy = h / 2;
      const dx = screenX - cx;
      const dy = screenY - cy;
      const angle = Math.atan2(dy, dx);
      const worldDist = Math.hypot(oppWorldCenterX - (player.x + player.width / 2), oppWorldCenterY - (player.y + player.height / 2));
      const distMeters = Math.max(1, Math.round(worldDist / 25));

      // Clamp indicator arrow to screen perimeter
      const padX = margin + 15;
      const padY = margin + 15;
      let indX = cx + Math.cos(angle) * (w / 2 - padX);
      let indY = cy + Math.sin(angle) * (h / 2 - padY);

      indX = Math.max(padX, Math.min(w - padX, indX));
      indY = Math.max(padY, Math.min(h - padY, indY));

      ctx.save();
      ctx.translate(indX, indY);

      // 1. Draw Directional Pointer Arrowhead
      ctx.save();
      ctx.rotate(angle);
      ctx.fillStyle = opp.isJetpacking ? '#f59e0b' : '#ef4444';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-10, -9);
      ctx.lineTo(-5, 0);
      ctx.lineTo(-10, 9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // 2. Draw Mini Badge Background
      const hpPercent = Math.max(0, opp.health / opp.maxHealth);
      const isFlying = opp.isJetpacking;
      const labelText = `${isFlying ? '🚀 ' : ''}${opp.name} (${distMeters}m)`;

      ctx.font = 'bold 11px Cairo, sans-serif';
      const textMetrics = ctx.measureText(labelText);
      const badgeW = Math.max(75, textMetrics.width + 16);
      const badgeH = 26;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = isFlying ? '#f59e0b' : '#ef4444';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(-badgeW / 2, -badgeH - 8, badgeW, badgeH, 8);
      ctx.fill();
      ctx.stroke();

      // 3. Mini Health Bar inside badge
      ctx.fillStyle = '#334155';
      ctx.fillRect(-badgeW / 2 + 4, -12, badgeW - 8, 4);
      ctx.fillStyle = hpPercent > 0.4 ? '#22c55e' : '#ef4444';
      ctx.fillRect(-badgeW / 2 + 4, -12, (badgeW - 8) * hpPercent, 4);

      // 4. Name & Distance Text
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.strokeText(labelText, 0, -18);
      ctx.fillText(labelText, 0, -18);

      ctx.restore();
    }
  }
}
