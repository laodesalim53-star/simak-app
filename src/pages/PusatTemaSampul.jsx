import React from 'react'
import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import Layout from '../components/Layout'
import { DAFTAR_TEMA_SAMPUL } from '../constants/daftarTemaSampul'

// Sub-komponen untuk kartu pilihan tema
function TemaCard({ item }) {
  const Icon = item.icon

  const content = (
    <>
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${
          item.siap ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'
        }`}
      >
        <Icon size={20} />
      </div>

      <h3 className={`text-sm font-semibold mb-1 ${item.siap ? 'text-slate-800' : 'text-slate-400'}`}>
        {item.judul}
      </h3>

      <p className={`text-xs leading-relaxed ${item.siap ? 'text-slate-500' : 'text-slate-400'}`}>
        {item.deskripsi}
      </p>

      {!item.siap && (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-full mt-3">
          <Lock size={10} /> Segera Hadir
        </span>
      )}
    </>
  )

  if (item.siap) {
    return (
      <Link
        to={item.path}
        className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between"
      >
        <div>{content}</div>
      </Link>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 opacity-70 cursor-not-allowed flex flex-col justify-between">
      <div>{content}</div>
    </div>
  )
}

export default function PusatTemaSampul() {
  return (
    <Layout
      title="Pusat Desain Sampul Laporan"
      subtitle="Pilih gaya atau tema sampul yang ingin dicetak. Tema akan menyesuaikan secara otomatis dengan data laporan yang Anda pilih."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {DAFTAR_TEMA_SAMPUL.map((tema) => (
          <TemaCard key={tema.id} item={tema} />
        ))}
      </div>
    </Layout>
  )
}
