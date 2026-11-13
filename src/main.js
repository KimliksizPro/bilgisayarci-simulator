import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { initAudio, sfx, setFan, setMuted, setFanPitch } from './audio.js';
import { CATS, PARTS, PART, SUPPLIES, BOARDS, computeStats, makeJob, fmt, fmtGB } from './data.js';
import {
  buildRoom, buildCase, buildPart, buildShelf, buildMonitor, buildCables, slotWorld, TRAY_SLOTS,
  disposeTree, renderThumbnails, drawSeg,
} from './models.js';

const $ = s => document.querySelector(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));
document.documentElement.lang = 'tr'; // büyük harfte doğru İ/I için

await Promise.race([
  Promise.all(['700 40px "Barlow Condensed"', '600 40px "Barlow Condensed"', '500 20px "IBM Plex Mono"', '600 20px "IBM Plex Sans"']
    .map(f => document.fonts?.load(f) ?? Promise.resolve())),
  sleep(3000),
]);

// ---------- Sahne ----------
const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const lowPower = matchMedia('(max-width: 820px)').matches;
renderer.setPixelRatio(Math.min(devicePixelRatio, lowPower ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const envFrom = r => {
  const pm = new THREE.PMREMGenerator(r);
  const t = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  pm.dispose();
  return t;
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1f26);
scene.environment = envFrom(renderer);
scene.environmentIntensity = 0.35;
const camera = new THREE.PerspectiveCamera(42, 1, 0.02, 30);
const VIEWS = {
  bench: { pos: new THREE.Vector3(0.04, 1.6, 0.62), target: new THREE.Vector3(-0.02, 0.76, -0.04) },
  close: { pos: new THREE.Vector3(-0.07, 1.26, 0.22), target: new THREE.Vector3(-0.08, 0.77, -0.07) },
  shelf: { pos: new THREE.Vector3(0.0, 1.3, 0.32), target: new THREE.Vector3(0, 1.3, -0.86) },
};
camera.position.copy(VIEWS.bench.pos);
const controls = new OrbitControls(camera, canvas);
controls.target.copy(VIEWS.bench.target);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.3;
controls.maxDistance = 2.6;
controls.maxPolarAngle = 1.45;
controls.screenSpacePanning = true;

scene.add(new THREE.HemisphereLight(0xe8f0ff, 0x4a3b2a, 0.55));
const sun = new THREE.DirectionalLight(0xffe8c8, 2.0);
sun.position.set(-2.0, 2.6, 0.9);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -1.4, right: 1.4, top: 1.4, bottom: -1.4, near: 0.5, far: 6 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.01;
scene.add(sun);
const lamp = new THREE.SpotLight(0xfff4e0, 10, 3, 0.62, 0.6, 1.4);
lamp.position.set(0.25, 1.75, 0.45);
lamp.target.position.set(-0.05, 0.75, -0.05);
lamp.castShadow = true;
lamp.shadow.mapSize.set(1024, 1024);
lamp.shadow.bias = -0.0003;
lamp.shadow.radius = 4;
scene.add(lamp, lamp.target);
const tube = new THREE.PointLight(0xeef6ff, 5, 6, 1.2);
tube.position.set(0, 2.8, 0.2);
scene.add(tube);
const caseGlow = new THREE.PointLight(0x4fd1c5, 0, 0.7, 2);
caseGlow.position.set(0.1, 0.9, -0.02);
scene.add(caseGlow);

// Bloom: yalnızca parlayan (RGB, LED, ekran) yüzeyler ışıldar.
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.32, 0.35, 1.0);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// Grafik kalitesi: yüksek (bloom + gölge) ya da düşük (zayıf bilgisayarlar için).
const QKEY = 'bilgisayarci-sim-quality';
let quality = 'high';
let qualityLocked = false;
try { const q = localStorage.getItem(QKEY); if (q) { quality = q; qualityLocked = true; } } catch (e) { /* yok say */ }
function applyQuality() {
  const hi = quality === 'high';
  renderer.setPixelRatio(hi ? Math.min(devicePixelRatio, lowPower ? 1.5 : 2) : 1);
  if (renderer.shadowMap.enabled !== hi) {
    renderer.shadowMap.enabled = hi;
    scene.traverse(n => {
      if (!n.isMesh) return;
      (Array.isArray(n.material) ? n.material : [n.material]).forEach(m => { m.needsUpdate = true; });
    });
  }
  const lbl = document.querySelector('#quality .kc-label');
  if (lbl) lbl.textContent = hi ? 'Yüksek' : 'Düşük';
  resize?.();
}
function setQuality(q, lock = true) {
  quality = q;
  if (lock) { qualityLocked = true; try { localStorage.setItem(QKEY, q); } catch (e) { /* yok say */ } }
  applyQuality();
}

const room = buildRoom(scene);
const pc = buildCase();
scene.add(pc.group);
const shelfBoxes = buildShelf(scene, PARTS);
const monitor = buildMonitor(scene);
let cables = null;

// ---------- Oyun durumu ----------
const SAVE_KEY = 'bilgisayarci-sim-v1';
const state = {
  money: 15000, day: 1, rep: 3, jobNo: 0, jobsToday: 0,
  job: null,
  slots: { cpu: [null], ram: [null, null], gpu: [null], psu: [null], ssd: [null] },
  tray: new Array(TRAY_SLOTS.length).fill(null),
  powered: false, bootOk: false, booting: false, leaving: false,
  leds: { cpu: 'off', dram: 'off', vga: 'off', boot: 'off' },
  q: '', qmsg: 'Kapalı',
  screen: 'off', tab: 'cpu', muted: false, extraCost: 0, cpuTemp: 0,
};
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
  if (s) Object.assign(state, { money: s.money, day: s.day, rep: s.rep, jobNo: s.jobNo, jobsToday: s.jobsToday || 0 });
} catch (e) { /* kayıt yok */ }
const hot = window.claude?.hot;
if (hot?.data?.money != null) Object.assign(state, hot.data);
hot?.snapshot?.(() => ({ money: state.money, day: state.day, rep: state.rep, jobNo: state.jobNo, jobsToday: state.jobsToday }));

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ money: state.money, day: state.day, rep: state.rep, jobNo: state.jobNo, jobsToday: state.jobsToday })); } catch (e) { /* yok say */ }
}

// ---------- Animasyon ----------
const tweens = [];
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function tween(obj, to, { quat = new THREE.Quaternion(), dur = 0.65, arc = 0.14, onDone } = {}) {
  for (let i = tweens.length - 1; i >= 0; i--) if (tweens[i].obj === obj) tweens.splice(i, 1);
  tweens.push({ obj, p0: obj.position.clone(), q0: obj.quaternion.clone(), p1: to.clone(), q1: quat.clone(), t: 0, dur, arc, onDone });
}
function stepTweens(dt) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    tw.t = Math.min(1, tw.t + dt / tw.dur);
    const e = ease(tw.t);
    tw.obj.position.lerpVectors(tw.p0, tw.p1, e);
    tw.obj.position.y += Math.sin(Math.PI * e) * tw.arc;
    tw.obj.quaternion.slerpQuaternions(tw.q0, tw.q1, e);
    if (tw.t >= 1) { tweens.splice(i, 1); tw.onDone?.(); }
  }
}
let camTween = null;
function goView(name) {
  const v = VIEWS[name];
  camTween = { p0: camera.position.clone(), t0: controls.target.clone(), p1: v.pos.clone(), t1: v.target.clone(), t: 0 };
}

// ---------- Parça örnekleri ----------
// inst: { def, obj, owner: 'shop' | 'customer', faulty, paste, where, settled, cat, idx }
function makeInst(def, owner, faulty = false) {
  const obj = buildPart(def);
  const inst = { def, obj, owner, faulty, paste: 'ok', where: 'gone', settled: false, cat: def.cat, idx: -1 };
  obj.userData.click = { kind: 'inst', inst };
  scene.add(obj);
  return inst;
}
function destroyInst(inst) {
  inst.where = 'gone';
  scene.remove(inst.obj);
  disposeTree(inst.obj);
}
function shelfPos(def) {
  const p = new THREE.Vector3();
  shelfBoxes[def.id].getWorldPosition(p);
  return p;
}
const tilt = () => new THREE.Quaternion().setFromEuler(new THREE.Euler((Math.random() - 0.5) * 0.6, Math.random() * 1.2, (Math.random() - 0.5) * 0.6));

function compatError(def) {
  const bd = state.job.board;
  if (def.cat === 'cpu' && def.socket !== bd.socket) return `${def.name} ${def.socket} soketli, anakart ise ${bd.socket}. Bu işlemci o sokete oturmaz.`;
  if (def.cat === 'ram' && def.type !== bd.ram) return `${def.type} bellek ${bd.ram} yuvaya girmez. Çentikleri farklı yerde.`;
  return null;
}

function freeIdx(cat) {
  const i = state.slots[cat].findIndex(x => !x);
  return i === -1 ? 0 : i;
}

function placeInSlot(inst, from) {
  if (!state.job || state.leaving) return;
  const cat = inst.cat;
  const err = compatError(inst.def);
  const idx = freeIdx(cat);
  const target = slotWorld(cat, idx);
  if (from) inst.obj.position.copy(from);
  if (err) {
    sfx.pick();
    tween(inst.obj, target.clone().add(new THREE.Vector3(0, 0.07, 0.02)), {
      dur: 0.55,
      onDone: () => {
        sfx.error();
        log(err, 'bad', 'UYUMSUZ');
        const back = inst.owner === 'shop' ? shelfPos(inst.def) : trayPos(inst);
        tween(inst.obj, back, {
          quat: tilt(), dur: 0.6, onDone: () => { if (inst.owner === 'shop') destroyInst(inst); else inst.where = 'tray'; },
        });
      },
    });
    return;
  }
  const prev = state.slots[cat][idx];
  if (prev) evict(prev);
  if (inst.where === 'tray') state.tray[inst.idx] = null;
  state.slots[cat][idx] = inst;
  inst.where = 'slot';
  inst.settled = false;
  inst.idx = idx;
  sfx.pick();
  tween(inst.obj, target, { dur: 0.7, arc: 0.16, onDone: () => { sfx.snap(); inst.settled = true; rebuildCables(); } });
  cutPower();
  refresh();
}

function trayPos(inst) {
  let i = inst.where === 'tray' ? inst.idx : state.tray.findIndex(x => !x);
  if (i === -1) i = 0;
  inst.idx = i;
  state.tray[i] = inst;
  return TRAY_SLOTS[i].clone();
}

function evict(inst) {
  state.slots[inst.cat][inst.idx] = null;
  inst.settled = false;
  if (inst.owner === 'shop') {
    inst.where = 'gone';
    tween(inst.obj, shelfPos(inst.def), { quat: tilt(), dur: 0.6, onDone: () => destroyInst(inst) });
  } else {
    inst.where = 'tray';
    tween(inst.obj, trayPos(inst), { dur: 0.6, arc: 0.12 });
  }
  rebuildCables();
}

function removeFromSlot(inst) {
  sfx.click();
  evict(inst);
  cutPower();
  refresh();
}

function installFromShelf(def) {
  if (!state.job || state.leaving) return;
  initAudio();
  const inst = makeInst(def, 'shop');
  inst.obj.quaternion.copy(tilt());
  placeInSlot(inst, shelfPos(def));
}

function useSupply(sup) {
  if (!state.job || state.leaving) return;
  initAudio();
  const cpu = state.slots.cpu[0];
  if (!cpu) { sfx.error(); log('Macunu sürecek işlemci yok. Önce bir işlemci tak.', 'bad', 'SARF'); return; }
  cpu.paste = 'ok';
  state.extraCost += sup.price;
  sfx.squeeze();
  cutPower(true);
  log(`${cpu.def.name} temizlendi, yeni termal macun sürüldü. (−${fmt(sup.price)})`, 'good', 'SARF');
  refresh();
}

function clearBench() {
  for (const cat in state.slots) state.slots[cat].forEach(i => i && destroyInst(i));
  for (const cat in state.slots) state.slots[cat] = state.slots[cat].map(() => null);
  state.tray.forEach(i => i && destroyInst(i));
  state.tray.fill(null);
  tweens.length = 0;
}

function rebuildCables() {
  if (cables) { scene.remove(cables); disposeTree(cables); }
  const ok = cat => { const i = state.slots[cat][0]; return i && i.settled ? i.def : null; };
  cables = buildCables({ psu: ok('psu'), gpu: ok('gpu') });
  scene.add(cables);
}

const installedSet = () => ({
  cpu: state.slots.cpu[0]?.def || null,
  ram: state.slots.ram.map(i => i?.def || null),
  gpu: state.slots.gpu[0]?.def || null,
  psu: state.slots.psu[0]?.def || null,
  ssd: state.slots.ssd[0]?.def || null,
});
const allInstalled = () => Object.values(state.slots).flat().filter(Boolean);
const partsCost = () => allInstalled().filter(i => i.owner === 'shop').reduce((s, i) => s + i.def.price, 0) + state.extraCost;

// ---------- Güç ve açılış testi ----------
let bootToken = 0;
const rotorsOn = { target: 0, speed: 0 };
const QMSG = {
  19: 'İşlemci başlatılıyor', 34: 'Bellek test ediliyor', 92: 'Grafik aranıyor', a2: 'Diskler taranıyor', a0: 'İşletim sistemi çalışıyor',
};

function setQ(code, msg) {
  state.q = code;
  state.qmsg = msg ?? QMSG[code] ?? '';
  pc.setQ(code);
}
function ledsOff() { for (const k in state.leds) state.leds[k] = 'off'; }

function cutPower(silent = false) {
  bootToken++;
  const was = state.powered;
  state.powered = false;
  state.bootOk = false;
  state.booting = false;
  state.cpuTemp = 0;
  rotorsOn.target = 0;
  ledsOff();
  setQ('', 'Kapalı');
  setScreen('off');
  setFan(false);
  if (was && !silent) sfx.powerDown();
  refresh();
}

async function powerOn() {
  if (!state.job || state.leaving) return;
  initAudio();
  if (state.powered || state.booting) { cutPower(); return; }
  const tok = ++bootToken;
  const alive = () => tok === bootToken;
  const set = installedSet();
  const st = computeStats(set);
  const faulty = cat => allInstalled().some(i => i.cat === cat && i.faulty);
  sfx.relay();
  state.booting = true;
  refresh();

  if (!set.psu || faulty('psu')) {
    await sleep(500);
    if (!alive()) return;
    state.booting = false;
    setQ('', 'Güç yok');
    log(!set.psu ? 'Hiçbir şey olmadı. Güç kaynağı takılı değil.' : 'Fan yok, ışık yok, POST kartı bile yanmıyor. Güç kaynağı tepki vermiyor.', 'bad', 'GÜÇ');
    sfx.error();
    refresh();
    return;
  }

  state.powered = true;
  rotorsOn.target = 1;
  setFan(true);
  setFanPitch(1);
  setScreen('nosignal');
  refresh();

  const stage = async (led, code, ms) => { state.leds[led] = 'on'; setQ(code); refresh(); await sleep(ms); return alive(); };
  const fail = (led, code, qmsg, msg) => {
    state.leds[led] = 'fail';
    state.booting = false;
    setQ(code, qmsg);
    log(msg, 'bad', 'POST');
    refresh();
  };

  if (!(await stage('cpu', '19', 900))) return;
  if (!set.cpu || faulty('cpu')) return fail('cpu', '00', 'İşlemci yok ya da arızalı', set.cpu ? 'CPU ışığı yanık kaldı, kod 00. İşlemcide sorun var.' : 'CPU ışığı yanık kaldı, kod 00. İşlemci takılı değil.');
  state.leds.cpu = 'off';

  if (!(await stage('dram', '34', 900))) return;
  if (!set.ram.some(Boolean) || faulty('ram')) {
    for (let i = 0; i < 3; i++) sfx.beep(0.55, i * 0.8);
    return fail('dram', '55', 'Bellek bulunamadı ya da arızalı', set.ram.some(Boolean) ? 'Üç uzun bip, kod 55. Bellek modüllerinden biri arızalı. Tek tek çıkarıp dene.' : 'Üç uzun bip, kod 55. Hiç RAM takılı değil.');
  }
  state.leds.dram = 'off';

  if (!(await stage('vga', '92', 900))) return;
  if (!st.display || faulty('gpu')) {
    sfx.beep(0.6); sfx.beep(0.15, 0.8); sfx.beep(0.15, 1.05);
    const why = faulty('gpu') ? 'Ekran kartı görüntü vermiyor, kart arızalı olabilir.' : 'İşlemcinin dahili grafiği yok ve ekran kartı takılı değil.';
    return fail('vga', 'd6', 'Görüntü cihazı yok', `Bir uzun iki kısa bip, kod d6. ${why}`);
  }
  state.leds.vga = 'off';
  sfx.beep(0.12);
  setScreen('post');

  if (!(await stage('boot', 'a2', 1300))) return;
  if (!set.ssd || faulty('ssd')) {
    setScreen('noboot');
    return fail('boot', 'a2', 'Önyükleme diski yok', set.ssd ? 'Kod A2\'de takıldı. BIOS diski göremiyor, SSD arızalı görünüyor.' : 'Kod A2\'de takıldı. Önyüklenebilir disk yok, bir SSD tak.');
  }
  state.leds.boot = 'off';
  setQ('a0');
  setScreen('loading');
  refresh();
  await sleep(2200);
  if (!alive()) return;

  const shutdown = (msg) => {
    sfx.powerDown();
    setFan(false);
    state.powered = false;
    state.booting = false;
    rotorsOn.target = 0;
    setQ('', 'Kapandı');
    setScreen('off');
    log(msg, 'bad', 'GÜÇ');
    refresh();
  };

  if (st.power > set.psu.cap) {
    return shutdown(`Yük altında kapandı! Sistem ${st.power} W çekiyor, güç kaynağı ${set.psu.cap} W.`);
  }

  setScreen('desktop');
  const dry = state.slots.cpu[0]?.paste === 'dry';
  state.cpuTemp = 38;
  if (dry) {
    // Kurumuş macun: sıcaklık hızla tırmanır, fanlar bağırır, sistem kendini korur.
    for (let i = 0; i < 14; i++) {
      await sleep(260);
      if (!alive()) return;
      state.cpuTemp = Math.min(100, Math.round(state.cpuTemp + 4.5 + Math.random() * 2));
      setFanPitch(1 + (state.cpuTemp - 38) / 30);
      rotorsOn.target = 1 + (state.cpuTemp - 38) / 40;
      if (state.cpuTemp > 85 && i % 2) sfx.hot();
      drawScreen();
    }
    return shutdown(`İşlemci ${state.cpuTemp}°C'yi gördü, sistem kendini korumak için kapandı. Termal macun kurumuş olabilir.`);
  }
  state.cpuTemp = 41;
  drawScreen();
  sfx.chime();
  state.booting = false;
  state.bootOk = true;
  log('Sistem sorunsuz açıldı. Teslime hazır.', 'good', 'POST');
  refresh();
}

// ---------- İşler ----------
function requirements() {
  const job = state.job;
  const st = computeStats(installedSet());
  if (job.type === 'repair') return [{ label: 'Bilgisayar sorunsuz açılmalı', ok: state.bootOk }];
  return [
    { label: `En az ${job.reqs.ram} GB RAM`, value: `${st.ramGB} GB`, ok: st.ramGB >= job.reqs.ram },
    ...(job.reqs.score ? [{ label: `Oyun puanı en az ${job.reqs.score}`, value: `${st.score}`, ok: st.score >= job.reqs.score }] : []),
    { label: `En az ${fmtGB(job.reqs.storage)} depolama`, value: st.storage ? fmtGB(st.storage) : '—', ok: st.storage >= job.reqs.storage },
    { label: 'Sorunsuz açılmalı', ok: state.bootOk },
  ];
}

function payout() {
  const job = state.job;
  const cost = partsCost();
  if (job.type === 'build') return { pay: job.budget, cost };
  return { pay: job.fee + Math.min(cost, job.allowance), cost };
}

function startJob() {
  state.leaving = false;
  state.extraCost = 0;
  state.jobNo += 1;
  const job = makeJob(state.jobNo);
  state.job = job;
  clearBench();
  cutPower(true);
  pc.setBoard(job.board);
  if (job.type === 'repair') {
    const p = job.parts;
    const add = (def, cat, idx, faultyKey) => {
      if (!def) return;
      const inst = makeInst(def, 'customer', job.faulty === faultyKey);
      inst.where = 'slot'; inst.idx = idx; inst.settled = true;
      if (cat === 'cpu') inst.paste = job.paste || 'ok';
      inst.obj.position.copy(slotWorld(cat, idx));
      state.slots[cat][idx] = inst;
    };
    add(p.cpu, 'cpu', 0, 'cpu');
    add(p.ram[0], 'ram', 0, 'ram0');
    add(p.ram[1], 'ram', 1, 'ram1');
    add(p.gpu, 'gpu', 0, 'gpu');
    add(p.psu, 'psu', 0, 'psu');
    add(p.ssd, 'ssd', 0, 'ssd');
  }
  rebuildCables();
  setQ('', 'Kapalı');
  $('#stamp').hidden = true;
  sfx.doorbell();
  save();
  refresh(true);
}

function deliver() {
  if (!state.bootOk || state.leaving) return;
  const job = state.job;
  const met = requirements().every(r => r.ok);
  const { pay, cost } = payout();
  let gain = pay;
  let msg;
  if (job.type === 'build' && !met) {
    gain = Math.round(pay * 0.5);
    state.rep = Math.max(0, state.rep - 0.5);
    msg = `${job.customer}: "Bu benim istediğim değil ama idare ederim." Yarı parayı ödedi.`;
  } else {
    const bonus = job.type === 'build' && cost < job.cheapest * 1.05 ? 0.3 : 0.2;
    state.rep = Math.min(5, state.rep + bonus);
    msg = `${job.customer} memnun ayrıldı.`;
  }
  const profit = gain - cost;
  state.money += profit;
  sfx.stamp();
  setTimeout(() => sfx.cash(), 250);
  const st = $('#stamp');
  st.querySelector('b').textContent = met || job.type === 'repair' ? 'TESLİM EDİLDİ' : 'YARIM ÖDEME';
  st.querySelector('span').textContent = `${profit >= 0 ? '+' : ''}${fmt(profit)}`;
  st.hidden = false;
  log(`${msg} Kâr: ${profit >= 0 ? '+' : ''}${fmt(profit)}`, profit >= 0 ? 'good' : 'bad', 'KASA');
  nextCustomer(1900);
}

function reject() {
  if (state.leaving || !state.job) return;
  state.rep = Math.max(0, state.rep - 0.2);
  log(`${state.job.customer} başka dükkana gitti. İtibar biraz düştü.`, 'bad', 'MÜŞTERİ');
  nextCustomer(900);
}

function nextCustomer(wait) {
  state.leaving = true;
  cutPower(true);
  state.jobsToday += 1;
  if (state.jobsToday >= 3) {
    state.jobsToday = 0;
    state.day += 1;
    state.money -= 1500;
    setTimeout(() => log(`Gün ${state.day} başladı. Dükkan kirası ödendi: −${fmt(1500)}`, 'info', 'KİRA'), wait);
  }
  save();
  refresh();
  setTimeout(startJob, wait);
}

// ---------- Monitör ----------
let screenT = 0;
function setScreen(mode) {
  state.screen = mode;
  drawScreen();
}

function drawScreen() {
  const { ctx: c, canvas: cv, tex } = monitor;
  const W = cv.width, H = cv.height;
  const mode = state.screen;
  const set = installedSet();
  const st = computeStats(set);
  c.save();
  c.fillStyle = '#060708'; c.fillRect(0, 0, W, H);
  if (mode === 'off') {
    const gr = c.createLinearGradient(0, 0, W, H);
    gr.addColorStop(0, 'rgba(255,255,255,0.05)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)');
    c.fillStyle = gr; c.fillRect(0, 0, W, H);
  } else if (mode === 'nosignal') {
    c.fillStyle = '#16233d'; c.fillRect(W / 2 - 170, H / 2 - 50, 340, 100);
    c.strokeStyle = '#4f7ad1'; c.lineWidth = 3; c.strokeRect(W / 2 - 170, H / 2 - 50, 340, 100);
    c.fillStyle = '#e8eefc'; c.font = '600 34px "IBM Plex Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('Sinyal yok', W / 2, H / 2 - 10);
    c.font = '400 20px "IBM Plex Mono", monospace'; c.fillText('HDMI 1', W / 2, H / 2 + 24);
  } else if (mode === 'post' || mode === 'noboot') {
    c.fillStyle = '#d7dbe0'; c.font = '500 22px "IBM Plex Mono", monospace'; c.textBaseline = 'top';
    const bd = state.job.board;
    [
      'ÇİP BIOS v2.14  (C) Çip Bilgisayar',
      '',
      `Anakart  : ${bd.name}`,
      `İşlemci  : ${set.cpu?.name ?? '-'}`,
      `Bellek   : ${st.ramGB} GB ${bd.ram}  ... OK`,
      `Grafik   : ${set.gpu?.name ?? 'Dahili grafik'}`,
      `Depolama : ${set.ssd ? set.ssd.name : 'bulunamadı'}`,
    ].forEach((l, i) => c.fillText(l, 28, 26 + i * 32));
    if (mode === 'noboot') {
      c.fillStyle = '#ff6b5e';
      c.fillText('Önyüklenebilir cihaz bulunamadı.', 28, 300);
      c.fillStyle = '#d7dbe0';
      c.fillText('Bir disk takın ve bir tuşa basın_', 28, 334);
    } else c.fillText('Sistem başlatılıyor...', 28, 320);
  } else if (mode === 'loading') {
    c.fillStyle = '#0d1b2e'; c.fillRect(0, 0, W, H);
    drawTulip(c, W / 2, H / 2 - 40, 1.2);
    c.fillStyle = '#e9eef6'; c.font = '700 34px "Barlow Condensed", sans-serif'; c.textAlign = 'center';
    c.fillText('Lale OS', W / 2, H / 2 + 50);
    for (let i = 0; i < 6; i++) {
      const a = screenT * 5 + i * 0.5;
      c.globalAlpha = 0.25 + 0.75 * ((i + 1) / 6);
      c.beginPath(); c.arc(W / 2 + Math.cos(a) * 22, H / 2 + 110 + Math.sin(a) * 22, 4, 0, Math.PI * 2);
      c.fillStyle = '#e9eef6'; c.fill();
    }
    c.globalAlpha = 1;
  } else if (mode === 'desktop') {
    const gr = c.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#2b2350'); gr.addColorStop(0.55, '#c0566b'); gr.addColorStop(1, '#f2a65a');
    c.fillStyle = gr; c.fillRect(0, 0, W, H);
    c.fillStyle = '#1c1830';
    c.fillRect(0, H - 120, W, 120);
    const dome = (x, r) => { c.beginPath(); c.arc(x, H - 120, r, Math.PI, 0); c.fill(); };
    dome(250, 70); dome(170, 38); dome(330, 38); dome(560, 50);
    for (const x of [90, 410, 650, 720]) { c.fillRect(x, H - 250, 10, 130); c.beginPath(); c.moveTo(x - 2, H - 250); c.lineTo(x + 5, H - 290); c.lineTo(x + 12, H - 250); c.fill(); }
    c.fillStyle = 'rgba(245,246,250,0.94)'; c.fillRect(420, 50, 330, 250);
    c.fillStyle = '#e39b3a'; c.fillRect(420, 50, 330, 34);
    c.fillStyle = '#1b1d22'; c.font = '600 18px "IBM Plex Sans", sans-serif'; c.textBaseline = 'middle';
    c.fillText('Sistem Bilgisi', 434, 67);
    c.font = '500 16px "IBM Plex Mono", monospace';
    [
      `İşlemci : ${set.cpu?.name}`,
      `Bellek  : ${st.ramGB} GB`,
      `Grafik  : ${set.gpu ? set.gpu.name.replace('Prizma ', '') : 'Dahili'}`,
      `Disk    : ${fmtGB(st.storage)}`,
      `Güç     : ${st.power} W / ${set.psu?.cap} W`,
      `Oyun puanı: ${st.score}`,
    ].forEach((l, i) => c.fillText(l, 434, 106 + i * 26));
    const t = state.cpuTemp;
    const tc = t > 85 ? '#d9473d' : t > 65 ? '#d98a1c' : '#2f9e64';
    c.fillStyle = tc;
    c.font = '700 22px "IBM Plex Mono", monospace';
    c.fillText(`CPU ${t}°C`, 434, 272);
    c.fillStyle = '#d9d9d9'; c.fillRect(560, 264, 170, 14);
    c.fillStyle = tc;
    c.fillRect(560, 264, 170 * Math.min(1, t / 100), 14);
    c.fillStyle = 'rgba(15,18,26,0.85)'; c.fillRect(0, H - 34, W, 34);
    drawTulip(c, 22, H - 17, 0.22);
    c.fillStyle = '#e9eef6'; c.textAlign = 'right'; c.font = '500 16px "IBM Plex Mono", monospace';
    const now = new Date();
    c.fillText(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`, W - 14, H - 17);
  }
  c.restore();
  tex.needsUpdate = true;
}

function drawTulip(c, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = '#e8584a';
  c.beginPath(); c.ellipse(0, -10, 22, 40, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#ff7b62';
  c.beginPath(); c.ellipse(-20, 0, 16, 34, -0.45, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(20, 0, 16, 34, 0.45, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#4caf6a'; c.fillRect(-3, 28, 6, 40);
  c.restore();
}

// ---------- Arayüz ----------
function log(text, kind = 'info', tag = 'BİLGİ') {
  const el = document.createElement('div');
  el.className = `log ${kind}`;
  el.innerHTML = '<span class="log-tag"></span><span class="log-text"></span>';
  el.querySelector('.log-tag').textContent = tag;
  el.querySelector('.log-text').textContent = text;
  $('#log').prepend(el);
  while ($('#log').children.length > 3) $('#log').lastChild.remove();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 5200);
}

const stars = r => {
  const full = Math.round(r * 2) / 2;
  let s = '';
  for (let i = 1; i <= 5; i++) s += full >= i ? '★' : full >= i - 0.5 ? '⯪' : '☆';
  return s;
};

let thumbs = {};
const TABS = [...CATS, { id: 'sup', label: 'Sarf' }];

function renderCatalog() {
  const tabs = $('#tabs');
  tabs.innerHTML = '';
  for (const c of TABS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.className = 'tab';
    const n = c.id === 'sup' ? SUPPLIES.length : PARTS.filter(p => p.cat === c.id).length;
    b.innerHTML = '<span></span><small></small>';
    b.querySelector('span').textContent = c.label;
    b.querySelector('small').textContent = n;
    b.setAttribute('aria-selected', String(state.tab === c.id));
    b.onclick = () => { state.tab = c.id; renderCatalog(); };
    tabs.append(b);
  }
  const cards = $('#cards');
  const scroll = cards.scrollLeft;
  cards.innerHTML = '';
  const list = state.tab === 'sup' ? SUPPLIES : PARTS.filter(x => x.cat === state.tab);
  for (const p of list) {
    const n = p.cat === 'sup' ? 0 : state.slots[p.cat].filter(i => i && i.def.id === p.id).length;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'card' + (n ? ' on' : '');
    const watt = p.cat === 'psu' ? `${p.cap} W kapasite` : p.watt ? `${p.watt} W çeker` : p.cat === 'sup' ? 'işlemciye uygulanır' : '';
    b.innerHTML = `<span class="thumb"><img alt=""></span><span class="c-body"><span class="c-name"></span><span class="c-spec"></span><span class="c-watt"></span></span><span class="c-tag"></span>${n ? `<span class="c-on">Takılı${n > 1 ? ' ×' + n : ''}</span>` : ''}`;
    const img = b.querySelector('img');
    if (thumbs[p.id]) img.src = thumbs[p.id]; else img.remove();
    b.querySelector('.c-name').textContent = p.name;
    b.querySelector('.c-spec').textContent = p.spec;
    b.querySelector('.c-watt').textContent = watt;
    b.querySelector('.c-tag').textContent = fmt(p.price);
    b.onclick = () => (p.cat === 'sup' ? useSupply(p) : installFromShelf(p));
    cards.append(b);
  }
  cards.scrollLeft = scroll;
}

function renderTicket() {
  const job = state.job;
  if (!job) return;
  $('#t-no').textContent = `No ${String(job.no).padStart(4, '0')}`;
  $('#t-date').textContent = `Gün ${state.day}`;
  $('#t-name').textContent = job.customer;
  $('#t-type').textContent = job.title;
  $('#t-quote').textContent = `“${job.quote}”`;
  $('#t-board').textContent = job.board.name;
  $('#t-socket').textContent = job.board.socket;
  $('#t-ramtype').textContent = job.board.ram;

  const ul = $('#t-reqs');
  ul.innerHTML = '';
  for (const r of requirements()) {
    const li = document.createElement('li');
    li.className = r.ok ? 'ok' : 'no';
    li.innerHTML = '<span class="mark"></span><span class="lbl"></span><span class="val"></span>';
    li.querySelector('.mark').textContent = r.ok ? '✓' : '☐';
    li.querySelector('.lbl').textContent = r.label;
    li.querySelector('.val').textContent = r.value ?? '';
    ul.append(li);
  }

  const set = installedSet();
  const st = computeStats(set);
  const rows = $('#t-parts');
  rows.innerHTML = '';
  const line = (k, inst) => {
    const d = document.createElement('div');
    d.innerHTML = '<dt></dt><dd></dd>';
    d.querySelector('dt').textContent = k;
    const dd = d.querySelector('dd');
    dd.textContent = inst ? inst.def.name : '—';
    if (inst?.owner === 'customer') {
      const m = document.createElement('abbr');
      m.title = 'Müşterinin parçası';
      m.textContent = 'M';
      dd.append(' ', m);
    }
    if (!inst) d.classList.add('empty');
    rows.append(d);
  };
  line('İşlemci', state.slots.cpu[0]);
  line('RAM 1', state.slots.ram[0]);
  line('RAM 2', state.slots.ram[1]);
  line('Ekran k.', state.slots.gpu[0]);
  line('Güç k.', state.slots.psu[0]);
  line('Depolama', state.slots.ssd[0]);

  const pw = $('#t-power');
  pw.textContent = set.psu ? `${st.power}/${set.psu.cap} W` : `${st.power} W`;
  pw.className = set.psu && st.power > set.psu.cap ? 'bad' : '';
  $('#t-score').textContent = st.score;
  $('#t-ram').textContent = `${st.ramGB} GB`;

  const { pay, cost } = payout();
  const m = $('#t-money');
  m.innerHTML = '';
  const mrow = (k, v, cls = '') => {
    const d = document.createElement('div');
    d.className = cls;
    d.innerHTML = '<dt></dt><dd></dd>';
    d.querySelector('dt').textContent = k; d.querySelector('dd').textContent = v;
    m.append(d);
  };
  if (job.type === 'build') mrow('Müşteri bütçesi', fmt(job.budget));
  else { mrow('İşçilik', fmt(job.fee)); mrow('Parçaya en fazla', fmt(job.allowance)); }
  mrow('Parça + sarf', `−${fmt(cost)}`);
  const profit = pay - cost;
  mrow('Kâr', `${profit >= 0 ? '+' : ''}${fmt(profit)}`, 'total ' + (profit >= 0 ? 'pos' : 'neg'));

  const pb = $('#btn-power');
  pb.classList.toggle('live', state.powered);
  pb.classList.toggle('busy', state.booting);
  pb.setAttribute('aria-pressed', String(state.powered || state.booting));
  $('#btn-deliver').disabled = !state.bootOk || !!state.leaving;
}

function renderPost() {
  for (const k of ['cpu', 'dram', 'vga', 'boot']) document.querySelector(`.led[data-led="${k}"]`).dataset.state = state.leds[k];
  const cv = $('#qcode');
  const c = cv.getContext('2d');
  c.fillStyle = '#0a0302'; c.fillRect(0, 0, cv.width, cv.height);
  drawSeg(c, state.q || '  ', 14, 10, cv.height - 20, '#ff3b22', '#2a0b07');
  $('#qmsg').textContent = state.qmsg;
}

function renderHud() {
  const mEl = $('#money');
  mEl.textContent = fmt(state.money);
  mEl.classList.toggle('neg', state.money < 0);
  $('#day').textContent = String(state.day).padStart(2, '0');
  $('#rep').textContent = stars(state.rep);
  $('#rep').title = `${state.rep.toFixed(1)} / 5`;
}

function refresh(newJob = false) {
  renderHud();
  renderTicket();
  renderCatalog();
  renderPost();
  if (pc.leds) {
    const col = { cpu: 0xff2a2a, dram: 0xffb020, vga: 0xf4f4f4, boot: 0x3cff6e };
    for (const k in pc.leds) pc.leds[k].material.emissive.setHex(state.leds[k] === 'off' ? 0x000000 : col[k]);
  }
  monitor.powerLed.material.emissive.setHex(state.powered ? (state.screen === 'nosignal' || state.screen === 'off' ? 0xffa020 : 0x4fa3ff) : 0x000000);
  if (newJob) {
    $('#ticket').classList.remove('fresh');
    void $('#ticket').offsetWidth;
    $('#ticket').classList.add('fresh');
  }
}

// ---------- Fare / dokunma ----------
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let hovered = null;
let downAt = null;

function pickAt(ev) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(scene.children, true);
  for (const h of hits) {
    if (h.object.isPoints || h.object.isSprite) continue;
    let o = h.object;
    while (o && !o.userData.click) o = o.parent;
    if (o) return o;
    if (h.object.material && !h.object.material.transparent) return null;
  }
  return null;
}

function setHover(o) {
  if (hovered === o) return;
  if (hovered) highlight(hovered, false);
  hovered = o;
  if (o) highlight(o, true);
  canvas.style.cursor = o ? 'pointer' : 'grab';
}

function highlight(o, on) {
  o.traverse(n => {
    if (!n.isMesh) return;
    const ms = Array.isArray(n.material) ? n.material : [n.material];
    for (const m of ms) {
      if (!m.emissive || m.userData.rgb) continue;
      if (on) { m.userData.e0 = m.emissive.getHex(); m.emissive.setHex(0x3a2a10); }
      else if (m.userData.e0 !== undefined) m.emissive.setHex(m.userData.e0);
    }
  });
}

function tipFor(o) {
  const c = o.userData.click;
  if (c.kind === 'shelf') return `${c.def.name} · ${fmt(c.def.price)}\nTakmak için tıkla`;
  const i = c.inst;
  if (i.where === 'tray') return `${i.def.name} (müşterinin)\nGeri takmak için tıkla`;
  return `${i.def.name}${i.owner === 'customer' ? ' (müşterinin)' : ''}\nÇıkarmak için tıkla`;
}

canvas.addEventListener('pointermove', ev => {
  if (ev.pointerType !== 'mouse') return;
  const o = pickAt(ev);
  setHover(o);
  const tip = $('#tip');
  if (o && !downAt) {
    tip.hidden = false;
    tip.textContent = tipFor(o);
    tip.style.left = `${ev.clientX + 14}px`;
    tip.style.top = `${ev.clientY + 14}px`;
  } else tip.hidden = true;
});
canvas.addEventListener('pointerleave', () => { setHover(null); $('#tip').hidden = true; });
canvas.addEventListener('pointerdown', ev => { downAt = { x: ev.clientX, y: ev.clientY }; });
canvas.addEventListener('pointerup', ev => {
  const d = downAt;
  downAt = null;
  if (!d || Math.hypot(ev.clientX - d.x, ev.clientY - d.y) > 6) return;
  const o = pickAt(ev);
  if (!o) return;
  const c = o.userData.click;
  if (c.kind === 'shelf') { state.tab = c.def.cat; installFromShelf(c.def); return; }
  const inst = c.inst;
  if (inst.where === 'slot') removeFromSlot(inst);
  else if (inst.where === 'tray') { initAudio(); placeInSlot(inst); }
});

function toggleMute() {
  state.muted = !state.muted;
  setMuted(state.muted);
  $('#mute').setAttribute('aria-pressed', String(state.muted));
  $('#mute .kc-label').textContent = state.muted ? 'Sessiz' : 'Ses';
}

$('#btn-power').onclick = powerOn;
$('#btn-deliver').onclick = deliver;
$('#btn-skip').onclick = reject;
document.querySelectorAll('[data-view]').forEach(b => { b.onclick = () => goView(b.dataset.view); });
$('#mute').onclick = toggleMute;
$('#quality').onclick = () => setQuality(quality === 'high' ? 'low' : 'high');
$('#ticket-toggle').onclick = () => {
  const open = $('#ticket').classList.toggle('open');
  $('#ticket-toggle').setAttribute('aria-expanded', String(open));
};
window.addEventListener('keydown', ev => {
  if (!$('#intro').hidden || ev.repeat) return;
  if (ev.key === '1') goView('bench');
  else if (ev.key === '2') goView('close');
  else if (ev.key === '3') goView('shelf');
  else if (ev.key.toLowerCase() === 'm') toggleMute();
  else if (ev.key.toLowerCase() === 'g') powerOn();
  else if (ev.key.toLowerCase() === 'k') setQuality(quality === 'high' ? 'low' : 'high');
});
$('#btn-reset').onclick = () => {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* yok say */ }
  Object.assign(state, { money: 15000, day: 1, rep: 3, jobNo: 0, jobsToday: 0 });
  $('#continue-note').hidden = true;
  renderHud();
};

if (state.jobNo > 0) {
  $('#continue-note').hidden = false;
  $('#continue-note').querySelector('b').textContent = `Gün ${state.day} · ${fmt(state.money)}`;
}

$('#start').onclick = () => {
  initAudio();
  sfx.shutter();
  $('#intro').classList.add('up');
  setTimeout(() => { $('#intro').hidden = true; }, 1300);
  if (state.jobNo > 0) state.jobNo -= 1; // yarım kalan işi baştan ver
  setTimeout(() => {
    startJob();
    if (state.jobNo === 1) setTimeout(() => log('Servis fişindeki anakartın soketine ve RAM tipine bak. Parçaları alttaki listeden ya da raftan seç.', 'info', 'İPUCU'), 1200);
  }, 700);
};

// ---------- Döngü ----------
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  if (!composer) return;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  bloom.resolution.set(w / 2, h / 2);
  camera.aspect = w / h;
  camera.fov = w / h < 0.8 ? 58 : 42;
  // Sahnenin merkezini paneller arasında kalan boş alana kaydır.
  const narrow = w <= 820;
  camera.setViewOffset(w, h, narrow ? 0 : 190, narrow ? 70 : 50, w, h);
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();
const catEl = document.querySelector('.catalog');
const syncCatH = () => document.documentElement.style.setProperty('--cat-h', `${catEl.offsetHeight}px`);
if ('ResizeObserver' in window) new ResizeObserver(syncCatH).observe(catEl);
syncCatH();

const rgbMats = [];
let lastCount = -1;
function collectRgb() {
  rgbMats.length = 0;
  scene.traverse(n => { if (n.isMesh && n.material?.userData?.rgb) rgbMats.push(n.material); });
}

const clock = new THREE.Clock();
const perf = { frames: 0, time: 0 };
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  screenT += dt;
  stepTweens(dt);
  if (camTween) {
    camTween.t = Math.min(1, camTween.t + dt / 0.9);
    const e = ease(camTween.t);
    camera.position.lerpVectors(camTween.p0, camTween.p1, e);
    controls.target.lerpVectors(camTween.t0, camTween.t1, e);
    if (camTween.t >= 1) camTween = null;
  }
  controls.target.x = THREE.MathUtils.clamp(controls.target.x, -1.2, 1.2);
  controls.target.y = THREE.MathUtils.clamp(controls.target.y, 0.6, 2.0);
  controls.target.z = THREE.MathUtils.clamp(controls.target.z, -0.9, 0.5);
  controls.update();

  rotorsOn.speed += (rotorsOn.target - rotorsOn.speed) * Math.min(1, dt * 2.5);
  const spin = rotorsOn.speed * dt * 40;
  if (spin > 0.0001) {
    pc.rotors.forEach(f => { f.rotor.rotation.y += spin; });
    for (const i of allInstalled()) {
      if (i.faulty && (i.cat === 'gpu' || i.cat === 'psu')) continue;
      for (const f of i.obj.userData.rotors || []) f.rotor.rotation.y += spin * 1.2;
    }
  }
  const count = scene.children.length;
  if (count !== lastCount) { collectRgb(); lastCount = count; }
  const rgbOn = Math.min(1, rotorsOn.speed);
  const hue = (screenT * 0.08) % 1;
  for (const m of rgbMats) {
    m.emissiveIntensity = 0.1 + rgbOn * 1.35;
    if (rgbOn > 0.05 && m.userData.rgb === 0xff4fd8) m.emissive.setHSL(hue, 0.9, 0.55);
  }
  caseGlow.intensity = rgbOn * 0.5;

  const now = new Date();
  room.clockHands.hp.rotation.z = -((now.getHours() % 12) + now.getMinutes() / 60) / 12 * Math.PI * 2;
  room.clockHands.mp.rotation.z = -(now.getMinutes() / 60) * Math.PI * 2;
  room.update(screenT);

  if (state.screen === 'loading') drawScreen();
  if (quality === 'high') composer.render(); else renderer.render(scene, camera);

  // İlk saniyelerde kare hızı düşükse kaliteyi kendiliğinden düşür.
  if (!qualityLocked && quality === 'high' && $('#intro').hidden) {
    perf.frames++;
    perf.time += dt;
    if (perf.time > 4) {
      if (perf.frames / perf.time < 28) {
        setQuality('low', false);
        log('Kare hızı düşük olduğu için grafik kalitesi düşürüldü. K tuşuyla değiştirebilirsin.', 'info', 'GRAFİK');
      }
      qualityLocked = true;
    }
  }
  requestAnimationFrame(loop);
}

applyQuality();
pc.setBoard(BOARDS.am5);
rebuildCables();
drawScreen();
renderHud();
renderPost();
renderCatalog();
loop();
document.body.classList.add('ready');

// Katalog fotoğrafları arka planda hazırlanır.
renderThumbnails([...PARTS, ...SUPPLIES], envFrom).then(t => { thumbs = t; renderCatalog(); }).catch(() => {});

window.__game = { state, installFromShelf, powerOn, deliver, PART, goView, useSupply, setQuality };
