import { Plus, Trash2, Sparkles } from 'lucide-react'
import {
  buatKisiDocx,
  buatKisiHtml,
  CSS_LANDSCAPE,
  hitungNomor,
  totalSoal,
  baris,
  tanpaNomor,
} from '../../lib/dokumenPerangkat'
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

// Tab Kisi-Kisi Soal.
// Letakkan di: src/components/rpp/KisiTab.jsx

const JENIS = [
  'Penilaian Harian',
  'Penilaian Tengah Semester',
  'Penilaian Akhir Semester',
  'Penilaian Akhir Tahun',
  'Asesmen Sumatif',
]

const LEVEL = [
  { v: 'L1', t: 'L1 - Pengetahuan & pemahaman' },
  { v: 'L2', t: 'L2 - Aplikasi' },
  { v: 'L3', t: 'L3 - Penalaran' },
]

const BENTUK = ['Pilihan Ganda', 'Uraian', 'Isian Singkat', 'Benar / Salah', 'Menjodohkan']

const barisBaru = () => ({ tp: '', materi: '', indikator: '', level: 'L1', bentuk: 'Pilihan Ganda', jml: '1' })

const AWAL = { jenis: 'Penilaian Harian', alokasi: '', rows: [barisBaru()] }

const huruf = (s) => s.charAt(0).toLowerCase() + s.slice(1)

const indikatorDari = (t) => {
  const inti = t
    .replace(/^peserta didik\s+(mampu|dapat)\s+/i, '')
    .replace(/^(mampu|dapat)\s+/i, '')
    .trim()
  return `Disajikan soal, peserta didik dapat ${huruf(inti)}`
}

export default function KisiTab() {
  const h = useDasar()
  const { dasar } = h
  const [x, setX] = useDraft('simak_draft_kisi', AWAL)

  const m = dasar.materi.trim() || 'materi pembelajaran'
  const nomor = hitungNomor(x.rows)
  const total = totalSoal(x.rows)
  const siap =
    dasar.mapel.trim() && dasar.materi.trim() && x.rows.some((r) => !kosong(r.tp) || !kosong(r.indikator))

  const ubahBaris = (i, patch) =>
    setX((p) => ({ ...p, rows: p.rows.map((r, n) => (n === i ? { ...r, ...patch } : r)) }))

  const tambah = () => setX((p) => ({ ...p, rows: [...p.rows, barisBaru()] }))

  const hapus = (i) =>
    setX((p) => ({
      ...p,
      rows: p.rows.length > 1 ? p.rows.filter((_, n) => n !== i) : [barisBaru()],
    }))

  // Isi otomatis dari Tujuan Pembelajaran. Baris yang sudah Anda isi tidak ditimpa.
  function isiOtomatis() {
    const tujuan = baris(dasar.tujuan).map(tanpaNomor)
    const daftar = tujuan.length ? tujuan : [`Memahami ${m}`]
    setX((p) => {
      const ada = p.rows.filter((r) => !kosong(r.tp) || !kosong(r.indikator) || !kosong(r.materi))
      const sudah = new Set(ada.map((r) => r.tp.trim()))
      const baru = daftar
        .filter((t) => !sudah.has(t.trim()))
        .map((t) => ({
          tp: t,
          materi: m,
          indikator: indikatorDari(t),
          level: 'L1',
          bentuk: 'Pilihan Ganda',
          jml: '2',
        }))
      const rows = [...ada, ...baru]
      return {
        ...p,
        alokasi: kosong(p.alokasi) ? '60 menit' : p.alokasi,
        rows: rows.length ? rows : [barisBaru()],
      }
    })
  }

  const data = () => x

  return (
    <div className="space-y-6">
      <IdentitasDasar h={h} />

      <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-700/70 max-w-xl">
          Klik <strong>Isi Otomatis</strong> untuk membuat baris dari Tujuan Pembelajaran (di Identitas Dokumen).
          Baris yang sudah Anda tulis tidak ditimpa. Nomor soal dihitung otomatis dari jumlah soal tiap baris.
        </p>
        <button type="button" onClick={isiOtomatis} disabled={!siap && !dasar.materi.trim()} className="btn-primary shrink-0 disabled:opacity-50">
          <Sparkles size={16} /> Isi Otomatis
        </button>
      </div>

      <div className="card p-6">
        <h3 className="font-display text-lg font-semibold mb-3">Informasi Asesmen</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field
            label="Jenis Asesmen"
            rekom={<Rekom opsi={JENIS} onPilih={(o) => setX((p) => ({ ...p, jenis: o }))} teks="Pilih jenis" />}
          >
            <input
              className="input-field"
              value={x.jenis}
              onChange={(e) => setX((p) => ({ ...p, jenis: e.target.value }))}
            />
          </Field>
          <Field label="Alokasi Waktu">
            <input
              className="input-field"
              placeholder="mis. 60 menit"
              value={x.alokasi}
              onChange={(e) => setX((p) => ({ ...p, alokasi: e.target.value }))}
            />
          </Field>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="font-display text-lg font-semibold">Baris Kisi-Kisi</h3>
          <span className="text-xs text-ink-700/60">Total soal: {total}</span>
        </div>

        <div className="space-y-4">
          {x.rows.map((r, i) => (
            <div key={i} className="rounded-xl border border-ink-900/[0.08] p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-semibold text-ink-700">
                  Baris {i + 1} <span className="font-normal text-ink-700/50">· No. soal: {nomor[i]}</span>
                </span>
                <button
                  type="button"
                  onClick={() => hapus(i)}
                  className="text-ink-700/40 hover:text-red-600 p-1"
                  title="Hapus baris"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Tujuan Pembelajaran" full>
                  <textarea
                    className="input-field"
                    rows={2}
                    value={r.tp}
                    onChange={(e) => ubahBaris(i, { tp: e.target.value })}
                  />
                </Field>
                <Field label="Materi">
                  <input
                    className="input-field"
                    value={r.materi}
                    onChange={(e) => ubahBaris(i, { materi: e.target.value })}
                  />
                </Field>
                <Field label="Jumlah Soal">
                  <input
                    className="input-field"
                    type="number"
                    min="0"
                    value={r.jml}
                    onChange={(e) => ubahBaris(i, { jml: e.target.value })}
                  />
                </Field>
                <Field label="Indikator Soal" full>
                  <textarea
                    className="input-field"
                    rows={2}
                    value={r.indikator}
                    onChange={(e) => ubahBaris(i, { indikator: e.target.value })}
                  />
                </Field>
                <Field label="Level Kognitif">
                  <select
                    className="input-field"
                    value={r.level}
                    onChange={(e) => ubahBaris(i, { level: e.target.value })}
                  >
                    {LEVEL.map((l) => (
                      <option key={l.v} value={l.v}>
                        {l.t}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Bentuk Soal">
                  <select
                    className="input-field"
                    value={r.bentuk}
                    onChange={(e) => ubahBaris(i, { bentuk: e.target.value })}
                  >
                    {BENTUK.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={tambah}
          className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-ink-700 bg-ink-900/[0.05]"
        >
          <Plus size={16} /> Tambah Baris
        </button>
      </div>

      <TombolOutput
        siap={siap}
        pesan="Isi Mata Pelajaran, Materi Pokok, dan minimal satu baris kisi-kisi dulu."
        onWord={() =>
          unduhDocx(buatKisiDocx(h.dokumenDasar(), data()), namaBerkas('Kisi-Kisi', dasar.mapel, dasar.materi))
        }
        onPdf={() => cetakHtml(buatKisiHtml(h.dokumenDasar(), data()), CSS_LANDSCAPE, `Kisi-Kisi ${dasar.mapel}`)}
        onKosongkan={() => confirm('Kosongkan isian Kisi-Kisi?') && setX({ ...AWAL, rows: [barisBaru()] })}
      />
    </div>
  )
}
