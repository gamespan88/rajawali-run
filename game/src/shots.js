// shots.js — deterministic staged scenes for the entry screenshots.
// Each scene is a real game state (same world, same rules), frozen at a
// photogenic moment: ?shot=title|rings|cockpit|complete&seed=n.

export function applyShot(st, name, { startRoute }) {
  if (name === "title" || name === "start") {
    st.mode = "title";
    st.routeIdx = 0;
    st.titleZ = 1500; // mid-vista: volcano ahead right, terraces left
    return;
  }

  if (name === "rings" || name === "play") {
    startRoute(0);
    const w = st.world;
    const ring = w.rings[4];
    for (let i = 0; i < 4; i++) w.rings[i].state = "passed";
    w.nextIdx = 4;
    st.ringsHit = 4;
    st.combo = 4;
    st.ringPoints = 100 + 125 + 150 + 175;
    st.score = st.ringPoints;
    st.timeSec = 47;
    Object.assign(st.plane, {
      x: ring.x - 36, y: ring.y + 16, z: ring.z - 300,
      speed: 47, throttle: 0.82, bank: 0.38, pitch: 0.06,
      heading: 0.1,
    });
    st.view = "chase";
    st.banner = null;
    return;
  }

  if (name === "cockpit") {
    startRoute(2); // Senja Harbour at sunset
    const w = st.world;
    for (const r of w.rings) r.state = "passed";
    w.nextIdx = w.rings.length;
    st.ringsHit = w.rings.length;
    st.ringPoints = 1125;
    st.score = 1125;
    st.timeSec = 96;
    Object.assign(st.plane, {
      x: 18, y: 58, z: w.runway.z - 560,
      speed: 33, throttle: 0.42, bank: -0.05, pitch: -0.12,
      heading: -0.02,
    });
    st.view = "cockpit";
    st.banner = null;
    return;
  }

  if (name === "complete" || name === "end") {
    startRoute(0);
    const w = st.world;
    for (const r of w.rings) r.state = "passed";
    w.nextIdx = w.rings.length;
    st.ringsHit = w.rings.length;
    st.ringPoints = 975;
    st.landingRating = "PERFECT";
    st.landingBonus = 400;
    st.timeSec = 88;
    st.timeBonus = Math.max(0, Math.round((st.route.par - st.timeSec)) * 5);
    st.score = st.ringPoints + st.landingBonus + st.timeBonus;
    st.stars = 3;
    Object.assign(st.plane, {
      x: 2, y: w.runway.y, z: w.runway.z + 40,
      speed: 0, throttle: 0, bank: 0, pitch: 0,
    });
    st.mode = "complete";
    st.unlocked = 2; // route 2 earned, as a real finish would leave it
    st.banner = null;
    return;
  }
}
