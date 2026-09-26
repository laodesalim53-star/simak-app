import { useState } from "react";
import { supabase } from "../lib/supabaseClient"; // sesuaikan path

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

  const ubahField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

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
          <option value="" disabled>
            -- pilih pasien --
          </option>
          {daftarPasien.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nama} — {p.nik}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const simpanKunjungan = async (e) => {
    e.preventDefault();
    setMenyimpan(true);
    setPesan(null);

    const { error } = await supabase.from("kunjungan").insert({
      ...form,
      puskesmas_id: profil.puskesmas_id,
      pasien_id: pasien.id,
      petugas_id: profil.id,
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

    setForm(KOSONG);
    onSelesai?.();
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 rounded-lg border bg-white p-3">
        <p className="text-sm text-slate-500">Pasien</p>
        <p className="font-medium text-slate-800">
          {pasien.nama} — {pasien.nik}
        </p>
      </div>

      <form
        onSubmit={simpanKunjungan}
        className="space-y-3 rounded-lg border bg-white p-4"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Jenis Layanan
          </label>
          <select
            value={form.jenis_layanan}
            onChange={ubahField("jenis_layanan")}
            className="w-full rounded border px-3 py-2 text-sm"
          >
            {JENIS_LAYANAN.map((j) => (
              <option key={j.value} value={j.value}>
                {j.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Keluhan
          </label>
          <textarea
            value={form.keluhan}
            onChange={ubahField("keluhan")}
            rows={2}
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Tekanan Darah
            </label>
            <input
              value={form.tekanan_darah}
              onChange={ubahField("tekanan_darah")}
              placeholder="120/80"
              className="w-full rounded border px-2 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Berat (kg)
            </label>
            <input
              value={form.berat_badan}
              onChange={ubahField("berat_badan")}
              inputMode="decimal"
              className="w-full rounded border px-2 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Tinggi (cm)
            </label>
            <input
              value={form.tinggi_badan}
              onChange={ubahField("tinggi_badan")}
              inputMode="decimal"
              className="w-full rounded border px-2 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Suhu (°C)
            </label>
            <input
              value={form.suhu}
              onChange={ubahField("suhu")}
              inputMode="decimal"
              className="w-full rounded border px-2 py-2 text-sm"
            />
          </div>
        </div>

        {form.jenis_layanan === "anc" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                LILA (cm)
              </label>
              <input
                value={form.lingkar_lengan}
                onChange={ubahField("lingkar_lengan")}
                inputMode="decimal"
                className="w-full rounded border px-2 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Usia Kehamilan (minggu)
              </label>
              <input
                value={form.usia_kehamilan_minggu}
                onChange={ubahField("usia_kehamilan_minggu")}
                inputMode="numeric"
                className="w-full rounded border px-2 py-2 text-sm"
              />
            </div>
          </div>
        )}

        {form.jenis_layanan === "rujukan" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Dirujuk ke
            </label>
            <input
              value={form.rujukan_ke}
              onChange={ubahField("rujukan_ke")}
              placeholder="Nama fasilitas rujukan"
              className="w-full rounded border px-3 py-2 text-sm"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Hasil Pemeriksaan
          </label>
          <textarea
            value={form.hasil_pemeriksaan}
            onChange={ubahField("hasil_pemeriksaan")}
            rows={2}
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Tindakan
          </label>
          <textarea
            value={form.tindakan}
            onChange={ubahField("tindakan")}
            rows={2}
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Obat Diberikan
          </label>
          <input
            value={form.obat_diberikan}
            onChange={ubahField("obat_diberikan")}
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Catatan Tambahan
          </label>
          <textarea
            value={form.catatan}
            onChange={ubahField("catatan")}
            rows={2}
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>

        {pesan && <p className="text-sm text-red-600">{pesan.teks}</p>}

        <button
          type="submit"
          disabled={menyimpan}
          className="w-full rounded-md bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {menyimpan ? "Menyimpan..." : "Simpan Hasil Pemeriksaan"}
        </button>
      </form>
    </div>
  );
}
