import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Loader2, Printer } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { MAPEL_IJAZAH, jumlahNilai } from "../components/IjazahPrintTemplate";

// ============================================================================
// SuratKeteranganLulusKelas6.jsx — VERSI BARU (mandiri, tanpa SklPrintTemplate)
// ----------------------------------------------------------------------------
// Kotak nilai + kop surat + tabel biodata di bawah ini SENGAJA disalin
// langsung dari src/components/SklPrintTemplate.jsx (bukan diimpor), supaya
// file itu boleh dihapus sepenuhnya setelah halaman ini dipakai. Bingkai
// ornamen biru (border-image) yang dulu ada di SklPrintTemplate.jsx SUDAH
// DILEPAS atas permintaan — surat sekarang polos tanpa bingkai, dan lebar
// halaman disesuaikan pas dengan area cetak kertas A4 (210mm dikurangi
// margin @page 10mm kiri-kanan = 190mm). Satu-satunya yang masih diimpor
// dari luar adalah MAPEL_IJAZAH &
// jumlahNilai dari IjazahPrintTemplate.jsx — itu tetap dipakai sebagai satu
// sumber kebenaran daftar mata pelajaran, supaya kalau daftar mapel berubah
// suatu saat, Ijazah & SKL tetap konsisten tanpa perlu diedit dua tempat.
//
// Sistem penarikan data: sama seperti sebelumnya (kelas VI dicari otomatis
// lewat tingkat === "VI", sekolah_id dari useAuth(), semua query difilter
// .eq('sekolah_id', ...), error Supabase ditangkap & ditampilkan) — DITAMBAH
// query baru ke tabel `nilai_ijazah` (sumber kotak nilai), mengikuti pola
// yang sudah dipakai versi SKL yang lama.
//
// Input manual langsung di halaman: Nomor SKL & Tanggal Terbit tetap bisa
// diketik langsung di tabel (tersimpan onBlur). Nilai per mata pelajaran
// TIDAK diedit di halaman ini — diasumsikan sudah diisi dari halaman input
// Nilai Ijazah yang sudah ada di aplikasi (tabel `nilai_ijazah`); halaman ini
// hanya menampilkannya di kotak nilai, sama seperti dulu.
//
// Sistem cetak: tetap mengikuti pola persis LaporanKeadaanMurid.jsx — semua
// siswa ditampung dalam SATU area cetak, di layar hanya siswa terpilih yang
// tampil (laporan-section tab-aktif/tab-nonaktif), saat window.print()
// semua siswa ditampilkan sekaligus dengan page-break-before-print di
// antaranya (satu siswa satu halaman).
// ============================================================================

const th = { border: "1px solid #2748a0", padding: "3px 6px", background: "#eef1fb", fontWeight: "bold", letterSpacing: "0.2px" };
const td = { border: "1px solid #2748a0", padding: "2.5px 6px", textAlign: "center", verticalAlign: "middle" };
const tdGroup = { border: "1px solid #2748a0", padding: "2.5px 6px", fontWeight: "bold", background: "#f5f7fc" };

function fmtNilai(n) {
  return n === undefined || n === null || n === "" || isNaN(n) ? "-" : Number(n).toFixed(2);
}

function formatTanggal(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

function Baris({ label, nilai }) {
  return (
    <tr>
      <td style={{ padding: "1px 8px 1px 0", width: 190 }}>{label}</td>
      <td style={{ padding: "1px 6px", width: 10 }}>:</td>
      <td style={{ padding: "1px 0" }}>{nilai || "-"}</td>
    </tr>
  );
}

function tahunPelajaranDefault() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return m >= 7 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

export default function SuratKeteranganLulusKelas6() {
  const navigate = useNavigate();
  const { sekolahId: sekolahIdSaya } = useAuth();

  const [tahunPelajaran, setTahunPelajaran] = useState(tahunPelajaranDefault());

  const [kelasIdKelas6, setKelasIdKelas6] = useState([]);
  const [namaKelas6, setNamaKelas6] = useState("");
  const [kelasSiapDimuat, setKelasSiapDimuat] = useState(false);

  const [siswaList, setSiswaList] = useState([]);
  const [nilaiMap, setNilaiMap] = useState({});
  const [sklMap, setSklMap] = useState({});
  const [sekolah, setSekolah] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [nomorPrefix, setNomorPrefix] = useState("421.2/");
  const [errorMuat, setErrorMuat] = useState("");
  const [menyimpanId, setMenyimpanId] = useState(null);

  const previewRef = useRef(null);

  function lihatSiswa(id) {
    setSelectedId(id);
    previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---------------------------------------------------------------------
  // PENARIKAN DATA
  // ---------------------------------------------------------------------
  useEffect(() => {
    cariKelas6();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekolahIdSaya]);

  useEffect(() => {
    if (kelasSiapDimuat) {
      loadAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahunPelajaran, kelasSiapDimuat, kelasIdKelas6]);

  async function cariKelas6() {
    if (!sekolahIdSaya) {
      setKelasSiapDimuat(true);
      return;
    }

    const { data: kelas, error: kelasError } = await supabase
      .from("kelas")
      .select("*")
      .eq("sekolah_id", sekolahIdSaya)
      .order("nama_kelas");

    if (kelasError) {
      console.error("Gagal memuat data kelas:", kelasError);
      setErrorMuat(`Gagal memuat data kelas dari database. Detail: ${kelasError.message}`);
    }

    // Tingkat disimpan sebagai angka Romawi (VII, VI, dst), jadi cocokkan
    // persis "VI" (bukan .includes, karena "VI" juga substring dari "VII"
    // dan "VIII").
    const semuaKelas6 = (kelas || []).filter(
      (k) => String(k.tingkat).trim().toUpperCase() === "VI"
    );
    setKelasIdKelas6(semuaKelas6.map((k) => k.id));
    setNamaKelas6(semuaKelas6.map((k) => k.nama_kelas).join(", "));
    setKelasSiapDimuat(true);
  }

  async function loadAll() {
    setLoading(true);
    setErrorMuat("");

    if (!sekolahIdSaya) {
      setSiswaList([]);
      setSekolah(null);
      setLoading(false);
      return;
    }

    let siswaQuery = supabase
      .from("siswa")
      .select("*, kelas(tingkat)")
      .eq("sekolah_id", sekolahIdSaya)
      .eq("status", "aktif")
      .order("nama_lengkap");

    if (kelasIdKelas6.length > 0) {
      siswaQuery = siswaQuery.in("kelas_id", kelasIdKelas6);
    } else {
      // Belum ada kelas bertingkat "VI" -> jangan tampilkan siswa kelas
      // lain sama sekali (halaman ini khusus Kelas 6).
      siswaQuery = siswaQuery.eq("kelas_id", "__tidak_ada_kelas_6__");
    }

    const [
      { data: siswa, error: siswaError },
      { data: nilai, error: nilaiError },
      { data: sklRows, error: sklError },
      { data: profil, error: profilError },
    ] = await Promise.all([
      siswaQuery,
      supabase.from("nilai_ijazah").select("*").eq("tahun_pelajaran", tahunPelajaran),
      supabase.from("skl").select("*").eq("tahun_pelajaran", tahunPelajaran),
      supabase.from("profil_sekolah").select("*").eq("sekolah_id", sekolahIdSaya).maybeSingle(),
    ]);

    if (siswaError) console.error("Gagal memuat data siswa:", siswaError);
    if (nilaiError) console.error("Gagal memuat data nilai ijazah:", nilaiError);
    if (sklError) console.error("Gagal memuat data SKL:", sklError);
    if (profilError) console.error("Gagal memuat profil sekolah:", profilError);

    const pesanError = [
      siswaError ? "data siswa" : null,
      nilaiError ? "data nilai ijazah" : null,
      sklError ? "data SKL" : null,
      profilError ? "profil sekolah" : null,
    ].filter(Boolean);
    if (pesanError.length > 0) {
      const detailAsli =
        siswaError?.message || nilaiError?.message || sklError?.message || profilError?.message || "";
      setErrorMuat(
        `Gagal memuat ${pesanError.join(", ")} dari database, sehingga halaman ini bisa kosong/tidak lengkap. ` +
          `Coba muat ulang halaman; kalau masih gagal, periksa console browser (F12).` +
          (detailAsli ? ` Detail: ${detailAsli}` : "")
      );
    }

    setSiswaList(siswa || []);
    const nMap = {};
    (nilai || []).forEach((n) => (nMap[n.siswa_id] = n));
    setNilaiMap(nMap);
    const sMap = {};
    (sklRows || []).forEach((r) => (sMap[r.siswa_id] = r));
    setSklMap(sMap);

    let logoUrl = "";
    let ttdUrl = "";
    if (profil?.logo_path) {
      const { data: pub } = supabase.storage.from("profil-sekolah").getPublicUrl(profil.logo_path);
      logoUrl = pub?.publicUrl || "";
    }
    if (profil?.ttd_kepala_sekolah_path) {
      const { data: pub } = supabase.storage
        .from("profil-sekolah")
        .getPublicUrl(profil.ttd_kepala_sekolah_path);
      ttdUrl = pub?.publicUrl || "";
    }
    setSekolah(profil ? { ...profil, logo_url: logoUrl, ttd_url: ttdUrl } : null);

    if (siswa?.length && !siswa.some((s) => s.id === selectedId)) {
      setSelectedId(siswa[0].id);
    } else if (!siswa?.length) {
      setSelectedId(null);
    }
    setLoading(false);
  }

  // ---------------------------------------------------------------------
  // INPUT MANUAL LANGSUNG DI HALAMAN — Nomor SKL & Tanggal Terbit.
  // (Nilai per mata pelajaran ditampilkan apa adanya dari nilai_ijazah,
  // diisi lewat halaman Nilai Ijazah yang sudah ada di aplikasi.)
  // ---------------------------------------------------------------------
  function ubahFieldSkl(siswaId, field, value) {
    setSklMap((prev) => ({
      ...prev,
      [siswaId]: {
        ...(prev[siswaId] || { siswa_id: siswaId, tahun_pelajaran: tahunPelajaran }),
        [field]: value,
      },
    }));
  }

  async function simpanSkl(siswaId) {
    const baris = sklMap[siswaId];
    if (!baris) return;
    setMenyimpanId(siswaId);
    const payload = {
      siswa_id: siswaId,
      tahun_pelajaran: tahunPelajaran,
      nomor_skl: baris.nomor_skl || "",
      tanggal_terbit: baris.tanggal_terbit || new Date().toISOString().slice(0, 10),
    };
    const { error } = await supabase.from("skl").upsert(payload, { onConflict: "siswa_id,tahun_pelajaran" });
    if (error) {
      alert("Gagal menyimpan SKL: " + error.message);
    }
    setMenyimpanId(null);
  }

  async function generateNomorUntukKosong() {
    const tahun = new Date().getFullYear();
    const sudahAda = Object.keys(sklMap).length;
    const rows = siswaList
      .filter((s) => !sklMap[s.id]?.nomor_skl)
      .map((s, i) => ({
        siswa_id: s.id,
        tahun_pelajaran: tahunPelajaran,
        nomor_skl: `${nomorPrefix}${String(sudahAda + i + 1).padStart(3, "0")}/${tahun}`,
        tanggal_terbit: new Date().toISOString().slice(0, 10),
      }));
    if (!rows.length) return;
    const { error } = await supabase.from("skl").upsert(rows, { onConflict: "siswa_id,tahun_pelajaran" });
    if (error) {
      alert("Gagal membuat nomor SKL: " + error.message);
      return;
    }
    loadAll();
  }

  const siswaTerpilih = useMemo(() => siswaList.find((s) => s.id === selectedId), [siswaList, selectedId]);

  const groupA = MAPEL_IJAZAH.filter((m) => m.grup === "A");
  const groupB = MAPEL_IJAZAH.filter((m) => m.grup === "B");

  // Section siswa: aktif (tampil di layar) vs nonaktif (disembunyikan di
  // layar, dimunculkan lagi saat print) — pola sama persis dengan
  // `kelasBagian()` di LaporanKeadaanMurid.jsx.
  function kelasBagianSiswa(siswaId) {
    return `laporan-section ${selectedId === siswaId ? "tab-aktif" : "tab-nonaktif"}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Toolbar — hilang saat dicetak */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-800"
          >
            <ArrowLeft size={16} /> Kembali
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Printer size={16} /> Cetak Semua SKL
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-4 mt-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Tahun Pelajaran</label>
            <input
              className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm w-36"
              value={tahunPelajaran}
              onChange={(e) => setTahunPelajaran(e.target.value)}
              placeholder="2025/2026"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Kelas</label>
            <div className="border border-slate-200 bg-slate-50 rounded-lg px-2 py-1.5 text-sm w-44 text-slate-600">
              {namaKelas6 || "Kelas 6 (VI)"}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Awalan Nomor (opsional)</label>
            <input
              className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm w-36"
              value={nomorPrefix}
              onChange={(e) => setNomorPrefix(e.target.value)}
            />
          </div>
          <button
            onClick={generateNomorUntukKosong}
            className="text-xs font-medium px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50"
          >
            Buatkan Nomor Untuk Yang Masih Kosong
          </button>
        </div>

        {errorMuat && (
          <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>{errorMuat}</span>
          </div>
        )}
        {!errorMuat && !kelasIdKelas6.length && kelasSiapDimuat && (
          <div className="mt-3 text-sm text-amber-600">
            Belum ada kelas dengan tingkat "VI" (Kelas 6) di data sekolah ini.
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TABEL SISWA + INPUT MANUAL LANGSUNG DI HALAMAN                 */}
      {/* ------------------------------------------------------------- */}
      {!loading && siswaList.length === 0 ? (
        <div className="no-print m-6 bg-white rounded-xl p-6 text-center text-slate-500">
          Belum ada siswa aktif di Kelas 6.
        </div>
      ) : (
        <div className="no-print bg-white mx-4 my-4 rounded-xl overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                <th className="px-3 py-2">Nama Siswa</th>
                <th className="px-3 py-2">NISN</th>
                <th className="px-3 py-2 w-48">Nomor SKL</th>
                <th className="px-3 py-2 w-40">Tanggal Terbit</th>
                <th className="px-3 py-2 w-28">Nilai Ijazah</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {siswaList.map((s) => {
                const baris = sklMap[s.id] || {};
                const adaNilai = !!nilaiMap[s.id];
                return (
                  <tr key={s.id} className={`border-t border-slate-100 ${selectedId === s.id ? "bg-blue-50/50" : ""}`}>
                    <td className="px-3 py-2 font-medium">{s.nama_lengkap}</td>
                    <td className="px-3 py-2 font-mono text-xs">{s.nisn}</td>
                    <td className="px-3 py-2">
                      <input
                        className="border border-slate-300 rounded px-2 py-1 text-xs w-full font-mono"
                        value={baris.nomor_skl || ""}
                        placeholder="mis. 421.2/001/2026"
                        onChange={(e) => ubahFieldSkl(s.id, "nomor_skl", e.target.value)}
                        onBlur={() => simpanSkl(s.id)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        className="border border-slate-300 rounded px-2 py-1 text-xs w-full"
                        value={baris.tanggal_terbit ? String(baris.tanggal_terbit).slice(0, 10) : ""}
                        onChange={(e) => ubahFieldSkl(s.id, "tanggal_terbit", e.target.value)}
                        onBlur={() => simpanSkl(s.id)}
                      />
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {adaNilai ? (
                        <span className="text-emerald-600 font-medium">Sudah diisi</span>
                      ) : (
                        <span className="text-amber-600 font-medium">Belum diisi</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {menyimpanId === s.id && <Loader2 size={14} className="animate-spin inline mr-2 text-slate-400" />}
                      <button
                        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50"
                        onClick={() => lihatSiswa(s.id)}
                      >
                        Lihat & Cetak
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="no-print text-xs text-slate-400 px-3 py-2">
            Nilai per mata pelajaran diisi lewat halaman Nilai Ijazah yang sudah ada — halaman ini hanya menampilkannya
            di kotak nilai saat dicetak.
          </p>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* AREA CETAK — persis pola LaporanKeadaanMurid.jsx: 1 area cetak  */}
      {/* menampung SEMUA siswa, di layar hanya siswa terpilih yang      */}
      {/* tampil (tab-aktif), sisanya disembunyikan (tab-nonaktif)       */}
      {/* sampai window.print() dipanggil. Isi tiap siswa (kop surat,    */}
      {/* biodata, kotak nilai, tanda tangan) disalin dari                */}
      {/* SklPrintTemplate.jsx lama — bingkai birunya sudah dilepas dan   */}
      {/* lebar disesuaikan pas dengan kertas A4.                         */}
      {/* ------------------------------------------------------------- */}
      <div className="lembar-cetak print-only" style={{ width: "210mm", margin: "0 auto", background: "#fff" }}>
        {siswaList.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-8">Belum ada siswa Kelas 6 untuk dicetak.</p>
        ) : (
          siswaList.map((s, idx) => {
            const skl = sklMap[s.id] || {};
            const nilai = nilaiMap[s.id] || {};
            const tanggalTerbit = skl.tanggal_terbit ? formatTanggal(skl.tanggal_terbit) : "";
            return (
              <div
                key={s.id}
                className={`${kelasBagianSiswa(s.id)} ${idx > 0 ? "page-break-before-print" : ""}`}
                style={{
                  // Lebar mengikuti kertas A4 (210mm) dikurangi margin
                  // @page (10mm kiri + 10mm kanan) = 190mm area cetak,
                  // tanpa bingkai/border apa pun di sekelilingnya.
                  width: "190mm",
                  minHeight: "277mm",
                  margin: "0 auto",
                  padding: 0,
                  fontFamily: "'Times New Roman', serif",
                  fontSize: "12pt",
                  lineHeight: 1.35,
                  color: "#000",
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    padding: 0,
                    boxSizing: "border-box",
                  }}
                >
                  {/* KOP SURAT */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      borderBottom: "3px double #2748a0",
                      paddingBottom: 5,
                      marginBottom: 10,
                    }}
                  >
                    {sekolah?.logo_url && (
                      <img
                        src={sekolah.logo_url}
                        alt="Logo"
                        style={{
                          position: "static",
                          display: "inline-block",
                          float: "none",
                          width: 64,
                          height: 64,
                          objectFit: "contain",
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <div style={{ flex: 1, textAlign: "center" }}>
                      {sekolah?.kabupaten && (
                        <p style={{ fontWeight: "bold", margin: 0, fontSize: "12pt", letterSpacing: "0.3px" }}>
                          {sekolah.kabupaten}
                        </p>
                      )}
                      {sekolah?.dinas_pendidikan && (
                        <p style={{ fontWeight: "bold", margin: 0, fontSize: "12pt", letterSpacing: "0.3px" }}>
                          {sekolah.dinas_pendidikan}
                        </p>
                      )}
                      <p style={{ fontWeight: "bold", margin: "2px 0 0 0", fontSize: "15pt", letterSpacing: "0.5px" }}>
                        {sekolah?.nama_sekolah || "NAMA SEKOLAH"}
                      </p>
                      {sekolah?.kecamatan && (
                        <p style={{ fontWeight: "bold", margin: "1px 0 0 0", fontSize: "10pt" }}>{sekolah.kecamatan}</p>
                      )}
                      {sekolah?.alamat && (
                        <p style={{ fontStyle: "italic", fontSize: "10pt", margin: "2px 0 0 0" }}>{sekolah.alamat}</p>
                      )}
                    </div>
                    {sekolah?.logo_url && <div style={{ width: 64, flexShrink: 0 }} />}
                  </div>

                  <p
                    style={{
                      textAlign: "center",
                      fontWeight: "bold",
                      textDecoration: "underline",
                      margin: "0 0 2px 0",
                      letterSpacing: "0.5px",
                    }}
                  >
                    SURAT KETERANGAN LULUS
                  </p>
                  <p style={{ textAlign: "center", margin: "0 0 12px 0" }}>Nomor: {skl.nomor_skl || "-"}</p>

                  <p style={{ textAlign: "justify", margin: "0 0 8px 0" }}>
                    Yang bertanda tangan di bawah ini Kepala {sekolah?.nama_sekolah}
                    {sekolah?.kecamatan ? `, ${sekolah.kecamatan}` : ""}
                    {sekolah?.kabupaten ? `, ${sekolah.kabupaten}` : ""}
                    {sekolah?.provinsi ? `, Provinsi ${sekolah.provinsi}` : ""}, menerangkan bahwa:
                  </p>

                  <table style={{ borderCollapse: "collapse", margin: "0 0 8px 0" }}>
                    <tbody>
                      <Baris label="Nama" nilai={s.nama_lengkap} />
                      <Baris
                        label="Tempat, Tanggal Lahir"
                        nilai={`${s.tempat_lahir || ""}, ${formatTanggal(s.tanggal_lahir)}`}
                      />
                      <Baris label="NIS" nilai={s.nis} />
                      <Baris label="NISN" nilai={s.nisn} />
                      <Baris label="Nomor Ujian" nilai={s.nomor_ujian} />
                    </tbody>
                  </table>

                  <p style={{ textAlign: "justify", margin: "0 0 8px 0" }}>
                    Bahwa siswa/siswi tersebut di atas benar-benar murid Kelas VI {sekolah?.nama_sekolah} dan telah
                    mengikuti Asesmen Sekolah Tahun Pelajaran {tahunPelajaran} dan dinyatakan <strong>BERHASIL</strong>{" "}
                    dengan nilai sebagai berikut:
                  </p>

                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "11pt",
                      margin: "0 0 10px 0",
                      pageBreakInside: "avoid",
                    }}
                  >
                    <thead>
                      <tr>
                        <th style={th}>No</th>
                        <th style={{ ...th, textAlign: "left" }}>Mata Pelajaran</th>
                        <th style={th}>Nilai</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={tdGroup} colSpan={3}>
                          I. Ujian Sekolah
                        </td>
                      </tr>
                      {groupA.map((m, i) => (
                        <tr key={m.key}>
                          <td style={td}>{i + 1}</td>
                          <td style={{ ...td, textAlign: "left" }}>{m.label}</td>
                          <td style={td}>{fmtNilai(nilai?.[m.key])}</td>
                        </tr>
                      ))}
                      <tr>
                        <td style={tdGroup} colSpan={3}>
                          II. Nilai Praktik
                        </td>
                      </tr>
                      {groupB.map((m, i) => (
                        <tr key={m.key}>
                          <td style={td}>{groupA.length + i + 1}</td>
                          <td style={{ ...td, textAlign: "left" }}>{m.label}</td>
                          <td style={td}>{fmtNilai(nilai?.[m.key])}</td>
                        </tr>
                      ))}
                      <tr>
                        <td style={tdGroup} colSpan={2}>
                          Jumlah
                        </td>
                        <td style={tdGroup}>{fmtNilai(jumlahNilai(nilai))}</td>
                      </tr>
                    </tbody>
                  </table>

                  <p style={{ textAlign: "justify", margin: 0 }}>
                    Demikian Surat Keterangan Lulus ini dibuat untuk digunakan seperlunya, sambil menantikan tibanya
                    ijazah yang bersangkutan.
                  </p>

                  <div
                    style={{
                      textAlign: "right",
                      marginTop: 10,
                      pageBreakInside: "avoid",
                      breakInside: "avoid",
                      position: "relative",
                    }}
                  >
                    <p style={{ margin: 0 }}>
                      {sekolah?.tempat_ttd || sekolah?.kecamatan || ""}, {tanggalTerbit}
                    </p>
                    <p style={{ margin: 0 }}>Kepala Sekolah</p>
                    {sekolah?.ttd_url ? (
                      <img
                        src={sekolah.ttd_url}
                        alt="TTD"
                        style={{
                          // Dikunci eksplisit supaya tidak kebawa aturan CSS
                          // global manapun (mis. img yang tidak sengaja
                          // ikut ke-override position:absolute/fixed oleh
                          // index.css) — gambar ini harus selalu mengalir
                          // normal tepat di bawah teks "Kepala Sekolah".
                          position: "static",
                          display: "inline-block",
                          float: "none",
                          height: 50,
                          width: "auto",
                          maxWidth: "100%",
                          margin: "4px 0",
                        }}
                      />
                    ) : (
                      <div style={{ height: 50 }} />
                    )}
                    <p style={{ margin: 0, fontWeight: "bold", textDecoration: "underline" }}>
                      {sekolah?.kepala_sekolah}
                    </p>
                    <p style={{ margin: 0 }}>NIP. {sekolah?.nip_kepala_sekolah}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {siswaTerpilih && (
        <p className="no-print text-center text-xs text-slate-400 pb-6">
          Menampilkan pratinjau: <strong>{siswaTerpilih.nama_lengkap}</strong> — pilih siswa lain lewat tombol
          "Lihat &amp; Cetak" di tabel, atau tekan "Cetak Semua SKL" untuk mencetak seluruh siswa Kelas 6 sekaligus
          (satu siswa satu halaman).
        </p>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CSS — disalin pola & strukturnya dari LaporanKeadaanMurid.jsx  */}
      {/* ------------------------------------------------------------- */}
      <style>{`
        .laporan-section.tab-nonaktif { display: none; }

        /* Override aturan global "@media screen { .print-only { display:
           none } }" di index.css — halaman ini MEMANG harus tampil di
           layar sebagai pratinjau. Pola sama seperti LaporanKeadaanMurid.jsx. */
        @media screen {
          .lembar-cetak.print-only {
            display: block !important;
          }
        }

        @media print {
          @page { size: A4; margin: 10mm; }
          html, body { margin: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }
          body { background: white; }
          .lembar-cetak {
            box-shadow: none !important;
            margin: 0 !important;
            width: 100% !important;
          }

          /* Saat dicetak: SEMUA siswa ditampilkan berurutan, masing-masing
             dipisah halaman baru. */
          .laporan-section.tab-nonaktif { display: block !important; }
          .page-break-before-print { break-before: page; page-break-before: always; }

          /* Override posisi "fixed" bawaan .print-only di index.css supaya
             banyak halaman SKL mengalir normal mengikuti page-break
             bawaan browser — pola sama seperti LaporanKeadaanMurid.jsx. */
          .lembar-cetak.print-only {
            position: static !important;
            top: auto !important;
            left: auto !important;
            right: auto !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }
        }
      `}</style>
    </div>
  );
}
