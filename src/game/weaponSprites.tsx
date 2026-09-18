import React from 'react';
import { WeaponType } from '../types';

/**
 * High-Contrast Stylized 2D Weapon Sprite Renderer for Canvas
 * Mini Militia / Doodle Army 2 authentic comic military aesthetic.
 */
export function drawWeaponSprite2D(
  ctx: CanvasRenderingContext2D,
  weapon: WeaponType | 'grenade',
  scale: number = 1
) {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.4 / scale;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (weapon === 'pistol') {
    // ==========================================
    // HEAVY COMBAT MAGNUM / DESERT EAGLE (PISTOL)
    // ==========================================
    // 1. Heavy Chrome / Gunmetal Slide
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, -5, 20, 6);
    ctx.strokeRect(0, -5, 20, 6);

    // Slide Top Highlight & Serrations
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(1, -5, 18, 1.8);
    ctx.fillStyle = '#64748b';
    for (let s = 2; s <= 7; s += 2.2) {
      ctx.fillRect(s, -4, 1.2, 4);
    }

    // 2. Lower Frame & Trigger Guard
    ctx.fillStyle = '#334155';
    ctx.fillRect(1, 0, 14, 3);
    ctx.strokeRect(1, 0, 14, 3);

    // Trigger Guard & Trigger
    ctx.strokeStyle = '#000000';
    ctx.beginPath();
    ctx.arc(7, 3, 3.5, 0, Math.PI * 0.7);
    ctx.stroke();
    ctx.fillStyle = '#facc15';
    ctx.fillRect(6.5, 1, 1.5, 2.5);

    // 3. Ergonomic Wood/Polymer Combat Grip
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.moveTo(1, 1);
    ctx.lineTo(6, 1);
    ctx.lineTo(4.5, 10);
    ctx.lineTo(-0.5, 9.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Grip texture checkering
    ctx.fillStyle = '#78350f';
    ctx.fillRect(1.5, 3, 3, 5);

    // 4. Hammer & Front Iron Sight
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-1.5, -4, 2.5, 3); // hammer
    ctx.fillRect(18, -7, 2, 2.5); // front sight post

  } else if (weapon === 'rifle') {
    // ==========================================
    // ASSAULT RIFLE / MACHINE GUN (AK-47 & M4 HYBRID)
    // ==========================================
    // 1. Wooden Fixed Stock
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.moveTo(-4, -2);
    ctx.lineTo(-14, 1);
    ctx.lineTo(-14, 7);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Stock Buttplate
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-15, 0, 2, 8);
    ctx.strokeRect(-15, 0, 2, 8);

    // 2. Gunmetal Receiver Body
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-4, -4, 20, 7);
    ctx.strokeRect(-4, -4, 20, 7);
    // Dust cover & Bolt Handle
    ctx.fillStyle = '#475569';
    ctx.fillRect(-2, -5, 12, 2);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(5, -4, 3, 1.5); // silver charging handle

    // 3. Iconic Curved Banana Magazine (High-Contrast Orange-Bakelite or Steel)
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.moveTo(6, 3);
    ctx.quadraticCurveTo(11, 8, 8, 14);
    ctx.lineTo(3.5, 13);
    ctx.quadraticCurveTo(6, 7, 2, 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Mag ribs
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(4.5, 6); ctx.lineTo(7.5, 7);
    ctx.moveTo(4, 9); ctx.lineTo(7, 10);
    ctx.stroke();
    ctx.lineWidth = 2.4 / scale;

    // 4. Wooden Lower Handguard & Gas Tube
    ctx.fillStyle = '#92400e';
    ctx.fillRect(16, -2, 13, 5);
    ctx.strokeRect(16, -2, 13, 5);
    ctx.fillStyle = '#475569';
    ctx.fillRect(16, -5, 11, 3); // upper handguard gas tube
    ctx.strokeRect(16, -5, 11, 3);

    // 5. Long Steel Barrel & Front Sight Post
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(29, -3, 11, 3);
    ctx.strokeRect(29, -3, 11, 3);
    // Front triangular sight & Muzzle Slanted Compensator
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(35, -3);
    ctx.lineTo(37, -8);
    ctx.lineTo(39, -3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(39, -4, 3, 4.5); // slanted brake

    // 6. Pistol Grip
    ctx.fillStyle = '#78350f';
    ctx.fillRect(0, 3, 4.5, 7.5);
    ctx.strokeRect(0, 3, 4.5, 7.5);

  } else if (weapon === 'shotgun') {
    // ==========================================
    // COMBAT TACTICAL PUMP SHOTGUN
    // ==========================================
    // 1. Heavy Combat Wood/Composite Stock
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.moveTo(-4, -2);
    ctx.lineTo(-15, 2);
    ctx.lineTo(-15, 8);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Rubber Recoil Pad
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-16.5, 1, 2.5, 8);
    ctx.strokeRect(-16.5, 1, 2.5, 8);

    // 2. High-Contrast Receiver with Red Ejection Port
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-4, -4, 18, 8);
    ctx.strokeRect(-4, -4, 18, 8);
    // Red 12-Gauge Shell Ejection Port
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(2, -2.5, 6, 3);
    ctx.strokeRect(2, -2.5, 6, 3);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(2, -2.5, 2, 3); // brass rim

    // 3. Dual Heavy Barrels (Main Barrel + Mag Tube)
    ctx.fillStyle = '#334155';
    ctx.fillRect(14, -4, 22, 4); // main top barrel
    ctx.strokeRect(14, -4, 22, 4);
    ctx.fillStyle = '#475569';
    ctx.fillRect(14, 0, 18, 3.5); // bottom magazine tube
    ctx.strokeRect(14, 0, 18, 3.5);

    // 4. Ribbed Pump Forend Slider
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(17, -1, 10, 5.5);
    ctx.strokeRect(17, -1, 10, 5.5);
    // Grip ribs
    ctx.fillStyle = '#64748b';
    for (let rx = 19; rx <= 25; rx += 2.5) {
      ctx.fillRect(rx, 0, 1.2, 3.5);
    }

    // 5. Front Bead Sight & Muzzle Crown
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(35, -5.5, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Pistol grip
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 4, 4.5, 6);
    ctx.strokeRect(0, 4, 4.5, 6);

  } else if (weapon === 'sniper') {
    // ==========================================
    // SNIPER RIFLE (AWM / ARCTIC WARFARE MAGNUM)
    // ==========================================
    // 1. Tactical Camo-Green Thumbhole Stock
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.moveTo(-6, -3);
    ctx.lineTo(-18, -1);
    ctx.lineTo(-18, 7);
    ctx.lineTo(-11, 7);
    ctx.lineTo(-8, 3);
    ctx.lineTo(-6, 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Cheek Rest Pad
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-16, -4, 7, 3);

    // 2. Long Military Green Chassis & Receiver
    ctx.fillStyle = '#15803d';
    ctx.fillRect(-6, -3, 30, 6);
    ctx.strokeRect(-6, -3, 30, 6);

    // Straight Box Magazine
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(4, 3, 7, 6);
    ctx.strokeRect(4, 3, 7, 6);

    // 3. High-Power Tactical Scope with Cyan Glint
    ctx.fillStyle = '#0f172a';
    // Scope tube
    ctx.fillRect(2, -10, 22, 5);
    ctx.strokeRect(2, -10, 22, 5);
    // Eyepiece bell & Objective bell
    ctx.fillRect(0, -11, 4, 7);
    ctx.strokeRect(0, -11, 4, 7);
    ctx.fillRect(21, -11.5, 5, 8);
    ctx.strokeRect(21, -11.5, 5, 8);
    // Scope mount rings
    ctx.fillRect(6, -5, 2.5, 2.5);
    ctx.fillRect(17, -5, 2.5, 2.5);
    // Bright Optical Cyan Glint
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(24, -10, 1.8, 5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(24, -9.5, 1.2, 2);

    // 4. Heavy Fluted Free-Floating Barrel & Massive Muzzle Brake
    ctx.fillStyle = '#334155';
    ctx.fillRect(24, -2, 24, 3.5);
    ctx.strokeRect(24, -2, 24, 3.5);
    // Heavy Ported Muzzle Brake
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(46, -4.5, 6, 8);
    ctx.strokeRect(46, -4.5, 6, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(48, -3, 2, 5); // muzzle side ports

    // Folded Bipod Legs under barrel
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.8 / scale;
    ctx.beginPath();
    ctx.moveTo(34, 2); ctx.lineTo(39, 4);
    ctx.moveTo(34, 2); ctx.lineTo(41, 1);
    ctx.stroke();

  } else if (weapon === 'rocket') {
    // ==========================================
    // RPG-7 ROCKET LAUNCHER
    // ==========================================
    // 1. Olive Military Steel Launch Tube
    ctx.fillStyle = '#166534';
    ctx.fillRect(-12, -6, 36, 11);
    ctx.strokeRect(-12, -6, 36, 11);

    // Wooden Heat Shield Sleeve
    ctx.fillStyle = '#92400e';
    ctx.fillRect(-4, -7, 16, 13);
    ctx.strokeRect(-4, -7, 16, 13);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(0, -6.5, 8, 12);

    // 2. Flared Conical Exhaust Vent (Backblast Nozzle)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(-12, -6);
    ctx.lineTo(-18, -9);
    ctx.lineTo(-18, 9);
    ctx.lineTo(-12, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Forward Bell Ring & Optical Sight
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(20, -7.5, 5, 14);
    ctx.strokeRect(20, -7.5, 5, 14);
    // PGO-7 Optical Sight
    ctx.fillRect(4, -11, 6, 4);
    ctx.strokeRect(4, -11, 6, 4);

    // 4. Protruding High-Explosive PG-7V Warhead
    // Olive/Steel Booster Rod
    ctx.fillStyle = '#475569';
    ctx.fillRect(24, -3, 6, 6);
    ctx.strokeRect(24, -3, 6, 6);

    // Ogive High-Explosive Rocket Cone (Bright Yellow/Olive)
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.moveTo(30, -7);
    ctx.lineTo(38, -8);
    ctx.lineTo(48, 0); // sharp pointed nose
    ctx.lineTo(38, 8);
    ctx.lineTo(30, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Warhead Red Stripe & Fuse Tip
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(36, -7.5, 3, 15);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(46, -1, 3.5, 2); // piezoelectric impact fuse

    // 5. Dual Pistol Grips
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-2, 5, 4, 7);
    ctx.strokeRect(-2, 5, 4, 7);
    ctx.fillRect(12, 5, 4, 7);
    ctx.strokeRect(12, 5, 4, 7);

  } else if (weapon === 'grenade') {
    // ==========================================
    // PINEAPPLE FRAG GRENADE
    // ==========================================
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.arc(0, 1, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Segment Grid Lines
    ctx.strokeStyle = '#14532d';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-9, 1); ctx.lineTo(9, 1);
    ctx.moveTo(-8, -4); ctx.lineTo(8, -4);
    ctx.moveTo(-8, 6); ctx.lineTo(8, 6);
    ctx.moveTo(0, -9); ctx.lineTo(0, 11);
    ctx.stroke();

    // Fuse cap & handle
    ctx.fillStyle = '#64748b';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.fillRect(-3, -13, 6, 6);
    ctx.strokeRect(-3, -13, 6, 6);

    // Blinking LED
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, 1, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * High-Contrast Stylized SVG Component for HUD and UI Cards
 */
export const WeaponSpriteSVG: React.FC<{
  weapon: WeaponType | 'grenade';
  className?: string;
}> = ({ weapon, className = 'w-10 h-7' }) => {
  if (weapon === 'pistol') {
    return (
      <svg viewBox="-8 -10 36 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="-5" width="20" height="6" rx="1" fill="#E2E8F0" stroke="#000000" strokeWidth="1.8" />
        <rect x="1" y="-5" width="18" height="2" fill="#FFFFFF" />
        <rect x="2" y="-4" width="1.5" height="4" fill="#64748B" />
        <rect x="5" y="-4" width="1.5" height="4" fill="#64748B" />
        <rect x="1" y="0" width="14" height="3" fill="#334155" stroke="#000000" strokeWidth="1.6" />
        <path d="M1 1 L6 1 L4.5 10 L-0.5 9.5 Z" fill="#92400E" stroke="#000000" strokeWidth="1.8" />
        <rect x="1.5" y="3" width="3" height="5" fill="#78350F" />
        <rect x="-1.5" y="-4" width="2.5" height="3" fill="#0F172A" />
        <rect x="18" y="-7" width="2" height="2.5" fill="#0F172A" />
      </svg>
    );
  }

  if (weapon === 'rifle') {
    return (
      <svg viewBox="-18 -12 62 28" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Stock */}
        <path d="M-4 -2 L-14 1 L-14 7 L-4 4 Z" fill="#92400E" stroke="#000000" strokeWidth="2" />
        <rect x="-15" y="0" width="2.5" height="8" fill="#1E293B" stroke="#000000" strokeWidth="1.5" />
        {/* Receiver */}
        <rect x="-4" y="-4" width="20" height="7" rx="1" fill="#1E293B" stroke="#000000" strokeWidth="2" />
        <rect x="-2" y="-5" width="12" height="2" fill="#475569" />
        {/* Curved Mag */}
        <path d="M6 3 Q11 8 8 14 L3.5 13 Q6 7 2 3 Z" fill="#D97706" stroke="#000000" strokeWidth="2" />
        {/* Handguard */}
        <rect x="16" y="-2" width="13" height="5" fill="#92400E" stroke="#000000" strokeWidth="2" />
        <rect x="16" y="-5" width="11" height="3" fill="#475569" stroke="#000000" strokeWidth="1.8" />
        {/* Barrel & Sight */}
        <rect x="29" y="-3" width="11" height="3" fill="#0F172A" stroke="#000000" strokeWidth="1.8" />
        <path d="M35 -3 L37 -8 L39 -3 Z" fill="#0F172A" stroke="#000000" strokeWidth="1.5" />
        <rect x="39" y="-4" width="3" height="4.5" fill="#0F172A" />
        <rect x="0" y="3" width="4.5" height="7" fill="#78350F" stroke="#000000" strokeWidth="1.8" />
      </svg>
    );
  }

  if (weapon === 'shotgun') {
    return (
      <svg viewBox="-20 -10 60 26" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M-4 -2 L-15 2 L-15 8 L-4 5 Z" fill="#78350F" stroke="#000000" strokeWidth="2" />
        <rect x="-16.5" y="1" width="2.5" height="8" fill="#0F172A" stroke="#000000" strokeWidth="1.5" />
        <rect x="-4" y="-4" width="18" height="8" rx="1" fill="#1E293B" stroke="#000000" strokeWidth="2" />
        <rect x="2" y="-2.5" width="6" height="3" fill="#DC2626" stroke="#000000" strokeWidth="1.2" />
        <rect x="14" y="-4" width="22" height="4" fill="#334155" stroke="#000000" strokeWidth="2" />
        <rect x="14" y="0" width="18" height="3.5" fill="#475569" stroke="#000000" strokeWidth="1.8" />
        <rect x="17" y="-1" width="10" height="5.5" fill="#0F172A" stroke="#000000" strokeWidth="1.8" />
        <circle cx="35" cy="-5" r="1.5" fill="#FACC15" stroke="#000000" strokeWidth="1" />
        <rect x="0" y="4" width="4.5" height="6" fill="#0F172A" stroke="#000000" strokeWidth="1.8" />
      </svg>
    );
  }

  if (weapon === 'sniper') {
    return (
      <svg viewBox="-22 -15 76 28" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Camo Stock */}
        <path d="M-6 -3 L-18 -1 L-18 7 L-11 7 L-8 3 L-6 3 Z" fill="#166534" stroke="#000000" strokeWidth="2" />
        <rect x="-16" y="-4" width="7" height="3" fill="#0F172A" />
        {/* Chassis */}
        <rect x="-6" y="-3" width="30" height="6" fill="#15803D" stroke="#000000" strokeWidth="2" />
        <rect x="4" y="3" width="7" height="6" fill="#1E293B" stroke="#000000" strokeWidth="1.8" />
        {/* Scope */}
        <rect x="2" y="-10" width="22" height="5" fill="#0F172A" stroke="#000000" strokeWidth="2" />
        <rect x="0" y="-11" width="4" height="7" fill="#0F172A" stroke="#000000" strokeWidth="1.8" />
        <rect x="21" y="-11.5" width="5" height="8" fill="#0F172A" stroke="#000000" strokeWidth="1.8" />
        <rect x="24" y="-10" width="1.8" height="5" fill="#38BDF8" />
        <rect x="6" y="-5" width="2.5" height="2.5" fill="#0F172A" />
        <rect x="17" y="-5" width="2.5" height="2.5" fill="#0F172A" />
        {/* Barrel & Muzzle */}
        <rect x="24" y="-2" width="24" height="3.5" fill="#334155" stroke="#000000" strokeWidth="2" />
        <rect x="46" y="-4.5" width="6" height="8" fill="#0F172A" stroke="#000000" strokeWidth="2" />
        <rect x="48" y="-3" width="2" height="5" fill="#FFFFFF" />
      </svg>
    );
  }

  if (weapon === 'rocket') {
    return (
      <svg viewBox="-20 -14 72 30" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Tube */}
        <rect x="-12" y="-6" width="36" height="11" fill="#166534" stroke="#000000" strokeWidth="2.2" />
        <rect x="-4" y="-7" width="16" height="13" fill="#92400E" stroke="#000000" strokeWidth="2" />
        {/* Exhaust */}
        <path d="M-12 -6 L-18 -9 L-18 9 L-12 6 Z" fill="#0F172A" stroke="#000000" strokeWidth="2" />
        {/* Front ring */}
        <rect x="20" y="-7.5" width="5" height="14" fill="#0F172A" stroke="#000000" strokeWidth="2" />
        {/* Warhead */}
        <path d="M30 -7 L38 -8 L48 0 L38 8 L30 7 Z" fill="#EAB308" stroke="#000000" strokeWidth="2.2" />
        <rect x="36" y="-7.5" width="3" height="15" fill="#DC2626" />
        <rect x="46" y="-1" width="3.5" height="2" fill="#F8FAFC" />
        {/* Grips */}
        <rect x="-2" y="5" width="4" height="7" fill="#0F172A" stroke="#000000" strokeWidth="1.8" />
        <rect x="12" y="5" width="4" height="7" fill="#0F172A" stroke="#000000" strokeWidth="1.8" />
      </svg>
    );
  }

  // Frag Grenade
  return (
    <svg viewBox="-14 -16 28 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="0" cy="1" r="10" fill="#166534" stroke="#000000" strokeWidth="2" />
      <line x1="-9" y1="1" x2="9" y2="1" stroke="#14532D" strokeWidth="1.5" />
      <line x1="0" y1="-9" x2="0" y2="11" stroke="#14532D" strokeWidth="1.5" />
      <rect x="-3" y="-13" width="6" height="6" fill="#64748B" stroke="#000000" strokeWidth="1.8" />
      <circle cx="0" cy="1" r="3" fill="#EF4444" />
    </svg>
  );
};
