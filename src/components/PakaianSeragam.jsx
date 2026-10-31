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

export const clothKey = (c) => [c.kind, c.gender, c.jas, c.dasi, c.motif, c.imgId, c.up, c.wid, c.ms].join("|");

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
function makeBatikTile() {
  const s = 96;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const x = c.getContext("2d");
  const emas = "#E3BD55";
  x.fillStyle = "#1B3A8C";
  x.fillRect(0, 0, s, s);
  x.strokeStyle = emas;
  x.fillStyle = emas;
  x.lineWidth = 2;
  const bunga = (cx, cy, r) => {
    for (let k = 0; k < 8; k++) {
      x.save();
      x.translate(cx, cy);
      x.rotate((k * Math.PI) / 4);
      x.beginPath();
      x.ellipse(0, r * 0.62, r * 0.24, r * 0.4, 0, 0, Math.PI * 2);
      x.stroke();
      x.restore();
    }
    x.beginPath();
    x.arc(cx, cy, r * 0.22, 0, Math.PI * 2);
    x.fill();
  };
  bunga(24, 24, 20);
  bunga(72, 72, 20);
  [
    [72, 24],
    [24, 72],
  ].forEach(([px, py]) => {
    x.beginPath();
    x.moveTo(px, py - 9);
    x.lineTo(px + 9, py);
    x.lineTo(px, py + 9);
    x.lineTo(px - 9, py);
    x.closePath();
    x.stroke();
    x.beginPath();
    x.arc(px, py, 2.2, 0, Math.PI * 2);
    x.fill();
  });
  x.globalAlpha = 0.6;
  for (let i = 0; i < 4; i++) {
    x.beginPath();
    x.arc(48, i * 24 + 12, 1.6, 0, Math.PI * 2);
    x.fill();
  }
  x.globalAlpha = 1;
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

export function drawCloth(ctx, sub, cl) {
  const g = sub && sub.geo;
  if (!g || !cl || cl.kind === "none") return;

  const u = g.u,
    cx = g.cx;
  const mir = (pts) => pts.map(([x, y]) => [2 * cx - x, y]);
  const pria = cl.gender === "pria";
  const jas = cl.kind === "jas";
  const skin = sub.skin || "#d9a982";

  const shift = cl.up * 0.01 * u;
  const W2 = (g.bw / 2) * (cl.wid / 100) * 1.03; // setengah lebar bahu
  const nw = g.headW * 0.26; // setengah lebar leher
  const nxo = nw * 1.3;
  const ny = g.ys + shift - 0.05 * u; // pangkal leher
  const ty = g.ys + shift + 0.12 * u; // ujung bahu
  const bot = g.ch + u;
  const vy = ny + (jas ? (pria ? 0.95 : 1.05) : pria ? 0.5 : 0.42) * u; // titik bawah V

  const body = new Path2D();
  body.moveTo(cx - W2, ty);
  body.quadraticCurveTo(cx - W2 * 0.45, ny + 0.02 * u, cx - nxo, ny);
  body.lineTo(cx, vy);
  body.lineTo(cx + nxo, ny);
  body.quadraticCurveTo(cx + W2 * 0.45, ny + 0.02 * u, cx + W2, ty);
  body.lineTo(cx + W2, bot);
  body.lineTo(cx - W2, bot);
  body.closePath();

  ctx.save();
  ctx.lineJoin = "round";

  // 1. bagian dalam V (kemeja putih atau kulit leher)
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
    gr.addColorStop(0, shade(skin, -0.12));
    gr.addColorStop(1, skin);
    ctx.fillStyle = gr;
  }
  ctx.fill(dalam);

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

  // bayangan kain di sisi kiri dan kanan
  const sh = ctx.createLinearGradient(cx - W2, 0, cx + W2, 0);
  sh.addColorStop(0, "rgba(0,0,0,.32)");
  sh.addColorStop(0.22, "rgba(0,0,0,0)");
  sh.addColorStop(0.78, "rgba(0,0,0,0)");
  sh.addColorStop(1, "rgba(0,0,0,.32)");
  ctx.fillStyle = sh;
  ctx.fill(body);

  const garis = Math.max(1, u * 0.007);

  if (jas) {
    // kerah jas (lapel)
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
    // kerah kemeja
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
    // garis tengah dan kancing
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
  } else if (pria) {
    // batik pria: kerah terbuka dan plakat kancing
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
    });
    ctx.strokeStyle = "rgba(0,0,0,.45)";
    ctx.lineWidth = garis;
    ctx.beginPath();
    ctx.moveTo(cx, vy);
    ctx.lineTo(cx, bot);
    ctx.stroke();
    ctx.fillStyle = "#E3BD55";
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(cx, vy + i * 0.2 * u, u * 0.02, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // batik wanita: leher V dengan list emas
    ctx.strokeStyle = "#E3BD55";
    ctx.lineWidth = u * 0.014;
    ctx.beginPath();
    ctx.moveTo(cx - nxo, ny);
    ctx.lineTo(cx, vy);
    ctx.lineTo(cx + nxo, ny);
    ctx.stroke();
  }

  ctx.restore();
}

/* ───────────────────────── Warna kulit leher ───────────────────────── */

export function sampleSkin(d, w, h, cx, y, r) {
  let R = 0,
    G = 0,
    B = 0,
    n = 0;
  for (let yy = Math.round(y - r); yy <= y + r; yy++) {
    if (yy < 0 || yy >= h) continue;
    for (let xx = Math.round(cx - r); xx <= cx + r; xx++) {
      if (xx < 0 || xx >= w) continue;
      const i = (yy * w + xx) * 4;
      if (d[i + 3] > 200) {
        R += d[i];
        G += d[i + 1];
        B += d[i + 2];
        n++;
      }
    }
  }
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
              <Geser label="Ukuran motif" value={cl.ms} min={50} max={200} suffix="%" onChange={(v) => set({ ms: v })} />
              <p className="ef-note">Motif bawaan hanya pendekatan. Untuk motif Korpri resmi, unggah foto atau gambar kain batiknya.</p>
            </>
          )}

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
