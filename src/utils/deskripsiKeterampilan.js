// src/utils/deskripsiKeterampilan.js
//
// Pilihan deskripsi capaian KETERAMPILAN siap pakai, menurut jenjang (kelas 1–9),
// predikat (A–D), dan jenis mata pelajaran. Bentuk hasilnya sama dengan
// opsiDeskripsi() di deskripsiCapaian.js: [{ label, teks }], jadi bisa dipakai
// langsung oleh dropdown yang sama.

// Jenis kegiatan praktik menurut nama mapel (dicocokkan dengan nama, tanpa
// membedakan huruf besar/kecil). Mapel yang tidak cocok memakai AKTIVITAS_UMUM.
const KELOMPOK_MAPEL = [
  { cocok: /pjok|jasmani|olahraga|penjas/i, aktivitas: 'melakukan gerak dan aktivitas jasmani' },
  { cocok: /seni|musik|prakarya|budaya/i, aktivitas: 'berkarya dan berekspresi' },
  { cocok: /bahasa|inggris|arab|daerah/i, aktivitas: 'berbahasa secara lisan dan tulisan' },
  { cocok: /matematika/i, aktivitas: 'menyelesaikan soal dan masalah' },
  { cocok: /ipas|\bipa\b|\bips\b|sains|sosial|pkn|pancasila/i, aktivitas: 'melakukan pengamatan, percobaan, dan penyajian hasil' },
  { cocok: /agama|\bpai\b|akidah|fikih|quran|qur'an|hadis|hadits|kebudayaan islam/i, aktivitas: 'mempraktikkan ajaran dan bacaan' },
]
const AKTIVITAS_UMUM = 'mempraktikkan kompetensi yang dipelajari'

// Nada kalimat disesuaikan dengan tingkat kemandirian siswa.
const TINGKAT = {
  awal: { mandiri: 'dengan percaya diri dan sedikit bimbingan guru', bimbingan: 'bimbingan guru' },
  menengah: { mandiri: 'dengan percaya diri', bimbingan: 'bimbingan dan latihan' },
  lanjut: { mandiri: 'secara mandiri dan percaya diri', bimbingan: 'latihan mandiri dan bimbingan guru' },
}

function tingkatDariJenjang(jenjang) {
  const n = Number(jenjang)
  if (n >= 7) return TINGKAT.lanjut
  if (n >= 4) return TINGKAT.menengah
  return TINGKAT.awal
}

function aktivitasDariMapel(namaMapel) {
  const nama = namaMapel || ''
  return KELOMPOK_MAPEL.find((k) => k.cocok.test(nama))?.aktivitas || AKTIVITAS_UMUM
}

// m = nama mapel, akt = jenis kegiatan praktik, t = nada tingkat
const TEMPLATE = {
  A: [
    ['Sangat terampil', (m, akt, t) =>
      `Ananda sangat terampil dalam ${akt} pada mata pelajaran ${m}, mampu melakukannya ${t.mandiri} dengan hasil yang tepat dan rapi.`],
    ['Kreatif', (m, akt) =>
      `Ananda menunjukkan keterampilan yang sangat baik pada mata pelajaran ${m}, kreatif dalam ${akt}, serta mampu menghasilkan karya atau unjuk kerja yang berkualitas.`],
    ['Aktif & konsisten', (m, akt) =>
      `Ananda aktif dan konsisten dalam ${akt} pada mata pelajaran ${m}, serta dapat membantu teman dalam kegiatan praktik.`],
  ],
  B: [
    ['Terampil', (m, akt) =>
      `Ananda terampil dalam ${akt} pada mata pelajaran ${m} dan mampu menyelesaikan sebagian besar tugas praktik dengan baik.`],
    ['Perlu ditingkatkan', (m, akt) =>
      `Ananda menunjukkan keterampilan yang baik pada mata pelajaran ${m}; ketepatan dan ketelitian dalam ${akt} perlu terus ditingkatkan melalui latihan.`],
    ['Berkembang baik', (m, akt) =>
      `Ananda berkembang dengan baik dalam ${akt} pada mata pelajaran ${m} dan mampu mengikuti kegiatan praktik dengan tertib.`],
  ],
  C: [
    ['Cukup terampil', (m, akt, t) =>
      `Ananda cukup terampil dalam ${akt} pada mata pelajaran ${m}. Diperlukan ${t.bimbingan} agar keterampilannya semakin meningkat.`],
    ['Perlu banyak latihan', (m, akt) =>
      `Ananda mulai menunjukkan keterampilan pada mata pelajaran ${m}, tetapi masih perlu banyak berlatih dalam ${akt} agar hasilnya lebih tepat.`],
    ['Perlu ketelitian', (m, akt) =>
      `Ananda dapat mengikuti kegiatan praktik pada mata pelajaran ${m} dengan baik, namun ketelitian dalam ${akt} masih perlu ditingkatkan.`],
  ],
  D: [
    ['Perlu bimbingan intensif', (m, akt, t) =>
      `Ananda masih memerlukan ${t.bimbingan} yang lebih intensif dalam ${akt} pada mata pelajaran ${m}.`],
    ['Perlu pendampingan', (m, akt) =>
      `Ananda belum terampil dalam ${akt} pada mata pelajaran ${m}; diperlukan pendampingan dan latihan secara bertahap serta dukungan dari orang tua di rumah.`],
    ['Perlu motivasi', (m, akt) =>
      `Ananda perlu lebih aktif dan percaya diri dalam ${akt} pada mata pelajaran ${m} dengan bimbingan dan motivasi yang berkelanjutan.`],
  ],
}

// Satu kalimat deskripsi otomatis (dipakai bila kolom dikosongkan saat simpan).
export function deskripsiKeterampilanOtomatis(predikat, namaMapel, jenjang) {
  const daftar = TEMPLATE[predikat]
  if (!daftar) return ''
  const [, bangun] = daftar[0]
  return bangun(namaMapel, aktivitasDariMapel(namaMapel), tingkatDariJenjang(jenjang))
}

// Daftar pilihan untuk dropdown: [{ label, teks }]
export function opsiDeskripsiKeterampilan(jenjang, predikat, namaMapel) {
  const daftar = TEMPLATE[predikat]
  if (!daftar) return []
  const akt = aktivitasDariMapel(namaMapel)
  const t = tingkatDariJenjang(jenjang)
  return daftar.map(([label, bangun], i) => ({
    label: `${i + 1}. ${label}`,
    teks: bangun(namaMapel, akt, t),
  }))
}
