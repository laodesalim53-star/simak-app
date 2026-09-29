import { useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";

/**
 * LisensiCetak — catatan kaki cetak dengan LINK PERMANEN
 * -------------------------------------------------------
 * Footer dicetak lewat margin box @page (@bottom-center), sehingga selalu berada
 * di paling bawah setiap lembar kertas, di dalam margin, dan tidak menimpa isi.
 * Butuh Chrome/Edge 131+ (margin box @page).
 *
 * Pasang SEKALI di App.jsx (di dalam CartProvider, di luar Suspense):
 *   <LisensiCetak baseUrl="https://domain-tetap-anda.id" />
 */

const KUNCI_TERTUNDA = "dokumen_terbit_tertunda";

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

// aman dipakai di dalam string CSS content: "..."
const cssStr = (s) => String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\s*\n\s*/g, " ");

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
      sisa.push(b);
      continue;
    }
    if (!(await kirimDokumen(b))) sisa.push(b);
  }
  tulisTertunda(sisa);
}

export default function LisensiCetak({
  produk,
  pemilik = "",
  lisensi = "Dokumen dihasilkan secara elektronik oleh aplikasi SIMAK.",
  situs = "",
  baseUrl,
  modul,
  onCetak,
}) {
  const { profil } = useAuth();
  const sekolahId = profil?.sekolah_id;

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

  const produkTampil = produk || namaSekolah || "Aplikasi Sekolah";
  const modulTampil = modul || (profil?.puskesmas_id ? "puskesmas" : "sekolah");
  const dasarUrl = (baseUrl || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/+$/, "");
  const link = `${dasarUrl}/verifikasi-dokumen/${kode}`;
  const punyaLink = Boolean(userId);

  const terkini = useRef({});
  terkini.current = {
    kode, link, userId, sekolahId, punyaLink,
    modul: modulTampil, produk: produkTampil, pemilik, situs, lisensi, onCetak,
  };
  const dicatat = useRef(false);
  const waktuRef = useRef(waktuCetak());
  const styleRef = useRef(null);

  // Tulis ulang CSS footer cetak (teks footer ada di dalam CSS @page)
  const tulisCss = () => {
    const el = styleRef.current;
    if (!el) return;
    const t = terkini.current;
    const baris1 =
      t.produk +
      (t.pemilik ? ` — hak cipta ${t.pemilik}` : "") +
      (t.situs ? ` · ${t.situs}` : "") +
      (t.lisensi ? ` · ${t.lisensi}` : "");
    const baris2 = t.punyaLink
      ? `Verifikasi: ${t.link} · Kode ${kelompok(t.kode)} · ${waktuRef.current}`
      : waktuRef.current;

    el.textContent = `
      @media print {
        @page {
          margin-bottom: 10mm;
          @bottom-center {
            content: "${cssStr(baris1)}\\A ${cssStr(baris2)}";
            white-space: pre-line;
            width: 100%;
            vertical-align: bottom;
            text-align: center;
            padding-bottom: 1.5mm;
            font-family: Georgia, "Times New Roman", serif;
            font-size: 4.5pt;
            line-height: 1.25;
            color: #666;
          }
        }
      }
    `;
  };

  // Buat elemen <style> sekali
  useEffect(() => {
    const el = document.createElement("style");
    el.setAttribute("data-lisensi-cetak", "");
    document.head.appendChild(el);
    styleRef.current = el;
    tulisCss();
    return () => {
      el.remove();
      styleRef.current = null;
    };
  }, []);

  // Perbarui footer bila data berubah
  useEffect(() => {
    tulisCss();
  }, [kode, link, punyaLink, produkTampil, pemilik, situs, lisensi]);

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

  // Kirim ulang catatan tertunda
  useEffect(() => {
    if (!userId) return;
    kirimTertunda(userId);
    const saatOnline = () => kirimTertunda(userId);
    window.addEventListener("online", saatOnline);
    return () => window.removeEventListener("online", saatOnline);
  }, [userId]);

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

      // waktu cetak diperbarui langsung ke CSS sebelum pratinjau dibuat
      waktuRef.current = waktuCetak();
      tulisCss();

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
    };

    const segarkan = () => {
      dicatat.current = false;
      waktuRef.current = waktuCetak();
      setKode(buatKodeDokumen());
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

  return null;
}
