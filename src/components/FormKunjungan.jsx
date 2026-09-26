import { useState, useEffect, useCallback } from "react";
import { Pencil, Trash2, Printer, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient"; // sesuaikan path
import KopSurat from "./KopSurat"; // sesuaikan path kalau KopSurat ada di folder lain

const JENIS_LAYANAN = [
  { value: "anc", label: "Periksa Hamil (ANC)" },
  { value: "persalinan", label: "Persalinan" },
  { value: "nifas", label: "Nifas" },
  { value: "kb", label: "Keluarga Berencana (KB)" },
  { value: "imunisasi", label: "Imunisasi" },
  { value: "balita", label: "Pemeriksaan Balita" },
  { value: "umum", label: "Pemeriksaan Umum" },
  { value: "rujukan", label: "Rujukan" },
];

function labelJenisLayanan(value) {
  return JENIS_LAYANAN.find((j) => j.value === value)?.label || value || "-";
}

const TEMPLATE_OBAT = {
  anc: ["Tablet Tambah Darah (Fe)", "Asam Folat", "Kalsium Laktat", "Vitamin B Complex"],
  persalinan: ["Oksitosin", "Vitamin K1", "Salep Mata Antibiotik"],
  nifas: ["Tablet Tambah Darah (Fe)", "Vitamin A", "Paracetamol"],
  kb: ["Pil KB Kombinasi", "Suntik KB 3 Bulan", "Suntik KB 1 Bulan"],
  imunisasi: ["Vaksin BCG", "Vaksin DPT-HB-Hib", "Vaksin Polio", "Vaksin Campak/MR"],
  balita: ["Paracetamol Sirup", "Zinc", "Oralit", "Vitamin A"],
  umum: ["Paracetamol", "Amoxicillin", "Antasida", "Vitamin B Complex", "CTM"],
  rujukan: [],
};

const KOSONG = {
  jenis_layanan: "umum",
  keluhan: "",
  tekanan_darah: "",
  berat_badan: "",
  tinggi_badan: "",
  suhu: "",
  lingkar_lengan: "",
  usia_kehamilan_minggu: "",
  hasil_pemeriksaan: "",
  tindakan: "",
  obat_diberikan: "",
  rujukan_ke: "",
  catatan: "",
};

function formatTanggalIndonesia(ts) {
  if (!ts) return "-";
  return new Date(ts).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function tambahKeDaftarObat(teksSaatIni, nama) {
  const daftar = teksSaatIni
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  if (daftar.some((t) => t.toLowerCase() === nama.toLowerCase())) {
    return teksSaatIni;
  }
  daftar.push(nama);
  return daftar.join(", ");
}

function FieldPemeriksaan({ form, ubahField, setField }) {
  const templateObat = TEMPLATE_OBAT[form.jenis_layanan] || [];

  return (
    <>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Jenis Layanan</label>
        <select
          value={form.jenis_layanan}
          onChange={ubahField("jenis_layanan")}
          className="w-full rounded border px-3 py-2 text-sm"
        >
          {JENIS_LAYANAN.map((j) => (
            <option key={j.value} value={j.value}>{j.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Keluhan</label>
        <textarea value={form.keluhan} onChange={ubahField("keluhan")} rows={2} className="w-full rounded border px-3 py-2 text-sm" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Tekanan Darah</label>
          <input value={form.tekanan_darah} onChange={ubahField("tekanan_darah")} placeholder="120/80" className="w-full rounded border px-2 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Berat (kg)</label>
          <input value={form.berat_badan} onChange={ubahField("berat_badan")} inputMode="decimal" className="w-full rounded border px-2 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Tinggi (cm)</label>
          <input value={form.tinggi_badan} onChange={ubahField("tinggi_badan")} inputMode="decimal" className="w-full rounded border px-2 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Suhu (°C)</label>
          <input value={form.suhu} onChange={ubahField("suhu")} inputMode="decimal" className="w-full rounded border px-2 py-2 text-sm" />
        </div>
      </div>

      {form.jenis_layanan === "anc" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">LILA (cm)</label>
            <input value={form.lingkar_lengan} onChange={ubahField("lingkar_lengan")} inputMode="decimal" className="w-full rounded border px-2 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Usia Kehamilan (minggu)</label>
            <input value={form.usia_kehamilan_minggu} onChange={ubahField("usia_kehamilan_minggu")} inputMode="numeric" className="w-full rounded border px-2 py-2 text-sm" />
          </div>
        </div>
      )}

      {form.jenis_layanan === "rujukan" && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Dirujuk ke</label>
          <input value={form.rujukan_ke} onChange={ubahField("rujukan_ke")} placeholder="Nama fasilitas rujukan" className="w-full rounded border px-3 py-2 text-sm" />
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Hasil Pemeriksaan</label>
        <textarea value={form.hasil_pemeriksaan} onChange={ubahField("hasil_pemeriksaan")} rows={2} className="w-full rounded border px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Tindakan</label>
        <textarea value={form.tindakan} onChange={ubahField("tindakan")} rows={2} className="w-full rounded border px-3 py-2 text-sm" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Obat Diberikan</label>
        <input
          list="daftar-template-obat"
          value={form.obat_diberikan}
          onChange={ubahField("obat_diberikan")}
          placeholder="Ketik atau pilih dari template di bawah"
          className="w-full rounded border px-3 py-2 text-sm"
        />
        <datalist id="daftar-template-obat">
          {Object.values(TEMPLATE_OBAT).flat().map((nama) => (
            <option key={nama} value={nama} />
          ))}
        </datalist>

        {templateObat.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {templateObat.map((nama) => (
              <button
                key={nama}
                type="button"
                onClick={() => setField("obat_diberikan", tambahKeDaftarObat(form.obat_diberikan, nama))}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
              >
                + {nama}
              </button>
            ))}
          </div>
        )}
        <p className="mt-1 text-xs text-slate-400">
          Template nama obat umum sesuai jenis layanan — dosis dan aturan pakai tetap ditentukan oleh petugas.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Catatan Tambahan</label>
        <textarea value={form.catatan} onChange={ubahField("catatan")} rows={2} className="w-full rounded border px-3 py-2 text-sm" />
      </div>
    </>
  );
}

export default function FormKunjungan({
  profil,
  pasien,
  daftarPasien,
  onGantiPasien,
  onSelesai,
}) {
  const [form, setForm] = useState(KOSONG);
  const [menyimpan, setMenyimpan] = useState(false);
  const [pesan, setPesan] = useState(null);

  const [riwayat, setRiwayat] = useState([]);
  const [loadingRiwayat, setLoadingRiwayat] = useState(false);

  const [modalEdit, setModalEdit] = useState(null);
  const [formEdit, setFormEdit] = useState(KOSONG);
  const [menyimpanEdit, setMenyimpanEdit] = useState(false);
  const [menghapusId, setMenghapusId] = useState(null);
  const [kunjunganCetak, setKunjunganCetak] = useState(null);

  const ubahField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const ubahFieldEdit = (field) => (e) =>
    setFormEdit((prev) => ({ ...prev, [field]: e.target.value }));

  const setFieldForm = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));
  const setFieldFormEdit = (field, value) =>
    setFormEdit((prev) => ({ ...prev, [field]: value }));

  const muatRiwayat = useCallback(async () => {
    if (!pasien?.id) {
      setRiwayat([]);
      return;
    }
    setLoadingRiwayat(true);
    const { data, error } = await supabase
      .from("kunjungan")
      .select("*")
      .eq("pasien_id", pasien.id)
      .order("created_at", { ascending: false });
    if (!error) setRiwayat(data ?? []);
    setLoadingRiwayat(false);
  }, [pasien?.id]);

  useEffect(() => {
    muatRiwayat();
  }, [muatRiwayat]);

  if (!pasien) {
    return (
      <div className="max-w-md">
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Pilih pasien dulu
        </label>
        <select
          className="w-full rounded border px-3 py-2 text-sm"
          onChange={(e) =>
            onGantiPasien(daftarPasien.find((p) => p.id === e.target.value))
          }
          defaultValue=""
        >
          <option value="" disabled>-- pilih pasien --</option>
          {daftarPasien.map((p) => (
            <option key={p.id} value={p.id}>{p.nama} — {p.nik}</option>
          ))}
        </select>
      </div>
    );
  }

  const simpanKunjungan = async (e) => {
    e.preventDefault();
    setMenyimpan(true);
    setPesan(null);

    const {
      data: { user },
      error: errUser,
    } = await supabase.auth.getUser();
    if (errUser || !user) {
      setMenyimpan(false);
      setPesan({ tipe: "error", teks: "Sesi tidak valid, silakan login ulang." });
      return;
    }

    const { error } = await supabase.from("kunjungan").insert({
      ...form,
      sekolah_id: profil.sekolah_id,
      pasien_id: pasien.id,
      petugas_id: user.id,
      // Nama pemeriksa diambil dari data pegawai (profil.nama_lengkap sudah
      // diresolusi dari tabel pegawai_puskesmas oleh loadProfil() di
      // AuthContext.jsx). Disimpan sebagai teks (bukan cuma id) supaya
      // riwayat lama tetap menunjukkan nama yang benar meski data pegawai
      // berubah/dihapus di kemudian hari.
      nama_pemeriksa: profil?.nama_lengkap || null,
      berat_badan: form.berat_badan ? Number(form.berat_badan) : null,
      tinggi_badan: form.tinggi_badan ? Number(form.tinggi_badan) : null,
      suhu: form.suhu ? Number(form.suhu) : null,
      lingkar_lengan: form.lingkar_lengan ? Number(form.lingkar_lengan) : null,
      usia_kehamilan_minggu: form.usia_kehamilan_minggu
        ? Number(form.usia_kehamilan_minggu)
        : null,
    });

    setMenyimpan(false);
    if (error) {
      console.error(error);
      setPesan({ tipe: "error", teks: "Gagal menyimpan kunjungan." });
      return;
    }

    setPesan({ tipe: "sukses", teks: "Hasil pemeriksaan tersimpan." });
    setForm(KOSONG);
    muatRiwayat();
  };

  function bukaEdit(k) {
    setFormEdit({
      jenis_layanan: k.jenis_layanan || "umum",
      keluhan: k.keluhan || "",
      tekanan_darah: k.tekanan_darah || "",
      berat_badan: k.berat_badan ?? "",
      tinggi_badan: k.tinggi_badan ?? "",
      suhu: k.suhu ?? "",
      lingkar_lengan: k.lingkar_lengan ?? "",
      usia_kehamilan_minggu: k.usia_kehamilan_minggu ?? "",
      hasil_pemeriksaan: k.hasil_pemeriksaan || "",
      tindakan: k.tindakan || "",
      obat_diberikan: k.obat_diberikan || "",
      rujukan_ke: k.rujukan_ke || "",
      catatan: k.catatan || "",
    });
    setModalEdit(k);
  }

  function tutupEdit() {
    if (menyimpanEdit) return;
    setModalEdit(null);
    setFormEdit(KOSONG);
  }

  async function simpanEdit(e) {
    e.preventDefault();
    if (!modalEdit) return;
    setMenyimpanEdit(true);
    try {
      // Nama pemeriksa TIDAK ikut diubah saat edit — tetap mencatat siapa
      // yang awalnya memeriksa, bukan siapa yang terakhir mengedit.
      const { error } = await supabase
        .from("kunjungan")
        .update({
          ...formEdit,
          berat_badan: formEdit.berat_badan ? Number(formEdit.berat_badan) : null,
          tinggi_badan: formEdit.tinggi_badan ? Number(formEdit.tinggi_badan) : null,
          suhu: formEdit.suhu ? Number(formEdit.suhu) : null,
          lingkar_lengan: formEdit.lingkar_lengan ? Number(formEdit.lingkar_lengan) : null,
          usia_kehamilan_minggu: formEdit.usia_kehamilan_minggu
            ? Number(formEdit.usia_kehamilan_minggu)
            : null,
        })
        .eq("id", modalEdit.id);
      if (error) throw error;
      tutupEdit();
      muatRiwayat();
    } catch (err) {
      alert("Gagal menyimpan perubahan: " + (err.message || "terjadi kesalahan"));
    } finally {
      setMenyimpanEdit(false);
    }
  }

  async function hapusKunjungan(k) {
    if (!window.confirm(`Hapus riwayat pemeriksaan tanggal ${formatTanggalIndonesia(k.created_at)}?`)) {
      return;
    }
    setMenghapusId(k.id);
    try {
      const { error } = await supabase.from("kunjungan").delete().eq("id", k.id);
      if (error) throw error;
      muatRiwayat();
    } catch (err) {
      alert("Gagal menghapus riwayat: " + (err.message || "terjadi kesalahan"));
    } finally {
      setMenghapusId(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between rounded-lg border bg-white p-3">
        <div>
          <p className="text-sm text-slate-500">Pasien</p>
          <p className="font-medium text-slate-800">{pasien.nama} — {pasien.nik}</p>
        </div>
        {onSelesai && (
          <button
            onClick={onSelesai}
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            Kembali ke Daftar
          </button>
        )}
      </div>

      <form onSubmit={simpanKunjungan} className="space-y-3 rounded-lg border bg-white p-4">
        {/* Info pemeriksa: tampil sebagai pengingat sebelum menyimpan, bukan
            input — nilainya otomatis diambil dari profil pegawai saat submit. */}
        <p className="text-xs text-slate-500">
          Pemeriksa: <span className="font-medium text-slate-700">{profil?.nama_lengkap || "-"}</span>
        </p>

        <FieldPemeriksaan form={form} ubahField={ubahField} setField={setFieldForm} />

        {pesan && (
          <p className={`text-sm ${pesan.tipe === "error" ? "text-red-600" : "text-emerald-700"}`}>
            {pesan.teks}
          </p>
        )}

        <button
          type="submit"
          disabled={menyimpan}
          className="w-full rounded-md bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {menyimpan ? "Menyimpan..." : "Simpan Hasil Pemeriksaan"}
        </button>
      </form>

      {/* ===================== RIWAYAT PEMERIKSAAN ===================== */}
      <div className="mt-6">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Riwayat Pemeriksaan</h3>
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2">Tanggal</th>
                <th className="px-3 py-2">Jenis Layanan</th>
                <th className="px-3 py-2">Keluhan</th>
                <th className="px-3 py-2">Pemeriksa</th>
                <th className="px-3 py-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loadingRiwayat && (
                <tr><td className="px-3 py-4 text-slate-400" colSpan={5}>Memuat...</td></tr>
              )}
              {!loadingRiwayat && riwayat.length === 0 && (
                <tr><td className="px-3 py-4 text-slate-400" colSpan={5}>Belum ada riwayat pemeriksaan.</td></tr>
              )}
              {riwayat.map((k) => (
                <tr key={k.id} className="border-t align-top">
                  <td className="whitespace-nowrap px-3 py-2">{formatTanggalIndonesia(k.created_at)}</td>
                  <td className="px-3 py-2">{labelJenisLayanan(k.jenis_layanan)}</td>
                  <td className="max-w-[160px] truncate px-3 py-2">{k.keluhan || "-"}</td>
                  <td className="px-3 py-2">{k.nama_pemeriksa || "-"}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => bukaEdit(k)} title="Edit riwayat" className="text-slate-500 hover:text-sky-700">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => setKunjunganCetak(k)} title="Cetak riwayat" className="text-slate-500 hover:text-slate-800">
                        <Printer size={16} />
                      </button>
                      <button
                        onClick={() => hapusKunjungan(k)}
                        disabled={menghapusId === k.id}
                        title="Hapus riwayat"
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
      </div>

      {/* ===================== MODAL EDIT ===================== */}
      {modalEdit && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pencil size={16} className="text-sky-600" />
                <h2 className="font-semibold text-slate-800">Edit Riwayat Pemeriksaan</h2>
              </div>
              <button onClick={tutupEdit} disabled={menyimpanEdit} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <p className="mb-4 text-xs text-slate-500">
              Pemeriksa: <span className="font-medium text-slate-700">{modalEdit.nama_pemeriksa || "-"}</span>
            </p>

            <form onSubmit={simpanEdit} className="space-y-3">
              <FieldPemeriksaan form={formEdit} ubahField={ubahFieldEdit} setField={setFieldFormEdit} />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={tutupEdit}
                  disabled={menyimpanEdit}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={menyimpanEdit}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {menyimpanEdit ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== AREA CETAK ===================== */}
      {kunjunganCetak && (
        <>
          <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-slate-800">Pratinjau Cetak</h2>
                <button onClick={() => setKunjunganCetak(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <div className="lembar-cetak-kunjungan rounded-xl border p-5">
                <KopSurat />
                <h1 className="mt-3 text-center text-sm font-bold uppercase text-slate-900 underline">
                  Hasil Pemeriksaan Pasien
                </h1>
                <table className="mt-4 w-full text-sm text-slate-800">
                  <tbody>
                    <tr><td className="w-44 py-1 align-top">Nama Pasien</td><td className="w-3 py-1">:</td><td className="py-1 font-medium">{pasien.nama}</td></tr>
                    <tr><td className="py-1 align-top">NIK</td><td className="py-1">:</td><td className="py-1">{pasien.nik}</td></tr>
                    <tr><td className="py-1 align-top">Tanggal Pemeriksaan</td><td className="py-1">:</td><td className="py-1">{formatTanggalIndonesia(kunjunganCetak.created_at)}</td></tr>
                    <tr><td className="py-1 align-top">Jenis Layanan</td><td className="py-1">:</td><td className="py-1">{labelJenisLayanan(kunjunganCetak.jenis_layanan)}</td></tr>
                    <tr><td className="py-1 align-top">Keluhan</td><td className="py-1">:</td><td className="py-1">{kunjunganCetak.keluhan || "-"}</td></tr>
                    <tr><td className="py-1 align-top">Tekanan Darah</td><td className="py-1">:</td><td className="py-1">{kunjunganCetak.tekanan_darah || "-"}</td></tr>
                    <tr><td className="py-1 align-top">Berat / Tinggi / Suhu</td><td className="py-1">:</td><td className="py-1">{kunjunganCetak.berat_badan ?? "-"} kg / {kunjunganCetak.tinggi_badan ?? "-"} cm / {kunjunganCetak.suhu ?? "-"} °C</td></tr>
                    {kunjunganCetak.jenis_layanan === "anc" && (
                      <tr><td className="py-1 align-top">LILA / Usia Kehamilan</td><td className="py-1">:</td><td className="py-1">{kunjunganCetak.lingkar_lengan ?? "-"} cm / {kunjunganCetak.usia_kehamilan_minggu ?? "-"} minggu</td></tr>
                    )}
                    {kunjunganCetak.jenis_layanan === "rujukan" && (
                      <tr><td className="py-1 align-top">Dirujuk ke</td><td className="py-1">:</td><td className="py-1">{kunjunganCetak.rujukan_ke || "-"}</td></tr>
                    )}
                    <tr><td className="py-1 align-top">Hasil Pemeriksaan</td><td className="py-1">:</td><td className="py-1">{kunjunganCetak.hasil_pemeriksaan || "-"}</td></tr>
                    <tr><td className="py-1 align-top">Tindakan</td><td className="py-1">:</td><td className="py-1">{kunjunganCetak.tindakan || "-"}</td></tr>
                    <tr><td className="py-1 align-top">Obat Diberikan</td><td className="py-1">:</td><td className="py-1">{kunjunganCetak.obat_diberikan || "-"}</td></tr>
                    <tr><td className="py-1 align-top">Catatan</td><td className="py-1">:</td><td className="py-1">{kunjunganCetak.catatan || "-"}</td></tr>
                    <tr><td className="py-1 align-top">Nama Pemeriksa</td><td className="py-1">:</td><td className="py-1 font-medium">{kunjunganCetak.nama_pemeriksa || "-"}</td></tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setKunjunganCetak(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
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

          <div className="print-only hidden">
            <div className="lembar-cetak-kunjungan-print p-6">
              <KopSurat />
              <h1 className="mt-3 text-center text-sm font-bold uppercase text-slate-900 underline">
                Hasil Pemeriksaan Pasien
              </h1>
              <table className="mt-4 w-full text-sm text-slate-800">
                <tbody>
                  <tr><td className="w-44 py-1 align-top">Nama Pasien</td><td className="w-3 py-1">:</td><td className="py-1 font-medium">{pasien.nama}</td></tr>
                  <tr><td className="py-1 align-top">NIK</td><td className="py-1">:</td><td className="py-1">{pasien.nik}</td></tr>
                  <tr><td className="py-1 align-top">Tanggal Pemeriksaan</td><td className="py-1">:</td><td className="py-1">{formatTanggalIndonesia(kunjunganCetak.created_at)}</td></tr>
                  <tr><td className="py-1 align-top">Jenis Layanan</td><td className="py-1">:</td><td className="py-1">{labelJenisLayanan(kunjunganCetak.jenis_layanan)}</td></tr>
                  <tr><td className="py-1 align-top">Keluhan</td><td className="py-1">:</td><td className="py-1">{kunjunganCetak.keluhan || "-"}</td></tr>
                  <tr><td className="py-1 align-top">Tekanan Darah</td><td className="py-1">:</td><td className="py-1">{kunjunganCetak.tekanan_darah || "-"}</td></tr>
                  <tr><td className="py-1 align-top">Berat / Tinggi / Suhu</td><td className="py-1">:</td><td className="py-1">{kunjunganCetak.berat_badan ?? "-"} kg / {kunjunganCetak.tinggi_badan ?? "-"} cm / {kunjunganCetak.suhu ?? "-"} °C</td></tr>
                  <tr><td className="py-1 align-top">Hasil Pemeriksaan</td><td className="py-1">:</td><td className="py-1">{kunjunganCetak.hasil_pemeriksaan || "-"}</td></tr>
                  <tr><td className="py-1 align-top">Tindakan</td><td className="py-1">:</td><td className="py-1">{kunjunganCetak.tindakan || "-"}</td></tr>
                  <tr><td className="py-1 align-top">Obat Diberikan</td><td className="py-1">:</td><td className="py-1">{kunjunganCetak.obat_diberikan || "-"}</td></tr>
                  <tr><td className="py-1 align-top">Catatan</td><td className="py-1">:</td><td className="py-1">{kunjunganCetak.catatan || "-"}</td></tr>
                  <tr><td className="py-1 align-top">Nama Pemeriksa</td><td className="py-1">:</td><td className="py-1 font-medium">{kunjunganCetak.nama_pemeriksa || "-"}</td></tr>
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
