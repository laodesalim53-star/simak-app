// src/pages/HapusLatarDokumen.jsx
// Hapus latar dokumen — bersihkan foto/scan dokumen: bayangan dan warna kertas dihilangkan,
// atau jadikan transparan (tanda tangan, stempel, teks). Semua proses di browser (canvas).
// Unduh sebagai JPG, PNG, PDF, atau Word (.docx) — tanpa library tambahan.
// Dipakai sebagai tab di EditFotoLatar.jsx dan memakai kelas CSS "ef-*" milik halaman itu.

import { useState, useRef, useEffect } from "react";

const MAX_SRC = 2000; // sisi terpanjang gambar kerja (px)

const MODES = [
  { id: "putih", nama: "Putihkan kertas", info: "Bayangan dan warna kekuningan hilang, kertas jadi putih bersih. Cocok untuk foto atau scan dokumen biasa." },
  { id: "bw", nama: "Hitam putih (scan)", info: "Hasil mirip mesin fotokopi: teks hitam tajam di atas kertas putih. Bagus untuk dokumen teks yang akan dicetak." },
  { id: "transparan", nama: "Transparan", info: "Kertas dihapus, hanya tinta yang tersisa. Cocok untuk tanda tangan, stempel, atau logo yang akan ditempel ke dokumen lain." },
];

const FORMAT_TRANSPARAN = ["png", "pdf", "docx"];

/* ───────────────────────── Util ───────────────────────── */

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const hex2rgb = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const canvasToBlob = (c, type, q) => new Promise((res) => c.toBlob(res, type, q));
const safeName = (s) => (s || "dokumen").replace(/[^\w\- ]+/g, "_").trim() || "dokumen";
const CHECKER = "repeating-conic-gradient(#d0d3d8 0% 25%, #fff 0% 50%) 0 0 / 14px 14px";

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
  const k = Math.min(1, MAX_SRC / Math.max(src.width, src.height));
  const c = document.createElement("canvas");
  c.width = Math.round(src.width * k);
  c.height = Math.round(src.height * k);
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

/* ───────────────────────── Ekspor PDF & Word ───────────────────────── */

const enc = new TextEncoder();

const CRC_TABLE = (() => {
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
  for (let i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const concat = (parts) => {
  const len = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};

// Rata putih: untuk PDF, piksel transparan diratakan ke latar putih.
function flattenWhite(c) {
  const f = document.createElement("canvas");
  f.width = c.width;
  f.height = c.height;
  const x = f.getContext("2d");
  x.fillStyle = "#fff";
  x.fillRect(0, 0, f.width, f.height);
  x.drawImage(c, 0, 0);
  return f;
}

const blobBytes = async (blob) => new Uint8Array(await blob.arrayBuffer());

// ── PDF: satu halaman, gambar JPEG ditanam langsung (DCTDecode) ──
async function buatPDF(canvas, { sesuaiGambar }) {
  const flat = flattenWhite(canvas);
  const jpg = await blobBytes(await canvasToBlob(flat, "image/jpeg", 0.92));
  const iw = flat.width,
    ih = flat.height;

  // satuan poin (1 pt = 1/72 inci)
  let pw, ph, dw, dh, dx, dy;
  if (sesuaiGambar) {
    const k = 72 / 150; // anggap 150 dpi
    pw = dw = iw * k;
    ph = dh = ih * k;
    dx = dy = 0;
  } else {
    const landscape = iw > ih;
    pw = landscape ? 841.89 : 595.28;
    ph = landscape ? 595.28 : 841.89;
    const m = 18;
    const k = Math.min((pw - 2 * m) / iw, (ph - 2 * m) / ih);
    dw = iw * k;
    dh = ih * k;
    dx = (pw - dw) / 2;
    dy = (ph - dh) / 2;
  }
  const f = (n) => n.toFixed(2);
  const content = `q ${f(dw)} 0 0 ${f(dh)} ${f(dx)} ${f(dy)} cm /Im0 Do Q`;

  const parts = [];
  const offsets = [];
  let pos = 0;
  const push = (u8) => {
    parts.push(u8);
    pos += u8.length;
  };
  const txt = (s) => push(enc.encode(s));
  const obj = (n, body) => {
    offsets[n] = pos;
    txt(`${n} 0 obj\n${body}\nendobj\n`);
  };

  txt("%PDF-1.4\n");
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(pw)} ${f(ph)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);

  offsets[4] = pos;
  txt(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${iw} /Height ${ih} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`);
  push(jpg);
  txt("\nendstream\nendobj\n");

  obj(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);

  const xref = pos;
  txt(`xref\n0 6\n0000000000 65535 f \n`);
  for (let n = 1; n <= 5; n++) txt(`${String(offsets[n]).padStart(10, "0")} 00000 n \n`);
  txt(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);

  return new Blob([concat(parts)], { type: "application/pdf" });
}

// ── ZIP tanpa kompresi (cukup untuk DOCX; gambar sudah terkompresi) ──
function buatZip(files) {
  const local = [];
  const central = [];
  let offset = 0;
  const d = new Date();
  const dosTime = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const dosDate = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();

  for (const { name, data } of files) {
    const nm = enc.encode(name);
    const crc = crc32(data);

    const lh = new Uint8Array(30 + nm.length);
    const lv = new DataView(lh.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, dosTime, true);
    lv.setUint16(12, dosDate, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nm.length, true);
    lv.setUint16(28, 0, true);
    lh.set(nm, 30);

    const ch = new Uint8Array(46 + nm.length);
    const cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, dosTime, true);
    cv.setUint16(14, dosDate, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nm.length, true);
    cv.setUint32(42, offset, true);
    ch.set(nm, 46);

    local.push(lh, data);
    central.push(ch);
    offset += lh.length + data.length;
  }

  const cdSize = central.reduce((s, p) => s + p.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);

  return concat([...local, ...central, end]);
}

// ── DOCX: satu halaman A4, gambar ditanam di tengah ──
async function buatDOCX(canvas, { transparan }) {
  const png = transparan;
  const bytes = await blobBytes(await canvasToBlob(canvas, png ? "image/png" : "image/jpeg", 0.92));
  const ext = png ? "png" : "jpg";
  const iw = canvas.width,
    ih = canvas.height;

  // ukuran halaman (twips; 1 twip = 635 EMU)
  const landscape = !transparan && iw > ih;
  const PW = landscape ? 16838 : 11906;
  const PH = landscape ? 11906 : 16838;
  const M = 567; // margin 1 cm
  const areaW = PW - 2 * M;
  const areaH = PH - 2 * M;

  let cxT, cyT;
  if (transparan) {
    // tanda tangan/stempel: lebar awal 6 cm (bisa diubah di Word)
    cxT = Math.min(areaW, 3402);
    cyT = (cxT * ih) / iw;
  } else {
    const k = Math.min(areaW / iw, (areaH * 0.97) / ih);
    cxT = iw * k;
    cyT = ih * k;
  }
  const cx = Math.round(cxT * 635),
    cy = Math.round(cyT * 635);

  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body><w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="${transparan ? "left" : "center"}"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="1" name="Dokumen" descr="Dokumen yang sudah dibersihkan"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="dokumen.${ext}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p><w:sectPr><w:pgSz w:w="${PW}" w:h="${PH}"${landscape ? ' w:orient="landscape"' : ""}/><w:pgMar w:top="${M}" w:right="${M}" w:bottom="${M}" w:left="${M}" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="${ext}" ContentType="image/${png ? "png" : "jpeg"}"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;

  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.${ext}"/></Relationships>`;

  const zip = buatZip([
    { name: "[Content_Types].xml", data: enc.encode(contentTypes) },
    { name: "_rels/.rels", data: enc.encode(rels) },
    { name: "word/document.xml", data: enc.encode(docXml) },
    { name: "word/_rels/document.xml.rels", data: enc.encode(docRels) },
    { name: `word/media/image1.${ext}`, data: bytes },
  ]);
  return new Blob([zip], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

function simpanBlob(blob, namaFile) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = namaFile;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ───────────────────────── Filter dasar ───────────────────────── */

function maxFilter(a, w, h, r) {
  const t = new Uint8ClampedArray(a.length);
  const o = new Uint8ClampedArray(a.length);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let m = 0;
      const x0 = Math.max(0, x - r),
        x1 = Math.min(w - 1, x + r);
      for (let k = x0; k <= x1; k++) if (a[row + k] > m) m = a[row + k];
      t[row + x] = m;
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let m = 0;
      const y0 = Math.max(0, y - r),
        y1 = Math.min(h - 1, y + r);
      for (let k = y0; k <= y1; k++) if (t[k * w + x] > m) m = t[k * w + x];
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

/* ───────────── Crop otomatis + luruskan kertas ───────────── */

// Cari kertas (area terang terbesar), buang meja di sekelilingnya, lalu
// luruskan perspektifnya kalau fotonya miring. Kalau kertas sudah memenuhi
// bingkai atau tidak ketemu, gambar dikembalikan apa adanya.

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function warpQuad(src, q, W, H) {
  const w = src.width,
    h = src.height;
  const sd = src.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  const [p0, p1, p2, p3] = q; // kiri-atas, kanan-atas, kanan-bawah, kiri-bawah
  const sx = p0[0] - p1[0] + p2[0] - p3[0];
  const sy = p0[1] - p1[1] + p2[1] - p3[1];
  let A, B, D, E, G, K;
  if (Math.abs(sx) < 1e-6 && Math.abs(sy) < 1e-6) {
    A = p1[0] - p0[0];
    B = p3[0] - p0[0];
    D = p1[1] - p0[1];
    E = p3[1] - p0[1];
    G = 0;
    K = 0;
  } else {
    const dx1 = p1[0] - p2[0],
      dx2 = p3[0] - p2[0],
      dy1 = p1[1] - p2[1],
      dy2 = p3[1] - p2[1];
    const den = dx1 * dy2 - dx2 * dy1 || 1e-9;
    G = (sx * dy2 - dx2 * sy) / den;
    K = (dx1 * sy - sx * dy1) / den;
    A = p1[0] - p0[0] + G * p1[0];
    B = p3[0] - p0[0] + K * p3[0];
    D = p1[1] - p0[1] + G * p1[1];
    E = p3[1] - p0[1] + K * p3[1];
  }
  const C = p0[0],
    F = p0[1];

  const out = new ImageData(W, H);
  const od = out.data;
  let o = 0;
  for (let j = 0; j < H; j++) {
    const v = (j + 0.5) / H;
    for (let i = 0; i < W; i++) {
      const u = (i + 0.5) / W;
      const den = G * u + K * v + 1;
      const x = (A * u + B * v + C) / den - 0.5;
      const y = (D * u + E * v + F) / den - 0.5;
      const xi = Math.floor(x),
        yi = Math.floor(y);
      const fx = x - xi,
        fy = y - yi;
      const xa = clamp(xi, 0, w - 1),
        xb = clamp(xi + 1, 0, w - 1);
      const ya = clamp(yi, 0, h - 1),
        yb = clamp(yi + 1, 0, h - 1);
      const i00 = (ya * w + xa) * 4,
        i10 = (ya * w + xb) * 4,
        i01 = (yb * w + xa) * 4,
        i11 = (yb * w + xb) * 4;
      for (let c = 0; c < 3; c++) {
        const top = sd[i00 + c] * (1 - fx) + sd[i10 + c] * fx;
        const bot = sd[i01 + c] * (1 - fx) + sd[i11 + c] * fx;
        od[o + c] = top * (1 - fy) + bot * fy;
      }
      od[o + 3] = 255;
      o += 4;
    }
  }
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  c.getContext("2d", { willReadFrequently: true }).putImageData(out, 0, 0);
  return c;
}

function cropRect(src, x0, y0, x1, y1) {
  const cw = Math.max(2, Math.round(x1 - x0)),
    ch = Math.max(2, Math.round(y1 - y0));
  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  out.getContext("2d", { willReadFrequently: true }).drawImage(src, Math.round(x0), Math.round(y0), cw, ch, 0, 0, cw, ch);
  return out;
}

function autoCropPaper(src) {
  const w = src.width,
    h = src.height;
  const k = Math.max(w, h) / 400;
  const sw = Math.max(2, Math.round(w / k)),
    sh = Math.max(2, Math.round(h / k));
  const sm = document.createElement("canvas");
  sm.width = sw;
  sm.height = sh;
  const sctx = sm.getContext("2d", { willReadFrequently: true });
  sctx.drawImage(src, 0, 0, sw, sh);
  const px = sctx.getImageData(0, 0, sw, sh).data;

  const lum = new Uint8Array(sw * sh);
  const hist = new Uint32Array(256);
  for (let i = 0; i < sw * sh; i++) {
    const v = (px[i * 4] * 299 + px[i * 4 + 1] * 587 + px[i * 4 + 2] * 114) / 1000;
    lum[i] = v;
    hist[v | 0]++;
  }

  // ambang Otsu: pisahkan area terang (kertas) dari area gelap (meja)
  const total = sw * sh;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sB = 0,
    wB = 0,
    best = 0,
    thr = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sB += t * hist[t];
    const mB = sB / wB,
      mF = (sum - sB) / wF;
    const v = wB * wF * (mB - mF) * (mB - mF);
    if (v > best) {
      best = v;
      thr = t;
    }
  }

  // komponen terang terbesar = kertas; catat empat sudut terjauhnya
  const lab = new Uint8Array(total);
  const stack = new Int32Array(total);
  let top = null;
  for (let s = 0; s < total; s++) {
    if (lab[s] || lum[s] <= thr) continue;
    let sp = 0,
      n = 0;
    let minS = Infinity,
      maxS = -Infinity,
      minT = Infinity,
      maxT = -Infinity;
    let tl = null,
      br = null,
      tr = null,
      bl = null;
    stack[sp++] = s;
    lab[s] = 1;
    while (sp > 0) {
      const p = stack[--sp];
      n++;
      const x = p % sw,
        y = (p / sw) | 0;
      const a = x + y,
        b = x - y;
      if (a < minS) (minS = a), (tl = [x, y]);
      if (a > maxS) (maxS = a), (br = [x, y]);
      if (b > maxT) (maxT = b), (tr = [x, y]);
      if (b < minT) (minT = b), (bl = [x, y]);
      if (x > 0 && !lab[p - 1] && lum[p - 1] > thr) (lab[p - 1] = 1), (stack[sp++] = p - 1);
      if (x < sw - 1 && !lab[p + 1] && lum[p + 1] > thr) (lab[p + 1] = 1), (stack[sp++] = p + 1);
      if (y > 0 && !lab[p - sw] && lum[p - sw] > thr) (lab[p - sw] = 1), (stack[sp++] = p - sw);
      if (y < sh - 1 && !lab[p + sw] && lum[p + sw] > thr) (lab[p + sw] = 1), (stack[sp++] = p + sw);
    }
    if (!top || n > top.n) top = { n, tl, tr, br, bl };
  }
  if (!top || top.n < total * 0.15) return src;

  // sudut piksel terluar, dikembalikan ke ukuran asli
  const fx = w / sw,
    fy = h / sh;
  let q = [
    [top.tl[0] * fx, top.tl[1] * fy],
    [(top.tr[0] + 1) * fx, top.tr[1] * fy],
    [(top.br[0] + 1) * fx, (top.br[1] + 1) * fy],
    [top.bl[0] * fx, (top.bl[1] + 1) * fy],
  ];

  // luas segi empat (rumus tali sepatu); kalau hampir sebesar gambar, tidak perlu crop
  let area = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i],
      b = q[(i + 1) % 4];
    area += a[0] * b[1] - b[0] * a[1];
  }
  area = Math.abs(area) / 2;
  if (area > w * h * 0.93) return src;

  // bentuk bukan segi empat (misalnya kertas terlipat atau tertutup tangan): potong persegi saja
  const rectOnly = top.n * k * k < area * 0.75;

  // geser sudut sedikit ke dalam supaya tepi meja tidak ikut
  const cx = (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4,
    cy = (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4;
  q = q.map(([x, y]) => [x + (cx - x) * 0.015, y + (cy - y) * 0.015]);

  const dev = 0.012 * Math.max(w, h);
  const straight =
    Math.abs(q[0][0] - q[3][0]) < dev && Math.abs(q[1][0] - q[2][0]) < dev && Math.abs(q[0][1] - q[1][1]) < dev && Math.abs(q[3][1] - q[2][1]) < dev;
  if (straight || rectOnly) {
    const xs = q.map((p) => p[0]),
      ys = q.map((p) => p[1]);
    return cropRect(src, Math.max(0, Math.min(...xs)), Math.max(0, Math.min(...ys)), Math.min(w, Math.max(...xs)), Math.min(h, Math.max(...ys)));
  }

  // foto miring: luruskan jadi persegi panjang
  let W = Math.round((dist(q[0], q[1]) + dist(q[3], q[2])) / 2);
  let H = Math.round((dist(q[0], q[3]) + dist(q[1], q[2])) / 2);
  const sc = Math.min(1, MAX_SRC / Math.max(W, H));
  W = Math.max(2, Math.round(W * sc));
  H = Math.max(2, Math.round(H * sc));
  return warpQuad(src, q, W, H);
}

/* ───────────── Perkiraan warna kertas (untuk meratakan cahaya) ───────────── */

// Gambar dikecilkan, huruf dihapus dengan filter "maks", lalu dihaluskan.
// Hasilnya = warna kertas polos di tiap titik, termasuk bayangan dan semburat warna.
function estimateBackground(src) {
  const w = src.width,
    h = src.height;
  const k = Math.max(1, Math.round(Math.max(w, h) / 260));
  const sw = Math.max(2, Math.round(w / k)),
    sh = Math.max(2, Math.round(h / k));
  const sm = document.createElement("canvas");
  sm.width = sw;
  sm.height = sh;
  const sctx = sm.getContext("2d", { willReadFrequently: true });
  sctx.imageSmoothingQuality = "high";
  sctx.drawImage(src, 0, 0, sw, sh);
  const img = sctx.getImageData(0, 0, sw, sh);
  const r = Math.max(3, Math.round(Math.min(sw, sh) * 0.05));
  for (let ch = 0; ch < 3; ch++) {
    let p = new Uint8ClampedArray(sw * sh);
    for (let i = 0; i < sw * sh; i++) p[i] = img.data[i * 4 + ch];
    p = maxFilter(p, sw, sh, r);
    p = boxBlur(p, sw, sh, Math.max(2, r >> 1));
    for (let i = 0; i < sw * sh; i++) img.data[i * 4 + ch] = p[i];
  }
  for (let i = 0; i < sw * sh; i++) img.data[i * 4 + 3] = 255;
  sctx.putImageData(img, 0, 0);

  const big = document.createElement("canvas");
  big.width = w;
  big.height = h;
  const bctx = big.getContext("2d", { willReadFrequently: true });
  bctx.imageSmoothingQuality = "high";
  bctx.drawImage(sm, 0, 0, w, h);
  return bctx.getImageData(0, 0, w, h).data;
}

/* ───────────────────────── Render hasil ───────────────────────── */

function renderDoc(work, bg, p) {
  const w = work.width,
    h = work.height;
  const s = work.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  const out = new ImageData(w, h);
  const d = out.data;
  const gain = 255 / (255 - p.clean);
  const ink = hex2rgb(p.inkColor);
  const den = 255 - p.pekat;
  let bx0 = w,
    by0 = h,
    bx1 = -1,
    by1 = -1;

  for (let i = 0, px = 0; i < d.length; i += 4, px++) {
    // bagi dengan warna kertas setempat → kertas jadi 255, bayangan hilang
    const r = Math.min(255, ((s[i] * 255) / Math.max(bg[i], 70)) * gain);
    const g = Math.min(255, ((s[i + 1] * 255) / Math.max(bg[i + 1], 70)) * gain);
    const b = Math.min(255, ((s[i + 2] * 255) / Math.max(bg[i + 2], 70)) * gain);

    if (p.mode === "putih") {
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
    } else if (p.mode === "bw") {
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      const a = clamp((p.thr - l) / 24, 0, 1);
      const v = 255 * (1 - a);
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
      d[i + 3] = 255;
    } else {
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      const a = clamp((255 - l) / den, 0, 1);
      if (a <= 0.01) continue; // piksel tetap transparan
      let cr, cg, cb;
      if (p.inkMode === "hitam") {
        cr = cg = cb = 0;
      } else if (p.inkMode === "warna") {
        cr = ink[0];
        cg = ink[1];
        cb = ink[2];
      } else {
        const inv = 255 * (1 - a);
        cr = clamp((r - inv) / a, 0, 255);
        cg = clamp((g - inv) / a, 0, 255);
        cb = clamp((b - inv) / a, 0, 255);
      }
      d[i] = cr;
      d[i + 1] = cg;
      d[i + 2] = cb;
      d[i + 3] = a * 255;
      if (a > 0.12) {
        const x = px % w,
          y = (px / w) | 0;
        if (x < bx0) bx0 = x;
        if (x > bx1) bx1 = x;
        if (y < by0) by0 = y;
        if (y > by1) by1 = y;
      }
    }
  }

  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d").putImageData(out, 0, 0);

  if (p.mode === "transparan" && p.trim && bx1 >= 0) {
    const pad = Math.round(Math.max(bx1 - bx0, by1 - by0) * 0.03) + 2;
    const x0 = Math.max(0, bx0 - pad),
      y0 = Math.max(0, by0 - pad);
    const x1 = Math.min(w, bx1 + pad + 1),
      y1 = Math.min(h, by1 + pad + 1);
    const t = document.createElement("canvas");
    t.width = x1 - x0;
    t.height = y1 - y0;
    t.getContext("2d").drawImage(c, x0, y0, t.width, t.height, 0, 0, t.width, t.height);
    return t;
  }
  return c;
}

/* ───────────────────────── Komponen ───────────────────────── */

function Slider({ label, value, min, max, onChange, hint }) {
  return (
    <label className="ef-row">
      <span className="ef-rowlab">
        {label}
        <b>{value}</b>
      </span>
      <input type="range" min={min} max={max} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      {hint && <span className="ef-note">{hint}</span>}
    </label>
  );
}

export default function HapusLatarDokumen({ onNotice }) {
  const [src, setSrc] = useState(null); // { canvas, name }
  const [mode, setMode] = useState("putih");
  const [crop, setCrop] = useState(true);
  const [clean, setClean] = useState(25);
  const [pekat, setPekat] = useState(80);
  const [thr, setThr] = useState(190);
  const [inkMode, setInkMode] = useState("asli");
  const [inkColor, setInkColor] = useState("#1b2a8a");
  const [trim, setTrim] = useState(true);
  const [format, setFormat] = useState("jpg");
  const [showOrig, setShowOrig] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");

  const fileRef = useRef(null);
  const camRef = useRef(null);
  const previewRef = useRef(null);
  const resultRef = useRef(null);
  const cacheRef = useRef(null);

  const notify = (m) => onNotice && onNotice(m);

  const addFile = async (fileList) => {
    const f = [...fileList].find((x) => x.type.startsWith("image/"));
    if (!f) return notify("Pilih berkas gambar (JPG, PNG, atau WebP).");
    try {
      const canvas = await fileToCanvas(f);
      cacheRef.current = null;
      setSrc({ canvas, name: f.name });
      setName(f.name.replace(/\.[^.]+$/, ""));
    } catch {
      notify(`Berkas ${f.name} tidak bisa dibuka.`);
    }
  };

  useEffect(() => {
    if (!src) return;
    setBusy(true);
    const t = setTimeout(() => {
      try {
        let c = cacheRef.current;
        if (!c || c.src !== src.canvas || c.crop !== crop) {
          const work = crop ? autoCropPaper(src.canvas) : src.canvas;
          c = { src: src.canvas, crop, work, bg: estimateBackground(work) };
          cacheRef.current = c;
        }
        const cv = previewRef.current;
        if (!cv) return;
        let out;
        if (showOrig) {
          out = c.work;
        } else {
          out = renderDoc(c.work, c.bg, { mode, clean, pekat, thr, inkMode, inkColor, trim });
          resultRef.current = out;
        }
        cv.width = out.width;
        cv.height = out.height;
        const ctx = cv.getContext("2d");
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.drawImage(out, 0, 0);
      } catch (e) {
        console.error(e);
        notify("Dokumen ini gagal diproses. Coba foto lain atau ukuran lebih kecil.");
      } finally {
        setBusy(false);
      }
    }, 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, mode, crop, clean, pekat, thr, inkMode, inkColor, trim, showOrig]);

  const info = MODES.find((m) => m.id === mode).info;
  const transparan = mode === "transparan";
  // format efektif: mode transparan tidak bisa JPG
  const fmt = transparan ? (FORMAT_TRANSPARAN.includes(format) ? format : "png") : format;

  const unduh = async () => {
    const out = resultRef.current;
    if (!out) return;
    const base = `${safeName(name)}_bersih`;
    try {
      if (fmt === "pdf") {
        const blob = await buatPDF(out, { sesuaiGambar: transparan });
        simpanBlob(blob, `${base}.pdf`);
      } else if (fmt === "docx") {
        const blob = await buatDOCX(out, { transparan });
        simpanBlob(blob, `${base}.docx`);
      } else {
        const png = fmt === "png";
        const blob = await canvasToBlob(out, png ? "image/png" : "image/jpeg", 0.95);
        simpanBlob(blob, `${base}.${png ? "png" : "jpg"}`);
      }
    } catch (e) {
      console.error(e);
      notify("Gagal membuat berkas. Coba format lain atau gambar yang lebih kecil.");
    }
  };

  return (
    <div className="ef-grid">
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { addFile(e.target.files); e.target.value = ""; }} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { addFile(e.target.files); e.target.value = ""; }} />

      {/* ───────── Kiri: pratinjau ───────── */}
      <section className="ef-stage" aria-label="Pratinjau dokumen">
        {!src ? (
          <div
            className="ef-drop"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              addFile(e.dataTransfer.files);
            }}
          >
            <strong>Pilih foto atau scan dokumen</strong>
            <span>Bisa dokumen teks, surat, tanda tangan, atau stempel di atas kertas.</span>
            <div className="ef-btns">
              <button type="button" className="ef-btn pri" onClick={() => fileRef.current.click()}>
                Pilih berkas
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
              style={{
                width: "min(100%, 560px)",
                cursor: "default",
                touchAction: "auto",
                background: transparan && !showOrig ? CHECKER : "#fff",
              }}
            >
              <canvas ref={previewRef} />
              {busy && (
                <div className="ef-busy" role="status">
                  <span className="ef-spin" />
                  <b>Memproses…</b>
                </div>
              )}
            </div>
            <p className="ef-hint">{src.name}</p>
            <div className="ef-tools">
              <button
                type="button"
                className="ef-btn"
                onPointerDown={() => setShowOrig(true)}
                onPointerUp={() => setShowOrig(false)}
                onPointerLeave={() => setShowOrig(false)}
              >
                Tahan: lihat asli
              </button>
              <button type="button" className="ef-btn" onClick={() => fileRef.current.click()}>
                Ganti dokumen
              </button>
            </div>
          </>
        )}
      </section>

      {/* ───────── Kanan: pengaturan ───────── */}
      <aside className="ef-panel">
        <fieldset>
          <legend>1. Hasil yang diinginkan</legend>
          <div className="ef-chips">
            {MODES.map((m) => (
              <button key={m.id} type="button" className={"ef-chip" + (mode === m.id ? " on" : "")} onClick={() => setMode(m.id)} aria-pressed={mode === m.id}>
                {m.nama}
              </button>
            ))}
          </div>
          <p className="ef-note">{info}</p>
          <label className="ef-check">
            <input type="checkbox" checked={crop} onChange={(e) => setCrop(e.target.checked)} /> Crop otomatis dan luruskan kertas
          </label>
          <p className="ef-note">Kertas dipotong dari meja di sekelilingnya dan diluruskan walau difoto miring. Berhasil jika kertas lebih terang daripada alasnya. Matikan jika dokumen sudah pas.</p>
        </fieldset>

        <fieldset>
          <legend>2. Penyesuaian</legend>
          <Slider label="Bersihkan latar" value={clean} min={0} max={60} onChange={setClean} hint="Naikkan jika masih ada bayangan atau noda tipis di kertas." />
          {mode === "bw" && <Slider label="Ketebalan huruf" value={thr} min={120} max={240} onChange={setThr} hint="Naikkan jika huruf terlalu tipis atau putus." />}
          {transparan && (
            <>
              <Slider label="Pekatkan tinta" value={pekat} min={0} max={160} onChange={setPekat} hint="Naikkan jika tanda tangan atau stempel terlihat pucat." />
              <div className="ef-chips">
                {[
                  ["asli", "Warna asli"],
                  ["hitam", "Hitam"],
                  ["warna", "Pilih warna"],
                ].map(([id, nama]) => (
                  <button key={id} type="button" className={"ef-chip" + (inkMode === id ? " on" : "")} onClick={() => setInkMode(id)} aria-pressed={inkMode === id}>
                    {nama}
                  </button>
                ))}
              </div>
              {inkMode === "warna" && (
                <div className="ef-colors">
                  <label>
                    Warna tinta
                    <input type="color" value={inkColor} onChange={(e) => setInkColor(e.target.value)} />
                  </label>
                </div>
              )}
              <label className="ef-check">
                <input type="checkbox" checked={trim} onChange={(e) => setTrim(e.target.checked)} /> Pangkas tepi kosong otomatis
              </label>
            </>
          )}
        </fieldset>

        <fieldset>
          <legend>3. Simpan</legend>
          {src && (
            <label className="ef-name">
              Nama berkas
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          )}
          <label className="ef-name">
            Format
            <select value={fmt} onChange={(e) => setFormat(e.target.value)}>
              {!transparan && <option value="jpg">JPG (ringan)</option>}
              <option value="png">PNG</option>
              <option value="pdf">PDF</option>
              <option value="docx">Word (.docx)</option>
            </select>
          </label>
          {transparan && fmt === "png" && <p className="ef-note">Hasil transparan paling aman disimpan sebagai PNG.</p>}
          {transparan && fmt === "pdf" && <p className="ef-note">PDF tidak menyimpan transparansi: latar akan jadi putih. Pakai PNG atau Word jika perlu ditempel ke dokumen lain.</p>}
          {transparan && fmt === "docx" && <p className="ef-note">Di Word, transparansi tetap terjaga. Ukuran awal 6 cm, bisa diperbesar atau dipindah.</p>}
          {!transparan && (fmt === "pdf" || fmt === "docx") && <p className="ef-note">Hasilnya satu halaman A4 berisi gambar dokumen, bukan teks yang bisa diedit.</p>}
          <div className="ef-btns">
            <button type="button" className="ef-btn pri" disabled={!src || busy} onClick={unduh}>
              Unduh {fmt === "docx" ? "Word" : fmt.toUpperCase()}
            </button>
          </div>
          <p className="ef-note">Untuk dokumen resmi, hasil ini hanya merapikan tampilan. Isi dokumen tidak diubah.</p>
        </fieldset>
      </aside>
    </div>
  );
}
