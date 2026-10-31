// src/pages/HapusLatarDokumen.jsx
// Hapus latar dokumen — bersihkan foto/scan dokumen: bayangan dan warna kertas dihilangkan,
// atau jadikan transparan (tanda tangan, stempel, teks). Semua proses di browser (canvas).
// Unduh sebagai JPG, PNG, PDF, atau Word (.docx) — tanpa library tambahan.
// Pilihan orientasi kertas (Otomatis / Portrait / Landscape) untuk PDF dan Word.
// Baca dokumen (teks, tabel, gambar) memakai tesseract.js: jalankan  npm install tesseract.js
// Dipakai sebagai tab di EditFotoLatar.jsx dan memakai kelas CSS "ef-*" milik halaman itu.

import { useState, useRef, useEffect } from "react";

const MAX_SRC = 2000; // sisi terpanjang gambar kerja (px)

const MODES = [
  { id: "putih", nama: "Putihkan kertas", info: "Bayangan dan warna kekuningan hilang, kertas jadi putih bersih. Cocok untuk foto atau scan dokumen biasa." },
  { id: "bw", nama: "Hitam putih (scan)", info: "Hasil mirip mesin fotokopi: teks hitam tajam di atas kertas putih. Bagus untuk dokumen teks yang akan dicetak." },
  { id: "transparan", nama: "Transparan", info: "Kertas dihapus, hanya tinta yang tersisa. Cocok untuk tanda tangan, stempel, atau logo yang akan ditempel ke dokumen lain." },
];

const FORMAT_TRANSPARAN = ["png", "pdf", "docx"];

// [BARU] Orientasi kertas untuk PDF dan Word
const ORIENTASI = [
  { id: "auto", nama: "Otomatis" },
  { id: "portrait", nama: "Portrait" },
  { id: "landscape", nama: "Landscape" },
];
const A4_TW = { w: 11906, h: 16838 }; // ukuran A4 dalam twips
const MARGIN_ISI_TW = 1134; // margin 2 cm
const isiTw = (landscape) => (landscape ? A4_TW.h : A4_TW.w) - 2 * MARGIN_ISI_TW; // lebar isi halaman
// "auto" mengikuti bentuk gambar (lebih lebar dari tinggi = landscape)
const adalahLandscape = (orientasi, iw, ih) => (orientasi === "landscape" ? true : orientasi === "portrait" ? false : iw > ih);

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
// [BARU] orientasi: "auto" | "portrait" | "landscape" (diabaikan bila sesuaiGambar)
async function buatPDF(canvas, { sesuaiGambar, orientasi = "auto" }) {
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
    const landscape = adalahLandscape(orientasi, iw, ih);
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
// [BARU] orientasi: "auto" | "portrait" | "landscape"
async function buatDOCX(canvas, { transparan, orientasi = "auto" }) {
  const png = transparan;
  const bytes = await blobBytes(await canvasToBlob(canvas, png ? "image/png" : "image/jpeg", 0.92));
  const ext = png ? "png" : "jpg";
  const iw = canvas.width,
    ih = canvas.height;

  // ukuran halaman (twips; 1 twip = 635 EMU)
  // auto: dokumen mengikuti bentuk gambar, tanda tangan/stempel (transparan) tetap portrait
  const landscape = orientasi === "auto" ? !transparan && iw > ih : orientasi === "landscape";
  const PW = landscape ? A4_TW.h : A4_TW.w;
  const PH = landscape ? A4_TW.w : A4_TW.h;
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

/* ───────────────────────── Baca dokumen lengkap (teks, tabel, gambar) ───────────────────────── */

// Alur: (1) cari garis tabel → sel; (2) hapus garis lalu OCR sekali; (3) tiap kata masuk ke sel tabel
// atau jadi teks bebas; (4) goresan non-teks yang tersisa dipotong jadi gambar; (5) elemen yang sejajar
// (kop surat berlogo, tanda tangan kiri-kanan) dibuat tabel tanpa garis. Hasilnya berupa HTML yang
// bisa diedit dan disalin; Word/.txt dibaca balik dari HTML itu, jadi perbaikan manual ikut terbawa.

const PT_BASE = 12;
const PT_SNAP = [8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 22, 24];

const med = (a) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  return s[s.length >> 1];
};
const escXml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escHtml = (s) => escXml(s).replace(/"/g, "&quot;");

async function salinTeks(teks) {
  try {
    await navigator.clipboard.writeText(teks);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = teks;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {}
    ta.remove();
    return ok;
  }
}

function pilihDanSalin(node) {
  const sel = window.getSelection();
  const rg = document.createRange();
  rg.selectNode(node);
  sel.removeAllRanges();
  sel.addRange(rg);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {}
  sel.removeAllRanges();
  return ok;
}

async function salinGambar(img) {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  c.getContext("2d").drawImage(img, 0, 0);
  const blob = await canvasToBlob(c, "image/png");
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

/* ── Mask piksel ── */

function buatMask(canvas) {
  const w = canvas.width,
    h = canvas.height;
  const d = canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  const dark = new Uint8Array(w * h); // tinta gelap (garis, huruf)
  const non = new Uint8Array(w * h); // apa pun yang bukan putih (termasuk foto, stempel)
  for (let i = 0, p = 0; p < w * h; i += 4, p++) {
    const l = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
    if (l < 150) dark[p] = 1;
    if (l < 225) non[p] = 1;
  }
  return { w, h, dark, non };
}

// Tandai piksel yang menjadi bagian dari garis lurus (horizontal/vertikal) sepanjang minLen.
function runMask(dark, w, h, vertical, minLen, gap = 2) {
  const out = new Uint8Array(w * h);
  const n1 = vertical ? w : h;
  const n2 = vertical ? h : w;
  for (let a = 0; a < n1; a++) {
    let start = -1,
      last = -1;
    const flush = () => {
      if (start >= 0 && last - start + 1 >= minLen) {
        for (let b = start; b <= last; b++) out[vertical ? b * w + a : a * w + b] = 1;
      }
    };
    for (let b = 0; b < n2; b++) {
      if (dark[vertical ? b * w + a : a * w + b]) {
        if (start < 0) start = b;
        last = b;
      } else if (start >= 0 && b - last > gap) {
        flush();
        start = -1;
      }
    }
    flush();
  }
  return out;
}

// Kumpulan piksel yang saling menempel (8 arah). bbox dan jumlah dihitung dari `orig` bila ada.
function findBlobs(mask, w, h, orig) {
  const seen = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  const out = [];
  for (let s = 0; s < w * h; s++) {
    if (!mask[s] || seen[s]) continue;
    let sp = 0,
      n = 0,
      x0 = w,
      y0 = h,
      x1 = -1,
      y1 = -1;
    stack[sp++] = s;
    seen[s] = 1;
    while (sp) {
      const p = stack[--sp];
      const x = p % w,
        y = (p / w) | 0;
      if (!orig || orig[p]) {
        n++;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w || (!dx && !dy)) continue;
          const q = yy * w + xx;
          if (mask[q] && !seen[q]) {
            seen[q] = 1;
            stack[sp++] = q;
          }
        }
      }
    }
    if (n) out.push({ x0, y0, x1: x1 + 1, y1: y1 + 1, n });
  }
  return out;
}

// Dari penanda per baris/kolom → posisi tengah tiap garis (garis terlalu tebal = bukan garis).
function lineBands(flags, maxThick) {
  const cs = [];
  let s = -1;
  for (let i = 0; i <= flags.length; i++) {
    if (i < flags.length && flags[i]) {
      if (s < 0) s = i;
    } else if (s >= 0) {
      if (i - s <= maxThick) cs.push((s + i - 1) / 2);
      s = -1;
    }
  }
  const m = [];
  for (const c of cs) {
    if (m.length && c - m[m.length - 1] < 8) m[m.length - 1] = (m[m.length - 1] + c) / 2;
    else m.push(c);
  }
  return m;
}

/* ── Tabel ── */

function detectTables(dark, w, h) {
  const Hm = runMask(dark, w, h, false, Math.max(40, Math.round(w * 0.04)));
  const Vm = runMask(dark, w, h, true, Math.max(40, Math.round(h * 0.03)));
  const G = new Uint8Array(w * h);
  for (let i = 0; i < G.length; i++) G[i] = Hm[i] | Vm[i];
  const blobs = findBlobs(maxFilter(G, w, h, 2), w, h, G);

  // proporsi panjang a0..a1 yang tertutup garis di sekitar pos
  const cover = (vertical, pos, a0, a1) => {
    const M = vertical ? Vm : Hm;
    const s = Math.round(a0) + 3,
      e = Math.round(a1) - 3;
    if (e <= s) return 1;
    let hit = 0;
    for (let t = s; t < e; t++) {
      for (let d = -4; d <= 4; d++) {
        const x = vertical ? Math.round(pos) + d : t;
        const y = vertical ? t : Math.round(pos) + d;
        if (x >= 0 && x < w && y >= 0 && y < h && M[y * w + x]) {
          hit++;
          break;
        }
      }
    }
    return hit / (e - s);
  };

  const tables = [];
  for (const b of blobs) {
    const bw = b.x1 - b.x0,
      bh = b.y1 - b.y0;
    if (bw < 60 || bh < 40) continue;
    const rowF = new Uint8Array(bh),
      colF = new Uint8Array(bw);
    for (let y = 0; y < bh; y++) {
      const base = (b.y0 + y) * w + b.x0;
      for (let x = 0; x < bw; x++) {
        if (Hm[base + x]) rowF[y] = 1;
        if (Vm[base + x]) colF[x] = 1;
      }
    }
    // garis pendek (misalnya garis bawah teks di dalam sel) dibuang
    const ys = lineBands(rowF, 14)
      .map((v) => v + b.y0)
      .filter((y) => cover(false, y, b.x0, b.x1) >= 0.15);
    const xs = lineBands(colF, 14)
      .map((v) => v + b.x0)
      .filter((x) => cover(true, x, b.y0, b.y1) >= 0.15);
    if (ys.length < 2 || xs.length < 2 || (ys.length - 1) * (xs.length - 1) < 2) continue;

    const R = ys.length - 1,
      C = xs.length - 1;
    const right = [],
      bottom = [];
    for (let r = 0; r < R; r++) {
      right.push([]);
      bottom.push([]);
      for (let c = 0; c < C; c++) {
        right[r].push(c === C - 1 ? true : cover(true, xs[c + 1], ys[r], ys[r + 1]) > 0.4);
        bottom[r].push(r === R - 1 ? true : cover(false, ys[r + 1], xs[c], xs[c + 1]) > 0.4);
      }
    }
    // sel yang tidak punya garis pemisah digabung (colspan / rowspan)
    const own = Array.from({ length: R }, () => Array(C).fill(false));
    const cells = [];
    for (let r = 0; r < R; r++) {
      for (let c = 0; c < C; c++) {
        if (own[r][c]) continue;
        let cs = 1;
        while (c + cs < C && !right[r][c + cs - 1] && !own[r][c + cs]) cs++;
        let rs = 1;
        grow: while (r + rs < R) {
          for (let k = c; k < c + cs; k++) if (bottom[r + rs - 1][k] || own[r + rs][k]) break grow;
          rs++;
        }
        for (let i = r; i < r + rs; i++) for (let j = c; j < c + cs; j++) own[i][j] = true;
        cells.push({ r, c, cs, rs, x0: xs[c], x1: xs[c + cs], y0: ys[r], y1: ys[r + rs], ws: [] });
      }
    }
    tables.push({ x0: xs[0], y0: ys[0], x1: xs[C], y1: ys[R], xs, ys, R, C, cells });
  }
  return { tables, G };
}

/* ── OCR kata per kata ── */

async function ocrWords(canvas, lang, onProgress) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(lang, 1, {
    logger: (m) => {
      if (m.status === "recognizing text") onProgress(Math.round(m.progress * 100));
    },
  });
  try {
    const { data } = await worker.recognize(canvas, {}, { blocks: true });
    const raw = [];
    for (const b of data.blocks || []) for (const p of b.paragraphs || []) for (const l of p.lines || []) for (const wd of l.words || []) raw.push(wd);
    if (!raw.length) for (const wd of data.words || []) raw.push(wd);
    return raw
      .filter((wd) => wd.text && wd.text.trim() && wd.bbox)
      .map((wd) => ({ t: wd.text.trim(), c: wd.confidence ?? 0, x0: wd.bbox.x0, y0: wd.bbox.y0, x1: wd.bbox.x1, y1: wd.bbox.y1 }))
      .filter((wd) => !(wd.c < 30 && wd.t.length <= 2));
  } finally {
    await worker.terminate();
  }
}

/* ── Kata → baris → paragraf ── */

const mkSeg = (ws) => ({
  ws,
  text: ws.map((x) => x.t).join(" "),
  x0: Math.min(...ws.map((x) => x.x0)),
  x1: Math.max(...ws.map((x) => x.x1)),
  y0: Math.min(...ws.map((x) => x.y0)),
  y1: Math.max(...ws.map((x) => x.y1)),
  h: med(ws.map((x) => x.y1 - x.y0)),
});

// Kata dikelompokkan jadi baris (y sama), baris dipecah jadi segmen bila ada celah lebar
// (misalnya "Nomor ..." di kiri dan "Tanggal ..." di kanan pada baris yang sama).
function groupLines(words) {
  if (!words.length) return [];
  const hh = med(words.map((x) => x.y1 - x.y0)) || 20;
  const sorted = [...words].sort((a, b) => a.y0 + a.y1 - (b.y0 + b.y1));
  const lines = [];
  for (const wd of sorted) {
    const cy = (wd.y0 + wd.y1) / 2;
    let ln = null;
    for (let i = lines.length - 1; i >= 0 && i >= lines.length - 6; i--) {
      if (Math.abs(cy - lines[i].cy) < hh * 0.6) {
        ln = lines[i];
        break;
      }
    }
    if (!ln) {
      ln = { ws: [], cy };
      lines.push(ln);
    }
    ln.ws.push(wd);
    ln.cy = ln.ws.reduce((s, x) => s + (x.y0 + x.y1) / 2, 0) / ln.ws.length;
  }
  const segs = [];
  for (const ln of lines) {
    ln.ws.sort((a, b) => a.x0 - b.x0);
    let cur = [ln.ws[0]];
    for (let i = 1; i < ln.ws.length; i++) {
      if (ln.ws[i].x0 - ln.ws[i - 1].x1 > hh * 3) {
        segs.push(mkSeg(cur));
        cur = [];
      }
      cur.push(ln.ws[i]);
    }
    segs.push(mkSeg(cur));
  }
  return segs;
}

// Baris yang menyambung (jarak rapat, huruf sama besar, baris sebelumnya penuh sampai tepi kanan)
// digabung jadi satu paragraf; selain itu tiap baris jadi paragraf sendiri.
function buildParas(segs, ext, tol) {
  const cw = Math.max(1, ext.x1 - ext.x0);
  const order = [...segs].sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
  const paras = [];
  for (const s of order) {
    let tgt = null;
    for (let i = paras.length - 1; i >= 0 && i >= paras.length - 8; i--) {
      const p = paras[i],
        prev = p.segs[p.segs.length - 1];
      const gap = s.y0 - prev.y1;
      const ratio = s.h / Math.max(1, prev.h);
      if (
        s.y0 > prev.y0 + prev.h * 0.6 &&
        gap < 0.7 * Math.max(prev.h, s.h) &&
        ratio > 0.75 &&
        ratio < 1.33 &&
        prev.x1 >= ext.x1 - tol * cw &&
        s.x0 >= p.x0 - 1.5 * s.h &&
        s.x0 <= p.x0 + 4.5 * s.h
      ) {
        tgt = p;
        break;
      }
    }
    if (tgt) {
      tgt.segs.push(s);
      tgt.x0 = Math.min(tgt.x0, s.x0);
      tgt.x1 = Math.max(tgt.x1, s.x1);
      tgt.y1 = Math.max(tgt.y1, s.y1);
    } else {
      paras.push({ segs: [s], x0: s.x0, x1: s.x1, y0: s.y0, y1: s.y1 });
    }
  }
  for (const p of paras) {
    p.text = p.segs.map((s) => s.text).join(" ");
    p.h = med(p.segs.map((s) => s.h));
  }
  return paras;
}

// Rata kiri / tengah / kanan / menjorok, dilihat dari posisi terhadap bidang tempatnya.
function place(x0, x1, ext) {
  const cw = Math.max(1, ext.x1 - ext.x0);
  const L = (x0 - ext.x0) / cw,
    Rr = (ext.x1 - x1) / cw;
  if (L > 0.05 && Rr > 0.05 && Math.abs(L - Rr) < 0.08) return { align: "center", indent: 0 };
  if (Rr < 0.05 && L > 0.2) return { align: "right", indent: 0 };
  return { align: "left", indent: L > 0.06 ? Math.min(0.8, L) : 0 };
}

/* ── Elemen → blok ── */

function paraBlock(p, ext, base, tight = false) {
  const pl = place(p.x0, p.x1, ext);
  const ratio = base ? p.h / base : 1;
  let pt = PT_BASE;
  if (ratio < 0.85 || ratio > 1.18) {
    const want = PT_BASE * ratio;
    pt = PT_SNAP.reduce((b, v) => (Math.abs(v - want) < Math.abs(b - want) ? v : b), PT_SNAP[0]);
  }
  return { t: "p", text: p.text, align: pl.align, indent: tight ? 0 : pl.indent, pt, tight };
}

function tableBlock(t, ext, base) {
  const cw = Math.max(1, ext.x1 - ext.x0),
    tw = Math.max(1, t.x1 - t.x0);
  const cols = [];
  for (let c = 0; c < t.C; c++) cols.push((t.xs[c + 1] - t.xs[c]) / tw);
  const rows = Array.from({ length: t.R }, () => []);
  for (const cell of t.cells) {
    const cx = { x0: cell.x0 + 3, x1: cell.x1 - 3 };
    const paras = buildParas(groupLines(cell.ws), cx, 0.12);
    rows[cell.r].push({ c: cell.c, cs: cell.cs, rs: cell.rs, blocks: paras.map((p) => paraBlock(p, cx, base, true)) });
  }
  for (const r of rows) r.sort((a, b) => a.c - b.c);
  return { t: "tbl", border: true, wfrac: Math.min(1, tw / cw), cols, rows };
}

function imgBlock(im, ext) {
  const cw = Math.max(1, ext.x1 - ext.x0);
  const pl = place(im.x0, im.x1, ext);
  return { t: "img", src: im.src, w: im.w, h: im.h, wfrac: Math.min(1, (im.x1 - im.x0) / cw), align: pl.align, indent: pl.indent };
}

function clusterCols(els) {
  const s = [...els].sort((a, b) => a.x0 - b.x0);
  const cols = [];
  for (const e of s) {
    const c = cols.find((k) => Math.min(k.x1, e.x1) - Math.max(k.x0, e.x0) > 0.3 * Math.min(k.x1 - k.x0, e.x1 - e.x0));
    if (c) {
      c.els.push(e);
      c.x0 = Math.min(c.x0, e.x0);
      c.x1 = Math.max(c.x1, e.x1);
    } else cols.push({ x0: e.x0, x1: e.x1, els: [e] });
  }
  return cols.sort((a, b) => a.x0 - b.x0);
}

// Urutkan dari atas ke bawah; elemen yang tumpang-tindih secara vertikal (logo di samping kop,
// tanda tangan kiri-kanan) dijadikan satu baris tabel tanpa garis.
function layoutBlocks(els, ext) {
  const sorted = [...els].sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
  const bands = [];
  for (const e of sorted) {
    const b = bands[bands.length - 1];
    if (b) {
      const ov = Math.min(b.y1, e.y1) - Math.max(b.y0, e.y0);
      if (ov > 0.3 * Math.min(b.y1 - b.y0, e.y1 - e.y0)) {
        b.els.push(e);
        b.y1 = Math.max(b.y1, e.y1);
        continue;
      }
    }
    bands.push({ els: [e], y0: e.y0, y1: e.y1 });
  }
  const cw = Math.max(1, ext.x1 - ext.x0);
  const out = [];
  for (const b of bands) {
    if (b.els.length === 1) {
      out.push(b.els[0].mk(ext));
      continue;
    }
    const cols = clusterCols(b.els);
    if (cols.length === 1) {
      [...b.els].sort((a, c) => a.y0 - c.y0).forEach((e) => out.push(e.mk(ext)));
      continue;
    }
    const bs = [ext.x0];
    for (let i = 0; i < cols.length - 1; i++) bs.push((cols[i].x1 + cols[i + 1].x0) / 2);
    bs.push(ext.x1);
    out.push({
      t: "layout",
      cols: cols.map((c, i) => ({
        wfrac: Math.max(0.05, (bs[i + 1] - bs[i]) / cw),
        blocks: [...c.els].sort((a, d) => a.y0 - d.y0).map((e) => e.mk({ x0: bs[i], x1: bs[i + 1] })),
      })),
    });
  }
  return out;
}

/* ── Gambar (sisa goresan yang bukan teks dan bukan garis tabel) ── */

function detectImages(page, m, words, tables) {
  const { w, h, non } = m;
  const rest = new Uint8Array(non);
  const clear = (x0, y0, x1, y1) => {
    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(h, Math.ceil(y1)); y++) {
      rest.fill(0, y * w + Math.max(0, Math.floor(x0)), y * w + Math.min(w, Math.ceil(x1)));
    }
  };
  for (const t of tables) clear(t.x0 - 6, t.y0 - 6, t.x1 + 7, t.y1 + 7);
  for (const wd of words) if (wd.c >= 60) clear(wd.x0 - 2, wd.y0 - 2, wd.x1 + 3, wd.y1 + 3);

  const r = Math.max(5, Math.round(Math.max(w, h) * 0.006));
  const blobs = findBlobs(maxFilter(rest, w, h, r), w, h, rest);
  const out = [];
  for (const b of blobs) {
    const bw = b.x1 - b.x0,
      bh = b.y1 - b.y0;
    if (bw < 36 || bh < 30 || b.n < 250 || bw * bh > 0.8 * w * h) continue;
    // kalau hampir seluruhnya tertutup kotak kata, itu teks yang kurang jelas, bukan gambar
    let cov = 0;
    for (const wd of words) {
      const ox = Math.min(b.x1, wd.x1) - Math.max(b.x0, wd.x0),
        oy = Math.min(b.y1, wd.y1) - Math.max(b.y0, wd.y0);
      if (ox > 0 && oy > 0) cov += ox * oy;
    }
    if (cov > 0.4 * bw * bh) continue;
    const pad = 4;
    const c = cropRect(page, Math.max(0, b.x0 - pad), Math.max(0, b.y0 - pad), Math.min(w, b.x1 + pad), Math.min(h, b.y1 + pad));
    out.push({
      x0: b.x0,
      y0: b.y0,
      x1: b.x1,
      y1: b.y1,
      w: c.width,
      h: c.height,
      src: c.width * c.height < 90000 ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.9),
    });
  }
  return out;
}

/* ── Alur utama ── */

async function bacaDokumen(page, lang, onProgress) {
  const w = page.width,
    h = page.height;
  const m = buatMask(page);
  const { tables, G } = detectTables(m.dark, w, h);

  // salinan untuk OCR: garis tabel dihapus supaya tidak terbaca sebagai huruf
  const oc = document.createElement("canvas");
  oc.width = w;
  oc.height = h;
  const octx = oc.getContext("2d", { willReadFrequently: true });
  octx.drawImage(page, 0, 0);
  if (tables.length) {
    const G1 = maxFilter(G, w, h, 1);
    const id = octx.getImageData(0, 0, w, h);
    for (const t of tables) {
      for (let y = Math.max(0, Math.floor(t.y0) - 6); y < Math.min(h, Math.ceil(t.y1) + 7); y++) {
        for (let x = Math.max(0, Math.floor(t.x0) - 6); x < Math.min(w, Math.ceil(t.x1) + 7); x++) {
          if (G1[y * w + x]) {
            const i = (y * w + x) * 4;
            id.data[i] = id.data[i + 1] = id.data[i + 2] = 255;
          }
        }
      }
    }
    octx.putImageData(id, 0, 0);
  }

  const words = await ocrWords(oc, lang, onProgress);

  // kata → sel tabel atau teks bebas
  let free = [];
  for (const wd of words) {
    const cx = (wd.x0 + wd.x1) / 2,
      cy = (wd.y0 + wd.y1) / 2;
    const t = tables.find((tb) => cx >= tb.x0 - 3 && cx <= tb.x1 + 3 && cy >= tb.y0 - 3 && cy <= tb.y1 + 3);
    if (!t) {
      free.push(wd);
      continue;
    }
    const cell = t.cells.find((c) => cx >= c.x0 && cx < c.x1 && cy >= c.y0 && cy < c.y1);
    if (cell) cell.ws.push(wd);
  }

  const imgs = detectImages(page, m, words, tables);
  free = free.filter((wd) => {
    const cx = (wd.x0 + wd.x1) / 2,
      cy = (wd.y0 + wd.y1) / 2;
    return !(wd.c < 60 && imgs.some((im) => cx >= im.x0 && cx <= im.x1 && cy >= im.y0 && cy <= im.y1));
  });

  // batas isi halaman (dipakai untuk menilai rata kiri/tengah/kanan)
  const xa = [],
    xb = [];
  free.forEach((wd) => (xa.push(wd.x0), xb.push(wd.x1)));
  [...tables, ...imgs].forEach((e) => (xa.push(e.x0), xb.push(e.x1)));
  if (!xa.length) return [];
  const ext = { x0: Math.min(...xa), x1: Math.max(...xb) };
  const base = med((free.length ? free : words).map((x) => x.y1 - x.y0)) || 20;

  const els = [];
  for (const p of buildParas(groupLines(free), ext, 0.08)) {
    els.push({ x0: p.x0, y0: p.y0, x1: p.x1, y1: p.y1, mk: (e) => paraBlock(p, e, base) });
  }
  for (const t of tables) els.push({ x0: t.x0, y0: t.y0, x1: t.x1, y1: t.y1, mk: (e) => tableBlock(t, e, base) });
  for (const im of imgs) els.push({ x0: im.x0, y0: im.y0, x1: im.x1, y1: im.y1, mk: (e) => imgBlock(im, e) });
  return layoutBlocks(els, ext);
}

/* ── Blok → HTML (pratinjau yang bisa diedit dan disalin) ── */

function blockHtml(b) {
  if (b.t === "p") {
    const st = `margin:0 0 ${b.tight ? 0 : 0.5}em;text-align:${b.align};font-size:${b.pt}px;line-height:1.35;${b.indent ? `padding-left:${(b.indent * 100).toFixed(1)}%;` : ""}`;
    return `<p data-pt="${b.pt}" data-indent="${b.indent.toFixed(3)}"${b.tight ? ' data-tight="1"' : ""} style="${st}">${escHtml(b.text).replace(/\n/g, "<br>")}</p>`;
  }
  if (b.t === "img") {
    const wp = Math.min(100, (b.wfrac / (1 - Math.min(0.8, b.indent || 0))) * 100).toFixed(1);
    return `<div data-kind="fig" data-iw="${b.w}" data-ih="${b.h}" data-w="${b.wfrac.toFixed(3)}" data-indent="${(b.indent || 0).toFixed(3)}" style="margin:6px 0 6px ${((b.indent || 0) * 100).toFixed(1)}%;text-align:${b.align}"><img src="${b.src}" alt="Gambar" style="width:${wp}%;max-width:100%;height:auto;display:inline-block;vertical-align:top"><div class="hl-alat" contenteditable="false"><button type="button" data-act="salin-gambar">Salin gambar</button><button type="button" data-act="unduh-gambar">Unduh</button></div></div>`;
  }
  const tbl =
    b.t === "layout"
      ? { border: false, wfrac: 1, cols: b.cols.map((c) => c.wfrac), rows: [b.cols.map((c) => ({ cs: 1, rs: 1, blocks: c.blocks }))] }
      : b;
  const colgroup = tbl.cols.map((f) => `<col style="width:${(f * 100).toFixed(2)}%">`).join("");
  const bd = tbl.border ? "1px solid #333" : "none";
  const rows = tbl.rows
    .map(
      (r) =>
        `<tr>${r
          .map((c) => `<td${c.cs > 1 ? ` colspan="${c.cs}"` : ""}${c.rs > 1 ? ` rowspan="${c.rs}"` : ""} style="border:${bd};padding:2px 4px;vertical-align:top">${blocksHtml(c.blocks)}</td>`)
          .join("")}</tr>`
    )
    .join("");
  const t = `<table data-kind="${tbl.border ? "tbl" : "layout"}" data-w="${tbl.wfrac.toFixed(3)}" data-cols="${tbl.cols.map((f) => f.toFixed(4)).join(",")}" style="border-collapse:collapse;table-layout:fixed;width:${(tbl.wfrac * 100).toFixed(1)}%;margin:6px 0">${colgroup}${rows}</table>`;
  return tbl.border ? `<div data-kind="tblwrap"><div class="hl-alat" contenteditable="false"><button type="button" data-act="salin-tabel">Salin tabel</button></div>${t}</div>` : t;
}
const blocksHtml = (bs) => bs.map(blockHtml).join("");

/* ── HTML (setelah diedit) → blok ── */

const BLK = "P,DIV,TABLE,IMG,UL,OL,H1,H2,H3,H4,H5,H6";

function pText(n) {
  let s = "";
  for (const c of n.childNodes) {
    if (c.nodeType === 3) s += c.nodeValue;
    else if (c.nodeName === "BR") s += "\n";
    else if (c.nodeType === 1) s += pText(c) + (/^(DIV|P|LI)$/.test(c.nodeName) ? "\n" : "");
  }
  return s;
}

const mkP = (text) => ({ t: "p", text, align: "left", indent: 0, pt: PT_BASE, tight: false });

function domP(el) {
  const text = pText(el)
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .trim();
  if (!text) return null;
  const al = el.style.textAlign;
  return {
    t: "p",
    text,
    align: al === "center" || al === "right" ? al : "left",
    indent: Number(el.dataset.indent) || 0,
    pt: Number(el.dataset.pt) || PT_BASE,
    tight: el.dataset.tight === "1",
  };
}

function domImg(im, wrap) {
  const al = wrap.style.textAlign;
  return {
    t: "img",
    src: im.src,
    w: Number(wrap.dataset.iw) || im.naturalWidth,
    h: Number(wrap.dataset.ih) || im.naturalHeight,
    wfrac: Number(wrap.dataset.w) || 0.5,
    align: al === "center" || al === "right" ? al : "left",
    indent: Number(wrap.dataset.indent) || 0,
  };
}

function domTable(el) {
  const rows = [...el.rows].map((tr) => [...tr.cells].map((td) => ({ cs: td.colSpan || 1, rs: td.rowSpan || 1, blocks: domBlocks(td) })));
  let cols = (el.dataset.cols || "").split(",").map(Number).filter((x) => x > 0);
  if (!cols.length) {
    const n = Math.max(1, ...rows.map((r) => r.reduce((s, c) => s + c.cs, 0)));
    cols = Array(n).fill(1 / n);
  }
  return { t: "tbl", border: el.dataset.kind !== "layout", wfrac: Number(el.dataset.w) || 1, cols, rows };
}

function domBlocks(root) {
  const out = [];
  for (const n of root.childNodes) {
    if (n.nodeType === 3) {
      const t = n.nodeValue.replace(/\s+/g, " ").trim();
      if (t) out.push(mkP(t));
      continue;
    }
    if (n.nodeType !== 1 || n.classList.contains("hl-alat")) continue;
    const tag = n.tagName,
      kind = n.dataset ? n.dataset.kind : "";
    if (tag === "TABLE") out.push(domTable(n));
    else if (tag === "IMG") out.push(domImg(n, n));
    else if (kind === "fig") {
      const im = n.querySelector("img");
      if (im) out.push(domImg(im, n));
    } else if (kind === "tblwrap" || (tag !== "P" && n.querySelector(BLK))) out.push(...domBlocks(n));
    else if (tag !== "BR") {
      const p = domP(n);
      if (p) out.push(p);
    }
  }
  return out;
}

/* ── Blok → teks biasa ── */

function blocksTxt(bs) {
  return bs
    .map((b) => {
      if (b.t === "p") return b.text;
      if (b.t === "img") return "[Gambar]";
      if (b.t === "layout") return b.cols.map((c) => blocksTxt(c.blocks)).join("\n");
      return b.rows.map((r) => r.map((c) => blocksTxt(c.blocks).replace(/\s*\n+\s*/g, " ")).join("\t")).join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

/* ── Blok → Word (.docx): paragraf, tabel asli (gabung sel), gambar ── */

const jcOf = (a) => (a === "center" ? "center" : a === "right" ? "right" : "left");

function pXml(b, avail) {
  const runs = b.text
    .split("\n")
    .map((l) => `<w:t xml:space="preserve">${escXml(l)}</w:t>`)
    .join("<w:br/>");
  const sz = Math.round(b.pt * 2);
  const ind = b.indent && !b.tight ? `<w:ind w:left="${Math.round(b.indent * avail)}"/>` : "";
  return `<w:p><w:pPr><w:spacing w:before="0" w:after="${b.tight ? 0 : 120}"/>${ind}<w:jc w:val="${jcOf(b.align)}"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr>${runs}</w:r></w:p>`;
}

// [BARU] ctx.maxH = tinggi gambar maksimum (twips), tergantung orientasi halaman
function imgXml(b, avail, ctx) {
  const m = ctx.media.get(b.src);
  if (!m || !b.w || !b.h) return "";
  const maxH = ctx.maxH || 13000;
  let cxT = Math.max(300, Math.min(avail, b.wfrac * avail));
  let cyT = (cxT * b.h) / b.w;
  if (cyT > maxH) {
    cxT = (cxT * maxH) / cyT;
    cyT = maxH;
  }
  const cx = Math.round(cxT * 635),
    cy = Math.round(cyT * 635),
    id = ctx.id++;
  const ind = b.indent ? `<w:ind w:left="${Math.round(b.indent * avail)}"/>` : "";
  return `<w:p><w:pPr><w:spacing w:before="0" w:after="120"/>${ind}<w:jc w:val="${jcOf(b.align)}"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="Gambar ${id}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="${m.name}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${m.rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
}

const SPACER = `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="120" w:lineRule="exact"/></w:pPr></w:p>`;

function tblXml(tb, avail, ctx) {
  const C = tb.cols.length;
  const total = Math.round(Math.min(1, tb.wfrac) * avail);
  const grid = tb.cols.map((f) => Math.max(240, Math.round(f * total)));
  const tw = grid.reduce((a, x) => a + x, 0);
  const pend = Array(C).fill(null);
  let rowsXml = "";
  for (const row of tb.rows) {
    let cells = "",
      ci = 0;
    const fillPending = () => {
      while (ci < C && pend[ci] && pend[ci].left > 0) {
        const pc = pend[ci];
        cells += `<w:tc><w:tcPr><w:tcW w:w="${pc.w}" w:type="dxa"/>${pc.cs > 1 ? `<w:gridSpan w:val="${pc.cs}"/>` : ""}<w:vMerge/></w:tcPr><w:p/></w:tc>`;
        pc.left--;
        ci += pc.cs;
      }
    };
    for (const cell of row) {
      fillPending();
      if (ci >= C) break;
      const cs = Math.max(1, Math.min(cell.cs, C - ci));
      const w = grid.slice(ci, ci + cs).reduce((a, x) => a + x, 0);
      if (cell.rs > 1) pend[ci] = { left: cell.rs - 1, cs, w };
      let inner = blocksXml(cell.blocks, Math.max(300, w - 160), ctx);
      if (!/(<\/w:p>|<w:p\/>)$/.test(inner)) inner += "<w:p/>";
      cells += `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${cs > 1 ? `<w:gridSpan w:val="${cs}"/>` : ""}${cell.rs > 1 ? '<w:vMerge w:val="restart"/>' : ""}</w:tcPr>${inner}</w:tc>`;
      ci += cs;
    }
    fillPending();
    if (cells) rowsXml += `<w:tr>${cells}</w:tr>`;
  }
  const line = (n) => `<w:${n} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`;
  const borders = tb.border ? `<w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"].map(line).join("")}</w:tblBorders>` : "";
  return `<w:tbl><w:tblPr><w:tblW w:w="${tw}" w:type="dxa"/>${borders}<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${grid.map((g) => `<w:gridCol w:w="${g}"/>`).join("")}</w:tblGrid>${rowsXml}</w:tbl>${SPACER}`;
}

function blocksXml(bs, avail, ctx) {
  return bs
    .map((b) => {
      if (b.t === "p") return pXml(b, avail);
      if (b.t === "img") return imgXml(b, avail, ctx);
      if (b.t === "layout") {
        return tblXml({ border: false, wfrac: 1, cols: b.cols.map((c) => c.wfrac), rows: [b.cols.map((c) => ({ cs: 1, rs: 1, blocks: c.blocks }))] }, avail, ctx);
      }
      return tblXml(b, avail, ctx);
    })
    .join("");
}

// [BARU] landscape: true → halaman A4 mendatar (lebar isi dan tinggi gambar maksimum ikut menyesuaikan)
async function buatDOCXModel(blocks, { landscape = false } = {}) {
  const imgs = [];
  (function walk(bs) {
    for (const b of bs) {
      if (b.t === "img") imgs.push(b);
      else if (b.t === "tbl") b.rows.forEach((r) => r.forEach((c) => walk(c.blocks)));
      else if (b.t === "layout") b.cols.forEach((c) => walk(c.blocks));
    }
  })(blocks);

  const media = new Map();
  let n = 0;
  for (const b of imgs) {
    if (media.has(b.src)) continue;
    try {
      const bytes = new Uint8Array(await (await fetch(b.src)).arrayBuffer());
      const ext = b.src.startsWith("data:image/png") ? "png" : "jpg";
      n++;
      media.set(b.src, { bytes, ext, name: `image${n}.${ext}`, rid: `rId${n}` });
    } catch {
      /* gambar yang tidak bisa dibaca dilewati */
    }
  }

  const PW = landscape ? A4_TW.h : A4_TW.w;
  const PH = landscape ? A4_TW.w : A4_TW.h;
  const maxH = PH - 2 * MARGIN_ISI_TW - 400; // sisakan sedikit ruang agar gambar tidak mendorong halaman kosong
  const ctx = { media, id: 1, maxH };
  const body = blocksXml(blocks, isiTw(landscape), ctx) || "<w:p/>";
  const sect = `<w:sectPr><w:pgSz w:w="${PW}" w:h="${PH}"${landscape ? ' w:orient="landscape"' : ""}/><w:pgMar w:top="${MARGIN_ISI_TW}" w:right="${MARGIN_ISI_TW}" w:bottom="${MARGIN_ISI_TW}" w:left="${MARGIN_ISI_TW}" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>`;
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${body}${sect}</w:body></w:document>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${[...media.values()]
    .map((m) => `<Relationship Id="${m.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${m.name}"/>`)
    .join("")}</Relationships>`;

  const zip = buatZip([
    { name: "[Content_Types].xml", data: enc.encode(contentTypes) },
    { name: "_rels/.rels", data: enc.encode(rels) },
    { name: "word/document.xml", data: enc.encode(docXml) },
    { name: "word/_rels/document.xml.rels", data: enc.encode(docRels) },
    ...[...media.values()].map((m) => ({ name: `word/media/${m.name}`, data: m.bytes })),
  ]);
  return new Blob([zip], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
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

// [BARU] Pilihan orientasi kertas (Otomatis / Portrait / Landscape)
function PilihOrientasi({ value, onChange, disabled }) {
  return (
    <div className="ef-name">
      <span>Orientasi kertas</span>
      <div className="ef-chips" role="group" aria-label="Orientasi kertas">
        {ORIENTASI.map((o) => (
          <button
            key={o.id}
            type="button"
            disabled={disabled}
            className={"ef-chip" + (value === o.id ? " on" : "")}
            onClick={() => onChange(o.id)}
            aria-pressed={value === o.id}
          >
            {o.nama}
          </button>
        ))}
      </div>
    </div>
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
  const [hasilHtml, setHasilHtml] = useState("");
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrPct, setOcrPct] = useState(0);
  const [ocrLang, setOcrLang] = useState("ind+eng");
  // [BARU] orientasi kertas: untuk unduhan gambar (PDF/Word) dan untuk Word hasil baca dokumen
  const [orientasi, setOrientasi] = useState("auto");
  const [orientasiHasil, setOrientasiHasil] = useState("auto");
  const [halamanLand, setHalamanLand] = useState(false); // bentuk foto yang dibaca (dipakai oleh mode Otomatis)

  const fileRef = useRef(null);
  const camRef = useRef(null);
  const previewRef = useRef(null);
  const resultRef = useRef(null);
  const cacheRef = useRef(null);
  const hasilRef = useRef(null);

  const notify = (m) => onNotice && onNotice(m);

  const addFile = async (fileList) => {
    const f = [...fileList].find((x) => x.type.startsWith("image/"));
    if (!f) return notify("Pilih berkas gambar (JPG, PNG, atau WebP).");
    try {
      const canvas = await fileToCanvas(f);
      cacheRef.current = null;
      setSrc({ canvas, name: f.name });
      setName(f.name.replace(/\.[^.]+$/, ""));
      setHasilHtml("");
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

  // isi pratinjau hasil baca dipasang langsung ke DOM supaya suntingan pengguna tidak ditimpa React
  useEffect(() => {
    if (hasilRef.current) hasilRef.current.innerHTML = hasilHtml;
  }, [hasilHtml]);

  const info = MODES.find((m) => m.id === mode).info;
  const transparan = mode === "transparan";
  // format efektif: mode transparan tidak bisa JPG
  const fmt = transparan ? (FORMAT_TRANSPARAN.includes(format) ? format : "png") : format;
  // [BARU] orientasi hanya relevan untuk PDF/Word; PDF transparan memakai ukuran halaman = ukuran gambar
  const tampilOrientasi = (fmt === "pdf" && !transparan) || fmt === "docx";

  const unduh = async () => {
    const out = resultRef.current;
    if (!out) return;
    const base = `${safeName(name)}_bersih`;
    try {
      if (fmt === "pdf") {
        const blob = await buatPDF(out, { sesuaiGambar: transparan, orientasi });
        simpanBlob(blob, `${base}.pdf`);
      } else if (fmt === "docx") {
        const blob = await buatDOCX(out, { transparan, orientasi });
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

  const bacaSemua = async () => {
    const c = cacheRef.current;
    if (!c || ocrBusy) return;
    setOcrBusy(true);
    setOcrPct(0);
    try {
      // selalu dibaca dari versi "putih" supaya bersih, apa pun mode yang sedang dipilih
      const page = renderDoc(c.work, c.bg, { mode: "putih", clean, pekat, thr, inkMode, inkColor, trim });
      const blocks = await bacaDokumen(page, ocrLang, setOcrPct);
      setHalamanLand(page.width > page.height); // [BARU] dipakai oleh orientasi "Otomatis"
      if (!blocks.length) notify("Tidak ada isi yang terbaca. Coba foto yang lebih jelas atau nyalakan Crop otomatis.");
      setHasilHtml(blocksHtml(blocks));
    } catch (e) {
      console.error(e);
      notify("Gagal membaca dokumen. Pastikan internet aktif untuk memuat data bahasa, lalu coba lagi.");
    } finally {
      setOcrBusy(false);
    }
  };

  const salinSemua = () => {
    const root = hasilRef.current;
    if (!root) return;
    root.setAttribute("data-copy", "1"); // sembunyikan tombol alat saat menyalin
    const sel = window.getSelection();
    const rg = document.createRange();
    rg.selectNodeContents(root);
    sel.removeAllRanges();
    sel.addRange(rg);
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {}
    sel.removeAllRanges();
    root.removeAttribute("data-copy");
    notify(ok ? "Disalin lengkap dengan tabel dan gambar. Tempel di Word." : "Gagal menyalin. Blok isinya lalu salin manual.");
  };

  const salinTeksSaja = async () => {
    if (!hasilRef.current) return;
    const ok = await salinTeks(blocksTxt(domBlocks(hasilRef.current)));
    notify(ok ? "Teks disalin." : "Gagal menyalin teks.");
  };

  const unduhHasil = async (jenis) => {
    if (!hasilRef.current) return;
    try {
      const blocks = domBlocks(hasilRef.current);
      if (jenis === "docx") {
        // [BARU] "auto" mengikuti bentuk foto yang dibaca
        const landscape = orientasiHasil === "landscape" || (orientasiHasil === "auto" && halamanLand);
        simpanBlob(await buatDOCXModel(blocks, { landscape }), `${safeName(name)}_hasil.docx`);
      } else {
        simpanBlob(new Blob([blocksTxt(blocks)], { type: "text/plain;charset=utf-8" }), `${safeName(name)}_hasil.txt`);
      }
    } catch (e) {
      console.error(e);
      notify("Gagal membuat berkas hasil.");
    }
  };

  const klikHasil = async (e) => {
    const btn = e.target.closest && e.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    try {
      if (act === "salin-tabel") {
        const t = btn.closest('[data-kind="tblwrap"]').querySelector("table");
        notify(pilihDanSalin(t) ? "Tabel disalin. Tempel di Word atau Excel." : "Gagal menyalin tabel.");
      } else {
        const im = btn.closest('[data-kind="fig"]').querySelector("img");
        if (act === "salin-gambar") {
          await salinGambar(im);
          notify("Gambar disalin.");
        } else {
          const a = document.createElement("a");
          a.href = im.src;
          a.download = `${safeName(name)}_gambar.${im.src.startsWith("data:image/png") ? "png" : "jpg"}`;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
      }
    } catch (err) {
      console.error(err);
      notify("Gagal menyalin gambar. Klik kanan gambar lalu pilih Salin gambar.");
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
          {/* [BARU] Orientasi kertas untuk PDF dan Word */}
          {tampilOrientasi && (
            <>
              <PilihOrientasi value={orientasi} onChange={setOrientasi} />
              <p className="ef-note">
                {orientasi === "auto"
                  ? transparan
                    ? "Otomatis: halaman Word berdiri (portrait) untuk tanda tangan atau stempel."
                    : "Otomatis: halaman mengikuti bentuk dokumen. Dokumen yang lebih lebar daripada tinggi memakai landscape."
                  : orientasi === "portrait"
                  ? "Kertas A4 berdiri (portrait)."
                  : "Kertas A4 mendatar (landscape)."}
              </p>
            </>
          )}
          {transparan && fmt === "png" && <p className="ef-note">Hasil transparan paling aman disimpan sebagai PNG.</p>}
          {transparan && fmt === "pdf" && <p className="ef-note">PDF tidak menyimpan transparansi: latar akan jadi putih, dan ukuran halaman mengikuti ukuran gambar. Pakai PNG atau Word jika perlu ditempel ke dokumen lain.</p>}
          {transparan && fmt === "docx" && <p className="ef-note">Di Word, transparansi tetap terjaga. Ukuran awal 6 cm, bisa diperbesar atau dipindah.</p>}
          {!transparan && (fmt === "pdf" || fmt === "docx") && <p className="ef-note">Hasilnya satu halaman A4 berisi gambar dokumen, bukan teks yang bisa diedit.</p>}
          <div className="ef-btns">
            <button type="button" className="ef-btn pri" disabled={!src || busy} onClick={unduh}>
              Unduh {fmt === "docx" ? "Word" : fmt.toUpperCase()}
            </button>
          </div>
          <p className="ef-note">Untuk dokumen resmi, hasil ini hanya merapikan tampilan. Isi dokumen tidak diubah.</p>
        </fieldset>

        <fieldset>
          <legend>4. Baca dokumen (teks, tabel, gambar)</legend>
          <style>{`.hl-alat{display:flex;gap:6px;margin:2px 0}.hl-alat button{font:inherit;font-size:11px;color:#222;padding:2px 8px;border:1px solid #bbb;border-radius:6px;background:#f4f5f7;cursor:pointer}[data-copy="1"] .hl-alat{display:none}.hl-box td p{margin:0}.hl-box img{display:inline-block}`}</style>
          <p className="ef-note">Membaca isi dokumen: tulisan jadi teks, tabel jadi tabel asli, logo, stempel, dan foto dipotong jadi gambar. Semuanya bisa disalin atau diunduh ke Word.</p>
          <label className="ef-name">
            Bahasa dokumen
            <select value={ocrLang} onChange={(e) => setOcrLang(e.target.value)} disabled={ocrBusy}>
              <option value="ind+eng">Indonesia + Inggris</option>
              <option value="ind">Indonesia</option>
              <option value="eng">Inggris</option>
            </select>
          </label>
          <div className="ef-btns">
            <button type="button" className="ef-btn pri" disabled={!src || busy || ocrBusy} onClick={bacaSemua}>
              {ocrBusy ? `Membaca… ${ocrPct}%` : "Baca dokumen"}
            </button>
          </div>
          {hasilHtml && (
            <>
              <div
                ref={hasilRef}
                className="hl-box"
                contentEditable
                suppressContentEditableWarning
                spellCheck={false}
                onClick={klikHasil}
                style={{ marginTop: 8, padding: 8, background: "#fff", color: "#111", border: "1px solid #ccd", borderRadius: 8, maxHeight: 460, overflow: "auto", outline: "none" }}
              />
              {/* [BARU] Orientasi halaman untuk Word hasil baca */}
              <PilihOrientasi value={orientasiHasil} onChange={setOrientasiHasil} />
              <p className="ef-note">
                {orientasiHasil === "auto"
                  ? `Otomatis: Word hasil baca memakai ${halamanLand ? "landscape" : "portrait"}, mengikuti bentuk foto dokumen.`
                  : orientasiHasil === "portrait"
                  ? "Word hasil baca memakai A4 berdiri (portrait)."
                  : "Word hasil baca memakai A4 mendatar (landscape). Lebar tabel dan gambar menyesuaikan."}
              </p>
              <div className="ef-btns">
                <button type="button" className="ef-btn pri" onClick={salinSemua}>
                  Salin semua
                </button>
                <button type="button" className="ef-btn" onClick={salinTeksSaja}>
                  Salin teks saja
                </button>
                <button type="button" className="ef-btn" onClick={() => unduhHasil("docx")}>
                  Unduh Word
                </button>
                <button type="button" className="ef-btn" onClick={() => unduhHasil("txt")}>
                  Unduh .txt
                </button>
              </div>
              <p className="ef-note">Kotak di atas bisa diedit langsung. Tabel dan gambar punya tombol salin sendiri. Periksa hasilnya: huruf mirip (O/0, l/1) kadang salah baca, dan tabel tanpa garis tidak terdeteksi.</p>
            </>
          )}
        </fieldset>
      </aside>
    </div>
  );
}
