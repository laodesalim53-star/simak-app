import { Plus, Trash2, Sparkles } from 'lucide-react'
import { buatEvaluasiDocx, buatEvaluasiHtml, CSS_PERANGKAT } from '../../lib/dokumenPerangkat'
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

// Tab Evaluasi Pembelajaran (soal pilihan ganda + uraian, lengkap dengan kunci dan skor).
// Letakkan di: src/components/rpp/EvaluasiTab.jsx

const PIL = ['A', 'B', 'C', 'D']

const soalBaru = (jenis) =>
  jenis === 'pg'
    ? { jenis: 'pg', teks: '', pil: { A: '', B: '', C: '', D: '' }, kunci: '', skor: 1 }
    : { jenis: 'uraian', teks: '', pil: {}, kunci: '', skor: 5 }

const AWAL = { judul: '', waktu: '', petunjuk: '', soal: [] }

const PETUNJUK = [
  {
    label: 'Petunjuk umum',
    isi: [
      '1. Berdoalah sebelum mengerjakan soal.',
      '2. Tulislah nama dan nomor absen pada tempat yang tersedia.',
      '3. Bacalah setiap soal dengan teliti.',
      '4. Kerjakan soal yang dianggap mudah terlebih dahulu.',
      '5. Periksa kembali jawabanmu sebelum dikumpulkan.',
    ].join('\n'),
  },
]

const uraianContoh = (m) => [
  `Jelaskan dengan kata-katamu sendiri tentang ${m}!`,
  `Sebutkan dua contoh ${m} yang ada di sekitarmu!`,
  `Apa manfaat mempelajari ${m} dalam kehidupan sehari-hari?`,
]

export default function EvaluasiTab() {
  const h = useDasar()
  const { dasar } = h
  const [x, setX] = useDraft('simak_draft_evaluasi', AWAL)
  const set = (k) => (e) => setX((p) => ({ ...p, [k]: e.target.value }))

  const m = dasar.materi.trim() || 'materi pembelajaran'
  const terisi = x.soal.filter((s) => !kosong(s.teks))
  const siap = dasar.mapel.trim() && dasar.materi.trim() && terisi.length > 0
  const totalSkor = terisi.reduce((t, s) => t + Math.max(0, Number(s.skor) || 0), 0)
  const kosongCount = x.soal.length - terisi.length

  const ubah = (i, patch) =>
    setX((p) => ({ ...p, soal: p.soal.map((s, n) => (n === i ? { ...s, ...patch } : s)) }))

  const ubahPil = (i, huruf, nilai) =>
    setX((p) => ({
      ...p,
      soal: p.soal.map((s, n) => (n === i ? { ...s, pil: { ...(s.pil || {}), [huruf]: nilai } } : s)),
    }))

  const tambah = (jenis) => setX((p) => ({ ...p, soal: [...p.soal, soalBaru(jenis)] }))
  const hapus = (i) => setX((p) => ({ ...p, soal: p.soal.filter((_, n) => n !== i) }))

  // Isi otomatis: judul, waktu, petunjuk, dan contoh soal uraian bila daftar soal masih kosong.
  // Isian yang sudah Anda tulis tidak ditimpa.
  function isiOtomatis() {
    setX((p) => ({
      ...p,
      judul: kosong(p.judul) ? `Evaluasi ${m}` : p.judul,
      waktu: kosong(p.waktu) ? '60 menit' : p.waktu,
      petunjuk: kosong(p.petunjuk) ? PETUNJUK[0].isi : p.petunjuk,
      soal: p.soal.length
        ? p.soal
        : uraianContoh(m).map((t) => ({ ...soalBaru('uraian'), teks: t, kunci: 'Jawaban sesuai pemahaman peserta didik.' })),
    }))
  }

  const data = () => ({ ...x, judul: x.judul || `Evaluasi ${m}` })

  // Penomoran terpisah untuk pilihan ganda dan uraian (sama seperti hasil dokumen)
  let np = 0
  let nu = 0
  const nomor = x.soal.map((s) => (s.jenis === 'pg' ? ++np : ++nu))

  return (
    <div className="space-y-6">
      <IdentitasDasar h={h} />

      <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-700/70 max-w-xl">
          Klik <strong>Isi Otomatis</strong> untuk melengkapi judul, waktu, petunjuk, dan contoh soal uraian. Soal
          pilihan ganda ditulis sendiri lewat tombol <strong>Tambah Pilihan Ganda</strong>. Soal yang teksnya kosong
          tidak ikut tercetak.
        </p>
        <button type="button" onClick={isiOtomatis} disabled={!dasar.materi.trim()} className="btn-primary shrink-0 disabled:opacity-50">
          <Sparkles size={16} /> Isi Otomatis
        </button>
      </div>

      <div className="card p-6">
        <h3 className="font-display text-lg font-semibold mb-3">Informasi Evaluasi</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Judul Evaluasi">
            <input className="input-field" placeholder={`Evaluasi ${m}`} value={x.judul} onChange={set('judul')} />
          </Field>
          <Field label="Waktu">
            <input className="input-field" placeholder="mis. 60 menit" value={x.waktu} onChange={set('waktu')} />
          </Field>
          <Field
            label="Petunjuk Pengerjaan"
            full
            rekom={<Rekom opsi={PETUNJUK} onPilih={(o) => setX((p) => ({ ...p, petunjuk: o.isi }))} teks="Pilih petunjuk" />}
          >
            <textarea className="input-field" rows={4} value={x.petunjuk} onChange={set('petunjuk')} />
          </Field>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="font-display text-lg font-semibold">Daftar Soal</h3>
          <span className="text-xs text-ink-700/60">
            {terisi.length} soal · skor maksimal {totalSkor}
          </span>
        </div>

        {x.soal.length === 0 && (
          <p className="text-sm text-ink-700/50 mb-3">Belum ada soal. Tambahkan lewat tombol di bawah.</p>
        )}

        <div className="space-y-4">
          {x.soal.map((s, i) => (
            <div key={i} className="rounded-xl border border-ink-900/[0.08] p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-semibold text-ink-700">
                  {s.jenis === 'pg' ? 'Pilihan Ganda' : 'Uraian'} No. {nomor[i]}
                </span>
                <button
                  type="button"
                  onClick={() => hapus(i)}
                  className="text-ink-700/40 hover:text-red-600 p-1"
                  title="Hapus soal"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Teks soal" full>
                  <textarea
                    className="input-field"
                    rows={2}
                    value={s.teks}
                    onChange={(e) => ubah(i, { teks: e.target.value })}
                  />
                </Field>

                {s.jenis === 'pg' ? (
                  <>
                    {PIL.map((p) => (
                      <Field key={p} label={`Pilihan ${p}`}>
                        <input
                          className="input-field"
                          value={s.pil?.[p] || ''}
                          onChange={(e) => ubahPil(i, p, e.target.value)}
                        />
                      </Field>
                    ))}
                    <Field label="Kunci Jawaban">
                      <select
                        className="input-field"
                        value={s.kunci}
                        onChange={(e) => ubah(i, { kunci: e.target.value })}
                      >
                        <option value="">Pilih kunci</option>
                        {PIL.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </>
                ) : (
                  <Field label="Kunci / Pedoman Jawaban" full>
                    <textarea
                      className="input-field"
                      rows={2}
                      value={s.kunci}
                      onChange={(e) => ubah(i, { kunci: e.target.value })}
                    />
                  </Field>
                )}

                <Field label="Skor">
                  <input
                    className="input-field"
                    type="number"
                    min="0"
                    value={s.skor}
                    onChange={(e) => ubah(i, { skor: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => tambah('pg')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-ink-700 bg-ink-900/[0.05]"
          >
            <Plus size={16} /> Tambah Pilihan Ganda
          </button>
          <button
            type="button"
            onClick={() => tambah('uraian')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-ink-700 bg-ink-900/[0.05]"
          >
            <Plus size={16} /> Tambah Uraian
          </button>
        </div>

        {kosongCount > 0 && (
          <p className="text-[11px] text-brass-600 mt-3">
            {kosongCount} soal masih kosong dan tidak akan ikut tercetak.
          </p>
        )}
      </div>

      <TombolOutput
        siap={siap}
        pesan="Isi Mata Pelajaran, Materi Pokok, dan minimal satu soal dulu."
        onWord={() =>
          unduhDocx(buatEvaluasiDocx(h.dokumenDasar(), data()), namaBerkas('Evaluasi', dasar.mapel, dasar.materi))
        }
        onPdf={() => cetakHtml(buatEvaluasiHtml(h.dokumenDasar(), data()), CSS_PERANGKAT, `Evaluasi ${dasar.mapel}`)}
        onKosongkan={() => confirm('Kosongkan isian Evaluasi?') && setX(AWAL)}
      />
    </div>
  )
}
