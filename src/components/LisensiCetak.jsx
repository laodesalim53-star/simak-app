import { useEffect, useState } from "react";

/**
 * LisensiCetak — versi portabel
 * -------------------------------------------------------------
 * Satu file yang sama disalin ke semua aplikasi. Yang berbeda
 * antar aplikasi hanya isi PRESET di bawah, atau nilai yang
 * dikirim lewat props.
 *
 * Pasang SEKALI di root (App.jsx). Tidak tampil di layar,
 * hanya ikut tercetak di kaki SETIAP halaman.
 *
 *   <LisensiCetak app="kua" />
 *   <LisensiCetak app="sekolah" />
 *   <LisensiCetak produk="Aplikasi Lain" pemilik="..." />  // manual
 */

/* ============================================================
   1. PRESET — sunting bagian ini sesuai aplikasi Anda
   ============================================================ */
export const PRESET = {
  kua: {
    produk: "Aplikasi Penyuluh Agama Islam",
    pemilik: "KUA Kec. Aru Selatan",
    lisensi:
      "Dokumen dihasilkan secara elektronik. Penggandaan di luar keperluan dinas harus seizin pemilik aplikasi.",
    situs: "",
    prefixKode: "PAI",
  },
  sekolah: {
    produk: "SIMAK App",
    pemilik: "",           // isi nama Anda / sekolah pemegang lisensi
    lisensi:
      "Lisensi pemakaian tunggal. Dilarang menggandakan atau menjual ulang tanpa izin tertulis.",
    situs: "",
    prefixKode: "SMK",
  },
};

/* ============================================================
   2. Komponen
   ============================================================ */
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

export default function LisensiCetak({ app, onCetak, ...props }) {
  const cfg = { ...(PRESET[app] ?? {}), ...props };
  const {
    produk = "Aplikasi",
    pemilik = "",
    lisensi = "",
    situs = "",
    prefixKode = "CTK",
  } = cfg;

  const [kode, setKode] = useState(() => buatKodeCetak(prefixKode));
  const [waktu, setWaktu] = useState(waktuCetak);

  useEffect(() => {
    const segarkan = () => {
      const baru = buatKodeCetak(prefixKode);
      setKode(baru);
      setWaktu(waktuCetak());
      // Kait opsional: simpan jejak cetak ke database
      onCetak?.({ kode: baru, produk, dicetakPada: new Date().toISOString() });
    };

    window.addEventListener("beforeprint", segarkan);
    const mq = window.matchMedia?.("print");
    const onMq = (e) => e.matches && segarkan();
    mq?.addEventListener?.("change", onMq);

    return () => {
      window.removeEventListener("beforeprint", segarkan);
      mq?.removeEventListener?.("change", onMq);
    };
  }, [prefixKode, produk, onCetak]);

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
            <span className="jejak-produk">{produk}</span>
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
   3. Pemasangan

   src/components/LisensiCetak.jsx   <- salin file ini apa adanya

   App.jsx:
     import LisensiCetak from "./components/LisensiCetak";

     export default function App() {
       return (
         <>
           <RouterAnda />
           <LisensiCetak app="kua" />
         </>
       );
     }

   Menyimpan jejak cetak ke Supabase (opsional):

     <LisensiCetak
       app="sekolah"
       onCetak={async ({ kode, produk, dicetakPada }) => {
         const { data: { user } } = await supabase.auth.getUser();
         await supabase.from("log_cetak").insert({
           kode, produk, user_id: user?.id, dicetak_pada: dicetakPada,
         });
       }}
     />

   Tabel log_cetak:
     create table log_cetak (
       id bigint generated always as identity primary key,
       kode text not null,
       produk text,
       user_id uuid references auth.users(id),
       dicetak_pada timestamptz default now()
     );

   Catatan penting:
   - Letakkan komponen sebagai anak langsung root React. Kalau
     berada di dalam elemen ber-`transform` atau `overflow: hidden`,
     position: fixed akan terkunci dan catatan hanya muncul sekali.
   - Kalau halaman cetak sudah punya footer sendiri (mis. kop surat
     KUA dengan blok tanda tangan), beri margin bawah ekstra pada
     wrapper cetak agar tidak bertumpuk.
============================================================ */
