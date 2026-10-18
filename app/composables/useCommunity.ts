import type { Database, Json } from '~/types/database'

export interface CommunityTopic {
  id: string
  branch_id: string
  organization_id: string
  title: { ar: string; en: string }
  content: { ar: string; en: string }
  is_public_to_hub: boolean
  is_premium: boolean
  sort_order: number
  created_at: string
  metadata?: {
    is_pinned?: boolean
    is_locked?: boolean
    author_id?: string
    author_name?: string
    likes_count?: number
    replies_count?: number
  }
}

export interface CommunityComment {
  id: string
  topic_id: string
  author_id: string
  author_name: string
  content: string
  created_at: string
  likes: number
}

export const useCommunity = () => {
  const supabase = useSupabaseClient<Database>()
  const { profile, isOwner, isManager, isSuperAdmin } = useUser()

  const loading = ref(false)
  const error = ref<string | null>(null)

  const canModerate = computed(() => {
    return isOwner.value || isManager.value || isSuperAdmin.value
  })

  // Fetch topics for a specific circle/branch
  const fetchTopics = async (branchId: string): Promise<CommunityTopic[]> => {
    loading.value = true
    error.value = null
    try {
      const { data, error: err } = await supabase
        .from('entities')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false })

      if (err) throw err

      return ((data || []) as unknown as any[]).map((e) => {
        const rawContent = e.content as Record<string, any>
        return {
          id: e.id,
          branch_id: e.branch_id,
          organization_id: e.organization_id,
          title: (typeof e.title === 'object' && e.title !== null) ? e.title : { ar: String(e.title || ''), en: String(e.title || '') },
          content: rawContent?.body ? rawContent.body : ((typeof e.content === 'object' && e.content !== null) ? e.content : { ar: String(e.content || ''), en: '' }),
          is_public_to_hub: e.is_public_to_hub,
          is_premium: e.is_premium,
          sort_order: e.sort_order || 0,
          created_at: e.created_at,
          metadata: {
            is_pinned: rawContent?.is_pinned || false,
            is_locked: rawContent?.is_locked || false,
            author_id: rawContent?.author_id || '',
            author_name: rawContent?.author_name || 'عضو في الحلقة',
            likes_count: rawContent?.likes_count || 0,
            replies_count: rawContent?.comments?.length || 0,
          },
        }
      })
    } catch (e: any) {
      error.value = e.message
      return []
    } finally {
      loading.value = false
    }
  }

  // Create a new topic with Rich Text
  const createTopic = async (payload: {
    branchId: string
    organizationId: string
    title: { ar: string; en: string }
    contentHtml: string
  }) => {
    loading.value = true
    error.value = null
    try {
      const topicContent: Json = {
        body: { ar: payload.contentHtml, en: '' },
        is_pinned: false,
        is_locked: false,
        author_id: profile.value?.id || '',
        author_name: (profile.value?.full_name as any)?.ar || (profile.value?.full_name as any)?.en || 'عضو الحلقة',
        likes_count: 0,
        comments: [],
      }

      const { data, error: err } = await supabase
        .from('entities')
        .insert({
          branch_id: payload.branchId,
          organization_id: payload.organizationId,
          title: payload.title as unknown as Json,
          content: topicContent,
          is_public_to_hub: false,
          is_premium: false,
        } as any)
        .select()
        .single()

      if (err) throw err
      return data
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  // Add comment to topic
  const addComment = async (topicId: string, commentHtml: string) => {
    loading.value = true
    error.value = null
    try {
      const { data: topic, error: fetchErr } = await supabase
        .from('entities')
        .select('*')
        .eq('id', topicId)
        .single()

      if (fetchErr) throw fetchErr

      const contentObj = (topic.content as Record<string, any>) || {}
      const existingComments = Array.isArray(contentObj.comments) ? contentObj.comments : []

      const newComment: CommunityComment = {
        id: crypto.randomUUID(),
        topic_id: topicId,
        author_id: profile.value?.id || '',
        author_name: (profile.value?.full_name as any)?.ar || (profile.value?.full_name as any)?.en || 'عضو الحلقة',
        content: commentHtml,
        created_at: new Date().toISOString(),
        likes: 0,
      }

      existingComments.push(newComment)
      contentObj.comments = existingComments

      const { error: updateErr } = await supabase
        .from('entities')
        .update({ content: contentObj as Json })
        .eq('id', topicId)

      if (updateErr) throw updateErr
      return newComment
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  // Moderate topic (pin/unpin, lock/unlock, delete)
  const togglePin = async (topicId: string, currentPinned: boolean) => {
    const { data: topic } = await supabase.from('entities').select('content').eq('id', topicId).single()
    if (!topic) return
    const content = (topic.content as Record<string, any>) || {}
    content.is_pinned = !currentPinned
    await supabase.from('entities').update({ content: content as Json }).eq('id', topicId)
  }

  const toggleLock = async (topicId: string, currentLocked: boolean) => {
    const { data: topic } = await supabase.from('entities').select('content').eq('id', topicId).single()
    if (!topic) return
    const content = (topic.content as Record<string, any>) || {}
    content.is_locked = !currentLocked
    await supabase.from('entities').update({ content: content as Json }).eq('id', topicId)
  }

  const deleteTopic = async (topicId: string) => {
    const { error: delErr } = await supabase.from('entities').delete().eq('id', topicId)
    if (delErr) throw delErr
  }

  const deleteComment = async (topicId: string, commentId: string) => {
    const { data: topic } = await supabase.from('entities').select('content').eq('id', topicId).single()
    if (!topic) return
    const content = (topic.content as Record<string, any>) || {}
    if (Array.isArray(content.comments)) {
      content.comments = content.comments.filter((c: any) => c.id !== commentId)
      await supabase.from('entities').update({ content: content as Json }).eq('id', topicId)
    }
  }

  return {
    loading,
    error,
    canModerate,
    fetchTopics,
    createTopic,
    addComment,
    togglePin,
    toggleLock,
    deleteTopic,
    deleteComment,
  }
}
