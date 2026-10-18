<script setup lang="ts">
import type { Database } from '~/types/database'
import type { CommunityTopic, CommunityComment } from '~/composables/useCommunity'

definePageMeta({
  layout: 'dashboard',
  middleware: 'dashboard-auth',
  title: 'Topic Discussion',
})

const route = useRoute()
const topicId = computed(() => route.params.id as string)
const { t, locale } = useI18n()
const localePath = useLocalePath()
const supabase = useSupabaseClient<Database>()
const { profile, isOwner, isManager, isSuperAdmin } = useUser()
const { addComment, deleteComment, togglePin, toggleLock, deleteTopic, canModerate } = useCommunity()

const topic = ref<CommunityTopic | null>(null)
const comments = ref<CommunityComment[]>([])
const loading = ref(true)
const commentText = ref('')
const submittingComment = ref(false)
const error = ref('')
const success = ref('')

async function loadTopicDetails() {
  if (!topicId.value) return
  loading.value = true
  try {
    const { data: e, error: err } = await supabase
      .from('entities')
      .select('*')
      .eq('id', topicId.value)
      .single()

    if (err) throw err

    const rawContent = (e.content as Record<string, any>) || {}
    topic.value = {
      id: e.id,
      branch_id: e.branch_id,
      organization_id: e.organization_id,
      title: (typeof e.title === 'object' && e.title !== null) ? (e.title as any) : { ar: String(e.title || ''), en: String(e.title || '') },
      content: rawContent?.body ? rawContent.body : ((typeof e.content === 'object' && e.content !== null) ? (e.content as any) : { ar: String(e.content || ''), en: '' }),
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

    // Load comments from dedicated community_comments table (Migration 00024)
    const dbComments = await fetchComments(topicId.value)
    if (dbComments && dbComments.length > 0) {
      comments.value = dbComments
    } else {
      comments.value = Array.isArray(rawContent.comments) ? rawContent.comments : []
    }
  } catch (err: any) {
    error.value = err.message || 'تعذر تحميل بيانات الموضوع'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadTopicDetails()
})

async function onAddComment() {
  if (!commentText.value.trim() || !topic.value) return
  if (topic.value.metadata?.is_locked && !canModerate.value) {
    error.value = 'هذا الموضوع مغلق ولا يمكن إضافة ردود جديدة إليه'
    return
  }

  submittingComment.value = true
  error.value = ''
  try {
    const newC = await addComment({
      entityId: topic.value.id,
      organizationId: topic.value.organization_id,
      content: commentText.value.trim(),
    })
    comments.value.push(newC)
    commentText.value = ''
    success.value = t('community.comment_added_success') || 'تم إضافة الرد بنجاح'
  } catch (err: any) {
    error.value = err.message || 'فشل إرسال الرد'
  } finally {
    submittingComment.value = false
  }
}

async function onDeleteComment(commentId: string) {
  if (!topic.value) return
  if (confirm(t('community.confirm_delete_comment') || 'هل أنت متأكد من حذف هذا التعليق؟')) {
    await deleteComment(topic.value.id, commentId)
    comments.value = comments.value.filter((c) => c.id !== commentId)
  }
}

async function onTogglePin() {
  if (!topic.value) return
  await togglePin(topic.value.id, !!topic.value.metadata?.is_pinned)
  await loadTopicDetails()
}

async function onToggleLock() {
  if (!topic.value) return
  await toggleLock(topic.value.id, !!topic.value.metadata?.is_locked)
  await loadTopicDetails()
}

async function onDeleteTopic() {
  if (!topic.value) return
  if (confirm(t('community.confirm_delete_topic') || 'هل أنت متأكد من حذف الموضوع؟')) {
    await deleteTopic(topic.value.id)
    navigateTo(localePath('/dashboard/community'))
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6 pb-16">
    <!-- Back Navigation -->
    <div>
      <NuxtLink
        :to="localePath('/dashboard/community')"
        class="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-gold transition-colors"
      >
        <span>&rarr;</span>
        <span>{{ $t('community.all_topics') }}</span>
      </NuxtLink>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-20 text-gray-400">
      <div class="animate-spin w-8 h-8 border-2 border-gold border-t-transparent rounded-full mx-auto mb-3" />
      <span class="text-sm">جارٍ تحميل الموضوع والمشاركات...</span>
    </div>

    <div v-else-if="topic" class="space-y-6">
      <!-- Main Topic Header & Content Card -->
      <div class="glass rounded-3xl p-6 md:p-8 border border-white/10 space-y-6">
        <div class="flex items-start justify-between gap-4">
          <div class="space-y-2">
            <div class="flex items-center gap-2 flex-wrap">
              <span v-if="topic.metadata?.is_pinned" class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gold/20 text-gold border border-gold/30">
                📌 {{ $t('community.pinned') }}
              </span>
              <span v-if="topic.metadata?.is_locked" class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                🔒 {{ $t('community.locked') }}
              </span>
              <h1 class="text-2xl font-bold text-white">
                {{ topic.title?.ar || topic.title?.en }}
              </h1>
            </div>

            <p class="text-xs text-gray-400 flex items-center gap-3">
              <span>✍️ {{ topic.metadata?.author_name || 'عضو' }}</span>
              <span>•</span>
              <span>🕒 {{ new Date(topic.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}</span>
            </p>
          </div>

          <!-- Moderation Actions -->
          <div v-if="canModerate" class="flex items-center gap-2 shrink-0 bg-white/5 p-1.5 rounded-xl">
            <button
              @click="onTogglePin"
              :title="topic.metadata?.is_pinned ? $t('community.unpin_topic') : $t('community.pin_topic')"
              class="p-2 rounded-lg text-gray-400 hover:text-gold hover:bg-white/10 transition-colors text-sm"
            >
              📌
            </button>
            <button
              @click="onToggleLock"
              :title="topic.metadata?.is_locked ? $t('community.unlock_topic') : $t('community.lock_topic')"
              class="p-2 rounded-lg text-gray-400 hover:text-yellow-400 hover:bg-white/10 transition-colors text-sm"
            >
              🔒
            </button>
            <button
              @click="onDeleteTopic"
              :title="$t('community.delete_topic')"
              class="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/10 transition-colors text-sm"
            >
              🗑️
            </button>
          </div>
        </div>

        <div class="h-px bg-white/10" />

        <!-- Topic Body with Rich Text rendering -->
        <div class="prose prose-invert max-w-none text-gray-200 leading-relaxed text-sm md:text-base" v-html="topic.content?.ar || topic.content?.en" />
      </div>

      <!-- Comments Section -->
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-white flex items-center gap-2">
          <span>💬</span>
          <span>{{ $t('community.comments') }} ({{ comments.length }})</span>
        </h3>

        <!-- Comments List -->
        <div v-if="comments.length === 0" class="p-8 text-center glass rounded-2xl border border-white/5 text-gray-400 text-sm">
          لا توجد تعليقات أو ردود بعد. شارك برأيك الأول!
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="comment in comments"
            :key="comment.id"
            class="glass rounded-2xl p-4 md:p-5 border border-white/5 space-y-3"
          >
            <div class="flex items-center justify-between text-xs text-gray-400">
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-full bg-gold/20 text-gold flex items-center justify-center font-bold text-[10px]">
                  {{ comment.author_name ? comment.author_name.charAt(0) : 'U' }}
                </div>
                <span class="font-semibold text-white">{{ comment.author_name }}</span>
                <span>•</span>
                <span>{{ new Date(comment.created_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}</span>
              </div>

              <!-- Delete comment button for author or staff -->
              <button
                v-if="canModerate || comment.author_id === profile?.id"
                @click="onDeleteComment(comment.id)"
                class="text-gray-500 hover:text-red-400 transition-colors text-xs"
                :title="$t('community.delete_comment')"
              >
                ✕
              </button>
            </div>

            <div class="text-xs md:text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
              {{ comment.content }}
            </div>
          </div>
        </div>

        <!-- Add Comment Form -->
        <div v-if="!topic.metadata?.is_locked || canModerate" class="glass rounded-2xl p-5 border border-white/10 space-y-3">
          <h4 class="text-sm font-bold text-white">{{ $t('community.add_comment') }}</h4>
          <textarea
            v-model="commentText"
            rows="3"
            :placeholder="$t('community.comment_placeholder')"
            class="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-gold/50 resize-y"
          />
          <div class="flex justify-end">
            <button
              @click="onAddComment"
              :disabled="submittingComment || !commentText.trim()"
              class="px-5 py-2 rounded-xl bg-gold text-dark font-semibold text-xs hover:bg-gold/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <span>{{ submittingComment ? 'جارٍ الإرسال...' : $t('community.submit_comment') }}</span>
              <span>&larr;</span>
            </button>
          </div>
        </div>

        <div v-else class="p-4 rounded-xl bg-white/5 border border-white/10 text-center text-xs text-gray-400">
          🔒 هذا الموضوع مغلق من قبل المشرفين ولا يقبل ردوداً إضافية.
        </div>
      </div>
    </div>
  </div>
</template>
