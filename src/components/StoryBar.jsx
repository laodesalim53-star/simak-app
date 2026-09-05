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
    return <div className="flex gap-3 p-3 overflow-x-auto">Memuat story...</div>
  }

  if (stories.length === 0) {
    return null
  }

  return (
    <>
      <div className="flex gap-4 p-3 overflow-x-auto bg-white border-b rounded-xl mb-6">
        {stories.map((story, index) => (
          <button
            key={story.id}
            onClick={() => setSelectedIndex(index)}
            className="flex flex-col items-center gap-1 flex-shrink-0"
          >
            <div className="w-16 h-16 rounded-full border-2 border-blue-500 p-0.5">
              <div className="w-full h-full rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                {story.media_url && story.media_type === 'image' ? (
                  <img src={story.media_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">
                    {story.author_role === 'guru' ? '👩‍🏫' : story.author_role === 'orang_tua' ? '👨‍👩‍👧' : '⭐'}
                  </span>
                )}
              </div>
            </div>
            <span className="text-xs w-16 truncate text-center">{story.author_name}</span>
            {story.visibility === 'publik' && (
              <span className="text-[10px] text-blue-500">🌐 Publik</span>
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
