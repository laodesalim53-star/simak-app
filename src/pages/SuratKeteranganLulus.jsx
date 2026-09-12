import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Layout from "../components/Layout";
import SklPrintTemplate from "../components/SklPrintTemplate";
import { Printer, Loader2, FilePlus2 } from "lucide-react";

// HALAMAN INI adalah salinan SuratKeteranganLulus.jsx dengan SATU perbedaan
// utama: tidak ada lagi dropdown pilih kelas. Kelasnya dicari otomatis
// (tingkat === "VI") dan digabung kalau ada lebih dari 1 rombel — persis
// pola cariKelas6() di Ijazah.jsx. Jadi halaman ini KHUSUS Kelas 6, tidak
// bisa dipakai untuk kelas lain (sesuai permintaan).

function tahunPelajaranDefault() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return m >= 7 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

export default function SuratKeteranganLulusKelas6() {
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
  const previewRef = useRef(null);

  // Pilih siswa dari tabel lalu gulir otomatis ke kartu pratinjau di bawah,
  // supaya perubahannya kelihatan jelas (sebelumnya terasa "tidak merespon"
  // karena kartu pratinjau ada jauh di bawah tabel).
  function lihatSiswa(id) {
    setSelectedId(id);
    previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Cari kelas bertingkat "VI" sekali di awal (sama seperti cariKelas6 di
  // Ijazah.jsx). Kalau ada lebih dari satu rombel Kelas 6, semuanya
  // digabung jadi satu daftar siswa.
  useEffect(() => {
    cariKelas6();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (kelasSiapDimuat) {
      loadAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahunPelajaran, kelasSiapDimuat, kelasIdKelas6]);

  async function cariKelas6() {
    const { data: kelas } = await supabase.from("kelas").select("*").order("nama_kelas");
    // Tingkat disimpan sebagai angka Romawi (VII, VI, dst), jadi cocokkan persis "VI"
    // (bukan .includes, karena "VI" juga jadi substring dari "VII" dan "VIII")
    const semuaKelas6 = (kelas || []).filter(
      (k) => String(k.tingkat).trim().toUpperCase() === "VI"
    );
    setKelasIdKelas6(semuaKelas6.map((k) => k.id));
    setNamaKelas6(semuaKelas6.map((k) => k.nama_kelas).join(", "));
    setKelasSiapDimuat(true);
  }

  // Ambil sekolah_id user yang sedang login lewat tabel profil.
  // PENTING: kalau aplikasi kamu sudah punya context/hook auth (mis. useAuth())
  // yang menyimpan sekolah_id user aktif, ganti fungsi ini untuk memakai itu
  // saja alih-alih query ulang ke tabel profil di sini.
  async function getSekolahIdAktif() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profilUser } = await supabase
      .from("profil")
      .select("sekolah_id")
      .eq("id", user.id)
      .maybeSingle();
    return profilUser?.sekolah_id ?? null;
  }

  async function loadAll() {
    setLoading(true);

    const sekolahIdAktif = await getSekolahIdAktif();

    let siswaQuery = supabase
      .from("siswa")
      .select("*, kelas(tingkat)")
      .eq("status", "aktif")
      .order("nama_lengkap");

    if (kelasIdKelas6.length > 0) {
      siswaQuery = siswaQuery.in("kelas_id", kelasIdKelas6);
    } else {
      // Belum ada kelas bertingkat "VI" ditemukan -> jangan tampilkan siswa
      // kelas lain sama sekali (halaman ini khusus Kelas 6).
      siswaQuery = siswaQuery.eq("kelas_id", "__tidak_ada_kelas_6__");
    }

    let profilQuery = supabase.from("profil_sekolah").select("*");
    profilQuery = sekolahIdAktif
      ? profilQuery.eq("sekolah_id", sekolahIdAktif).maybeSingle()
      : profilQuery.limit(0); // tidak ada sekolah_id -> jangan tampilkan profil siapa pun

    const [{ data: siswa }, { data: nilai }, { data: sklRows }, { data: profil }] = await Promise.all([
      siswaQuery,
      supabase.from("nilai_ijazah").select("*").eq("tahun_pelajaran", tahunPelajaran),
      supabase.from("skl").select("*").eq("tahun_pelajaran", tahunPelajaran),
      profilQuery,
    ]);
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

      {!kelasIdKelas6.length && kelasSiapDimuat && (
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

            <div className="border border-ink-900/10 rounded-lg overflow-auto" style={{ maxHeight: "70vh" }}>
              <SklPrintTemplate
                siswa={siswaTerpilih}
                nilai={nilaiMap[selectedId] || {}}
                sekolah={sekolahUntukCetak}
                skl={sklMap[selectedId]}
                tahunPelajaran={tahunPelajaran}
              />
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
