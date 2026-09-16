import { useEffect, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";

/**
 * LisensiCetak — versi otomatis per sekolah (multi-tenant)
 * -------------------------------------------------------------
 * Aplikasi ini dipakai banyak sekolah sekaligus, jadi komponen
 * ini TIDAK memakai nama tetap. Ia membaca sendiri profil sekolah
 * dari akun yang sedang login (sama seperti NotaDenganSekolah /
 * Kuitansi.jsx), lalu menampilkannya di catatan kaki setiap
 * halaman yang dicetak.
 *
 * Pasang SEKALI di root (App.jsx), di dalam CartProvider, di luar
 * Suspense — supaya jejaknya tetap muncul walau halaman rute
 * sedang lazy-load:
 *
 *   <LisensiCetak />
 *
 * Kalau untuk sementara ingin memaksa satu nama tetap (mis. saat
 * profil sekolah belum lengkap), bisa override lewat props:
 *
 *   <LisensiCetak produk="Nama Sekolah Manual" />
 */

function buatKodeCetak(prefix) {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${t}-${r}`;
}

function waktuCetak() {
  return new Date().toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LisensiCetak({
  produk,          // override manual (opsional) — kalau kosong, diambil dari profil_sekolah
  pemilik = "",
  lisensi = "Dokumen dihasilkan secara elektronik oleh aplikasi sekolah.",
  situs = "",
  prefixKode = "SMK",
  onCetak,
}) {
  const { profil } = useAuth();
  const sekolahId = profil?.sekolah_id;

  const [namaSekolah, setNamaSekolah] = useState(null);
  const [kode, setKode] = useState(() => buatKodeCetak(prefixKode));
  const [waktu, setWaktu] = useState(waktuCetak);

  // Ambil profil sekolah milik akun yang sedang login — sama seperti
  // pola di NotaDenganSekolah, supaya tiap sekolah lihat namanya sendiri.
  useEffect(() => {
    if (!sekolahId) return;
    supabase
      .from("profil_sekolah")
      .select("nama_sekolah")
      .eq("sekolah_id", sekolahId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.nama_sekolah) setNamaSekolah(data.nama_sekolah);
      });
  }, [sekolahId]);

  const produkTampil = produk || namaSekolah || "Aplikasi Sekolah";

  useEffect(() => {
    const segarkan = () => {
      const baru = buatKodeCetak(prefixKode);
      setKode(baru);
      setWaktu(waktuCetak());
      // Kait opsional: simpan jejak cetak ke database (siapa mencetak apa, kapan)
      onCetak?.({
        kode: baru,
        produk: produkTampil,
        sekolahId,
        dicetakPada: new Date().toISOString(),
      });

      // --- Paksa reflow sebelum Chrome membuat pratinjau cetak ---
      // Chrome kadang tidak langsung merender elemen `position: fixed`
      // pada pratinjau pertama (baru muncul setelah ada interaksi lain
      // di dialog print, mis. centang "Headers and footers"). Membaca
      // offsetHeight memaksa browser menghitung ulang layout SEBELUM
      // pratinjau dibuat, sehingga catatan ini langsung tampil tanpa
      // perlu klik apa pun lagi.
      // eslint-disable-next-line no-unused-expressions
      document.body.offsetHeight;
    };

    window.addEventListener("beforeprint", segarkan);
    const mq = window.matchMedia?.("print");
    const onMq = (e) => e.matches && segarkan();
    mq?.addEventListener?.("change", onMq);

    return () => {
      window.removeEventListener("beforeprint", segarkan);
      mq?.removeEventListener?.("change", onMq);
    };
  }, [prefixKode, produkTampil, sekolahId, onCetak]);

  return (
    <>
      <style>{`
        .jejak-lisensi { display: none; }

        @media print {
          @page { margin-bottom: 18mm; }

          .jejak-lisensi {
            display: block;
            position: fixed;
            left: 0; right: 0; bottom: 0;
            padding: 2mm 6mm 3mm;
            border-top: 0.4pt solid #9a9a9a;
            background: #fff;
            font-family: Georgia, "Times New Roman", serif;
            font-size: 6.6pt;
            line-height: 1.45;
            color: #444;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .jejak-baris {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            gap: 6mm;
          }
          .jejak-lisensi p { margin: 0; }
          .jejak-produk { font-style: italic; color: #222; }
          .jejak-ket { color: #6b6b6b; }
          .jejak-kode {
            font-family: "Courier New", monospace;
            font-size: 6pt;
            white-space: nowrap;
            color: #666;
          }
        }
      `}</style>

      <footer className="jejak-lisensi" aria-hidden="true">
        <div className="jejak-baris">
          <p>
            <span className="jejak-produk">{produkTampil}</span>
            {pemilik && <span className="jejak-ket"> — hak cipta {pemilik}</span>}
            {situs && <span className="jejak-ket"> · {situs}</span>}
          </p>
          <p className="jejak-kode">{kode} · {waktu}</p>
        </div>
        {lisensi && <p className="jejak-ket">{lisensi}</p>}
      </footer>
    </>
  );
}

/* ============================================================
   Pemasangan di App.jsx (di dalam CartProvider, setelah Suspense):

     <CartProvider>
       <Suspense fallback={<FallbackLoader />}>
         <Routes>
           ...
         </Routes>
       </Suspense>

       <LisensiCetak />
     </CartProvider>

   Karena LisensiCetak sekarang memanggil useAuth() sendiri, ia
   HARUS berada di dalam komponen yang sudah dibungkus AuthProvider
   di pohon React (biasanya AuthProvider ada di main.jsx/index.jsx
   membungkus <App />, bukan di dalam App.jsx itu sendiri — jadi
   ini seharusnya aman tanpa perubahan tambahan).

   Menyimpan jejak cetak ke Supabase (opsional, per-sekolah):

     <LisensiCetak
       onCetak={async ({ kode, produk, sekolahId, dicetakPada }) => {
         const { data: { user } } = await supabase.auth.getUser();
         await supabase.from("log_cetak").insert({
           kode, produk, sekolah_id: sekolahId,
           user_id: user?.id, dicetak_pada: dicetakPada,
         });
       }}
     />

   Tabel log_cetak:
     create table log_cetak (
       id bigint generated always as identity primary key,
       kode text not null,
       produk text,
       sekolah_id uuid,
       user_id uuid references auth.users(id),
       dicetak_pada timestamptz default now()
     );

   Catatan:
   - Sebelum profil_sekolah selesai dimuat, produkTampil sementara
     menampilkan "Aplikasi Sekolah". Ini normal — begitu data datang,
     nama sekolah muncul di cetakan berikutnya. Kalau ingin memaksa
     tunggu data siap dulu sebelum tombol cetak aktif, itu diatur di
     halaman yang memanggil window.print(), bukan di komponen ini.
   - Sesuaikan path import useAuth/supabase di atas ("../lib/...")
     kalau lokasi file LisensiCetak.jsx Anda berbeda kedalamannya
     dari folder lib/.
============================================================ */
