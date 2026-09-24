import { useState } from "react";
import Layout from "../components/Layout";
import { PaketEmblem, usePaketSaatIni } from "../components/PaketBadge";
import { supabase } from "../lib/supabaseClient";

// Ganti detail rekening tujuan di sini.
const REKENING_TUJUAN = {
  bank: "BRI",
  nomor: "3630-0103-5574-531",
  atasNama: "LA ODE SALIM",
};

// Nomor WhatsApp admin, ditampilkan sebagai kontak bantuan di modal upgrade.
const WA_ADMIN = "6282197574897"; // format internasional tanpa "+" atau "0" di depan

const DAFTAR_PAKET = [
  {
    id: "free",
    nama: "Free",
    urutan: 0,
    tagline: "Cukup untuk operasional harian sekolah.",
    harga: "Rp 0",
    nominal: 0,
  },
  {
    id: "standar",
    nama: "Standar",
    urutan: 1,
    tagline: "Untuk sekolah yang butuh lebih dari paket dasar.",
    harga: "Hubungi admin", // ganti mis. "Rp 50.000 / bulan" saat harga sudah pasti
    nominal: 50000, // ganti sesuai harga asli, dipakai untuk isi awal form nominal
  },
  {
    id: "premium",
    nama: "Premium",
    urutan: 2,
    tagline:
      "Paket lengkap: semua fitur Standar ditambah otomasi dan alat bantu guru/admin.",
    harga: "Hubungi admin",
    nominal: 100000,
    rekomendasi: true,
  },
];

const TEMA_KARTU = {
  free: {
    kartu: "border border-slate-200 bg-white",
    saatIni: "bg-slate-50 text-slate-500",
    tombol: "",
  },
  standar: {
    kartu: "border border-teal-200 bg-white",
    saatIni: "bg-teal-50 font-medium text-teal-700",
    tombol: "border border-teal-600 text-teal-700 hover:bg-teal-50",
  },
  premium: {
    kartu:
      "border-2 border-amber-400 bg-gradient-to-b from-amber-50 to-white shadow-md",
    saatIni: "bg-amber-100 font-medium text-amber-900",
    tombol:
      "bg-gradient-to-r from-amber-300 to-amber-400 text-amber-950 hover:from-amber-200 hover:to-amber-300",
  },
};

export default function UpgradeFitur() {
  const paketSaatIni = usePaketSaatIni();
  const urutanSaatIni =
    DAFTAR_PAKET.find((p) => p.id === paketSaatIni)?.urutan ?? 0;

  const [paketDipilih, setPaketDipilih] = useState(null); // objek paket saat modal terbuka
  const [mengirim, setMengirim] = useState(false);
  const [form, setForm] = useState({
    nominal: "",
    bankPengirim: "",
    namaPengirim: "",
    noRekeningPengirim: "",
    catatan: "",
  });
  const [pesanError, setPesanError] = useState("");
  const [pesanSukses, setPesanSukses] = useState("");

  function bukaModal(paket) {
    setPaketDipilih(paket);
    setForm({
      nominal: paket.nominal ? String(paket.nominal) : "",
      bankPengirim: "",
      namaPengirim: "",
      noRekeningPengirim: "",
      catatan: "",
    });
    setPesanError("");
    setPesanSukses("");
  }

  function tutupModal() {
    if (mengirim) return;
    setPaketDipilih(null);
  }

  async function kirimKonfirmasiTransfer(e) {
    e.preventDefault();
    if (!paketDipilih) return;

    if (!form.namaPengirim || !form.noRekeningPengirim || !form.nominal) {
      setPesanError("Nama pengirim, no. rekening asal, dan nominal wajib diisi.");
      return;
    }

    setMengirim(true);
    setPesanError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Sesi Anda tidak ditemukan, silakan login ulang.");
      }

      const { error: insertError } = await supabase
        .from("permohonan_upgrade_paket")
        .insert({
          user_id: user.id,
          email: user.email,
          nama_lengkap: user.user_metadata?.nama_lengkap || null,
          paket: paketDipilih.id,
          nominal: Number(form.nominal),
          bank_pengirim: form.bankPengirim,
          nama_pengirim: form.namaPengirim,
          no_rekening_pengirim: form.noRekeningPengirim,
          catatan: form.catatan,
          status: "pending",
        });

      if (insertError) throw insertError;

      setPesanSukses(
        "Konfirmasi transfer terkirim. Admin akan meninjau dan mengaktifkan paket Anda setelah transfer diverifikasi."
      );
      setTimeout(() => setPaketDipilih(null), 1800);
    } catch (err) {
      setPesanError(
        err.message || "Gagal mengirim konfirmasi transfer. Coba lagi."
      );
    } finally {
      setMengirim(false);
    }
  }

  return (
    <Layout
      title="Paket & Fitur"
      subtitle="Fitur dasar sekolah tetap gratis. Pilih paket yang sesuai dengan kebutuhan Anda."
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl">
        {DAFTAR_PAKET.map((p) => {
          const tema = TEMA_KARTU[p.id];
          const sedangDipakai = p.id === paketSaatIni;
          const bisaUpgrade = p.urutan > urutanSaatIni;

          return (
            <div
              key={p.id}
              className={`relative flex flex-col rounded-xl p-6 ${tema.kartu}`}
            >
              {p.rekomendasi && (
                <span className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-amber-300 to-amber-400 px-3 py-1 text-xs font-semibold text-amber-950 shadow-sm">
                  Rekomendasi
                </span>
              )}

              <PaketEmblem paket={p.id} />

              <h2 className="mt-4 text-lg font-medium text-slate-900">
                {p.nama}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{p.tagline}</p>
              <p className="mt-4 text-2xl font-semibold text-slate-900">
                {p.harga}
              </p>

              <div className="mt-auto pt-6">
                {sedangDipakai ? (
                  <div
                    className={`rounded-md px-3 py-2 text-center text-sm ${tema.saatIni}`}
                  >
                    Paket Anda saat ini
                  </div>
                ) : bisaUpgrade ? (
                  <button
                    onClick={() => bukaModal(p)}
                    className={`w-full rounded-md px-4 py-2 text-sm font-semibold ${tema.tombol}`}
                  >
                    {`Upgrade ke ${p.nama}`}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {paketDipilih && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Upgrade ke {paketDipilih.nama}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Transfer ke rekening berikut, lalu isi form konfirmasi di bawah.
              Admin akan mengaktifkan paket Anda setelah transfer diverifikasi.
            </p>

            <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm">
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Bank</span>
                <span className="font-medium text-slate-900">
                  {REKENING_TUJUAN.bank}
                </span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">No. Rekening</span>
                <span className="font-medium text-slate-900">
                  {REKENING_TUJUAN.nomor}
                </span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Atas Nama</span>
                <span className="font-medium text-slate-900">
                  {REKENING_TUJUAN.atasNama}
                </span>
              </div>
            </div>

            <a
              href={`https://wa.me/${WA_ADMIN}?text=${encodeURIComponent(
                `Halo, saya ingin konfirmasi upgrade paket ${paketDipilih.nama}.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
            >
              Hubungi Admin via WhatsApp
            </a>

            <form onSubmit={kirimKonfirmasiTransfer} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600">
                  Nominal transfer (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.nominal}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nominal: e.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">
                  Nama pengirim
                </label>
                <input
                  type="text"
                  value={form.namaPengirim}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, namaPengirim: e.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">
                    Bank asal
                  </label>
                  <input
                    type="text"
                    value={form.bankPengirim}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, bankPengirim: e.target.value }))
                    }
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">
                    No. rekening asal
                  </label>
                  <input
                    type="text"
                    value={form.noRekeningPengirim}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        noRekeningPengirim: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600">
                  Catatan (opsional)
                </label>
                <textarea
                  value={form.catatan}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, catatan: e.target.value }))
                  }
                  rows={2}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              {pesanError && (
                <p className="text-sm text-red-600">{pesanError}</p>
              )}
              {pesanSukses && (
                <p className="text-sm text-emerald-600">{pesanSukses}</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={tutupModal}
                  disabled={mengirim}
                  className="flex-1 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={mengirim}
                  className="flex-1 rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                >
                  {mengirim ? "Mengirim..." : "Kirim Konfirmasi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
