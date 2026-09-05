import { supabase } from './supabaseClient'

export async function uploadStoryMedia(file) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${crypto.randomUUID()}.${fileExt}`

  const { error } = await supabase.storage
    .from('story-media')
    .upload(fileName, file)

  if (error) throw error

  const { data } = supabase.storage
    .from('story-media')
    .getPublicUrl(fileName)

  return data.publicUrl
}

export async function createStory({ content, file, visibility, authorName, authorRole, sekolahId }) {
  let mediaUrl = null
  let mediaType = null

  if (file) {
    mediaUrl = await uploadStoryMedia(file)
    mediaType = file.type.startsWith('video') ? 'video' : 'image'
  }

  const { data, error } = await supabase
    .from('stories')
    .insert({
      content,
      media_url: mediaUrl,
      media_type: mediaType,
      visibility,
      author_name: authorName,
      author_role: authorRole,
      sekolah_id: sekolahId,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getStories() {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getLikesForStory(storyId, userId) {
  const { data, error } = await supabase
    .from('story_likes')
    .select('user_id')
    .eq('story_id', storyId)

  if (error) throw error

  return {
    count: data.length,
    likedByMe: data.some((l) => l.user_id === userId),
  }
}

export async function toggleLike(storyId, userId, currentlyLiked) {
  if (currentlyLiked) {
    const { error } = await supabase
      .from('story_likes')
      .delete()
      .eq('story_id', storyId)
      .eq('user_id', userId)

    if (error) throw error
  } else {
    const { error } = await supabase
      .from('story_likes')
      .insert({ story_id: storyId, user_id: userId })

    if (error) throw error
  }
}
