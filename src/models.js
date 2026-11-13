// Oyundaki tüm 3D modeller kodla üretilir (low-poly). Birim: metre.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { fmt, fmtGB } from './data.js';

const FONT = '"IBM Plex Sans", "Segoe UI", sans-serif';
const MONO = '"IBM Plex Mono", ui-monospace, monospace';
const DISPLAY = '"Barlow Condensed", "IBM Plex Sans", sans-serif';

export function mat(color, rough = 0.6, metal = 0.1, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
}

function mesh(geo, material, parent, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}
const box = (w, h, d, m, p, x, y, z, s) => mesh(new THREE.BoxGeometry(w, h, d), m, p, x, y, z, s);
const rbox = (w, h, d, r, m, p, x, y, z) => mesh(new RoundedBoxGeometry(w, h, d, 2, r), m, p, x, y, z);
const cyl = (rt, rb, h, m, p, x, y, z, seg = 20) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m, p, x, y, z);

export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function labelPlane(w, h, tex, parent, x, y, z, rotX = -Math.PI / 2, rotY = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, transparent: true }));
  m.position.set(x, y, z);
  m.rotation.order = 'YXZ';
  m.rotation.y = rotY;
  m.rotation.x = rotX;
  if (parent) parent.add(m);
  return m;
}

// Fırçalanmış alüminyum dokusu (soğutucular için)
let brushedTex = null;
function brushed() {
  if (brushedTex) return brushedTex;
  brushedTex = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#b8bcc2'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) {
      c.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '40,44,50'},${Math.random() * 0.12})`;
      c.fillRect(0, Math.random() * h, w, 1);
    }
    c.fillStyle = 'rgba(20,22,26,.55)';
    for (let y = 8; y < h; y += 22) c.fillRect(0, y, w, 4);
  });
  brushedTex.wrapS = brushedTex.wrapT = THREE.RepeatWrapping;
  return brushedTex;
}
function heatsinkMat(color) {
  return new THREE.MeshStandardMaterial({ color, map: brushed(), roughness: 0.32, metalness: 0.85 });
}

// ---------- 7 segment gösterge ----------
const SEG = {
  0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg',
  a: 'abcefg', b: 'cdefg', c: 'adef', d: 'bcdeg', e: 'adefg', f: 'aefg', '-': 'g', ' ': '',
};
export function drawSeg(c, text, x, y, h, on, ghost) {
  const w = h * 0.52, t = h * 0.13, gap = t * 0.25;
  const rects = {
    a: [t * 0.7, 0, w - t * 1.4, t], g: [t * 0.7, h / 2 - t / 2, w - t * 1.4, t], d: [t * 0.7, h - t, w - t * 1.4, t],
    f: [0, t * 0.6, t, h / 2 - t * 0.6 - gap], b: [w - t, t * 0.6, t, h / 2 - t * 0.6 - gap],
    e: [0, h / 2 + gap, t, h / 2 - t * 0.6 - gap], c: [w - t, h / 2 + gap, t, h / 2 - t * 0.6 - gap],
  };
  [...String(text).toLowerCase()].forEach((ch, i) => {
    const ox = x + i * (w + h * 0.2);
    const lit = SEG[ch] ?? '';
    for (const k of 'abcdefg') {
      const [rx, ry, rw, rh] = rects[k];
      const skew = (ry / h - 0.5) * -h * 0.08;
      c.fillStyle = lit.includes(k) ? on : ghost;
      c.fillRect(ox + rx + skew, y + ry, rw, rh);
    }
  });
}

// ---------- Fan ----------
function makeFan(r, { frame = 0x16181c, blade = 0x2b2e34, rgb = null } = {}) {
  const g = new THREE.Group();
  const ringMat = rgb ? mat(0xffffff, 0.35, 0, { emissive: rgb, emissiveIntensity: 0.25 }) : mat(frame, 0.5, 0.3);
  if (rgb) ringMat.userData.rgb = rgb;
  const ring = mesh(new THREE.TorusGeometry(r * 0.94, r * 0.07, 10, 40), ringMat, g);
  ring.rotation.x = Math.PI / 2;
  const rim = mesh(new THREE.CylinderGeometry(r * 1.0, r * 1.0, r * 0.18, 40, 1, true), mat(frame, 0.55, 0.2, { side: THREE.DoubleSide }), g);
  void rim;
  const rotor = new THREE.Group();
  g.add(rotor);
  cyl(r * 0.3, r * 0.3, r * 0.18, mat(0x1f2126, 0.45, 0.3), rotor, 0, 0, 0, 24);
  const bm = mat(blade, 0.5, 0.1, { side: THREE.DoubleSide });
  const bladeGeo = new THREE.CylinderGeometry(r * 0.88, r * 0.88, r * 0.02, 12, 1, false, 0, 0.62);
  for (let i = 0; i < 9; i++) {
    const piv = new THREE.Group();
    piv.rotation.y = (i / 9) * Math.PI * 2;
    rotor.add(piv);
    const b = new THREE.Mesh(bladeGeo, bm);
    b.rotation.z = 0.35;
    b.castShadow = false;
    piv.add(b);
  }
  return { group: g, rotor };
}

// ---------- Kasa yerleşimi (kasa yan yatırılmış, anakart yukarı bakıyor) ----------
export const CASE_POS = new THREE.Vector3(0, 0.753, -0.02);
const SLOT_LOCAL = {
  cpu: [new THREE.Vector3(-0.10, 0.0175, -0.14)],
  ram: [new THREE.Vector3(-0.031, 0.0175, -0.14), new THREE.Vector3(-0.017, 0.0175, -0.14)],
  gpu: [new THREE.Vector3(-0.145, 0.0175, -0.02)],
  ssd: [new THREE.Vector3(-0.10, 0.0165, -0.068)],
  psu: [new THREE.Vector3(-0.145, 0.006, 0.16)],
};
export const slotWorld = (cat, i) => SLOT_LOCAL[cat][i].clone().add(CASE_POS);

function pcbTexture(base) {
  const c = new THREE.Color(base);
  const hex = '#' + c.getHexString();
  const lighter = '#' + c.clone().offsetHSL(0, 0.02, 0.07).getHexString();
  return canvasTex(1024, 1280, (g, w, h) => {
    g.fillStyle = hex; g.fillRect(0, 0, w, h);
    g.strokeStyle = lighter; g.lineCap = 'round';
    for (let i = 0; i < 260; i++) {
      g.lineWidth = Math.random() < 0.8 ? 2 : 5;
      g.globalAlpha = 0.5 + Math.random() * 0.4;
      let x = Math.random() * w, y = Math.random() * h;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 4; k++) {
        const d = (Math.random() - 0.5) * 220;
        if (Math.random() < 0.33) { x += d; y += d; } else if (Math.random() < 0.5) x += d; else y += d;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    g.globalAlpha = 1;
    // lehim pedleri ve viyalar
    for (let i = 0; i < 500; i++) {
      g.fillStyle = Math.random() < 0.7 ? '#c9b46a' : '#e6e1d0';
      g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 2, 0, 7); g.fill();
    }
    // SMD dirençler
    for (let i = 0; i < 160; i++) {
      const x = Math.random() * w, y = Math.random() * h;
      g.fillStyle = '#d8d4c8'; g.fillRect(x, y, 12, 6);
      g.fillStyle = '#1b1b1b'; g.fillRect(x + 3, y, 6, 6);
    }
    // ipek baskı
    g.fillStyle = 'rgba(240,240,235,.75)'; g.font = `500 18px ${MONO}`;
    for (let i = 0; i < 40; i++) g.fillText(['R', 'C', 'Q', 'U', 'L'][i % 5] + Math.floor(Math.random() * 400), Math.random() * w, Math.random() * h);
  });
}

function buildBoard(bd) {
  const g = new THREE.Group();
  const pcbMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, map: pcbTexture(bd.pcb), roughness: 0.55, metalness: 0.05, clearcoat: 0.7, clearcoatRoughness: 0.35,
  });
  box(0.244, 0.002, 0.305, pcbMat, g, -0.088, 0.013, -0.0625);

  const metal = mat(0xa3a8b0, 0.3, 0.9);
  const sink = heatsinkMat(bd.accent);
  const dark = mat(0x16171a, 0.5, 0.3);
  const chip = mat(0x101113, 0.35, 0.2);

  // İşlemci soketi
  const s = SLOT_LOCAL.cpu[0];
  box(0.05, 0.003, 0.05, metal, g, s.x, 0.0155, s.z);
  box(0.04, 0.0032, 0.04, mat(bd.socket === 'AM5' ? 0x7a6430 : 0x4d4a44, 0.4, 0.7), g, s.x, 0.0156, s.z);
  const lever = cyl(0.0012, 0.0012, 0.05, metal, g, s.x + 0.027, 0.016, s.z);
  lever.rotation.x = Math.PI / 2;
  // Bobinler (VRM)
  for (let i = 0; i < 7; i++) box(0.007, 0.006, 0.007, mat(0x2b2d31, 0.4, 0.6), g, -0.135 + i * 0.011, 0.017, -0.177);
  for (let i = 0; i < 5; i++) box(0.007, 0.006, 0.007, mat(0x2b2d31, 0.4, 0.6), g, -0.152, 0.017, -0.16 + i * 0.011);

  // VRM soğutucuları ve arka I/O kapağı
  rbox(0.075, 0.02, 0.022, 0.003, sink, g, -0.10, 0.024, -0.198);
  rbox(0.022, 0.02, 0.075, 0.003, sink, g, -0.172, 0.024, -0.13);
  rbox(0.03, 0.034, 0.08, 0.004, dark, g, -0.195, 0.031, -0.17);
  labelPlane(0.06, 0.012, canvasTex(512, 100, (c, w, h) => {
    c.fillStyle = '#d9dde3'; c.font = `700 72px ${DISPLAY}`; c.textBaseline = 'middle';
    c.fillText(bd.socket === 'AM5' ? 'NOVA PRO' : 'ATLAS GAMING', 4, h / 2);
  }), g, -0.195, 0.0482, -0.17, -Math.PI / 2, Math.PI / 2);

  // RAM yuvaları
  const slotMat = mat(bd.slot, 0.55, 0.1);
  const latch = mat(0xe6e6e6, 0.5, 0);
  for (const p of SLOT_LOCAL.ram) {
    box(0.006, 0.008, 0.14, slotMat, g, p.x, 0.018, p.z);
    box(0.007, 0.01, 0.006, latch, g, p.x, 0.019, p.z - 0.072);
    box(0.007, 0.01, 0.006, latch, g, p.x, 0.019, p.z + 0.072);
  }

  // PCIe x16 (metal zırhlı) + x1
  const pg = SLOT_LOCAL.gpu[0];
  box(0.089, 0.009, 0.0075, metal, g, pg.x, 0.0185, pg.z);
  box(0.089, 0.0095, 0.005, mat(0x111214, 0.6, 0.1), g, pg.x, 0.0187, pg.z);
  box(0.025, 0.008, 0.006, mat(0x111214, 0.6, 0.1), g, -0.17, 0.018, 0.045);

  // M.2 yuvası
  const pm = SLOT_LOCAL.ssd[0];
  box(0.006, 0.005, 0.024, dark, g, pm.x - 0.042, 0.0165, pm.z);
  cyl(0.002, 0.002, 0.004, metal, g, pm.x + 0.038, 0.0155, pm.z, 8);

  // Yonga seti soğutucusu
  rbox(0.045, 0.012, 0.045, 0.004, sink, g, -0.03, 0.02, 0.045);
  labelPlane(0.034, 0.012, canvasTex(256, 90, (c, w, h) => {
    c.fillStyle = '#20232a'; c.font = `700 64px ${DISPLAY}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(bd.socket === 'AM5' ? 'NOVA' : 'ATLAS', w / 2, h / 2);
  }), g, -0.03, 0.0262, 0.045);

  // BIOS pili, ses yongası, kondansatörler, yongalar
  cyl(0.01, 0.01, 0.003, mat(0xd7dade, 0.25, 0.95), g, -0.07, 0.0155, 0.02, 28);
  box(0.012, 0.0015, 0.012, chip, g, -0.19, 0.0148, 0.07);
  const gold = mat(0xc9a24a, 0.3, 0.8);
  for (let i = 0; i < 5; i++) cyl(0.0035, 0.0035, 0.009, gold, g, -0.2 + (i % 3) * 0.01, 0.0185, 0.045 + Math.floor(i / 3) * 0.012, 12);
  box(0.014, 0.0015, 0.014, chip, g, 0.005, 0.0148, 0.02);
  box(0.008, 0.0015, 0.008, chip, g, -0.06, 0.0148, -0.03);
  box(0.008, 0.0015, 0.008, chip, g, 0.01, 0.0148, 0.07);
  const capM = mat(0x2a2d33, 0.35, 0.7);
  for (let i = 0; i < 6; i++) cyl(0.003, 0.003, 0.008, capM, g, -0.14 + i * 0.012, 0.018, -0.165, 12);

  // Güç konnektörleri
  box(0.008, 0.012, 0.052, mat(0x1a1a1a, 0.6), g, 0.025, 0.02, -0.11);
  box(0.016, 0.01, 0.008, mat(0x1a1a1a, 0.6), g, -0.19, 0.019, -0.207);

  // Hata ışıkları (Q-LED) ve Q-kod ekranı
  const leds = {};
  ['cpu', 'dram', 'vga', 'boot'].forEach((k, i) => {
    const m = mat(0x2a1010, 0.4, 0, { emissive: 0x000000, emissiveIntensity: 4 });
    leds[k] = box(0.006, 0.003, 0.004, m, g, 0.02, 0.0155, -0.203 + i * 0.009, false);
  });
  labelPlane(0.034, 0.04, canvasTex(160, 192, (c) => {
    c.fillStyle = '#e8e8e8'; c.font = `600 26px ${MONO}`; c.textBaseline = 'middle';
    ['CPU', 'DRAM', 'VGA', 'BOOT'].forEach((t, i) => c.fillText(t, 4, 26 + i * 43));
  }), g, 0.04, 0.0142, -0.1895);
  const qCanvas = document.createElement('canvas');
  qCanvas.width = 192; qCanvas.height = 128;
  const qTex = new THREE.CanvasTexture(qCanvas);
  qTex.colorSpace = THREE.SRGBColorSpace;
  const qMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: qTex, emissiveIntensity: 2.2, roughness: 0.3 });
  const qd = labelPlane(0.021, 0.014, qTex, g, 0.022, 0.0168, -0.158);
  qd.material = qMat;
  box(0.024, 0.003, 0.017, mat(0x0c0c0c, 0.3), g, 0.022, 0.015, -0.158, false);
  const setQ = (text) => {
    const c = qCanvas.getContext('2d');
    c.fillStyle = '#000'; c.fillRect(0, 0, 192, 128);
    drawSeg(c, text || '  ', 22, 14, 100, '#ff2a1a', '#1a0705');
    qTex.needsUpdate = true;
  };
  setQ('');

  // Anakart yazısı
  labelPlane(0.15, 0.016, canvasTex(1024, 110, (c, w, h) => {
    c.fillStyle = '#f2f2f2'; c.font = `600 52px ${MONO}`; c.textBaseline = 'middle';
    c.fillText(bd.label, 10, h / 2);
  }), g, -0.12, 0.0142, 0.077);

  return { group: g, leds, setQ };
}

export function buildCase() {
  const group = new THREE.Group();
  group.position.copy(CASE_POS);
  const steel = new THREE.MeshPhysicalMaterial({ color: 0x23262b, roughness: 0.5, metalness: 0.6, clearcoat: 0.3, clearcoatRoughness: 0.5 });
  const inner = mat(0x1d1f23, 0.65, 0.4);
  box(0.46, 0.005, 0.45, inner, group, 0, 0.0025, 0);
  box(0.006, 0.21, 0.45, steel, group, -0.227, 0.105, 0);
  box(0.006, 0.21, 0.45, steel, group, 0.227, 0.105, 0);
  box(0.46, 0.21, 0.006, steel, group, 0, 0.105, -0.222);
  box(0.46, 0.21, 0.006, steel, group, 0, 0.105, 0.222);
  // Kablo yönetimi delikleri (lastik)
  const grom = mat(0x0b0b0c, 0.9);
  for (const z of [-0.17, -0.09, -0.01]) box(0.016, 0.0012, 0.05, grom, group, 0.064, 0.0056, z, false);
  box(0.04, 0.0012, 0.012, grom, group, -0.19, 0.0056, -0.212, false);
  // Ön panel (file)
  const meshTex = canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#0d0e10'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#2a2d33';
    for (let y = 0; y < h; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < w; x += 8) { c.beginPath(); c.arc(x, y, 2.4, 0, 7); c.fill(); }
  });
  meshTex.wrapS = meshTex.wrapT = THREE.RepeatWrapping;
  meshTex.repeat.set(3, 6);
  box(0.018, 0.212, 0.452, mat(0xffffff, 0.8, 0.3, { map: meshTex }), group, 0.239, 0.105, 0);
  // Kenar çıtası
  const lip = mat(0x3a3e45, 0.35, 0.7);
  box(0.47, 0.006, 0.012, lip, group, 0, 0.21, -0.219);
  box(0.47, 0.006, 0.012, lip, group, 0, 0.21, 0.219);
  box(0.012, 0.006, 0.45, lip, group, -0.224, 0.21, 0);
  box(0.012, 0.006, 0.45, lip, group, 0.224, 0.21, 0);
  // Güç kaynağı örtüsü (delikli)
  const perf = canvasTex(256, 128, (c, w, h) => {
    c.fillStyle = '#202228'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#0c0d0f';
    for (let y = 10; y < h; y += 12) for (let x = 140; x < w - 10; x += 12) { c.beginPath(); c.arc(x, y, 3.5, 0, 7); c.fill(); }
  });
  rbox(0.285, 0.095, 0.128, 0.004, mat(0xffffff, 0.55, 0.4, { map: perf }), group, 0.0825, 0.0525, 0.158);
  labelPlane(0.11, 0.022, canvasTex(512, 100, (c, w, h) => {
    c.fillStyle = '#d6dbe2'; c.font = `700 76px ${DISPLAY}`; c.textBaseline = 'middle';
    c.fillText('ÇİP · ZEN', 6, h / 2);
  }), group, 0.03, 0.1005, 0.158);

  // Kasa fanları
  const rotors = [];
  for (const z of [-0.13, -0.005]) {
    const f = makeFan(0.058, { rgb: 0x4fd1c5 });
    f.group.rotation.z = Math.PI / 2;
    f.group.position.set(0.212, 0.105, z);
    group.add(f.group);
    rotors.push(f);
  }
  const rear = makeFan(0.052, { rgb: 0x4fd1c5 });
  rear.group.rotation.z = Math.PI / 2;
  rear.group.position.set(-0.212, 0.115, -0.09);
  group.add(rear.group);
  rotors.push(rear);

  let boardGroup = null;
  const api = {
    group, rotors, leds: null, board: null, setQ: () => {},
    setBoard(bd) {
      if (boardGroup) { group.remove(boardGroup); disposeTree(boardGroup); }
      const b = buildBoard(bd);
      boardGroup = b.group;
      group.add(boardGroup);
      api.leds = b.leds;
      api.setQ = b.setQ;
      api.board = bd;
    },
  };
  return api;
}

// ---------- Kablolar ----------
// Kasa içi koordinatlarla nokta listesi alır; yan yana `count` kablo üretir.
function cableBundle(points, { count = 1, spread = 0.009, radius = 0.0035, color = 0x111214, offset = [1, 0, 0] } = {}) {
  const g = new THREE.Group();
  const m = mat(color, 0.75, 0.05);
  const off = new THREE.Vector3(...offset).normalize();
  for (let i = 0; i < count; i++) {
    const k = (i - (count - 1) / 2) * spread;
    const pts = points.map(p => new THREE.Vector3(...p).addScaledVector(off, k));
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, radius, 8, false), m);
    tube.castShadow = true;
    tube.receiveShadow = true;
    g.add(tube);
  }
  return g;
}

export function buildCables(has) {
  const g = new THREE.Group();
  g.position.copy(CASE_POS);
  if (!has.psu) return g;
  // Kablolar tepsinin arkasından gelip lastik deliklerden çıkar (kablo yönetimi).
  // 24 pin: orta delikten anakartın sağ kenarına
  g.add(cableBundle([[0.062, 0.004, -0.085], [0.064, 0.022, -0.095], [0.052, 0.03, -0.108], [0.034, 0.024, -0.11]], { count: 4, spread: 0.0105, radius: 0.0045, offset: [0, 0, 1] }));
  // 8 pin işlemci: üst kenardan
  g.add(cableBundle([[-0.19, 0.004, -0.226], [-0.19, 0.03, -0.226], [-0.19, 0.036, -0.215], [-0.19, 0.026, -0.208]], { count: 2, spread: 0.007, radius: 0.0035, offset: [1, 0, 0] }));
  // Ekran kartı: örtünün üstündeki delikten karta
  if (has.gpu && has.gpu.watt > 75) {
    const d = has.gpu;
    const x = -0.145 - 0.07 + d.len * 0.62;
    const top = 0.0175 + d.h + 0.006;
    const z = -0.02 + d.thick / 2 + 0.002;
    const sx = Math.min(x, 0.02);
    g.add(cableBundle([[sx, 0.1, 0.1], [sx, top + 0.02, 0.09], [x, top + 0.045, z + 0.04], [x, top + 0.03, z], [x, top + 0.008, z]], { count: 2, spread: 0.008, radius: 0.0036, offset: [1, 0, 0] }));
    box(0.022, 0.008, 0.008, mat(0x111111, 0.5), g, x, top + 0.003, z);
    box(0.03, 0.002, 0.012, mat(0x0b0b0c, 0.9), g, sx, 0.1012, 0.1, false);
  }
  return g;
}

// ---------- Parçalar ----------
function buildCPU(def) {
  const g = new THREE.Group();
  box(0.04, 0.002, 0.04, mat(0x2d6a3e, 0.6), g, 0, 0.001, 0);
  rbox(0.034, 0.003, 0.034, 0.001, mat(0xc8ccd2, 0.25, 0.95), g, 0, 0.0035, 0);
  const rotors = [];
  const hi = def.tier >= 2;
  const finM = heatsinkMat(hi ? 0x3a3d44 : 0xaab0b8);
  cyl(0.043, 0.045, 0.006, mat(0x8a9099, 0.3, 0.9), g, 0, 0.008, 0, 28);
  for (let i = 0; i < 18; i++) {
    const piv = new THREE.Group();
    piv.rotation.y = (i / 18) * Math.PI * 2;
    piv.position.y = 0.022;
    g.add(piv);
    box(0.038, 0.024, 0.0016, finM, piv, 0.022, 0, 0);
  }
  cyl(0.045, 0.045, 0.008, mat(0x17181b, 0.45, 0.3), g, 0, 0.037, 0, 32);
  const f = makeFan(0.04, { rgb: hi ? (def.socket === 'AM5' ? 0xff5a36 : 0x4f8dff) : null });
  f.group.position.y = 0.043;
  g.add(f.group);
  rotors.push(f);
  labelPlane(0.022, 0.022, canvasTex(128, 128, (c) => {
    c.fillStyle = '#111'; c.beginPath(); c.arc(64, 64, 62, 0, Math.PI * 2); c.fill();
    c.fillStyle = def.socket === 'AM5' ? '#ff7a50' : '#7aa6ff';
    c.font = `700 40px ${DISPLAY}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(def.socket === 'AM5' ? 'NOVA' : 'ATLAS', 64, 64);
  }), g, 0, 0.0535, 0);
  g.userData.rotors = rotors;
  return g;
}

function buildRAM(def) {
  const g = new THREE.Group();
  const L = 0.133, H = 0.031;
  box(0.0015, H, L, mat(0x245b34, 0.6), g, 0, H / 2, 0);
  box(0.0013, 0.004, L * 0.92, mat(0xd4af37, 0.25, 0.95), g, 0, 0.002, 0);
  const sp = heatsinkMat(def.color);
  box(0.0025, 0.027, L - 0.006, sp, g, 0.002, 0.018, 0);
  box(0.0025, 0.027, L - 0.006, sp, g, -0.002, 0.018, 0);
  if (def.rgb) {
    const lm = mat(0xffffff, 0.3, 0, { emissive: 0xff4fd8, emissiveIntensity: 0.25, transparent: true, opacity: 0.92 });
    lm.userData.rgb = 0xff4fd8;
    box(0.006, 0.006, L - 0.01, lm, g, 0, H + 0.003, 0);
  }
  const tex = canvasTex(512, 96, (c, w, h) => {
    const light = new THREE.Color(def.color).getHSL({}).l > 0.5;
    c.fillStyle = light ? '#222' : '#e8e8e8';
    c.font = `700 56px ${DISPLAY}`; c.textBaseline = 'middle';
    c.fillText(`KARTAL ${def.type}`, 12, h / 2);
    c.font = `500 34px ${MONO}`; c.textAlign = 'right';
    c.fillText(`${def.gb}GB`, w - 12, h / 2);
  });
  labelPlane(0.11, 0.02, tex, g, 0.0033, 0.018, 0, 0, Math.PI / 2);
  labelPlane(0.11, 0.02, tex, g, -0.0033, 0.018, 0, 0, -Math.PI / 2);
  g.userData.rotors = [];
  return g;
}

function buildGPU(def) {
  const g = new THREE.Group();
  const { len: L, h: H, thick: T } = def;
  const cx = -0.07 + L / 2;
  box(L, H * 0.95, 0.0016, mat(0x1f4a2c, 0.6), g, cx, H / 2 + 0.004, 0);
  box(0.07, 0.008, 0.0018, mat(0xd4af37, 0.25, 0.95), g, 0.0, 0.004, 0);
  const shroudMat = new THREE.MeshPhysicalMaterial({ color: def.color, roughness: 0.4, metalness: 0.55, clearcoat: 0.5, clearcoatRoughness: 0.3 });
  rbox(L, H, T, 0.006, shroudMat, g, cx, H / 2 + 0.006, T / 2 + 0.002);
  // Soğutucu kanatçıkları (üstten görünür)
  const fin = heatsinkMat(0x8d939b);
  for (let x = -0.07 + L * 0.48; x < -0.07 + L - 0.006; x += 0.006) box(0.0008, 0.006, T * 0.8, fin, g, x, H + 0.006, T / 2 + 0.002, false);
  box(L, H, 0.002, mat(0x2b2d31, 0.35, 0.85), g, cx, H / 2 + 0.006, -0.002);
  box(0.0018, H * 1.12, 0.02, mat(0xc3c8cf, 0.25, 0.95), g, -0.071, H / 2 + 0.004, 0.006);
  const rotors = [];
  const fanR = Math.min(H * 0.4, (L - 0.02) / def.fans / 2 * 0.95);
  for (let i = 0; i < def.fans; i++) {
    const f = makeFan(fanR, { frame: 0x15161a });
    f.group.rotation.x = Math.PI / 2;
    const step = (L - 0.02) / def.fans;
    f.group.position.set(-0.07 + 0.01 + step * (i + 0.5), H / 2 + 0.006, T + 0.004);
    g.add(f.group);
    rotors.push(f);
  }
  if (def.rgb) {
    const lm = mat(0xffffff, 0.3, 0, { emissive: 0x6af0ff, emissiveIntensity: 0.25 });
    lm.userData.rgb = 0x6af0ff;
    box(L * 0.6, 0.003, 0.004, lm, g, cx, H + 0.0105, T * 0.95);
  }
  const light = new THREE.Color(def.color).getHSL({}).l > 0.5;
  labelPlane(L * 0.4, L * 0.4 * 0.125, canvasTex(512, 64, (c, w, h) => {
    c.fillStyle = light ? '#1b1d22' : '#e9ecf1';
    c.font = `700 52px ${DISPLAY}`; c.textBaseline = 'middle';
    c.fillText('PRIZMA ' + def.name.split(' ')[2], 4, h / 2);
  }), g, -0.07 + L * 0.24, H + 0.0062, T / 2 + 0.002);
  g.userData.rotors = rotors;
  return g;
}

function buildPSU(def) {
  const g = new THREE.Group();
  const W = 0.15, H = 0.086, D = 0.12;
  rbox(W, H, D, 0.004, new THREE.MeshPhysicalMaterial({ color: def.color, roughness: 0.6, metalness: 0.5, clearcoat: 0.2 }), g, 0, H / 2, 0);
  const f = makeFan(0.05, { frame: 0x2a2c30 });
  f.group.position.set(0, H + 0.002, 0);
  g.add(f.group);
  const grill = new THREE.Group();
  grill.position.set(0, H + 0.006, 0);
  g.add(grill);
  const gm = mat(0x0f1012, 0.35, 0.85);
  for (const r of [0.054, 0.04, 0.026]) mesh(new THREE.TorusGeometry(r, 0.0016, 6, 40), gm, grill).rotation.x = Math.PI / 2;
  box(0.11, 0.002, 0.003, gm, grill, 0, 0, 0, false);
  box(0.003, 0.002, 0.11, gm, grill, 0, 0, 0, false);
  labelPlane(0.11, 0.05, canvasTex(512, 230, (c, w, h) => {
    c.fillStyle = '#f4f4f0'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#16181b'; c.fillRect(0, 0, w, 70);
    c.fillStyle = '#f2c14e'; c.font = `700 62px ${DISPLAY}`; c.textBaseline = 'middle';
    c.fillText('VOLTA', 16, 36);
    c.fillStyle = '#16181b'; c.font = `700 100px ${DISPLAY}`;
    c.fillText(`${def.cap} W`, 16, 140);
    c.font = `500 30px ${MONO}`;
    c.fillText(def.spec, 16, 205);
  }), g, 0, H / 2, D / 2 + 0.0005, 0, 0);
  g.userData.rotors = [f];
  return g;
}

function buildSSD(def) {
  const g = new THREE.Group();
  box(0.08, 0.0015, 0.022, mat(0x1d4a2a, 0.6), g, 0, 0.00075, 0);
  box(0.006, 0.0014, 0.018, mat(0xd4af37, 0.25, 0.95), g, -0.039, 0.0007, 0);
  labelPlane(0.066, 0.02, canvasTex(512, 150, (c, w, h) => {
    c.fillStyle = '#121316'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#ff5e3a'; c.fillRect(0, 0, 14, h);
    c.fillStyle = '#f2f2f2'; c.font = `700 64px ${DISPLAY}`; c.textBaseline = 'middle';
    c.fillText('HIZ NVMe', 36, 50);
    c.font = `500 44px ${MONO}`;
    c.fillText(fmtGB(def.gb), 36, 108);
  }), g, 0.004, 0.0017, 0);
  g.userData.rotors = [];
  return g;
}

function buildPaste() {
  const g = new THREE.Group();
  const body = cyl(0.008, 0.008, 0.07, new THREE.MeshPhysicalMaterial({ color: 0xdfe3e8, roughness: 0.15, transmission: 0.3, thickness: 0.01 }), g, 0, 0, 0, 20);
  body.rotation.z = Math.PI / 2;
  const goo = cyl(0.0065, 0.0065, 0.05, mat(0x9aa0a8, 0.5, 0.4), g, 0.005, 0, 0, 16);
  goo.rotation.z = Math.PI / 2;
  const tip = cyl(0.002, 0.007, 0.02, mat(0xdfe3e8, 0.3), g, -0.045, 0, 0, 16);
  tip.rotation.z = Math.PI / 2;
  const plunger = cyl(0.003, 0.003, 0.03, mat(0x2a6fd6, 0.5), g, 0.05, 0, 0, 10);
  plunger.rotation.z = Math.PI / 2;
  cyl(0.011, 0.011, 0.003, mat(0x2a6fd6, 0.5), g, 0.066, 0, 0, 20).rotation.z = Math.PI / 2;
  g.userData.rotors = [];
  return g;
}

export function buildPart(def) {
  const g = { cpu: buildCPU, ram: buildRAM, gpu: buildGPU, psu: buildPSU, ssd: buildSSD, sup: buildPaste }[def.cat](def);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ---------- Raf ve ürün kutuları ----------
const BOX_SIZE = {
  cpu: [0.11, 0.13, 0.09], ram: [0.07, 0.16, 0.03], gpu: [0.3, 0.17, 0.08], psu: [0.19, 0.12, 0.17], ssd: [0.08, 0.12, 0.025],
};
const CAT_COLOR = { cpu: '#2f6fd6', ram: '#c2416b', gpu: '#1f9d8a', psu: '#d98a1c', ssd: '#7a55c7' };

function productTexture(def, w, h) {
  const scale = 512 / w;
  return canvasTex(512, Math.round(h * scale), (c, W, H) => {
    let color = CAT_COLOR[def.cat];
    if (def.cat === 'cpu') color = def.socket === 'AM5' ? '#d4532c' : '#2f6fd6';
    c.fillStyle = '#f5f5f2'; c.fillRect(0, 0, W, H);
    c.fillStyle = color; c.fillRect(0, 0, W, H * 0.42);
    c.fillStyle = 'rgba(255,255,255,.12)';
    c.beginPath(); c.moveTo(W * 0.55, 0); c.lineTo(W, 0); c.lineTo(W, H * 0.42); c.lineTo(W * 0.3, H * 0.42); c.fill();
    c.fillStyle = '#ffffff';
    const big = Math.min(W * 0.18, H * 0.18);
    c.font = `700 ${big}px ${DISPLAY}`; c.textBaseline = 'middle';
    const words = def.name.split(' ');
    c.fillText(words[0].toUpperCase(), W * 0.07, H * 0.13);
    c.font = `600 ${big * 0.72}px ${FONT}`;
    wrap(c, words.slice(1).join(' '), W * 0.07, H * 0.29, W * 0.86, big * 0.8);
    c.fillStyle = '#20232a';
    c.font = `500 ${big * 0.45}px ${MONO}`;
    wrap(c, def.spec, W * 0.07, H * 0.52, W * 0.86, big * 0.55);
    c.fillStyle = '#ffe14d';
    c.fillRect(W * 0.07, H * 0.74, W * 0.86, H * 0.2);
    c.fillStyle = '#111';
    c.font = `700 ${big * 0.85}px ${MONO}`;
    c.fillText(fmt(def.price), W * 0.11, H * 0.84);
  });
}

function wrap(c, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (c.measureText(t).width > maxW && line) { c.fillText(line, x, y); line = w; y += lh; } else line = t;
  }
  if (line) c.fillText(line, x, y);
}

export function buildShelf(scene, parts) {
  const g = new THREE.Group();
  scene.add(g);
  const wood = mat(0x8a6a48, 0.7, 0.05);
  const frame = mat(0x3b3f45, 0.45, 0.7);
  const z = -0.86;
  const rows = [0.92, 1.28, 1.64];
  for (const y of rows) box(2.3, 0.025, 0.3, wood, g, 0, y - 0.0125, z);
  for (const x of [-1.15, 1.15]) box(0.03, 1.75, 0.3, frame, g, x, 0.875, z);
  box(2.3, 0.03, 0.3, frame, g, 0, 0.2, z);

  const rowCats = { 1.64: ['cpu', 'ram'], 1.28: ['gpu'], 0.92: ['psu', 'ssd'] };
  const out = {};
  for (const y of rows) {
    const items = parts.filter(p => rowCats[y].includes(p.cat));
    const gap = 0.04;
    const total = items.reduce((s, p) => s + BOX_SIZE[p.cat][0], 0) + gap * (items.length - 1);
    let x = -total / 2;
    for (const p of items) {
      const [w, h, d] = BOX_SIZE[p.cat];
      const side = mat(new THREE.Color(CAT_COLOR[p.cat]).offsetHSL(0, -0.1, -0.08).getHex(), 0.6);
      const front = new THREE.MeshStandardMaterial({ map: productTexture(p, w, h), roughness: 0.45 });
      const top = mat(0xe9e9e4, 0.6);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, top, top, front, side]);
      m.position.set(x + w / 2, y + h / 2, z + 0.15 - d / 2 - 0.01);
      m.rotation.y = (Math.random() - 0.5) * 0.08;
      m.castShadow = true; m.receiveShadow = true;
      m.userData.click = { kind: 'shelf', def: p };
      g.add(m);
      out[p.id] = m;
      x += w + gap;
    }
  }
  // Raf üstünde saksı
  const pot = new THREE.Group();
  pot.position.set(0.95, 1.64, z);
  g.add(pot);
  cyl(0.05, 0.04, 0.08, mat(0xb5583a, 0.8), pot, 0, 0.04, 0, 16);
  const leaf = mat(0x3f7d4a, 0.6);
  for (let i = 0; i < 9; i++) {
    const l = mesh(new THREE.ConeGeometry(0.012, 0.09, 5), leaf, pot, Math.cos(i) * 0.02, 0.11, Math.sin(i) * 0.02);
    l.rotation.set(Math.sin(i * 2) * 0.5, 0, Math.cos(i * 2) * 0.5);
  }
  return out;
}

// ---------- Oda ----------
function terrazzo() {
  const t = canvasTex(1024, 1024, (c, w, h) => {
    c.fillStyle = '#b9b2a6'; c.fillRect(0, 0, w, h);
    const cols = ['#8c8478', '#d9d3c8', '#6f6a62', '#a65d45', '#e8e2d6', '#4f5a58'];
    for (let i = 0; i < 5200; i++) {
      c.fillStyle = cols[i % cols.length];
      const r = 1.5 + Math.random() * 5;
      c.beginPath();
      c.ellipse(Math.random() * w, Math.random() * h, r, r * (0.5 + Math.random() * 0.6), Math.random() * 3, 0, Math.PI * 2);
      c.fill();
    }
    c.strokeStyle = 'rgba(70,60,50,.35)'; c.lineWidth = 3;
    c.strokeRect(0, 0, w, h);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 5);
  return t;
}

function woodTex() {
  const t = canvasTex(1024, 512, (c, w, h) => {
    c.fillStyle = '#a77b52'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 140; i++) {
      c.strokeStyle = `rgba(${Math.random() < 0.5 ? '90,58,30' : '200,160,110'},${0.08 + Math.random() * 0.12})`;
      c.lineWidth = 1 + Math.random() * 3;
      const y = Math.random() * h;
      c.beginPath(); c.moveTo(0, y);
      for (let x = 0; x <= w; x += 64) c.lineTo(x, y + Math.sin(x * 0.01 + i) * 6);
      c.stroke();
    }
    c.fillStyle = 'rgba(60,40,20,.25)';
    for (let x = 0; x < w; x += 256) c.fillRect(x, 0, 2, h);
  });
  return t;
}

export function buildRoom(scene) {
  const floor = mesh(new THREE.PlaneGeometry(8, 8), mat(0xffffff, 0.55, 0, { map: terrazzo() }), scene, 0, 0, 0, false);
  floor.rotation.x = -Math.PI / 2;

  const lower = mat(0x4f7d72, 0.75);
  const upper = mat(0xd5ddd3, 0.9);
  const stripe = mat(0x2e3f3a, 0.5);
  const wall = (w, x, z, ry) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z); g.rotation.y = ry;
    scene.add(g);
    mesh(new THREE.PlaneGeometry(w, 1.05), lower, g, 0, 0.525, 0, false);
    mesh(new THREE.PlaneGeometry(w, 2.0), upper, g, 0, 2.05, 0, false);
    box(w, 0.025, 0.01, stripe, g, 0, 1.05, 0.005, false);
    box(w, 0.1, 0.015, mat(0x2e3f3a, 0.5), g, 0, 0.05, 0.007, false);
    return g;
  };
  wall(6, 0, -1.02, 0);
  const left = wall(5, -2.2, 0.8, Math.PI / 2);
  wall(5, 2.2, 0.8, -Math.PI / 2);
  const ceil = mesh(new THREE.PlaneGeometry(6, 6), mat(0xe8e8e2, 0.9), scene, 0, 3.05, 0, false);
  ceil.rotation.x = Math.PI / 2;
  // Floresan armatür
  box(1.3, 0.04, 0.14, mat(0xdddddd, 0.5, 0.3), scene, 0, 3.0, 0.2, false);
  box(1.2, 0.025, 0.05, mat(0xffffff, 0.2, 0, { emissive: 0xf2f8ff, emissiveIntensity: 2 }), scene, 0, 2.975, 0.2, false);

  // Pencere (sol duvar)
  const sky = canvasTex(512, 512, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#8fc3e8'); gr.addColorStop(0.65, '#d9ecf5'); gr.addColorStop(1, '#f6e3bd');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = '#a8b3b2';
    for (let i = 0; i < 12; i++) { const bw = 40 + Math.random() * 60; c.fillRect(i * 46 - 20, h - 80 - Math.random() * 150, bw, 400); }
    c.fillStyle = '#8b9796';
    c.beginPath(); c.arc(330, h - 150, 60, Math.PI, 0); c.fill();
    c.fillRect(250, h - 260, 10, 120); c.fillRect(400, h - 260, 10, 120);
  });
  mesh(new THREE.PlaneGeometry(1.4, 1.1), new THREE.MeshBasicMaterial({ map: sky, color: 0xffffff }), left, -0.6, 1.75, 0.01, false);
  const wf = mat(0xf2f2ee, 0.45);
  box(1.5, 0.05, 0.06, wf, left, -0.6, 1.2, 0.03, false);
  box(1.5, 0.05, 0.06, wf, left, -0.6, 2.3, 0.03, false);
  box(0.05, 1.15, 0.06, wf, left, -1.33, 1.75, 0.03, false);
  box(0.05, 1.15, 0.06, wf, left, 0.13, 1.75, 0.03, false);
  box(0.035, 1.1, 0.04, wf, left, -0.6, 1.75, 0.03, false);

  // Tabela
  const sign = canvasTex(1024, 220, (c, w, h) => {
    c.fillStyle = '#1d2a3a'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#e39b3a'; c.lineWidth = 8; c.strokeRect(10, 10, w - 20, h - 20);
    c.fillStyle = '#f4efe4'; c.font = `700 124px ${DISPLAY}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('ÇİP BİLGİSAYAR', w / 2, 92);
    c.fillStyle = '#e39b3a'; c.font = `600 40px ${MONO}`;
    c.fillText('TAMİR  ·  TOPLAMA  ·  SATIŞ', w / 2, 170);
  });
  mesh(new THREE.PlaneGeometry(1.5, 0.32), new THREE.MeshStandardMaterial({ map: sign, roughness: 0.5, emissive: 0xffffff, emissiveMap: sign, emissiveIntensity: 0.12 }), scene, 0, 2.15, -1.0, false);

  // Duvar saati
  const clock = new THREE.Group();
  clock.position.set(1.35, 2.15, -1.0);
  scene.add(clock);
  const face = cyl(0.14, 0.14, 0.03, mat(0xf7f7f2, 0.6), clock, 0, 0, 0.015, 32);
  face.rotation.x = Math.PI / 2;
  mesh(new THREE.TorusGeometry(0.14, 0.012, 8, 32), mat(0x2b2e33, 0.35, 0.7), clock, 0, 0, 0.03);
  const hand = mat(0x111111, 0.5);
  const hp = new THREE.Group(); clock.add(hp);
  const mp = new THREE.Group(); clock.add(mp);
  box(0.008, 0.07, 0.004, hand, hp, 0, 0.03, 0.034, false);
  box(0.006, 0.11, 0.004, hand, mp, 0, 0.05, 0.036, false);

  // Tezgah
  const bench = new THREE.Group();
  scene.add(bench);
  box(2.1, 0.05, 0.95, mat(0xffffff, 0.5, 0.05, { map: woodTex() }), bench, 0, 0.725, 0);
  const leg = mat(0x30343a, 0.4, 0.7);
  for (const [x, z] of [[-1, -0.42], [1, -0.42], [-1, 0.42], [1, 0.42]]) box(0.05, 0.7, 0.05, leg, bench, x, 0.35, z);
  box(2.0, 0.03, 0.85, mat(0x5b4430, 0.7), bench, 0, 0.18, 0);

  // Antistatik mat
  const matTex = canvasTex(1024, 1024, (c, w, h) => {
    c.fillStyle = '#3d5566'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 2;
    for (let i = 0; i <= w; i += 64) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); }
    c.fillStyle = 'rgba(255,255,255,.45)'; c.font = `600 40px ${MONO}`;
    c.fillText('ESD SAFE · ANTİSTATİK', 28, h - 28);
    // Vida tepsisi bölmeleri
    c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 3;
    for (let i = 0; i < 4; i++) c.strokeRect(w - 230, 30 + i * 70, 200, 60);
  });
  box(0.72, 0.003, 0.62, mat(0xffffff, 0.85, 0, { map: matTex }), scene, 0, 0.7515, 0, false);
  // Vidalar
  const screw = mat(0xb0b5bc, 0.3, 0.9);
  for (let i = 0; i < 9; i++) cyl(0.0025, 0.0025, 0.004, screw, scene, 0.27 + Math.random() * 0.06, 0.755, -0.27 + Math.random() * 0.06, 8);

  // Çay bardağı ve tabağı
  const tea = new THREE.Group();
  tea.position.set(-0.86, 0.75, -0.28);
  scene.add(tea);
  cyl(0.055, 0.04, 0.008, mat(0xf4f1ea, 0.3), tea, 0, 0.004, 0, 32);
  mesh(new THREE.TorusGeometry(0.052, 0.003, 6, 32), mat(0xb3262c, 0.4), tea, 0, 0.008, 0).rotation.x = Math.PI / 2;
  const prof = [[0, 0], [0.021, 0], [0.023, 0.006], [0.019, 0.03], [0.016, 0.05], [0.019, 0.07], [0.024, 0.092], [0.025, 0.098]].map(([x, y]) => new THREE.Vector2(x, y));
  const glass = mesh(new THREE.LatheGeometry(prof, 32), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.3, side: THREE.DoubleSide, clearcoat: 1 }), tea, 0, 0.008, 0);
  glass.castShadow = false;
  const liq = prof.filter(v => v.y <= 0.078).map(v => new THREE.Vector2(Math.max(0, v.x - 0.0015), v.y + 0.001));
  liq.push(new THREE.Vector2(0.0215, 0.079), new THREE.Vector2(0, 0.079));
  mesh(new THREE.LatheGeometry(liq, 32), new THREE.MeshPhysicalMaterial({ color: 0x9b2d0c, roughness: 0.1, transparent: true, opacity: 0.88, clearcoat: 1 }), tea, 0, 0.008, 0);
  box(0.004, 0.001, 0.07, mat(0xd0d3d8, 0.2, 0.95), tea, 0.035, 0.0095, 0.012).rotation.y = 0.6;
  // Buhar
  const steam = [];
  const steamMat = new THREE.SpriteMaterial({ map: softDot(), color: 0xffffff, transparent: true, opacity: 0.12, depthWrite: false });
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Sprite(steamMat.clone());
    s.scale.setScalar(0.03);
    tea.add(s);
    steam.push({ s, t: i / 6 });
  }

  // Tornavida
  const sd = new THREE.Group();
  sd.position.set(0.22, 0.765, 0.25); sd.rotation.y = 0.5;
  scene.add(sd);
  cyl(0.012, 0.012, 0.1, mat(0xc0392b, 0.35), sd, 0, 0, 0, 12).rotation.z = Math.PI / 2;
  cyl(0.0025, 0.0025, 0.1, mat(0xcfd3d8, 0.2, 0.95), sd, 0.1, 0, 0, 8).rotation.z = Math.PI / 2;

  // Multimetre
  const mm = new THREE.Group();
  mm.position.set(0.86, 0.75, 0.26); mm.rotation.y = -0.4;
  scene.add(mm);
  rbox(0.085, 0.03, 0.16, 0.008, mat(0xf2b705, 0.55), mm, 0, 0.015, 0);
  rbox(0.07, 0.006, 0.13, 0.004, mat(0x22252a, 0.5), mm, 0, 0.031, 0.005);
  const lcd = canvasTex(256, 128, (c, w, h) => {
    c.fillStyle = '#a9b59a'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1d2219'; c.font = `500 80px ${MONO}`; c.textBaseline = 'middle';
    c.fillText('12.04', 20, 66);
    c.font = `600 26px ${MONO}`; c.fillText('V', 222, 98);
  });
  labelPlane(0.055, 0.03, lcd, mm, 0, 0.0345, -0.035);
  cyl(0.02, 0.02, 0.006, mat(0x3a3d42, 0.4, 0.4), mm, 0, 0.036, 0.025, 20);
  box(0.004, 0.002, 0.018, mat(0xf2b705, 0.5), mm, 0, 0.04, 0.025);
  const probeR = cableBundle([[0.02, 0.03, 0.07], [0.03, 0.0, 0.14], [-0.05, 0.005, 0.2], [-0.16, 0.005, 0.12]], { color: 0xc0392b, radius: 0.0022 });
  const probeB = cableBundle([[-0.02, 0.03, 0.07], [-0.03, 0.0, 0.12], [-0.1, 0.005, 0.15], [-0.2, 0.005, 0.06]], { color: 0x16171a, radius: 0.0022 });
  probeR.position.set(0, 0, 0); probeB.position.set(0, 0, 0);
  mm.add(probeR, probeB);

  // Havya istasyonu
  const st = new THREE.Group();
  st.position.set(-0.52, 0.75, -0.34); st.rotation.y = 0.25;
  scene.add(st);
  rbox(0.14, 0.08, 0.1, 0.006, mat(0x2c4f7c, 0.5, 0.3), st, 0, 0.04, 0);
  labelPlane(0.06, 0.025, canvasTex(256, 110, (c, w, h) => {
    c.fillStyle = '#0b0c0d'; c.fillRect(0, 0, w, h);
    drawSeg(c, '350', 18, 14, 82, '#ff4a2a', '#1d0805');
  }), st, -0.02, 0.055, 0.0505, 0, 0);
  const holder = new THREE.Group();
  holder.position.set(0.14, 0, 0);
  st.add(holder);
  cyl(0.035, 0.04, 0.012, mat(0x1b1c1f, 0.5, 0.4), holder, 0, 0.006, 0, 20);
  const coil = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 40 }, (_, i) => new THREE.Vector3(Math.cos(i * 0.9) * 0.012, 0.015 + i * 0.0018, Math.sin(i * 0.9) * 0.012))), 120, 0.0012, 6, false), mat(0x9aa0a8, 0.3, 0.9), holder);
  void coil;
  const iron = cyl(0.007, 0.006, 0.12, mat(0x1f2023, 0.5), holder, 0, 0.07, 0, 12);
  iron.rotation.z = 0.25;
  cyl(0.0015, 0.0005, 0.03, mat(0xc0c4ca, 0.3, 0.9), holder, -0.018, 0.142, 0, 8).rotation.z = 0.25;

  // Parça kutusu (çıkan müşteri parçaları buraya)
  const tray = new THREE.Group();
  tray.position.set(-0.62, 0.75, 0.2);
  scene.add(tray);
  const tm = mat(0x2f3540, 0.6, 0.3);
  box(0.42, 0.006, 0.34, tm, tray, 0, 0.003, 0);
  box(0.42, 0.03, 0.006, tm, tray, 0, 0.015, -0.17);
  box(0.42, 0.03, 0.006, tm, tray, 0, 0.015, 0.17);
  box(0.006, 0.03, 0.34, tm, tray, -0.21, 0.015, 0);
  box(0.006, 0.03, 0.34, tm, tray, 0.21, 0.015, 0);
  labelPlane(0.16, 0.03, canvasTex(512, 96, (c, w, h) => {
    c.fillStyle = '#f4efe4'; c.font = `600 52px ${DISPLAY}`; c.textBaseline = 'middle';
    c.fillText('MÜŞTERİ PARÇALARI', 4, h / 2);
  }), tray, -0.11, 0.0065, 0.14);

  // Toz zerreleri (pencereden gelen ışıkta)
  const N = 260;
  const pos = new Float32Array(N * 3);
  const seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = -2 + Math.random() * 2.6;
    pos[i * 3 + 1] = 0.8 + Math.random() * 1.9;
    pos[i * 3 + 2] = -0.9 + Math.random() * 1.6;
    seed[i] = Math.random() * 100;
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ map: softDot(), size: 0.012, color: 0xfff1d6, transparent: true, opacity: 0.55, depthWrite: false, sizeAttenuation: true }));
  scene.add(dust);

  const update = (t) => {
    const p = dg.attributes.position.array;
    for (let i = 0; i < N; i++) {
      p[i * 3] += Math.sin(t * 0.3 + seed[i]) * 0.00012;
      p[i * 3 + 1] += Math.cos(t * 0.2 + seed[i] * 1.3) * 0.0001 - 0.00002;
      if (p[i * 3 + 1] < 0.8) p[i * 3 + 1] = 2.7;
    }
    dg.attributes.position.needsUpdate = true;
    for (const st2 of steam) {
      st2.t = (st2.t + 0.004) % 1;
      st2.s.position.set(Math.sin(st2.t * 6 + st2.t) * 0.008, 0.1 + st2.t * 0.12, 0);
      st2.s.material.opacity = Math.sin(st2.t * Math.PI) * 0.1;
      st2.s.scale.setScalar(0.02 + st2.t * 0.04);
    }
  };

  return { clockHands: { hp, mp }, update };
}

let dotTex = null;
function softDot() {
  if (dotTex) return dotTex;
  dotTex = canvasTex(64, 64, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  return dotTex;
}

export const TRAY_SLOTS = [
  [-0.74, 0.1], [-0.6, 0.1], [-0.48, 0.1], [-0.74, 0.27], [-0.6, 0.27], [-0.48, 0.27],
].map(([x, z]) => new THREE.Vector3(x, 0.756, z));

// ---------- Monitör ----------
export function buildMonitor(scene) {
  const g = new THREE.Group();
  g.position.set(0.66, 0.75, -0.26);
  g.rotation.y = -0.42;
  scene.add(g);
  const dark = mat(0x18191c, 0.45, 0.4);
  rbox(0.22, 0.012, 0.16, 0.004, dark, g, 0, 0.006, 0);
  box(0.04, 0.2, 0.025, dark, g, 0, 0.11, -0.03);
  rbox(0.6, 0.355, 0.03, 0.006, dark, g, 0, 0.36, 0);
  const canvas = document.createElement('canvas');
  canvas.width = 800; canvas.height = 450;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.576, 0.324), new THREE.MeshBasicMaterial({ map: tex, color: 0xdddddd }));
  screen.position.set(0, 0.362, 0.0155);
  g.add(screen);
  // Ekran camı yansıması
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.12, clearcoat: 1 });
  mesh(new THREE.PlaneGeometry(0.576, 0.324), glassM, g, 0, 0.362, 0.0158, false);
  const pled = box(0.006, 0.003, 0.002, mat(0x111111, 0.4, 0, { emissive: 0x000000, emissiveIntensity: 3 }), g, 0.27, 0.19, 0.016, false);

  // Klavye
  const kb = new THREE.Group();
  kb.position.set(0.5, 0.752, 0.16); kb.rotation.y = -0.25;
  scene.add(kb);
  const keys = canvasTex(1024, 320, (c, w, h) => {
    c.fillStyle = '#16171a'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#2c2e33';
    for (let r = 0; r < 5; r++) for (let k = 0; k < 15; k++) c.fillRect(16 + k * 67, 16 + r * 60, 58, 52);
    c.fillStyle = '#9aa0a8'; c.font = `600 26px ${MONO}`;
    'QWERTYUIOPĞÜ'.split('').forEach((ch, i) => c.fillText(ch, 104 + i * 67, 164));
    'ASDFGHJKLŞİ'.split('').forEach((ch, i) => c.fillText(ch, 120 + i * 67, 224));
  });
  rbox(0.36, 0.014, 0.12, 0.004, mat(0x16171a, 0.55, 0.2), kb, 0, 0.007, 0);
  labelPlane(0.35, 0.11, keys, kb, 0, 0.0145, 0);

  return { group: g, canvas, ctx: canvas.getContext('2d'), tex, powerLed: pled };
}

// ---------- Katalog için ürün fotoğrafları ----------
export async function renderThumbnails(defs, envFactory, w = 220, h = 160) {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1);
  r.setSize(w, h, false);
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.05;
  const s = new THREE.Scene();
  s.environment = envFactory(r);
  s.environmentIntensity = 0.9;
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(1, 2, 1.5);
  s.add(key, new THREE.AmbientLight(0xffffff, 0.4));
  const cam = new THREE.PerspectiveCamera(28, w / h, 0.001, 10);
  const out = {};
  for (const d of defs) {
    const m = buildPart(d);
    if (d.cat === 'ram') m.rotation.y = -0.9;
    if (d.cat === 'gpu') m.rotation.y = 0.35;
    if (d.cat === 'psu') m.rotation.y = 0.5;
    if (d.cat === 'sup') m.rotation.set(0.5, 0.4, 0.2);
    s.add(m);
    const bb = new THREE.Box3().setFromObject(m);
    const c = bb.getCenter(new THREE.Vector3());
    const size = bb.getSize(new THREE.Vector3()).length();
    const dir = d.cat === 'ssd' ? new THREE.Vector3(0.3, 1.1, 0.9) : new THREE.Vector3(0.6, 0.75, 1.2);
    cam.position.copy(c).addScaledVector(dir.normalize(), size * 1.55);
    cam.lookAt(c);
    r.render(s, cam);
    out[d.id] = r.domElement.toDataURL('image/png');
    s.remove(m);
    disposeTree(m);
    await new Promise(res => setTimeout(res, 0));
  }
  r.dispose();
  r.forceContextLoss?.();
  return out;
}

export function disposeTree(o) {
  o.traverse(n => {
    if (n.isMesh || n.isSprite || n.isPoints) {
      n.geometry?.dispose();
      const ms = Array.isArray(n.material) ? n.material : [n.material];
      for (const m of ms) { m.map?.dispose(); m.emissiveMap?.dispose(); m.dispose(); }
    }
  });
}
