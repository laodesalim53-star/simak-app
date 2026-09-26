import { useState, useMemo } from "react";
import { Pencil, Trash2, Printer, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import KopSurat from "./KopSurat"; // sesuaikan path kalau KopSurat ada di folder lain

const FORM_KOSONG = {
  nama: "",
  tempat_lahir: "",
  tanggal_lahir: "",
  jenis_kelamin: "",
  golongan_darah: "",
  alamat: "",
  no_hp: "",
};

function formatTanggalIndonesia(tgl) {
  if (!tgl) return "-";
  return new Date(tgl).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function DaftarPasien({ data, loading, onRefresh, onPilihKunjungan }) {
  const [cari, setCari] = useState("");
  const [modalEdit, setModalEdit] = useState(null); // pasien yang sedang diedit
  const [formEdit, setFormEdit] = useState(FORM_KOSONG);
  const [menyimpan, setMenyimpan] = useState(false);
  const [menghapusId, setMenghapusId] = useState(null);
  const [pasienCetak, setPasienCetak] = useState(null);

  const hasilFilter = useMemo(() => {
    if (!cari) return data;
    const kunci = cari.toLowerCase();
    return data.filter(
      (p) => p.nama?.toLowerCase().includes(kunci) || p.nik?.includes(kunci)
    );
  }, [data, cari]);

  function bukaEdit(pasien) {
    setFormEdit({
      nama: pasien.nama || "",
      tempat_lahir: pasien.tempat_lahir || "",
      tanggal_lahir: pasien.tanggal_lahir || "",
      jenis_kelamin: pasien.jenis_kelamin || "",
      golongan_darah: pasien.golongan_darah || "",
      alamat: pasien.alamat || "",
      no_hp: pasien.no_hp || "",
    });
    setModalEdit(pasien);
  }

  function tutupEdit() {
    if (menyimpan) return;
    setModalEdit(null);
    setFormEdit(FORM_KOSONG);
  }

  const ubahFieldEdit = (field) => (e) =>
    setFormEdit((prev) => ({ ...prev, [field]: e.target.value }));

  async function simpanEdit(e) {
    e.preventDefault();
    if (!modalEdit) return;
    setMenyimpan(true);
    try {
      const { error } = await supabase
        .from("pasien")
        .update(formEdit)
        .eq("id", modalEdit.id);
      if (error) throw error;
      tutupEdit();
      onRefresh?.();
    } catch (err) {
      alert("Gagal menyimpan perubahan: " + (err.message || "terjadi kesalahan"));
    } finally {
      setMenyimpan(false);
    }
  }

  async function hapusPasien(pasien) {
    if (!window.confirm(`Hapus data pasien "${pasien.nama}"? Tindakan ini tidak bisa dibatalkan.`)) {
      return;
    }
    setMenghapusId(pasien.id);
    try {
      const { error } = await supabase.from("pasien").delete().eq("id", pasien.id);
      if (error) throw error;
      onRefresh?.();
    } catch (err) {
      alert("Gagal menghapus pasien: " + (err.message || "terjadi kesalahan"));
    } finally {
      setMenghapusId(null);
    }
  }

  return (
    <div>
      <div className="no-print mb-3 flex items-center gap-2">
        <input
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari nama atau NIK..."
          className="w-full max-w-sm rounded border px-3 py-2 text-sm"
        />
        <button
          onClick={onRefresh}
          className="rounded border px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
        >
          Muat ulang
        </button>
      </div>

      <div className="no-print overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-left text-slate-600">
            <tr>
              <th className="px-3 py-2">Nama</th>
              <th className="px-3 py-2">NIK</th>
              <th className="px-3 py-2">Jenis Kelamin</th>
              <th className="px-3 py-2">Status KTP</th>
              <th className="px-3 py-2 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-3 py-4 text-slate-400" colSpan={5}>
                  Memuat...
                </td>
              </tr>
            )}
            {!loading && hasilFilter.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-slate-400" colSpan={5}>
                  Belum ada pasien.
                </td>
              </tr>
            )}
            {hasilFilter.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2">{p.nama}</td>
                <td className="px-3 py-2">{p.nik}</td>
                <td className="px-3 py-2">
                  {p.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"}
                </td>
                <td className="px-3 py-2">
                  {p.foto_ktp_verified ? (
                    <span className="text-emerald-700">Terverifikasi</span>
                  ) : (
                    <span className="text-amber-600">Belum</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => onPilihKunjungan(p)}
                      className="text-sm font-medium text-emerald-700 hover:underline"
                    >
                      Periksa
                    </button>
                    <button
                      onClick={() => bukaEdit(p)}
                      title="Edit data pasien"
                      className="text-slate-500 hover:text-sky-700"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => setPasienCetak(p)}
                      title="Cetak data pasien"
                      className="text-slate-500 hover:text-slate-800"
                    >
                      <Printer size={16} />
                    </button>
                    <button
                      onClick={() => hapusPasien(p)}
                      disabled={menghapusId === p.id}
                      title="Hapus pasien"
                      className="text-slate-500 hover:text-red-600 disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===================== MODAL EDIT ===================== */}
      {modalEdit && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pencil size={16} className="text-sky-600" />
                <h2 className="font-semibold text-slate-800">Edit Data Pasien</h2>
              </div>
              <button onClick={tutupEdit} disabled={menyimpan} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <p className="mb-4 text-sm text-slate-500">
              NIK: {modalEdit.nik} (tidak bisa diubah)
            </p>

            <form onSubmit={simpanEdit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Nama Lengkap</label>
                <input
                  value={formEdit.nama}
                  onChange={ubahFieldEdit("nama")}
                  className="w-full rounded border px-3 py-2 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Tempat Lahir</label>
                  <input
                    value={formEdit.tempat_lahir}
                    onChange={ubahFieldEdit("tempat_lahir")}
                    className="w-full rounded border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={formEdit.tanggal_lahir}
                    onChange={ubahFieldEdit("tanggal_lahir")}
                    className="w-full rounded border px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Jenis Kelamin</label>
                  <select
                    value={formEdit.jenis_kelamin}
                    onChange={ubahFieldEdit("jenis_kelamin")}
                    className="w-full rounded border px-3 py-2 text-sm"
                  >
                    <option value="">Pilih</option>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Golongan Darah</label>
                  <input
                    value={formEdit.golongan_darah}
                    onChange={ubahFieldEdit("golongan_darah")}
                    className="w-full rounded border px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Alamat</label>
                <textarea
                  value={formEdit.alamat}
                  onChange={ubahFieldEdit("alamat")}
                  rows={2}
                  className="w-full rounded border px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">No. HP</label>
                <input
                  value={formEdit.no_hp}
                  onChange={ubahFieldEdit("no_hp")}
                  className="w-full rounded border px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={tutupEdit}
                  disabled={menyimpan}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={menyimpan}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {menyimpan ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== AREA CETAK ===================== */}
      {pasienCetak && (
        <>
          {/* Tombol kontrol cetak, ikut ter-sembunyi otomatis saat print
              lewat class no-print (sama seperti pola di DaftarHadirPuskesmas.jsx) */}
          <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-slate-800">Pratinjau Cetak</h2>
                <button onClick={() => setPasienCetak(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <div className="lembar-cetak-pasien rounded-xl border p-5">
                <KopSurat />
                <h1 className="mt-3 text-center text-sm font-bold uppercase text-slate-900 underline">
                  Data Identitas Pasien
                </h1>
                <table className="mt-4 w-full text-sm text-slate-800">
                  <tbody>
                    <tr><td className="w-40 py-1 align-top">Nama Lengkap</td><td className="w-3 py-1">:</td><td className="py-1 font-medium">{pasienCetak.nama}</td></tr>
                    <tr><td className="py-1 align-top">NIK</td><td className="py-1">:</td><td className="py-1">{pasienCetak.nik}</td></tr>
                    <tr><td className="py-1 align-top">Tempat, Tanggal Lahir</td><td className="py-1">:</td><td className="py-1">{pasienCetak.tempat_lahir || "-"}, {formatTanggalIndonesia(pasienCetak.tanggal_lahir)}</td></tr>
                    <tr><td className="py-1 align-top">Jenis Kelamin</td><td className="py-1">:</td><td className="py-1">{pasienCetak.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"}</td></tr>
                    <tr><td className="py-1 align-top">Golongan Darah</td><td className="py-1">:</td><td className="py-1">{pasienCetak.golongan_darah || "-"}</td></tr>
                    <tr><td className="py-1 align-top">Alamat</td><td className="py-1">:</td><td className="py-1">{pasienCetak.alamat || "-"}</td></tr>
                    <tr><td className="py-1 align-top">No. HP</td><td className="py-1">:</td><td className="py-1">{pasienCetak.no_hp || "-"}</td></tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setPasienCetak(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Tutup
                </button>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  <Printer size={16} /> Cetak
                </button>
              </div>
            </div>
          </div>

          {/* Versi khusus print: disembunyikan di layar, muncul hanya saat print,
              menghindari modal ikut tercetak (pola sama dengan .no-print /
              .print-only di DaftarHadirPuskesmas.jsx). */}
          <div className="print-only hidden">
            <div className="lembar-cetak-pasien-print p-6">
              <KopSurat />
              <h1 className="mt-3 text-center text-sm font-bold uppercase text-slate-900 underline">
                Data Identitas Pasien
              </h1>
              <table className="mt-4 w-full text-sm text-slate-800">
                <tbody>
                  <tr><td className="w-40 py-1 align-top">Nama Lengkap</td><td className="w-3 py-1">:</td><td className="py-1 font-medium">{pasienCetak.nama}</td></tr>
                  <tr><td className="py-1 align-top">NIK</td><td className="py-1">:</td><td className="py-1">{pasienCetak.nik}</td></tr>
                  <tr><td className="py-1 align-top">Tempat, Tanggal Lahir</td><td className="py-1">:</td><td className="py-1">{pasienCetak.tempat_lahir || "-"}, {formatTanggalIndonesia(pasienCetak.tanggal_lahir)}</td></tr>
                  <tr><td className="py-1 align-top">Jenis Kelamin</td><td className="py-1">:</td><td className="py-1">{pasienCetak.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"}</td></tr>
                  <tr><td className="py-1 align-top">Golongan Darah</td><td className="py-1">:</td><td className="py-1">{pasienCetak.golongan_darah || "-"}</td></tr>
                  <tr><td className="py-1 align-top">Alamat</td><td className="py-1">:</td><td className="py-1">{pasienCetak.alamat || "-"}</td></tr>
                  <tr><td className="py-1 align-top">No. HP</td><td className="py-1">:</td><td className="py-1">{pasienCetak.no_hp || "-"}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <style>{`
            @media print {
              .no-print { display: none !important; }
              .print-only { display: block !important; }
            }
          `}</style>
        </>
      )}
    </div>
  );
}
