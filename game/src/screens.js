// screens.js — hangar menu, results, crash and pause overlays.
// The menu floats over the live 3D scene (the parked aircraft on the runway),
// exactly like a real flight-sim front end.
import { COL, panel, label, num, pad } from './hud.js';
import { AIRCRAFT } from './plane.js';
import { SORTIES } from './world3d.js';

export const LIGHTING_NAMES = { pagi: 'PAGI CERAH', siang: 'SIANG TERIK', senja: 'SENJA EMAS', badai: 'BADAI SENJA' };

export function createScreens() {
  const hits = [];
  function card(ctx, x, y, w, h, selected) {
    ctx.beginPath();
    ctx.moveTo(x + 4, y); ctx.lineTo(x + w - 12, y); ctx.lineTo(x + w, y + 12);
    ctx.lineTo(x + w, y + h - 4); ctx.lineTo(x + w - 4, y + h); ctx.lineTo(x + 12, y + h);
    ctx.lineTo(x, y + h - 12); ctx.lineTo(x, y + 4); ctx.closePath();
    ctx.fillStyle = selected ? 'rgba(21,74,94,0.94)' : 'rgba(9,38,50,0.88)';
    ctx.fill();
    ctx.strokeStyle = selected ? COL.gold : COL.edgeDim; ctx.lineWidth = selected ? 2 : 1.1; ctx.stroke();
    ctx.lineWidth = 1;
  }

  function drawMenu(ctx, sel) {
    hits.length = 0;
    ctx.fillStyle = 'rgba(4,16,22,0.22)';
    ctx.fillRect(0, 0, 1280, 720);
    panel(ctx, 36, 64, 452, 600);
    ctx.fillStyle = COL.gold; ctx.font = "800 27px 'Segoe UI', Arial, sans-serif"; ctx.textAlign = 'left';
    ctx.fillText('RAJAWALI WINGS', 56, 106);
    label(ctx, 56, 128, 'Select Airframe & Sortie — Archipelago Air Race', 11.5, COL.dim, 'left', false);
    label(ctx, 56, 160, 'AIRCRAFT HANGAR', 11, COL.cyan);
    AIRCRAFT.forEach((a, i) => {
      const y = 172 + i * 82;
      card(ctx, 56, y, 412, 72, sel.aircraft === i);
      ctx.fillStyle = COL.txt; ctx.font = "800 17px 'Segoe UI', Arial, sans-serif"; ctx.textAlign = 'left';
      ctx.fillText(a.name, 72, y + 28);
      label(ctx, 72, y + 48, a.type, 10.5, COL.dim, 'left', false);
      label(ctx, 452, y + 28, a.blurb.split('·')[0].trim(), 10.5, COL.gold, 'right');
      label(ctx, 452, y + 48, a.blurb.split('·').slice(1).join('·').trim(), 10, COL.faint, 'right', false);
      hits.push({ x: 56, y, w: 412, h: 72, type: 'aircraft', idx: i });
    });
    label(ctx, 56, 434, 'TACTICAL SORTIES', 11, COL.cyan);
    SORTIES.forEach((s, i) => {
      const y = 446 + i * 62;
      card(ctx, 56, y, 412, 54, sel.sortie === i);
      ctx.fillStyle = COL.txt; ctx.font = "800 14.5px 'Segoe UI', Arial, sans-serif"; ctx.textAlign = 'left';
      ctx.fillText(`${s.id}. ${s.name}`, 72, y + 23);
      label(ctx, 452, y + 23, `${s.gates.length} GATES`, 10, COL.gold, 'right');
      label(ctx, 72, y + 42, s.brief, 9.8, COL.dim, 'left', false);
      hits.push({ x: 56, y, w: 412, h: 54, type: 'sortie', idx: i });
    });
    // Sky lighting chips + FLY.
    const chipY = 640 - 4;
    Object.keys(LIGHTING_NAMES).forEach((key, i) => {
      const x = 848 + i * 102;
      const on = sel.lighting === key;
      ctx.fillStyle = on ? 'rgba(255,179,64,0.92)' : 'rgba(9,38,50,0.88)';
      ctx.fillRect(x, 596, 94, 30);
      ctx.strokeStyle = on ? COL.gold : COL.edgeDim; ctx.strokeRect(x, 596, 94, 30);
      label(ctx, x + 47, 616, LIGHTING_NAMES[key], 9, on ? '#12242e' : COL.dim, 'center');
      hits.push({ x, y: 596, w: 94, h: 30, type: 'lighting', key });
    });
    label(ctx, 848, 584, 'SKY LIGHTING', 10, COL.cyan);
    ctx.fillStyle = COL.gold;
    ctx.fillRect(848, 640, 396, 44);
    ctx.fillStyle = '#12242e'; ctx.font = "800 17px 'Segoe UI', Arial, sans-serif"; ctx.textAlign = 'center';
    ctx.fillText('FLY  ▸  ENTER', 848 + 198, 669);
    hits.push({ x: 848, y: 640, w: 396, h: 44, type: 'fly' });
    // Briefing card bottom-left under the menu panel is inside panel; controls at right top.
    panel(ctx, 848, 64, 396, 118);
    label(ctx, 864, 90, 'FLIGHT MANUAL', 11, COL.cyan);
    label(ctx, 864, 114, 'W / S — throttle · ↑ ↓ — pitch · ← → — bank', 11, COL.txt, 'left', false);
    label(ctx, 864, 134, 'A / D — rudder · G — gear · F — flaps · C — camera', 11, COL.txt, 'left', false);
    label(ctx, 864, 154, 'Fly the gold gate, then land on the runway:', 11, COL.txt, 'left', false);
    label(ctx, 864, 172, '2 white 2 red PAPI = on glide. Gear down!', 11, COL.gold, 'left', false);
    void chipY;
  }

  function gradeFor(res) {
    if (res.total >= 1450) return ['S', COL.gold];
    if (res.total >= 1150) return ['A', COL.green];
    if (res.total >= 800) return ['B', COL.cyan];
    return ['C', COL.amber];
  }

  function drawResults(ctx, res) {
    ctx.fillStyle = 'rgba(4,16,22,0.6)';
    ctx.fillRect(0, 0, 1280, 720);
    panel(ctx, 330, 64, 620, 592);
    label(ctx, 640, 104, `SORTIE ${pad(res.sortie.id, 2)} COMPLETE`, 12, COL.cyan, 'center');
    ctx.fillStyle = COL.txt; ctx.font = "800 30px 'Segoe UI', Arial, sans-serif"; ctx.textAlign = 'center';
    ctx.fillText(res.sortie.name, 640, 142);
    const [grade, gc] = gradeFor(res);
    ctx.strokeStyle = gc; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(640, 206, 38, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = gc; ctx.font = "800 42px 'Segoe UI', Arial, sans-serif";
    ctx.fillText(grade, 640, 221);
    label(ctx, 640, 262, '✦'.repeat(res.stars) + '☆'.repeat(3 - res.stars), 17, COL.gold, 'center');
    const rows = [
      ['TIME', res.timeText],
      ['GATES', `${res.gatesPassed} / ${res.sortie.gates.length}`],
      ['MAX COMBO', `×${res.maxCombo}`],
      ['LANDING', res.landingGrade],
      ['SINK RATE', `${res.sinkFpm} FPM`],
      ['CENTERLINE', `${res.centerlineM} M`],
      ['FUEL REMAINING', `${Math.round(res.fuelLeft * 100)}%`],
    ];
    rows.forEach(([k, v], i) => {
      const y = 296 + i * 25;
      label(ctx, 400, y, k, 11.5, COL.dim);
      label(ctx, 880, y, v, 12.5, COL.txt, 'right');
      ctx.strokeStyle = 'rgba(125,211,252,0.12)';
      ctx.beginPath(); ctx.moveTo(400, y + 7); ctx.lineTo(880, y + 7); ctx.stroke();
    });
    const pts = [
      ['GATE POINTS', res.gatePts], ['LANDING BONUS', res.landPts],
      ['FUEL BONUS', res.fuelPts], ['TIME BONUS', res.timePts],
    ];
    pts.forEach(([k, v], i) => {
      const y = 478 + i * 23;
      label(ctx, 400, y, k, 11, COL.dim);
      num(ctx, 880, y, pad(v, 5), 13, COL.txt, 'right');
    });
    label(ctx, 400, 584, 'TOTAL', 14, COL.gold);
    num(ctx, 880, 584, pad(res.total, 5), 21, COL.gold, 'right');
    label(ctx, 640, 628, 'ENTER — NEXT SORTIE · R — FLY AGAIN · M — HANGAR', 10.5, COL.faint, 'center', false);
  }

  function drawCrashed(ctx, res) {
    ctx.fillStyle = 'rgba(30,6,4,0.5)';
    ctx.fillRect(0, 0, 1280, 720);
    panel(ctx, 390, 220, 500, 250);
    ctx.fillStyle = COL.red; ctx.font = "800 30px 'Segoe UI', Arial, sans-serif"; ctx.textAlign = 'center';
    ctx.fillText('AIRCRAFT DOWN', 640, 290);
    label(ctx, 640, 330, res.cause, 13, COL.txt, 'center', false);
    label(ctx, 640, 366, `Gates cleared: ${res.gatesPassed} · Points banked: ${pad(res.score, 5)}`, 12, COL.dim, 'center', false);
    label(ctx, 640, 428, 'R — TRY AGAIN · M — HANGAR', 11, COL.faint, 'center', false);
  }

  function drawPaused(ctx) {
    ctx.fillStyle = 'rgba(4,16,22,0.5)';
    ctx.fillRect(0, 0, 1280, 720);
    panel(ctx, 490, 280, 300, 130);
    ctx.fillStyle = COL.txt; ctx.font = "800 24px 'Segoe UI', Arial, sans-serif"; ctx.textAlign = 'center';
    ctx.fillText('PAUSED', 640, 336);
    label(ctx, 640, 372, 'P / ESC — RESUME · M — HANGAR', 11, COL.dim, 'center', false);
  }

  return { hits, drawMenu, drawResults, drawCrashed, drawPaused };
}
