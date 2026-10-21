import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  PageOrientation,
} from 'docx'
import { kopDocx, kopHtml, CSS_CETAK_RPP } from './rppDokumen'

// Pembuat dokumen LKPD, Kisi-Kisi, dan Evaluasi Pembelajaran (Word + HTML cetak).
// Letakkan di: src/lib/dokumenPerangkat.js
//
// d  = data dasar: { satuan, mapel, kelas, semester, tahunAjaran, materi, tujuan,
//                    penyusun, nipPenyusun, kepsek, nipKepsek, kota, tanggal, kop }
// x  = isi khusus tiap dokumen (lihat tiap fungsi)

const FONT = 'Times New Roman'
const C = AlignmentType.CENTER
const L = AlignmentType.LEFT

export const baris = (t) =>
  String(t || '')
    .split('\n')
    .map((s) => s.trimEnd())
    .filter((s) => s.trim() !== '')

// Buang nomor di depan baris ("1. ", "2) ") supaya tidak dobel saat diberi nomor otomatis
export const tanpaNomor = (s) => String(s || '').replace(/^\s*\d+\s*[.)]\s*/, '')

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const TITIK = '.'.repeat(150)

// ---------- Nomor soal otomatis untuk kisi-kisi ----------
export function hitungNomor(rows) {
  let n = 1
  return rows.map((r) => {
    const j = Math.max(0, parseInt(r.jml, 10) || 0)
    if (!j) return '-'
    const a = n
    n += j
    return j === 1 ? `${a}` : `${a}–${n - 1}`
  })
}

export const totalSoal = (rows) => rows.reduce((t, r) => t + Math.max(0, parseInt(r.jml, 10) || 0), 0)

// ---------- Pembantu docx ----------
const tp = (text, o = {}) =>
  new Paragraph({
    alignment: o.align,
    spacing: { after: o.after ?? 60 },
    indent: o.indent,
    keepNext: o.keepNext,
    pageBreakBefore: o.pageBreakBefore,
    children: [new TextRun({ text, bold: o.bold, italics: o.italics, size: o.size ?? 22, font: FONT })],
  })

const garis = { style: BorderStyle.SINGLE, size: 4, color: '000000' }
const tanpaGaris = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const semuaGaris = { top: garis, bottom: garis, left: garis, right: garis }
const tanpaSemua = { top: tanpaGaris, bottom: tanpaGaris, left: tanpaGaris, right: tanpaGaris }

function sel(teks, lebar, { bold, align, fill, borders = semuaGaris } = {}) {
  const b = baris(teks)
  return new TableCell({
    width: { size: lebar, type: WidthType.PERCENTAGE },
    borders,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    shading: fill ? { type: ShadingType.CLEAR, fill, color: 'auto' } : undefined,
    children: b.length ? b.map((s) => tp(s, { bold, align, after: 20 })) : [tp('', { after: 20 })],
  })
}

function tabelData(header, rows, lebar, rata = []) {
  const h = new TableRow({
    tableHeader: true,
    children: header.map((t, i) => sel(t, lebar[i], { bold: true, align: C, fill: 'E7E6E6' })),
  })
  const r = rows.map(
    (row) =>
      new TableRow({
        cantSplit: true,
        children: row.map((t, i) => sel(t, lebar[i], { align: rata[i] || L })),
      })
  )
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [h, ...r] })
}

const tabelId = (rows) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([k, v]) => new TableRow({ children: [sel(k, 30, { bold: true }), sel(v || '', 70)] })),
  })

const hj = (i, t) => tp(`${String.fromCharCode(65 + i)}. ${t}`, { bold: true, after: 80, keepNext: true })

function ttdDocx(d) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { ...tanpaSemua, insideHorizontal: tanpaGaris, insideVertical: tanpaGaris },
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: tanpaSemua,
            children: [
              tp(' ', { align: C }),
              tp('Mengetahui,', { align: C }),
              tp('Kepala Sekolah', { align: C }),
              tp(' ', { after: 700 }),
              tp(d.kepsek || '..............................', { bold: true, align: C, after: 0 }),
              tp(d.nipKepsek ? `NIP. ${d.nipKepsek}` : '', { align: C }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: tanpaSemua,
            children: [
              tp(`${d.kota ? `${d.kota}, ` : ''}${d.tanggal}`, { align: C }),
              tp('Guru Mata Pelajaran / Wali Kelas', { align: C }),
              tp(' ', { after: 0 }),
              tp(' ', { after: 700 }),
              tp(d.penyusun || '..............................', { bold: true, align: C, after: 0 }),
              tp(d.nipPenyusun ? `NIP. ${d.nipPenyusun}` : '', { align: C }),
            ],
          }),
        ],
      }),
    ],
  })
}

function dokumen(d, anak, { judul, landscape } = {}) {
  return new Document({
    creator: d.penyusun || 'SIMAK',
    title: judul || 'Dokumen',
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 },
            ...(landscape ? { size: { orientation: PageOrientation.LANDSCAPE } } : {}),
          },
        },
        children: anak,
      },
    ],
  })
}

// ---------- Pembantu HTML ----------
export const CSS_PERANGKAT = `${CSS_CETAK_RPP}
  .rpp table.dt { width: 100%; border-collapse: collapse; margin: 4pt 0 8pt; }
  .rpp table.dt th, .rpp table.dt td { border: 1px solid #000; padding: 3pt 5pt; vertical-align: top; font-size: 11pt; }
  .rpp table.dt th { background: #e7e6e6; text-align: center; }
  .rpp table.dt td.c { text-align: center; }
  .rpp .ln { border-bottom: 1px dotted #000; height: 18pt; margin-bottom: 2pt; }
  .rpp .pil p { margin: 0 0 1pt 18pt; }
  .rpp .brk { break-before: page; }
  .rpp .soal { break-inside: avoid; margin-bottom: 6pt; }
`
export const CSS_LANDSCAPE = `${CSS_PERANGKAT}
  @page { size: A4 landscape; margin: 15mm; }
`

const pHtml = (t) => baris(t).map((s) => `<p>${esc(s)}</p>`).join('')
const idHtml = (rows) =>
  `<table class="id">${rows
    .map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td>${esc(v || '') || '&nbsp;'}</td></tr>`)
    .join('')}</table>`

const ttdHtml = (d) => `
  <table class="ttd"><tr>
    <td><p>&nbsp;</p><p>Mengetahui,</p><p>Kepala Sekolah</p><div class="sp"></div>
      <p><b><u>${esc(d.kepsek || '..............................')}</u></b></p>${d.nipKepsek ? `<p>NIP. ${esc(d.nipKepsek)}</p>` : ''}</td>
    <td><p>${esc(d.kota ? d.kota + ', ' : '')}${esc(d.tanggal)}</p><p>Guru Mata Pelajaran / Wali Kelas</p><p>&nbsp;</p><div class="sp"></div>
      <p><b><u>${esc(d.penyusun || '..............................')}</u></b></p>${d.nipPenyusun ? `<p>NIP. ${esc(d.nipPenyusun)}</p>` : ''}</td>
  </tr></table>`

const kelasSemester = (d) => [d.kelas, d.semester].filter(Boolean).join(' / ')

// =====================================================================
// LKPD
// x = { judul, petunjuk, alatBahan, langkah, soal, barisJawab }
// =====================================================================
function bagianLkpd(d, x) {
  return [
    ['Tujuan Pembelajaran', d.tujuan],
    ['Petunjuk Belajar', x.petunjuk],
    ['Alat dan Bahan', x.alatBahan],
    ['Langkah Kegiatan', x.langkah],
  ].filter(([, isi]) => baris(isi).length)
}

const idLkpd = (d) => [
  ['Mata Pelajaran', d.mapel],
  ['Kelas / Semester', kelasSemester(d)],
  ['Materi Pokok', d.materi],
  ['Nama / Kelompok', ''],
  ['Hari / Tanggal', ''],
]

export function buatLkpdDocx(d, x) {
  const anak = [
    ...kopDocx(d.kop),
    tp('LEMBAR KERJA PESERTA DIDIK (LKPD)', { bold: true, size: 26, align: C, after: 40 }),
    tp((x.judul || '').toUpperCase(), { bold: true, align: C, after: 160 }),
    tabelId(idLkpd(d)),
    tp(' ', { after: 120 }),
  ]
  let i = 0
  for (const [j, isi] of bagianLkpd(d, x)) {
    anak.push(hj(i++, j), ...baris(isi).map((s) => tp(s)), tp(' ', { after: 60 }))
  }
  const soal = baris(x.soal).map(tanpaNomor)
  if (soal.length) {
    anak.push(hj(i++, 'Soal / Pertanyaan'))
    soal.forEach((s, n) => {
      anak.push(tp(`${n + 1}. ${s}`, { keepNext: true }))
      for (let k = 0; k < (x.barisJawab || 3); k++) anak.push(tp(TITIK, { after: 40 }))
      anak.push(tp(' ', { after: 40 }))
    })
  }
  anak.push(hj(i++, 'Kesimpulan'), tp(TITIK, { after: 40 }), tp(TITIK, { after: 40 }), tp(TITIK, { after: 40 }))
  return dokumen(d, anak, { judul: `LKPD ${d.mapel || ''}` })
}

export function buatLkpdHtml(d, x) {
  const bagian = bagianLkpd(d, x)
  let i = 0
  const sec = bagian.map(([j, isi]) => `<h3>${String.fromCharCode(65 + i++)}. ${esc(j)}</h3>${pHtml(isi)}`).join('')
  const soal = baris(x.soal).map(tanpaNomor)
  const soalHtml = soal.length
    ? `<h3>${String.fromCharCode(65 + i++)}. Soal / Pertanyaan</h3>` +
      soal
        .map(
          (s, n) =>
            `<div class="soal"><p>${n + 1}. ${esc(s)}</p>${'<div class="ln"></div>'.repeat(x.barisJawab || 3)}</div>`
        )
        .join('')
    : ''
  return `<div class="rpp">
    ${kopHtml(d.kop)}
    <h1>LEMBAR KERJA PESERTA DIDIK (LKPD)</h1>
    <h2>${esc((x.judul || '').toUpperCase())}</h2>
    ${idHtml(idLkpd(d))}
    ${sec}${soalHtml}
    <h3>${String.fromCharCode(65 + i)}. Kesimpulan</h3>
    <div class="ln"></div><div class="ln"></div><div class="ln"></div>
  </div>`
}

// =====================================================================
// KISI-KISI
// x = { jenis, alokasi, rows: [{ tp, materi, indikator, level, bentuk, jml }] }
// =====================================================================
const HEADER_KISI = ['No', 'Tujuan Pembelajaran', 'Materi', 'Indikator Soal', 'Level Kognitif', 'Bentuk Soal', 'No. Soal']

const idKisi = (d, x) => [
  ['Satuan Pendidikan', d.satuan],
  ['Mata Pelajaran', d.mapel],
  ['Kelas / Semester', kelasSemester(d)],
  ['Tahun Ajaran', d.tahunAjaran],
  ['Jenis Asesmen', x.jenis],
  ['Jumlah Soal', String(totalSoal(x.rows))],
  ['Alokasi Waktu', x.alokasi],
]

const barisKisi = (x) => {
  const nomor = hitungNomor(x.rows)
  return x.rows.map((r, i) => [String(i + 1), r.tp, r.materi, r.indikator, r.level, r.bentuk, nomor[i]])
}

export function buatKisiDocx(d, x) {
  const anak = [
    ...kopDocx(d.kop),
    tp(`KISI-KISI ${(x.jenis || 'SOAL').toUpperCase()}`, { bold: true, size: 26, align: C, after: 160 }),
    tabelId(idKisi(d, x)),
    tp(' ', { after: 120 }),
    tabelData(HEADER_KISI, barisKisi(x), [5, 22, 15, 30, 9, 11, 8], [C, L, L, L, C, C, C]),
    tp(' ', { after: 240 }),
    ttdDocx(d),
  ]
  return dokumen(d, anak, { judul: `Kisi-kisi ${d.mapel || ''}`, landscape: true })
}

export function buatKisiHtml(d, x) {
  const head = `<tr>${HEADER_KISI.map((h) => `<th>${h}</th>`).join('')}</tr>`
  const body = barisKisi(x)
    .map((r) => `<tr>${r.map((v, i) => `<td${[0, 4, 5, 6].includes(i) ? ' class="c"' : ''}>${esc(v)}</td>`).join('')}</tr>`)
    .join('')
  return `<div class="rpp">
    ${kopHtml(d.kop)}
    <h1>KISI-KISI ${esc((x.jenis || 'SOAL').toUpperCase())}</h1>
    <p>&nbsp;</p>
    ${idHtml(idKisi(d, x))}
    <p>&nbsp;</p>
    <table class="dt">${head}${body}</table>
    ${ttdHtml(d)}
  </div>`
}

// =====================================================================
// EVALUASI PEMBELAJARAN
// x = { judul, waktu, petunjuk, soal: [{ jenis:'pg'|'uraian', teks, pil:{A,B,C,D}, kunci, skor }] }
// =====================================================================
const PIL = ['A', 'B', 'C', 'D']

function pisahSoal(x) {
  const ada = (s) => String(s.teks || '').trim()
  return {
    pg: (x.soal || []).filter((s) => s.jenis === 'pg' && ada(s)),
    ur: (x.soal || []).filter((s) => s.jenis === 'uraian' && ada(s)),
  }
}

const skorDari = (s) => Math.max(0, Number(s.skor) || 0)

const idEval = (d, x) => [
  ['Mata Pelajaran', d.mapel],
  ['Kelas / Semester', kelasSemester(d)],
  ['Materi Pokok', d.materi],
  ['Waktu', x.waktu],
  ['Nama / No. Absen', ''],
  ['Hari / Tanggal', ''],
]

export function buatEvaluasiDocx(d, x) {
  const { pg, ur } = pisahSoal(x)
  const total = [...pg, ...ur].reduce((t, s) => t + skorDari(s), 0)

  const anak = [
    ...kopDocx(d.kop),
    tp('EVALUASI PEMBELAJARAN', { bold: true, size: 26, align: C, after: 40 }),
    tp((x.judul || d.materi || '').toUpperCase(), { bold: true, align: C, after: 160 }),
    tabelId(idEval(d, x)),
    tp(' ', { after: 100 }),
  ]

  if (baris(x.petunjuk).length) {
    anak.push(tp('Petunjuk:', { bold: true, after: 40 }), ...baris(x.petunjuk).map((s) => tp(s)), tp(' ', { after: 80 }))
  }

  let i = 0
  if (pg.length) {
    anak.push(hj(i++, 'Pilihan Ganda'), tp('Pilihlah satu jawaban yang paling benar!', { italics: true, after: 80 }))
    pg.forEach((s, n) => {
      anak.push(tp(`${n + 1}. ${tanpaNomor(s.teks)}`, { keepNext: true, after: 30 }))
      PIL.forEach((p) => {
        if (String(s.pil?.[p] || '').trim()) anak.push(tp(`${p}. ${s.pil[p]}`, { indent: { left: 400 }, after: 20 }))
      })
      anak.push(tp(' ', { after: 40 }))
    })
  }
  if (ur.length) {
    anak.push(hj(i++, 'Uraian'), tp('Jawablah pertanyaan berikut dengan benar!', { italics: true, after: 80 }))
    ur.forEach((s, n) => {
      anak.push(tp(`${n + 1}. ${tanpaNomor(s.teks)}`, { keepNext: true }), tp(TITIK, { after: 40 }), tp(TITIK, { after: 40 }), tp(' ', { after: 40 }))
    })
  }

  // Halaman kunci jawaban
  anak.push(tp('KUNCI JAWABAN DAN PEDOMAN PENSKORAN', { bold: true, size: 26, align: C, after: 160, pageBreakBefore: true }))
  let k = 0
  if (pg.length) {
    anak.push(
      hj(k++, 'Pilihan Ganda'),
      tabelData(['No', 'Kunci Jawaban', 'Skor'], pg.map((s, n) => [String(n + 1), s.kunci || '-', String(skorDari(s))]), [10, 70, 20], [C, C, C]),
      tp(' ', { after: 100 })
    )
  }
  if (ur.length) {
    anak.push(
      hj(k++, 'Uraian'),
      tabelData(['No', 'Kunci / Pedoman Jawaban', 'Skor'], ur.map((s, n) => [String(n + 1), s.kunci || '-', String(skorDari(s))]), [10, 75, 15], [C, L, C]),
      tp(' ', { after: 100 })
    )
  }
  anak.push(
    tp(`Skor maksimal: ${total}`, { bold: true, after: 40 }),
    tp('Nilai akhir = (skor perolehan ÷ skor maksimal) × 100', { after: 240 }),
    ttdDocx(d)
  )
  return dokumen(d, anak, { judul: `Evaluasi ${d.mapel || ''}` })
}

export function buatEvaluasiHtml(d, x) {
  const { pg, ur } = pisahSoal(x)
  const total = [...pg, ...ur].reduce((t, s) => t + skorDari(s), 0)
  let i = 0

  const pgHtml = pg.length
    ? `<h3>${String.fromCharCode(65 + i++)}. Pilihan Ganda</h3><p><i>Pilihlah satu jawaban yang paling benar!</i></p>` +
      pg
        .map(
          (s, n) =>
            `<div class="soal"><p>${n + 1}. ${esc(tanpaNomor(s.teks))}</p><div class="pil">${PIL.filter((p) => String(s.pil?.[p] || '').trim())
              .map((p) => `<p>${p}. ${esc(s.pil[p])}</p>`)
              .join('')}</div></div>`
        )
        .join('')
    : ''
  const urHtml = ur.length
    ? `<h3>${String.fromCharCode(65 + i++)}. Uraian</h3><p><i>Jawablah pertanyaan berikut dengan benar!</i></p>` +
      ur.map((s, n) => `<div class="soal"><p>${n + 1}. ${esc(tanpaNomor(s.teks))}</p><div class="ln"></div><div class="ln"></div></div>`).join('')
    : ''

  const tabel = (judul, head, rows) =>
    `<h3>${judul}</h3><table class="dt"><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr>${rows
      .map((r) => `<tr>${r.map((v, c) => `<td${c !== 1 || judul.includes('Pilihan') ? ' class="c"' : ''}>${esc(v)}</td>`).join('')}</tr>`)
      .join('')}</table>`

  let k = 0
  const kunci =
    (pg.length ? tabel(`${String.fromCharCode(65 + k++)}. Pilihan Ganda`, ['No', 'Kunci Jawaban', 'Skor'], pg.map((s, n) => [String(n + 1), s.kunci || '-', String(skorDari(s))])) : '') +
    (ur.length ? tabel(`${String.fromCharCode(65 + k++)}. Uraian`, ['No', 'Kunci / Pedoman Jawaban', 'Skor'], ur.map((s, n) => [String(n + 1), s.kunci || '-', String(skorDari(s))])) : '')

  return `<div class="rpp">
    ${kopHtml(d.kop)}
    <h1>EVALUASI PEMBELAJARAN</h1>
    <h2>${esc((x.judul || d.materi || '').toUpperCase())}</h2>
    ${idHtml(idEval(d, x))}
    ${baris(x.petunjuk).length ? `<h3>Petunjuk:</h3>${pHtml(x.petunjuk)}` : ''}
    ${pgHtml}${urHtml}
    <div class="brk"></div>
    <h1>KUNCI JAWABAN DAN PEDOMAN PENSKORAN</h1>
    ${kunci}
    <p><b>Skor maksimal: ${total}</b></p>
    <p>Nilai akhir = (skor perolehan ÷ skor maksimal) × 100</p>
    ${ttdHtml(d)}
  </div>`
}
