import { useState } from "react";

/**
 * PanduanAwalSIMAK
 * Kartu panduan 3 langkah untuk ditaruh di halaman Beranda/Dasbor.
 * Tidak butuh library tambahan — hanya Tailwind (sesuai styling app SIMAK).
 *
 * Cara pakai di Dasbor.jsx (atau halaman beranda lainnya):
 *   import PanduanAwalSIMAK from "./PanduanAwalSIMAK";
 *   ...
 *   <PanduanAwalSIMAK />
 *
 * Opsional: sembunyikan otomatis setelah sekolah selesai setup, dengan
 * mengirim prop `selesai` (misalnya dari status profil_sekolah/kelas/siswa):
 *   <PanduanAwalSIMAK selesai={profilLengkap && adaKelas && adaSiswa} />
 */

const LANGKAH = [
  {
    nomor: 1,
    judul: "Lengkapi Profil Sekolah",
    menu: "Menu: Profil Sekolah",
    deskripsi:
      "Isi identitas sekolah dengan lengkap dan benar. Data ini tampil otomatis di halaman PPDB publik dan dipakai untuk kop rapor & dokumen resmi lainnya.",
    poin: [
      "Upload Logo Sekolah (PNG/JPG)",
      "Upload Logo Kabupaten (PNG/JPG)",
      "Upload Tanda Tangan Elektronik Kepala Sekolah",
      "Isi Kop Surat: Kabupaten/Kota, Dinas Pendidikan, Kecamatan",
    ],
    catatan: "Jangan lupa klik Simpan setelah semua data terisi.",
  },
  {
    nomor: 2,
    judul: "Atur Data Kelas",
    menu: "Menu: Kelas",
    deskripsi:
      "Buat data kelas sesuai jenjang sekolah lewat tombol + Tambah Kelas.",
    poin: [
      "SD: Kelas 1 s/d Kelas 6",
      "SMP: Kelas 7 s/d Kelas 9 (sesuai tingkatan)",
      "Jika ada beberapa rombel, tambahkan kodenya (6A, 6B, 6C, dst.)",
      "Lengkapi wali kelas & tahun pelajaran",
    ],
    catatan: "Setelah setiap kelas dibuat, jangan lupa klik Simpan.",
  },
  {
    nomor: 3,
    judul: "Impor Data Siswa & Data Guru",
    menu: "Menu: Data Siswa / Data Guru",
    deskripsi:
      "Gunakan jalur Impor dari Dapodik agar data lengkap otomatis (bukan Impor Manual).",
    poin: [
      "Unggah file hasil unduhan Dapodik apa adanya (tanpa diedit di Excel)",
      "Field lengkap ikut terbaca: alamat, data ortu/wali, KIP/KPS/PIP, dll.",
      "Siswa & kelas dicocokkan otomatis dari NISN/NIS dan kolom Rombel",
      "Lakukan hal yang sama untuk Data Guru",
    ],
    catatan: "Periksa jumlah data terbaca, lalu klik Impor Data.",
  },
];

export default function PanduanAwalSIMAK({ selesai = false, defaultTerbuka = true }) {
  const [terbuka, setTerbuka] = useState(defaultTerbuka);
  const [langkahAktif, setLangkahAktif] = useState(1);

  if (selesai) return null;

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-6">
      {/* Header */}
      <button
        type="button"
        onClick={() => setTerbuka((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 bg-gradient-to-r from-[#0B1E3F] to-[#132a55] text-white"
      >
        <div className="flex items-center gap-3 text-left">
          <span className="text-xl">🚀</span>
          <div>
            <p className="font-semibold leading-tight">
              Panduan Penggunaan Awal SIMAK
            </p>
            <p className="text-xs text-slate-300 leading-tight">
              3 langkah cepat sebelum mulai menggunakan aplikasi
            </p>
          </div>
        </div>
        <span className="text-sm text-slate-200">
          {terbuka ? "Sembunyikan ▲" : "Tampilkan ▼"}
        </span>
      </button>

      {terbuka && (
        <div className="p-5">
          {/* Tab langkah */}
          <div className="flex flex-wrap gap-2 mb-5">
            {LANGKAH.map((l) => (
              <button
                key={l.nomor}
                onClick={() => setLangkahAktif(l.nomor)}
                className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium border transition
                  ${
                    langkahAktif === l.nomor
                      ? "bg-[#0B1E3F] text-white border-[#0B1E3F]"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
              >
                <span
                  className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold
                    ${
                      langkahAktif === l.nomor
                        ? "bg-[#C9A227] text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                >
                  {l.nomor}
                </span>
                {l.judul}
              </button>
            ))}
          </div>

          {/* Konten langkah aktif */}
          {LANGKAH.filter((l) => l.nomor === langkahAktif).map((l) => (
            <div key={l.nomor} className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#C9A227]">
                {l.menu}
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                {l.deskripsi}
              </p>
              <ul className="space-y-1.5">
                {l.poin.map((p, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-slate-700"
                  >
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#0B1E3F] shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
              <p className="text-xs italic text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                💡 {l.catatan}
              </p>

              {/* Navigasi antar langkah */}
              <div className="flex justify-between pt-2">
                <button
                  disabled={l.nomor === 1}
                  onClick={() => setLangkahAktif((n) => Math.max(1, n - 1))}
                  className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  ← Sebelumnya
                </button>
                {l.nomor < LANGKAH.length ? (
                  <button
                    onClick={() =>
                      setLangkahAktif((n) => Math.min(LANGKAH.length, n + 1))
                    }
                    className="text-sm px-3 py-1.5 rounded-lg bg-[#0B1E3F] text-white hover:bg-[#132a55]"
                  >
                    Langkah Selanjutnya →
                  </button>
                ) : (
                  <span className="text-sm px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ✅ Aplikasi siap digunakan setelah langkah ini
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
