// src/pages/HapusLatarDokumen.jsx
// Hapus latar dokumen — bersihkan foto/scan dokumen: bayangan dan warna kertas dihilangkan,
// atau jadikan transparan (tanda tangan, stempel, teks). Semua proses di browser (canvas).
// Dipakai sebagai tab di EditFotoLatar.jsx dan memakai kelas CSS "ef-*" milik halaman itu.

import { useState, useRef, useEffect } from "react";

const MAX_SRC = 2000; // sisi terpanjang gambar kerja (px)

const MODES = [
  { id: "putih", nama: "Putihkan kertas", info: "Bayangan dan warna kekuningan hilang, kertas jadi putih bersih. Cocok untuk foto atau scan dokumen biasa." },
  { id: "bw", nama: "Hitam putih (scan)", info: "Hasil mirip mesin fotokopi: teks hitam tajam di atas kertas putih. Bagus untuk dokumen teks yang akan dicetak." },
  { id: "transparan", nama: "Transparan", info: "Kertas dihapus, hanya tinta yang tersisa. Cocok untuk tanda tangan, stempel, atau logo yang akan ditempel ke dokumen lain." },
];

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

/* ───────────── Pangkas meja / latar di luar kertas ───────────── */

function autoCropPaper(src) {
  const w = src.width,
    h = src.height;
  const k = Math.max(w, h) / 300;
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

  // komponen terang terbesar = kertas
  const lab = new Uint8Array(total);
  const stack = new Int32Array(total);
  let top = null;
  for (let s = 0; s < total; s++) {
    if (lab[s] || lum[s] <= thr) continue;
    let sp = 0,
      n = 0;
    let minx = sw,
      maxx = 0,
      miny = sh,
      maxy = 0;
    stack[sp++] = s;
    lab[s] = 1;
    while (sp > 0) {
      const p = stack[--sp];
      n++;
      const x = p % sw,
        y = (p / sw) | 0;
      if (x < minx) minx = x;
      if (x > maxx) maxx = x;
      if (y < miny) miny = y;
      if (y > maxy) maxy = y;
      if (x > 0 && !lab[p - 1] && lum[p - 1] > thr) (lab[p - 1] = 1), (stack[sp++] = p - 1);
      if (x < sw - 1 && !lab[p + 1] && lum[p + 1] > thr) (lab[p + 1] = 1), (stack[sp++] = p + 1);
      if (y > 0 && !lab[p - sw] && lum[p - sw] > thr) (lab[p - sw] = 1), (stack[sp++] = p - sw);
      if (y < sh - 1 && !lab[p + sw] && lum[p + sw] > thr) (lab[p + sw] = 1), (stack[sp++] = p + sw);
    }
    if (!top || n > top.n) top = { n, minx, maxx, miny, maxy };
  }
  if (!top || top.n < total * 0.15) return src;

  const fx = w / sw,
    fy = h / sh;
  const ix = Math.round(w * 0.008),
    iy = Math.round(h * 0.008);
  const x0 = clamp(Math.round(top.minx * fx) + ix, 0, w - 2);
  const y0 = clamp(Math.round(top.miny * fy) + iy, 0, h - 2);
  const x1 = clamp(Math.round((top.maxx + 1) * fx) - ix, x0 + 1, w);
  const y1 = clamp(Math.round((top.maxy + 1) * fy) - iy, y0 + 1, h);
  const cw = x1 - x0,
    ch = y1 - y0;
  if (cw > w * 0.98 && ch > h * 0.98) return src;
  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  out.getContext("2d", { willReadFrequently: true }).drawImage(src, x0, y0, cw, ch, 0, 0, cw, ch);
  return out;
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
  const [crop, setCrop] = useState(false);
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

  const unduh = async () => {
    const out = resultRef.current;
    if (!out) return;
    const png = mode === "transparan" || format === "png";
    const blob = await canvasToBlob(out, png ? "image/png" : "image/jpeg", 0.95);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${safeName(name)}_bersih.${png ? "png" : "jpg"}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const info = MODES.find((m) => m.id === mode).info;
  const transparan = mode === "transparan";

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
            <input type="checkbox" checked={crop} onChange={(e) => setCrop(e.target.checked)} /> Pangkas meja di luar kertas
          </label>
          <p className="ef-note">Berhasil jika kertas lebih terang daripada alasnya. Foto miring belum diluruskan.</p>
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
            <select value={transparan ? "png" : format} onChange={(e) => setFormat(e.target.value)} disabled={transparan}>
              <option value="jpg">JPG (ringan)</option>
              <option value="png">PNG</option>
            </select>
          </label>
          {transparan && <p className="ef-note">Hasil transparan selalu disimpan sebagai PNG.</p>}
          <div className="ef-btns">
            <button type="button" className="ef-btn pri" disabled={!src || busy} onClick={unduh}>
              Unduh hasil
            </button>
          </div>
          <p className="ef-note">Untuk dokumen resmi, hasil ini hanya merapikan tampilan. Isi dokumen tidak diubah.</p>
        </fieldset>
      </aside>
    </div>
  );
}
