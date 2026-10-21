import { Sparkles } from 'lucide-react'
import { buatLkpdDocx, buatLkpdHtml, CSS_PERANGKAT } from '../../lib/dokumenPerangkat'
import {
  useDasar,
  useDraft,
  IdentitasDasar,
  Field,
  Rekom,
  TombolOutput,
  unduhDocx,
  cetakHtml,
  namaBerkas,
  kosong,
} from './perangkatUmum'

const AWAL = { judul: '', petunjuk: '', alatBahan: '', langkah: '', soal: '', barisJawab: 3 }

const PETUNJUK = [
  {
    label: 'Kerja kelompok',
    isi: [
      '1. Berdoalah sebelum mengerjakan LKPD.',
      '2. Tulislah nama anggota kelompok pada tempat yang tersedia.',
      '3. Bacalah setiap petunjuk dan pertanyaan dengan cermat.',
      '4. Diskusikan dengan teman kelompokmu dan tanyakan kepada guru jika ada yang belum jelas.',
      '5. Tuliskan jawabanmu pada tempat yang disediakan.',
      '6. Kumpulkan LKPD setelah selesai dikerjakan.',
    ].join('\n'),
  },
  {
    label: 'Kerja individu',
    isi: [
      '1. Berdoalah sebelum mengerjakan LKPD.',
      '2. Tulislah nama dan kelasmu pada tempat yang tersedia.',
      '3. Bacalah setiap petunjuk dan pertanyaan dengan cermat.',
      '4. Kerjakan secara mandiri dan jujur.',
      '5. Tanyakan kepada guru jika ada yang belum jelas.',
      '6. Kumpulkan LKPD setelah selesai dikerjakan.',
    ].join('\n'),
  },
]

const ALAT_BAHAN = [
  'Alat tulis',
  'Buku catatan / buku siswa',
  'Gambar atau benda konkret terkait materi',
  'Kertas HVS / karton',
  'Spidol dan pensil warna',
  'Penggaris',
]

const langkahDiskusi = (m) =>
  [
    `1. Bacalah teks atau amatilah gambar/benda yang diberikan guru tentang ${m}.`,
    '2. Diskusikan dengan kelompokmu apa yang kamu temukan.',
    '3. Catat hasil pengamatan atau diskusi pada tempat yang tersedia.',
    '4. Jawablah pertanyaan pada bagian soal.',
    '5. Presentasikan hasil kerja kelompokmu di depan kelas.',
  ].join('\n')

const langkahPercobaan = () =>
  [
    '1. Siapkan alat dan bahan yang dibutuhkan.',
    '2. Lakukan kegiatan sesuai arahan guru.',
    '3. Amati dan catat setiap hasil yang kamu peroleh.',
    '4. Diskusikan hasil pengamatan dengan kelompokmu.',
    '5. Tarik kesimpulan dari kegiatan yang telah dilakukan.',
  ].join('\n')

const soalContoh = (m) => [
  `Jelaskan dengan kata-katamu sendiri tentang ${m}!`,
  `Sebutkan dua contoh ${m} yang ada di sekitarmu!`,
  `Apa manfaat mempelajari ${m} dalam kehidupan sehari-hari?`,
  `Apa yang dapat kamu simpulkan dari kegiatan ini?`,
]

export default function LkpdTab() {
  const h = useDasar()
  const { dasar } = h
  const [x, setX] = useDraft('simak_draft_lkpd', AWAL)
  const set = (k) => (e) => setX((p) => ({ ...p, [k]: e.target.value }))

  const m = dasar.materi.trim() || 'materi pembelajaran'
  const siap = dasar.mapel.trim() && dasar.materi.trim()

  function tambah(k, teks) {
    setX((p) => {
      if (kosong(p[k])) return { ...p, [k]: teks }
      if (p[k].includes(teks)) return p
      return { ...p, [k]: p[k].trimEnd() + '\n' + teks }
    })
  }

  function isiOtomatis() {
    setX((p) => ({
      ...p,
      judul: kosong(p.judul) ? `LKPD ${m}` : p.judul,
      petunjuk: kosong(p.petunjuk) ? PETUNJUK[0].isi : p.petunjuk,
      alatBahan: kosong(p.alatBahan) ? 'Alat tulis\nBuku catatan / buku siswa' : p.alatBahan,
      langkah: kosong(p.langkah) ? langkahDiskusi(m) : p.langkah,
      soal: kosong(p.soal) ? soalContoh(m).join('\n') : p.soal,
    }))
  }

  const data = () => ({ ...x, judul: x.judul || `LKPD ${m}` })

  return (
    <div className="space-y-6">
      <IdentitasDasar h={h} />

      <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-700/70 max-w-xl">
          Klik <strong>Isi Otomatis</strong> untuk melengkapi kolom yang masih kosong, atau pilih{' '}
          <strong>✨ Rekomendasi</strong> di tiap kolom. Isian yang sudah Anda tulis tidak ditimpa.
        </p>
        <button type="button" onClick={isiOtomatis} disabled={!siap} className="btn-primary shrink-0 disabled:opacity-50">
          <Sparkles size={16} /> Isi Otomatis
        </button>
      </div>

      <div className="card p-6">
        <h3 className="font-display text-lg font-semibold mb-3">Isi LKPD</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Judul LKPD" full>
            <input className="input-field" placeholder={`LKPD ${m}`} value={x.judul} onChange={set('judul')} />
          </Field>

          <Field
            label="Petunjuk Belajar"
            full
            rekom={<Rekom opsi={PETUNJUK} onPilih={(o) => setX((p) => ({ ...p, petunjuk: o.isi }))} teks="Pilih petunjuk" />}
          >
            <textarea className="input-field" rows={5} value={x.petunjuk} onChange={set('petunjuk')} />
          </Field>

          <Field
            label="Alat dan Bahan"
            full
            rekom={<Rekom opsi={ALAT_BAHAN} onPilih={(o) => tambah('alatBahan', o)} teks="Tambah alat/bahan" />}
          >
            <textarea className="input-field" rows={3} value={x.alatBahan} onChange={set('alatBahan')} />
          </Field>

          <Field
            label="Langkah Kegiatan"
            full
            rekom={
              <Rekom
                opsi={[
                  { label: 'Diskusi / pengamatan', isi: langkahDiskusi(m) },
                  { label: 'Percobaan sederhana', isi: langkahPercobaan() },
                ]}
                onPilih={(o) => setX((p) => ({ ...p, langkah: o.isi }))}
                teks="Pilih langkah"
              />
            }
          >
            <textarea className="input-field" rows={6} value={x.langkah} onChange={set('langkah')} />
          </Field>

          <Field
            label="Soal / Pertanyaan (satu baris = satu soal)"
            full
            rekom={<Rekom opsi={soalContoh(m)} onPilih={(o) => tambah('soal', o)} teks="Tambah soal contoh" />}
          >
            <textarea className="input-field" rows={6} value={x.soal} onChange={set('soal')} />
          </Field>

          <Field label="Baris tempat jawaban per soal">
            <select
              className="input-field"
              value={x.barisJawab}
              onChange={(e) => setX((p) => ({ ...p, barisJawab: Number(e.target.value) }))}
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} baris
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <TombolOutput
        siap={siap}
        onWord={() => unduhDocx(buatLkpdDocx(h.dokumenDasar(), data()), namaBerkas('LKPD', dasar.mapel, dasar.materi))}
        onPdf={() => cetakHtml(buatLkpdHtml(h.dokumenDasar(), data()), CSS_PERANGKAT, `LKPD ${dasar.mapel}`)}
        onKosongkan={() => confirm('Kosongkan isian LKPD?') && setX(AWAL)}
      />
    </div>
  )
}
