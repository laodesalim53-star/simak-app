import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useAuth } from "../lib/AuthContext"; // sesuaikan path jika beda
import Layout from "../components/Layout"; // dibungkus Layout, sama seperti ProfilSaya.jsx

// Daftar paket. Ubah nama, tagline, dan harga di sini saja.
// "urutan" menentukan tingkatan: paket dengan urutan lebih rendah
// tidak akan menampilkan tombol upgrade kalau user sudah di paket lebih tinggi.
const DAFTAR_PAKET = [
  {
    id: "free",
    nama: "Free",
    urutan: 0,
    tagline: "Cukup untuk operasional harian sekolah.",
    harga: "Rp 0",
  },
  {
    id: "standar",
    nama: "Standar",
    urutan: 1,
    tagline: "Untuk sekolah yang butuh lebih dari paket dasar.",
    harga: "Hubungi admin", // ganti mis. "Rp 50.000 / bulan" saat harga sudah pasti
  },
  {
    id: "premium",
    nama: "Premium",
    urutan: 2,
    tagline: "Paket lengkap: semua fitur Standar ditambah otomasi dan alat bantu guru/admin.",
    harga: "Hubungi admin", // ganti mis. "Rp 100.000 / bulan" saat harga sudah pasti
    rekomendasi: true,
  },
];

export default function UpgradeFitur() {
  const { isPremium, paket } = useAuth();

  // Premium mengikuti isPremium (sudah memperhitungkan aturan masa berlaku di AuthContext),
  // Standar mengikuti kolom profil.paket.
  const paketSaatIni = isPremium
    ? "premium"
    : paket === "standar"
    ? "standar"
    : "free";
  const urutanSaatIni =
    DAFTAR_PAKET.find((p) => p.id === paketSaatIni)?.urutan ?? 0;

  const [memproses, setMemproses] = useState(null); // menyimpan id paket yang sedang diproses

  async function handleUpgrade(idPaket) {
    setMemproses(idPaket);
    try {
      // TODO: sambungkan ke Midtrans Snap saat sudah siap.
      // Project ini SUDAH punya Edge Function Midtrans yang jalan untuk fitur
      // Toko (create-transaction & midtrans-notification, project Supabase
      // wnceuxgokwvokzgxgfhq) — polanya tinggal dipakai ulang, bukan bikin
      // integrasi baru dari nol:
      //   1. Buat Edge Function baru (mis. "buat-transaksi-upgrade-paket")
      //      yang menerima user_id dan idPaket ('standar' / 'premium'), insert
      //      baris ke riwayat_pembayaran (status 'pending'), lalu minta Snap
      //      Token ke Midtrans pakai Server Key (jangan taruh Server Key di
      //      frontend). Harga dihitung di server berdasarkan idPaket, bukan
      //      dikirim dari frontend.
      //   2. Panggil supabase.functions.invoke('buat-transaksi-upgrade-paket',
      //      { body: { paket: idPaket } }) dari sini, lalu buka
      //      window.snap.pay(snapToken, {...}).
      //   3. Tambahkan handler di Edge Function midtrans-notification yang
      //      sudah ada: kalau notifikasi datang untuk order riwayat_pembayaran
      //      (bukan order Toko), update status jadi 'berhasil' DAN update
      //      profil.paket (sesuai paket yang dibeli) + paket_berlaku_sampai
      //      untuk user_id terkait.
      alert(
        "Pembayaran online belum aktif. Untuk upgrade sementara, silakan hubungi admin sekolah."
      );
    } finally {
      setMemproses(null);
    }
  }

  return (
    <Layout
      title="Paket & Fitur"
      subtitle="Fitur dasar sekolah tetap gratis. Pilih paket yang sesuai dengan kebutuhan Anda."
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl">
        {DAFTAR_PAKET.map((p) => {
          const sedangDipakai = p.id === paketSaatIni;
          const bisaUpgrade = p.urutan > urutanSaatIni;
          const sedangMemproses = memproses === p.id;

          return (
            <div
              key={p.id}
              className={`relative flex flex-col rounded-xl p-6 ${
                p.rekomendasi
                  ? "border-2 border-teal-600"
                  : "border border-slate-200"
              }`}
            >
              {p.rekomendasi && (
                <span className="absolute -top-3 left-6 rounded-full bg-teal-600 px-3 py-1 text-xs font-medium text-white">
                  Rekomendasi
                </span>
              )}

              <h2 className="flex items-center gap-2 text-lg font-medium text-slate-900">
                {p.nama}
                {p.rekomendasi && <Sparkles className="h-4 w-4 text-teal-600" />}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{p.tagline}</p>
              <p className="mt-4 text-2xl font-semibold text-slate-900">
                {p.harga}
              </p>

              <div className="mt-auto pt-6">
                {sedangDipakai ? (
                  <div
                    className={`rounded-md px-3 py-2 text-center text-sm ${
                      p.rekomendasi
                        ? "bg-teal-50 font-medium text-teal-700"
                        : "bg-slate-50 text-slate-500"
                    }`}
                  >
                    Paket Anda saat ini
                  </div>
                ) : bisaUpgrade ? (
                  <button
                    onClick={() => handleUpgrade(p.id)}
                    disabled={memproses !== null}
                    className={`w-full rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60 ${
                      p.rekomendasi
                        ? "bg-teal-600 text-white hover:bg-teal-700"
                        : "border border-teal-600 text-teal-700 hover:bg-teal-50"
                    }`}
                  >
                    {sedangMemproses ? "Memproses..." : `Upgrade ke ${p.nama}`}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
