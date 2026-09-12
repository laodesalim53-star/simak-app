import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, FilePlus2, Loader2, Printer } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";
import Layout from "../components/Layout";
import SklPrintTemplate from "../components/SklPrintTemplate";

// HALAMAN INI adalah salinan SuratKeteranganLulus.jsx dengan dua perbedaan
// utama:
//   1) Kelas tidak lagi dipilih lewat dropdown — dicari otomatis (tingkat
//      === "VI") dan digabung kalau ada lebih dari 1 rombel, persis pola
//      cariKelas6() di Ijazah.jsx. Halaman ini KHUSUS Kelas 6.
//   2) Sistem pengambilan sekolah_id & penanganan error MENGIKUTI pola di
//      LaporanKeadaanMurid.jsx:
//        - sekolah_id diambil langsung dari useAuth() (bukan query manual
//          ke tabel "profil" tiap kali halaman dibuka).
//        - query kelas & siswa difilter eksplisit dengan .eq('sekolah_id', ...)
//          supaya tidak pernah menarik data sekolah lain.
//        - error dari Supabase DITANGKAP dan ditampilkan sebagai banner
//          (errorMuat), bukan diam-diam diabaikan seperti sebelumnya —
//          supaya kalau ada query gagal, langsung ketahuan alih-alih
//          diam-diam menampilkan data kosong/0.
//
// Bingkai (border + rounded + card pembungkus) di sekitar pratinjau SKL
// sudah dihapus sesuai permintaan — SklPrintTemplate sekarang tampil polos.

function tahunPelajaranDefault() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return m >= 7 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

export default function SuratKeteranganLulusKelas6() {
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
  const [generating, setGenerating] = useState(false);
  const [nomorPrefix, setNomorPrefix] = useState("421.2/");
  // PERBAIKAN (mengikuti LaporanKeadaanMurid.jsx): error query Supabase
  // ditangkap & ditampilkan, bukan ditelan diam-diam.
  const [errorMuat, setErrorMuat] = useState("");
  const previewRef = useRef(null);

  // Pilih siswa dari tabel lalu gulir otomatis ke kartu pratinjau di bawah,
  // supaya perubahannya kelihatan jelas (sebelumnya terasa "tidak merespon"
  // karena kartu pratinjau ada jauh di bawah tabel).
  function lihatSiswa(id) {
    setSelectedId(id);
    previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Cari kelas bertingkat "VI" milik sekolah aktif sekali di awal (sama
  // seperti cariKelas6 di Ijazah.jsx, tapi sekarang difilter sekolah_id
  // seperti pola di LaporanKeadaanMurid.jsx). Kalau ada lebih dari satu
  // rombel Kelas 6, semuanya digabung jadi satu daftar siswa.
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

    // Tingkat disimpan sebagai angka Romawi (VII, VI, dst), jadi cocokkan persis "VI"
    // (bukan .includes, karena "VI" juga jadi substring dari "VII" dan "VIII")
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
      // Belum ada kelas bertingkat "VI" ditemukan -> jangan tampilkan siswa
      // kelas lain sama sekali (halaman ini khusus Kelas 6).
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

    // PERBAIKAN: errornya sekarang dicatat DAN ditampilkan, bukan diam-diam
    // ditelan (pola sama seperti LaporanKeadaanMurid.jsx).
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

    // profil_sekolah hanya menyimpan logo_path & ttd_kepala_sekolah_path
    // (path di Supabase Storage), bukan URL langsung — makanya harus diubah
    // dulu jadi URL publik di sini, sama seperti di ProfilSekolah.jsx.
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

    // Pilih siswa pertama (reset kalau siswa lama tidak ada di daftar ini)
    if (siswa?.length && !siswa.some((s) => s.id === selectedId)) {
      setSelectedId(siswa[0].id);
    } else if (!siswa?.length) {
      setSelectedId(null);
    }
    setLoading(false);
  }

  // Buat nomor SKL untuk siswa yang belum punya, urut berdasar urutan nama
  // (mengikuti nomor urut siswa di tabel), format: {prefix}{urut}/{tahun berjalan}
  async function generateNomorUntukSemua() {
    setGenerating(true);
    const tahun = new Date().getFullYear();
    const rows = siswaList
      .filter((s) => !sklMap[s.id])
      .map((s, i) => ({
        siswa_id: s.id,
        tahun_pelajaran: tahunPelajaran,
        nomor_skl: `${nomorPrefix}${String(Object.keys(sklMap).length + i + 1).padStart(3, "0")}/${tahun}`,
        tanggal_terbit: new Date().toISOString().slice(0, 10),
      }));
    if (rows.length) {
      const { error } = await supabase.from("skl").upsert(rows, { onConflict: "siswa_id,tahun_pelajaran" });
      if (error) {
        alert("Gagal membuat nomor SKL: " + error.message);
        setGenerating(false);
        return;
      }
    }
    setGenerating(false);
    loadAll();
  }

  const siswaTerpilih = useMemo(() => siswaList.find((s) => s.id === selectedId), [siswaList, selectedId]);

  const sekolahUntukCetak = sekolah
    ? {
        nama_sekolah: sekolah.nama_sekolah,
        npsn: sekolah.npsn,
        kabupaten: sekolah.kabupaten,
        kecamatan: sekolah.kecamatan,
        dinas_pendidikan: sekolah.dinas_pendidikan,
        alamat: sekolah.alamat,
        provinsi: sekolah.provinsi,
        tempat_ttd: sekolah.tempat_ttd,
        kepala_sekolah: sekolah.kepala_sekolah,
        nip_kepala_sekolah: sekolah.nip_kepala_sekolah,
        // logo_url & ttd_url sudah berupa URL publik hasil getPublicUrl()
        // di loadAll(), diambil dari logo_path & ttd_kepala_sekolah_path.
        logo_url: sekolah.logo_url,
        ttd_url: sekolah.ttd_url,
      }
    : null;

  return (
    <Layout
      title="Surat Keterangan Lulus — Kelas 6"
      subtitle="Nomor SKL otomatis per siswa, dicetak dari nilai ijazah yang sudah diisi"
      actions={
        <button className="btn-primary" onClick={generateNomorUntukSemua} disabled={generating || loading}>
          {generating ? <Loader2 size={16} className="animate-spin" /> : <FilePlus2 size={16} />}
          Buat Nomor Untuk Siswa Baru
        </button>
      }
    >
      <div className="card p-4 mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-semibold text-ink-700/60 mb-1">Tahun Pelajaran</label>
          <input
            className="input-field w-40"
            value={tahunPelajaran}
            onChange={(e) => setTahunPelajaran(e.target.value)}
            placeholder="2025/2026"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink-700/60 mb-1">Kelas</label>
          <div className="input-field w-48 bg-ink-900/5 text-ink-700/70 flex items-center">
            {namaKelas6 || "Kelas 6 (VI)"}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink-700/60 mb-1">Awalan Nomor Surat</label>
          <input className="input-field w-40" value={nomorPrefix} onChange={(e) => setNomorPrefix(e.target.value)} />
        </div>
      </div>

      {errorMuat && (
        <div className="mb-6 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          <span>{errorMuat}</span>
        </div>
      )}

      {!errorMuat && !kelasIdKelas6.length && kelasSiapDimuat && (
        <div className="card p-4 mb-6 text-sm text-amber-600">
          Belum ada kelas dengan tingkat "VI" (Kelas 6) di data sekolah ini.
        </div>
      )}

      {loading ? (
        <p>Memuat...</p>
      ) : siswaList.length === 0 ? (
        <div className="card p-6 text-center text-ink-700/60">Belum ada siswa aktif di Kelas 6.</div>
      ) : (
        <>
          <div className="card overflow-x-auto mb-6">
            <table className="table-shell">
              <thead>
                <tr>
                  <th>Nama Siswa</th>
                  <th>NISN</th>
                  <th>Nomor SKL</th>
                  <th>Tanggal Terbit</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {siswaList.map((s) => {
                  const skl = sklMap[s.id];
                  return (
                    <tr key={s.id} className={selectedId === s.id ? "bg-brass-400/10" : ""}>
                      <td className="font-semibold">{s.nama_lengkap}</td>
                      <td className="font-mono text-xs">{s.nisn}</td>
                      <td className="font-mono text-xs">
                        {skl ? (
                          skl.nomor_skl
                        ) : (
                          <span className="badge bg-amber-500/15 text-amber-600">Belum dibuat</span>
                        )}
                      </td>
                      <td>{skl ? new Date(skl.tanggal_terbit).toLocaleDateString("id-ID") : "-"}</td>
                      <td>
                        <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => lihatSiswa(s.id)}>
                          Lihat
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="card p-4" ref={previewRef}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <label className="block text-xs font-semibold text-ink-700/60 mb-1">Pratinjau Siswa</label>
                <select
                  className="input-field w-64"
                  value={selectedId || ""}
                  onChange={(e) => setSelectedId(e.target.value)}
                >
                  {siswaList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama_lengkap}
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn-primary" onClick={() => window.print()} disabled={!sklMap[selectedId]}>
                <Printer size={16} /> Cetak SKL
              </button>
            </div>

            {!sklMap[selectedId] && (
              <p className="text-sm text-amber-600 mb-3">
                Siswa ini belum punya nomor SKL — klik "Buat Nomor Untuk Siswa Baru" di atas dulu.
              </p>
            )}

            {!sekolah && !loading && (
              <p className="text-sm text-red-600 mb-3">
                Profil sekolah tidak ditemukan untuk akun ini — kop surat tidak akan tampil sampai profil sekolah diisi.
              </p>
            )}

            {/* Bingkai (border + rounded + overflow-auto + maxHeight) di
                sekitar pratinjau sudah dihapus sesuai permintaan —
                SklPrintTemplate tampil polos tanpa card pembungkus. */}
            <SklPrintTemplate
              siswa={siswaTerpilih}
              nilai={nilaiMap[selectedId] || {}}
              sekolah={sekolahUntukCetak}
              skl={sklMap[selectedId]}
              tahunPelajaran={tahunPelajaran}
            />
          </div>
        </>
      )}
    </Layout>
  );
}
