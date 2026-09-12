import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Layout from "../components/Layout";
import { MAPEL_IJAZAH, jumlahNilai, rataRataNilai } from "../components/IjazahPrintTemplate";
import RekapIjazahPrintTemplate from "../components/RekapIjazahPrintTemplate";
import ImporNilaiAsesmenModal from "../components/ImporNilaiAsesmenModal";
import DetailNilaiSiswaModal from "../components/DetailNilaiSiswaModal";
import {
  Loader2,
  Save,
  Printer,
  FileEdit,
  RectangleVertical,
  RectangleHorizontal,
} from "lucide-react";

// Tahun pelajaran default: kalau sekarang Juli-Des, "thn/thn+1"; kalau Jan-Jun, "thn-1/thn".
function tahunPelajaranDefault() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return m >= 7 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

export default function Ijazah() {
  const [tahunPelajaran, setTahunPelajaran] = useState(tahunPelajaranDefault());

  // PERUBAHAN: halaman Ijazah sekarang KHUSUS Kelas 6 saja (siswa lulus),
  // jadi tidak ada lagi dropdown pemilihan kelas. kelasId diisi otomatis
  // dari kelas yang tingkatnya "VI" dan tidak bisa diubah dari UI.
  // Kalau sekolah punya lebih dari 1 rombel Kelas 6, semuanya tetap
  // digabung (kelasId di sini berupa array id, bukan 1 id saja) supaya
  // tidak ada siswa Kelas 6 yang "hilang" hanya karena beda rombel.
  const [kelasIdKelas6, setKelasIdKelas6] = useState([]);
  const [namaKelas6, setNamaKelas6] = useState("");
  const [kelasSiapDimuat, setKelasSiapDimuat] = useState(false);

  const [siswaList, setSiswaList] = useState([]);
  const [nilaiMap, setNilaiMap] = useState({}); // siswa_id -> {pend_agama: .., ...}
  const [sekolah, setSekolah] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [detailSiswa, setDetailSiswa] = useState(null); // siswa yang lagi dibuka di modal Detail & Cetak

  // Orientasi kertas untuk cetak rekap: "portrait" (tegak) atau "landscape" (mendatar)
  const [orientasiCetak, setOrientasiCetak] = useState("landscape");

  // Ambil kelas Kelas 6 sekali di awal (tidak ada lagi pilihan kelas lain)
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
  // saja alih-alih query ulang ke tabel profil di sini — sama seperti catatan
  // di SuratKeteranganLulus.jsx.
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

    const [{ data: siswa }, { data: nilai }, { data: profil }] = await Promise.all([
      siswaQuery,
      supabase.from("nilai_ijazah").select("*").eq("tahun_pelajaran", tahunPelajaran),
      profilQuery,
    ]);
    setSiswaList(siswa || []);
    const map = {};
    (nilai || []).forEach((n) => {
      map[n.siswa_id] = n;
    });
    setNilaiMap(map);
    setSekolah(profil || null);
    // Pilih siswa pertama di Kelas 6 (reset kalau siswa lama tidak ada lagi di daftar)
    if (siswa?.length && !siswa.some((s) => s.id === selectedId)) {
      setSelectedId(siswa[0].id);
    } else if (!siswa?.length) {
      setSelectedId(null);
    }
    setLoading(false);
  }

  function ubahNilai(siswaId, key, value) {
    setNilaiMap((prev) => ({
      ...prev,
      [siswaId]: { ...(prev[siswaId] || {}), [key]: value === "" ? null : Number(value) },
    }));
  }

  async function simpanSemua() {
    setSaving(true);
    const rows = siswaList.map((s) => ({
      siswa_id: s.id,
      tahun_pelajaran: tahunPelajaran,
      ...MAPEL_IJAZAH.reduce((acc, m) => {
        acc[m.key] = nilaiMap[s.id]?.[m.key] ?? null;
        return acc;
      }, {}),
    }));
    const { error } = await supabase
      .from("nilai_ijazah")
      .upsert(rows, { onConflict: "siswa_id,tahun_pelajaran" });
    setSaving(false);
    if (error) {
      alert("Gagal menyimpan nilai: " + error.message);
      return;
    }
    loadAll();
  }

  // Gabungkan siswa + nilainya jadi satu objek per siswa untuk dikonsumsi
  // RekapIjazahPrintTemplate (butuh siswa.nilai, bukan lookup terpisah).
  const siswaUntukRekap = useMemo(
    () => siswaList.map((s) => ({ ...s, nilai: nilaiMap[s.id] || {} })),
    [siswaList, nilaiMap]
  );

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
        pengawas: sekolah.pengawas,
        nip_pengawas: sekolah.nip_pengawas,
        ttd_url: sekolah.ttd_url,
      }
    : null;

  return (
    <Layout
      title="Ijazah"
      subtitle="Pengisian nilai kelulusan (9 mapel) dan cetak rekap data ijazah kelulusan — khusus Kelas 6"
      actions={
        <div className="no-print flex gap-2">
          <ImporNilaiAsesmenModal
            siswaList={siswaList}
            tahunPelajaranDefault={tahunPelajaran}
            onSelesai={loadAll}
          />
          <button className="btn-primary" onClick={simpanSemua} disabled={saving || loading}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Simpan Nilai
          </button>
        </div>
      }
    >
      {/*
        Sistem print halaman ini mengikuti pola global aplikasi (class
        "no-print" & "print-only", lihat index.css): semua elemen
        disembunyikan saat print KECUALI yang berkelas "print-only".
        Karena area rekap di sini juga harus tampil normal di layar
        (bukan template tersembunyi), aturan "display: none" bawaan untuk
        .print-only di-override khusus untuk kelas ".rekap-ijazah.print-only"
        — sama seperti pola ".lembar-cetak.print-only" di
        LaporanKeadaanMurid.jsx.

        position/overflow/max-height juga di-override saat print supaya
        kontainer scroll (dipakai untuk preview di layar) tidak lagi
        membatasi tinggi konten saat dicetak — inilah penyebab tampilan
        tumpang-tindih/terpotong pada percobaan cetak sebelumnya.
      */}
      <style>{`
        @media screen {
          .rekap-ijazah.print-only {
            display: block !important;
          }
        }

        @media print {
          .no-print { display: none !important; }

          .rekap-ijazah.print-only {
            position: static !important;
            top: auto !important;
            left: auto !important;
            right: auto !important;
            max-height: none !important;
            overflow: visible !important;
            border: none !important;
            border-radius: 0 !important;
          }
        }

        /* PENTING: @page HARUS ditulis di luar (bukan disarangkan di dalam)
           blok @media print — kalau disarangkan, sebagian browser diam-diam
           mengabaikannya dan jatuh balik ke ukuran default (A4 potrait),
           sehingga banyak ruang kosong muncul di bawah konten saat dicetak.
           Pola ini disamakan dengan @page di LaporanKeadaanMurid.jsx. */
        @page {
          size: ${orientasiCetak === "landscape" ? "330mm 210mm" : "210mm 297mm"};
          margin: 0;
        }
      `}</style>

      <div className="no-print card p-4 mb-6 flex flex-wrap items-end gap-4">
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
          {/* Tidak ada lagi dropdown pilih kelas — halaman ini khusus Kelas 6 */}
          <div className="input-field w-48 bg-ink-900/5 text-ink-700/70 flex items-center">
            {namaKelas6 || "Kelas 6 (VI)"}
          </div>
        </div>
      </div>

      {loading ? (
        <p>Memuat...</p>
      ) : !kelasIdKelas6.length ? (
        <div className="card p-6 text-center text-ink-700/60">
          Belum ada kelas dengan tingkat "VI" (Kelas 6) di data sekolah ini.
        </div>
      ) : siswaList.length === 0 ? (
        <div className="card p-6 text-center text-ink-700/60">Belum ada siswa aktif di Kelas 6.</div>
      ) : (
        <>
          <div className="no-print card overflow-x-auto mb-6">
            <table className="table-shell">
              <thead>
                <tr>
                  <th>Nama Siswa</th>
                  {MAPEL_IJAZAH.map((m) => (
                    <th key={m.key} className="text-right">
                      {m.label.split(" ")[0]}
                    </th>
                  ))}
                  <th className="text-right">Jumlah</th>
                  <th className="text-right">Rata²</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {siswaList.map((s) => {
                  const v = nilaiMap[s.id] || {};
                  return (
                    <tr key={s.id} className={selectedId === s.id ? "bg-brass-400/10" : ""}>
                      <td>
                        <button className="font-semibold text-left hover:underline" onClick={() => setSelectedId(s.id)}>
                          {s.nama_lengkap}
                        </button>
                        <div className="text-xs text-ink-700/50 font-mono">{s.nisn}</div>
                      </td>
                      {MAPEL_IJAZAH.map((m) => (
                        <td key={m.key} className="text-right">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            className="w-16 text-right rounded border border-ink-900/15 px-1.5 py-1 text-sm"
                            value={v[m.key] ?? ""}
                            onChange={(e) => ubahNilai(s.id, m.key, e.target.value)}
                          />
                        </td>
                      ))}
                      <td className="text-right font-semibold">{jumlahNilai(v).toFixed(2)}</td>
                      <td className="text-right font-semibold">{rataRataNilai(v).toFixed(2)}</td>
                      <td className="text-right">
                        <button
                          className="btn-secondary !px-2.5 !py-1.5 text-xs whitespace-nowrap"
                          onClick={() => setDetailSiswa(s)}
                          title="Isi nilai per semester & cetak Daftar Nilai Kolektif"
                        >
                          <FileEdit size={14} /> Detail &amp; Cetak
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {detailSiswa && (
            <DetailNilaiSiswaModal
              siswa={detailSiswa}
              sekolah={sekolahUntukCetak}
              tahunPelajaran={tahunPelajaran}
              onClose={() => setDetailSiswa(null)}
              onSaved={loadAll}
            />
          )}

          <div className="no-print card p-4 mb-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-700/60 mb-1">Pratinjau Rekap</label>
              <p className="text-sm text-ink-700/60">
                {siswaList.length} siswa · Kelas 6 · Tahun Pelajaran {tahunPelajaran}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-ink-900/15 overflow-hidden">
                <button
                  type="button"
                  className={`!px-2.5 !py-1.5 text-xs flex items-center gap-1 transition-colors ${
                    orientasiCetak === "portrait"
                      ? "bg-brass-400/20 font-semibold"
                      : "bg-transparent hover:bg-ink-900/5"
                  }`}
                  onClick={() => setOrientasiCetak("portrait")}
                  title="Cetak posisi Potrait (tegak)"
                >
                  <RectangleVertical size={14} /> Potrait
                </button>
                <button
                  type="button"
                  className={`!px-2.5 !py-1.5 text-xs flex items-center gap-1 border-l border-ink-900/15 transition-colors ${
                    orientasiCetak === "landscape"
                      ? "bg-brass-400/20 font-semibold"
                      : "bg-transparent hover:bg-ink-900/5"
                  }`}
                  onClick={() => setOrientasiCetak("landscape")}
                  title="Cetak posisi Landscape (mendatar)"
                >
                  <RectangleHorizontal size={14} /> Landscape
                </button>
              </div>

              <button className="btn-primary" onClick={() => window.print()}>
                <Printer size={16} /> Cetak Rekap Ijazah
              </button>
            </div>
          </div>

          <div
            className="rekap-ijazah print-only border border-ink-900/10 rounded-lg overflow-auto"
            style={{ maxHeight: "70vh" }}
          >
            <RekapIjazahPrintTemplate
              siswaList={siswaUntukRekap}
              sekolah={sekolahUntukCetak}
              tahunPelajaran={tahunPelajaran}
              orientasi={orientasiCetak}
            />
          </div>
        </>
      )}
    </Layout>
  );
}
