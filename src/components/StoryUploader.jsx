import { useState } from 'react'
import { createStory } from '../lib/storyApi'
import { useAuth } from '../lib/AuthContext'

export default function StoryUploader({ onPosted }) {
  const { profil, sekolahId, isSuperAdmin } = useAuth()
  const [content, setContent] = useState('')
  const [file, setFile] = useState(null)
  const [visibility, setVisibility] = useState('sekolah')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState(null)

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
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="text-sm"
      />
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
        disabled={posting || (!content && !file)}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
      >
        {posting ? 'Mengunggah...' : 'Bagikan Story'}
      </button>
    </form>
  )
}
