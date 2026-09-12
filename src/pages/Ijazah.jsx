import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Printer, Save, FileEdit, RectangleVertical, RectangleHorizontal } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { MAPEL_IJAZAH, jumlahNilai, rataRataNilai } from "../components/IjazahPrintTemplate";
import ImporNilaiAsesmenModal from "../components/ImporNilaiAsesmenModal";
import DetailNilaiSiswaModal from "../components/DetailNilaiSiswaModal";

// HALAMAN INI DITULIS ULANG dari versi sebelumnya yang memakai komponen
// terpisah RekapIjazahPrintTemplate.jsx untuk versi cetak. Karena CSS di
// dalam komponen itu tidak diketahui isinya dan kemungkinan bentrok dengan
// aturan print global aplikasi, sekarang HANYA ADA SATU TABEL yang dipakai
// baik untuk mengisi nilai di layar maupun untuk dicetak — polanya disalin
// persis dari LaporanKeadaanMurid.jsx (yang sudah terbukti normal):
//   - input angka: class "no-print" (hilang saat dicetak)
//   - angka versi cetak (read-only): class "only-print" (hanya tampil saat
//     dicetak)
//   - seluruh lembar (kop surat + tabel + tanda tangan) dibungkus class
//     "lembar-cetak print-only", mengikuti konvensi print-only/no-print
//     global aplikasi (lihat index.css), dengan override yang sama seperti
//     di LaporanKeadaanMurid.jsx supaya lembar ini tetap tampil normal di
//     layar (bukan template tersembunyi) dan tidak "position: fixed" saat
//     dicetak.
//
// Khusus Kelas 6: tidak ada lagi dropdown pilih kelas — kelasnya dicari
// otomatis (tingkat === "VI") dan digabung kalau ada lebih dari 1 rombel.

// Tahun pelajaran default: kalau sekarang Juli-Des, "thn/thn+1"; kalau Jan-Jun, "thn-1/thn".
function tahunPelajaranDefault() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return m >= 7 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

// Asumsi pembagian 9 mapel di MAPEL_IJAZAH: 6 mapel pertama = Kelompok A,
// 3 mapel terakhir = Kelompok B (urutan sesuai tampilan lama: Pend Agama,
// PKn, Bhs Indo, Matematika, IPA, IPS | SBK, PJOK, Mulok). Kalau urutan
// aslinya di IjazahPrintTemplate.jsx berbeda, cukup ubah angka 6 di bawah
// (mapelKelompokA / mapelKelompokB).
function pisahKelompokMapel() {
  const a = MAPEL_IJAZAH.slice(0, 6);
  const b = MAPEL_IJAZAH.slice(6);
  return { mapelKelompokA: a, mapelKelompokB: b };
}

function formatTanggal(tgl) {
  if (!tgl) return "-";
  const d = new Date(tgl);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

export default function Ijazah() {
  const navigate = useNavigate();

  const [tahunPelajaran, setTahunPelajaran] = useState(tahunPelajaranDefault());

  const [kelasIdKelas6, setKelasIdKelas6] = useState([]);
  const [namaKelas6, setNamaKelas6] = useState("");
  const [kelasSiapDimuat, setKelasSiapDimuat] = useState(false);

  const [siswaList, setSiswaList] = useState([]);
  const [nilaiMap, setNilaiMap] = useState({}); // siswa_id -> {pend_agama: .., ...}
  const [sekolah, setSekolah] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detailSiswa, setDetailSiswa] = useState(null);

  // "landscape" (mendatar, F4 330x210mm) atau "portrait" (tegak, A4 210x297mm)
  const [orientasiCetak, setOrientasiCetak] = useState("landscape");

  const { mapelKelompokA, mapelKelompokB } = useMemo(() => pisahKelompokMapel(), []);

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
      : profilQuery.limit(0);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    );
  }

  const lebarKertas = orientasiCetak === "landscape" ? "330mm" : "210mm";

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Toolbar — hilang saat dicetak, sama seperti LaporanKeadaanMurid.jsx */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-800"
          >
            <ArrowLeft size={16} /> Kembali
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Tahun Pelajaran</label>
              <input
                className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm w-32"
                value={tahunPelajaran}
                onChange={(e) => setTahunPelajaran(e.target.value)}
                placeholder="2025/2026"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Kelas</label>
              <div className="border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 text-sm text-slate-600">
                {namaKelas6 || "Kelas 6 (VI)"}
              </div>
            </div>

            <ImporNilaiAsesmenModal
              siswaList={siswaList}
              tahunPelajaranDefault={tahunPelajaran}
              onSelesai={loadAll}
            />

            <button
              className="flex items-center gap-1.5 bg-emerald-600 text-white text-sm font-medium px-3.5 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-60"
              onClick={simpanSemua}
              disabled={saving}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Simpan Nilai
            </button>

            <div className="flex items-center rounded-lg border border-slate-300 overflow-hidden">
              <button
                type="button"
                className={`px-2.5 py-2 text-xs flex items-center gap-1 ${
                  orientasiCetak === "portrait" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
                onClick={() => setOrientasiCetak("portrait")}
                title="Cetak posisi Potrait (tegak)"
              >
                <RectangleVertical size={14} /> Potrait
              </button>
              <button
                type="button"
                className={`px-2.5 py-2 text-xs flex items-center gap-1 border-l border-slate-300 ${
                  orientasiCetak === "landscape" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
                onClick={() => setOrientasiCetak("landscape")}
                title="Cetak posisi Landscape (mendatar)"
              >
                <RectangleHorizontal size={14} /> Landscape
              </button>
            </div>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Printer size={16} /> Cetak Rekap Ijazah
            </button>
          </div>
        </div>

        {!kelasIdKelas6.length && (
          <p className="text-xs text-amber-600 mt-2">
            Belum ada kelas dengan tingkat "VI" (Kelas 6) di data sekolah ini.
          </p>
        )}
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

      {/* Lembar ini SATU-SATUNYA area yang tampil saat print (class
          "print-only"), sekaligus tampil normal di layar untuk mengisi
          nilai — sama seperti .lembar-cetak.print-only di
          LaporanKeadaanMurid.jsx. */}
      <div
        className="lembar-cetak print-only bg-white mx-auto my-6 p-8 shadow-sm"
        style={{ width: lebarKertas }}
      >
        <div className="text-center font-bold text-sm uppercase mb-4">
          Data : Pengisian Ijazah Kelulusan Tahun Pelajaran {tahunPelajaran}
        </div>

        <div className="text-xs mb-4 leading-relaxed">
          <p className="flex"><span className="w-28 shrink-0">Nama Sekolah</span><span className="w-3">:</span><span className="font-semibold">{sekolahUntukCetak?.nama_sekolah || "-"}</span></p>
          <p className="flex"><span className="w-28 shrink-0">NPSN</span><span className="w-3">:</span><span>{sekolahUntukCetak?.npsn || "-"}</span></p>
          <p className="flex"><span className="w-28 shrink-0">Kabupaten</span><span className="w-3">:</span><span>{sekolahUntukCetak?.kabupaten || "-"}</span></p>
          <p className="flex"><span className="w-28 shrink-0">Provinsi</span><span className="w-3">:</span><span>{sekolahUntukCetak?.provinsi || "-"}</span></p>
        </div>

        {siswaList.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-8">Belum ada siswa aktif di Kelas 6.</p>
        ) : (
          <table className="w-full text-[10px] border-collapse border border-black">
            <thead>
              <tr className="text-center">
                <th rowSpan={2} className="border border-black px-1 py-1 w-6">No</th>
                <th rowSpan={2} className="border border-black px-1 py-1">Nama Siswa</th>
                <th rowSpan={2} className="border border-black px-1 py-1">Tempat, Tanggal Lahir</th>
                <th rowSpan={2} className="border border-black px-1 py-1">No Induk Siswa</th>
                <th rowSpan={2} className="border border-black px-1 py-1">NISN</th>
                <th colSpan={mapelKelompokA.length} className="border border-black px-1 py-1">Kelompok A</th>
                <th colSpan={mapelKelompokB.length} className="border border-black px-1 py-1">Kelompok B</th>
                <th rowSpan={2} className="border border-black px-1 py-1 w-12">Jumlah</th>
                <th rowSpan={2} className="no-print border border-black px-1 py-1 w-8">Rata²</th>
                <th rowSpan={2} className="no-print border border-black px-1 py-1 w-24">Aksi</th>
              </tr>
              <tr className="text-center">
                {mapelKelompokA.map((m) => (
                  <th key={m.key} className="border border-black px-1 py-1 w-10">{m.label.split(" ")[0]}</th>
                ))}
                {mapelKelompokB.map((m) => (
                  <th key={m.key} className="border border-black px-1 py-1 w-10">{m.label.split(" ")[0]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {siswaList.map((s, idx) => {
                const v = nilaiMap[s.id] || {};
                return (
                  <tr key={s.id}>
                    <td className="border border-black px-1 py-1 text-center">{idx + 1}</td>
                    <td className="border border-black px-1 py-1 font-semibold whitespace-nowrap">{s.nama_lengkap}</td>
                    <td className="border border-black px-1 py-1 whitespace-nowrap">
                      {[s.tempat_lahir, formatTanggal(s.tanggal_lahir)].filter(Boolean).join(", ")}
                    </td>
                    <td className="border border-black px-1 py-1 text-center font-mono">{s.nis || "-"}</td>
                    <td className="border border-black px-1 py-1 text-center font-mono">{s.nisn || "-"}</td>
                    {[...mapelKelompokA, ...mapelKelompokB].map((m) => (
                      <td key={m.key} className="border border-black px-1 py-1 text-center">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          className="sel-nilai no-print"
                          value={v[m.key] ?? ""}
                          onChange={(e) => ubahNilai(s.id, m.key, e.target.value)}
                        />
                        <span className="only-print">{v[m.key] ?? "-"}</span>
                      </td>
                    ))}
                    <td className="border border-black px-1 py-1 text-center font-semibold">{jumlahNilai(v).toFixed(2)}</td>
                    <td className="no-print border border-black px-1 py-1 text-center">{rataRataNilai(v).toFixed(2)}</td>
                    <td className="no-print border border-black px-1 py-1 text-center">
                      <button
                        className="text-[10px] px-2 py-1 rounded border border-slate-300 hover:bg-slate-50 inline-flex items-center gap-1"
                        onClick={() => setDetailSiswa(s)}
                        title="Isi nilai per semester & cetak Daftar Nilai Kolektif"
                      >
                        <FileEdit size={12} /> Detail
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="blok-ttd flex justify-between mt-10 text-xs">
          <div className="text-center w-64">
            <p>Mengetahui,</p>
            <p>Pengawas Sekolah</p>
            <div className="h-16" />
            <p className="font-semibold underline">{sekolahUntukCetak?.pengawas || "............................"}</p>
            <p>NIP. {sekolahUntukCetak?.nip_pengawas || "............................"}</p>
          </div>
          <div className="text-center w-64">
            <p>
              {sekolahUntukCetak?.tempat_ttd || sekolahUntukCetak?.kecamatan || "............"},{" "}
              {new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
            <p className="mt-1">Kepala Sekolah</p>
            <div className="h-16" />
            <p className="font-semibold underline">{sekolahUntukCetak?.kepala_sekolah || "............................"}</p>
            <p>NIP. {sekolahUntukCetak?.nip_kepala_sekolah || "............................"}</p>
          </div>
        </div>
      </div>

      <style>{`
        .sel-nilai {
          width: 34px;
          border: none;
          border-bottom: 1px dotted #94a3b8;
          text-align: center;
          font-size: 10px;
          background: transparent;
          outline: none;
          -moz-appearance: textfield;
        }
        .sel-nilai::-webkit-outer-spin-button,
        .sel-nilai::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .sel-nilai:focus {
          border-bottom: 1px solid #2563eb;
        }

        /* Di layar: tampilkan input (bisa diisi), sembunyikan angka
           read-only versi cetak. */
        .only-print { display: none; }

        /* Rapikan halaman kalau tabel siswa lebih panjang dari 1 halaman:
           - header tabel ikut berulang di setiap halaman
           - satu baris siswa tidak pernah terpotong jadi 2 halaman
           - blok tanda tangan selalu utuh dalam 1 halaman (kalau tidak
             muat di sisa halaman tabel, pindah semua ke halaman berikutnya
             sekaligus, bukan terbelah) */
        @media print {
          thead { display: table-header-group; }
          tbody tr { break-inside: avoid; page-break-inside: avoid; }
          .blok-ttd { break-inside: avoid; page-break-inside: avoid; }
        }

        /* Override aturan global ".print-only { display: none }" di layar
           — lembar ini MEMANG harus tampil di layar untuk diisi, sama
           seperti pola di LaporanKeadaanMurid.jsx. */
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
          .sel-nilai { display: none !important; }
          .only-print { display: inline !important; }

          /* Override aturan global (posisi fixed default utk .print-only)
             supaya lembar ini mengalir normal & bisa pindah halaman kalau
             siswanya banyak, bukan menumpuk di satu titik fixed. */
          .lembar-cetak.print-only {
            position: static !important;
            top: auto !important;
            left: auto !important;
            right: auto !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }
        }

        /* @page WAJIB di luar @media print (lihat catatan di
           LaporanKeadaanMurid.jsx) supaya ukuran kertas benar-benar
           dipakai, bukan jatuh balik ke default A4 browser. */
        @page {
          size: ${orientasiCetak === "landscape" ? "330mm 210mm" : "210mm 297mm"};
          margin: 8mm;
        }
      `}</style>
    </div>
  );
}
