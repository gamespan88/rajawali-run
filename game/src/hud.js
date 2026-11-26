// hud.js — everything the pilot reads: chase-view instrument strip,
// cockpit gauges, guide arrows, and the title / results / crash panels.
// The brief asks for altitude, speed and heading on the HUD: they are
// big, lit, and present in both views.

const INK = "#17222e";
const PAPER = "rgba(250,247,238,0.94)";
const GOLD = "#ffb340";
const RED = "#d8493b";
const TEAL = "#1f7a8c";

export function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function card(ctx, x, y, w, h, fill = PAPER) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(23,34,46,0.25)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function label(ctx, x, y, text, size = 12, col = "#5a6a78", bold = true) {
  ctx.fillStyle = col;
  ctx.font = `${bold ? "700 " : ""}${size}px 'Segoe UI', system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText(text, x, y);
}

function value(ctx, x, y, text, size = 30, col = INK) {
  ctx.fillStyle = col;
  ctx.font = `800 ${size}px 'Segoe UI', system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText(text, x, y);
}

// A lit round gauge: face, ticks, needle, digital readout under it.
// opts.full draws a 360° compass (0 at the top) instead of a 270° dial;
// opts.dark puts the readout in ink for light panels instead of white.
export function dial(ctx, x, y, r, cap, readout, frac, tickLabels, opts = {}) {
  ctx.fillStyle = "#141a21";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3d4a58";
  ctx.lineWidth = 2;
  ctx.stroke();
  const ang = (f) => opts.full
    ? -Math.PI / 2 + f * Math.PI * 2
    : Math.PI * 0.75 + f * Math.PI * 1.5;
  ctx.strokeStyle = "#aeb9c4";
  const ticks = opts.full ? 12 : 10;
  for (let i = 0; i <= ticks; i++) {
    const a = ang(i / ticks);
    ctx.lineWidth = i % (ticks / 2) === 0 ? 2.5 : 1.2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8);
    ctx.lineTo(x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92);
    ctx.stroke();
  }
  if (tickLabels) {
    ctx.fillStyle = "#cfd8e0";
    ctx.font = `700 ${Math.round(r * 0.24)}px 'Segoe UI', system-ui, sans-serif`;
    ctx.textAlign = "center";
    for (const [f, txt] of tickLabels) {
      const a = ang(f);
      ctx.fillText(txt, x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6 + r * 0.09);
    }
  }
  const a = ang(opts.full ? ((frac % 1) + 1) % 1 : Math.max(0, Math.min(1, frac)));
  ctx.strokeStyle = "#ffb340";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(a) * r * 0.74, y + Math.sin(a) * r * 0.74);
  ctx.stroke();
  ctx.fillStyle = "#e8edf2";
  ctx.beginPath();
  ctx.arc(x, y, r * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8fa1b1";
  ctx.font = `700 ${Math.round(r * 0.21)}px 'Segoe UI', system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(cap, x, y + r * 0.52);
  ctx.fillStyle = opts.dark ? INK : "#ffffff";
  ctx.font = `800 ${Math.round(r * 0.3)}px 'Segoe UI', system-ui, sans-serif`;
  ctx.fillText(readout, x, y + r + Math.round(r * 0.42));
}

// Mini artificial horizon: sky/ground split that rolls and pitches.
export function horizonGauge(ctx, x, y, r, bank, pitch) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#141a21";
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.translate(x, y);
  ctx.rotate(-bank * 0.8);
  const po = Math.max(-r * 0.6, Math.min(r * 0.6, pitch * r * 1.4));
  ctx.fillStyle = "#57b6e8";
  ctx.fillRect(-r * 1.5, -r * 1.5 + po, r * 3, r * 1.5);
  ctx.fillStyle = "#8a6a44";
  ctx.fillRect(-r * 1.5, po, r * 3, r * 1.5);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 1.5, po);
  ctx.lineTo(r * 1.5, po);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = "#ffb340";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.55, y);
  ctx.lineTo(x - r * 0.18, y);
  ctx.lineTo(x, y + r * 0.16);
  ctx.lineTo(x + r * 0.18, y);
  ctx.lineTo(x + r * 0.55, y);
  ctx.stroke();
  ctx.strokeStyle = "#3d4a58";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

function compassRibbon(ctx, x, y, w, headingDeg) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, 26);
  ctx.clip();
  ctx.fillStyle = "rgba(20,26,33,0.88)";
  ctx.fillRect(x, y, w, 26);
  ctx.font = "700 13px 'Segoe UI', system-ui, sans-serif";
  ctx.textAlign = "center";
  const pts = [[0, "N"], [45, "NE"], [90, "E"], [135, "SE"], [180, "S"], [225, "SW"], [270, "W"], [315, "NW"]];
  for (let rep = -1; rep <= 1; rep++) {
    for (const [deg, txt] of pts) {
      const off = ((deg - headingDeg + 540) % 360 - 180) + rep * 360;
      const px = x + w / 2 + off * (w / 120);
      if (px < x - 14 || px > x + w + 14) continue;
      ctx.fillStyle = txt === "N" ? "#ffb340" : "#dfe7ee";
      ctx.fillText(txt, px, y + 18);
    }
  }
  ctx.restore();
  ctx.fillStyle = "#ffb340";
  ctx.beginPath();
  ctx.moveTo(x + w / 2 - 6, y + 26);
  ctx.lineTo(x + w / 2 + 6, y + 26);
  ctx.lineTo(x + w / 2, y + 32);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(23,34,46,0.3)";
  ctx.strokeRect(x, y, w, 26);
}

// The chase-view instrument strip along the bottom.
export function drawChaseHud(ctx, st) {
  const p = st.plane;
  const altFt = Math.round(p.y * 3.281);
  const spdKt = Math.round(p.speed * 1.944);
  const hdg = ((Math.round(p.headingDeg) % 360) + 360) % 360;

  // Route card, top left.
  card(ctx, 22, 20, 252, 86);
  label(ctx, 38, 44, `ROUTE ${st.route.id} · ${st.route.name}`, 13, RED);
  label(ctx, 38, 66, `RINGS  ${st.ringsHit} / ${st.world.rings.length}`, 15, INK);
  label(ctx, 38, 88, `TIME  ${fmtTime(st.timeSec)}   PAR ${fmtTime(st.route.par)}`, 15, INK);

  // Score card, top right.
  card(ctx, 1006, 20, 252, 86);
  label(ctx, 1022, 44, "SCORE", 12);
  value(ctx, 1022, 76, String(st.score).padStart(5, "0"), 27);
  if (st.combo > 1) {
    ctx.fillStyle = RED;
    ctx.font = "800 19px 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`COMBO ×${st.combo}`, 1242, 74);
    ctx.textAlign = "left";
  }

  // Guide, top centre: next ring or the runway.
  const guide = st.guide;
  if (guide) {
    card(ctx, 490, 20, 300, 54);
    ctx.fillStyle = guide.final ? RED : TEAL;
    ctx.font = "800 16px 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(guide.text, 640, 44);
    ctx.fillStyle = "#5a6a78";
    ctx.font = "700 13px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText(guide.sub, 640, 64);
    ctx.textAlign = "left";
    if (guide.arrow !== 0) {
      ctx.fillStyle = GOLD;
      ctx.font = "800 30px 'Segoe UI', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(guide.arrow < 0 ? "◀" : "▶", 640 + guide.arrow * 210, 52);
      ctx.textAlign = "left";
    }
  }

  // Instrument strip, bottom.
  card(ctx, 322, 596, 636, 106);
  dial(ctx, 392, 640, 34, "ALT FT", String(altFt), altFt / 2000, [[0, "0"], [0.5, "1"], [1, "2"]], { dark: true });
  dial(ctx, 512, 640, 34, "SPD KT", String(spdKt), spdKt / 160, [[0, "0"], [0.5, "80"], [1, "160"]], { dark: true });
  horizonGauge(ctx, 632, 640, 34, p.bank || 0, p.pitch || 0);
  // Heading: compass ribbon + digital degrees.
  label(ctx, 700, 626, "HEADING", 11);
  value(ctx, 700, 656, `${String(hdg).padStart(3, "0")}°`, 26);
  compassRibbon(ctx, 792, 618, 150, hdg);
  // Throttle bar.
  label(ctx, 700, 692, "THR", 10);
  ctx.fillStyle = "#d8dee4";
  ctx.fillRect(730, 684, 120, 9);
  ctx.fillStyle = p.throttle > 0.85 ? RED : TEAL;
  ctx.fillRect(730, 684, 120 * p.throttle, 9);
  label(ctx, 862, 692, `VSI ${p.vsi >= 0 ? "+" : ""}${Math.round(p.vsi * 196.85)}`, 11, INK);
}

// Cockpit gauges: three big dials on the dashboard + top strip.
export function drawCockpitHud(ctx, st) {
  const p = st.plane;
  const altFt = Math.round(p.y * 3.281);
  const spdKt = Math.round(p.speed * 1.944);
  const hdg = ((Math.round(p.headingDeg) % 360) + 360) % 360;
  dial(ctx, 180, 596, 62, "ALT FT", String(altFt), altFt / 2000, [[0, "0"], [0.5, "1"], [1, "2"]]);
  horizonGauge(ctx, 640, 592, 66, p.bank || 0, p.pitch || 0);
  dial(ctx, 1100, 596, 62, "SPD KT", String(spdKt), spdKt / 160, [[0, "0"], [0.5, "80"], [1, "160"]]);
  // Heading dial, right of centre.
  dial(ctx, 872, 600, 46, "HDG", `${String(hdg).padStart(3, "0")}°`, hdg / 360, [[0, "N"], [0.25, "E"], [0.5, "S"], [0.75, "W"]], { full: true });
  // Throttle quadrant, left of centre.
  label(ctx, 372, 560, "THROTTLE", 11, "#8fa1b1");
  ctx.fillStyle = "#39434e";
  ctx.fillRect(372, 572, 26, 104);
  ctx.fillStyle = GOLD;
  ctx.fillRect(372, 572 + 104 * (1 - p.throttle), 26, 104 * p.throttle);
  ctx.fillStyle = "#e8edf2";
  ctx.fillRect(366, 566 + 104 * (1 - p.throttle), 38, 10);
  // Top strip: route, rings, time, score.
  card(ctx, 22, 20, 252, 62);
  label(ctx, 38, 44, `ROUTE ${st.route.id} · ${st.route.name}`, 12, RED);
  label(ctx, 38, 66, `RINGS ${st.ringsHit}/${st.world.rings.length} · ${fmtTime(st.timeSec)}`, 13, INK);
  card(ctx, 1006, 20, 252, 62);
  label(ctx, 1022, 44, "SCORE", 11);
  value(ctx, 1022, 72, String(st.score).padStart(5, "0"), 23);
  if (st.guide) {
    card(ctx, 490, 20, 300, 54);
    ctx.fillStyle = st.guide.final ? RED : TEAL;
    ctx.font = "800 16px 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(st.guide.text, 640, 44);
    ctx.fillStyle = "#5a6a78";
    ctx.font = "700 13px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText(st.guide.sub, 640, 64);
    ctx.textAlign = "left";
  }
}

// Centre announcement (RING +100, FINAL APPROACH, banner events).
export function drawBanner(ctx, st, now) {
  if (!st.banner || now > st.banner.until) return;
  const a = Math.min(1, (st.banner.until - now) / 0.4, (now - st.banner.from) / 0.15 + 0.2);
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, a));
  ctx.textAlign = "center";
  ctx.font = "900 54px 'Segoe UI', system-ui, sans-serif";
  ctx.lineWidth = 10;
  ctx.strokeStyle = "rgba(20,30,40,0.65)";
  const y = 210;
  ctx.strokeText(st.banner.text, 640, y);
  ctx.fillStyle = st.banner.col || GOLD;
  ctx.fillText(st.banner.text, 640, y);
  if (st.banner.sub) {
    ctx.font = "800 22px 'Segoe UI', system-ui, sans-serif";
    ctx.lineWidth = 7;
    ctx.strokeText(st.banner.sub, 640, y + 36);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(st.banner.sub, 640, y + 36);
  }
  ctx.restore();
  ctx.textAlign = "left";
}
