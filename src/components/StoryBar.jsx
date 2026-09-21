import { useEffect, useState } from 'react'
import { getStories } from '../lib/storyApi'
import StoryViewer from './StoryViewer'

export default function StoryBar() {
  const [stories, setStories] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStories()
  }, [])

  async function loadStories() {
    setLoading(true)
    try {
      const data = await getStories()
      setStories(data)
    } catch (err) {
      console.error('Gagal memuat story:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex gap-3 px-3 py-2 overflow-x-auto text-xs text-slate-400">Memuat story...</div>
  }

  if (stories.length === 0) {
    return null
  }

  // PERBAIKAN TAMPILAN: sebelumnya avatar story 64x64 (w-16 h-16) dengan
  // padding tebal, sehingga terasa lebih "berat" secara visual daripada
  // kartu statistik sekolah di bawahnya — padahal statistik sekolah
  // biasanya lebih penting dilihat duluan. Sekarang avatar diperkecil ke
  // 48x48 (w-12 h-12), padding & border tipis, jadi strip ringkas yang
  // tidak mendominasi bagian atas dasbor.
  return (
    <>
      <div className="flex gap-3 px-3 py-2.5 overflow-x-auto bg-white border border-slate-100 rounded-xl mb-6">
        {stories.map((story, index) => (
          <button
            key={story.id}
            onClick={() => setSelectedIndex(index)}
            className="flex flex-col items-center gap-1 flex-shrink-0"
          >
            <div className="w-12 h-12 rounded-full border-2 border-amber-400 p-0.5">
              <div className="w-full h-full rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                {story.media_url && story.media_type === 'image' ? (
                  <img src={story.media_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-base">
                    {story.author_role === 'guru' ? '👩‍🏫' : story.author_role === 'orang_tua' ? '👨‍👩‍👧' : '⭐'}
                  </span>
                )}
              </div>
            </div>
            <span className="text-[10px] w-14 truncate text-center text-slate-500">{story.author_name}</span>
            {story.visibility === 'publik' && (
              <span className="text-[9px] text-blue-500">🌐 Publik</span>
            )}
          </button>
        ))}
      </div>

      {selectedIndex !== null && (
        <StoryViewer
          stories={stories}
          initialIndex={selectedIndex}
          onClose={() => setSelectedIndex(null)}
        />
      )}
    </>
  )
}
