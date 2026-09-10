import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, ArrowRight, Palette, Sparkles, ExternalLink } from 'lucide-react'
import { DAFTAR_TEMA_SAMPUL } from '../constants/daftarTemaSampul'

export default function PusatTemaSampul() {
  const [filter, setFilter] = useState('semua')

  const temaTersaring = DAFTAR_TEMA_SAMPUL.filter((tema) => {
    if (filter === 'siap') return tema.siap
    if (filter === 'mendatang') return !tema.siap
    return true
  })

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 rounded-2xl text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm mb-1">
            <Sparkles size={16} />
            <span>Koleksi Desain Sampul</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display">Pusat Tema Sampul</h1>
          <p className="text-blue-200 text-sm mt-1 max-w-xl">
            Pilih dan gunakan berbagai tema desain untuk cetak sampul rapor, ijazah, dan dokumen resmi sekolah.
          </p>
        </div>
        <Link
          to="/cetak-sampul"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm rounded-xl transition-all shadow-md shrink-0"
        >
          <Palette size={18} />
          <span>Ke Cetak Sampul</span>
        </Link>
      </div>

      {/* Filter Tab */}
      <div className="flex gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setFilter('semua')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            filter === 'semua' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Semua Tema ({DAFTAR_TEMA_SAMPUL.length})
        </button>
        <button
          onClick={() => setFilter('siap')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            filter === 'siap' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Siap Pakai ({DAFTAR_TEMA_SAMPUL.filter((t) => t.siap).length})
        </button>
        <button
          onClick={() => setFilter('mendatang')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            filter === 'mendatang' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Segera Hadir ({DAFTAR_TEMA_SAMPUL.filter((t) => !t.siap).length})
        </button>
      </div>

      {/* Grid Tema */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {temaTersaring.map((tema) => {
          const IconComponent = tema.icon || Palette
          return (
            <div
              key={tema.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden"
            >
              <div className="p-5 flex-1 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <IconComponent size={22} />
                  </div>
                  {tema.siap ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 size={13} />
                      Siap Pakai
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      Segera Hadir
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{tema.judul}</h3>
                  <p className="text-slate-600 text-xs sm:text-sm mt-1 leading-relaxed">{tema.deskripsi}</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 mt-auto">
                {tema.siap ? (
                  <Link
                    to={tema.path}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    <span>Gunakan Tema Ini</span>
                    <ArrowRight size={16} />
                  </Link>
                ) : (
                  <button
                    disabled
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-200 text-slate-400 text-sm font-semibold rounded-xl cursor-not-allowed"
                  >
                    <span>Dalam Pengembangan</span>
                    <ExternalLink size={16} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
