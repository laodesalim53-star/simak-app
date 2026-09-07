import { Eye, FileText } from 'lucide-react'

export default function TemplateCard({
  template,
  onPreview,
  onUse,
}) {
  return (
    <div className="card relative overflow-hidden p-0 hover:shadow-lg transition duration-300">
      <span className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-900 to-brass-400 z-10" />
      <img
        src={template.thumbnail}
        alt={template.judul}
        className="w-full h-48 object-cover"
      />
      <div className="p-4">
        <h2 className="font-display font-semibold text-lg text-ink-950">
          {template.judul}
        </h2>
        <p className="text-sm text-ink-700/60 mt-1">
          {template.mapel}
        </p>
        <div className="flex gap-2 mt-3 flex-wrap">
          <span className="bg-blue-900/10 text-blue-900 px-2 py-1 rounded-full text-xs font-semibold">
            Kelas {template.kelas}
          </span>
          <span className="bg-sage-500/10 text-sage-600 px-2 py-1 rounded-full text-xs font-semibold">
            Fase {template.fase}
          </span>
          <span className="bg-brass-400/10 text-brass-600 px-2 py-1 rounded-full text-xs font-semibold">
            {template.jenis}
          </span>
        </div>
        <p className="text-sm text-ink-700/60 mt-4 line-clamp-3">
          {template.deskripsi}
        </p>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onPreview}
            className="flex-1 flex items-center justify-center gap-2 bg-brass-400 hover:bg-brass-400/90 text-ink-950 text-sm font-medium py-2 rounded-lg transition"
          >
            <Eye size={16} /> Preview
          </button>
          <button
            onClick={() => onUse && onUse(template)}
            className="flex-1 flex items-center justify-center gap-2 border border-ink-950/10 hover:bg-ink-900/[0.04] text-ink-950 text-sm font-medium py-2 rounded-lg transition"
          >
            <FileText size={16} /> Gunakan
          </button>
        </div>
      </div>
    </div>
  )
}
