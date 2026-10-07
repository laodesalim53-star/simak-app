import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import Layout from "../components/Layout";
import KopSurat from "../components/KopSurat";
import LampiranKKKTP from "../components/LampiranKKKTP";

const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const tgl = (iso) => { const d = new Date(iso); return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`; };
const rp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");
const cell = (v) => String(v ?? "").trim().replace(/^'/, "");

const ALIAS = {
  nama: ["nama_pd", "nama", "nama siswa", "nama peserta didik"],
  kelas: ["kelas"],
  rek: ["no_rekening", "rekening", "nomor rekening", "no rekening"],
  ayah: ["nama_ayah", "ayah"],
  ibu: ["nama_ibu_kandung", "ibu"],
  nominal: ["nominal"],
  nisn: ["nisn"],
  nik: ["nik"],
};

function parseExcel(buf) {
  const wb = XLSX.read(buf);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "" });
  const hi = rows.findIndex((r) => r.some((c) => ALIAS.nama.includes(String(c).trim().toLowerCase())));
  if (hi < 0) throw new Error("Kolom nama_pd (atau nama) tidak ditemukan di baris judul.");
  const head = rows[hi].map((c) => String(c).trim().toLowerCase());
  const idx = Object.fromEntries(Object.keys(ALIAS).map((k) => [k, head.findIndex((h) => ALIAS[k].includes(h))]));
  return rows.slice(hi + 1).filter((r) => cell(r[idx.nama])).map((r, id) => {
    const g = (k) => (idx[k] < 0 ? "" : cell(r[idx[k]]));
    return { id, nama: g("nama").toUpperCase(), kelas: g("kelas").replace(/\D/g, "") || g("kelas"),
      rek: g("rek"), nisn: g("nisn"), nik: g("nik") };
  });
}

// Nilai awal NETRAL (tidak boleh berisi data sekolah tertentu).
// Data sekolah diambil dari profil_sekolah milik sekolah yang sedang login
// dan isian manual disimpan per sekolah_id.
const DEF = {
  sekolah: "", kabupaten: "", dinas: "",
  namaSekolah: "", alamatSekolah: "", provinsi: "", tahun: String(new Date().getFullYear()),
  kepsek: "", nip: "", pangkat: "",
  ktpKepsek: "", hpKepsek: "", alamatKepsek: "",
  nomorSurat: "", kota: "", kotaKuasa: "", tanggal: new Date().toISOString().slice(0, 10),
  bank: "", nominal: "450000", alamatOrtu: "",
};

// Ambil nilai string pertama yang terisi dari beberapa kemungkinan nama kolom.
const pick = (d, keys) => {
  for (const k of keys) if (d?.[k] && typeof d[k] === "string" && d[k].trim()) return d[k].trim();
  return "";
};
// Buang awalan "PEMERINTAH", "KABUPATEN", "KOTA" dari nama wilayah.
const bersihWilayah = (v) =>
  String(v || "").replace(/^\s*pemerintah\s+/i, "").replace(/^\s*(kabupaten|kab\.?|kota)\s+/i, "").trim();

const dariProfil = (d) => {
  if (!d) return {};
  const nama = pick(d, ["nama_sekolah", "nama", "sekolah"]);
  const kabRaw = pick(d, ["kabupaten", "kab_kota", "kota"]);
  const kab = bersihWilayah(kabRaw);
  const jenis = /^\s*(pemerintah\s+)?kota\b/i.test(kabRaw) ? "KOTA" : "KABUPATEN";
  const tempat = pick(d, ["kecamatan"]) || kab; // tempat surat: kecamatan, kalau kosong kabupaten bersih
  const out = {
    namaSekolah: nama,
    sekolah: nama.toUpperCase(),
    alamatSekolah: pick(d, ["alamat", "alamat_sekolah"]),
    kepsek: pick(d, ["nama_kepala_sekolah", "kepala_sekolah", "nama_kepsek"]),
    nip: pick(d, ["nip_kepala_sekolah", "nip_kepsek", "nip"]),
    pangkat: pick(d, ["pangkat_kepala_sekolah", "pangkat_golongan", "pangkat"]),
    kota: tempat,
    kotaKuasa: tempat,
    provinsi: pick(d, ["provinsi"]),
    kabupaten: kab ? `${jenis} ${kab}`.toUpperCase() : "",
  };
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v));
};

const MG_DEF = { atas: 12, bawah: 20, kiri: 18, kanan: 18, huruf: 10 };
const LABEL = { sekolah: "Nama sekolah (kop)", namaSekolah: "Nama satuan pendidikan", alamatSekolah: "Alamat sekolah", tahun: "Tahun PIP",
  kepsek: "Nama kepala sekolah", nip: "NIP", pangkat: "Pangkat/Golongan", ktpKepsek: "No. KTP kepala sekolah", hpKepsek: "No. HP kepala sekolah",
  alamatKepsek: "Alamat kepala sekolah", nomorSurat: "Nomor surat", kota: "Kota surat", kotaKuasa: "Kota surat kuasa", tanggal: "Tanggal surat",
  bank: "Nama bank (jika kosong di data siswa)", nominal: "Nominal PIP per siswa (Rp)", alamatOrtu: "Alamat orang tua (jika kosong)" };

const ALASAN = {
  a1: "Daerah khusus yang ditetapkan Kementerian;", a2: "Daerah yang sedang mengalami bencana yang ditetapkan oleh Pemerintah Daerah atau Pemerintah Pusat; dan/atau",
  a3: "Daerah lain yang sulit untuk mengakses ke Bank Penyalur berdasarkan rekomendasi Pemerintah Daerah.",
  b1: "Sedang sakit;", b2: "Penyandang disabilitas;", b3: "Diundang dalam acara kunjungan kerja Pemerintah; dan/atau",
  b4: "Kondisi sulit lainnya berdasarkan rekomendasi Pemerintah Daerah.",
};

const CSS = `
.pip{font-family:system-ui,sans-serif;color:#1c1c1c;max-width:1100px;margin:0 auto;padding:16px}
.pip h1{font-size:20px;margin:0 0 4px}.pip .sub{color:#666;font-size:13px;margin-bottom:12px}
.pip .bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:10px 0}
.pip button,.pip .file{border:1px solid #bbb;background:#fff;border-radius:6px;padding:7px 12px;font-size:13px;cursor:pointer}
.pip button.on{background:#1f4e79;color:#fff;border-color:#1f4e79}.pip button:focus-visible,.pip input:focus-visible,.pip select:focus-visible{outline:2px solid #1f4e79;outline-offset:2px}
.pip .tabs{display:flex;border-bottom:2px solid #ddd;margin-top:14px;flex-wrap:wrap}.pip .tabs button{border:0;border-radius:6px 6px 0 0;background:none;padding:10px 16px;font-size:14px}
.pip .tabs button.on{background:#1f4e79}
.pip details{border:1px solid #ddd;border-radius:6px;padding:8px 12px;margin:8px 0}.pip summary{cursor:pointer;font-size:14px}
.pip .fgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px;margin-top:10px}
.pip label.f{display:flex;flex-direction:column;font-size:12px;color:#555;gap:2px}.pip input[type=text],.pip input[type=date],.pip input[type=number],.pip select{padding:6px;border:1px solid #bbb;border-radius:4px;font-size:13px}
.pip .list{max-height:190px;overflow:auto;border:1px solid #ddd;border-radius:6px;padding:6px 10px;columns:2 260px;font-size:13px}
.pip .list label{display:block;padding:1px 0}.pip .err{color:#b00020;font-size:13px}
.pip .paper{background:#eee;padding:12px;margin-top:12px;overflow:auto}
.pip .sheet{background:#fff;width:210mm;min-height:297mm;margin:0 auto 12px;padding:18mm 20mm;box-sizing:border-box;font:12pt/1.45 "Times New Roman",serif;color:#000}
.pip .sheet p{margin:0 0 8px;text-align:justify}.pip .kop{text-align:center;font-weight:bold;border-bottom:3px double #000;padding-bottom:6px;margin-bottom:14px;line-height:1.3}
.pip .kop2{position:relative;min-height:76px;border-bottom:3px double #000;padding-bottom:6px;margin-bottom:14px}.pip .kop2 img{position:absolute;left:0;top:0;width:72px;height:72px;object-fit:contain}.pip .kop2 .kop{border:0;margin:0;padding:0 84px}
.pip .jd{text-align:center;font-weight:bold;margin:10px 0 12px}.pip .jd u{display:block}
.pip table.t{border-collapse:collapse;width:100%;margin:8px 0}.pip table.t td,.pip table.t th{border:1px solid #000;padding:3px 6px;font-size:11.5pt}
.pip table.k td{padding:1px 0;vertical-align:top}.pip .ttd{display:flex;justify-content:space-between;margin-top:18px;text-align:center}.pip .ttd div{min-width:200px}
.pip .gap{height:60px}.pip .cb{display:flex;gap:6px;margin:0 0 3px 24px;text-align:left;cursor:pointer}
.pip .sheet .kop-surat-resmi{margin-bottom:12px}
.pip .sheet .kop-surat-resmi p{margin:0;text-align:center}
.pip .sheet .kop-surat-resmi p.mt-1{margin-top:4px}
.pip .sheet.satu{min-height:0;height:296mm;overflow:hidden;padding:11mm 18mm;font-size:10pt;line-height:1.28}
.pip .sheet.satu p{margin:0 0 4px}
.pip .sheet.satu .kop-surat-resmi{margin-bottom:8px}
.pip .sheet.satu .jd{margin:6px 0 8px}
.pip .sheet.satu .cb{margin:0 0 1px 24px}
@media print{body *{visibility:hidden}.pip-print,.pip-print *{visibility:visible}.pip-print{position:absolute;left:0;top:0;width:100%}
.pip .paper{background:none;padding:0;overflow:visible}.pip .sheet{margin:0;padding:0;width:auto;box-shadow:none;page-break-after:always;min-height:0}.pip .sheet:last-child{page-break-after:auto}
.pip .sheet.satu{height:271mm;padding:0;page-break-after:auto}
.pip table.t thead{display:table-header-group}.pip table.t tr{break-inside:avoid}.pip .sheet table.k{break-inside:avoid}
@page{size:A4;margin:12mm 18mm}}`;

const isi = (v) => { const x = String(v ?? "").trim(); return /^[-–.\s0]*$/.test(x) ? "" : x; };
function pemberiDari(r) {
  for (const [n, k] of [["nama_wali", "nik_wali"], ["nama_ayah", "nik_ayah"], ["nama_ibu", "nik_ibu"]])
    if (isi(r[n])) return { pemberi: isi(r[n]), ktp: cell(isi(r[k])) };
  return { pemberi: isi(r.nama_orang_tua), ktp: cell(isi(r.nik_ayah) || isi(r.nik_ibu)) };
}

const mapRow = (r) => ({
  id: r.id, nama: (r.nama_lengkap || "").toUpperCase(), status: r.status, nisn: cell(r.nisn), nik: cell(r.nik),
  kelas: String(r.kelas?.nama_kelas || "").replace(/\D/g, "") || r.kelas?.nama_kelas || "",
  rek: cell(r.no_rekening), bank: r.bank || "", atasNama: r.rekening_atas_nama || "",
  ...pemberiDari(r), hp: r.no_hp_orang_tua || "", alamat: r.alamat_tinggal || r.alamat || "",
});

export default function DokumenPIP() {
  const { sekolahId, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState("");
  const [siswa, setSiswa] = useState([]);
  const [pilih, setPilih] = useState(new Set());
  const [tab, setTab] = useState(0);
  const [s, setS] = useState(DEF);
  const [alasan, setAlasan] = useState(new Set(["a3"]));
  const [extra, setExtra] = useState({});
  const [cur, setCur] = useState(0);
  const [semua, setSemua] = useState(false);
  const [err, setErr] = useState("");
  const [logo, setLogo] = useState("");
  const [mg, setMg] = useState(() => { try { return { ...MG_DEF, ...JSON.parse(localStorage.getItem("pip-margin") || "{}") }; } catch { return MG_DEF; } });
  const ubahMg = (k, v) => { const n = { ...mg, [k]: v }; setMg(n); try { localStorage.setItem("pip-margin", JSON.stringify(n)); } catch { /* abaikan */ } };
  const resetMg = () => { setMg(MG_DEF); try { localStorage.removeItem("pip-margin"); } catch { /* abaikan */ } };
  const M = (k) => Math.max(0, Math.min(60, Number(mg[k]) || 0));
  const CSS_CETAK = `@media print{@page{size:A4;margin:${M("atas")}mm ${M("kanan")}mm ${M("bawah")}mm ${M("kiri")}mm}.pip .sheet.satu{height:${297 - M("atas") - M("bawah") - 1}mm}}.pip .sheet.satu{font-size:${Math.max(7, Number(mg.huruf) || 10)}pt}`;

  const terpilih = useMemo(() => siswa.filter((x) => pilih.has(x.id)), [siswa, pilih]);
  const total = terpilih.length * (Number(s.nominal) || 0);
  const tanpaRek = siswa.filter((x) => !x.rek).length;
  const tanggal = tgl(s.tanggal);

  // Ubah satu isian surat dan simpan per sekolah (agar tidak tercampur antar akun).
  const ubahS = (k, v) => {
    const n = { ...s, [k]: v };
    setS(n);
    if (sekolahId) { try { localStorage.setItem("pip-data-" + sekolahId, JSON.stringify(n)); } catch { /* abaikan */ } }
  };

  async function simpanDb() {
    if (!sekolahId) return;
    const { error } = await supabase.from("pengaturan_pip").upsert({ sekolah_id: sekolahId, data: s }, { onConflict: "sekolah_id" });
    if (error) { setInfo(""); setErr("Gagal menyimpan pengaturan: " + error.message); return; }
    setErr(""); setInfo("Pengaturan surat PIP tersimpan di database.");
  }

  // Saat sekolah berganti: reset ke nilai netral, lalu isi dari profil_sekolah
  // milik sekolah ini, kemudian timpa dengan isian manual yang pernah disimpan.
  useEffect(() => {
    if (!sekolahId) return;
    let batal = false;
    setS(DEF); setLogo(""); setExtra({}); setCur(0);
    let simpanLogo = ""; try { simpanLogo = localStorage.getItem("pip-logo-" + sekolahId) || ""; } catch { /* abaikan */ }
    if (simpanLogo) setLogo(simpanLogo);
    let simpanS = {}; try { simpanS = JSON.parse(localStorage.getItem("pip-data-" + sekolahId) || "{}"); } catch { /* abaikan */ }
    supabase.from("data_kuasa_pip").select("*").eq("sekolah_id", sekolahId).then(({ data: rows }) => {
      if (batal || !rows) return;
      const m = {};
      for (const r of rows) {
        const o = {};
        for (const k of ["pemberi", "ttl", "ktp", "hp", "alamat"]) if (r[k]) o[k] = r[k];
        m[r.siswa_id] = o;
      }
      setExtra(m);
    });
    Promise.all([
      supabase.from("profil_sekolah").select("*").eq("sekolah_id", sekolahId).maybeSingle(),
      supabase.from("pengaturan_pip").select("data").eq("sekolah_id", sekolahId).maybeSingle(),
    ]).then(([{ data }, { data: pg }]) => {
      if (batal) return;
      // urutan prioritas: default < profil_sekolah < localStorage (lama) < database
      setS({ ...DEF, ...dariProfil(data), ...simpanS, ...(pg?.data || {}) });
      if (!simpanLogo) {
        const u = data && ["logo_url", "logo", "logo_sekolah", "logo_path"].map((k) => data[k]).find((v) => typeof v === "string" && /^(https?:|data:)/.test(v));
        if (u) setLogo(u);
      }
    });
    return () => { batal = true; };
  }, [sekolahId]);

  function pilihLogo(e) {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    const fr = new FileReader();
    fr.onload = () => { setLogo(fr.result); try { localStorage.setItem("pip-logo-" + sekolahId, fr.result); } catch { /* terlalu besar, tetap dipakai sesi ini */ } };
    fr.readAsDataURL(f);
  }
  function hapusLogo() { setLogo(""); try { localStorage.removeItem("pip-logo-" + sekolahId); } catch { /* abaikan */ } }

  async function muat() {
    if (!sekolahId) { setSiswa([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase.from("siswa").select("*, kelas(nama_kelas)").eq("sekolah_id", sekolahId).eq("status", "aktif").order("nama_lengkap");
    if (error) setErr("Gagal memuat siswa: " + error.message);
    const rows = (data || []).map(mapRow);
    setSiswa(rows); setPilih(new Set(rows.filter((x) => x.rek).map((x) => x.id))); setLoading(false);
  }
  useEffect(() => { muat(); /* eslint-disable-next-line */ }, [sekolahId]);

  // Opsional: Excel SK Nominasi PIP dipakai untuk mengisi/memperbarui no_rekening di data siswa (cocok lewat NISN, NIK, lalu nama).
  async function impor(e) {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f || !sekolahId) return;
    try {
      const rows = parseExcel(await f.arrayBuffer());
      const cocok = rows.map((r) => ({ r, d: siswa.find((d) => (r.nisn && d.nisn === r.nisn) || (r.nik && d.nik === r.nik) || d.nama === r.nama) })).filter((m) => m.d && m.r.rek);
      const tidak = rows.length - cocok.length;
      if (!cocok.length) { setErr("Tidak ada siswa di Excel yang cocok dengan data aplikasi (NISN/NIK/nama)."); return; }
      if (!confirm(`Perbarui nomor rekening ${cocok.length} siswa dari Excel?${tidak ? `\n${tidak} baris tidak cocok dan dilewati.` : ""}`)) return;
      for (const { r, d } of cocok) {
        const upd = { no_rekening: r.rek }; if (!d.bank && s.bank) upd.bank = s.bank;
        const { error } = await supabase.from("siswa").update(upd).eq("id", d.id).eq("sekolah_id", sekolahId);
        if (error) throw error;
      }
      setErr(""); setInfo(`${cocok.length} nomor rekening diperbarui${tidak ? `, ${tidak} baris tidak cocok` : ""}.`); await muat();
    } catch (x) { setErr(x.message || "Gagal membaca/menyimpan Excel."); }
  }
  const toggle = (set, setter, v) => { const n = new Set(set); n.has(v) ? n.delete(v) : n.add(v); setter(n); };
  const ex = (x) => ({ pemberi: x.pemberi, ttl: "", ktp: x.ktp, hp: x.hp || "-", alamat: x.alamat || s.alamatOrtu, ...(extra[x.id] || {}) });
  const setEx = (x, k, v) => setExtra({ ...extra, [x.id]: { ...ex(x), [k]: v } });
  const [menyimpanKuasa, setMenyimpanKuasa] = useState(false);
  async function simpanKuasa(x) {
    if (!sekolahId || !x) return;
    const e = ex(x);
    setMenyimpanKuasa(true);
    const { error } = await supabase.from("data_kuasa_pip").upsert({
      sekolah_id: sekolahId, siswa_id: String(x.id),
      pemberi: e.pemberi || "", ttl: e.ttl || "", ktp: e.ktp || "",
      hp: e.hp === "-" ? "" : e.hp || "", alamat: e.alamat || "",
    }, { onConflict: "sekolah_id,siswa_id" });
    setMenyimpanKuasa(false);
    if (error) { setInfo(""); setErr("Gagal menyimpan data orang tua: " + error.message); return; }
    setErr(""); setInfo(`Data orang tua ${x.nama} tersimpan.`);
  }
  function cetak(all) { setSemua(all); setTimeout(() => { window.print(); setSemua(false); }, 80); }

  const Ttd = ({ kota }) => (<div style={{ marginLeft: "auto", width: 260, textAlign: "center", breakInside: "avoid" }}>{kota}, {tanggal}<br />Kepala Satuan Pendidikan<div className="gap" /><b><u>{s.kepsek}</u></b><br />NIP. {s.nip}</div>);

  // Catatan: Aktivasi() dan Sptjm() dipanggil sebagai fungsi (bukan <Aktivasi />)
  // supaya KopSurat tidak di-mount ulang dan query Supabase tidak terulang tiap ketikan.
  const Aktivasi = () => (
    <div className="sheet"><KopSurat />
      <div className="jd">SURAT KETERANGAN<br />AKTIVASI REKENING SIMPEL PIP<br /><span style={{ fontWeight: "normal" }}>Nomor : {s.nomorSurat}</span></div>
      <p>Yang bertandatangan di bawah ini :</p>
      <table className="k"><tbody>
        {[["Nama", s.kepsek], ["NIP", s.nip], ["Jabatan", "KEPALA SEKOLAH"], ["Satuan Pendidikan", s.namaSekolah.toUpperCase()]].map(([a, b]) => <tr key={a}><td width="170">{a}</td><td>: {b}</td></tr>)}
      </tbody></table>
      <p style={{ marginTop: 8 }}>Dengan ini menerangkan bahwa nama-nama tersebut di bawah ini, adalah benar Peserta Didik {s.namaSekolah} dan yang bersangkutan sebagai Penerima PIP Tahun {s.tahun}</p>
      <table className="t"><thead><tr><th width="40">No</th><th>Nama Peserta Didik Tertera di SK</th><th width="60">Kelas</th><th width="170">Nomor Rekening</th></tr></thead>
        <tbody>{terpilih.map((x, i) => <tr key={x.id}><td align="center">{i + 1}.</td><td>{x.nama}</td><td align="center">{x.kelas}</td><td>{x.rek}</td></tr>)}</tbody></table>
      <p>Demikian surat keterangan ini dibuat untuk digunakan sebagai salah satu persyaratan untuk melakukan aktivasi rekening SimPel di Bank penyalur.</p>
      <Ttd kota={s.kota} />
    </div>);

  const Cb = ({ k }) => (<label className="cb"><input type="checkbox" checked={alasan.has(k)} onChange={() => toggle(alasan, setAlasan, k)} /><span>{ALASAN[k]}</span></label>);
  const Sptjm = () => (
    <div className="sheet satu"><KopSurat />
      <div className="jd">SURAT PERNYATAAN TANGGUNG JAWAB MUTLAK (SPTJM)<br />PENARIKAN DANA OLEH KUASA PENERIMA PIP</div>
      <p>Yang bertanda tangan di bawah ini, saya :</p>
      <table className="k"><tbody>
        {[["Nama", s.kepsek], ["Jabatan", "Kepala Sekolah"], ["NIP", s.nip], ["Satuan Pendidikan", s.namaSekolah], ["Alamat", s.alamatSekolah], ["Kab/Kota", s.kabupaten.replace("KABUPATEN ", "").replace(/\w+/g, (w) => w[0] + w.slice(1).toLowerCase())], ["Provinsi", s.provinsi]].map(([a, b]) => <tr key={a}><td width="170">{a}</td><td>: {b}</td></tr>)}
      </tbody></table>
      <p style={{ marginTop: 6 }}>Dengan ini menyatakan :</p>
      <p>1. Bertanggung jawab sepenuhnya untuk melakukan penarikan dana PIP Dikdasmen melalui pemberian kuasa dari {terpilih.length} peserta didik dengan jumlah dana sebesar <b>{rp(total)}</b> di satuan pendidikan saya sesuai surat kuasa penarikan dana PIP Dikdasmen, dengan alasan sebagai berikut (tandai ✓ yang dipilih) :</p>
      <p style={{ marginLeft: 18, marginBottom: 2 }}>a. Lokasi tempat tinggal dan satuan pendidikan peserta didik berada di :</p>{["a1", "a2", "a3"].map((k) => <Cb key={k} k={k} />)}
      <p style={{ marginLeft: 18, margin: "4px 0 2px" }}>b. Peserta didik/orang tua/wali yang tidak memungkinkan untuk melakukan aktivasi rekening secara langsung yang disebabkan karena :</p>{["b1", "b2", "b3", "b4"].map((k) => <Cb key={k} k={k} />)}
      <p style={{ marginTop: 6 }}>2. Bertanggung jawab sepenuhnya untuk menyerahkan dana kepada peserta didik penerima dana PIP Dikdasmen sesuai surat kuasa penarikan dana PIP Dikdasmen dalam waktu paling lambat 7 (tujuh) hari kerja setelah penarikan dana dilakukan.</p>
      <p>3. Menyampaikan laporan penarikan dana kepada Dinas Pendidikan Provinsi/Kabupaten/Kota dalam waktu paling lambat 7 (tujuh) hari kerja setelah penarikan dana dilakukan dengan melampirkan Format Surat Tanda Serah Terima Dana Melalui Kuasa yang telah diisi dan ditandatangani.</p>
      <p>4. Apabila di kemudian hari terjadi tuntutan hukum baik pidana maupun perdata terkait dengan penarikan dana PIP Dikdasmen, maka saya siap untuk bertanggung jawab sesuai ketentuan hukum yang berlaku.</p>
      <p>Demikian surat pernyataan pertanggungjawaban mutlak ini saya buat dengan kesadaran dan penuh tanggung jawab.</p>
      <div style={{ marginLeft: "auto", width: 260, textAlign: "center" }}>{s.kota}, {tanggal}<div style={{ border: "1px solid #000", width: 80, margin: "4px auto", padding: "6px 0", fontSize: "8pt" }}>METERAI<br />Rp 10.000</div><b><u>{s.kepsek}</u></b><br />NIP. {s.nip}</div>
    </div>);

  const Kuasa = ({ x }) => { const e = ex(x); return (
    <div className="sheet">
      <div className="jd"><u>SURAT KUASA</u></div>
      <p>Yang bertanda tangan di bawah ini :</p>
      <table className="k"><tbody>{[["Nama", e.pemberi], ["Tempat dan Tanggal Lahir", e.ttl || "-"], ["No. KTP", e.ktp || "-"], ["No. Telepon/HP", e.hp], ["Alamat", e.alamat]].map(([a, b]) => <tr key={a}><td width="220">{a}</td><td>: {b}</td></tr>)}</tbody></table>
      <p>Selanjutnya disebut <b>Pemberi Kuasa</b></p>
      <p>Dengan ini memberi kuasa kepada :</p>
      <table className="k"><tbody>{[["Nama", s.kepsek], ["NIP", s.nip], ["Pangkat/Golongan", s.pangkat], ["Jabatan", "Kepala " + s.namaSekolah], ["No. KTP", s.ktpKepsek], ["No. Telepon/HP", s.hpKepsek], ["Alamat", s.alamatKepsek]].map(([a, b]) => <tr key={a}><td width="220">{a}</td><td>: {b}</td></tr>)}</tbody></table>
      <p>Selanjutnya disebut <b>Penerima Kuasa</b></p>
      <p>Dengan surat ini, saya sebagai Pemberi Kuasa, memberikan kuasa kepada Penerima Kuasa untuk melakukan pengambilan uang secara tunai pada rekening PIP milik anak saya dengan data-data sebagai berikut :</p>
      <table className="k"><tbody>{[["No. Rekening", x.rek], ["Atas Nama", x.atasNama || x.nama], ["Nama Bank", x.bank || s.bank]].map(([a, b]) => <tr key={a}><td width="220">{a}</td><td>: {b}</td></tr>)}</tbody></table>
      <p style={{ marginTop: 8 }}>Hal-hal dan segala akibat yang disebabkan Surat Kuasa ini adalah tanggung jawab sepenuhnya Pemberi Kuasa.</p>
      <p>Demikian Surat Kuasa ini saya buat dengan kesadaran penuh dan tanpa ada paksaan dari pihak manapun dan semoga dapat digunakan sebagaimana mestinya.</p>
      <p style={{ textAlign: "right" }}>{s.kotaKuasa}, {tanggal}</p>
      <div className="ttd"><div>Penerima Kuasa<br />Kepala Sekolah,<div className="gap" /><b><u>{s.kepsek}</u></b><br />NIP. {s.nip}</div>
        <div>Pemberi Kuasa<br />Orang Tua Siswa,<div className="gap" /><b><u>{e.pemberi}</u></b></div></div>
    </div>); };

  // Surat Kuasa Pelaksanaan Aktivasi Rekening SimPel (orang tua/wali -> kepala sekolah).
  const KuasaAktivasi = ({ x }) => { const e = ex(x); return (
    <div className="sheet">
      <div className="jd"><u>SURAT KUASA</u><span style={{ fontWeight: "normal" }}>Pelaksanaan Aktivasi Rekening SimPel</span></div>
      <p>Yang bertanda tangan di bawah ini :</p>
      <table className="k"><tbody>{[["Nama", e.pemberi], ["NIK", e.ktp || "-"], ["Alamat", e.alamat], ["No. Telepon/HP", e.hp]].map(([a, b]) => <tr key={a}><td width="220">{a}</td><td>: {b}</td></tr>)}</tbody></table>
      <p style={{ marginTop: 8 }}>Adalah Orang Tua/Wali dari peserta didik :</p>
      <table className="k"><tbody>{[["Nama", x.nama], ["Nama Satuan Pendidikan", s.namaSekolah]].map(([a, b]) => <tr key={a}><td width="220">{a}</td><td>: {b}</td></tr>)}</tbody></table>
      <p>Selanjutnya disebut <b>PEMBERI KUASA</b></p>
      <p>Dengan ini memberi kuasa kepada :</p>
      <table className="k"><tbody>{[["Nama", s.kepsek], ["NIK", s.ktpKepsek || "-"], ["Alamat", s.alamatKepsek], ["Jabatan", "Kepala " + s.namaSekolah], ["Nama Satuan Pendidikan", s.namaSekolah]].map(([a, b]) => <tr key={a}><td width="220">{a}</td><td>: {b}</td></tr>)}</tbody></table>
      <p>Selanjutnya disebut <b>PENERIMA KUASA</b></p>
      <div className="jd" style={{ margin: "8px 0" }}>KHUSUS</div>
      <p>Untuk dan atas nama serta mewakili <b>PEMBERI KUASA</b> dalam melaksanakan proses Aktivasi Rekening SimPel atas nama <b>PEMBERI KUASA</b>.</p>
      <p>Untuk itu <b>PENERIMA KUASA</b> berhak menghadap di Bank Penyalur, melaksanakan penyerahan persyaratan dokumen aktivasi rekening SimPel atas nama peserta didik <b>PEMBERI KUASA</b> kepada Bank Penyalur, menerima Buku Tabungan SimPel dan kartu Debit atas nama peserta didik <b>PEMBERI KUASA</b> dari Bank Penyalur, dan melakukan segala sesuatu tindakan yang diperbolehkan hukum guna kepentingan Aktivasi Rekening SimPel <b>PEMBERI KUASA</b>.</p>
      <p>Demikian Surat Kuasa ini saya buat untuk digunakan sebagaimana mestinya.</p>
      <p style={{ textAlign: "right" }}>{s.kotaKuasa}, {tanggal}</p>
      <div className="ttd"><div>PEMBERI KUASA<div className="gap" /><b><u>{e.pemberi}</u></b></div>
        <div>PENERIMA KUASA<div className="gap" /><b><u>{s.kepsek}</u></b><br />NIP. {s.nip}</div></div>
    </div>); };

  const x = siswa[cur];
  const daftarKuasa = semua ? terpilih : x ? [x] : [];
  // Tab 0 Aktivasi, 1 SPTJM, 2 Surat Kuasa, 3 Kuasa Aktivasi SimPel, 4 Lampiran KK & KTP (admin).
  const perSiswa = tab === 2 || tab === 3;
  const daftarTab = ["Surat Keterangan Aktivasi", "SPTJM", "Surat Kuasa", "Kuasa Aktivasi SimPel", ...(isAdmin ? ["Lampiran KK & KTP"] : [])];

  return (
    <Layout title="Dokumen PIP" subtitle="Surat aktivasi rekening, SPTJM, surat kuasa, kuasa aktivasi SimPel, dan lampiran KK & KTP dari data siswa">
    <div className="pip"><style>{CSS}</style>{tab !== 4 && <style>{CSS_CETAK}</style>}
      <div className="bar">
        {isAdmin && <label className="file">Isi rekening dari Excel PIP<input type="file" accept=".xls,.xlsx" onChange={impor} hidden /></label>}
        {siswa.length > 0 && <span style={{ fontSize: 13 }}>{terpilih.length} dari {siswa.length} siswa dipilih · total {rp(total)}</span>}
      </div>
      {err && <div className="err" role="alert">{err}</div>}
      {info && <div className="sub" role="status">{info}</div>}
      {tanpaRek > 0 && <div className="sub">{tanpaRek} siswa aktif belum punya nomor rekening, jadi tidak dipilih otomatis.</div>}
      {siswa.length > 0 && (<details><summary>Pilih siswa ({terpilih.length})</summary>
        <div className="bar"><button onClick={() => setPilih(new Set(siswa.map((a) => a.id)))}>Pilih semua</button><button onClick={() => setPilih(new Set())}>Kosongkan</button></div>
        <div className="list">{siswa.map((a) => <label key={a.id}><input type="checkbox" checked={pilih.has(a.id)} onChange={() => toggle(pilih, setPilih, a.id)} /> {a.nama} (kls {a.kelas})</label>)}</div></details>)}
      <details><summary>Data sekolah dan surat</summary>
        <div className="fgrid">{Object.keys(LABEL).map((k) => <label className="f" key={k}>{LABEL[k]}<input type={k === "tanggal" ? "date" : "text"} value={s[k]} onChange={(e) => ubahS(k, e.target.value)} /></label>)}</div>
        {isAdmin && <div className="bar"><button className="on" onClick={simpanDb}>Simpan pengaturan ke database</button></div>}
        <div className="bar">{logo && <img src={logo} alt="Logo sekolah" style={{ height: 48 }} />}
          <label className="file">{logo ? "Ganti logo" : "Unggah logo sekolah"}<input type="file" accept="image/*" onChange={pilihLogo} hidden /></label>
          {logo && <button onClick={hapusLogo}>Hapus logo</button>}</div></details>

      <details><summary>Pengaturan cetak (margin kertas)</summary>
        <div className="fgrid">{[["atas", "Margin atas (mm)"], ["bawah", "Margin bawah (mm)"], ["kiri", "Margin kiri (mm)"], ["kanan", "Margin kanan (mm)"], ["huruf", "Ukuran huruf SPTJM (pt)"]].map(([k, l]) => <label className="f" key={k}>{l}<input type="number" step="0.5" min="0" value={mg[k]} onChange={(e) => ubahMg(k, e.target.value)} /></label>)}</div>
        <div className="sub" style={{ marginTop: 8 }}>Margin berlaku di setiap halaman saat dicetak (pratinjau di layar tidak berubah). Naikkan margin bawah bila teks terpotong printer; bila SPTJM jadi 2 halaman, kecilkan ukuran huruf. Pengaturan ini tidak berlaku untuk tab Lampiran KK &amp; KTP (punya margin sendiri).</div>
        <div className="bar"><button onClick={resetMg}>Kembalikan default</button></div></details>

      <div className="tabs" role="tablist">{daftarTab.map((t, i) => <button key={t} role="tab" aria-selected={tab === i} className={tab === i ? "on" : ""} onClick={() => setTab(i)}>{t}</button>)}</div>

      {loading ? <p className="sub" style={{ marginTop: 16 }}>Memuat data siswa...</p> : !sekolahId ? <p className="sub" style={{ marginTop: 16 }}>Belum ada sekolah aktif.</p> : siswa.length === 0 ? <p className="sub" style={{ marginTop: 16 }}>Belum ada siswa aktif di sekolah ini.</p> : (<>
        {tab === 4 && isAdmin && <LampiranKKKTP sekolahId={sekolahId} siswa={siswa} />}
        {tab !== 4 && (<>
          {perSiswa && x && (<div style={{ marginTop: 12 }}>
            <div className="fgrid">
              <label className="f">Siswa<select value={cur} onChange={(e) => setCur(+e.target.value)}>{siswa.map((a, i) => <option key={a.id} value={i}>{a.nama}</option>)}</select></label>
              {[["pemberi", "Nama pemberi kuasa (orang tua/wali)"], ["ttl", "Tempat, tanggal lahir"], ["ktp", "No. KTP / NIK"], ["hp", "No. HP"], ["alamat", "Alamat"]].map(([k, l]) => <label className="f" key={k}>{l}<input type="text" value={ex(x)[k]} onChange={(e) => setEx(x, k, e.target.value)} /></label>)}
            </div>
            {isAdmin && <div className="bar"><button className="on" onClick={() => simpanKuasa(x)} disabled={menyimpanKuasa}>{menyimpanKuasa ? "Menyimpan..." : "Simpan data orang tua"}</button></div>}
          </div>)}
          <div className="bar">
            <button className="on" onClick={() => cetak(false)} disabled={!perSiswa ? !terpilih.length : !x}>{perSiswa ? "Cetak surat ini" : "Cetak"}</button>
            {perSiswa && <button onClick={() => cetak(true)} disabled={!terpilih.length}>Cetak semua siswa terpilih ({terpilih.length})</button>}
          </div>
          <div className="paper pip-print">{tab === 0 && Aktivasi()}{tab === 1 && Sptjm()}{tab === 2 && daftarKuasa.map((a) => <Kuasa key={a.id} x={a} />)}{tab === 3 && daftarKuasa.map((a) => <KuasaAktivasi key={a.id} x={a} />)}</div>
        </>)}
      </>)}
    </div>
    </Layout>
  );
}
