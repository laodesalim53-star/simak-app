import { useState, useEffect, useRef } from 'react'

export default function StoryViewer({ stories, initialIndex, onClose }) {
  const [index, setIndex] = useState(initialIndex)
  const [progress, setProgress] = useState(0)
  const timerRef = useRef(null)

  const story = stories[index]
  const DURATION = 5000

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  function goNext() {
    if (index < stories.length - 1) {
      setIndex(index + 1)
    } else {
      onClose()
    }
  }

  function goPrev() {
    if (index > 0) setIndex(index - 1)
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
        <div className="absolute bottom-8 left-4 right-4 text-white text-center bg-black/40 p-2 rounded">
          {story.content}
        </div>
      )}

      <button onClick={goPrev} className="absolute left-0 top-0 w-1/3 h-full" />
      <button onClick={goNext} className="absolute right-0 top-0 w-1/3 h-full" />
    </div>
  )
}
