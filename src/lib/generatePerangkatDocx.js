// Generator .docx (landscape A4) untuk ATP/KKTP, Prota, dan Promes.
// Memakai paket `docx` (npm i docx) — sama dengan pendekatan yang umum dipakai untuk RPP.
// Kop surat di sini sederhana (teks dari profil_sekolah). Kalau mau memakai helper kop
// yang sama dengan RPP/KopSurat (logo, dua baris, dsb.), ganti fungsi `kop()` di bawah.

import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  WidthType,
  AlignmentType,
  PageOrientation,
  BorderStyle,
  ShadingType,
  VerticalAlign,
} from 'docx'
import { JENIS, jumlahJp } from './perangkatAjar'

const FONT = 'Times New Roman'
const LEBAR = 15238 // lebar area cetak landscape A4 (twips) dengan margin 800

const garis = { style: BorderStyle.SINGLE, size: 4, color: '000000' }
const borders = { top: garis, bottom: garis, left: garis, right: garis }
const tanpa = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const tanpaBorders = { top: tanpa, bottom: tanpa, left: tanpa, right: tanpa }

const PUSAT = AlignmentType.CENTER
const KIRI = AlignmentType.LEFT
const KANAN = AlignmentType.RIGHT

function p(teks, { bold = false, align = KIRI, size = 22, after = 0 } = {}) {
  return new Paragraph({
    alignment: align,
    spacing: { after },
    children: [new TextRun({ text: String(teks ?? ''), bold, size, font: FONT })],
  })
}

function sel(teks, { lebar, bold = false, align = KIRI, shade, span, rowSpan, size = 20 } = {}) {
  return new TableCell({
    width: { size: lebar, type: WidthType.DXA },
    borders,
    columnSpan: span,
    rowSpan,
    verticalAlign: VerticalAlign.CENTER,
    shading: shade ? { type: ShadingType.CLEAR, color: 'auto', fill: shade } : undefined,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: String(teks ?? '')
      .split('\n')
      .map(
        (b) =>
          new Paragraph({
            alignment: align,
            children: [new TextRun({ text: b, bold, size, font: FONT })],
          })
      ),
  })
}

function tabel(lebarKolom, rows) {
  return new Table({
    width: { size: lebarKolom.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: lebarKolom,
    rows,
  })
}

function kop(profilSekolah) {
  const s = profilSekolah || {}
  const out = []
  if (s.nama_sekolah) out.push(p(String(s.nama_sekolah).toUpperCase(), { bold: true, size: 28, align: PUSAT }))
  const alamat = [s.alamat, s.kabupaten].filter(Boolean).join(', ')
  if (alamat) out.push(p(alamat, { size: 20, align: PUSAT }))
  out.push(
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: '000000', space: 1 } },
      spacing: { after: 200 },
      children: [],
    })
  )
  return out
}

function meta(baris) {
  const lebar = [2400, 300, LEBAR - 2700]
  return new Table({
    width: { size: LEBAR, type: WidthType.DXA },
    columnWidths: lebar,
    rows: baris.map(
      ([k, v]) =>
        new TableRow({
          children: [k, ':', v].map(
            (t, i) =>
              new TableCell({
                width: { size: lebar[i], type: WidthType.DXA },
                borders: tanpaBorders,
                children: [p(t, { size: 22 })],
              })
          ),
        })
    ),
  })
}

function tandaTangan({ form, profilSekolah, namaGuru }) {
  const tanggal = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  const tempat = profilSekolah?.tempat_ttd ? `${profilSekolah.tempat_ttd}, ` : ''
  const setengah = Math.floor(LEBAR / 2)
  const blok = (baris) =>
    new TableCell({
      width: { size: setengah, type: WidthType.DXA },
      borders: tanpaBorders,
      children: baris.map((b, i) => p(b.t, { bold: b.bold, align: PUSAT, size: 22, after: i === 1 ? 900 : 0 })),
    })
  return new Table({
    width: { size: setengah * 2, type: WidthType.DXA },
    columnWidths: [setengah, setengah],
    rows: [
      new TableRow({
        children: [
          blok([
            { t: 'Mengetahui,' },
            { t: 'Kepala Sekolah' },
            { t: profilSekolah?.kepala_sekolah || '........................', bold: true },
          ]),
          blok([
            { t: `${tempat}${tanggal}` },
            { t: 'Guru Mata Pelajaran' },
            { t: namaGuru || '........................', bold: true },
          ]),
        ],
      }),
    ],
  })
}

// ---------------------------------------------------------------------------
function tabelAtp(rows) {
  const w = [600, 1800, 4200, 2400, 4238, 700, 1300]
  const kepala = ['No', 'Elemen', 'Tujuan Pembelajaran', 'Materi', 'KKTP', 'JP', 'Semester']
  const head = new TableRow({
    tableHeader: true,
    children: kepala.map((t, i) => sel(t, { lebar: w[i], bold: true, align: PUSAT, shade: 'D9D9D9' })),
  })
  const body = rows.map(
    (r, i) =>
      new TableRow({
        cantSplit: true,
        children: [
          sel(i + 1, { lebar: w[0], align: PUSAT }),
          sel(r.elemen, { lebar: w[1] }),
          sel(r.tujuan, { lebar: w[2] }),
          sel(r.materi, { lebar: w[3] }),
          sel(r.kktp, { lebar: w[4] }),
          sel(r.jp, { lebar: w[5], align: PUSAT }),
          sel(r.semester, { lebar: w[6], align: PUSAT }),
        ],
      })
  )
  return tabel(w, [head, ...body])
}

function tabelProta(rows) {
  const w = [800, 2000, 10138, 2300]
  const head = new TableRow({
    tableHeader: true,
    children: ['No', 'Semester', 'Materi / Tema', 'Alokasi Waktu (JP)'].map((t, i) =>
      sel(t, { lebar: w[i], bold: true, align: PUSAT, shade: 'D9D9D9' })
    ),
  })
  const baris = []
  ;['Ganjil', 'Genap'].forEach((sem) => {
    const grup = rows.filter((r) => r.semester === sem)
    if (grup.length === 0) return
    grup.forEach((r, i) => {
      baris.push(
        new TableRow({
          cantSplit: true,
          children: [
            sel(i + 1, { lebar: w[0], align: PUSAT }),
            sel(sem, { lebar: w[1], align: PUSAT }),
            sel(r.materi, { lebar: w[2] }),
            sel(r.jp, { lebar: w[3], align: PUSAT }),
          ],
        })
      )
    })
    baris.push(
      new TableRow({
        children: [
          sel(`Jumlah JP Semester ${sem}`, { lebar: w[0] + w[1] + w[2], span: 3, bold: true, align: KANAN, shade: 'F2F2F2' }),
          sel(jumlahJp(rows, sem), { lebar: w[3], bold: true, align: PUSAT, shade: 'F2F2F2' }),
        ],
      })
    )
  })
  baris.push(
    new TableRow({
      children: [
        sel('Jumlah JP Setahun', { lebar: w[0] + w[1] + w[2], span: 3, bold: true, align: KANAN, shade: 'D9D9D9' }),
        sel(jumlahJp(rows), { lebar: w[3], bold: true, align: PUSAT, shade: 'D9D9D9' }),
      ],
    })
  )
  return tabel(w, [head, ...baris])
}

function tabelPromes(rows, bulanData) {
  const nBulan = bulanData.length
  const wMinggu = Math.floor((LEBAR - 4500) / (nBulan * 5))
  const wNo = 500
  const wJp = 600
  const wMateri = LEBAR - wNo - wJp - wMinggu * nBulan * 5
  const w = [wNo, wMateri, wJp, ...Array(nBulan * 5).fill(wMinggu)]

  const baris1 = new TableRow({
    tableHeader: true,
    children: [
      sel('No', { lebar: wNo, rowSpan: 2, bold: true, align: PUSAT, shade: 'D9D9D9' }),
      sel('Materi / Tema', { lebar: wMateri, rowSpan: 2, bold: true, align: PUSAT, shade: 'D9D9D9' }),
      sel('JP', { lebar: wJp, rowSpan: 2, bold: true, align: PUSAT, shade: 'D9D9D9' }),
      ...bulanData.map((bd) =>
        sel(`${bd.bulan.nama} ${bd.bulan.tahun}`, {
          lebar: wMinggu * 5,
          span: 5,
          bold: true,
          align: PUSAT,
          shade: 'D9D9D9',
          size: 18,
        })
      ),
    ],
  })
  const baris2 = new TableRow({
    tableHeader: true,
    children: bulanData.flatMap((bd) =>
      bd.minggu.map((m) => sel(m.no, { lebar: wMinggu, align: PUSAT, bold: true, shade: 'D9D9D9', size: 16 }))
    ),
  })

  const isi = rows.map(
    (r, i) =>
      new TableRow({
        cantSplit: true,
        children: [
          sel(i + 1, { lebar: wNo, align: PUSAT }),
          sel(r.materi, { lebar: wMateri }),
          sel(r.jp, { lebar: wJp, align: PUSAT }),
          ...bulanData.flatMap((bd) =>
            bd.minggu.map((m) => {
              const aktif = (r.minggu || []).includes(m.key)
              const libur = !m.ada || m.hariEfektif === 0
              return sel(aktif ? '✓' : '', {
                lebar: wMinggu,
                align: PUSAT,
                bold: true,
                size: 18,
                shade: aktif ? 'BFE3C8' : libur ? 'D0D0D0' : undefined,
              })
            })
          ),
        ],
      })
  )
  const total = new TableRow({
    children: [
      sel('Jumlah JP', { lebar: wNo + wMateri, span: 2, bold: true, align: KANAN, shade: 'F2F2F2' }),
      sel(jumlahJp(rows), { lebar: wJp, bold: true, align: PUSAT, shade: 'F2F2F2' }),
      sel('', { lebar: wMinggu * nBulan * 5, span: nBulan * 5, shade: 'F2F2F2' }),
    ],
  })
  return tabel(w, [baris1, baris2, ...isi, total])
}

// ---------------------------------------------------------------------------
export async function bangunPerangkatDocx({ jenis, form, cp, rows, bulanData, profilSekolah, namaGuru }) {
  const info = JENIS[jenis]
  const metaBaris = [
    ['Mata Pelajaran', form.mata_pelajaran],
    ['Kelas / Fase', `${form.kelas}${form.fase ? ` / Fase ${form.fase}` : ''}`],
    ['Tahun Ajaran', form.tahun_ajaran],
  ]
  if (jenis === 'promes') metaBaris.push(['Semester', form.semester])
  if (namaGuru) metaBaris.push(['Guru', namaGuru])

  const anak = [
    ...kop(profilSekolah),
    p(info.judul.toUpperCase(), { bold: true, size: 24, align: PUSAT, after: 160 }),
    meta(metaBaris),
    p('', { after: 120 }),
  ]

  if (jenis === 'atp') {
    if (cp) {
      anak.push(p('Capaian Pembelajaran:', { bold: true, size: 22 }))
      anak.push(p(cp, { size: 22, after: 120 }))
    }
    anak.push(tabelAtp(rows))
  } else if (jenis === 'prota') {
    anak.push(tabelProta(rows))
  } else {
    anak.push(tabelPromes(rows, bulanData))
    anak.push(
      p('Keterangan: ✓ = minggu pembelajaran materi; kotak abu-abu = tidak ada hari efektif (libur/kegiatan sekolah).', {
        size: 18,
        after: 0,
      })
    )
  }

  anak.push(p('', { after: 240 }))
  anak.push(tandaTangan({ form, profilSekolah, namaGuru }))

  return new Document({
    creator: namaGuru || 'Guru',
    title: info.judul,
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE },
            margin: { top: 800, bottom: 800, left: 800, right: 800 },
          },
        },
        children: anak,
      },
    ],
  })
}

export async function unduhPerangkatDocx(opsi) {
  const doc = await bangunPerangkatDocx(opsi)
  const blob = await Packer.toBlob(doc)
  const aman = (s) => String(s || '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '')
  const nama = `${JENIS[opsi.jenis].label.replace('/', '_')}_${aman(opsi.form.mata_pelajaran)}_Kelas_${aman(opsi.form.kelas)}.docx`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nama
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
