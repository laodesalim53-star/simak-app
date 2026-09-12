import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Loader2, Printer } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";

// ============================================================================
// SuratKeteranganLulusKelas6.jsx — VERSI BARU
// ----------------------------------------------------------------------------
// Dua hal yang diminta diubah dari versi lama (yang memakai komponen terpisah
// <SklPrintTemplate />):
//
//   1) INPUT MANUAL LANGSUNG DI HALAMAN
//      Dulu, Nomor SKL & Tanggal Terbit hanya bisa diisi lewat tombol
//      "Buat Nomor Untuk Semua" (auto-generate, tidak bisa diedit manual per
//      siswa). Sekarang setiap baris siswa punya 3 input yang bisa diketik
//      langsung di tabel: Nomor SKL, Tanggal Terbit, dan Nilai Rata-rata —
//      persis pola input manual "Masuk/Keluar Dalam Bulan Ini" di
//      LaporanKeadaanMurid.jsx (angka diketik langsung, tersimpan ke Supabase
//      saat kolom kehilangan fokus/onBlur).
//
//      PENTING — MIGRASI SUPABASE YANG DIPERLUKAN sebelum kolom Nilai
//      Rata-rata berfungsi (kalau kolomnya belum ada):
//        ALTER TABLE skl ADD COLUMN IF NOT EXISTS nilai_rata_rata numeric;
//
//   2) SISTEM CETAK MENGIKUTI LaporanKeadaanMurid.jsx PERSIS
//      Dulu, isi surat dirender oleh komponen terpisah <SklPrintTemplate />
//      dan hanya siswa yang sedang dipilih yang tercetak.
//      Sekarang isi surat dirender LANGSUNG di file ini (tanpa komponen
//      terpisah), dengan pola yang sama persis seperti
//      LaporanKeadaanMurid.jsx:
//        - Satu div `.lembar-cetak.print-only` menampung SEMUA siswa
//          sekaligus (setiap siswa = 1 "section").
//        - Di LAYAR, hanya siswa yang sedang dipilih (tab aktif) yang
//          tampil — section siswa lain disembunyikan lewat class
//          `laporan-section tab-nonaktif` (sama seperti tab
//          Keadaan/Usia/Agama/Kewarganegaraan di LaporanKeadaanMurid.jsx).
//        - Saat tombol "Cetak Semua SKL" ditekan (window.print()), CSS
//          @media print membalik aturan itu: SEMUA section ditampilkan
//          sekaligus, masing-masing dipisah halaman baru lewat
//          `page-break-before-print`, sama persis seperti keempat laporan
//          (Keadaan Murid → Usia → Agama → Kewarganegaraan) di
//          LaporanKeadaanMurid.jsx.
//        - Class & aturan CSS (.no-print, .only-print, .print-only,
//          override `@media screen { .lembar-cetak.print-only { display:
//          block !important } }`, dan override posisi `position: static`
//          saat print) disalin apa adanya dari LaporanKeadaanMurid.jsx,
//          supaya perilakunya konsisten dengan halaman itu.
//
// Sistem penarikan data (kelas VI dicari otomatis lewat tingkat === "VI",
// sekolah_id diambil dari useAuth(), semua query difilter .eq('sekolah_id',
// ...), error Supabase ditangkap & ditampilkan sebagai banner) TETAP memakai
// pola yang sama seperti file lama.
// ============================================================================

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
  // PENARIKAN DATA (sama seperti file lama)
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
      { data: sklRows, error: sklError },
      { data: profil, error: profilError },
    ] = await Promise.all([
      siswaQuery,
      supabase.from("skl").select("*").eq("tahun_pelajaran", tahunPelajaran),
      supabase.from("profil_sekolah").select("*").eq("sekolah_id", sekolahIdSaya).maybeSingle(),
    ]);

    if (siswaError) console.error("Gagal memuat data siswa:", siswaError);
    if (sklError) console.error("Gagal memuat data SKL:", sklError);
    if (profilError) console.error("Gagal memuat profil sekolah:", profilError);

    const pesanError = [
      siswaError ? "data siswa" : null,
      sklError ? "data SKL" : null,
      profilError ? "profil sekolah" : null,
    ].filter(Boolean);
    if (pesanError.length > 0) {
      const detailAsli = siswaError?.message || sklError?.message || profilError?.message || "";
      setErrorMuat(
        `Gagal memuat ${pesanError.join(", ")} dari database, sehingga halaman ini bisa kosong/tidak lengkap. ` +
          `Coba muat ulang halaman; kalau masih gagal, periksa console browser (F12).` +
          (detailAsli ? ` Detail: ${detailAsli}` : "")
      );
    }

    setSiswaList(siswa || []);
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
  // INPUT MANUAL LANGSUNG DI HALAMAN
  // Setiap baris siswa bisa diedit langsung: Nomor SKL, Tanggal Terbit,
  // Nilai Rata-rata. Disimpan (upsert) ke tabel `skl` saat kolom
  // kehilangan fokus (onBlur), state lokal (sklMap) diperbarui langsung
  // supaya tampilan tidak "lompat" menunggu round-trip ke server.
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
      nilai_rata_rata: baris.nilai_rata_rata === "" ? null : Number(baris.nilai_rata_rata),
    };
    const { error } = await supabase.from("skl").upsert(payload, { onConflict: "siswa_id,tahun_pelajaran" });
    if (error) {
      alert("Gagal menyimpan SKL: " + error.message);
    }
    setMenyimpanId(null);
  }

  // Buat nomor untuk siswa yang belum punya nomor sama sekali (opsional,
  // pelengkap input manual — bukan satu-satunya cara mengisi lagi).
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

  const KopSurat = () => (
    <div className="flex items-center gap-4 border-b-4 border-black pb-3 mb-4">
      {sekolah?.logo_url && (
        <img src={sekolah.logo_url} alt="Logo" className="w-16 h-16 object-contain shrink-0" />
      )}
      <div className="text-center flex-1">
        <p className="text-sm font-medium uppercase">{sekolah?.dinas_pendidikan || "PEMERINTAH DAERAH"}</p>
        <p className="text-lg font-bold uppercase">{sekolah?.nama_sekolah || "Nama Sekolah"}</p>
        <p className="text-xs">
          {[sekolah?.alamat, sekolah?.kecamatan, sekolah?.kabupaten, sekolah?.provinsi].filter(Boolean).join(", ")}
        </p>
        <p className="text-xs">NPSN: {sekolah?.npsn || "-"}</p>
      </div>
    </div>
  );

  const TandaTangan = ({ tanggalTerbit }) => (
    <div className="flex justify-end mt-10">
      <div className="text-center text-xs w-64">
        <p>
          {sekolah?.tempat_ttd || sekolah?.kecamatan || "............"},{" "}
          {tanggalTerbit
            ? new Date(tanggalTerbit).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
            : "............"}
        </p>
        <p className="mt-1">Kepala Sekolah</p>
        <div className="h-16">
          {sekolah?.ttd_url && (
            <img src={sekolah.ttd_url} alt="TTD" className="h-16 object-contain mx-auto" onError={(e) => (e.currentTarget.style.display = "none")} />
          )}
        </div>
        <p className="font-semibold underline">{sekolah?.kepala_sekolah || "............................"}</p>
        <p>NIP. {sekolah?.nip_kepala_sekolah || "............................"}</p>
      </div>
    </div>
  );

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
                <th className="px-3 py-2 w-32">Nilai Rata-rata</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {siswaList.map((s) => {
                const baris = sklMap[s.id] || {};
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
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        className="border border-slate-300 rounded px-2 py-1 text-xs w-full"
                        value={baris.nilai_rata_rata ?? ""}
                        onChange={(e) => ubahFieldSkl(s.id, "nilai_rata_rata", e.target.value)}
                        onBlur={() => simpanSkl(s.id)}
                      />
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
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* AREA CETAK — persis pola LaporanKeadaanMurid.jsx:               */}
      {/* 1 div .lembar-cetak.print-only menampung SEMUA siswa, di layar  */}
      {/* hanya siswa terpilih yang tampil (tab-aktif), sisanya           */}
      {/* disembunyikan (tab-nonaktif) sampai window.print() dipanggil.   */}
      {/* ------------------------------------------------------------- */}
      <div
        className="lembar-cetak print-only bg-white mx-auto my-6 p-10 shadow-sm"
        style={{ width: "210mm" }}
        ref={previewRef}
      >
        {siswaList.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-8">Belum ada siswa Kelas 6 untuk dicetak.</p>
        ) : (
          siswaList.map((s, idx) => {
            const skl = sklMap[s.id] || {};
            return (
              <div key={s.id} className={`${kelasBagianSiswa(s.id)} ${idx > 0 ? "page-break-before-print" : ""}`}>
                <KopSurat />
                <h1 className="text-center font-bold text-base uppercase underline mb-1">SURAT KETERANGAN LULUS</h1>
                <p className="text-center text-xs mb-6">Nomor: {skl.nomor_skl || "............................"}</p>

                <p className="text-sm mb-4">
                  Yang bertanda tangan di bawah ini, Kepala {sekolah?.nama_sekolah || "Sekolah"}, menerangkan bahwa:
                </p>

                <table className="text-sm mb-4 ml-4">
                  <tbody>
                    <tr>
                      <td className="pr-4 py-0.5 align-top w-48">Nama Lengkap</td>
                      <td className="pr-2 py-0.5 align-top">:</td>
                      <td className="py-0.5 font-semibold">{s.nama_lengkap}</td>
                    </tr>
                    <tr>
                      <td className="pr-4 py-0.5 align-top">NISN / NIS</td>
                      <td className="pr-2 py-0.5 align-top">:</td>
                      <td className="py-0.5">{s.nisn} / {s.nis}</td>
                    </tr>
                    <tr>
                      <td className="pr-4 py-0.5 align-top">Tempat, Tanggal Lahir</td>
                      <td className="pr-2 py-0.5 align-top">:</td>
                      <td className="py-0.5">
                        {s.tempat_lahir || "-"},{" "}
                        {s.tanggal_lahir
                          ? new Date(s.tanggal_lahir).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
                          : "-"}
                      </td>
                    </tr>
                    <tr>
                      <td className="pr-4 py-0.5 align-top">Nama Orang Tua/Wali</td>
                      <td className="pr-2 py-0.5 align-top">:</td>
                      <td className="py-0.5">{s.nama_orang_tua || s.nama_wali || "-"}</td>
                    </tr>
                  </tbody>
                </table>

                <p className="text-sm mb-4 text-justify">
                  Berdasarkan hasil rapat dewan guru, dinyatakan <strong>LULUS</strong> dari{" "}
                  {sekolah?.nama_sekolah || "sekolah ini"} pada tahun pelajaran {tahunPelajaran}
                  {skl.nilai_rata_rata !== undefined && skl.nilai_rata_rata !== null && skl.nilai_rata_rata !== "" ? (
                    <>, dengan nilai rata-rata <strong>{skl.nilai_rata_rata}</strong></>
                  ) : null}
                  .
                </p>

                <p className="text-sm mb-2 text-justify">
                  Surat Keterangan Lulus ini dibuat untuk dipergunakan sebagaimana mestinya.
                </p>

                <TandaTangan tanggalTerbit={skl.tanggal_terbit} />
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
        /* Di layar: hanya section siswa terpilih yang tampil; siswa lain
           disembunyikan sampai saatnya dicetak. */
        .laporan-section.tab-nonaktif { display: none; }

        /* Override aturan global "@media screen { .print-only { display:
           none } }" di index.css (aturan itu didesain untuk PrintTemplate
           terpisah yang memang tidak pernah tampil di layar). Halaman ini
           MEMANG harus tampil di layar sebagai pratinjau. Selector 2-class
           ini lebih spesifik daripada ".print-only" saja, jadi menang tanpa
           perlu mengubah index.css — pola sama seperti
           LaporanKeadaanMurid.jsx. */
        @media screen {
          .lembar-cetak.print-only {
            display: block !important;
          }
        }

        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .lembar-cetak {
            box-shadow: none !important;
            margin: 0 !important;
            width: 100% !important;
          }

          /* Saat dicetak: SEMUA siswa ditampilkan berurutan (bukan cuma
             siswa yang sedang dipilih di layar), masing-masing dipisah
             halaman baru. */
          .laporan-section.tab-nonaktif { display: block !important; }
          .page-break-before-print { break-before: page; page-break-before: always; }

          /* CSS global (index.css) punya aturan:
               body * { visibility: hidden; }
               .print-only, .print-only * { visibility: visible; }
             dan memberi .print-only posisi "fixed" secara default.
             Di-override jadi "static" di sini supaya banyak halaman SKL
             (lebih dari 1 siswa) tetap mengalir normal mengikuti
             page-break bawaan browser, bukan terpotong/menumpuk di satu
             titik fixed — pola sama seperti LaporanKeadaanMurid.jsx. */
          .lembar-cetak.print-only {
            position: static !important;
            top: auto !important;
            left: auto !important;
            right: auto !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }
        }
        @page {
          size: A4 portrait;
          margin: 15mm;
        }
      `}</style>
    </div>
  );
}
