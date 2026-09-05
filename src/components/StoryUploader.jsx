import { useState } from 'react'
import { createStory } from '../lib/storyApi'
import { useAuth } from '../lib/AuthContext'

const MAX_VIDEO_DURATION = 30 // detik
const MAX_VIDEO_SIZE_MB = 25

function getVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)
      resolve(video.duration)
    }
    video.onerror = () => reject(new Error('Gagal membaca video'))
    video.src = URL.createObjectURL(file)
  })
}

export default function StoryUploader({ onPosted }) {
  const { profil, sekolahId, isSuperAdmin } = useAuth()
  const [content, setContent] = useState('')
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [visibility, setVisibility] = useState('sekolah')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState(null)
  const [checkingVideo, setCheckingVideo] = useState(false)

  async function handleFileChange(e) {
    const selected = e.target.files?.[0]
    setError(null)
    if (!selected) {
      setFile(null)
      setPreviewUrl(null)
      return
    }

    if (selected.type.startsWith('video')) {
      if (selected.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
        setError(`Video maksimal ${MAX_VIDEO_SIZE_MB}MB.`)
        e.target.value = ''
        return
      }

      setCheckingVideo(true)
      try {
        const duration = await getVideoDuration(selected)
        if (duration > MAX_VIDEO_DURATION) {
          setError(`Video maksimal ${MAX_VIDEO_DURATION} detik. Video ini ${Math.round(duration)} detik.`)
          e.target.value = ''
          setCheckingVideo(false)
          return
        }
      } catch {
        setError('Video tidak valid atau rusak.')
        e.target.value = ''
        setCheckingVideo(false)
        return
      }
      setCheckingVideo(false)
    }

    setFile(selected)
    setPreviewUrl(URL.createObjectURL(selected))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setPosting(true)
    setError(null)

    try {
      await createStory({
        content,
        file,
        visibility,
        authorName: profil?.nama_lengkap || 'Pengguna',
        authorRole: profil?.role || 'guru',
        sekolahId: isSuperAdmin ? null : sekolahId,
      })

      setContent('')
      setFile(null)
      setPreviewUrl(null)
      onPosted?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setPosting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 space-y-3 mb-6">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Apa yang ingin dibagikan?"
        className="w-full border rounded-lg p-2 text-sm"
        rows={3}
      />

      <input
        type="file"
        accept="image/*,video/*"
        onChange={handleFileChange}
        className="text-sm"
      />

      {checkingVideo && (
        <p className="text-xs text-slate-500">Memeriksa video...</p>
      )}

      {previewUrl && file?.type.startsWith('video') && (
        <video src={previewUrl} controls className="max-h-48 rounded-lg" />
      )}
      {previewUrl && file?.type.startsWith('image') && (
        <img src={previewUrl} alt="preview" className="max-h-48 rounded-lg object-contain" />
      )}

      <p className="text-xs text-slate-400">
        Video maksimal {MAX_VIDEO_DURATION} detik, ukuran maksimal {MAX_VIDEO_SIZE_MB}MB.
      </p>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Bagikan ke:</label>
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
          className="border rounded-lg px-2 py-1 text-sm"
        >
          <option value="sekolah">Sekolah saya saja</option>
          <option value="publik">Semua pengguna</option>
        </select>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={posting || checkingVideo || (!content && !file)}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
      >
        {posting ? 'Mengunggah...' : 'Bagikan Story'}
      </button>
    </form>
  )
}
