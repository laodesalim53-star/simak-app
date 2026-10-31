// src/pages/EditFotoLatar.jsx
// Edit Foto Latar — ganti background foto siswa (raport, ijazah, dll.) dengan alat otomatis.
// Semua proses berjalan di browser (canvas). Foto tidak diunggah ke server.
//
// Mode "AI" memuat pustaka @imgly/background-removal dari CDN saat pertama dipakai.
// Kalau ingin tanpa CDN:  npm i @imgly/background-removal
// lalu ganti baris `aiLib = await import(...)` di fungsi aiRemove dengan
// `aiLib = await import("@imgly/background-removal")`.
//
// Template pakaian (jas / batik Korpri) dan pencantik kulit ada di ./PakaianSeragam.jsx

import { useState, useRef, useEffect } from "react";
import Layout from "../components/Layout";
import HapusLatarDokumen from "./HapusLatarDokumen";
import PanelPakaian, { CLOTH_DEFAULT, clothKey, drawCloth, sampleSkin, skinSmooth } from "../components/PakaianSeragam";

/* ───────────────────────── Konstanta ───────────────────────── */

const MAX_SRC = 1400; // sisi terpanjang foto kerja (px)
const AI_URL = "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm";

const RATIOS = { "2x3": [2, 3], "3x4": [3, 4], "4x6": [4, 6] }; // cm

const LATAR = [
  { id: "merah", nama: "Merah", mode: "solid", c1: "#D6202B" },
  { id: "merah-studio", nama: "Merah studio", mode: "radial", c1: "#E8454F", c2: "#A5111B" },
  { id: "biru", nama: "Biru", mode: "solid", c1: "#1F5FBF" },
  { id: "biru-tua", nama: "Biru tua", mode: "solid", c1: "#0B3C91" },
  { id: "biru-langit", nama: "Biru langit", mode: "solid", c1: "#58A9E6" },
  { id: "biru-gradasi", nama: "Biru gradasi", mode: "linear", c1: "#6FA8F0", c2: "#1B4FA8" },
  { id: "putih", nama: "Putih", mode: "solid", c1: "#FFFFFF" },
  { id: "abu", nama: "Abu-abu", mode: "solid", c1: "#D5D9DF" },
  { id: "abu-studio", nama: "Abu studio", mode: "radial", c1: "#F3F4F6", c2: "#B3B8C2" },
  { id: "hijau", nama: "Hijau", mode: "solid", c1: "#2E8B57" },
  { id: "kuning", nama: "Kuning", mode: "solid", c1: "#F4C430" },
  { id: "transparan", nama: "Transparan", mode: "transparent", c1: "#FFFFFF" },
];

const PAPERS = {
  A4: { nama: "A4 (21 × 29,7 cm)", w: 210, h: 297, m: 8, gap: 2 },
  F4: { nama: "F4 (21,5 × 33 cm)", w: 215, h: 330, m: 8, gap: 2 },
  "4R": { nama: "4R (10,2 × 15,2 cm)", w: 102, h: 152, m: 4, gap: 2 },
};

/* ───────────────────────── Util umum ───────────────────────── */

const uid = () => Math.random().toString(36).slice(2, 10);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hex2rgb = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgb2hex = (r, g, b) =>
  "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
const shade = (h, a) => {
  const [r, g, b] = hex2rgb(h);
  const t = a < 0 ? 0 : 255;
  const p = Math.abs(a);
  return rgb2hex(r + (t - r) * p, g + (t - g) * p, b + (t - b) * p);
};
const canvasToBlob = (c, type, q) => new Promise((res) => c.toBlob(res, type, q));
const safeName = (s) => (s || "foto").replace(/[^\w\- ]+/g, "_").trim() || "foto";

function download(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function bgCss(p) {
  if (p.mode === "solid") return p.c1;
  if (p.mode === "linear") return `linear-gradient(180deg, ${p.c1}, ${p.c2})`;
  if (p.mode === "radial") return `radial-gradient(circle at 50% 38%, ${p.c1}, ${p.c2})`;
  return "repeating-conic-gradient(#d0d3d8 0% 25%, #fff 0% 50%) 0 0 / 12px 12px";
}

async function fileToCanvas(file) {
  let src;
  try {
    src = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    src = await new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = URL.createObjectURL(file);
    });
  }
  const w0 = src.width,
    h0 = src.height;
  const k = Math.min(1, MAX_SRC / Math.max(w0, h0));
  const c = document.createElement("canvas");
  c.width = Math.round(w0 * k);
  c.height = Math.round(h0 * k);
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

function makeThumb(c) {
  const k = 72 / Math.max(c.width, c.height);
  const t = document.createElement("canvas");
  t.width = Math.max(1, Math.round(c.width * k));
  t.height = Math.max(1, Math.round(c.height * k));
  t.getContext("2d").drawImage(c, 0, 0, t.width, t.height);
  return t.toDataURL("image/jpeg", 0.7);
}

/* ───────────────────── Filter alpha (tepi) ───────────────────── */

function minFilter(a, w, h, r) {
  const t = new Uint8ClampedArray(a.length);
  const o = new Uint8ClampedArray(a.length);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let m = 255;
      const x0 = Math.max(0, x - r),
        x1 = Math.min(w - 1, x + r);
      for (let k = x0; k <= x1; k++) if (a[row + k] < m) m = a[row + k];
      t[row + x] = m;
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let m = 255;
      const y0 = Math.max(0, y - r),
        y1 = Math.min(h - 1, y + r);
      for (let k = y0; k <= y1; k++) if (t[k * w + x] < m) m = t[k * w + x];
      o[y * w + x] = m;
    }
  }
  return o;
}

function boxBlur(a, w, h, r) {
  const t = new Float32Array(a.length);
  const o = new Uint8ClampedArray(a.length);
  const d = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let s = 0;
    for (let k = -r; k <= r; k++) s += a[row + clamp(k, 0, w - 1)];
    for (let x = 0; x < w; x++) {
      t[row + x] = s / d;
      s += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let k = -r; k <= r; k++) s += t[clamp(k, 0, h - 1) * w + x];
    for (let y = 0; y < h; y++) {
      o[y * w + x] = s / d;
      s += t[Math.min(h - 1, y + r + 1) * w + x] - t[Math.max(0, y - r) * w + x];
    }
  }
  return o;
}

function refineAlpha(d, w, h, shrink, feather) {
  let a = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) a[i] = d[i * 4 + 3];
  if (shrink > 0) a = minFilter(a, w, h, Math.round(shrink));
  if (feather > 0) {
    a = boxBlur(a, w, h, Math.round(feather));
    // pertajam kurva supaya batas tepi tidak melebar keluar
    for (let i = 0; i < a.length; i++) a[i] = clamp(128 + (a[i] - 128) * 2, 0, 255);
  }
  for (let i = 0; i < w * h; i++) d[i * 4 + 3] = a[i];
}

/* ───────────────── Hapus latar: mode Cepat (warna polos) ───────────────── */

function fastRemove(src, tol) {
  const w = src.width,
    h = src.height;
  const img = src.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, w, h);
  const d = img.data;

  // warna acuan latar: tepi atas + bagian atas tepi kiri/kanan
  const band = 6;
  const meanRect = (x0, y0, x1, y1) => {
    let r = 0,
      g = 0,
      b = 0,
      n = 0;
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) {
        const i = (y * w + x) * 4;
        r += d[i];
        g += d[i + 1];
        b += d[i + 2];
        n++;
      }
    return n ? [r / n, g / n, b / n] : null;
  };
  const refs = [];
  for (let k = 0; k < 4; k++) refs.push(meanRect(Math.floor((w * k) / 4), 0, Math.floor((w * (k + 1)) / 4), band));
  [
    [0, 0.3],
    [0.3, 0.6],
  ].forEach(([a, b]) => {
    refs.push(meanRect(0, Math.floor(h * a), band, Math.floor(h * b)));
    refs.push(meanRect(w - band, Math.floor(h * a), w, Math.floor(h * b)));
  });
  const R = refs.filter(Boolean);
  const t2 = tol * tol;

  const isBg = (p) => {
    const i = p * 4;
    const r = d[i],
      g = d[i + 1],
      b = d[i + 2];
    for (let k = 0; k < R.length; k++) {
      const dr = r - R[k][0],
        dg = g - R[k][1],
        db = b - R[k][2];
      if (dr * dr + dg * dg + db * db <= t2) return true;
    }
    return false;
  };

  const bgm = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let sp = 0;
  const push = (p) => {
    if (!bgm[p] && isBg(p)) {
      bgm[p] = 1;
      stack[sp++] = p;
    }
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + w - 1);
  }
  while (sp > 0) {
    const p = stack[--sp];
    const x = p % w,
      y = (p / w) | 0;
    if (x > 0) push(p - 1);
    if (x < w - 1) push(p + 1);
    if (y > 0) push(p - w);
    if (y < h - 1) push(p + w);
  }

  // simpan hanya bagian foreground terbesar (buang bintik)
  const lab = new Int32Array(w * h);
  const sizes = [0];
  let nl = 0;
  for (let s = 0; s < w * h; s++) {
    if (bgm[s] || lab[s]) continue;
    nl++;
    let n = 0;
    sp = 0;
    stack[sp++] = s;
    lab[s] = nl;
    while (sp > 0) {
      const p = stack[--sp];
      n++;
      const x = p % w,
        y = (p / w) | 0;
      const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
      for (let k = 0; k < 4; k++) {
        const q = nb[k];
        if (q >= 0 && !bgm[q] && !lab[q]) {
          lab[q] = nl;
          stack[sp++] = q;
        }
      }
    }
    sizes[nl] = n;
  }
  const maxSize = Math.max(0, ...sizes);
  let a = new Uint8ClampedArray(w * h);
  for (let p = 0; p < w * h; p++) a[p] = !bgm[p] && sizes[lab[p]] >= maxSize * 0.05 ? 255 : 0;
  a = minFilter(a, w, h, 1);
  for (let p = 0; p < w * h; p++) d[p * 4 + 3] = a[p];

  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  out.getContext("2d").putImageData(img, 0, 0);
  return out;
}

/* ───────────────── Hapus latar: mode AI ───────────────── */

let aiLib = null;
async function aiRemove(base, onProgress) {
  if (!aiLib) aiLib = await import(/* @vite-ignore */ AI_URL);
  const fn = aiLib.removeBackground || (aiLib.default && aiLib.default.removeBackground) || aiLib.default;
  const blob = await canvasToBlob(base, "image/png");
  const out = await fn(blob, {
    model: "isnet_quint8",
    output: { format: "image/png" },
    progress: (key, cur, total) => total && onProgress && onProgress(Math.round((cur / total) * 100)),
  });
  const bmp = await createImageBitmap(out);
  const c = document.createElement("canvas");
  c.width = base.width;
  c.height = base.height;
  c.getContext("2d", { willReadFrequently: true }).drawImage(bmp, 0, 0, c.width, c.height);
  return c;
}

/* ───────────────── Perbaikan warna & pencahayaan ───────────────── */

function percentile(hist, total, q) {
  const target = total * q;
  let s = 0;
  for (let i = 0; i < 256; i++) {
    s += hist[i];
    if (s >= target) return i;
  }
  return 255;
}

function colorAdjust(d, p) {
  const identity = !p.auto && !p.bright && !p.contrast && !p.sat;
  if (identity) return;
  let lo = 0,
    hi = 255,
    gamma = 1;
  if (p.auto) {
    const hist = new Uint32Array(256);
    let cnt = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 200) {
        hist[((d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000) | 0]++;
        cnt++;
      }
    }
    if (cnt > 100) {
      lo = Math.min(percentile(hist, cnt, 0.01), 50);
      hi = Math.max(percentile(hist, cnt, 0.99), 205);
      const med = percentile(hist, cnt, 0.5);
      const mn = clamp((med - lo) / (hi - lo), 0.05, 0.95);
      gamma = clamp(Math.log(0.45) / Math.log(mn), 0.9, 1.15);
    }
  }
  const cc = p.contrast * 2.55;
  const f = (259 * (cc + 255)) / (255 * (259 - cc));
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) {
    let x = clamp((v - lo) / (hi - lo), 0, 1);
    x = Math.pow(x, gamma) * 255 + p.bright * 1.5;
    lut[v] = f * (x - 128) + 128;
  }
  const k = 1 + p.sat / 100;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    let r = lut[d[i]],
      g = lut[d[i + 1]],
      b = lut[d[i + 2]];
    if (p.sat) {
      const y = 0.299 * r + 0.587 * g + 0.114 * b;
      r = y + (r - y) * k;
      g = y + (g - y) * k;
      b = y + (b - y) * k;
    }
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
  }
}

function sharpen(d, w, h, amt) {
  const s = new Uint8ClampedArray(d);
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      if (s[i + 3] === 0) continue;
      for (let c = 0; c < 3; c++) {
        const v = s[i + c];
        const lap = 4 * v - s[i + c - 4] - s[i + c + 4] - s[i + c - w * 4] - s[i + c + w * 4];
        d[i + c] = v + amt * 0.6 * lap;
      }
    }
}

function alphaBox(d, w, h) {
  const rows = new Uint32Array(h);
  const cols = new Uint32Array(w);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (d[(y * w + x) * 4 + 3] > 128) {
        rows[y]++;
        cols[x]++;
      }
  const tr = Math.max(2, w * 0.012),
    tc = Math.max(2, h * 0.012);
  let y0 = 0,
    y1 = h - 1,
    x0 = 0,
    x1 = w - 1;
  while (y0 < h && rows[y0] < tr) y0++;
  while (y1 > y0 && rows[y1] < tr) y1--;
  while (x0 < w && cols[x0] < tc) x0++;
  while (x1 > x0 && cols[x1] < tc) x1--;
  if (y0 >= y1 || x0 >= x1) return { x: 0, y: 0, w, h };
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

// Crop otomatis: cari kepala dan bahu dari siluet, lalu tentukan bingkai potret.
// Foto setengah badan atau seluruh badan jadi terpotong ke kepala + bahu.
// Hasil juga membawa ys (baris awal bahu), headW (lebar kepala), cx (tengah) untuk template pakaian.
function headShouldersBox(d, w, h) {
  const base = alphaBox(d, w, h);
  const y0 = base.y,
    yEnd = Math.min(h, base.y + base.h);
  if (yEnd - y0 < 20) return base;

  // lebar siluet per baris, dihaluskan 5 baris
  const cnt = new Float32Array(h);
  for (let y = y0; y < yEnd; y++) {
    let c = 0;
    const row = y * w * 4;
    for (let x = base.x; x < base.x + base.w; x++) if (d[row + x * 4 + 3] > 128) c++;
    cnt[y] = c;
  }
  const sm = new Float32Array(h);
  for (let y = y0; y < yEnd; y++) {
    let s = 0,
      k = 0;
    for (let j = -2; j <= 2; j++) {
      const yy = y + j;
      if (yy >= y0 && yy < yEnd) {
        s += cnt[yy];
        k++;
      }
    }
    sm[y] = s / k;
  }

  // bahu = baris pertama yang jauh lebih lebar daripada kepala
  const minHead = base.h * 0.04;
  let headW = 0,
    ys = -1;
  for (let y = y0; y < yEnd; y++) {
    if (headW >= minHead && sm[y] > headW * 1.5) {
      ys = y;
      break;
    }
    if (sm[y] > headW) headW = sm[y];
  }
  if (ys < 0 || ys - y0 < base.h * 0.06) return base;

  // bingkai: puncak kepala ±8% dari atas, awal bahu ±74% dari atas
  const hh = ys - y0;
  const yB = Math.min(yEnd, y0 + (hh * 0.92) / 0.66);
  let minx = w,
    maxx = 0,
    sx = 0,
    sn = 0;
  for (let y = y0; y < yB; y++) {
    const row = y * w * 4;
    let a = -1,
      b = -1;
    for (let x = base.x; x < base.x + base.w; x++) {
      if (d[row + x * 4 + 3] > 128) {
        if (a < 0) a = x;
        b = x;
      }
    }
    if (a < 0) continue;
    if (a < minx) minx = a;
    if (b > maxx) maxx = b;
    if (y < ys) {
      sx += (a + b) / 2;
      sn++;
    }
  }
  if (maxx <= minx || !sn) return base;
  const bw = maxx - minx + 1;
  return { x: sx / sn - bw / 2, y: y0, w: bw, h: yB - y0, ys, headW, cx: sx / sn };
}

// Cadangan: kalau bahu tidak terdeteksi (misalnya foto sudah dipotong rapat di dada),
// perkirakan posisi bahu dari kotak siluet supaya template pakaian tetap bisa digambar.
function ensureGeo(d, w, h, hs) {
  if (hs.ys !== undefined) return hs;
  const y0 = hs.y,
    yE = Math.min(h, hs.y + hs.h);
  const ys = y0 + (yE - y0) * 0.68;
  const lim = y0 + (yE - y0) * 0.55;
  let headW = 0,
    sx = 0,
    sn = 0;
  for (let y = Math.floor(y0); y < lim; y++) {
    let a = -1,
      b = -1,
      c = 0;
    const row = y * w * 4;
    for (let x = Math.floor(hs.x); x < hs.x + hs.w && x < w; x++) {
      if (d[row + x * 4 + 3] > 128) {
        if (a < 0) a = x;
        b = x;
        c++;
      }
    }
    if (a < 0) continue;
    if (c > headW) headW = c;
    sx += (a + b) / 2;
    sn++;
  }
  return { ...hs, ys, headW: headW || hs.w * 0.5, cx: sn ? sx / sn : hs.x + hs.w / 2 };
}

// Bangun "subjek" siap pakai: tepi dihaluskan, cahaya diperbaiki, kulit dicantik, dipertajam.
function buildSubject(item, p) {
  const src = item.cut || item.base;
  const isCut = !!item.cut;
  const w = src.width,
    h = src.height;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  if (isCut && (p.shrink > 0 || p.feather > 0)) refineAlpha(d, w, h, p.shrink, p.feather);
  colorAdjust(d, p);
  if (p.smooth > 0 || p.glow > 0) skinSmooth(d, w, h, p.smooth, p.glow);
  if (p.sharp > 0) sharpen(d, w, h, p.sharp / 100);
  ctx.putImageData(img, 0, 0);

  let box,
    geo = null,
    skin = null;
  if (isCut) {
    const hs = ensureGeo(d, w, h, headShouldersBox(d, w, h));
    box = p.autoCrop ? hs : alphaBox(d, w, h);
    if (hs.ys !== undefined) {
      const u = hs.ys - hs.y;
      geo = { cx: hs.cx, ys: hs.ys, u, headW: hs.headW, bw: hs.w, ch: h };
      skin = sampleSkin(d, w, h, hs.cx, hs.y + 0.5 * u, Math.max(3, Math.round(hs.headW * 0.04)), hs.headW * 0.27); // warna pipi
    }
  } else box = { x: 0, y: 0, w, h };
  return { canvas: c, box, isCut, geo, skin };
}

/* ───────────────────── Render foto akhir ───────────────────── */

function drawBackground(ctx, W, H, bg) {
  if (bg.mode === "transparent") return;
  if (bg.mode === "image" && bg.image) {
    const k = Math.max(W / bg.image.width, H / bg.image.height);
    const w = bg.image.width * k,
      h = bg.image.height * k;
    ctx.drawImage(bg.image, (W - w) / 2, (H - h) / 2, w, h);
    return;
  }
  if (bg.mode === "linear") {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, bg.c1);
    g.addColorStop(1, bg.c2);
    ctx.fillStyle = g;
  } else if (bg.mode === "radial") {
    const g = ctx.createRadialGradient(W / 2, H * 0.38, 0, W / 2, H * 0.38, Math.max(W, H) * 0.75);
    g.addColorStop(0, bg.c1);
    g.addColorStop(1, bg.c2);
    ctx.fillStyle = g;
  } else ctx.fillStyle = bg.c1;
  ctx.fillRect(0, 0, W, H);
}

function renderPhoto(sub, bg, ratioKey, dpi, zoom, ox, oy, cl) {
  const [rw, rh] = RATIOS[ratioKey];
  const W = Math.round((rw / 2.54) * dpi),
    H = Math.round((rh / 2.54) * dpi);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  drawBackground(ctx, W, H, bg);
  const { canvas: s, box } = sub;
  let fs, dx, dy;
  if (sub.isCut) {
    // posisi otomatis: puncak kepala ±8% dari atas, bahu rata dengan dasar bingkai
    let sc = (H * 0.92) / box.h;
    if (box.w * sc > W * 1.12) sc = (W * 1.12) / box.w;
    fs = sc * zoom;
    dx = W / 2 - (box.x + box.w / 2) * fs + ox * W;
    dy = H - (box.y + box.h) * fs + oy * H;
  } else {
    fs = Math.max(W / s.width, H / s.height) * zoom;
    dx = (W - s.width * fs) / 2 + ox * W;
    dy = (H - s.height * fs) / 2 + oy * H;
  }
  ctx.drawImage(s, dx, dy, s.width * fs, s.height * fs);
  // template pakaian (jas / batik Korpri), digambar dalam koordinat piksel foto subjek
  if (sub.isCut && cl && cl.kind !== "none") {
    ctx.save();
    ctx.translate(dx, dy);
    ctx.scale(fs, fs);
    drawCloth(ctx, sub, cl);
    ctx.restore();
  }
  return c;
}

/* ───────────────── Simpan DPI ke berkas (agar cetak pas ukuran) ───────────────── */

const CRC_T = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(u8) {
  let c = 0xffffffff;
  for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
async function withDpi(blob, fmt, dpi) {
  try {
    const u8 = new Uint8Array(await blob.arrayBuffer());
    if (fmt === "png") {
      const ppm = Math.round(dpi / 0.0254);
      const chunk = new Uint8Array(21);
      const dv = new DataView(chunk.buffer);
      dv.setUint32(0, 9);
      chunk.set([0x70, 0x48, 0x59, 0x73], 4);
      dv.setUint32(8, ppm);
      dv.setUint32(12, ppm);
      chunk[16] = 1;
      dv.setUint32(17, crc32(chunk.subarray(4, 17)));
      const out = new Uint8Array(u8.length + 21);
      out.set(u8.subarray(0, 33));
      out.set(chunk, 33);
      out.set(u8.subarray(33), 54);
      return new Blob([out], { type: "image/png" });
    }
    if (u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff && u8[3] === 0xe0 && u8[6] === 0x4a && u8[7] === 0x46) {
      u8[13] = 1;
      u8[14] = dpi >> 8;
      u8[15] = dpi & 255;
      u8[16] = dpi >> 8;
      u8[17] = dpi & 255;
      return new Blob([u8], { type: "image/jpeg" });
    }
  } catch {
    /* abaikan, pakai berkas apa adanya */
  }
  return blob;
}

/* ───────────────────────── Komponen kecil ───────────────────────── */

function Slider({ label, value, min, max, step = 1, onChange, suffix = "" }) {
  return (
    <label className="ef-row">
      <span className="ef-rowlab">
        {label}
        <b>
          {value}
          {suffix}
        </b>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function Chip({ active, onClick, children, disabled }) {
  return (
    <button type="button" className={"ef-chip" + (active ? " on" : "")} onClick={onClick} disabled={disabled} aria-pressed={!!active}>
      {children}
    </button>
  );
}

/* ───────────────────────── Halaman ───────────────────────── */

export default function EditFotoLatar() {
  const [items, setItems] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState("foto");

  // hapus latar lama
  const [method, setMethod] = useState("ai");
  const [tol, setTol] = useState(48);

  // latar baru
  const [bg, setBg] = useState({ id: "merah", mode: "solid", c1: "#D6202B", c2: shade("#D6202B", -0.3), c2auto: true, image: null });

  // ukuran & berkas
  const [ratio, setRatio] = useState("3x4");
  const [dpi, setDpi] = useState(300);
  const [format, setFormat] = useState("jpg");

  // alat otomatis & penyesuaian
  const [auto, setAuto] = useState(true);
  const [bright, setBright] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [sat, setSat] = useState(0);
  const [sharp, setSharp] = useState(20);
  const [shrink, setShrink] = useState(1);
  const [feather, setFeather] = useState(2);
  const [autoCrop, setAutoCrop] = useState(true);
  const [guides, setGuides] = useState(true);
  const [showOrig, setShowOrig] = useState(false);

  // pencantik kulit & pakaian seragam
  const [smooth, setSmooth] = useState(0);
  const [glow, setGlow] = useState(0);
  const [cl, setCl] = useState(CLOTH_DEFAULT);

  // cetak lembar
  const [paper, setPaper] = useState("A4");
  const [copies, setCopies] = useState(6);
  const [scope, setScope] = useState("aktif");

  const [busyExport, setBusyExport] = useState(false);
  const [subjTick, setSubjTick] = useState(0);

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const settingsRef = useRef({ method, tol });
  settingsRef.current = { method, tol };
  const queueRef = useRef(Promise.resolve());
  const subjRef = useRef(null);
  const previewRef = useRef(null);
  const frameRef = useRef(null);
  const fileRef = useRef(null);
  const camRef = useRef(null);
  const bgFileRef = useRef(null);
  const dragRef = useRef(null);
  const tolFirst = useRef(true);

  const active = items.find((i) => i.id === activeId) || null;
  const adj = { auto, bright, contrast, sat, sharp, shrink, feather, autoCrop, smooth, glow };
  const adjKey = [auto, bright, contrast, sat, sharp, shrink, feather, autoCrop, smooth, glow].join("|");
  const clKey = clothKey(cl);

  const patch = (id, p) =>
    setItems((l) => l.map((i) => (i.id === id ? { ...i, ...(typeof p === "function" ? p(i) : p) } : i)));

  /* ── proses hapus latar ── */
  const processItem = async (item) => {
    const { method: m, tol: t } = settingsRef.current;
    patch(item.id, { status: "busy", msg: m === "ai" ? "Menyiapkan model AI…" : "Memproses…" });
    try {
      let cut;
      if (m === "ai") {
        try {
          cut = await aiRemove(item.base, (pct) => patch(item.id, { msg: `Model AI bekerja… ${pct}%` }));
        } catch (e) {
          console.warn("Mode AI gagal:", e);
          setNotice("Mode AI tidak bisa dijalankan (butuh internet untuk pertama kali). Dipakai mode Cepat; hasilnya terbaik untuk latar polos.");
          await sleep(30);
          cut = fastRemove(item.base, t);
        }
      } else {
        await sleep(30);
        cut = fastRemove(item.base, t);
      }
      patch(item.id, (i) => ({ cut, status: "done", msg: "", ver: i.ver + 1 }));
    } catch (e) {
      console.error(e);
      patch(item.id, { status: "error", msg: "Gagal memproses foto ini." });
    }
  };
  const enqueue = (item) => {
    queueRef.current = queueRef.current.then(() => processItem(item)).catch(() => {});
  };

  // mode Cepat: proses ulang otomatis saat toleransi digeser
  useEffect(() => {
    if (tolFirst.current) {
      tolFirst.current = false;
      return;
    }
    if (method !== "fast" || !activeId) return;
    const t = setTimeout(() => {
      const it = itemsRef.current.find((i) => i.id === activeId);
      if (it) enqueue(it);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tol]);

  /* ── tambah / hapus foto ── */
  const addFiles = async (fileList) => {
    const files = [...fileList].filter((f) => f.type.startsWith("image/"));
    if (!files.length) {
      setNotice("Pilih berkas gambar (JPG, PNG, atau WebP).");
      return;
    }
    const created = [];
    for (const f of files) {
      try {
        const base = await fileToCanvas(f);
        created.push({
          id: uid(),
          label: f.name.replace(/\.[^.]+$/, ""),
          base,
          thumb: makeThumb(base),
          cut: null,
          status: "idle",
          msg: "",
          zoom: 1,
          ox: 0,
          oy: 0,
          ver: 0,
        });
      } catch {
        setNotice(`Berkas ${f.name} tidak bisa dibuka.`);
      }
    }
    if (!created.length) return;
    setItems((l) => [...l, ...created]);
    setActiveId((id) => id || created[0].id);
    created.forEach(enqueue);
  };

  const removeItem = (id) => {
    setItems((l) => l.filter((i) => i.id !== id));
    if (id === activeId) {
      const rest = itemsRef.current.filter((i) => i.id !== id);
      setActiveId(rest[0] ? rest[0].id : null);
    }
  };

  /* ── subjek (hasil tepi + warna) untuk foto aktif ── */
  useEffect(() => {
    if (!active) {
      subjRef.current = null;
      setSubjTick((t) => t + 1);
      return;
    }
    const t = setTimeout(() => {
      subjRef.current = { id: active.id, sub: buildSubject(active, adj) };
      setSubjTick((n) => n + 1);
    }, 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active && active.id, active && active.ver, adjKey]);

  /* ── gambar pratinjau ── */
  useEffect(() => {
    const cv = previewRef.current;
    if (!cv || !active) return;
    let sub = subjRef.current && subjRef.current.id === active.id ? subjRef.current.sub : null;
    if (showOrig) sub = { canvas: active.base, box: { x: 0, y: 0, w: active.base.width, h: active.base.height }, isCut: false };
    if (!sub) return;
    const out = renderPhoto(sub, bg, ratio, 300, active.zoom, active.ox, active.oy, cl);
    cv.width = out.width;
    cv.height = out.height;
    cv.getContext("2d").drawImage(out, 0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjTick, bg, ratio, active && active.id, active && active.zoom, active && active.ox, active && active.oy, showOrig, clKey]);

  /* ── geser posisi dengan jari / mouse ── */
  const onDown = (e) => {
    if (!active) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: active.ox, oy: active.oy };
  };
  const onMove = (e) => {
    const d = dragRef.current;
    if (!d || !active) return;
    const r = frameRef.current.getBoundingClientRect();
    patch(active.id, {
      ox: clamp(d.ox + (e.clientX - d.x) / r.width, -0.6, 0.6),
      oy: clamp(d.oy + (e.clientY - d.y) / r.height, -0.6, 0.6),
    });
  };
  const onUp = () => {
    dragRef.current = null;
  };

  /* ── pilih latar ── */
  const pickPreset = (p) =>
    setBg((b) => ({ ...b, id: p.id, mode: p.mode, c1: p.c1, c2: p.c2 || shade(p.c1, -0.3), c2auto: !p.c2 }));
  const setColor1 = (v) => setBg((b) => ({ ...b, id: "kustom", c1: v, c2: b.c2auto ? shade(v, -0.3) : b.c2, mode: b.mode === "transparent" || b.mode === "image" ? "solid" : b.mode }));
  const setColor2 = (v) => setBg((b) => ({ ...b, id: "kustom", c2: v, c2auto: false }));
  const pickBgImage = async (file) => {
    if (!file) return;
    try {
      const c = await fileToCanvas(file);
      setBg((b) => ({ ...b, id: "gambar", mode: "image", image: c }));
    } catch {
      setNotice("Gambar latar tidak bisa dibuka.");
    }
  };

  /* ── ekspor ── */
  const exportOne = async (item) => {
    const sub = buildSubject(item, adj);
    const out = renderPhoto(sub, bg, ratio, dpi, item.zoom, item.ox, item.oy, cl);
    const fmt = bg.mode === "transparent" ? "png" : format;
    let blob = await canvasToBlob(out, fmt === "png" ? "image/png" : "image/jpeg", 0.95);
    blob = await withDpi(blob, fmt, dpi);
    download(blob, `${safeName(item.label)}_${ratio}.${fmt === "png" ? "png" : "jpg"}`);
  };
  const exportActive = async () => {
    if (!active) return;
    setBusyExport(true);
    await exportOne(active);
    setBusyExport(false);
  };
  const exportAll = async () => {
    const list = items.filter((i) => i.status === "done");
    if (!list.length) return setNotice("Belum ada foto yang selesai diproses.");
    setBusyExport(true);
    for (const it of list) {
      await exportOne(it);
      await sleep(300);
    }
    setBusyExport(false);
  };

  const cetakLembar = () => {
    const targets = scope === "aktif" ? (active ? [active] : []) : items.filter((i) => i.status === "done");
    if (!targets.length) return setNotice("Belum ada foto yang siap dicetak.");
    const [rw, rh] = RATIOS[ratio];
    const wmm = rw * 10,
      hmm = rh * 10;
    const P = PAPERS[paper];
    const cols = Math.max(1, Math.floor((P.w - 2 * P.m + P.gap) / (wmm + P.gap)));
    const rows = Math.max(1, Math.floor((P.h - 2 * P.m + P.gap) / (hmm + P.gap)));
    const per = cols * rows;
    const printBg = bg.mode === "transparent" ? { ...bg, mode: "solid", c1: "#ffffff" } : bg;
    const urls = targets.map((it) =>
      renderPhoto(buildSubject(it, adj), printBg, ratio, 300, it.zoom, it.ox, it.oy, cl).toDataURL("image/jpeg", 0.95)
    );
    const list = [];
    urls.forEach((u) => {
      for (let k = 0; k < copies; k++) list.push(u);
    });
    let pages = "";
    for (let i = 0; i < list.length; i += per) {
      pages += `<div class="pg">${list
        .slice(i, i + per)
        .map((u) => `<img src="${u}">`)
        .join("")}</div>`;
    }
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Lembar foto ${ratio}</title><style>
@page{size:${P.w}mm ${P.h}mm;margin:0}*{box-sizing:border-box}html,body{margin:0}
.pg{width:${P.w}mm;height:${P.h}mm;padding:${P.m}mm;display:flex;flex-wrap:wrap;align-content:flex-start;gap:${P.gap}mm;page-break-after:always;overflow:hidden}
.pg:last-child{page-break-after:auto}
img{width:${wmm}mm;height:${hmm}mm;display:block;outline:0.1mm solid #bbb}
</style></head><body>${pages}</body></html>`;
    const fr = document.createElement("iframe");
    fr.style.cssText = "position:fixed;width:0;height:0;border:0;right:0;bottom:0";
    fr.srcdoc = html;
    fr.onload = () =>
      setTimeout(() => {
        fr.contentWindow.focus();
        fr.contentWindow.print();
      }, 400);
    document.body.appendChild(fr);
    setTimeout(() => fr.remove(), 180000);
  };

  const doneCount = items.filter((i) => i.status === "done").length;
  const [rw, rh] = RATIOS[ratio];

  /* ───────────────────────── Tampilan ───────────────────────── */
  return (
    <Layout
      title="Edit Foto Latar"
      subtitle="Ganti latar foto siswa untuk raport, ijazah, dan berkas lain. Foto diproses di perangkat ini dan tidak diunggah ke server."
    >
      <div className="ef-root">
        <style>{CSS}</style>

        {notice && (
          <div className="ef-notice" role="status">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice("")}>
              Tutup
            </button>
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        <input ref={bgFileRef} type="file" accept="image/*" hidden onChange={(e) => { pickBgImage(e.target.files[0]); e.target.value = ""; }} />

        <div className="ef-chips">
          <button type="button" className={"ef-chip" + (tab === "foto" ? " on" : "")} onClick={() => setTab("foto")}>Foto siswa</button>
          <button type="button" className={"ef-chip" + (tab === "dokumen" ? " on" : "")} onClick={() => setTab("dokumen")}>Dokumen</button>
        </div>
        {tab === "dokumen" && <HapusLatarDokumen onNotice={setNotice} />}

        <div className="ef-grid" style={{ display: tab === "foto" ? undefined : "none" }}>
          {/* ───────── Kiri: pratinjau ───────── */}
          <section className="ef-stage" aria-label="Pratinjau foto">
            {!active ? (
              <div
                className="ef-drop"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  addFiles(e.dataTransfer.files);
                }}
              >
                <strong>Mulai dengan memilih foto siswa</strong>
                <span>Bisa banyak foto sekaligus. Latar lama dihapus otomatis.</span>
                <div className="ef-btns">
                  <button type="button" className="ef-btn pri" onClick={() => fileRef.current.click()}>
                    Pilih foto
                  </button>
                  <button type="button" className="ef-btn" onClick={() => camRef.current.click()}>
                    Ambil dengan kamera
                  </button>
                </div>
                <small>Atau tarik berkas ke kotak ini.</small>
              </div>
            ) : (
              <>
                <div
                  className="ef-frame"
                  ref={frameRef}
                  style={{ width: `min(100%, ${rw === rh ? 340 : rh > rw * 1.4 ? 300 : 340}px)`, background: bgCss(bg.mode === "transparent" ? bg : { mode: "transparent" }) }}
                  onPointerDown={onDown}
                  onPointerMove={onMove}
                  onPointerUp={onUp}
                  onPointerCancel={onUp}
                >
                  <canvas ref={previewRef} />
                  {guides && !showOrig && (
                    <div className="ef-guides" aria-hidden="true">
                      <i style={{ left: "50%", top: 0, bottom: 0, width: 0, borderLeft: "1px dashed rgba(255,255,255,.7)" }} />
                      <i style={{ top: "8%", left: 0, right: 0, height: 0, borderTop: "1px dashed rgba(255,255,255,.7)" }} />
                    </div>
                  )}
                  {active.status === "busy" && (
                    <div className="ef-busy" role="status">
                      <span className="ef-spin" />
                      <b>{active.msg || "Memproses…"}</b>
                    </div>
                  )}
                  {active.status === "error" && (
                    <div className="ef-busy" role="alert">
                      <b>{active.msg}</b>
                    </div>
                  )}
                </div>
                <p className="ef-hint">Geser foto di bingkai untuk memindahkan posisi. Ukuran {rw} × {rh} cm.</p>

                <div className="ef-tools">
                  <label className="ef-row ef-grow">
                    <span className="ef-rowlab">
                      Perbesar / perkecil<b>{Math.round(active.zoom * 100)}%</b>
                    </span>
                    <input type="range" min="0.6" max="1.8" step="0.01" value={active.zoom} onChange={(e) => patch(active.id, { zoom: Number(e.target.value) })} />
                  </label>
                  <button type="button" className="ef-btn" onClick={() => patch(active.id, { zoom: 1, ox: 0, oy: 0 })}>
                    Posisi otomatis
                  </button>
                  <button
                    type="button"
                    className="ef-btn"
                    onPointerDown={() => setShowOrig(true)}
                    onPointerUp={() => setShowOrig(false)}
                    onPointerLeave={() => setShowOrig(false)}
                  >
                    Tahan: lihat asli
                  </button>
                  <label className="ef-check">
                    <input type="checkbox" checked={guides} onChange={(e) => setGuides(e.target.checked)} /> Garis bantu
                  </label>
                </div>
              </>
            )}

            {items.length > 0 && (
              <div className="ef-strip" role="list" aria-label="Daftar foto">
                {items.map((it) => (
                  <div key={it.id} role="listitem" className={"ef-thumb" + (it.id === activeId ? " on" : "")}>
                    <button type="button" onClick={() => setActiveId(it.id)} aria-label={`Pilih ${it.label}`}>
                      <img src={it.thumb} alt="" />
                      <span className={"ef-badge " + it.status}>
                        {it.status === "done" ? "Siap" : it.status === "busy" ? "Proses" : it.status === "error" ? "Gagal" : "Antre"}
                      </span>
                    </button>
                    <button type="button" className="ef-x" onClick={() => removeItem(it.id)} aria-label={`Hapus ${it.label}`}>
                      ×
                    </button>
                  </div>
                ))}
                <button type="button" className="ef-add" onClick={() => fileRef.current.click()}>
                  + Tambah foto
                </button>
              </div>
            )}
          </section>

          {/* ───────── Kanan: pengaturan ───────── */}
          <aside className="ef-panel">
            <fieldset>
              <legend>1. Hapus latar lama</legend>
              <div className="ef-chips">
                <Chip active={method === "ai"} onClick={() => setMethod("ai")}>
                  AI (akurat)
                </Chip>
                <Chip active={method === "fast"} onClick={() => setMethod("fast")}>
                  Cepat (latar polos)
                </Chip>
              </div>
              <p className="ef-note">
                {method === "ai"
                  ? "Cocok untuk latar apa saja. Pertama kali memuat model dari internet, setelah itu lebih cepat."
                  : "Tanpa internet. Paling baik jika latar lama satu warna, misalnya dinding putih atau kain biru."}
              </p>
              {method === "fast" && <Slider label="Kepekaan warna latar" value={tol} min={15} max={120} onChange={setTol} />}
              <div className="ef-btns">
                <button type="button" className="ef-btn" disabled={!active} onClick={() => active && enqueue(active)}>
                  Proses ulang foto ini
                </button>
                <button type="button" className="ef-btn" disabled={!items.length} onClick={() => items.forEach(enqueue)}>
                  Proses ulang semua
                </button>
              </div>
            </fieldset>

            <fieldset>
              <legend>2. Latar baru</legend>
              <div className="ef-swatches">
                {LATAR.map((p) => (
                  <button key={p.id} type="button" className={"ef-sw" + (bg.id === p.id ? " on" : "")} onClick={() => pickPreset(p)} aria-pressed={bg.id === p.id}>
                    <i style={{ background: bgCss({ ...p, c2: p.c2 || shade(p.c1, -0.3) }) }} />
                    <span>{p.nama}</span>
                  </button>
                ))}
                <button type="button" className={"ef-sw" + (bg.id === "gambar" ? " on" : "")} onClick={() => bgFileRef.current.click()}>
                  <i className="img">+</i>
                  <span>Gambar</span>
                </button>
              </div>
              {bg.mode !== "transparent" && bg.mode !== "image" && (
                <>
                  <div className="ef-chips">
                    <Chip active={bg.mode === "solid"} onClick={() => setBg((b) => ({ ...b, mode: "solid" }))}>
                      Polos
                    </Chip>
                    <Chip active={bg.mode === "linear"} onClick={() => setBg((b) => ({ ...b, mode: "linear" }))}>
                      Gradasi atas–bawah
                    </Chip>
                    <Chip active={bg.mode === "radial"} onClick={() => setBg((b) => ({ ...b, mode: "radial" }))}>
                      Sorot tengah
                    </Chip>
                  </div>
                  <div className="ef-colors">
                    <label>
                      Warna {bg.mode === "solid" ? "latar" : "utama"}
                      <input type="color" value={bg.c1} onChange={(e) => setColor1(e.target.value)} />
                    </label>
                    {bg.mode !== "solid" && (
                      <label>
                        Warna tepi
                        <input type="color" value={bg.c2} onChange={(e) => setColor2(e.target.value)} />
                      </label>
                    )}
                  </div>
                </>
              )}
              <p className="ef-note">Cek ketentuan warna latar dari sekolah atau dinas pendidikan untuk tiap jenis dokumen.</p>
            </fieldset>

            <fieldset>
              <legend>3. Ukuran foto</legend>
              <div className="ef-chips">
                {Object.keys(RATIOS).map((k) => (
                  <Chip key={k} active={ratio === k} onClick={() => setRatio(k)}>
                    {RATIOS[k][0]} × {RATIOS[k][1]} cm
                  </Chip>
                ))}
              </div>
              <div className="ef-two">
                <label>
                  Resolusi
                  <select value={dpi} onChange={(e) => setDpi(Number(e.target.value))}>
                    <option value={300}>300 dpi (standar cetak)</option>
                    <option value={600}>600 dpi (lebih tajam)</option>
                  </select>
                </label>
                <label>
                  Format
                  <select value={format} onChange={(e) => setFormat(e.target.value)} disabled={bg.mode === "transparent"}>
                    <option value="jpg">JPG (ringan)</option>
                    <option value="png">PNG</option>
                  </select>
                </label>
              </div>
            </fieldset>

            <PanelPakaian cl={cl} setCl={setCl} onNotice={setNotice} />

            <fieldset>
              <legend>5. Alat otomatis dan penyesuaian</legend>
              <label className="ef-check">
                <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Perbaiki cahaya dan kontras otomatis
              </label>
              <label className="ef-check">
                <input type="checkbox" checked={autoCrop} onChange={(e) => setAutoCrop(e.target.checked)} /> Crop otomatis (kepala dan bahu)
              </label>
              <p className="ef-note">Foto setengah badan atau seluruh badan dipotong otomatis ke kepala dan bahu, lalu diposisikan sesuai ukuran foto. Matikan jika foto sudah pas.</p>
              <Slider label="Kecerahan" value={bright} min={-40} max={40} onChange={setBright} />
              <Slider label="Kontras" value={contrast} min={-40} max={40} onChange={setContrast} />
              <Slider label="Warna (saturasi)" value={sat} min={-40} max={40} onChange={setSat} />
              <Slider label="Ketajaman" value={sharp} min={0} max={100} onChange={setSharp} />
              <Slider label="Haluskan kulit" value={smooth} min={0} max={100} onChange={setSmooth} />
              <Slider label="Cerahkan kulit" value={glow} min={0} max={30} onChange={setGlow} />
              <Slider label="Haluskan tepi rambut dan bahu" value={feather} min={0} max={6} onChange={setFeather} />
              <Slider label="Kikis tepi (hilangkan sisa latar lama)" value={shrink} min={0} max={6} onChange={setShrink} />
              <p className="ef-note">Untuk dokumen resmi, pakai efek haluskan dan cerahkan secukupnya, dan ikuti ketentuan sekolah atau dinas.</p>
            </fieldset>

            <fieldset>
              <legend>6. Simpan dan cetak</legend>
              {active && (
                <label className="ef-name">
                  Nama berkas foto ini
                  <input type="text" value={active.label} onChange={(e) => patch(active.id, { label: e.target.value })} />
                </label>
              )}
              <div className="ef-btns">
                <button type="button" className="ef-btn pri" disabled={!active || active.status !== "done" || busyExport} onClick={exportActive}>
                  Unduh foto ini
                </button>
                <button type="button" className="ef-btn" disabled={!doneCount || busyExport} onClick={exportAll}>
                  Unduh semua ({doneCount})
                </button>
              </div>

              <div className="ef-two">
                <label>
                  Kertas
                  <select value={paper} onChange={(e) => setPaper(e.target.value)}>
                    {Object.entries(PAPERS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.nama}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Jumlah per foto
                  <input type="number" min="1" max="100" value={copies} onChange={(e) => setCopies(clamp(Number(e.target.value) || 1, 1, 100))} />
                </label>
              </div>
              <label className="ef-name">
                Isi lembar dengan
                <select value={scope} onChange={(e) => setScope(e.target.value)}>
                  <option value="aktif">Foto yang sedang dibuka</option>
                  <option value="semua">Semua foto yang sudah siap</option>
                </select>
              </label>
              <button type="button" className="ef-btn" disabled={!active || (scope === "semua" && !doneCount)} onClick={cetakLembar}>
                Cetak lembar foto
              </button>
              <p className="ef-note">Di jendela cetak, pilih skala 100% (tanpa “fit to page”) agar ukuran foto pas.</p>
            </fieldset>
          </aside>
        </div>
      </div>
    </Layout>
  );
}

/* ───────────────────────── Gaya ───────────────────────── */

const CSS = `
.ef-root{--ink:#1b2430;--mute:#5d6877;--line:#dde1e7;--soft:#f4f5f7;--acc:#2b3fa0;color:var(--ink);max-width:1180px;margin:0 auto;font-size:14px;line-height:1.45}
.ef-root *{box-sizing:border-box}
.ef-notice{display:flex;gap:12px;justify-content:space-between;align-items:center;margin-bottom:14px;padding:10px 14px;background:#fff7e0;border:1px solid #f0d98a;border-radius:8px}
.ef-notice button{border:0;background:none;color:var(--acc);font-weight:600;cursor:pointer}
.ef-grid{display:grid;grid-template-columns:minmax(0,1fr) 390px;gap:22px;align-items:start}
@media(max-width:920px){.ef-grid{grid-template-columns:1fr}}
.ef-stage{background:var(--soft);border:1px solid var(--line);border-radius:12px;padding:18px;position:sticky;top:8px}
@media(max-width:920px){.ef-stage{position:static}}
.ef-frame{position:relative;margin:0 auto;touch-action:none;cursor:grab;border-radius:4px;overflow:hidden;box-shadow:0 1px 0 rgba(0,0,0,.08),0 8px 24px rgba(20,30,50,.18);user-select:none}
.ef-frame:active{cursor:grabbing}
.ef-frame canvas{display:block;width:100%;height:auto}
.ef-guides i{position:absolute;pointer-events:none}
.ef-busy{position:absolute;inset:0;display:flex;flex-direction:column;gap:10px;align-items:center;justify-content:center;background:rgba(20,28,40,.55);color:#fff;text-align:center;padding:16px}
.ef-spin{width:26px;height:26px;border-radius:50%;border:3px solid rgba(255,255,255,.35);border-top-color:#fff;animation:ef-r .8s linear infinite}
@keyframes ef-r{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){.ef-spin{animation-duration:2.4s}}
.ef-hint{text-align:center;color:var(--mute);margin:10px 0 0;font-size:13px}
.ef-tools{display:flex;flex-wrap:wrap;gap:10px 14px;align-items:flex-end;margin-top:12px}
.ef-grow{flex:1 1 200px}
.ef-drop{display:flex;flex-direction:column;gap:10px;align-items:center;text-align:center;padding:48px 20px;border:2px dashed #b9c0cc;border-radius:10px;background:#fff}
.ef-drop strong{font-size:17px}
.ef-drop span,.ef-drop small{color:var(--mute)}
.ef-btns{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 0}
.ef-btn{padding:9px 14px;border:1px solid #b9c0cc;background:#fff;color:var(--ink);border-radius:8px;font:inherit;font-weight:600;cursor:pointer}
.ef-btn.pri{background:var(--acc);border-color:var(--acc);color:#fff}
.ef-btn:disabled{opacity:.45;cursor:not-allowed}
.ef-btn:focus-visible,.ef-chip:focus-visible,.ef-sw:focus-visible,.ef-thumb button:focus-visible,.ef-add:focus-visible,.ef-root input:focus-visible,.ef-root select:focus-visible{outline:3px solid #8aa0ff;outline-offset:2px}
.ef-strip{display:flex;gap:10px;overflow-x:auto;margin-top:16px;padding-bottom:4px}
.ef-thumb{position:relative;flex:0 0 auto}
.ef-thumb>button:first-child{display:block;border:2px solid transparent;border-radius:8px;padding:0;background:#fff;cursor:pointer;overflow:hidden;position:relative}
.ef-thumb.on>button:first-child{border-color:var(--acc)}
.ef-thumb img{display:block;height:84px;width:auto;max-width:96px;object-fit:cover}
.ef-badge{position:absolute;left:0;right:0;bottom:0;font-size:11px;font-weight:700;padding:2px 0;text-align:center;background:rgba(27,36,48,.75);color:#fff}
.ef-badge.done{background:rgba(22,120,70,.9)}
.ef-badge.error{background:rgba(180,35,44,.92)}
.ef-x{position:absolute;top:-6px;right:-6px;width:22px;height:22px;border-radius:50%;border:1px solid #b9c0cc;background:#fff;color:var(--ink);cursor:pointer;line-height:1;padding:0}
.ef-add{flex:0 0 auto;min-width:84px;border:2px dashed #b9c0cc;border-radius:8px;background:none;color:var(--acc);font-weight:600;cursor:pointer}
.ef-panel{display:flex;flex-direction:column;gap:14px}
.ef-panel fieldset{margin:0;padding:14px 14px 12px;border:1px solid var(--line);border-radius:12px;background:#fff;min-width:0}
.ef-panel legend{font-weight:700;padding:0 6px;font-size:15px}
.ef-chips{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 8px}
.ef-chip{padding:7px 12px;border:1px solid #b9c0cc;border-radius:999px;background:#fff;color:var(--ink);font:inherit;cursor:pointer}
.ef-chip.on{background:var(--acc);border-color:var(--acc);color:#fff}
.ef-note{margin:6px 0 4px;color:var(--mute);font-size:12.5px}
.ef-swatches{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:4px 0 10px}
.ef-sw{display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 2px;border:2px solid transparent;border-radius:10px;background:none;font:inherit;font-size:12px;color:var(--ink);cursor:pointer}
.ef-sw i{display:block;width:44px;height:44px;border-radius:50%;border:1px solid rgba(0,0,0,.18)}
.ef-sw i.img{display:flex;align-items:center;justify-content:center;font-style:normal;font-size:22px;color:var(--mute);background:var(--soft)}
.ef-sw.on{border-color:var(--acc);background:#eef0fb}
.ef-colors{display:flex;gap:18px;flex-wrap:wrap;margin:6px 0}
.ef-colors label{display:flex;align-items:center;gap:8px}
.ef-colors input[type=color]{width:44px;height:32px;padding:0;border:1px solid #b9c0cc;border-radius:6px;background:none}
.ef-row{display:block;margin:8px 0}
.ef-rowlab{display:flex;justify-content:space-between;font-size:13px;margin-bottom:2px}
.ef-rowlab b{font-variant-numeric:tabular-nums}
.ef-row input[type=range]{width:100%;accent-color:var(--acc)}
.ef-check{display:flex;align-items:center;gap:8px;margin:4px 0}
.ef-two{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:8px 0}
@media(max-width:420px){.ef-two{grid-template-columns:1fr}}
.ef-two label,.ef-name{display:flex;flex-direction:column;gap:4px;font-size:13px;margin:6px 0}
.ef-root select,.ef-root input[type=text],.ef-root input[type=number]{width:100%;padding:8px 10px;border:1px solid #b9c0cc;border-radius:8px;font:inherit;background:#fff;color:var(--ink)}
`;
