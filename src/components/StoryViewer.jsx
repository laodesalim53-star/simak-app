import { useState, useEffect, useRef, useCallback } from 'react'
import { Heart } from 'lucide-react'
import { getLikesForStory, toggleLike } from '../lib/storyApi'
import { useAuth } from '../lib/AuthContext'

export default function StoryViewer({ stories, initialIndex, onClose }) {
  const { session } = useAuth()
  const [index, setIndex] = useState(initialIndex)
  const [progress, setProgress] = useState(0)
  const [likeCount, setLikeCount] = useState(0)
  const [likedByMe, setLikedByMe] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)
  const timerRef = useRef(null)

  const story = stories[index]
  const DURATION = 5000
  const userId = session?.user?.id

  const goNext = useCallback(() => {
    if (index < stories.length - 1) {
      setIndex((i) => i + 1)
    } else {
      onClose()
    }
  }, [index, stories.length, onClose])

  function goPrev() {
    if (index > 0) setIndex(index - 1)
  }

  // Progress bar otomatis jalan ke story berikutnya
  useEffect(() => {
    setProgress(0)
    const startTime = Date.now()

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const pct = Math.min((elapsed / DURATION) * 100, 100)
      setProgress(pct)

      if (pct >= 100) {
        clearInterval(timerRef.current)
        goNext()
      }
    }, 50)

    return () => clearInterval(timerRef.current)
  }, [index, goNext])

  // Ambil status like setiap kali pindah story
  useEffect(() => {
    let active = true
    if (!story?.id || !userId) return

    getLikesForStory(story.id, userId)
      .then(({ count, likedByMe }) => {
        if (!active) return
        setLikeCount(count)
        setLikedByMe(likedByMe)
      })
      .catch((err) => console.error('Gagal memuat like:', err))

    return () => {
      active = false
    }
  }, [story?.id, userId])

  async function handleToggleLike() {
    if (!userId || likeLoading) return
    setLikeLoading(true)

    // Update optimis di UI dulu supaya terasa responsif
    const nextLiked = !likedByMe
    setLikedByMe(nextLiked)
    setLikeCount((c) => (nextLiked ? c + 1 : Math.max(0, c - 1)))

    try {
      await toggleLike(story.id, userId, likedByMe)
    } catch (err) {
      // Kalau gagal, kembalikan seperti semula
      setLikedByMe(likedByMe)
      setLikeCount((c) => (nextLiked ? Math.max(0, c - 1) : c + 1))
      console.error('Gagal mengubah like:', err)
    } finally {
      setLikeLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <div className="absolute top-2 left-2 right-2 flex gap-1">
        {stories.map((_, i) => (
          <div key={i} className="flex-1 h-1 bg-gray-600 rounded overflow-hidden">
            <div
              className="h-full bg-white transition-all"
              style={{ width: i < index ? '100%' : i === index ? `${progress}%` : '0%' }}
            />
          </div>
        ))}
      </div>

      <button
        onClick={onClose}
        className="absolute top-6 right-4 text-white text-2xl z-10"
      >
        ✕
      </button>

      <div className="absolute top-6 left-4 text-white">
        <p className="font-semibold">{story.author_name}</p>
        <p className="text-xs opacity-75">
          {story.author_role === 'guru' ? 'Guru' : story.author_role === 'orang_tua' ? 'Orang Tua' : 'Admin'}
          {story.visibility === 'publik' && ' • 🌐 Publik'}
        </p>
      </div>

      <div className="w-full h-full max-w-md flex items-center justify-center">
        {story.media_url ? (
          story.media_type === 'video' ? (
            <video src={story.media_url} autoPlay className="max-h-full max-w-full" />
          ) : (
            <img src={story.media_url} alt="" className="max-h-full max-w-full object-contain" />
          )
        ) : (
          <p className="text-white text-xl text-center p-8">{story.content}</p>
        )}
      </div>

      {story.media_url && story.content && (
        <div className="absolute bottom-20 left-4 right-4 text-white text-center bg-black/40 p-2 rounded">
          {story.content}
        </div>
      )}

      {/* Tombol Like */}
      <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-2 z-10">
        <button
          onClick={handleToggleLike}
          disabled={likeLoading}
          className="flex items-center gap-2 bg-black/40 hover:bg-black/60 transition-colors px-4 py-2 rounded-full disabled:opacity-60"
        >
          <Heart
            size={22}
            className={likedByMe ? 'fill-red-500 text-red-500' : 'text-white'}
          />
          <span className="text-white text-sm font-medium">{likeCount}</span>
        </button>
      </div>

      <button onClick={goPrev} className="absolute left-0 top-0 w-1/3 h-full" />
      <button onClick={goNext} className="absolute right-0 top-0 w-1/3 h-full" />
    </div>
  )
}
