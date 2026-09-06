import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useCart } from "../lib/CartContext";
import Layout from "../components/Layout";
import { DAFTAR_KURIR, hitungOngkir } from "../lib/ongkir";

// URL yang disarankan: /toko/:id/checkout
// Rute ini DIBUNGKUS ProtectedRoute di App.jsx, jadi user pasti sudah
// login saat komponen ini dirender. Pengecekan `if (!user)` di dalam
// handleCheckout tetap dipertahankan sebagai lapisan pengaman tambahan
// (mis. kalau sesi kedaluwarsa persis saat tombol diklik).
//
// Alur (SETELAH integrasi Midtrans + halaman pilih pengiriman):
//   Keranjang -> /toko/:id/pengiriman (pilih kurir, lihat ongkir)
//             -> /toko/:id/checkout (halaman ini: alamat + bayar)
//
// 1. Ambil isi keranjang untuk toko ini dari CartContext, dan kurir yang
//    sudah dipilih pembeli di halaman /pengiriman (getKurir). Kalau
//    kurir belum ada, pembeli dilempar balik ke halaman itu (lihat
//    useEffect di bawah).
// 2. Ongkir & biaya COD dihitung ulang di sini (lib/ongkir.js) dari data
//    yang sama, cukup untuk ditampilkan sebagai ringkasan.
// 3. Panggil fungsi database "buat_pesanan" -> membuat baris di
//    pesanan + pesanan_item, MENYIMPAN data penerima/alamat pengiriman,
//    kurir, ongkir, biaya COD, dan grand total, lalu mengurangi stok.
//    >> PENTING: fungsi buat_pesanan di database perlu diperbarui agar
//    menerima parameter baru: p_kurir, p_ongkir, p_biaya_cod, p_grand_total.
//    Kirim definisi SQL fungsi ini kalau perlu bantuan menyesuaikannya.
// 4. Panggil Edge Function "create-transaction" dengan pesanan_id yang
//    baru dibuat -> dapat snap_token dari Midtrans (grand total, bukan
//    cuma subtotal barang, yang dikirim ke Midtrans).
//    >> Kalau kurir = COD, biasanya pembayaran TIDAK lewat Midtrans sama
//    sekali (bayar tunai saat barang sampai). Bagian ini diberi cabang
//    khusus di bawah: kalau COD, pesanan langsung dianggap tercatat dan
//    diarahkan ke halaman sukses tanpa membuka popup Snap.
// 5. Buka popup pembayaran Snap pakai snap_token itu (khusus non-COD).
//
// BARU (kurir & ongkir): sebelumnya ongkir sama sekali belum dihitung.
// Sekarang pembeli wajib memilih kurir, ongkir dihitung otomatis dari
// kategori & berat barang di keranjang (lib/ongkir.js), dan grand total
// yang dibayar/ditagih ke pembeli sudah termasuk ongkir + biaya COD.

// Ganti ke Client Key PRODUCTION dan URL produksi Snap.js saat go-live:
// https://app.midtrans.com/snap/snap.js
const SNAP_JS_URL = "https://app.sandbox.midtrans.com/snap/snap.js";
const MIDTRANS_CLIENT_KEY = import.meta.env.VITE_MIDTRANS_CLIENT_KEY;

// Muat script Snap.js sekali saja (kalau sudah ada di halaman, tidak diulang)
function loadSnapScript() {
  return new Promise((resolve, reject) => {
    if (window.snap) {
      resolve();
      return;
    }
    const existing = document.querySelector(`script[src="${SNAP_JS_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.src = SNAP_JS_URL;
    script.setAttribute("data-client-key", MIDTRANS_CLIENT_KEY);
    script.onload = () => resolve();
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

export default function Checkout() {
  const { id: tokoId } = useParams();
  const navigate = useNavigate();
  const { getCartItems, clearCart, getKurir } = useCart();

  const [catatan, setCatatan] = useState("");
  const [namaPenerima, setNamaPenerima] = useState("");
  const [noHpPenerima, setNoHpPenerima] = useState("");
  const [alamatPengiriman, setAlamatPengiriman] = useState("");
  const [prefillLoading, setPrefillLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [snapReady, setSnapReady] = useState(false);

  const items = getCartItems(tokoId);
  const kurir = getKurir(tokoId);

  // Kurir wajib sudah dipilih di halaman /toko/:id/pengiriman sebelum
  // masuk ke sini. Kalau belum ada (mis. pembeli langsung buka URL
  // checkout), lempar balik ke halaman pilih pengiriman.
  useEffect(() => {
    if (items.length > 0 && !kurir) {
      navigate(`/toko/${tokoId}/pengiriman`, { replace: true });
    }
  }, [items.length, kurir, tokoId, navigate]);

  // Muat Snap.js begitu halaman Checkout dibuka, supaya saat tombol
  // "Buat Pesanan" diklik popup sudah siap tampil tanpa jeda.
  useEffect(() => {
    loadSnapScript()
      .then(() => setSnapReady(true))
      .catch(() => setErrorMsg("Gagal memuat layanan pembayaran. Coba muat ulang halaman."));
  }, []);

  // Isi draf awal nama/no HP/alamat dari data profil pembeli, supaya
  // tidak perlu ketik ulang dari nol. Tetap bisa diedit sebelum submit.
  useEffect(() => {
    let mounted = true;

    async function muatDrafProfil() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !mounted) {
        setPrefillLoading(false);
        return;
      }

      const { data: profilData } = await supabase
        .from("profil")
        .select("nama_lengkap_pendaftar, no_hp, alamat, guru_id, guru:guru_id ( nama_lengkap )")
        .eq("id", user.id)
        .maybeSingle();

      if (!mounted) return;

      if (profilData) {
        setNamaPenerima(
          profilData.guru?.nama_lengkap || profilData.nama_lengkap_pendaftar || ""
        );
        setNoHpPenerima(profilData.no_hp || "");
        setAlamatPengiriman(profilData.alamat || "");
      }

      setPrefillLoading(false);
    }

    muatDrafProfil();

    return () => {
      mounted = false;
    };
  }, []);

  const formatRupiah = (angka) => {
    const n = Number(angka) || 0;
    return n.toLocaleString("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    });
  };

  const total = items.reduce((sum, item) => sum + item.harga * item.qty, 0);

  // Ongkir & biaya COD dihitung ulang tiap kali kurir/isi keranjang berubah.
  const { ongkir, rincian, biayaCod } = hitungOngkir(items, kurir);
  const grandTotal = total + ongkir + biayaCod;
  const isCod = kurir === "cod";

  const handleCheckout = async () => {
    setErrorMsg("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErrorMsg("Anda harus login untuk melanjutkan checkout.");
      return;
    }
    if (items.length === 0) {
      setErrorMsg("Keranjang masih kosong.");
      return;
    }
    if (!namaPenerima.trim()) {
      setErrorMsg("Nama penerima wajib diisi.");
      return;
    }
    if (!noHpPenerima.trim()) {
      setErrorMsg("Nomor HP penerima wajib diisi.");
      return;
    }
    if (!alamatPengiriman.trim()) {
      setErrorMsg("Alamat pengiriman wajib diisi.");
      return;
    }
    // Snap hanya dibutuhkan untuk metode pembayaran non-COD.
    if (!isCod && !snapReady) {
      setErrorMsg("Layanan pembayaran belum siap, tunggu sebentar lalu coba lagi.");
      return;
    }

    setLoading(true);

    // 1) Buat pesanan seperti sebelumnya (stok berkurang di sini), sekarang
    // sekaligus menyimpan data penerima, alamat pengiriman, kurir, ongkir,
    // biaya COD, dan grand total.
    const { data: pesananId, error } = await supabase.rpc("buat_pesanan", {
      p_toko_id: tokoId,
      p_items: items.map((item) => ({ barang_id: item.id, qty: item.qty })),
      p_catatan: catatan || null,
      p_nama_penerima: namaPenerima.trim(),
      p_no_hp_penerima: noHpPenerima.trim(),
      p_alamat_pengiriman: alamatPengiriman.trim(),
      p_kurir: kurir,
      p_ongkir: ongkir,
      p_biaya_cod: biayaCod,
      p_grand_total: grandTotal,
    });

    if (error) {
      setLoading(false);
      setErrorMsg("Checkout gagal: " + error.message);
      return;
    }

    // 2) Kalau COD: tidak ada pembayaran online sama sekali, langsung
    // anggap pesanan tercatat dan arahkan ke halaman sukses (bayar tunai
    // saat barang sampai).
    if (isCod) {
      setLoading(false);
      clearCart(tokoId);
      navigate(`/toko/${tokoId}/pesanan-sukses`, { state: { pesananId } });
      return;
    }

    // 3) Non-COD: minta snap_token dari Edge Function create-transaction.
    // supabase.functions.invoke otomatis menyertakan token login user yang
    // sedang aktif, jadi create-transaction bisa memverifikasi pemiliknya.
    // >> Pastikan create-transaction memakai grand_total (termasuk ongkir),
    // bukan cuma subtotal barang, saat membuat transaksi Midtrans.
    const { data: fnData, error: fnError } = await supabase.functions.invoke(
      "create-transaction",
      { body: { pesanan_id: pesananId } },
    );

    setLoading(false);

    if (fnError || !fnData?.snap_token) {
      setErrorMsg(
        "Pesanan sudah dibuat, tapi gagal memulai pembayaran: " +
          (fnError?.message || "Terjadi kesalahan. Cek menu Pesanan Anda dan coba bayar lagi nanti."),
      );
      return;
    }

    // 4) Buka popup pembayaran Snap
    window.snap.pay(fnData.snap_token, {
      onSuccess: () => {
        clearCart(tokoId);
        navigate(`/toko/${tokoId}/pesanan-sukses`, { state: { pesananId } });
      },
      onPending: () => {
        // Pembeli memilih metode yang butuh tindakan lanjutan (mis. transfer
        // VA) — pesanan tetap dianggap "menunggu" sampai webhook Midtrans
        // mengonfirmasi. Tetap arahkan ke halaman sukses supaya pembeli
        // lihat instruksi & status pesanannya, keranjang tetap dikosongkan
        // karena pesanan sudah tercatat di database.
        clearCart(tokoId);
        navigate(`/toko/${tokoId}/pesanan-sukses`, { state: { pesananId } });
      },
      onError: () => {
        setErrorMsg(
          "Pembayaran gagal. Pesanan Anda tetap tercatat sebagai 'menunggu' — coba bayar lagi dari menu Pesanan.",
        );
      },
      onClose: () => {
        // Popup ditutup tanpa menyelesaikan pembayaran — jangan kosongkan
        // keranjang, biarkan pembeli tahu pesanan sudah dibuat tapi belum
        // dibayar.
        setErrorMsg(
          "Pembayaran dibatalkan. Pesanan Anda tetap tersimpan dengan status menunggu bayar.",
        );
      },
    });
  };

  if (items.length === 0) {
    return (
      <Layout title="Checkout" subtitle="Selesaikan pesanan Anda">
        <p className="text-sm text-gray-500">
          Keranjang masih kosong.{" "}
          <button
            onClick={() => navigate("/toko")}
            className="text-blue-600 hover:underline"
          >
            Kembali belanja
          </button>
        </p>
      </Layout>
    );
  }

  return (
    <Layout title="Checkout" subtitle="Selesaikan pesanan Anda">
      <div className="max-w-xl">
        <button
          onClick={() => navigate(`/toko/${tokoId}/keranjang`)}
          className="mb-3 text-sm text-blue-600 hover:underline"
        >
          &larr; Kembali ke Keranjang
        </button>

        <div className="mb-4 border rounded">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-3 py-2 border-b last:border-b-0"
            >
              <div>
                <div className="font-medium">{item.nama_barang}</div>
                <div className="text-xs text-gray-500">
                  {item.qty} {item.satuan} x {formatRupiah(item.harga)}
                </div>
              </div>
              <div className="font-medium">
                {formatRupiah(item.harga * item.qty)}
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between px-3 py-2 font-semibold bg-gray-50">
            <span>Subtotal Barang</span>
            <span>{formatRupiah(total)}</span>
          </div>
        </div>

        {/* Jasa pengiriman & ongkir — sudah dipilih di halaman sebelumnya
            (/toko/:id/pengiriman), di sini hanya ditampilkan ringkasannya. */}
        {kurir && (
          <div className="mb-4 p-3 border rounded bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">
                Jasa Pengiriman: {DAFTAR_KURIR.find((k) => k.kode === kurir)?.label || kurir}
              </p>
              <button
                onClick={() => navigate(`/toko/${tokoId}/pengiriman`)}
                className="text-xs text-blue-600 hover:underline"
              >
                Ganti
              </button>
            </div>

            <div className="text-sm">
              {rincian.map((r, idx) => (
                <div key={idx} className="flex items-center justify-between py-0.5 text-gray-600">
                  <span>{r.nama} ({r.keterangan})</span>
                  <span>{formatRupiah(r.biaya)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between py-0.5 font-medium">
                <span>Ongkos Kirim</span>
                <span>{formatRupiah(ongkir)}</span>
              </div>
              {isCod && (
                <div className="flex items-center justify-between py-0.5 text-gray-600">
                  <span>Biaya COD</span>
                  <span>{formatRupiah(biayaCod)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Data penerima & alamat pengiriman — wajib diisi, tersimpan
            persis seperti saat pesanan ini dibuat. */}
        <div className="mb-4 p-3 border rounded bg-gray-50">
          <p className="mb-3 text-sm font-semibold text-gray-700">
            Alamat Pengiriman
          </p>

          <label className="block mb-1 text-xs text-gray-500">
            Nama Penerima
          </label>
          <input
            type="text"
            value={namaPenerima}
            onChange={(e) => setNamaPenerima(e.target.value)}
            placeholder={prefillLoading ? "Memuat..." : "Nama lengkap penerima"}
            className="w-full px-3 py-2 mb-3 border rounded"
          />

          <label className="block mb-1 text-xs text-gray-500">
            Nomor HP Penerima
          </label>
          <input
            type="tel"
            value={noHpPenerima}
            onChange={(e) => setNoHpPenerima(e.target.value)}
            placeholder={prefillLoading ? "Memuat..." : "08xxxxxxxxxx"}
            className="w-full px-3 py-2 mb-3 border rounded"
          />

          <label className="block mb-1 text-xs text-gray-500">
            Alamat Lengkap
          </label>
          <textarea
            value={alamatPengiriman}
            onChange={(e) => setAlamatPengiriman(e.target.value)}
            placeholder={
              prefillLoading
                ? "Memuat..."
                : "Nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan, kota, kode pos"
            }
            rows={3}
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <label className="block mb-1 text-xs text-gray-500">
          Catatan untuk penjual (opsional)
        </label>
        <textarea
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          placeholder="Contoh: tolong dibungkus rapi"
          className="w-full px-3 py-2 mb-4 border rounded"
        />

        <div className="flex items-center justify-between px-3 py-2 mb-4 font-semibold border rounded bg-gray-50">
          <span>Total Bayar</span>
          <span>{formatRupiah(grandTotal)}</span>
        </div>

        {errorMsg && (
          <div className="mb-4 text-sm text-red-600">{errorMsg}</div>
        )}

        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading
            ? "Memproses pesanan..."
            : isCod
              ? "Buat Pesanan (Bayar di Tempat)"
              : "Bayar Sekarang"}
        </button>
      </div>
    </Layout>
  );
}
