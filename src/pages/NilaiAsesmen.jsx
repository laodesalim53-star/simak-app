// src/pages/NilaiAsesmen.jsx
//
// Laman KHUSUS untuk mengisi & mengimpor nilai akhir 9 mapel (sumber data
// ijazah) — dipisah dari halaman Ijazah.jsx supaya format cetak di halaman
// Ijazah TIDAK terpengaruh sama sekali.
//
// Data disimpan ke tabel `nilai_ijazah` (siswa_id, tahun_pelajaran, +9 kolom
// mapel) — tabel yang SAMA PERSIS dipakai halaman Ijazah.jsx untuk mencetak
// rekap. Jadi begitu nilai diisi/diimpor di sini, halaman Ijazah otomatis
// "menarik" data terbaru tanpa perlu ada perubahan kode di Ijazah.jsx.
//
// Catatan perubahan:
// - Halaman ini KHUSUS kelas 6, jadi dropdown pilihan kelas dihapus dan
//   diganti label statis. Kelas 6 tetap dicari otomatis dari tabel `kelas`.
// - Nama siswa ditampilkan dalam format Title Case (huruf awal tiap kata
//   kapital) via formatNama(), supaya tampilan konsisten walau data di
//   database tersimpan ALL CAPS atau format campuran.
// - AKSES TERBATAS: laman hanya tampil untuk (1) admin, dan (2) guru yang
//   menjadi wali kelas tingkat 6 / 9. Selain itu dialihkan ke /dashboard.
//   Pengecekan memakai pola yang sama dengan Rapor.jsx: supabase.auth.getUser()
//   -> tabel `profil` (id = auth.uid, role, guru_id) -> kelas.wali_kelas_id.
//   Admin memuat kelas VI/6; guru memuat kelasnya sendiri.
//   Catatan: ini hanya pembatas tampilan — amankan juga tabel `nilai_ijazah`
//   lewat RLS di Supabase.
import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import Layout from "../components/Layout";
import ImporNilaiAsesmenModal from "../components/ImporNilaiAsesmenModal";
import DetailNilaiSiswaModal from "../components/DetailNilaiSiswaModal";
import { MAPEL_IJAZAH, jumlahNilai, rataRataNilai } from "../components/IjazahPrintTemplate";
import { Loader2, Save, FileSpreadsheet, FileEdit } from "lucide-react";

// Tingkat kelas yang boleh mengakses (Romawi maupun angka diterima).
const TINGKAT_BOLEH = ["VI", "6", "IX", "9"];
const normTingkat = (t) => String(t ?? "").trim().toUpperCase();

// Role yang dianggap admin (akses penuh ke laman ini).
const ROLE_ADMIN = ["admin", "admin_utama", "superadmin", "kepala_sekolah"];

// Tahun pelajaran default: kalau sekarang Juli-Des, "thn/thn+1"; kalau Jan-Jun, "thn-1/thn".
function tahunPelajaranDefault() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return m >= 7 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

// Merapikan nama siswa ke Title Case (mis. "AMELI DJERFUY" -> "Ameli Djerfuy",
// "Jesayas Komal" tetap "Jesayas Komal"). Hanya untuk tampilan — tidak
// mengubah data asli di database.
function formatNama(nama) {
  if (!nama) return "-";
  return nama
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((kata) => kata.charAt(0).toUpperCase() + kata.slice(1))
    .join(" ");
}

export default function NilaiAsesmen() {
  const [aksesBoleh, setAksesBoleh] = useState(null); // null = masih dicek
  const [tahunPelajaran, setTahunPelajaran] = useState(tahunPelajaranDefault());
  const [kelasAktif, setKelasAktif] = useState(null); // kelas 6/9 sesuai hak akses
  const [siswaList, setSiswaList] = useState([]);
  const [nilaiMap, setNilaiMap] = useState({}); // siswa_id -> {pend_agama: .., ...}
  const [sekolah, setSekolah] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [detailSiswa, setDetailSiswa] = useState(null); // siswa yang lagi dibuka di modal Detail & Cetak

  // Cek hak akses + tentukan kelas yang dimuat (sekali saat halaman dibuka).
  useEffect(() => {
    cekAksesDanMuatKelas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (aksesBoleh && kelasAktif) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahunPelajaran, kelasAktif, aksesBoleh]);

  async function cekAksesDanMuatKelas() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setAksesBoleh(false);
      setLoading(false);
      return;
    }

    const { data: profilData, error: profilError } = await supabase
      .from("profil")
      .select("guru_id, role")
      .eq("id", user.id)
      .maybeSingle();
    if (profilError) {
      console.error(profilError);
      setAksesBoleh(false);
      setLoading(false);
      return;
    }

    const { data: kelas } = await supabase.from("kelas").select("*").order("nama_kelas");
    const semua = kelas || [];
    const kelasBoleh = semua.filter((k) => TINGKAT_BOLEH.includes(normTingkat(k.tingkat)));

    // Admin: cari kelas VI/6 dulu, fallback ke kelas 6/9 lain, lalu kelas pertama.
    if (ROLE_ADMIN.includes(profilData?.role)) {
      const kelas6 = semua.find((k) => ["VI", "6"].includes(normTingkat(k.tingkat)));
      setKelasAktif(kelas6 || kelasBoleh[0] || semua[0] || null);
      setAksesBoleh(true);
      return;
    }

    // Guru: hanya boleh jika wali kelas dari kelas tingkat 6/9.
    // kelas.wali_kelas_id menunjuk ke guru.id, yang sama dengan profil.guru_id.
    if (profilData?.role === "guru" && profilData?.guru_id) {
      const kelasSaya = kelasBoleh.find((k) => k.wali_kelas_id === profilData.guru_id);
      if (kelasSaya) {
        setKelasAktif(kelasSaya);
        setAksesBoleh(true);
        return;
      }
    }

    // Selain itu (guru non-wali kelas 6/9, orang tua, dll): tidak boleh.
    setAksesBoleh(false);
    setLoading(false);
  }

  async function loadAll() {
    setLoading(true);
    setSaved(false);
    let siswaQuery = supabase
      .from("siswa")
      .select("*, kelas(tingkat)")
      .eq("status", "aktif")
      .order("nama_lengkap");
    if (kelasAktif?.id) siswaQuery = siswaQuery.eq("kelas_id", kelasAktif.id);

    const [{ data: siswa }, { data: nilai }, { data: profilSekolah }] = await Promise.all([
      siswaQuery,
      supabase.from("nilai_ijazah").select("*").eq("tahun_pelajaran", tahunPelajaran),
      supabase.from("profil_sekolah").select("*").eq("id", 1).maybeSingle(),
    ]);
    setSiswaList(siswa || []);
    const map = {};
    (nilai || []).forEach((n) => {
      map[n.siswa_id] = n;
    });
    setNilaiMap(map);
    setSekolah(profilSekolah || null);
    setLoading(false);
  }

  function ubahNilai(siswaId, key, value) {
    setSaved(false);
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
    setSaved(true);
    loadAll();
  }

  const sekolahUntukCetak = useMemo(
    () =>
      sekolah
        ? {
            nama_sekolah: sekolah.nama_sekolah,
            npsn: sekolah.npsn,
            kabupaten: sekolah.kabupaten,
            provinsi: sekolah.provinsi,
            tempat_ttd: sekolah.tempat_ttd,
            kepala_sekolah: sekolah.kepala_sekolah,
            nip_kepala_sekolah: sekolah.nip_kepala_sekolah,
            ttd_url: sekolah.ttd_url,
          }
        : null,
    [sekolah]
  );

  // ===== Penjagaan akses (setelah semua hook) =====
  if (aksesBoleh === null) {
    return (
      <Layout title="Nilai Asesmen">
        <p>Memeriksa akses...</p>
      </Layout>
    );
  }
  if (!aksesBoleh) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Layout
      title="Nilai Asesmen"
      subtitle="Input manual atau impor dari Excel — nilai akhir 9 mapel di sini menjadi sumber data untuk halaman Ijazah"
      actions={
        <div className="flex gap-2">
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
          <div className="input-field w-48 flex items-center bg-ink-900/5 text-ink-700/80 cursor-default select-none">
            {kelasAktif ? `${kelasAktif.nama_kelas} (Tingkat ${kelasAktif.tingkat})` : "Kelas 6"}
          </div>
        </div>
        <div className="text-sm text-ink-700/50 flex items-center gap-1.5">
          <FileSpreadsheet size={14} />
          {kelasAktif ? `${siswaList.length} siswa aktif di kelas ${kelasAktif.nama_kelas}` : ""}
        </div>
      </div>

      {loading ? (
        <p>Memuat...</p>
      ) : siswaList.length === 0 ? (
        <div className="card p-6 text-center text-ink-700/60">Belum ada siswa aktif di kelas ini.</div>
      ) : (
        <div className="card overflow-x-auto mb-4">
          <table className="table-shell">
            <thead>
              <tr>
                <th>Nama Siswa</th>
                {MAPEL_IJAZAH.map((m) => (
                  <th key={m.key} className="text-right" title={m.label}>
                    {m.singkatan}
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
                  <tr key={s.id}>
                    <td>
                      <span className="font-semibold">{formatNama(s.nama_lengkap)}</span>
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
      )}

      {detailSiswa && (
        <DetailNilaiSiswaModal
          siswa={detailSiswa}
          sekolah={sekolahUntukCetak}
          tahunPelajaran={tahunPelajaran}
          onClose={() => setDetailSiswa(null)}
          onSaved={loadAll}
        />
      )}

      {siswaList.length > 0 && (
        <div className="flex items-center gap-3">
          <button className="btn-primary" onClick={simpanSemua} disabled={saving || loading}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Simpan Nilai
          </button>
          {saved && <span className="text-sm text-sage-600">Tersimpan. Lihat hasilnya di halaman Ijazah.</span>}
        </div>
      )}
    </Layout>
  );
}
