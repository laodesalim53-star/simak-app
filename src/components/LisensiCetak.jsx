import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";

/**
 * LisensiCetak — catatan kaki cetak dengan LINK PERMANEN + QR
 * -------------------------------------------------------------
 * Setiap kali halaman dicetak (atau "Save as PDF"):
 *   1. Kode dokumen 16 karakter sudah disiapkan lebih dulu (tidak menunggu jaringan),
 *      jadi kode di cetakan pasti sama dengan yang dicatat.
 *   2. Saat dialog cetak dibuka, kode itu dicatat ke tabel `dokumen_terbit`
 *      (lihat dokumen_terbit.sql). Kalau gagal (offline), disimpan di antrean
 *      lokal dan dikirim ulang otomatis saat online / saat aplikasi dibuka lagi.
 *   3. Footer mencetak link https://.../verifikasi-dokumen/KODE + kode QR-nya.
 *
 * Tata letak cetak: footer kecil (2 baris, 5,5pt) diletakkan di dalam MARGIN BAWAH
 * kertas (margin 12 mm), bukan di area isi dokumen, sehingga isi cetakan tidak tertimpa.
 *
 * Butuh:  npm i qrcode
 *
 * Pasang SEKALI di App.jsx (di dalam CartProvider, di luar Suspense):
 *   <LisensiCetak baseUrl="https://domain-tetap-anda.id" />
 *
 * Isi `baseUrl` dengan domain tetap. Kalau kosong, dipakai alamat situs saat ini
 * (jangan dipakai di alamat preview/sementara: link cetakan jadi tidak permanen).
 */

const KUNCI_TERTUNDA = "dokumen_terbit_tertunda";

// 16 karakter heksadesimal acak (64 bit), huruf besar
function buatKodeDokumen() {
  const b = new Uint8Array(8);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("").toUpperCase();
}

const kelompok = (k) => k.replace(/(.{4})(?=.)/g, "$1-");

function waktuCetak() {
  return new Date().toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function bacaTertunda() {
  try {
    return JSON.parse(localStorage.getItem(KUNCI_TERTUNDA) || "[]");
  } catch {
    return [];
  }
}

function tulisTertunda(arr) {
  try {
    localStorage.setItem(KUNCI_TERTUNDA, JSON.stringify(arr));
  } catch {
    /* penyimpanan lokal tidak tersedia */
  }
}

async function kirimDokumen(baris) {
  const { error } = await supabase.from("dokumen_terbit").insert(baris);
  // 23505 = kode sudah tercatat sebelumnya → anggap berhasil
  return !error || error.code === "23505";
}

async function kirimTertunda(userId) {
  const antre = bacaTertunda();
  if (!antre.length) return;
  const sisa = [];
  for (const b of antre) {
    if (b.dibuat_oleh !== userId) {
      sisa.push(b); // milik akun lain, kirim nanti saat akun itu login
      continue;
    }
    if (!(await kirimDokumen(b))) sisa.push(b);
  }
  tulisTertunda(sisa);
}

export default function LisensiCetak({
  produk, // override nama instansi (opsional)
  pemilik = "",
  lisensi = "Dokumen dihasilkan secara elektronik oleh aplikasi SIMAK.",
  situs = "",
  baseUrl, // domain tetap untuk link permanen
  tampilkanQr = false, // QR disembunyikan; set true untuk menampilkannya lagi
  modul, // 'sekolah' | 'kua' | 'puskesmas' | 'umum' (opsional, otomatis kalau kosong)
  onCetak,
}) {
  const { profil } = useAuth();
  const sekolahId = profil?.sekolah_id;

  // ID akun diambil langsung dari sesi Supabase (sama dengan auth.uid() yang dicek RLS),
  // tidak bergantung pada bentuk objek `profil` di AuthContext.
  const [userId, setUserId] = useState(null);
  useEffect(() => {
    let aktif = true;
    supabase.auth.getSession().then(({ data }) => {
      if (aktif) setUserId(data?.session?.user?.id ?? null);
    });
    const { data: langganan } = supabase.auth.onAuthStateChange((_e, sesi) => {
      if (aktif) setUserId(sesi?.user?.id ?? null);
    });
    return () => {
      aktif = false;
      langganan?.subscription?.unsubscribe?.();
    };
  }, []);

  const [namaSekolah, setNamaSekolah] = useState(null);
  const [kode, setKode] = useState(buatKodeDokumen);
  const [qr, setQr] = useState("");
  const [waktu, setWaktu] = useState(waktuCetak);

  const produkTampil = produk || namaSekolah || "Aplikasi Sekolah";
  const modulTampil = modul || (profil?.puskesmas_id ? "puskesmas" : "sekolah");
  const dasarUrl = (baseUrl || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/+$/, "");
  const link = `${dasarUrl}/verifikasi-dokumen/${kode}`;
  const punyaLink = Boolean(userId); // tanpa login, dokumen tidak bisa dicatat → tidak ada link

  // nilai terbaru untuk dipakai handler cetak (tanpa memasang ulang listener)
  const terkini = useRef({});
  terkini.current = { kode, link, userId, sekolahId, modul: modulTampil, produk: produkTampil, onCetak };
  const dicatat = useRef(false);
  const waktuRef = useRef(null);

  // Nama instansi dari akun yang login
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

  // Kirim ulang catatan yang tertunda (offline sebelumnya)
  useEffect(() => {
    if (!userId) return;
    kirimTertunda(userId);
    const saatOnline = () => kirimTertunda(userId);
    window.addEventListener("online", saatOnline);
    return () => window.removeEventListener("online", saatOnline);
  }, [userId]);

  // QR untuk kode yang sedang disiapkan (dibuat SEBELUM cetak, jadi sudah ada di halaman)
  useEffect(() => {
    if (!punyaLink || !tampilkanQr) return;
    let batal = false;
    import("qrcode")
      .then((m) => (m.default || m).toDataURL(link, { margin: 0, width: 240, errorCorrectionLevel: "M" }))
      .then((url) => {
        if (!batal) setQr(url);
      })
      .catch(() => {
        if (!batal) setQr("");
      });
    return () => {
      batal = true;
    };
  }, [link, punyaLink, tampilkanQr]);

  // Catat saat dialog cetak dibuka; siapkan kode baru setelah selesai/batal
  useEffect(() => {
    const catat = () => {
      const t = terkini.current;
      if (dicatat.current) return;
      if (!t.userId) {
        console.warn("[LisensiCetak] Tidak ada sesi login, dokumen tidak dicatat dan link tidak dicetak.");
        return;
      }
      dicatat.current = true;

      // waktu cetak ditulis langsung ke DOM agar sudah benar sebelum pratinjau dibuat
      if (waktuRef.current) waktuRef.current.textContent = waktuCetak();

      const baris = {
        kode: t.kode,
        jenis: "Dokumen cetak",
        judul: (document.title || "").trim().slice(0, 120) || null,
        modul: t.modul,
        sekolah_id: t.sekolahId ?? null,
        instansi_nama: t.produk,
        dibuat_oleh: t.userId,
        dibuat_pada: new Date().toISOString(),
      };
      kirimDokumen(baris).then((ok) => {
        if (!ok) tulisTertunda([...bacaTertunda(), baris]);
      });

      t.onCetak?.({
        kode: t.kode,
        link: t.link,
        produk: t.produk,
        sekolahId: t.sekolahId,
        dicetakPada: baris.dibuat_pada,
      });

      // paksa reflow supaya footer `position: fixed` langsung tampil di pratinjau pertama
      // eslint-disable-next-line no-unused-expressions
      document.body.offsetHeight;
    };

    const segarkan = () => {
      dicatat.current = false;
      setKode(buatKodeDokumen());
      setQr("");
      setWaktu(waktuCetak());
    };

    const mq = window.matchMedia?.("print");
    const onMq = (e) => (e.matches ? catat() : segarkan());

    window.addEventListener("beforeprint", catat);
    window.addEventListener("afterprint", segarkan);
    mq?.addEventListener?.("change", onMq);

    return () => {
      window.removeEventListener("beforeprint", catat);
      window.removeEventListener("afterprint", segarkan);
      mq?.removeEventListener?.("change", onMq);
    };
  }, []);

  return (
    <>
      <style>{`
        .jejak-lisensi { display: none; }

        @media print {
          /* hanya margin bawah; ukuran kertas (A4/A3, portrait/landscape) tetap diatur halamannya */
          @page { margin-bottom: 12mm; }

          .jejak-lisensi,
          .jejak-lisensi * {
            visibility: visible !important;
          }
          .jejak-lisensi {
            display: block !important;
            opacity: 1 !important;
            transform: none !important;
            z-index: 2147483647;
            position: fixed !important;
            left: 0; right: 0;
            /* turun ke dalam margin bawah: 2–8 mm di bawah area isi */
            bottom: -8mm;
            height: 6mm;
            overflow: hidden;
            padding: 0;
            border: 0;
            background: transparent;
            font-family: Georgia, "Times New Roman", serif;
            font-size: 5.5pt;
            line-height: 1.3;
            color: #555;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .jejak-baris {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 3mm;
            height: 100%;
          }
          .jejak-teks { min-width: 0; flex: 1; }
          .jejak-lisensi p {
            margin: 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .jejak-produk { font-style: italic; color: #222; }
          .jejak-ket { color: #6b6b6b; }
          .jejak-link { color: #222; }
          .jejak-kode { font-family: "Courier New", monospace; font-size: 5pt; color: #666; }
          .jejak-qr {
            flex: none;
            width: 8mm;
            height: 8mm;
            image-rendering: pixelated;
          }
        }
      `}</style>

      {createPortal(
        <div className="jejak-lisensi" aria-hidden="true">
          <div className="jejak-baris">
            <div className="jejak-teks">
              <p>
                <span className="jejak-produk">{produkTampil}</span>
                {pemilik && <span className="jejak-ket"> — hak cipta {pemilik}</span>}
                {situs && <span className="jejak-ket"> · {situs}</span>}
                {lisensi && <span className="jejak-ket"> · {lisensi}</span>}
              </p>
              <p>
                {punyaLink && (
                  <>
                    <span className="jejak-link">Verifikasi: {link}</span>
                    <span className="jejak-kode"> · Kode {kelompok(kode)}</span>
                    <span className="jejak-kode"> · </span>
                  </>
                )}
                <span className="jejak-kode" ref={waktuRef}>{waktu}</span>
              </p>
            </div>
            {punyaLink && tampilkanQr && qr && <img className="jejak-qr" src={qr} alt="" />}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
