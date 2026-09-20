import { useState } from "react";
import Layout from "../components/Layout"; // dibungkus Layout, sama seperti ProfilSaya.jsx
import { PaketEmblem, usePaketSaatIni } from "../components/PaketBadge";

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
    tagline:
      "Paket lengkap: semua fitur Standar ditambah otomasi dan alat bantu guru/admin.",
    harga: "Hubungi admin", // ganti mis. "Rp 100.000 / bulan" saat harga sudah pasti
    rekomendasi: true,
  },
];

// Tampilan tiap kartu, dipisah dari data supaya mudah diubah.
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
          const tema = TEMA_KARTU[p.id];
          const sedangDipakai = p.id === paketSaatIni;
          const bisaUpgrade = p.urutan > urutanSaatIni;
          const sedangMemproses = memproses === p.id;

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
                    onClick={() => handleUpgrade(p.id)}
                    disabled={memproses !== null}
                    className={`w-full rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60 ${tema.tombol}`}
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
