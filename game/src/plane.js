// plane.js — three flyable airframes built from primitives, each with its own
// livery, moving parts (props, afterburners) and flight character.
// Convention: nose points +X, up is +Y, wings span Z. Right side is -Z.
import * as THREE from 'three';

export const AIRCRAFT = [
  {
    id: 'rajawali', name: 'RAJAWALI-07', type: 'Amphibian Prop', maxKt: 124, stallKt: 47,
    maxSpeed: 64, accel: 9.5, turn: 1.05, stall: 24, burn: 1.0,
    blurb: 'MAX 124 KT · STALL 47 KT · FLOATS',
  },
  {
    id: 'elang', name: 'ELANG-9', type: 'Tactical Jet', maxKt: 342, stallKt: 93,
    maxSpeed: 178, accel: 23, turn: 0.82, stall: 48, burn: 1.9,
    blurb: 'MAX 342 KT · STALL 93 KT · AFTERBURNER',
  },
  {
    id: 'garuda', name: 'GARUDA T-4', type: 'Utility Turboprop', maxKt: 101, stallKt: 39,
    maxSpeed: 52, accel: 7.5, turn: 0.88, stall: 20, burn: 0.62,
    blurb: 'MAX 101 KT · STALL 39 KT · SIPPER',
  },
];

const MAT = {
  cream: new THREE.MeshStandardMaterial({ color: 0xf3e3c2, flatShading: true, roughness: 0.6 }),
  orange: new THREE.MeshStandardMaterial({ color: 0xe87e2e, flatShading: true, roughness: 0.55 }),
  teal: new THREE.MeshStandardMaterial({ color: 0x14586b, flatShading: true, roughness: 0.5 }),
  grey: new THREE.MeshStandardMaterial({ color: 0xb9c2c9, flatShading: true, roughness: 0.5, metalness: 0.25 }),
  darkGrey: new THREE.MeshStandardMaterial({ color: 0x4a545e, flatShading: true, roughness: 0.6, metalness: 0.3 }),
  glass: new THREE.MeshPhongMaterial({ color: 0x14242e, shininess: 110, specular: 0xbfe6ff }),
  dark: new THREE.MeshStandardMaterial({ color: 0x22282e, flatShading: true, roughness: 0.8 }),
  white: new THREE.MeshStandardMaterial({ color: 0xf6f2e8, flatShading: true, roughness: 0.6 }),
};

function textTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}

function latheAlongX(profile, mat, segments = 14) {
  const pts = profile.map(([r, x]) => new THREE.Vector2(Math.max(0.001, r), x));
  const geo = new THREE.LatheGeometry(pts, segments);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.geometry.rotateZ(Math.PI / 2); // lathe axis Y -> X (nose +X)
  return mesh;
}

function navLights(group, span) {
  const mk = (color, z) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 5), new THREE.MeshBasicMaterial({ color }));
    s.position.set(0.4, 1.28, z); group.add(s);
  };
  mk(0xff3524, span / 2);   // port = +Z = red
  mk(0x2eff7a, -span / 2);  // starboard = -Z = green
}

function sideDecals(group, text, sub, color = '#14586b', accent = '#e87e2e', y = 0.25, len = 7.4) {
  const tex = textTexture(1024, 200, (g) => {
    g.clearRect(0, 0, 1024, 200);
    g.fillStyle = accent; g.fillRect(0, 128, 1024, 16);
    g.fillStyle = color; g.font = '900 104px Arial'; g.textAlign = 'center';
    g.fillText(text, 512, 108);
    g.font = '700 40px Arial'; g.fillStyle = accent;
    g.fillText(sub, 512, 182);
  });
  for (const side of [1, -1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(len, len * 200 / 1024),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, polygonOffset: true, polygonOffsetFactor: -1 }));
    p.position.set(0.4, y, side * 1.17);
    if (side < 0) p.rotation.y = Math.PI;
    group.add(p);
  }
}

function makeProp(radius) {
  const prop = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.9, 10), MAT.dark);
  hub.geometry.rotateZ(-Math.PI / 2);
  prop.add(hub);
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x2b2f33, flatShading: true });
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.09, radius * 2, 0.34), bladeMat);
    b.rotation.x = (i / 3) * Math.PI;
    b.userData.blade = true;
    prop.add(b);
  }
  const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 24),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false }));
  disc.userData.disc = true;
  disc.geometry.rotateY(Math.PI / 2);
  prop.add(disc);
  return prop;
}

function buildRajawali() {
  const g = new THREE.Group();
  const body = latheAlongX([[0.12, 5.6], [0.75, 4.9], [1.08, 3.4], [1.18, 1.2], [1.12, -1.8], [0.72, -4.2], [0.3, -5.5]], MAT.cream);
  g.add(body);
  const belly = latheAlongX([[0.7, 3.2], [0.95, 1.4], [0.9, -1.2], [0.5, -3.4]], MAT.orange);
  belly.scale.set(0.92, 0.62, 0.92); belly.position.y = -0.62; g.add(belly);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(1.02, 14, 10), MAT.glass);
  glass.scale.set(1.5, 0.78, 0.92); glass.position.set(1.55, 0.88, 0); g.add(glass);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.26, 12.6), MAT.orange);
  wing.position.set(0.7, 1.32, 0); g.add(wing);
  for (const s of [1, -1]) {
    const tip = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.3, 1.1), MAT.teal);
    tip.position.set(0.7, 1.34, s * 6.6); g.add(tip);
  }
  const stab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.2, 4.8), MAT.orange);
  stab.position.set(-5.0, 0.35, 0); g.add(stab);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.3, 0.22), MAT.teal);
  fin.position.set(-5.05, 1.15, 0); g.add(fin);
  // Floats + struts.
  for (const s of [1, -1]) {
    const float = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 5.2, 4, 8), MAT.orange);
    float.geometry.rotateZ(Math.PI / 2);
    float.position.set(0.5, -2.05, s * 1.75); g.add(float);
    for (const fx of [1.9, -1.1]) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.6, 6), MAT.dark);
      strut.position.set(fx, -1.25, s * 1.35);
      strut.rotation.x = s * 0.42;
      g.add(strut);
    }
  }
  const prop = makeProp(1.95);
  prop.position.set(5.75, 0.1, 0);
  g.add(prop);
  sideDecals(g, 'RAJAWALI', 'RJ-07 · ARCHIPELAGO AIR');
  navLights(g, 12.6);
  return { group: g, props: [prop], burners: [] };
}

function buildElang() {
  const g = new THREE.Group();
  const body = latheAlongX([[0.05, 7.4], [0.4, 6.0], [0.85, 3.6], [1.0, 0.6], [0.95, -2.6], [0.8, -5.2], [0.62, -6.4]], MAT.grey, 12);
  g.add(body);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.82, 12, 8), MAT.glass);
  canopy.scale.set(1.9, 0.72, 0.85); canopy.position.set(2.6, 0.72, 0); g.add(canopy);
  const spine = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.34, 0.7), MAT.orange);
  spine.position.set(-1.4, 0.95, 0); g.add(spine);
  // Swept wings: boxes rotated in plan view.
  for (const s of [1, -1]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.2, 5.6), MAT.darkGrey);
    w.position.set(-1.5, -0.25, s * 3.3);
    w.rotation.y = s * 0.5;
    g.add(w);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.1, 0.18), MAT.darkGrey);
    fin.position.set(-5.3, 1.0, s * 1.15);
    fin.rotation.z = 0.25; fin.rotation.y = s * 0.18;
    g.add(fin);
    const intake = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.85, 0.6), MAT.dark);
    intake.position.set(0.4, -0.35, s * 1.05); g.add(intake);
  }
  const stab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.18, 4.4), MAT.darkGrey);
  stab.position.set(-5.6, 0.1, 0); g.add(stab);
  // Twin afterburners.
  const burners = [];
  for (const s of [1, -1]) {
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 0.8, 10, 1, true), MAT.dark);
    nozzle.geometry.rotateZ(Math.PI / 2);
    nozzle.position.set(-6.6, 0, s * 0.55); g.add(nozzle);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.4, 3.2, 10),
      new THREE.MeshBasicMaterial({ color: 0xffa63e, transparent: true, opacity: 0.9 }));
    flame.geometry.rotateZ(Math.PI / 2); // cone tip toward -X (exhaust)
    flame.position.set(-8.2, 0, s * 0.55);
    g.add(flame); burners.push(flame);
  }
  sideDecals(g, 'ELANG-9', 'SKY PATROL · 07', '#3c4750', '#e87e2e', 0.3, 6.4);
  navLights(g, 9.4);
  return { group: g, props: [], burners };
}

function buildGaruda() {
  const g = new THREE.Group();
  const body = latheAlongX([[0.3, 6.2], [1.15, 5.2], [1.5, 2.6], [1.52, -1.6], [1.1, -4.6], [0.5, -6.0]], MAT.white, 12);
  g.add(body);
  const stripe = latheAlongX([[1.53, 2.4], [1.54, -1.4]], MAT.teal, 12);
  stripe.scale.set(1, 0.34, 1); stripe.position.y = -0.25; g.add(stripe);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 8), MAT.glass);
  glass.scale.set(1.15, 0.66, 1.0); glass.position.set(4.6, 0.72, 0); g.add(glass);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.3, 16.4), MAT.teal);
  wing.position.set(0.9, 1.62, 0); g.add(wing);
  const stab = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.22, 5.6), MAT.teal);
  stab.position.set(-5.7, 1.5, 0); g.add(stab);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.2, 0.24), MAT.orange);
  fin.position.set(-5.8, 0.6, 0); g.add(fin);
  // Twin wing props.
  const props = [];
  for (const s of [1, -1]) {
    const nac = new THREE.Mesh(new THREE.CapsuleGeometry(0.52, 2.6, 4, 8), MAT.orange);
    nac.geometry.rotateZ(Math.PI / 2);
    nac.position.set(1.1, 1.35, s * 3.4); g.add(nac);
    const prop = makeProp(1.7);
    prop.position.set(3.15, 1.35, s * 3.4);
    g.add(prop); props.push(prop);
    const gear = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.7, 6), MAT.dark);
    gear.position.set(0.9, -1.4, s * 1.5); g.add(gear);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.3, 10), MAT.dark);
    wheel.geometry.rotateX(Math.PI / 2);
    wheel.position.set(0.9, -2.3, s * 1.5); g.add(wheel);
  }
  sideDecals(g, 'GARUDA', 'T-4 · ISLAND FREIGHT', '#14586b', '#e87e2e', 0.42, 8.2);
  navLights(g, 16.4);
  return { group: g, props, burners: [] };
}

export function buildAircraft(id) {
  if (id === 'elang') return buildElang();
  if (id === 'garuda') return buildGaruda();
  return buildRajawali();
}
