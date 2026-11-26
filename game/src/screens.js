// screens.js — the framed panels: title with route cards, route
// complete with stars and a course map, splashdown, and pause.

import { ROUTES } from "./world.js";
import { fmtTime } from "./hud.js";

const INK = "#17222e";
const RED = "#d8493b";
const GOLD = "#ffb340";
const TEAL = "#1f7a8c";

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = "rgba(250,247,238,0.96)";
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 16);
  ctx.fill();
  ctx.strokeStyle = "rgba(23,34,46,0.3)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function txt(ctx, x, y, s, size, col = INK, weight = 800, align = "left") {
  ctx.fillStyle = col;
  ctx.font = `${weight} ${size}px 'Segoe UI', system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.fillText(s, x, y);
  ctx.textAlign = "left";
}

function keyChip(ctx, x, y, key, what) {
  ctx.fillStyle = "#17222e";
  ctx.beginPath();
  ctx.roundRect(x, y, 34, 26, 6);
  ctx.fill();
  txt(ctx, x + 17, y + 18, key, 13, "#ffffff", 800, "center");
  txt(ctx, x + 42, y + 18, what, 13.5, "#e8f2f8", 600);
  return x + 42 + ctx.measureText(what).width + 26;
}

export function drawTitle(ctx, st, t) {
  // Brand block.
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "900 84px Georgia, 'Times New Roman', serif";
  ctx.lineWidth = 14;
  ctx.strokeStyle = "rgba(18,32,44,0.55)";
  ctx.strokeText("RAJAWALI RUN", 640, 132);
  ctx.fillStyle = "#fdf6df";
  ctx.fillText("RAJAWALI RUN", 640, 132);
  ctx.font = "800 21px 'Segoe UI', system-ui, sans-serif";
  ctx.fillStyle = "#ffe9a8";
  ctx.fillText("A R C H I P E L A G O   A I R   R A C E   ·   N U S A N T A R A", 640, 168);
  ctx.restore();

  // Route cards.
  const y = 452;
  ROUTES.forEach((r, i) => {
    const x = 118 + i * 356;
    const locked = i + 1 > st.unlocked;
    const chosen = st.routeIdx === i;
    panel(ctx, x, y, 324, 148);
    if (chosen) {
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(x, y, 324, 148, 16);
      ctx.stroke();
    }
    txt(ctx, x + 22, y + 36, `ROUTE ${r.id}`, 13, locked ? "#9aa7b1" : RED);
    txt(ctx, x + 22, y + 66, r.name, 21, locked ? "#9aa7b1" : INK);
    txt(ctx, x + 22, y + 92, r.sub, 13.5, "#5a6a78", 600);
    txt(ctx, x + 22, y + 120,
      locked ? "🔒 finish the route before this one" : `◇ ${r.rings} rings · par ${fmtTime(r.par)} · ${r.tod}`,
      13.5, locked ? "#9aa7b1" : TEAL, 700);
    const best = st.best[r.id];
    if (best) txt(ctx, x + 22, y + 140, `best ${best.score} pts · ${fmtTime(best.time)}`, 12, "#5a6a78", 600);
  });

  // Controls + start prompt.
  let cx = 118;
  const cy = 632;
  cx = keyChip(ctx, cx, cy, "↑↓", "pitch");
  cx = keyChip(ctx, cx, cy, "←→", "bank");
  cx = keyChip(ctx, cx, cy, "W S", "throttle");
  cx = keyChip(ctx, cx, cy, "C", "camera");
  cx = keyChip(ctx, cx, cy, "P", "pause");
  if (Math.floor(t * 1.6) % 2 === 0) {
    txt(ctx, 640, 700, "PRESS ENTER OR CLICK TO FLY", 19, "#ffffff", 900, "center");
  }
}

export function drawComplete(ctx, st) {
  panel(ctx, 340, 108, 600, 470);
  txt(ctx, 640, 162, "ROUTE COMPLETE!", 34, INK, 900, "center");
  txt(ctx, 640, 190, `${st.route.name} · ${st.route.sub}`, 14.5, "#5a6a78", 700, "center");
  // Stars.
  for (let i = 0; i < 3; i++) {
    const x = 640 + (i - 1) * 64;
    ctx.font = "900 52px 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = i < st.stars ? GOLD : "#d5dbe1";
    ctx.fillText("★", x, 248);
  }
  ctx.textAlign = "left";
  const rows = [
    ["TIME", `${fmtTime(st.timeSec)}  (par ${fmtTime(st.route.par)})`],
    ["RINGS", `${st.ringsHit} / ${st.world.rings.length}`],
    ["LANDING", st.landingRating],
    ["RING POINTS", `${st.ringPoints}`],
    ["LANDING BONUS", `${st.landingBonus}`],
    ["TIME BONUS", `${st.timeBonus}`],
    ["FUEL BONUS", `${st.fuelBonus}  (${Math.round(Math.max(0, st.plane.fuel) * 100)}% left)`],
  ];
  rows.forEach(([k, v], i) => {
    const y = 288 + i * 28;
    txt(ctx, 392, y, k, 14, "#5a6a78");
    txt(ctx, 888, y, v, 16, INK, 800, "right");
  });
  ctx.strokeStyle = "rgba(23,34,46,0.2)";
  ctx.beginPath();
  ctx.moveTo(392, 288 + rows.length * 28 - 14);
  ctx.lineTo(888, 288 + rows.length * 28 - 14);
  ctx.stroke();
  txt(ctx, 392, 288 + rows.length * 28 + 20, "TOTAL SCORE", 16, RED);
  txt(ctx, 888, 288 + rows.length * 28 + 20, String(st.score), 24, INK, 900, "right");
  // Course map strip: islands as dots, rings as ticks, runway flag.
  const mx = 392, my = 528, mw = 496;
  ctx.strokeStyle = TEAL;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(mx, my);
  ctx.lineTo(mx + mw, my);
  ctx.stroke();
  st.world.rings.forEach((r, i) => {
    const fx = mx + (r.z / st.world.runway.z) * mw;
    ctx.fillStyle = r.state === "passed" ? "#39d353" : "#e5484d";
    ctx.beginPath();
    ctx.arc(fx, my, 6, 0, Math.PI * 2);
    ctx.fill();
  });
  txt(ctx, mx + mw + 8, my + 5, "⚑", 17, RED);
  const last = st.routeIdx + 1 >= ROUTES.length || st.routeIdx + 2 > st.unlocked;
  txt(ctx, 640, 606,
    last ? "ENTER — back to routes · R — fly it again" : "ENTER — next route · R — fly it again",
    15, TEAL, 800, "center");
}

export function drawCrashed(ctx, st) {
  panel(ctx, 390, 218, 500, 252);
  txt(ctx, 640, 282, st.crashTitle, 32, RED, 900, "center");
  txt(ctx, 640, 322, st.crashWhy, 16, INK, 700, "center");
  txt(ctx, 640, 356, `Rings flown: ${st.ringsHit} / ${st.world.rings.length} · score ${st.score}`, 15, "#5a6a78", 700, "center");
  txt(ctx, 640, 420, "PRESS R TO FLY AGAIN · ESC FOR ROUTES", 15, TEAL, 800, "center");
}

export function drawPaused(ctx) {
  ctx.fillStyle = "rgba(14,24,34,0.45)";
  ctx.fillRect(0, 0, 1280, 720);
  panel(ctx, 490, 268, 300, 150);
  txt(ctx, 640, 330, "PAUSED", 30, INK, 900, "center");
  txt(ctx, 640, 372, "P — resume · ESC — routes", 14.5, TEAL, 800, "center");
}
