import { X } from 'lucide-react'
import { isDocFile } from './rppStorage'

export default function PreviewModal({ url, fileName, onClose }) {
  if (!url) return null
  const isDoc = isDocFile(fileName)
  const viewerSrc = isDoc
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`
    : url

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-ink-900/[0.08]">
          <p className="text-sm font-medium text-ink-900 truncate pr-4">{fileName}</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ink-900/[0.05] shrink-0">
            <X size={18} />
          </button>
        </div>
        <iframe src={viewerSrc} title={fileName} className="flex-1 w-full" style={{ border: 'none' }} />
      </div>
    </div>
  )
}
