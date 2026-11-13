// Oyundaki tüm 3D modeller kodla üretilir (low-poly). Birim: metre.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { fmt, fmtGB } from './data.js';

const FONT = '"IBM Plex Sans", "Segoe UI", sans-serif';
const MONO = '"IBM Plex Mono", ui-monospace, monospace';
const DISPLAY = '"Chakra Petch", "IBM Plex Sans", sans-serif';

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
  t.anisotropy = 4;
  return t;
}

function labelPlane(w, h, tex, parent, x, y, z, rotX = -Math.PI / 2, rotY = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, transparent: true }));
  m.position.set(x, y, z);
  m.rotation.set(rotX, rotY, 0, 'YXZ');
  m.rotation.order = 'YXZ';
  m.rotation.y = rotY;
  m.rotation.x = rotX;
  if (parent) parent.add(m);
  return m;
}

// ---------- Fan ----------
function makeFan(r, { frame = 0x16181c, blade = 0x2b2e34, rgb = null } = {}) {
  const g = new THREE.Group();
  const ringMat = rgb ? mat(rgb, 0.4, 0, { emissive: rgb, emissiveIntensity: 0.25 }) : mat(frame, 0.5, 0.2);
  if (rgb) ringMat.userData.rgb = rgb;
  const ring = mesh(new THREE.TorusGeometry(r * 0.94, r * 0.07, 8, 32), ringMat, g);
  ring.rotation.x = Math.PI / 2;
  const rotor = new THREE.Group();
  g.add(rotor);
  cyl(r * 0.3, r * 0.3, r * 0.16, mat(0x1f2126, 0.5, 0.2), rotor, 0, 0, 0);
  const bm = mat(blade, 0.55, 0.1);
  for (let i = 0; i < 7; i++) {
    const piv = new THREE.Group();
    piv.rotation.y = (i / 7) * Math.PI * 2;
    rotor.add(piv);
    const b = box(r * 0.6, r * 0.02, r * 0.3, bm, piv, r * 0.58, 0, 0, false);
    b.rotation.x = 0.45;
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
  const lighter = '#' + c.clone().offsetHSL(0, 0, 0.06).getHexString();
  return canvasTex(512, 640, (g, w, h) => {
    g.fillStyle = hex; g.fillRect(0, 0, w, h);
    g.strokeStyle = lighter; g.lineWidth = 2; g.globalAlpha = 0.7;
    for (let i = 0; i < 90; i++) {
      let x = Math.random() * w, y = Math.random() * h;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 3; k++) {
        if (Math.random() < 0.5) x += (Math.random() - 0.5) * 160; else y += (Math.random() - 0.5) * 160;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    g.globalAlpha = 0.9; g.fillStyle = '#c9b46a';
    for (let i = 0; i < 160; i++) g.fillRect(Math.random() * w, Math.random() * h, 3, 3);
  });
}

function buildBoard(bd) {
  const g = new THREE.Group();
  const pcbMat = mat(0xffffff, 0.7, 0.05, { map: pcbTexture(bd.pcb) });
  box(0.244, 0.002, 0.305, pcbMat, g, -0.088, 0.013, -0.0625);

  const metal = mat(0x9aa0a8, 0.35, 0.8);
  const accent = mat(bd.accent, 0.35, 0.7);
  const dark = mat(0x16171a, 0.6, 0.2);

  // İşlemci soketi
  const s = SLOT_LOCAL.cpu[0];
  box(0.05, 0.003, 0.05, metal, g, s.x, 0.0155, s.z);
  box(0.04, 0.0032, 0.04, mat(bd.socket === 'AM5' ? 0x6b5a2e : 0x4d4a44, 0.5, 0.6), g, s.x, 0.0156, s.z);
  const lever = cyl(0.0012, 0.0012, 0.05, metal, g, s.x + 0.027, 0.016, s.z);
  lever.rotation.x = Math.PI / 2;

  // VRM soğutucuları ve arka I/O kapağı
  rbox(0.075, 0.02, 0.022, 0.003, accent, g, -0.10, 0.024, -0.195);
  rbox(0.022, 0.02, 0.075, 0.003, accent, g, -0.172, 0.024, -0.13);
  const io = rbox(0.03, 0.034, 0.08, 0.004, dark, g, -0.195, 0.031, -0.17);
  io.material = dark;

  // RAM yuvaları
  const slotMat = mat(bd.slot, 0.6, 0.1);
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
  rbox(0.045, 0.012, 0.045, 0.004, accent, g, -0.03, 0.02, 0.045);
  labelPlane(0.034, 0.012, canvasTex(256, 90, (c, w, h) => {
    c.fillStyle = '#000'; c.globalAlpha = 0; c.fillRect(0, 0, w, h); c.globalAlpha = 1;
    c.fillStyle = '#e9ecf1'; c.font = `700 48px ${DISPLAY}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(bd.socket === 'AM5' ? 'NOVA' : 'ATLAS', w / 2, h / 2);
  }), g, -0.03, 0.0262, 0.045);

  // Güç konnektörleri
  box(0.008, 0.012, 0.052, mat(0x1a1a1a, 0.6), g, 0.025, 0.02, -0.11);
  box(0.016, 0.01, 0.008, mat(0x1a1a1a, 0.6), g, -0.19, 0.019, -0.207);

  // Kondansatörler
  const capM = mat(0x30333a, 0.4, 0.6);
  for (let i = 0; i < 6; i++) cyl(0.003, 0.003, 0.008, capM, g, -0.14 + i * 0.012, 0.018, -0.172, 10);

  // Hata ışıkları (Q-LED)
  const leds = {};
  ['cpu', 'dram', 'vga', 'boot'].forEach((k, i) => {
    const m = mat(0x2a1010, 0.4, 0, { emissive: 0x000000, emissiveIntensity: 3 });
    leds[k] = box(0.006, 0.003, 0.004, m, g, 0.02, 0.0155, -0.203 + i * 0.009, false);
  });
  labelPlane(0.034, 0.04, canvasTex(160, 192, (c, w, h) => {
    c.fillStyle = '#e8e8e8'; c.font = `600 26px ${MONO}`; c.textBaseline = 'middle';
    ['CPU', 'DRAM', 'VGA', 'BOOT'].forEach((t, i) => c.fillText(t, 4, 26 + i * 43));
  }), g, 0.04, 0.0142, -0.1895);

  // Anakart yazısı
  labelPlane(0.15, 0.016, canvasTex(1024, 110, (c, w, h) => {
    c.fillStyle = '#f2f2f2'; c.font = `600 52px ${MONO}`; c.textBaseline = 'middle';
    c.fillText(bd.label, 10, h / 2);
  }), g, -0.12, 0.0142, 0.077);

  return { group: g, leds };
}

export function buildCase() {
  const group = new THREE.Group();
  group.position.copy(CASE_POS);
  const steel = mat(0x26292e, 0.45, 0.55);
  const inner = mat(0x1d1f23, 0.6, 0.4);
  box(0.46, 0.005, 0.45, inner, group, 0, 0.0025, 0);
  box(0.006, 0.21, 0.45, steel, group, -0.227, 0.105, 0);
  box(0.006, 0.21, 0.45, steel, group, 0.227, 0.105, 0);
  box(0.46, 0.21, 0.006, steel, group, 0, 0.105, -0.222);
  box(0.46, 0.21, 0.006, steel, group, 0, 0.105, 0.222);
  // Ön panel (file)
  box(0.018, 0.212, 0.452, mat(0x111214, 0.85, 0.2), group, 0.239, 0.105, 0);
  // Kenar çıtası
  const lip = mat(0x34383e, 0.4, 0.6);
  box(0.47, 0.006, 0.012, lip, group, 0, 0.21, -0.219);
  box(0.47, 0.006, 0.012, lip, group, 0, 0.21, 0.219);
  box(0.012, 0.006, 0.45, lip, group, -0.224, 0.21, 0);
  box(0.012, 0.006, 0.45, lip, group, 0.224, 0.21, 0);
  // Güç kaynağı örtüsü
  const shroud = rbox(0.285, 0.095, 0.128, 0.004, mat(0x202227, 0.55, 0.4), group, 0.0825, 0.0525, 0.158);
  labelPlane(0.11, 0.022, canvasTex(512, 100, (c, w, h) => {
    c.fillStyle = '#d6dbe2'; c.font = `700 64px ${DISPLAY}`; c.textBaseline = 'middle';
    c.fillText('ÇİP · ZEN', 6, h / 2);
  }), group, 0.07, 0.1005, 0.158);
  void shroud;

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
    group, rotors, leds: null, board: null,
    setBoard(bd) {
      if (boardGroup) { group.remove(boardGroup); disposeTree(boardGroup); }
      const b = buildBoard(bd);
      boardGroup = b.group;
      group.add(boardGroup);
      api.leds = b.leds;
      api.board = bd;
    },
  };
  return api;
}

// ---------- Parçalar ----------
function buildCPU(def) {
  const g = new THREE.Group();
  box(0.04, 0.002, 0.04, mat(0x2d6a3e, 0.6), g, 0, 0.001, 0);
  rbox(0.034, 0.003, 0.034, 0.001, mat(0xc0c4ca, 0.3, 0.9), g, 0, 0.0035, 0);
  const rotors = [];
  const hi = def.tier >= 2;
  const finM = mat(hi ? 0x2a2c31 : 0x8d939b, 0.4, 0.7);
  cyl(0.043, 0.045, 0.006, mat(0x5f646b, 0.4, 0.8), g, 0, 0.008, 0, 24);
  for (let i = 0; i < 14; i++) {
    const piv = new THREE.Group();
    piv.rotation.y = (i / 14) * Math.PI * 2;
    piv.position.y = 0.022;
    g.add(piv);
    box(0.038, 0.024, 0.0018, finM, piv, 0.022, 0, 0);
  }
  cyl(0.045, 0.045, 0.008, mat(0x17181b, 0.5, 0.2), g, 0, 0.037, 0, 28);
  const f = makeFan(0.04, { rgb: hi ? (def.socket === 'AM5' ? 0xff5a36 : 0x4f8dff) : null });
  f.group.position.y = 0.043;
  g.add(f.group);
  rotors.push(f);
  labelPlane(0.022, 0.022, canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#111'; c.beginPath(); c.arc(64, 64, 62, 0, Math.PI * 2); c.fill();
    c.fillStyle = def.socket === 'AM5' ? '#ff7a50' : '#7aa6ff';
    c.font = `700 30px ${DISPLAY}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(def.socket === 'AM5' ? 'NOVA' : 'ATLAS', 64, 64);
  }), g, 0, 0.0525, 0);
  g.userData.rotors = rotors;
  return g;
}

function buildRAM(def) {
  const g = new THREE.Group();
  const L = 0.133, H = 0.031;
  box(0.0015, H, L, mat(0x245b34, 0.6), g, 0, H / 2, 0);
  box(0.0013, 0.004, L * 0.92, mat(0xd4af37, 0.3, 0.9), g, 0, 0.002, 0);
  const sp = mat(def.color, 0.45, 0.6);
  box(0.0025, 0.027, L - 0.006, sp, g, 0.002, 0.018, 0);
  box(0.0025, 0.027, L - 0.006, sp, g, -0.002, 0.018, 0);
  if (def.rgb) {
    const lm = mat(0xffffff, 0.3, 0, { emissive: 0xff4fd8, emissiveIntensity: 0.25 });
    lm.userData.rgb = 0xff4fd8;
    box(0.006, 0.005, L - 0.01, lm, g, 0, H + 0.0025, 0);
  }
  const tex = canvasTex(512, 96, (c, w, h) => {
    const light = new THREE.Color(def.color).getHSL({}).l > 0.5;
    c.fillStyle = light ? '#222' : '#e8e8e8';
    c.font = `700 44px ${DISPLAY}`; c.textBaseline = 'middle';
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
  box(0.07, 0.008, 0.0018, mat(0xd4af37, 0.3, 0.9), g, 0.0, 0.004, 0);
  const shroud = rbox(L, H, T, 0.006, mat(def.color, 0.45, 0.5), g, cx, H / 2 + 0.006, T / 2 + 0.002);
  void shroud;
  box(L, H, 0.002, mat(0x2b2d31, 0.4, 0.8), g, cx, H / 2 + 0.006, -0.002);
  box(0.0018, H * 1.12, 0.02, mat(0xb9bec6, 0.3, 0.9), g, -0.071, H / 2 + 0.004, 0.006);
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
    box(L * 0.6, 0.003, 0.004, lm, g, cx, H + 0.0075, T * 0.7);
  }
  const light = new THREE.Color(def.color).getHSL({}).l > 0.5;
  labelPlane(Math.min(0.12, L * 0.5), 0.014, canvasTex(512, 64, (c, w, h) => {
    c.fillStyle = light ? '#1b1d22' : '#e9ecf1';
    c.font = `700 40px ${DISPLAY}`; c.textBaseline = 'middle';
    c.fillText('PRIZMA ' + def.name.split(' ')[2], 4, h / 2);
  }), g, cx, H + 0.0062, T / 2 + 0.002);
  g.userData.rotors = rotors;
  return g;
}

function buildPSU(def) {
  const g = new THREE.Group();
  const W = 0.15, H = 0.086, D = 0.12;
  rbox(W, H, D, 0.004, mat(def.color, 0.55, 0.5), g, 0, H / 2, 0);
  const f = makeFan(0.05, { frame: 0x2a2c30 });
  f.group.position.set(0, H + 0.002, 0);
  g.add(f.group);
  const grill = mesh(new THREE.TorusGeometry(0.054, 0.0025, 6, 32), mat(0x0f1012, 0.4, 0.8), g, 0, H + 0.004, 0);
  grill.rotation.x = Math.PI / 2;
  labelPlane(0.11, 0.05, canvasTex(512, 230, (c, w, h) => {
    c.fillStyle = '#f4f4f0'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#16181b'; c.fillRect(0, 0, w, 70);
    c.fillStyle = '#f2c14e'; c.font = `700 52px ${DISPLAY}`; c.textBaseline = 'middle';
    c.fillText('VOLTA', 16, 36);
    c.fillStyle = '#16181b'; c.font = `700 86px ${DISPLAY}`;
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
  labelPlane(0.066, 0.02, canvasTex(512, 150, (c, w, h) => {
    c.fillStyle = '#121316'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#ff5e3a'; c.fillRect(0, 0, 14, h);
    c.fillStyle = '#f2f2f2'; c.font = `700 56px ${DISPLAY}`; c.textBaseline = 'middle';
    c.fillText('HIZ NVMe', 36, 50);
    c.font = `500 44px ${MONO}`;
    c.fillText(fmtGB(def.gb), 36, 108);
  }), g, 0.004, 0.0017, 0);
  g.userData.rotors = [];
  return g;
}

export function buildPart(def) {
  const g = { cpu: buildCPU, ram: buildRAM, gpu: buildGPU, psu: buildPSU, ssd: buildSSD }[def.cat](def);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
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
    c.fillStyle = '#ffffff';
    const big = Math.min(W * 0.16, H * 0.16);
    c.font = `700 ${big}px ${DISPLAY}`; c.textBaseline = 'middle';
    const words = def.name.split(' ');
    c.fillText(words[0].toUpperCase(), W * 0.07, H * 0.13);
    c.font = `600 ${big * 0.75}px ${FONT}`;
    wrap(c, words.slice(1).join(' '), W * 0.07, H * 0.29, W * 0.86, big * 0.8);
    c.fillStyle = '#20232a';
    c.font = `500 ${big * 0.5}px ${MONO}`;
    wrap(c, def.spec, W * 0.07, H * 0.52, W * 0.86, big * 0.6);
    // fiyat etiketi
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
  const wood = mat(0x8a6a48, 0.75, 0.05);
  const frame = mat(0x3b3f45, 0.5, 0.6);
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
      const side = mat(new THREE.Color(CAT_COLOR[p.cat]).offsetHSL(0, -0.1, -0.08).getHex(), 0.7);
      const front = new THREE.MeshStandardMaterial({ map: productTexture(p, w, h), roughness: 0.65 });
      const top = mat(0xe9e9e4, 0.7);
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

export function buildRoom(scene) {
  const floor = mesh(new THREE.PlaneGeometry(8, 8), mat(0xffffff, 0.8, 0, { map: terrazzo() }), scene, 0, 0, 0, false);
  floor.rotation.x = -Math.PI / 2;

  const lower = mat(0x4f7d72, 0.85);
  const upper = mat(0xd5ddd3, 0.9);
  const stripe = mat(0x2e3f3a, 0.6);
  const wall = (w, x, z, ry) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z); g.rotation.y = ry;
    scene.add(g);
    mesh(new THREE.PlaneGeometry(w, 1.05), lower, g, 0, 0.525, 0, false);
    mesh(new THREE.PlaneGeometry(w, 2.0), upper, g, 0, 2.05, 0, false);
    box(w, 0.025, 0.01, stripe, g, 0, 1.05, 0.005, false);
    return g;
  };
  wall(6, 0, -1.02, 0);
  const left = wall(5, -2.2, 0.8, Math.PI / 2);
  wall(5, 2.2, 0.8, -Math.PI / 2);
  const ceil = mesh(new THREE.PlaneGeometry(6, 6), mat(0xe8e8e2, 0.9), scene, 0, 3.05, 0, false);
  ceil.rotation.x = Math.PI / 2;

  // Pencere (sol duvar)
  const sky = canvasTex(256, 256, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#8fc3e8'); gr.addColorStop(0.7, '#d9ecf5'); gr.addColorStop(1, '#f1e6c8');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = '#9aa7a6';
    for (let i = 0; i < 9; i++) { const bw = 20 + Math.random() * 30; c.fillRect(i * 30 - 10, h - 40 - Math.random() * 70, bw, 200); }
  });
  const win = mesh(new THREE.PlaneGeometry(1.4, 1.1), new THREE.MeshBasicMaterial({ map: sky }), left, -0.6, 1.75, 0.01, false);
  void win;
  const wf = mat(0xf2f2ee, 0.5);
  box(1.5, 0.05, 0.06, wf, left, -0.6, 1.2, 0.03, false);
  box(1.5, 0.05, 0.06, wf, left, -0.6, 2.3, 0.03, false);
  box(0.05, 1.15, 0.06, wf, left, -1.33, 1.75, 0.03, false);
  box(0.05, 1.15, 0.06, wf, left, 0.13, 1.75, 0.03, false);
  box(0.035, 1.1, 0.04, wf, left, -0.6, 1.75, 0.03, false);

  // Tabela
  const sign = canvasTex(1024, 220, (c, w, h) => {
    c.fillStyle = '#1d2a3a'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#e39b3a'; c.lineWidth = 8; c.strokeRect(10, 10, w - 20, h - 20);
    c.fillStyle = '#f4efe4'; c.font = `700 104px ${DISPLAY}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('ÇİP BİLGİSAYAR', w / 2, 92);
    c.fillStyle = '#e39b3a'; c.font = `600 40px ${MONO}`;
    c.fillText('TAMİR  ·  TOPLAMA  ·  SATIŞ', w / 2, 168);
  });
  mesh(new THREE.PlaneGeometry(1.5, 0.32), new THREE.MeshStandardMaterial({ map: sign, roughness: 0.5, emissive: 0xffffff, emissiveMap: sign, emissiveIntensity: 0.15 }), scene, 0, 2.15, -1.0, false);

  // Duvar saati
  const clock = new THREE.Group();
  clock.position.set(1.35, 2.15, -1.0);
  scene.add(clock);
  const face = cyl(0.14, 0.14, 0.03, mat(0xf7f7f2, 0.6), clock, 0, 0, 0.015, 32);
  face.rotation.x = Math.PI / 2;
  const rim = mesh(new THREE.TorusGeometry(0.14, 0.012, 8, 32), mat(0x2b2e33, 0.4, 0.6), clock, 0, 0, 0.03);
  void rim;
  const hand = mat(0x111111, 0.5);
  const hr = box(0.008, 0.07, 0.004, hand, clock, 0, 0.03, 0.034, false);
  const mn = box(0.006, 0.11, 0.004, hand, clock, 0, 0.05, 0.036, false);
  const hp = new THREE.Group(); hp.position.z = 0; clock.add(hp);
  hp.add(hr); hr.position.set(0, 0.03, 0.034);
  const mp = new THREE.Group(); clock.add(mp); mp.add(mn); mn.position.set(0, 0.05, 0.036);

  // Tezgah
  const bench = new THREE.Group();
  scene.add(bench);
  const top = mat(0xa77b52, 0.6, 0.05);
  box(2.1, 0.05, 0.95, top, bench, 0, 0.725, 0);
  const leg = mat(0x30343a, 0.5, 0.6);
  for (const [x, z] of [[-1, -0.42], [1, -0.42], [-1, 0.42], [1, 0.42]]) box(0.05, 0.7, 0.05, leg, bench, x, 0.35, z);
  box(2.0, 0.03, 0.85, mat(0x5b4430, 0.7), bench, 0, 0.18, 0);

  // Antistatik mat
  const matTex = canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = '#3d5566'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 2;
    for (let i = 0; i <= w; i += 32) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); }
    c.fillStyle = 'rgba(255,255,255,.5)'; c.font = `600 22px ${MONO}`;
    c.fillText('ESD SAFE · ANTİSTATİK', 14, h - 14);
  });
  box(0.72, 0.003, 0.62, mat(0xffffff, 0.9, 0, { map: matTex }), scene, 0, 0.7515, 0, false);

  // Çay bardağı ve tabağı
  const tea = new THREE.Group();
  tea.position.set(-0.82, 0.75, -0.22);
  scene.add(tea);
  const saucer = cyl(0.055, 0.04, 0.008, mat(0xf4f1ea, 0.35), tea, 0, 0.004, 0, 32);
  void saucer;
  mesh(new THREE.TorusGeometry(0.052, 0.003, 6, 32), mat(0xb3262c, 0.4), tea, 0, 0.008, 0).rotation.x = Math.PI / 2;
  const prof = [[0, 0], [0.021, 0], [0.023, 0.006], [0.019, 0.03], [0.016, 0.05], [0.019, 0.07], [0.024, 0.092], [0.025, 0.098]].map(([x, y]) => new THREE.Vector2(x, y));
  const glass = mesh(new THREE.LatheGeometry(prof, 32), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.28, side: THREE.DoubleSide }), tea, 0, 0.008, 0);
  glass.castShadow = false;
  const liq = prof.filter(v => v.y <= 0.078).map(v => new THREE.Vector2(Math.max(0, v.x - 0.0015), v.y + 0.001));
  liq.push(new THREE.Vector2(0.0215, 0.079), new THREE.Vector2(0, 0.079));
  mesh(new THREE.LatheGeometry(liq, 32), new THREE.MeshStandardMaterial({ color: 0x9b2d0c, roughness: 0.15, transparent: true, opacity: 0.88 }), tea, 0, 0.008, 0);
  const spoon = box(0.004, 0.001, 0.07, mat(0xd0d3d8, 0.25, 0.9), tea, 0.035, 0.0095, 0.012);
  spoon.rotation.y = 0.6;

  // Tornavida
  const sd = new THREE.Group();
  sd.position.set(0.22, 0.765, 0.25); sd.rotation.y = 0.5;
  scene.add(sd);
  const handle = cyl(0.012, 0.012, 0.1, mat(0xc0392b, 0.4), sd, 0, 0, 0, 12);
  handle.rotation.z = Math.PI / 2;
  const shaft = cyl(0.0025, 0.0025, 0.1, mat(0xcfd3d8, 0.25, 0.9), sd, 0.1, 0, 0, 8);
  shaft.rotation.z = Math.PI / 2;

  // Parça kutusu (çıkan müşteri parçaları buraya)
  const tray = new THREE.Group();
  tray.position.set(-0.62, 0.75, 0.2);
  scene.add(tray);
  const tm = mat(0x2f3540, 0.7, 0.2);
  box(0.42, 0.006, 0.34, tm, tray, 0, 0.003, 0);
  box(0.42, 0.03, 0.006, tm, tray, 0, 0.015, -0.17);
  box(0.42, 0.03, 0.006, tm, tray, 0, 0.015, 0.17);
  box(0.006, 0.03, 0.34, tm, tray, -0.21, 0.015, 0);
  box(0.006, 0.03, 0.34, tm, tray, 0.21, 0.015, 0);
  labelPlane(0.16, 0.03, canvasTex(512, 96, (c, w, h) => {
    c.fillStyle = '#f4efe4'; c.font = `600 44px ${FONT}`; c.textBaseline = 'middle';
    c.fillText('Müşteri parçaları', 4, h / 2);
  }), tray, -0.11, 0.0065, 0.14);

  return { clockHands: { hp, mp } };
}

export const TRAY_SLOTS = [
  [-0.74, 0.1], [-0.6, 0.1], [-0.48, 0.1], [-0.74, 0.27], [-0.6, 0.27], [-0.48, 0.27],
].map(([x, z]) => new THREE.Vector3(x, 0.756, z + 0.0));

// ---------- Monitör ----------
export function buildMonitor(scene) {
  const g = new THREE.Group();
  g.position.set(0.66, 0.75, -0.26);
  g.rotation.y = -0.42;
  scene.add(g);
  const dark = mat(0x18191c, 0.5, 0.3);
  rbox(0.22, 0.012, 0.16, 0.004, dark, g, 0, 0.006, 0);
  box(0.04, 0.2, 0.025, dark, g, 0, 0.11, -0.03);
  rbox(0.6, 0.355, 0.03, 0.006, dark, g, 0, 0.36, 0);
  const canvas = document.createElement('canvas');
  canvas.width = 800; canvas.height = 450;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.576, 0.324), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  screen.position.set(0, 0.362, 0.0155);
  g.add(screen);
  const pled = box(0.006, 0.003, 0.002, mat(0x111111, 0.4, 0, { emissive: 0x000000, emissiveIntensity: 2 }), g, 0.27, 0.19, 0.016, false);

  // Klavye
  const kb = new THREE.Group();
  kb.position.set(0.5, 0.752, 0.16); kb.rotation.y = -0.25;
  scene.add(kb);
  const keys = canvasTex(512, 160, (c, w, h) => {
    c.fillStyle = '#16171a'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#2c2e33';
    for (let r = 0; r < 5; r++) for (let k = 0; k < 15; k++) c.fillRect(8 + k * 33.5, 8 + r * 30, 29, 26);
    c.fillStyle = '#9aa0a8'; c.font = `600 14px ${MONO}`;
    'QWERTYUIOPĞÜ'.split('').forEach((ch, i) => c.fillText(ch, 52 + i * 33.5, 82));
    'ASDFGHJKLŞİ'.split('').forEach((ch, i) => c.fillText(ch, 60 + i * 33.5, 112));
  });
  rbox(0.36, 0.014, 0.12, 0.004, new THREE.MeshStandardMaterial({ color: 0x16171a, roughness: 0.6 }), kb, 0, 0.007, 0);
  labelPlane(0.35, 0.11, keys, kb, 0, 0.0145, 0);

  return { group: g, canvas, ctx: canvas.getContext('2d'), tex, powerLed: pled };
}

export function disposeTree(o) {
  o.traverse(n => {
    if (n.isMesh) {
      n.geometry.dispose();
      const ms = Array.isArray(n.material) ? n.material : [n.material];
      for (const m of ms) { m.map?.dispose(); m.dispose(); }
    }
  });
}
