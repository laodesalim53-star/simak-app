import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { buildAiRppDocxFile, downloadAiRppDocx } from '../../lib/generateAiRppDocx'
import { Loader2, X, Sparkles, Copy, Check, FileDown } from 'lucide-react'

// Modal Rekomendasi RPP berbasis AI — memanggil endpoint serverless
// `/api/generate-rpp` (Gemini). API key hanya ada di server (Vercel env var).
export default function AiRppModal({ isOpen, onClose, onApplyToForm, defaultNamaGuru, defaultNamaKepalaSekolah, tempatTtd }) {
  const [mataPelajaran, setMataPelajaran] = useState('')
  const [kelas, setKelas] = useState('')
  const [materi, setMateri] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const [generatingDocx, setGeneratingDocx] = useState(false)
  const [applyingToForm, setApplyingToForm] = useState(false)
  const [sertakanLampiran, setSertakanLampiran] = useState(true)
  const [namaGuruTtd, setNamaGuruTtd] = useState(defaultNamaGuru || '')
  const [namaKepsekTtd, setNamaKepsekTtd] = useState(defaultNamaKepalaSekolah || '')

  useEffect(() => {
    if (isOpen) {
      setNamaGuruTtd(defaultNamaGuru || '')
      setNamaKepsekTtd(defaultNamaKepalaSekolah || '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultNamaGuru, defaultNamaKepalaSekolah])

  if (!isOpen) return null

  async function handleGenerate(e) {
    e.preventDefault()
    setLoading(true)
    setResult('')
    setErrorMsg('')

    try {
      const { data: sesi } = await supabase.auth.getSession()
      const token = sesi?.session?.access_token

      const res = await fetch('/api/generate-rpp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        body: JSON.stringify({ mataPelajaran, kelas, materi, sertakanLampiran }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Gagal memproses permintaan AI.')
      setResult(data?.result || 'Gagal menghasilkan RPP.')
    } catch (err) {
      setErrorMsg('Gagal membuat rekomendasi RPP: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function buildKotaTanggal() {
    const tanggal = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    return tempatTtd ? `${tempatTtd}, ${tanggal}` : tanggal
  }

  function docxPayload() {
    return {
      mataPelajaran,
      kelas,
      materi,
      resultText: result,
      namaGuru: namaGuruTtd,
      namaKepalaSekolah: namaKepsekTtd,
      kotaTanggal: buildKotaTanggal(),
    }
  }

  async function handleDownloadDocx() {
    setGeneratingDocx(true)
    setErrorMsg('')
    try {
      await downloadAiRppDocx(docxPayload())
    } catch (err) {
      setErrorMsg('Gagal membuat file .docx: ' + err.message)
    }
    setGeneratingDocx(false)
  }

  async function handleUseResult() {
    setApplyingToForm(true)
    setErrorMsg('')
    try {
      const file = await buildAiRppDocxFile(docxPayload())
      onApplyToForm({
        judul: `RPP ${materi}`,
        mata_pelajaran: mataPelajaran,
        kelas: kelas,
        file,
      })
      onClose()
    } catch (err) {
      setErrorMsg('Gagal menyiapkan file untuk form upload: ' + err.message)
    }
    setApplyingToForm(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-900/[0.08] bg-slate-50">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-amber-500" />
            <h3 className="font-display font-semibold text-ink-900">Rekomendasi RPP (AI)</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/5 text-slate-500">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <form onSubmit={handleGenerate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className="input-field"
              placeholder="Mata Pelajaran (mis. Matematika)"
              value={mataPelajaran}
              onChange={(e) => setMataPelajaran(e.target.value)}
              required
            />
            <input
              className="input-field"
              placeholder="Kelas (mis. X / 10)"
              value={kelas}
              onChange={(e) => setKelas(e.target.value)}
            />
            <input
              className="input-field sm:col-span-2"
              placeholder="Materi / Topik Pembelajaran (mis. Persamaan Kuadrat)"
              value={materi}
              onChange={(e) => setMateri(e.target.value)}
              required
            />
            <label className="sm:col-span-2 flex items-start gap-2 text-xs text-slate-600 -mt-1">
              <input
                type="checkbox"
                checked={sertakanLampiran}
                onChange={(e) => setSertakanLampiran(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Sertakan lampiran lengkap (LKPD, Instrumen Penilaian, Bahan Ajar, Kisi-kisi & Soal Evaluasi) —
                digabung dalam satu file .docx dengan RPP-nya
              </span>
            </label>

            <div className="sm:col-span-2 rounded-lg border border-slate-200 p-3 space-y-2">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Nama untuk kolom tanda tangan
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  className="input-field !text-xs !py-1.5"
                  placeholder="Nama Guru"
                  value={namaGuruTtd}
                  onChange={(e) => setNamaGuruTtd(e.target.value)}
                />
                <input
                  className="input-field !text-xs !py-1.5"
                  placeholder="Nama Kepala Sekolah"
                  value={namaKepsekTtd}
                  onChange={(e) => setNamaKepsekTtd(e.target.value)}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Terisi otomatis dari data akun & Profil Sekolah — silakan ubah kalau perlu.
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="sm:col-span-2 py-2 px-4 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? 'Sedang Menyusun Rekomendasi...' : 'Generate Rekomendasi RPP'}
            </button>
          </form>

          {errorMsg && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
              {errorMsg}
            </div>
          )}

          {result && (
            <div className="mt-4 border border-slate-200 rounded-lg p-4 bg-slate-50 relative">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Hasil Rekomendasi
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-xs flex items-center gap-1 text-slate-600 hover:text-slate-900 bg-white border px-2 py-1 rounded"
                >
                  {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                  {copied ? 'Tersalin!' : 'Salin Teks'}
                </button>
              </div>
              <textarea
                readOnly
                value={result}
                className="w-full h-48 p-2 text-xs font-mono border rounded bg-white text-slate-800 focus:outline-none"
              />

              <button
                type="button"
                onClick={handleDownloadDocx}
                disabled={generatingDocx}
                className="mt-3 w-full py-2 bg-white border border-slate-300 text-slate-700 text-xs font-medium rounded hover:bg-slate-100 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {generatingDocx ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                {generatingDocx ? 'Menyiapkan file...' : 'Unduh sebagai .docx'}
              </button>

              <button
                type="button"
                onClick={handleUseResult}
                disabled={applyingToForm}
                className="mt-2 w-full py-2 bg-slate-900 text-white text-xs font-medium rounded hover:bg-slate-800 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {applyingToForm ? <Loader2 size={14} className="animate-spin" /> : null}
                {applyingToForm ? 'Menyiapkan file & mengisi form...' : 'Gunakan Data Ini di Form Upload'}
              </button>
              <p className="text-[11px] text-slate-400 mt-1.5 text-center">
                File .docx akan dibuat otomatis dan langsung mengisi kolom "Choose File" di form upload —
                tidak perlu copy-paste manual ke Word lagi.
                {sertakanLampiran && ' Lampiran (LKPD, dll.) ikut tergabung di halaman berikutnya dalam file yang sama.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
