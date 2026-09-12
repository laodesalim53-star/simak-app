// src/utils/mapelIjazahAlias.js
//
// SUMBER KEBENARAN TUNGGAL untuk mencocokkan nama mata pelajaran di data
// rapor (tabel nilai, capaian_mapel, dan dropdown input guru di Nilai.jsx)
// dengan 9 mapel resmi ijazah (MAPEL_IJAZAH).
//
// ATURAN: exact match (bukan substring), case-insensitive & trim spasi.
// Alias HANYA untuk singkatan yang sudah pasti benar (PAI, PPKN, SBDP,
// dst) -- BUKAN untuk menebak/mentolerir typo baru. Nama yang tidak
// dikenali harus diperbaiki di sumbernya (profil guru / input nilai),
// bukan ditambah alias sembarangan di sini.
import { MAPEL_IJAZAH } from "../components/IjazahPrintTemplate";

export const ALIAS_MAPEL_RAPOR = {
  pend_agama: ["PAI", "Pendidikan Agama Islam"],
  pkn: ["PKN", "PPKN"],
  bhs_indonesia: [],
  matematika: [],
  ipa: [],
  ips: [],
  sbk: ["SBDP", "SBK"],
  pjok: ["Penjasorkes"],
  mulok: [],
};

// IPAS (istilah Kurikulum Merdeka, gabungan IPA+IPS) ditangani TERPISAH
// dari alias biasa di atas, karena satu nilai IPAS harus mengisi 2 mapel
// ijazah sekaligus (ipa DAN ips) -- bukan cuma alias 1-ke-1.
export const TOKEN_IPAS_GABUNGAN = "__IPAS_GABUNGAN__";
export const LABEL_IPAS_GABUNGAN = "IPAS (isi nilai IPA & IPS ijazah sekaligus)";
const ALIAS_IPAS = ["IPAS"];

function normalisasi(teks) {
  return String(teks || "").trim().toLowerCase();
}

export function isIpasGabungan(namaMapel) {
  const target = normalisasi(namaMapel);
  return ALIAS_IPAS.map(normalisasi).includes(target);
}

// key resmi (mis. "ipa") kalau nama cocok EXACT ke label resmi atau
// alias-nya. null kalau tidak dikenali sama sekali. Tidak menangani IPAS
// -- cek isIpasGabungan() dulu sebelum panggil ini.
export function cariKeyMapelResmi(namaMapel) {
  const target = normalisasi(namaMapel);
  if (!target) return null;
  for (const m of MAPEL_IJAZAH) {
    const kandidat = [m.label, ...(ALIAS_MAPEL_RAPOR[m.key] || [])].map(normalisasi);
    if (kandidat.includes(target)) return m.key;
  }
  return null;
}

// Mengembalikan daftar key resmi ijazah yang berlaku untuk satu nama
// mapel mentah dari rapor -- biasanya 1 key, TAPI 2 key (["ipa","ips"])
// khusus untuk IPAS. Array kosong = tidak dikenali sama sekali.
export function daftarKeyResmiUntukNamaMapel(namaMapel) {
  if (isIpasGabungan(namaMapel)) return ["ipa", "ips"];
  const key = cariKeyMapelResmi(namaMapel);
  return key ? [key] : [];
}

// Dipakai Nilai.jsx: ubah daftar mapel bebas dari profil guru jadi opsi
// dropdown yang sudah dikanonik-kan (dedup) + daftar nama yang gagal
// dikenali (untuk ditampilkan sebagai peringatan ke guru/admin).
export function kanonikkanOpsiMapel(rawList) {
  const opsi = []; // { value, label } -- value = key resmi ATAU TOKEN_IPAS_GABUNGAN
  const sudahAda = new Set();
  const tidakDikenal = [];

  rawList.forEach((raw) => {
    if (isIpasGabungan(raw)) {
      if (!sudahAda.has(TOKEN_IPAS_GABUNGAN)) {
        opsi.push({ value: TOKEN_IPAS_GABUNGAN, label: LABEL_IPAS_GABUNGAN });
        sudahAda.add(TOKEN_IPAS_GABUNGAN);
      }
      return;
    }
    const key = cariKeyMapelResmi(raw);
    if (!key) {
      tidakDikenal.push(raw);
      return;
    }
    if (!sudahAda.has(key)) {
      const m = MAPEL_IJAZAH.find((x) => x.key === key);
      opsi.push({ value: key, label: m.label });
      sudahAda.add(key);
    }
  });

  return { opsi, tidakDikenal };
}
