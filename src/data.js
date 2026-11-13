// Parça kataloğu, anakartlar, müşteri işleri ve sistem hesapları.

export const CATS = [
  { id: 'cpu', label: 'İşlemci' },
  { id: 'ram', label: 'RAM' },
  { id: 'gpu', label: 'Ekran Kartı' },
  { id: 'psu', label: 'Güç Kaynağı' },
  { id: 'ssd', label: 'Depolama' },
];

export const BASE_WATT = 45; // anakart + fanlar

export const BOARDS = {
  am5: {
    id: 'am5', name: 'Nova B650M Pro', socket: 'AM5', ram: 'DDR5',
    pcb: 0x1b1e24, accent: 0xa9aeb8, slot: 0x1a1a1d,
    label: 'NOVA B650M PRO  ·  AM5  ·  DDR5',
  },
  lga: {
    id: 'lga', name: 'Atlas B760 Gaming', socket: 'LGA1700', ram: 'DDR4',
    pcb: 0x152238, accent: 0x6f8098, slot: 0x8b9099,
    label: 'ATLAS B760 GAMING  ·  LGA1700  ·  DDR4',
  },
};

export const PARTS = [
  // İşlemciler
  { id: 'cpu-a3', cat: 'cpu', name: 'Atlas i3-12100', socket: 'LGA1700', watt: 60, price: 3900, perf: 35, igpu: true, tier: 0, spec: '4 çekirdek · LGA1700 · dahili grafik' },
  { id: 'cpu-a5', cat: 'cpu', name: 'Atlas i5-13400F', socket: 'LGA1700', watt: 65, price: 6200, perf: 58, igpu: false, tier: 1, spec: '10 çekirdek · LGA1700 · dahili grafik YOK' },
  { id: 'cpu-a7', cat: 'cpu', name: 'Atlas i7-14700K', socket: 'LGA1700', watt: 180, price: 14500, perf: 88, igpu: true, tier: 2, spec: '20 çekirdek · LGA1700 · dahili grafik' },
  { id: 'cpu-n5', cat: 'cpu', name: 'Nova R5 7600', socket: 'AM5', watt: 65, price: 7400, perf: 62, igpu: true, tier: 1, spec: '6 çekirdek · AM5 · dahili grafik' },
  { id: 'cpu-n7', cat: 'cpu', name: 'Nova R7 7800X', socket: 'AM5', watt: 120, price: 15800, perf: 92, igpu: true, tier: 2, spec: '8 çekirdek · AM5 · dahili grafik' },

  // RAM (tek modül fiyatı)
  { id: 'ram-4-8', cat: 'ram', name: 'Kartal 8 GB DDR4', type: 'DDR4', gb: 8, watt: 5, price: 850, color: 0x30343b, rgb: false, spec: '3200 MHz · tek modül' },
  { id: 'ram-4-16', cat: 'ram', name: 'Kartal 16 GB DDR4', type: 'DDR4', gb: 16, watt: 5, price: 1550, color: 0x8c1d22, rgb: false, spec: '3600 MHz · tek modül' },
  { id: 'ram-5-8', cat: 'ram', name: 'Kartal 8 GB DDR5', type: 'DDR5', gb: 8, watt: 5, price: 1250, color: 0x2b2e35, rgb: false, spec: '5600 MHz · tek modül' },
  { id: 'ram-5-16', cat: 'ram', name: 'Kartal 16 GB DDR5', type: 'DDR5', gb: 16, watt: 5, price: 2250, color: 0xd9dce1, rgb: true, spec: '6000 MHz · RGB · tek modül' },
  { id: 'ram-5-32', cat: 'ram', name: 'Kartal 32 GB DDR5', type: 'DDR5', gb: 32, watt: 5, price: 4200, color: 0x1c1e22, rgb: true, spec: '6000 MHz · RGB · tek modül' },

  // Ekran kartları
  { id: 'gpu-1650', cat: 'gpu', name: 'Prizma GT 1650 4 GB', watt: 75, price: 4900, perf: 30, len: 0.17, h: 0.11, thick: 0.035, fans: 1, color: 0x2a2c31, rgb: false, spec: 'Giriş seviyesi · 1080p düşük ayar' },
  { id: 'gpu-3060', cat: 'gpu', name: 'Prizma RX 3060 12 GB', watt: 170, price: 10900, perf: 55, len: 0.24, h: 0.115, thick: 0.04, fans: 2, color: 0x3a3e46, rgb: false, spec: '1080p yüksek ayar' },
  { id: 'gpu-4070', cat: 'gpu', name: 'Prizma RX 4070 12 GB', watt: 220, price: 21500, perf: 78, len: 0.27, h: 0.12, thick: 0.045, fans: 3, color: 0xc9ccd2, rgb: true, spec: '1440p yüksek ayar' },
  { id: 'gpu-4090', cat: 'gpu', name: 'Prizma RX 4090 24 GB', watt: 450, price: 63000, perf: 100, len: 0.31, h: 0.135, thick: 0.06, fans: 3, color: 0x18191c, rgb: true, spec: '4K ultra · çok güç çeker' },

  // Güç kaynakları
  { id: 'psu-350', cat: 'psu', name: 'Volta 350 W', cap: 350, price: 900, color: 0x4a4d52, spec: 'Sertifikasız · ucuz' },
  { id: 'psu-450', cat: 'psu', name: 'Volta 450 W', cap: 450, price: 1450, color: 0x2c2f34, spec: '80+ Standart' },
  { id: 'psu-650', cat: 'psu', name: 'Volta 650 W', cap: 650, price: 2450, color: 0x23262b, spec: '80+ Bronz' },
  { id: 'psu-850', cat: 'psu', name: 'Volta 850 W', cap: 850, price: 3950, color: 0x16181b, spec: '80+ Gold · modüler' },
  { id: 'psu-1000', cat: 'psu', name: 'Volta 1000 W', cap: 1000, price: 5700, color: 0x0f1012, spec: '80+ Gold · modüler' },

  // Depolama
  { id: 'ssd-512', cat: 'ssd', name: 'Hız 512 GB NVMe', gb: 512, watt: 5, price: 1150, spec: 'M.2 · 3.500 MB/s' },
  { id: 'ssd-1t', cat: 'ssd', name: 'Hız 1 TB NVMe', gb: 1024, watt: 5, price: 1950, spec: 'M.2 · 5.000 MB/s' },
  { id: 'ssd-2t', cat: 'ssd', name: 'Hız 2 TB NVMe', gb: 2048, watt: 5, price: 3600, spec: 'M.2 · 7.000 MB/s' },
];

export const PART = Object.fromEntries(PARTS.map(p => [p.id, p]));

export const fmt = n => `${Math.round(n).toLocaleString('tr-TR')} ₺`;
export const fmtGB = gb => (gb >= 1024 ? `${gb / 1024} TB` : `${gb} GB`);

// set: { cpu, ram:[a,b], gpu, psu, ssd } — parça tanımları ya da null
export function computeStats(set) {
  const rams = set.ram.filter(Boolean);
  const ramGB = rams.reduce((s, r) => s + r.gb, 0);
  const power = BASE_WATT + (set.cpu?.watt || 0) + (set.gpu?.watt || 0) + rams.length * 5 + (set.ssd ? 5 : 0);
  let score = 0;
  if (set.cpu) {
    score = set.gpu ? set.gpu.perf * 0.75 + set.cpu.perf * 0.25 : set.cpu.igpu ? set.cpu.perf * 0.15 : 0;
  }
  return {
    ramGB,
    power,
    score: Math.round(score),
    storage: set.ssd?.gb || 0,
    display: set.gpu ? true : !!set.cpu?.igpu,
  };
}

const byCat = cat => PARTS.filter(p => p.cat === cat);

// Bir anakart için gereksinimleri karşılayan en ucuz sistem.
export function cheapestBuild(board, reqs) {
  let best = null;
  const cpus = byCat('cpu').filter(c => c.socket === board.socket);
  const rams = byCat('ram').filter(r => r.type === board.ram);
  const gpus = [null, ...byCat('gpu')];
  const psus = byCat('psu');
  const ssds = byCat('ssd').filter(s => s.gb >= (reqs.storage || 0));
  for (const cpu of cpus) for (const r1 of rams) for (const r2 of [null, ...rams]) for (const gpu of gpus) for (const ssd of ssds) {
    const set = { cpu, ram: [r1, r2], gpu, ssd, psu: null };
    const st = computeStats(set);
    if (!st.display || st.ramGB < reqs.ram || st.score < reqs.score) continue;
    const psu = psus.find(p => p.cap >= st.power);
    if (!psu) continue;
    const cost = cpu.price + r1.price + (r2?.price || 0) + (gpu?.price || 0) + ssd.price + psu.price;
    if (!best || cost < best.cost) best = { cost, set: { ...set, psu } };
  }
  return best;
}

const NAMES = ['Ahmet Abi', 'Ayşe Hanım', 'Mehmet', 'Zeynep', 'Emre', 'Hasan Usta', 'Elif', 'Burak', 'Selin', 'Kemal Bey', 'Deniz', 'Fatma Teyze', 'Can', 'Merve', 'Oğuz', 'Gizem', 'Recep Usta', 'Ece'];

const BUILDS = [
  {
    title: 'Ofis bilgisayarı', reqs: { ram: 8, score: 0, storage: 512 }, margin: [1.25, 1.5],
    lines: ['Dükkan için bir bilgisayar lazım. Fatura keseceğim, e-posta bakacağım, o kadar.', 'Annem için bir bilgisayar istiyorum. Görüntülü arama yapsın yeter.', 'Muhasebe bürosu için bir makine. Excel kasmasın, başka bir şey istemem.'],
  },
  {
    title: 'Öğrenci bilgisayarı', reqs: { ram: 16, score: 20, storage: 512 }, margin: [1.2, 1.4],
    lines: ['Üniversiteye başlıyorum. Ders, ödev, arada hafif oyunlar. Bütçe kısıtlı.', 'Kodlama öğreniyorum, arada da biraz oyun. Çok pahalı olmasın abi.'],
  },
  {
    title: 'Oyun bilgisayarı', reqs: { ram: 16, score: 50, storage: 1024 }, margin: [1.15, 1.35],
    lines: ['Yeni çıkan oyunlar kasmadan gitsin abi. Harçlıklarımı biriktirdim.', 'Rekabetçi oyunlarda yüksek FPS istiyorum. Takılma olmasın.'],
  },
  {
    title: 'Yayıncı bilgisayarı', reqs: { ram: 32, score: 70, storage: 1024 }, margin: [1.12, 1.3],
    lines: ['Yayın açacağım. Hem oyun hem yayın aynı anda akmalı.', 'Video kurgusu yapıyorum, render beklemekten bıktım.'],
  },
  {
    title: 'Canavar sistem', reqs: { ram: 64, score: 90, storage: 2048 }, margin: [1.1, 1.25],
    lines: ['Para sorun değil. En iyisi olsun, 4K\'da her şey açık oynamak istiyorum.'],
  },
];

const FAULTS = {
  psu: ['Düğmeye basıyorum, hiçbir şey olmuyor. Ses yok, ışık yok, ölü gibi.', 'Dün gece elektrikler gitti geldi, o günden beri açılmıyor.'],
  ram: ['Açınca bip bip bip diye ötüyor, ekrana hiçbir şey gelmiyor.', 'Fanlar dönüyor, bir de ötüyor. Görüntü yok.'],
  cpu: ['Fanlar dönüyor ama ekran gelmiyor, ötmüyor da. Anakarttaki kırmızı ışık yanıyor.', 'Yeğenim bir şeyler kurcaladı, açılmıyor artık. Fanlar dönüyor sadece.'],
  gpu: ['Bilgisayar açılıyor gibi ama ekrana görüntü gelmiyor. Kablo sağlam, denedim.', 'Oyun oynarken ekran karardı, bir daha görüntü gelmedi.'],
  ssd: ['Açılıyor ama siyah ekranda "önyükleme cihazı yok" gibi bir şey yazıyor.', 'Dosyalarım gitti mi abi? İşletim sistemi açılmıyor.'],
  weakpsu: ['Masaüstü açılıyor ama oyuna girince bilgisayar birden kapanıyor.', 'Yeni ekran kartı aldım, taktım, şimdi açılıp kapanıyor.'],
};

const pick = a => a[Math.floor(Math.random() * a.length)];
const round500 = n => Math.round(n / 500) * 500;

function buildJob(no, opts) {
  const tpl = opts.tpl;
  const board = BOARDS[opts.board];
  const best = cheapestBuild(board, tpl.reqs);
  const k = opts.margin ?? (tpl.margin[0] + Math.random() * (tpl.margin[1] - tpl.margin[0]));
  return {
    no, type: 'build', title: tpl.title, board,
    customer: opts.name ?? pick(NAMES), quote: opts.quote ?? pick(tpl.lines),
    reqs: tpl.reqs, budget: round500(best.cost * k), cheapest: best.cost,
  };
}

function randomRepair(no) {
  const board = BOARDS[Math.random() < 0.5 ? 'am5' : 'lga'];
  const fault = pick(['psu', 'ram', 'ram', 'cpu', 'gpu', 'ssd', 'weakpsu']);
  for (let tries = 0; tries < 200; tries++) {
    const cpu = pick(byCat('cpu').filter(c => c.socket === board.socket));
    const ram = pick(byCat('ram').filter(r => r.type === board.ram));
    const needGpu = fault === 'gpu' || fault === 'weakpsu' || !cpu.igpu || Math.random() < 0.6;
    const gpu = needGpu ? pick(byCat('gpu').filter(g => fault !== 'weakpsu' || g.watt >= 170)) : null;
    const ssd = pick(byCat('ssd'));
    const set = { cpu, ram: [ram, ram], gpu, ssd, psu: null };
    const st = computeStats(set);
    let psu;
    if (fault === 'weakpsu') {
      psu = [...byCat('psu')].reverse().find(p => p.cap < st.power && p.cap >= st.power * 0.6);
    } else {
      psu = byCat('psu').find(p => p.cap >= st.power * 1.1);
    }
    if (!psu) continue;
    set.psu = psu;
    let faulty = null, allow = 0;
    if (fault === 'ram') { faulty = Math.random() < 0.5 ? 'ram0' : 'ram1'; allow = ram.price; }
    else if (fault === 'weakpsu') { allow = byCat('psu').find(p => p.cap >= st.power).price; }
    else { faulty = fault; allow = set[fault].price; }
    return {
      no, type: 'repair', title: 'Arıza: ' + REPAIR_TITLE[fault], fault, board,
      customer: pick(NAMES), quote: pick(FAULTS[fault]),
      parts: set, faulty, fee: round500(900 + Math.random() * 1400), allowance: round500(allow * 1.2 + 250),
    };
  }
  return null;
}

const REPAIR_TITLE = { psu: 'açılmıyor', ram: 'bip sesi', cpu: 'görüntü yok', gpu: 'görüntü yok', ssd: 'sistem açılmıyor', weakpsu: 'kendi kendine kapanıyor' };

// İlk üç iş öğretici; sonrası rastgele.
export function makeJob(no) {
  if (no === 1) return buildJob(no, { tpl: BUILDS[0], board: 'am5', name: 'Kemal Bey', margin: 1.4, quote: 'Muhasebe bürom için bir bilgisayar lazım. Excel, e-posta, fatura programı. Fazla param yok, ona göre.' });
  if (no === 2) {
    const set = { cpu: PART['cpu-a3'], ram: [PART['ram-4-8'], PART['ram-4-8']], gpu: null, psu: PART['psu-450'], ssd: PART['ssd-512'] };
    return {
      no, type: 'repair', title: 'Arıza: bip sesi', fault: 'ram', board: BOARDS.lga, customer: 'Zeynep',
      quote: 'Açınca bip bip bip diye ötüyor, ekrana hiçbir şey gelmiyor. Sınav haftasındayım, ne olur yardım edin!',
      parts: set, faulty: 'ram1', fee: 1200, allowance: 1100,
    };
  }
  if (no === 3) return buildJob(no, { tpl: BUILDS[2], board: 'lga', name: 'Emre', margin: 1.25 });
  if (Math.random() < 0.4) {
    const r = randomRepair(no);
    if (r) return r;
  }
  const level = Math.min(BUILDS.length - 1, Math.floor(Math.random() * Math.min(BUILDS.length, 2 + Math.floor(no / 3))));
  const tpl = BUILDS[level];
  let board = Math.random() < 0.5 ? 'am5' : 'lga';
  if (!cheapestBuild(BOARDS[board], tpl.reqs)) board = board === 'am5' ? 'lga' : 'am5';
  return buildJob(no, { tpl, board });
}
