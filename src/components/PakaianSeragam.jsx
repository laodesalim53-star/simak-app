// src/pages/PakaianSeragam.jsx
// Template pakaian (jas dan batik Korpri, pria dan wanita) + pencantik kulit untuk EditFotoLatar.
// Semua digambar di canvas, tanpa berkas gambar tambahan dan tanpa internet.

import { useRef } from "react";

/* ───────────────────────── Data ───────────────────────── */

export const CLOTH_DEFAULT = {
  kind: "none", // "none" | "jas" | "batik"
  gender: "pria", // "pria" | "wanita"
  jas: "#1a1c22",
  dasi: "#B3202A",
  motif: "korpri", // "korpri" | "unggah"
  img: null,
  imgId: "",
  up: 0, // geser baju naik (-) / turun (+)
  wid: 100, // lebar baju (%)
  ms: 100, // ukuran motif (%)
  hijab: false, // wanita berhijab: leher V diisi hijab hitam
  emb: true, // lambang Korpri di dada (batik)
  chest: 60, // seberapa jauh bingkai turun ke dada (% tinggi kepala)
};

const JAS_WARNA = [
  { nama: "Hitam", c: "#1a1c22" },
  { nama: "Biru dongker", c: "#1d2b4f" },
  { nama: "Abu tua", c: "#4a505c" },
];
const DASI_WARNA = [
  { nama: "Merah", c: "#B3202A" },
  { nama: "Biru", c: "#1F4E9C" },
  { nama: "Hitam", c: "#23252b" },
  { nama: "Emas", c: "#B88A1E" },
];

export const clothKey = (c) => [c.kind, c.gender, c.jas, c.dasi, c.motif, c.imgId, c.up, c.wid, c.ms, c.hijab, c.emb, c.chest].join("|");

/* ───────────────────────── Util warna ───────────────────────── */

function shade(h, a) {
  const n = parseInt(h.slice(1), 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const t = a < 0 ? 0 : 255;
  const p = Math.abs(a);
  return (
    "#" +
    rgb
      .map((v) => Math.round(v + (t - v) * p).toString(16).padStart(2, "0"))
      .join("")
  );
}

/* ───────────────────────── Motif batik ───────────────────────── */

let _tile = null;
// Pola mirip batik Korpri: dasar biru, ceplok bunga biru muda, kisi belah ketupat.
function makeBatikTile() {
  const sz = 96;
  const c = document.createElement("canvas");
  c.width = c.height = sz;
  const x = c.getContext("2d");
  const dasar = "#1E3FA6",
    tua = "#162F86",
    muda = "#5B8DEF",
    pucat = "#8FB3F7";
  x.fillStyle = dasar;
  x.fillRect(0, 0, sz, sz);
  // kisi belah ketupat
  x.strokeStyle = tua;
  x.lineWidth = 3;
  x.beginPath();
  x.moveTo(0, 48);
  x.lineTo(48, 0);
  x.lineTo(96, 48);
  x.lineTo(48, 96);
  x.closePath();
  x.stroke();
  const bunga = (cx, cy, r) => {
    x.fillStyle = muda;
    for (let k = 0; k < 8; k++) {
      x.save();
      x.translate(cx, cy);
      x.rotate((k * Math.PI) / 4);
      x.beginPath();
      x.ellipse(0, r * 0.6, r * 0.22, r * 0.4, 0, 0, Math.PI * 2);
      x.fill();
      x.restore();
    }
    x.fillStyle = dasar;
    x.beginPath();
    x.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = pucat;
    x.beginPath();
    x.arc(cx, cy, r * 0.14, 0, Math.PI * 2);
    x.fill();
  };
  bunga(48, 48, 22);
  bunga(0, 0, 16);
  bunga(96, 0, 16);
  bunga(0, 96, 16);
  bunga(96, 96, 16);
  x.fillStyle = pucat;
  [
    [48, 10],
    [48, 86],
    [10, 48],
    [86, 48],
  ].forEach(([px, py]) => {
    x.beginPath();
    x.arc(px, py, 2.4, 0, Math.PI * 2);
    x.fill();
  });
  return c;
}

function batikFill(ctx, cl, u) {
  const pakaiUnggah = cl.motif === "unggah" && cl.img;
  const tile = pakaiUnggah ? cl.img : _tile || (_tile = makeBatikTile());
  const pat = ctx.createPattern(tile, "repeat");
  const k = (u * (pakaiUnggah ? 1.0 : 0.5) * (cl.ms / 100)) / tile.width;
  try {
    pat.setTransform(new DOMMatrix().scale(k));
  } catch {
    /* pola dipakai tanpa skala */
  }
  return pat;
}

/* ───────────────────────── Gambar pakaian ───────────────────────── */
// Dipanggil dengan koordinat piksel foto subjek (canvas sudah di-translate dan di-scale).
// sub.geo = { cx, ys, u, headW, bw, ch } dihitung dari siluet kepala dan bahu.

const poly = (pts) => {
  const p = new Path2D();
  pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  p.closePath();
  return p;
};

// Lambang Korpri sederhana: pohon beringin di atas pendopo dengan sepasang sayap.
function drawEmblem(ctx, x, y, sz) {
  const emas = "#D9A93B",
    tua = "#8F6612";
  ctx.save();
  ctx.fillStyle = emas;
  ctx.strokeStyle = tua;
  ctx.lineWidth = Math.max(1, sz * 0.02);
  [-1, 1].forEach((sg) => {
    ctx.beginPath();
    ctx.moveTo(x + sg * 0.5 * sz, y - 0.3 * sz);
    ctx.quadraticCurveTo(x + sg * 0.64 * sz, y + 0.22 * sz, x + sg * 0.1 * sz, y + 0.4 * sz);
    ctx.quadraticCurveTo(x + sg * 0.42 * sz, y + 0.2 * sz, x + sg * 0.5 * sz, y - 0.3 * sz);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });
  ctx.beginPath();
  ctx.moveTo(x - 0.32 * sz, y - 0.04 * sz);
  ctx.lineTo(x + 0.32 * sz, y - 0.04 * sz);
  ctx.lineTo(x + 0.2 * sz, y - 0.14 * sz);
  ctx.lineTo(x - 0.2 * sz, y - 0.14 * sz);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(x - 0.26 * sz, y - 0.04 * sz, 0.52 * sz, 0.2 * sz);
  ctx.strokeRect(x - 0.26 * sz, y - 0.04 * sz, 0.52 * sz, 0.2 * sz);
  ctx.fillRect(x - 0.03 * sz, y - 0.18 * sz, 0.06 * sz, 0.05 * sz);
  ctx.beginPath();
  ctx.ellipse(x, y - 0.34 * sz, 0.26 * sz, 0.19 * sz, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawCloth(ctx, sub, cl) {
  const g = sub && sub.geo;
  if (!g || !cl || cl.kind === "none") return;

  const u = g.u,
    cx = g.cx;
  const mir = (pts) => pts.map(([x, y]) => [2 * cx - x, y]);
  const pria = cl.gender === "pria";
  const jas = cl.kind === "jas";
  const hijab = !!cl.hijab && !pria;
  const skin = sub.skin || "#d9a982";
  const k = (cl.chest || 0) / 100;

  const shift = cl.up * 0.01 * u;
  const W2 = (g.bw / 2) * (cl.wid / 100) * 1.03; // setengah lebar bahu
  const W3 = W2 * (1 + 0.3 * k); // melebar ke bawah (lengan dan dada)
  const nw = g.headW * 0.26; // setengah lebar leher
  const nxo = nw * (jas ? 1.3 : 1.75);
  const ny = g.ys + shift - 0.08 * u; // pangkal leher
  const ty = g.ys + shift + 0.12 * u; // ujung bahu
  const bot = Math.max(g.ch + u, ty + 2.5 * u);
  const vy = ny + (jas ? (pria ? 0.95 : 1.05) : pria ? 0.36 : 0.3) * u; // titik bawah V

  const body = new Path2D();
  body.moveTo(cx - W2, ty);
  body.quadraticCurveTo(cx - W2 * 0.45, ny + 0.02 * u, cx - nxo, ny);
  body.lineTo(cx, vy);
  body.lineTo(cx + nxo, ny);
  body.quadraticCurveTo(cx + W2 * 0.45, ny + 0.02 * u, cx + W2, ty);
  body.lineTo(cx + W3, ty + 1.2 * u);
  body.lineTo(cx + W3, bot);
  body.lineTo(cx - W3, bot);
  body.lineTo(cx - W3, ty + 1.2 * u);
  body.closePath();

  ctx.save();
  ctx.lineJoin = "round";

  // 1. bagian dalam V
  const dalam = poly([
    [cx - nxo, ny],
    [cx + nxo, ny],
    [cx + nxo * 1.25, ny + 0.3 * (vy - ny)],
    [cx, vy + 0.06 * u],
    [cx - nxo * 1.25, ny + 0.3 * (vy - ny)],
  ]);
  if (jas) {
    ctx.fillStyle = "#f3f5f8";
  } else {
    const gr = ctx.createLinearGradient(0, ny, 0, vy);
    if (hijab) {
      gr.addColorStop(0, "#1b1c21");
      gr.addColorStop(1, "#0f1013");
    } else {
      gr.addColorStop(0, shade(skin, -0.08));
      gr.addColorStop(1, shade(skin, -0.03));
    }
    ctx.fillStyle = gr;
  }
  ctx.fill(dalam);

  // hijab di atas kemeja putih (jas wanita)
  if (jas && hijab) {
    ctx.fillStyle = "#14151a";
    ctx.fill(
      poly([
        [cx - nxo * 0.95, ny - 0.03 * u],
        [cx + nxo * 0.95, ny - 0.03 * u],
        [cx + nw * 0.55, ny + 0.26 * u],
        [cx, ny + 0.42 * u],
        [cx - nw * 0.55, ny + 0.26 * u],
      ])
    );
  }

  // 2. dasi (pria berjas), digambar sebelum badan jas supaya terpotong rapi oleh V
  if (jas && pria) {
    const y0 = ny + 0.17 * u;
    ctx.fillStyle = cl.dasi;
    ctx.fill(
      poly([
        [cx - nw * 0.3, y0],
        [cx + nw * 0.3, y0],
        [cx + nw * 0.62, y0 + 0.6 * u],
        [cx, y0 + 0.8 * u],
        [cx - nw * 0.62, y0 + 0.6 * u],
      ])
    );
    ctx.fillStyle = shade(cl.dasi, -0.18);
    ctx.fill(
      poly([
        [cx - nw * 0.42, ny + 0.04 * u],
        [cx + nw * 0.42, ny + 0.04 * u],
        [cx + nw * 0.3, ny + 0.2 * u],
        [cx - nw * 0.3, ny + 0.2 * u],
      ])
    );
  }

  // 3. badan baju
  ctx.fillStyle = jas ? cl.jas : batikFill(ctx, cl, u);
  ctx.fill(body);

  const sh = ctx.createLinearGradient(cx - W3, 0, cx + W3, 0);
  sh.addColorStop(0, "rgba(0,0,0,.32)");
  sh.addColorStop(0.22, "rgba(0,0,0,0)");
  sh.addColorStop(0.78, "rgba(0,0,0,0)");
  sh.addColorStop(1, "rgba(0,0,0,.32)");
  ctx.fillStyle = sh;
  ctx.fill(body);

  const garis = Math.max(1, u * 0.007);

  if (jas) {
    const lapel = [
      [cx - nxo * 0.98, ny - 0.01 * u],
      [cx - nxo * 2.2, ny + 0.17 * u],
      [cx - nxo * 1.2, ny + (vy - ny) * 0.6],
      [cx, vy],
    ];
    [lapel, mir(lapel)].forEach((pts) => {
      const p = poly(pts);
      ctx.fillStyle = shade(cl.jas, 0.12);
      ctx.fill(p);
      ctx.strokeStyle = "rgba(0,0,0,.4)";
      ctx.lineWidth = garis;
      ctx.stroke(p);
    });
    const kerah = [
      [cx - nw * 0.9, ny - 0.08 * u],
      [cx - nxo * 1.35, ny + 0.02 * u],
      [cx - nw * 0.15, ny + 0.2 * u],
      [cx - nw * 0.5, ny + 0.02 * u],
    ];
    [kerah, mir(kerah)].forEach((pts) => {
      const p = poly(pts);
      ctx.fillStyle = "#ffffff";
      ctx.fill(p);
      ctx.strokeStyle = "rgba(0,0,0,.28)";
      ctx.lineWidth = garis;
      ctx.stroke(p);
    });
    ctx.strokeStyle = "rgba(0,0,0,.4)";
    ctx.lineWidth = garis;
    ctx.beginPath();
    ctx.moveTo(cx, vy);
    ctx.lineTo(cx, bot);
    ctx.stroke();
    ctx.fillStyle = shade(cl.jas, 0.28);
    ctx.beginPath();
    ctx.arc(cx + u * 0.04, vy + 0.14 * u, u * 0.028, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // lambang Korpri di dada kiri dan kanan
    if (cl.emb !== false) {
      const ey = g.ys + shift + 0.5 * u;
      drawEmblem(ctx, cx - 0.36 * u, ey, 0.3 * u);
      drawEmblem(ctx, cx + 0.36 * u, ey, 0.3 * u);
    }

    // kerah batik berhias emas di ujungnya
    const kerah = [
      [cx - nw * 0.9, ny - 0.08 * u],
      [cx - nxo * 1.45, ny + 0.05 * u],
      [cx - nw * 0.2, ny + 0.28 * u],
      [cx - nw * 0.5, ny + 0.02 * u],
    ];
    [kerah, mir(kerah)].forEach((pts) => {
      const p = poly(pts);
      ctx.fillStyle = batikFill(ctx, cl, u);
      ctx.fill(p);
      ctx.fillStyle = "rgba(0,0,0,.12)";
      ctx.fill(p);
      ctx.strokeStyle = "rgba(0,0,0,.5)";
      ctx.lineWidth = garis;
      ctx.stroke(p);
      const [, P2, P3] = pts;
      const mx = (pts[0][0] + P2[0] + P3[0]) / 3,
        my = (pts[0][1] + P2[1] + P3[1]) / 3;
      ctx.fillStyle = "#D9A93B";
      [0.3, 0.5, 0.7].forEach((t) => {
        const px = P2[0] + (P3[0] - P2[0]) * t,
          py = P2[1] + (P3[1] - P2[1]) * t;
        ctx.beginPath();
        ctx.ellipse(px + (mx - px) * 0.3, py + (my - py) * 0.3, u * 0.03, u * 0.014, Math.atan2(P3[1] - P2[1], P3[0] - P2[0]), 0, Math.PI * 2);
        ctx.fill();
      });
    });

    // plakat dan kancing biru
    ctx.strokeStyle = "rgba(0,0,0,.45)";
    ctx.lineWidth = garis;
    ctx.beginPath();
    ctx.moveTo(cx, vy);
    ctx.lineTo(cx, bot);
    ctx.stroke();
    for (let i = 1; i <= 4; i++) {
      const by = vy + i * 0.22 * u;
      ctx.fillStyle = "#14246E";
      ctx.beginPath();
      ctx.arc(cx, by, u * 0.026, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.35)";
      ctx.lineWidth = garis * 0.8;
      ctx.stroke();
    }
  }

  ctx.restore();
}

/* ───────────────────────── Warna kulit leher ───────────────────────── */

// Rata-rata warna kulit di sekitar (cx, y). Jika dx > 0, diambil dua titik: cx - dx dan cx + dx (pipi kiri dan kanan).
export function sampleSkin(d, w, h, cx, y, r, dx = 0) {
  let R = 0,
    G = 0,
    B = 0,
    n = 0;
  const centers = dx > 0 ? [cx - dx, cx + dx] : [cx];
  centers.forEach((c) => {
    for (let yy = Math.round(y - r); yy <= y + r; yy++) {
      if (yy < 0 || yy >= h) continue;
      for (let xx = Math.round(c - r); xx <= c + r; xx++) {
        if (xx < 0 || xx >= w) continue;
        const i = (yy * w + xx) * 4;
        if (d[i + 3] > 200 && d[i] > d[i + 2]) {
          R += d[i];
          G += d[i + 1];
          B += d[i + 2];
          n++;
        }
      }
    }
  });
  if (!n) return "#d9a982";
  const hx = (v) => Math.round(v / n).toString(16).padStart(2, "0");
  return "#" + hx(R) + hx(G) + hx(B);
}

/* ───────────────────────── Pencantik: haluskan dan cerahkan kulit ───────────────────────── */

function blur1(a, w, h, r) {
  const t = new Float32Array(a.length);
  const o = new Uint8ClampedArray(a.length);
  const dd = 2 * r + 1;
  const cl = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let s = 0;
    for (let k = -r; k <= r; k++) s += a[row + cl(k, 0, w - 1)];
    for (let x = 0; x < w; x++) {
      t[row + x] = s / dd;
      s += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let k = -r; k <= r; k++) s += t[cl(k, 0, h - 1) * w + x];
    for (let y = 0; y < h; y++) {
      o[y * w + x] = s / dd;
      s += t[Math.min(h - 1, y + r + 1) * w + x] - t[Math.max(0, y - r) * w + x];
    }
  }
  return o;
}

const isSkin = (r, g, b) => r > 70 && g > 35 && b > 15 && r > g && g >= b * 0.8 && r - b > 14;

// amt 0-100: seberapa halus. glow 0-30: seberapa cerah.
// Hanya piksel berwarna kulit yang diubah, dan tepi tajam (mata, alis, bibir) dijaga.
export function skinSmooth(d, w, h, amt, glow) {
  const n = w * h;
  let bl = null;
  if (amt > 0) {
    const r = Math.max(2, Math.round(Math.min(w, h) / 220));
    bl = [0, 1, 2].map((c) => {
      const a = new Uint8ClampedArray(n);
      for (let i = 0; i < n; i++) a[i] = d[i * 4 + c];
      return blur1(a, w, h, r);
    });
  }
  const k = amt / 100,
    gl = glow / 100;
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    if (d[p + 3] < 128) continue;
    let R = d[p],
      G = d[p + 1],
      B = d[p + 2];
    if (!isSkin(R, G, B)) continue;
    if (bl) {
      const y0 = (R * 299 + G * 587 + B * 114) / 1000;
      const y1 = (bl[0][i] * 299 + bl[1][i] * 587 + bl[2][i] * 114) / 1000;
      const df = y0 - y1;
      const wt = k * Math.exp(-(df * df) / (2 * 12 * 12));
      R += (bl[0][i] - R) * wt;
      G += (bl[1][i] - G) * wt;
      B += (bl[2][i] - B) * wt;
    }
    if (gl > 0) {
      R += (255 - R) * gl * 0.3;
      G += (255 - G) * gl * 0.3;
      B += (255 - B) * gl * 0.3;
    }
    d[p] = R;
    d[p + 1] = G;
    d[p + 2] = B;
  }
}

/* ───────────────────────── Panel pengaturan ───────────────────────── */

function Geser({ label, value, min, max, onChange, suffix = "" }) {
  return (
    <label className="ef-row">
      <span className="ef-rowlab">
        {label}
        <b>
          {value}
          {suffix}
        </b>
      </span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

export default function PanelPakaian({ cl, setCl, onNotice }) {
  const fileRef = useRef(null);
  const set = (p) => setCl((c) => ({ ...c, ...p }));

  const chip = (on, label, fn) => (
    <button key={label} type="button" className={"ef-chip" + (on ? " on" : "")} onClick={fn} aria-pressed={on}>
      {label}
    </button>
  );

  const swatch = (c, nama, on, fn) => (
    <button key={c} type="button" className={"ef-sw" + (on ? " on" : "")} onClick={fn} aria-pressed={on}>
      <i style={{ background: c }} />
      <span>{nama}</span>
    </button>
  );

  const pilihMotif = async (file) => {
    if (!file) return;
    try {
      const bmp = await createImageBitmap(file);
      const k = Math.min(1, 800 / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(bmp.width * k));
      c.height = Math.max(1, Math.round(bmp.height * k));
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      set({ motif: "unggah", img: c, imgId: Math.random().toString(36).slice(2, 8) });
    } catch {
      onNotice && onNotice("Gambar motif tidak bisa dibuka.");
    }
  };

  return (
    <fieldset>
      <legend>4. Pakaian seragam</legend>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          pilihMotif(e.target.files[0]);
          e.target.value = "";
        }}
      />

      <div className="ef-chips">
        {chip(cl.kind === "none", "Pakaian asli", () => set({ kind: "none" }))}
        {chip(cl.kind === "jas", "Jas", () => set({ kind: "jas" }))}
        {chip(cl.kind === "batik", "Batik Korpri", () => set({ kind: "batik" }))}
      </div>

      {cl.kind !== "none" && (
        <>
          <div className="ef-chips">
            {chip(cl.gender === "pria", "Pria", () => set({ gender: "pria" }))}
            {chip(cl.gender === "wanita", "Wanita", () => set({ gender: "wanita" }))}
          </div>

          {cl.gender === "wanita" && (
            <label className="ef-check">
              <input type="checkbox" checked={!!cl.hijab} onChange={(e) => set({ hijab: e.target.checked })} /> Berhijab (hijab hitam)
            </label>
          )}

          {cl.kind === "jas" && (
            <>
              <div className="ef-swatches">{JAS_WARNA.map((j) => swatch(j.c, j.nama, cl.jas === j.c, () => set({ jas: j.c })))}</div>
              {cl.gender === "pria" && (
                <>
                  <p className="ef-note">Warna dasi</p>
                  <div className="ef-swatches">{DASI_WARNA.map((j) => swatch(j.c, j.nama, cl.dasi === j.c, () => set({ dasi: j.c })))}</div>
                </>
              )}
            </>
          )}

          {cl.kind === "batik" && (
            <>
              <div className="ef-chips">
                {chip(cl.motif === "korpri", "Motif bawaan", () => set({ motif: "korpri" }))}
                {chip(cl.motif === "unggah", "Motif sendiri", () => (cl.img ? set({ motif: "unggah" }) : fileRef.current.click()))}
              </div>
              <div className="ef-btns">
                <button type="button" className="ef-btn" onClick={() => fileRef.current.click()}>
                  Unggah gambar motif
                </button>
              </div>
              <label className="ef-check">
                <input type="checkbox" checked={cl.emb !== false} onChange={(e) => set({ emb: e.target.checked })} /> Lambang Korpri di dada
              </label>
              <Geser label="Ukuran motif" value={cl.ms} min={50} max={200} suffix="%" onChange={(v) => set({ ms: v })} />
              <p className="ef-note">Motif bawaan hanya pendekatan. Untuk motif Korpri resmi, unggah foto atau gambar kain batiknya.</p>
            </>
          )}

          <Geser label="Tampilkan dada (bingkai turun)" value={cl.chest} min={0} max={100} suffix="%" onChange={(v) => set({ chest: v })} />
          <Geser label="Naik / turunkan baju" value={cl.up} min={-12} max={12} onChange={(v) => set({ up: v })} />
          <Geser label="Lebar baju" value={cl.wid} min={80} max={125} suffix="%" onChange={(v) => set({ wid: v })} />
          <p className="ef-note">
            Baju digambar otomatis di bawah leher mengikuti bahu. Foto harus menampakkan kepala dan bahu. Jika belum pas, atur posisi dan lebar. Pastikan jenis dan warna baju sesuai ketentuan dokumen.
          </p>
        </>
      )}
    </fieldset>
  );
}
