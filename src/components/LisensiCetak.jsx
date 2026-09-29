import { useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";

/**
 * LisensiCetak — catatan kaki cetak dengan LINK PERMANEN
 * -------------------------------------------------------
 * Lisensi dicetak sebagai teks SAMAR (opacity rendah, 4pt) yang menempel di bawah
 * setiap lembar. Elemen fixed disisipkan saat dialog cetak dibuka dan dilepas
 * setelah selesai. Tidak memakai @page / margin box, sehingga:
 *  - tidak mengubah margin atau tata letak dokumen mana pun,
 *  - tidak mendorong isi / tanda tangan ke halaman berikutnya,
 *  - tetap terbaca tipis tetapi tidak mengganggu bila menimpa isi.
 *
 * Pasang SEKALI di App.jsx (di dalam CartProvider, di luar Suspense):
 *   <LisensiCetak baseUrl="https://domain-tetap-anda.id" />
 */

const KUNCI_TERTUNDA = "dokumen_terbit_tertunda";
const KELAS_FOOTER = "lisensi-cetak-akhir";

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

  // CSS statis: sembunyi di layar, tampil kecil di akhir dokumen saat dicetak
  useEffect(() => {
    const el = document.createElement("style");
    el.setAttribute("data-lisensi-cetak", "");
    el.textContent = `
      .${KELAS_FOOTER} { display: none; }
      @media print {
        .${KELAS_FOOTER} {
          display: block !important;
          visibility: visible !important;
          position: fixed !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 4mm !important;
          margin: 0 !important;
          padding: 0 8mm !important;
          text-align: center;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 4pt;
          line-height: 1.2;
          color: #000 !important;
          opacity: 0.45 !important;
          pointer-events: none;
          z-index: 2147483647;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .${KELAS_FOOTER} * { visibility: visible !important; }
      }
    `;
    document.head.appendChild(el);
    return () => el.remove();
  }, []);

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

  // Sisipkan / lepas lisensi di akhir dokumen, catat dokumen, siapkan kode baru
  useEffect(() => {
    const lepasFooter = () => {
      document.querySelectorAll(`.${KELAS_FOOTER}`).forEach((n) => n.remove());
    };

    const pasangFooter = () => {
      lepasFooter();
      const t = terkini.current;

      const baris1 =
        t.produk +
        (t.pemilik ? ` — hak cipta ${t.pemilik}` : "") +
        (t.situs ? ` · ${t.situs}` : "") +
        (t.lisensi ? ` · ${t.lisensi}` : "");
      const baris2 = t.punyaLink
        ? `Verifikasi: ${t.link} · Kode ${kelompok(t.kode)} · ${waktuRef.current}`
        : waktuRef.current;

      const box = document.createElement("div");
      box.className = KELAS_FOOTER;
      [baris1, baris2].forEach((teks) => {
        const p = document.createElement("div");
        p.textContent = teks;
        box.appendChild(p);
      });
      document.body.appendChild(box);
    };

    const catat = () => {
      const t = terkini.current;
      if (dicatat.current) return;
      if (!t.userId) {
        console.warn("[LisensiCetak] Tidak ada sesi login, dokumen tidak dicatat dan link tidak dicetak.");
        return;
      }
      dicatat.current = true;

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

    const sebelumCetak = () => {
      if (!dicatat.current) waktuRef.current = waktuCetak();
      catat();
      pasangFooter();
    };

    const sesudahCetak = () => {
      lepasFooter();
      dicatat.current = false;
      waktuRef.current = waktuCetak();
      setKode(buatKodeDokumen());
    };

    const mq = window.matchMedia?.("print");
    const onMq = (e) => (e.matches ? sebelumCetak() : sesudahCetak());

    window.addEventListener("beforeprint", sebelumCetak);
    window.addEventListener("afterprint", sesudahCetak);
    mq?.addEventListener?.("change", onMq);

    return () => {
      lepasFooter();
      window.removeEventListener("beforeprint", sebelumCetak);
      window.removeEventListener("afterprint", sesudahCetak);
      mq?.removeEventListener?.("change", onMq);
    };
  }, []);

  return null;
}
