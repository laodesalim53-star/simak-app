import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ImageRun,
} from 'docx'

// Data RPP yang disusun di aplikasi -> dokumen Word (.docx) dan HTML (untuk cetak/PDF).
//
// data = {
//   satuan, mapel, kelas, fase, semester, tahunAjaran, alokasi, materi,
//   penyusun, nipPenyusun, kepsek, nipKepsek, kota, tanggal,
//   capaian, tujuan, profil: [..], model, media, sumber,
//   pendahuluan, inti, penutup, asesmen,
//   kop (opsional): {
//     dinas, kabupaten, nama, kecamatan, alamat, kontak,
//     kiri:  { data: Uint8Array, type: 'png'|'jpg'|'gif', w, h, dataUrl } | null,
//     kanan: { ...sama } | null,
//   }
// }

const FONT = 'Times New Roman'
const baris = (teks) =>
  String(teks || '')
    .split('\n')
    .map((s) => s.trimEnd())
    .filter((s, i, arr) => s !== '' || (i > 0 && i < arr.length - 1))

const tp = (text, opts = {}) =>
  new Paragraph({
    alignment: opts.align,
    spacing: { after: opts.after ?? 60 },
    indent: opts.indent,
    keepNext: opts.keepNext,
    children: [new TextRun({ text, bold: opts.bold, size: opts.size ?? 22, font: FONT })],
  })

const paragrafBanyak = (teks) => {
  const b = baris(teks)
  return b.length ? b.map((s) => tp(s)) : [tp('-')]
}

const judulBagian = (huruf, teks) => tp(`${huruf}. ${teks}`, { bold: true, after: 80, keepNext: true })

const garis = { style: BorderStyle.SINGLE, size: 4, color: '000000' }
const tanpaGaris = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const semuaGaris = { top: garis, bottom: garis, left: garis, right: garis }
const tanpaSemua = { top: tanpaGaris, bottom: tanpaGaris, left: tanpaGaris, right: tanpaGaris }

function sel(teks, lebar, { bold, borders = semuaGaris } = {}) {
  return new TableCell({
    width: { size: lebar, type: WidthType.PERCENTAGE },
    borders,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: baris(teks).length ? baris(teks).map((s) => tp(s, { bold, after: 20 })) : [tp('', { after: 20 })],
  })
}

// ---------- Kop surat untuk Word ----------
function logoParagraf(logo, align) {
  if (!logo) return new Paragraph({ children: [] })
  return new Paragraph({
    alignment: align,
    children: [
      new ImageRun({
        type: logo.type,
        data: logo.data,
        transformation: { width: logo.w || 70, height: logo.h || 70 },
      }),
    ],
  })
}

export function kopDocx(kop) {
  if (!kop || !kop.nama) return []

  const kontak = kop.kontak ? [kop.alamat, kop.kontak].filter(Boolean).join('  —  ') : kop.alamat || ''
  const tengah = []
  if (kop.dinas) tengah.push(tp(kop.dinas.toUpperCase(), { bold: true, size: 24, align: AlignmentType.CENTER, after: 0 }))
  if (kop.kabupaten) tengah.push(tp(kop.kabupaten.toUpperCase(), { bold: true, size: 24, align: AlignmentType.CENTER, after: 0 }))
  tengah.push(tp(kop.nama.toUpperCase(), { bold: true, size: 28, align: AlignmentType.CENTER, after: 0 }))
  if (kop.kecamatan) tengah.push(tp(kop.kecamatan.toUpperCase(), { size: 20, align: AlignmentType.CENTER, after: 0 }))
  if (kontak) tengah.push(tp(kontak, { size: 18, align: AlignmentType.CENTER, after: 0 }))

  const tabelKop = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { ...tanpaSemua, insideHorizontal: tanpaGaris, insideVertical: tanpaGaris },
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 15, type: WidthType.PERCENTAGE },
            borders: tanpaSemua,
            children: [logoParagraf(kop.kiri, AlignmentType.LEFT)],
          }),
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            borders: tanpaSemua,
            children: tengah,
          }),
          new TableCell({
            width: { size: 15, type: WidthType.PERCENTAGE },
            borders: tanpaSemua,
            children: [logoParagraf(kop.kanan, AlignmentType.RIGHT)],
          }),
        ],
      }),
    ],
  })

  // Garis ganda di bawah kop
  const garisKop = new Paragraph({
    spacing: { before: 40, after: 200 },
    border: { bottom: { style: BorderStyle.DOUBLE, size: 6, color: '000000', space: 1 } },
    children: [],
  })

  return [tabelKop, garisKop]
}

export function buatDokumenRpp(d) {
  const identitas = [
    ['Satuan Pendidikan', d.satuan],
    ['Mata Pelajaran', d.mapel],
    ['Kelas / Fase', `${d.kelas}${d.fase ? ` / Fase ${d.fase}` : ''}`],
    ['Semester / Tahun Ajaran', `${d.semester} / ${d.tahunAjaran}`],
    ['Alokasi Waktu', d.alokasi],
    ['Materi Pokok', d.materi],
    ['Nama Penyusun', d.penyusun],
  ]

  const tabelIdentitas = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: identitas.map(
      ([k, v]) =>
        new TableRow({
          children: [sel(k, 32, { bold: true }), sel(v || '-', 68)],
        })
    ),
  })

  const bagian = [
    ['B', 'Capaian Pembelajaran', d.capaian],
    ['C', 'Tujuan Pembelajaran', d.tujuan],
    ['D', 'Dimensi Profil Pelajar', (d.profil || []).map((p, i) => `${i + 1}. ${p}`).join('\n')],
    ['E', 'Model / Metode Pembelajaran', d.model],
    ['F', 'Media dan Sumber Belajar', [d.media && `Media: ${d.media}`, d.sumber && `Sumber: ${d.sumber}`].filter(Boolean).join('\n')],
  ]

  const kegiatan = [
    ['Pendahuluan', d.pendahuluan],
    ['Kegiatan Inti', d.inti],
    ['Penutup', d.penutup],
  ]

  const tandaTangan = new Table({
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
              tp(' ', { align: AlignmentType.CENTER }),
              tp('Mengetahui,', { align: AlignmentType.CENTER }),
              tp('Kepala Sekolah', { align: AlignmentType.CENTER }),
              tp(' ', { after: 700 }),
              tp(d.kepsek || '..............................', { bold: true, align: AlignmentType.CENTER, after: 0 }),
              tp(d.nipKepsek ? `NIP. ${d.nipKepsek}` : '', { align: AlignmentType.CENTER }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: tanpaSemua,
            children: [
              tp(`${d.kota ? `${d.kota}, ` : ''}${d.tanggal}`, { align: AlignmentType.CENTER }),
              tp('Guru Mata Pelajaran / Wali Kelas', { align: AlignmentType.CENTER }),
              tp(' ', { after: 0 }),
              tp(' ', { after: 700 }),
              tp(d.penyusun || '..............................', { bold: true, align: AlignmentType.CENTER, after: 0 }),
              tp(d.nipPenyusun ? `NIP. ${d.nipPenyusun}` : '', { align: AlignmentType.CENTER }),
            ],
          }),
        ],
      }),
    ],
  })

  const anak = [
    ...kopDocx(d.kop),
    tp('RENCANA PELAKSANAAN PEMBELAJARAN (RPP)', { bold: true, size: 26, align: AlignmentType.CENTER, after: 40 }),
    tp(d.mapel ? d.mapel.toUpperCase() : '', { bold: true, align: AlignmentType.CENTER, after: 200 }),
    judulBagian('A', 'Identitas'),
    tabelIdentitas,
    tp(' ', { after: 120 }),
  ]

  for (const [huruf, judul, isi] of bagian) {
    anak.push(judulBagian(huruf, judul), ...paragrafBanyak(isi), tp(' ', { after: 60 }))
  }

  anak.push(judulBagian('G', 'Kegiatan Pembelajaran'))
  for (const [judul, isi] of kegiatan) {
    anak.push(tp(judul, { bold: true, after: 40, keepNext: true }), ...paragrafBanyak(isi), tp(' ', { after: 40 }))
  }

  anak.push(judulBagian('H', 'Asesmen / Penilaian'), ...paragrafBanyak(d.asesmen), tp(' ', { after: 240 }), tandaTangan)

  return new Document({
    creator: d.penyusun || 'SIMAK',
    title: `RPP ${d.mapel || ''}`,
    sections: [
      {
        properties: {
          page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } },
        },
        children: anak,
      },
    ],
  })
}

// Untuk dipakai di browser: hasilnya File siap diunduh atau diunggah.
export async function buatRppDocxFile(d, namaFile) {
  const blob = await Packer.toBlob(buatDokumenRpp(d))
  return new File([blob], namaFile, {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
}

// ---------- HTML untuk cetak / simpan sebagai PDF ----------
const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const htmlBaris = (t) => (baris(t).length ? baris(t).map((s) => `<p>${esc(s)}</p>`).join('') : '<p>-</p>')

export function kopHtml(kop) {
  if (!kop || !kop.nama) return ''
  const img = (logo, alt) => (logo?.dataUrl ? `<img src="${logo.dataUrl}" alt="${alt}">` : '')
  const kontak = kop.kontak ? [kop.alamat, kop.kontak].filter(Boolean).join('  —  ') : kop.alamat || ''
  return `
    <div class="kop">
      <table><tr>
        <td class="l">${img(kop.kiri, 'Logo')}</td>
        <td class="c">
          ${kop.dinas ? `<p class="b1">${esc(kop.dinas.toUpperCase())}</p>` : ''}
          ${kop.kabupaten ? `<p class="b1">${esc(kop.kabupaten.toUpperCase())}</p>` : ''}
          <p class="b2">${esc(kop.nama.toUpperCase())}</p>
          ${kop.kecamatan ? `<p class="b3">${esc(kop.kecamatan.toUpperCase())}</p>` : ''}
          ${kontak ? `<p class="b4">${esc(kontak)}</p>` : ''}
        </td>
        <td class="r">${img(kop.kanan, 'Logo')}</td>
      </tr></table>
      <div class="garis"></div>
    </div>`
}

export function buatRppHtml(d) {
  const idRows = [
    ['Satuan Pendidikan', d.satuan],
    ['Mata Pelajaran', d.mapel],
    ['Kelas / Fase', `${d.kelas}${d.fase ? ` / Fase ${d.fase}` : ''}`],
    ['Semester / Tahun Ajaran', `${d.semester} / ${d.tahunAjaran}`],
    ['Alokasi Waktu', d.alokasi],
    ['Materi Pokok', d.materi],
    ['Nama Penyusun', d.penyusun],
  ]
    .map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td>${esc(v || '-')}</td></tr>`)
    .join('')

  const bagian = [
    ['B', 'Capaian Pembelajaran', d.capaian],
    ['C', 'Tujuan Pembelajaran', d.tujuan],
    ['D', 'Dimensi Profil Pelajar', (d.profil || []).map((p, i) => `${i + 1}. ${p}`).join('\n')],
    ['E', 'Model / Metode Pembelajaran', d.model],
    ['F', 'Media dan Sumber Belajar', [d.media && `Media: ${d.media}`, d.sumber && `Sumber: ${d.sumber}`].filter(Boolean).join('\n')],
  ]
    .map(([h, j, i]) => `<h3>${h}. ${esc(j)}</h3>${htmlBaris(i)}`)
    .join('')

  const kegiatan = [
    ['Pendahuluan', d.pendahuluan],
    ['Kegiatan Inti', d.inti],
    ['Penutup', d.penutup],
  ]
    .map(([j, i]) => `<h4>${esc(j)}</h4>${htmlBaris(i)}`)
    .join('')

  return `
  <div class="rpp">
    ${kopHtml(d.kop)}
    <h1>RENCANA PELAKSANAAN PEMBELAJARAN (RPP)</h1>
    <h2>${esc((d.mapel || '').toUpperCase())}</h2>
    <h3>A. Identitas</h3>
    <table class="id">${idRows}</table>
    ${bagian}
    <h3>G. Kegiatan Pembelajaran</h3>
    ${kegiatan}
    <h3>H. Asesmen / Penilaian</h3>
    ${htmlBaris(d.asesmen)}
    <table class="ttd"><tr>
      <td><p>&nbsp;</p><p>Mengetahui,</p><p>Kepala Sekolah</p><div class="sp"></div>
        <p><b><u>${esc(d.kepsek || '..............................')}</u></b></p>${d.nipKepsek ? `<p>NIP. ${esc(d.nipKepsek)}</p>` : ''}</td>
      <td><p>${esc(d.kota ? d.kota + ', ' : '')}${esc(d.tanggal)}</p><p>Guru Mata Pelajaran / Wali Kelas</p><p>&nbsp;</p><div class="sp"></div>
        <p><b><u>${esc(d.penyusun || '..............................')}</u></b></p>${d.nipPenyusun ? `<p>NIP. ${esc(d.nipPenyusun)}</p>` : ''}</td>
    </tr></table>
  </div>`
}

export const CSS_CETAK_RPP = `
  @page { size: A4 portrait; margin: 20mm; }
  body { margin: 0; background: #fff; }
  .rpp { font-family: 'Times New Roman', serif; font-size: 12pt; color: #000; line-height: 1.35; }
  .rpp h1 { text-align: center; font-size: 13pt; margin: 0 0 2pt; }
  .rpp h2 { text-align: center; font-size: 12pt; margin: 0 0 12pt; }
  .rpp h3 { font-size: 12pt; margin: 10pt 0 4pt; break-after: avoid; }
  .rpp h4 { font-size: 12pt; margin: 6pt 0 2pt; break-after: avoid; }
  .rpp p { margin: 0 0 3pt; }
  .rpp table.id { width: 100%; border-collapse: collapse; }
  .rpp table.id td { border: 1px solid #000; padding: 2pt 5pt; vertical-align: top; }
  .rpp table.id td.k { width: 32%; font-weight: bold; }
  .rpp table.ttd { width: 100%; margin-top: 18pt; break-inside: avoid; }
  .rpp table.ttd td { width: 50%; text-align: center; vertical-align: top; }
  .rpp .sp { height: 52pt; }

  .rpp .kop { margin-bottom: 12pt; }
  .rpp .kop table { width: 100%; border-collapse: collapse; }
  .rpp .kop td { border: 0; padding: 0; vertical-align: middle; }
  .rpp .kop td.l, .rpp .kop td.r { width: 80px; }
  .rpp .kop td.l { text-align: left; }
  .rpp .kop td.r { text-align: right; }
  .rpp .kop img { width: 70px; height: 70px; object-fit: contain; }
  .rpp .kop td.c { text-align: center; }
  .rpp .kop p { margin: 0; line-height: 1.2; }
  .rpp .kop .b1 { font-size: 12pt; font-weight: bold; }
  .rpp .kop .b2 { font-size: 14pt; font-weight: bold; }
  .rpp .kop .b3 { font-size: 10pt; }
  .rpp .kop .b4 { font-size: 9pt; margin-top: 2pt; }
  .rpp .kop .garis { border-top: 1px solid #000; border-bottom: 3px solid #000; height: 2px; margin-top: 4pt; }
`
