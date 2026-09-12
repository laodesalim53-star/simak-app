import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { useAuth } from "../lib/AuthContext"; // sesuaikan path jika beda
import Layout from "../components/Layout"; // dibungkus Layout, sama seperti ProfilSaya.jsx

const FITUR_FREE = [
  "Data Siswa & Data Guru",
  "Nilai & Presensi",
  "Rapor per siswa",
  "Bank Soal & Ujian Online",dll
];

const FITUR_PREMIUM = [
  "Generate Surat & SK otomatis, tanpa input manual berulang",
];

export default function UpgradeFitur() {
  const { isPremium } = useAuth();
  const paketSaatIni = isPremium ? "premium" : "free";
  const [memproses, setMemproses] = useState(false);

  async function handleUpgrade() {
    setMemproses(true);
    try {
      // TODO: sambungkan ke Midtrans Snap saat sudah siap.
      // Project ini SUDAH punya Edge Function Midtrans yang jalan untuk fitur
      // Toko (create-transaction & midtrans-notification, project Supabase
      // wnceuxgokwvokzgxgfhq) — polanya tinggal dipakai ulang, bukan bikin
      // integrasi baru dari nol:
      //   1. Buat Edge Function baru (mis. "buat-transaksi-upgrade-paket")
      //      yang menerima user_id, insert baris ke riwayat_pembayaran
      //      (status 'pending'), lalu minta Snap Token ke Midtrans pakai
      //      Server Key (jangan taruh Server Key di frontend).
      //   2. Panggil supabase.functions.invoke('buat-transaksi-upgrade-paket')
      //      dari sini, lalu buka window.snap.pay(snapToken, {...}).
      //   3. Tambahkan handler di Edge Function midtrans-notification yang
      //      sudah ada: kalau notifikasi datang untuk order riwayat_pembayaran
      //      (bukan order Toko), update status jadi 'berhasil' DAN update
      //      profil.paket jadi 'premium' untuk user_id terkait.
      alert(
        "Pembayaran online belum aktif. Untuk upgrade sementara, silakan hubungi admin sekolah."
      );
    } finally {
      setMemproses(false);
    }
  }

  return (
    <Layout
      title="Paket & Fitur"
      subtitle="Fitur dasar sekolah tetap gratis. Upgrade ke Premium untuk membuka otomasi surat, AI RPP, dan fitur lainnya."
    >
      <div className="grid gap-6 sm:grid-cols-2 max-w-4xl">
        {/* Paket Free */}
        <div className="rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-medium text-slate-900">Free</h2>
          <p className="mt-1 text-sm text-slate-500">
            Cukup untuk operasional harian sekolah.
          </p>
          <p className="mt-4 text-2xl font-semibold text-slate-900">Rp 0</p>

          <ul className="mt-6 space-y-3">
            {FITUR_FREE.map((f) => (
              <li key={f} className="flex gap-2 text-sm text-slate-600">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                {f}
              </li>
            ))}
          </ul>

          {paketSaatIni === "free" && (
            <div className="mt-6 rounded-md bg-slate-50 px-3 py-2 text-center text-sm text-slate-500">
              Paket Anda saat ini
            </div>
          )}
        </div>

        {/* Paket Premium */}
        <div className="rounded-xl border-2 border-teal-600 p-6 relative">
          <span className="absolute -top-3 left-6 rounded-full bg-teal-600 px-3 py-1 text-xs font-medium text-white">
            Rekomendasi
          </span>
          <h2 className="flex items-center gap-2 text-lg font-medium text-slate-900">
            Premium <Sparkles className="h-4 w-4 text-teal-600" />
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Semua fitur Free, ditambah otomasi dan alat bantu guru/admin.
          </p>
          <p className="mt-4 text-2xl font-semibold text-slate-900">
            Hubungi admin
          </p>

          <ul className="mt-6 space-y-3">
            {FITUR_PREMIUM.map((f) => (
              <li key={f} className="flex gap-2 text-sm text-slate-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                {f}
              </li>
            ))}
          </ul>

          {paketSaatIni === "premium" ? (
            <div className="mt-6 rounded-md bg-teal-50 px-3 py-2 text-center text-sm font-medium text-teal-700">
              Paket Anda saat ini
            </div>
          ) : (
            <button
              onClick={handleUpgrade}
              disabled={memproses}
              className="mt-6 w-full rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {memproses ? "Memproses..." : "Upgrade ke Premium"}
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
}
