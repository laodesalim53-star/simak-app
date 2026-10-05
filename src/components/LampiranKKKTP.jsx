import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// Komponen tab "Lampiran KK & KTP" untuk halaman DokumenPIP.
// Props: sekolahId (dari useAuth) dan siswa (daftar siswa aktif yang sudah dimuat DokumenPIP,
// bentuk: { id, nama, kelas, rek, ... }). Tabel Supabase tetap "berkas_cetak" (tanpa migrasi).

// ===== Ukuran cetak bawaan (mm). Tinggi 0 = otomatis mengikuti rasio gambar. =====
const UKURAN_DEF = { kk: { w: 190, h: 0 }, ktp: { w: 85.6, h: 54 }, gap: 6, garis: true };
const MG_DEF = { atas: 10, kanan: 10, bawah: 10, kiri: 10 };
const JENIS = { kk: "Kartu Keluarga (KK)", ktp: "KTP" };

const gabung = (u = {}) => ({
  kk: { ...UKURAN_DEF.kk, ...(u.kk || {}) },
  ktp: { ...UKURAN_DEF.ktp, ...(u.ktp || {}) },
  gap: u.gap ?? UKURAN_DEF.gap,
  garis: u.garis ?? UKURAN_DEF.garis,
});
const bacaLokal = (k, def) => { try { return { ...def, ...JSON.parse(localStorage.getItem(k) || "{}") }; } catch { return def; } };
const uid = () => Math.random().toString(36).slice(2, 10);
const tglWaktu = (iso) => iso ? new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";

const bacaFile = (f) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => no(new Error("Gagal membaca file")); r.readAsDataURL(f); });
const muatGambar = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error("File bukan gambar yang valid (gunakan JPG/PNG/WEBP)")); i.src = src; });
// Perkecil (maks 1800px) + putar (kelipatan 90 derajat) lalu simpan sebagai JPEG.
async function olahGambar(src, derajat = 0, maks = 1800) {
  const img = await muatGambar(src);
  const miring = derajat % 180 !== 0;
  const k = Math.min(1, maks / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
  const c = document.createElement("canvas");
  c.width = miring ? h : w; c.height = miring ? w : h;
  const g = c.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
  g.translate(c.width / 2, c.height / 2); g.rotate((derajat * Math.PI) / 180);
  g.drawImage(img, -w / 2, -h / 2, w, h);
  return c.toDataURL("image/jpeg", 0.85);
}

// Semua kelas memakai awalan .bkk supaya tidak bentrok dengan .pip milik DokumenPIP.
const CSS = `
.bkk{font-family:system-ui,sans-serif;color:#1c1c1c;margin-top:12px}
.bkk .sub{color:#666;font-size:13px;margin-bottom:12px}.bkk .err{color:#b00020;font-size:13px}
.bkk .bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:10px 0}
.bkk button,.bkk .file{border:1px solid #bbb;background:#fff;border-radius:6px;padding:7px 12px;font-size:13px;cursor:pointer}
.bkk button.on{background:#1f4e79;color:#fff;border-color:#1f4e79}.bkk button.bahaya{color:#b00020;border-color:#e3a0a8}
.bkk button:disabled{opacity:.5;cursor:not-allowed}
.bkk button:focus-visible,.bkk input:focus-visible,.bkk select:focus-visible{outline:2px solid #1f4e79;outline-offset:2px}
.bkk input[type=text],.bkk input[type=number],.bkk select{padding:6px;border:1px solid #bbb;border-radius:4px;font-size:13px}
.bkk label.f{display:flex;flex-direction:column;font-size:12px;color:#555;gap:2px}
.bkk .fgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-top:8px}
.bkk details{border:1px solid #ddd;border-radius:6px;padding:8px 12px;margin:8px 0}.bkk summary{cursor:pointer;font-size:14px}
.bkk table.daftar{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}
.bkk table.daftar th,.bkk table.daftar td{border-bottom:1px solid #e3e3e3;padding:8px 6px;text-align:left;vertical-align:middle}
.bkk .modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:80;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:24px 12px}
.bkk .modal{background:#fff;border-radius:10px;width:min(920px,100%);padding:16px 18px;box-shadow:0 10px 40px rgba(0,0,0,.3)}
.bkk .modal h2{font-size:17px;margin:0 0 8px}
.bkk .berkas{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;margin:10px 0}
.bkk .kartu{border:1px solid #ccc;border-radius:8px;padding:8px;display:flex;flex-direction:column;gap:6px}
.bkk .kartu img{width:100%;height:120px;object-fit:contain;background:#f3f3f3;border-radius:4px}
.bkk .kartu .aksi{display:flex;gap:4px;flex-wrap:wrap}.bkk .kartu .aksi button{padding:3px 8px;font-size:12px}
.bkk .paper{background:#eee;padding:12px;margin-top:12px;overflow:auto}
.bkk .lembar{background:#fff;width:210mm;min-height:297mm;margin:0 auto 12px;box-sizing:border-box}
.bkk .isi{display:flex;flex-wrap:wrap;align-content:flex-start;align-items:flex-start}
.bkk .item{break-inside:avoid;line-height:0}.bkk .item img{display:block}
@media print{body *{visibility:hidden}.bkk-print,.bkk-print *{visibility:visible}.bkk-print{position:absolute;left:0;top:0;width:100%}
.bkk .paper{background:none;padding:0;overflow:visible;margin:0}
.bkk .lembar{margin:0;padding:0 !important;width:auto;min-height:0;page-break-after:always}.bkk .lembar:last-child{page-break-after:auto}}`;

function Lembar({ b, mg }) {
  const u = gabung(b.ukuran);
  return (
    <div className="lembar" style={{ padding: `${mg.atas}mm ${mg.kanan}mm ${mg.bawah}mm ${mg.kiri}mm` }}>
      <div className="isi" style={{ gap: `${u.gap}mm` }}>
        {b.items.map((it) => {
          const z = it.jenis === "kk" ? u.kk : u.ktp;
          return (
            <div className="item" key={it.uid}>
              <img src={it.gambar} alt={it.label || JENIS[it.jenis]}
                style={{ width: `${z.w}mm`, height: z.h ? `${z.h}mm` : "auto", objectFit: "contain",
                  outline: u.garis && it.jenis === "ktp" ? "0.2mm dashed #888" : "none" }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LampiranKKKTP({ sekolahId, siswa = [] }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [cari, setCari] = useState("");
  const [pilih, setPilih] = useState(new Set());
  const [draft, setDraft] = useState(null);           // isi modal tambah/edit
  const [jenisBaru, setJenisBaru] = useState("kk");
  const [sibuk, setSibuk] = useState(false);
  const [antrian, setAntrian] = useState([]);         // lembar yang sedang dipratinjau/dicetak
  const [mg, setMg] = useState(() => bacaLokal("cetak-berkas-margin", MG_DEF));

  const M = (k) => Math.max(0, Math.min(40, Number(mg[k]) || 0));
  const ubahMg = (k, v) => { const n = { ...mg, [k]: v }; setMg(n); try { localStorage.setItem("cetak-berkas-margin", JSON.stringify(n)); } catch { /* abaikan */ } };
  const mgAktif = { atas: M("atas"), kanan: M("kanan"), bawah: M("bawah"), kiri: M("kiri") };
  // Margin halaman dipasang lewat @page (padding lembar dinolkan saat cetak), jadi margin di atas benar-benar berlaku.
  const CSS_CETAK = `@media print{@page{size:A4;margin:${mgAktif.atas}mm ${mgAktif.kanan}mm ${mgAktif.bawah}mm ${mgAktif.kiri}mm}}`;

  async function muat() {
    if (!sekolahId) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase.from("berkas_cetak")
      .select("id,judul,ukuran,jumlah_item,jumlah_cetak,terakhir_cetak,updated_at")
      .eq("sekolah_id", sekolahId).order("updated_at", { ascending: false });
    if (error) setErr("Gagal memuat berkas: " + error.message);
    setRows(data || []); setLoading(false);
  }
  useEffect(() => { setAntrian([]); setPilih(new Set()); muat(); /* eslint-disable-next-line */ }, [sekolahId]);

  // Cocokkan judul berkas dengan nama siswa aktif (data dari DokumenPIP) untuk menampilkan kelas & kelengkapan.
  const petaSiswa = useMemo(() => new Map(siswa.map((x) => [x.nama.trim().toLowerCase(), x])), [siswa]);
  const sudahAda = useMemo(() => new Set(rows.map((r) => r.judul.trim().toLowerCase())), [rows]);
  const belum = useMemo(() => siswa.filter((x) => !sudahAda.has(x.nama.trim().toLowerCase())), [siswa, sudahAda]);
  const tampil = useMemo(() => rows.filter((r) => r.judul.toLowerCase().includes(cari.trim().toLowerCase())), [rows, cari]);

  // ===== Modal =====
  const baru = (nama = "") => setDraft({ id: null, judul: nama, items: [], ukuran: gabung(bacaLokal("cetak-berkas-ukuran", {})) });
  async function ubah(id) {
    setErr(""); setSibuk(true);
    const { data, error } = await supabase.from("berkas_cetak").select("id,judul,items,ukuran").eq("id", id).eq("sekolah_id", sekolahId).single();
    setSibuk(false);
    if (error) { setErr("Gagal membuka berkas: " + error.message); return; }
    setDraft({ id: data.id, judul: data.judul, items: data.items || [], ukuran: gabung(data.ukuran) });
  }
  const setD = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const setUk = (grp, k, v) => setDraft((d) => ({ ...d, ukuran: { ...d.ukuran, [grp]: { ...d.ukuran[grp], [k]: v } } }));

  async function tambahFile(e) {
    const files = Array.from(e.target.files || []); e.target.value = "";
    if (!files.length) return;
    setSibuk(true); setErr("");
    try {
      const baruItems = [];
      for (const f of files) {
        const gambar = await olahGambar(await bacaFile(f));
        baruItems.push({ uid: uid(), jenis: jenisBaru, label: f.name.replace(/\.[^.]+$/, ""), gambar });
      }
      setDraft((d) => ({ ...d, items: [...d.items, ...baruItems] }));
    } catch (x) { setErr(x.message || "Gagal mengimpor gambar."); }
    setSibuk(false);
  }
  async function putar(i) {
    setSibuk(true);
    try { const g = await olahGambar(draft.items[i].gambar, 90); setDraft((d) => ({ ...d, items: d.items.map((it, j) => (j === i ? { ...it, gambar: g } : it)) })); }
    catch (x) { setErr(x.message); }
    setSibuk(false);
  }
  const ubahItem = (i, patch) => setDraft((d) => ({ ...d, items: d.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) }));
  const hapusItem = (i) => setDraft((d) => ({ ...d, items: d.items.filter((_, j) => j !== i) }));
  const geser = (i, dlt) => setDraft((d) => {
    const j = i + dlt; if (j < 0 || j >= d.items.length) return d;
    const a = [...d.items]; [a[i], a[j]] = [a[j], a[i]]; return { ...d, items: a };
  });

  async function simpan(d) {
    if (!d.judul.trim()) { setErr("Isi nama siswa/keluarga terlebih dahulu."); return null; }
    if (!d.items.length) { setErr("Tambahkan minimal satu dokumen."); return null; }
    setSibuk(true); setErr("");
    const payload = { sekolah_id: sekolahId, judul: d.judul.trim(), items: d.items, ukuran: d.ukuran, jumlah_item: d.items.length };
    const q = d.id
      ? supabase.from("berkas_cetak").update(payload).eq("id", d.id).eq("sekolah_id", sekolahId)
      : supabase.from("berkas_cetak").insert(payload);
    const { data, error } = await q.select("id").single();
    setSibuk(false);
    if (error) { setErr("Gagal menyimpan: " + error.message); return null; }
    try { localStorage.setItem("cetak-berkas-ukuran", JSON.stringify(d.ukuran)); } catch { /* abaikan */ }
    setInfo(`Berkas "${payload.judul}" tersimpan.`);
    await muat();
    return data.id;
  }

  // ===== Cetak =====
  function jalankanCetak(daftar, idTersimpan = []) {
    setAntrian(daftar);
    setTimeout(async () => {
      window.print();
      if (idTersimpan.length) {
        for (const id of idTersimpan) {
          const r = rows.find((x) => x.id === id);
          await supabase.from("berkas_cetak").update({ terakhir_cetak: new Date().toISOString(), jumlah_cetak: (r?.jumlah_cetak || 0) + 1 }).eq("id", id).eq("sekolah_id", sekolahId);
        }
        muat();
      }
    }, 200);
  }
  async function cetakTersimpan(ids) {
    if (!ids.length) return;
    setSibuk(true); setErr("");
    const { data, error } = await supabase.from("berkas_cetak").select("id,judul,items,ukuran").in("id", ids).eq("sekolah_id", sekolahId);
    setSibuk(false);
    if (error) { setErr("Gagal memuat berkas untuk dicetak: " + error.message); return; }
    const urut = ids.map((id) => data.find((x) => x.id === id)).filter(Boolean);
    jalankanCetak(urut, urut.map((x) => x.id));
  }
  async function simpanLaluCetak() {
    const id = await simpan(draft);
    if (!id) return;
    const d = draft; setDraft(null);
    jalankanCetak([{ ...d, id }], [id]);
  }
  function cetakDraft() {
    if (!draft.items.length) { setErr("Tambahkan minimal satu dokumen."); return; }
    jalankanCetak([draft]);
  }
  async function hapus(r) {
    if (!confirm(`Hapus berkas "${r.judul}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    const { error } = await supabase.from("berkas_cetak").delete().eq("id", r.id).eq("sekolah_id", sekolahId);
    if (error) { setErr("Gagal menghapus: " + error.message); return; }
    setPilih((p) => { const n = new Set(p); n.delete(r.id); return n; });
    setInfo(`Berkas "${r.judul}" dihapus.`); muat();
  }
  const toggle = (id) => setPilih((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="bkk"><style>{CSS}</style><style>{CSS_CETAK}</style>
      <div className="sub">Lampiran fotokopi KK &amp; KTP orang tua untuk berkas PIP. Impor gambar, atur ukuran, simpan, lalu cetak ulang kapan saja.
        {siswa.length > 0 && <> · <b>{siswa.length - belum.length}</b> dari {siswa.length} siswa aktif sudah punya berkas.</>}</div>
      <div className="bar">
        <button className="on" onClick={() => baru()}>+ Tambah berkas</button>
        <button onClick={() => cetakTersimpan([...pilih])} disabled={!pilih.size || sibuk}>Cetak terpilih ({pilih.size})</button>
        <input type="text" placeholder="Cari nama..." value={cari} onChange={(e) => setCari(e.target.value)} aria-label="Cari berkas" />
      </div>
      <details><summary>Margin kertas (mm)</summary>
        <div className="fgrid">{[["atas", "Atas"], ["bawah", "Bawah"], ["kiri", "Kiri"], ["kanan", "Kanan"]].map(([k, l]) => <label className="f" key={k}>{l}<input type="number" min="0" step="0.5" value={mg[k]} onChange={(e) => ubahMg(k, e.target.value)} /></label>)}</div>
        <div className="sub" style={{ marginTop: 8 }}>Di dialog cetak browser pilih ukuran kertas A4, skala 100%, dan matikan "Headers and footers" agar KTP tercetak tepat 85,6 × 54 mm.</div>
      </details>
      {belum.length > 0 && (
        <details><summary>Siswa yang belum punya berkas ({belum.length})</summary>
          <div className="bar">{belum.map((x) => <button key={x.id} onClick={() => baru(x.nama)}>{x.nama} (kls {x.kelas})</button>)}</div>
          <div className="sub">Klik nama untuk membuat berkas baru dengan nama siswa terisi otomatis.</div>
        </details>)}
      {err && <div className="err" role="alert">{err}</div>}
      {info && <div className="sub" role="status">{info}</div>}

      {loading ? <p className="sub">Memuat...</p> : tampil.length === 0 ? <p className="sub">{rows.length ? "Tidak ada hasil." : "Belum ada berkas tersimpan. Klik “Tambah berkas” untuk memulai."}</p> : (
        <table className="daftar"><thead><tr><th></th><th>Nama</th><th>Kelas</th><th>Dokumen</th><th>Terakhir dicetak</th><th>Dicetak</th><th>Aksi</th></tr></thead>
          <tbody>{tampil.map((r) => (
            <tr key={r.id}>
              <td><input type="checkbox" checked={pilih.has(r.id)} onChange={() => toggle(r.id)} aria-label={"Pilih " + r.judul} /></td>
              <td><b>{r.judul}</b></td><td>{petaSiswa.get(r.judul.trim().toLowerCase())?.kelas || "-"}</td>
              <td>{r.jumlah_item} file</td><td>{tglWaktu(r.terakhir_cetak)}</td><td>{r.jumlah_cetak}×</td>
              <td><div className="bar" style={{ margin: 0 }}>
                <button className="on" onClick={() => cetakTersimpan([r.id])} disabled={sibuk}>Cetak ulang</button>
                <button onClick={() => ubah(r.id)} disabled={sibuk}>Ubah</button>
                <button className="bahaya" onClick={() => hapus(r)}>Hapus</button></div></td>
            </tr>))}</tbody></table>)}

      {antrian.length > 0 && (<>
        <div className="bar"><b style={{ fontSize: 14 }}>Pratinjau cetak ({antrian.length} berkas)</b>
          <button onClick={() => window.print()}>Cetak lagi</button><button onClick={() => setAntrian([])}>Tutup pratinjau</button></div>
        <div className="paper bkk-print">{antrian.map((b, i) => <Lembar key={b.id || i} b={b} mg={mgAktif} />)}</div></>)}

      {draft && (
        <div className="modal-bg" role="dialog" aria-modal="true" aria-label="Lampiran KK dan KTP">
          <div className="modal">
            <h2>{draft.id ? "Ubah berkas" : "Tambah berkas"}</h2>
            <label className="f">Nama siswa (pilih dari daftar atau ketik)
              <input type="text" list="bkk-siswa" value={draft.judul} onChange={(e) => setD({ judul: e.target.value })} placeholder="mis. AFRISA DJERFUY" />
              <datalist id="bkk-siswa">{siswa.map((x) => <option key={x.id} value={x.nama}>{"kelas " + x.kelas}</option>)}</datalist>
            </label>

            <div className="bar">
              <select value={jenisBaru} onChange={(e) => setJenisBaru(e.target.value)} aria-label="Jenis dokumen">{Object.entries(JENIS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              <label className="file">{sibuk ? "Memproses..." : "Impor gambar (bisa banyak)"}<input type="file" accept="image/*" multiple hidden onChange={tambahFile} disabled={sibuk} /></label>
              <span className="sub" style={{ margin: 0 }}>Format JPG/PNG/WEBP. Untuk PDF, ubah dulu ke gambar.</span>
            </div>

            {draft.items.length === 0 ? <p className="sub">Belum ada dokumen diimpor.</p> : (
              <div className="berkas">{draft.items.map((it, i) => (
                <div className="kartu" key={it.uid}>
                  <img src={it.gambar} alt={it.label} />
                  <select value={it.jenis} onChange={(e) => ubahItem(i, { jenis: e.target.value })} aria-label="Jenis">{Object.entries(JENIS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                  <input type="text" value={it.label} onChange={(e) => ubahItem(i, { label: e.target.value })} aria-label="Keterangan" />
                  <div className="aksi">
                    <button onClick={() => putar(i)} disabled={sibuk}>⟳ Putar</button>
                    <button onClick={() => geser(i, -1)} disabled={i === 0} aria-label="Geser ke depan">←</button>
                    <button onClick={() => geser(i, 1)} disabled={i === draft.items.length - 1} aria-label="Geser ke belakang">→</button>
                    <button className="bahaya" onClick={() => hapusItem(i)}>Hapus</button>
                  </div>
                </div>))}</div>)}

            <details open><summary>Ukuran cetak (mm)</summary>
              <div className="fgrid">
                <label className="f">KK lebar<input type="number" step="0.1" min="10" value={draft.ukuran.kk.w} onChange={(e) => setUk("kk", "w", e.target.value)} /></label>
                <label className="f">KK tinggi (0 = otomatis)<input type="number" step="0.1" min="0" value={draft.ukuran.kk.h} onChange={(e) => setUk("kk", "h", e.target.value)} /></label>
                <label className="f">KTP lebar<input type="number" step="0.1" min="10" value={draft.ukuran.ktp.w} onChange={(e) => setUk("ktp", "w", e.target.value)} /></label>
                <label className="f">KTP tinggi (0 = otomatis)<input type="number" step="0.1" min="0" value={draft.ukuran.ktp.h} onChange={(e) => setUk("ktp", "h", e.target.value)} /></label>
                <label className="f">Jarak antar dokumen<input type="number" step="0.5" min="0" value={draft.ukuran.gap} onChange={(e) => setD({ ukuran: { ...draft.ukuran, gap: e.target.value } })} /></label>
                <label className="f" style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 18 }}><input type="checkbox" checked={!!draft.ukuran.garis} onChange={(e) => setD({ ukuran: { ...draft.ukuran, garis: e.target.checked } })} /> Garis potong di KTP</label>
              </div>
              <div className="sub" style={{ marginTop: 8 }}>Bawaan: KTP 85,6 × 54 mm (ukuran asli), KK lebar 190 mm. Ukuran ini disimpan bersama berkas dan jadi bawaan untuk berkas baru.</div>
            </details>

            {draft.items.length > 0 && (<>
              <div className="sub" style={{ marginTop: 8 }}>Pratinjau tata letak (1 halaman A4):</div>
              <div className="paper" style={{ maxHeight: 360 }}><div style={{ transform: "scale(.55)", transformOrigin: "top left", width: "210mm", height: "163mm" }}><Lembar b={draft} mg={mgAktif} /></div></div></>)}

            <div className="bar" style={{ justifyContent: "flex-end" }}>
              <button onClick={() => setDraft(null)}>Tutup</button>
              <button onClick={cetakDraft} disabled={sibuk}>Cetak (tanpa simpan)</button>
              <button onClick={async () => { const id = await simpan(draft); if (id) setDraft(null); }} disabled={sibuk}>Simpan</button>
              <button className="on" onClick={simpanLaluCetak} disabled={sibuk}>Simpan &amp; Cetak</button>
            </div>
          </div>
        </div>)}
    </div>
  );
}
