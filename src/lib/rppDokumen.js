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
} from 'docx'

// Data RPP yang disusun di aplikasi -> dokumen Word (.docx) dan HTML (untuk cetak/PDF).
//
// data = {
//   satuan, mapel, kelas, fase, semester, tahunAjaran, alokasi, materi,
//   penyusun, nipPenyusun, kepsek, nipKepsek, kota, tanggal,
//   capaian, tujuan, profil: [..], model, media, sumber,
//   pendahuluan, inti, penutup, asesmen
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
`
