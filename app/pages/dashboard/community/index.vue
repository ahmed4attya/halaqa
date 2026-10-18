<script setup lang="ts">
import type { Database } from '~/types/database'
import type { CommunityTopic } from '~/composables/useCommunity'

definePageMeta({
  layout: 'dashboard',
  middleware: 'dashboard-auth',
  title: 'Community & Discussions',
})

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { profile, isOwner, isManager, isSuperAdmin } = useUser()
const supabase = useSupabaseClient<Database>()
const { fetchTopics, createTopic, togglePin, toggleLock, deleteTopic, canModerate } = useCommunity()

type Branch = Database['public']['Tables']['branches']['Row']

const branches = ref<Branch[]>([])
const selectedBranchId = ref<string>('')
const topics = ref<CommunityTopic[]>([])
const loading = ref(true)
const showCreateModal = ref(false)
const submitting = ref(false)
const error = ref('')
const success = ref('')

const newTopic = reactive({
  title_ar: '',
  title_en: '',
  content_ar: '',
})

const orgId = computed(() => profile.value?.organization_id)

async function loadCircles() {
  if (!orgId.value) return
  loading.value = true
  const { data, error: err } = await supabase
    .from('branches')
    .select('*')
    .eq('organization_id', orgId.value)
    .order('created_at', { ascending: true })

  if (data && data.length > 0) {
    branches.value = data
    if (!selectedBranchId.value) {
      selectedBranchId.value = data[0].id
    }
    await loadTopics()
  }
  loading.value = false
}

async function loadTopics() {
  if (!selectedBranchId.value) return
  loading.value = true
  topics.value = await fetchTopics(selectedBranchId.value)
  loading.value = false
}

watch(selectedBranchId, () => {
  loadTopics()
})

onMounted(() => {
  loadCircles()
})

async function submitTopic() {
  if (!newTopic.title_ar.trim() || !newTopic.content_ar.trim() || !selectedBranchId.value || !orgId.value) {
    error.value = t('common.fill_required') || 'يرجى ملء جميع الحقول المطلوبة'
    return
  }

  submitting.value = true
  error.value = ''
  try {
    await createTopic({
      branchId: selectedBranchId.value,
      organizationId: orgId.value,
      title: {
        ar: newTopic.title_ar.trim(),
        en: newTopic.title_en.trim() || newTopic.title_ar.trim(),
      },
      contentHtml: newTopic.content_ar,
    })

    success.value = t('community.topic_created_success') || 'تم نشر الموضوع بنجاح'
    newTopic.title_ar = ''
    newTopic.title_en = ''
    newTopic.content_ar = ''
    showCreateModal.value = false
    await loadTopics()
  } catch (err: any) {
    error.value = err.message || 'حدث خطأ أثناء نشر الموضوع'
  } finally {
    submitting.value = false
  }
}

async function onTogglePin(topic: CommunityTopic) {
  await togglePin(topic.id, !!topic.metadata?.is_pinned)
  await loadTopics()
}

async function onToggleLock(topic: CommunityTopic) {
  await toggleLock(topic.id, !!topic.metadata?.is_locked)
  await loadTopics()
}

async function onDeleteTopic(topicId: string) {
  if (confirm(t('community.confirm_delete_topic') || 'هل أنت متأكد من حذف الموضوع؟')) {
    await deleteTopic(topicId)
    await loadTopics()
  }
}
</script>

<template>
  <div class="space-y-6 pb-12">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <span>💬</span>
          <span>{{ $t('community.title') }}</span>
        </h1>
        <p class="text-gray-400 text-sm mt-1">
          {{ $t('community.subtitle') }}
        </p>
      </div>

      <div class="flex items-center gap-3">
        <button
          @click="showCreateModal = true"
          class="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gold to-gold/90 text-dark font-semibold text-sm rounded-xl shadow-lg shadow-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>{{ $t('community.new_topic') }}</span>
        </button>
      </div>
    </div>

    <!-- Circle Selector Bar -->
    <div class="glass rounded-2xl p-4 border border-white/10 flex items-center gap-3 overflow-x-auto">
      <span class="text-xs font-semibold text-gray-400 shrink-0">{{ $t('community.select_circle') }}:</span>
      <button
        v-for="branch in branches"
        :key="branch.id"
        @click="selectedBranchId = branch.id"
        class="px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 shrink-0"
        :class="selectedBranchId === branch.id ? 'bg-gold text-dark font-bold shadow-md' : 'bg-white/5 text-gray-300 hover:bg-white/10'"
      >
        {{ (branch.name as any)?.ar || (branch.name as any)?.en || branch.slug }}
      </button>
    </div>

    <!-- Alert Feedback -->
    <div v-if="success" class="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm flex items-center justify-between">
      <span>{{ success }}</span>
      <button @click="success = ''" class="text-xs text-green-400/60 hover:text-green-400">✕</button>
    </div>

    <!-- Topics List -->
    <div v-if="loading" class="text-center py-16 text-gray-400">
      <div class="animate-spin w-8 h-8 border-2 border-gold border-t-transparent rounded-full mx-auto mb-3" />
      <span class="text-sm">جارٍ تحميل النقاشات والموضوعات...</span>
    </div>

    <div v-else-if="topics.length === 0" class="text-center py-20 glass rounded-3xl border border-white/5 space-y-4">
      <div class="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-3xl">
        💭
      </div>
      <h3 class="text-lg font-bold text-white">{{ $t('community.no_topics') }}</h3>
      <p class="text-sm text-gray-400 max-w-md mx-auto">
        {{ $t('community.start_first_discussion') }}
      </p>
      <button
        @click="showCreateModal = true"
        class="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-semibold transition-colors"
      >
        <span>{{ $t('community.new_topic') }}</span>
      </button>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="topic in topics"
        :key="topic.id"
        class="glass rounded-2xl p-5 border border-white/10 hover:border-gold/30 transition-all duration-200 space-y-3"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="space-y-1.5 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span v-if="topic.metadata?.is_pinned" class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gold/20 text-gold border border-gold/30">
                📌 {{ $t('community.pinned') }}
              </span>
              <span v-if="topic.metadata?.is_locked" class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                🔒 {{ $t('community.locked') }}
              </span>
              <NuxtLink
                :to="localePath(`/dashboard/community/${topic.id}`)"
                class="text-base font-bold text-white hover:text-gold transition-colors"
              >
                {{ topic.title?.ar || topic.title?.en }}
              </NuxtLink>
            </div>

            <p class="text-xs text-gray-400 flex items-center gap-3">
              <span>✍️ {{ topic.metadata?.author_name || 'عضو' }}</span>
              <span>•</span>
              <span>🕒 {{ new Date(topic.created_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}</span>
            </p>
          </div>

          <!-- Moderation Controls -->
          <div v-if="canModerate" class="flex items-center gap-1.5 shrink-0 bg-white/5 p-1 rounded-xl">
            <button
              @click="onTogglePin(topic)"
              :title="topic.metadata?.is_pinned ? $t('community.unpin_topic') : $t('community.pin_topic')"
              class="p-1.5 rounded-lg text-gray-400 hover:text-gold hover:bg-white/10 transition-colors text-xs"
            >
              📌
            </button>
            <button
              @click="onToggleLock(topic)"
              :title="topic.metadata?.is_locked ? $t('community.unlock_topic') : $t('community.lock_topic')"
              class="p-1.5 rounded-lg text-gray-400 hover:text-yellow-400 hover:bg-white/10 transition-colors text-xs"
            >
              🔒
            </button>
            <button
              @click="onDeleteTopic(topic.id)"
              :title="$t('community.delete_topic')"
              class="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/10 transition-colors text-xs"
            >
              🗑️
            </button>
          </div>
        </div>

        <!-- Topic Snippet -->
        <div class="text-xs text-gray-300 line-clamp-2 prose prose-invert max-w-none" v-html="topic.content?.ar || topic.content?.en" />

        <div class="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
          <NuxtLink
            :to="localePath(`/dashboard/community/${topic.id}`)"
            class="text-gold hover:underline flex items-center gap-1"
          >
            <span>💬 {{ topic.metadata?.replies_count || 0 }} {{ $t('community.replies') }}</span>
          </NuxtLink>
          <NuxtLink
            :to="localePath(`/dashboard/community/${topic.id}`)"
            class="text-xs text-gray-400 hover:text-white"
          >
            {{ $t('common.view') || 'عرض النقاش' }} &larr;
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Create Topic Modal with TipTap / RichTextEditor -->
    <Transition name="fade">
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showCreateModal = false" />
        <div class="relative w-full max-w-2xl glass rounded-3xl p-6 border border-white/10 space-y-5 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-bold text-white flex items-center gap-2">
              <span>✍️</span>
              <span>{{ $t('community.create_topic_title') }}</span>
            </h2>
            <button @click="showCreateModal = false" class="text-gray-400 hover:text-white">✕</button>
          </div>

          <form @submit.prevent="submitTopic" class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1.5">
                {{ $t('dashboard.entity_title_ar') }}
              </label>
              <input
                v-model="newTopic.title_ar"
                type="text"
                required
                :placeholder="$t('community.topic_title_placeholder')"
                class="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-gold/50"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1.5">
                {{ $t('dashboard.entity_content_ar') }} (TipTap RTL)
              </label>
              <div class="border border-white/10 rounded-xl p-3 bg-black/20">
                <DashboardRichTextEditor
                  v-model="newTopic.content_ar"
                  :placeholder="$t('community.topic_content_placeholder')"
                  dir="rtl"
                />
              </div>
            </div>

            <div v-if="error" class="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {{ error }}
            </div>

            <div class="flex gap-3 pt-2">
              <button
                type="button"
                class="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-gray-300 text-sm hover:bg-white/5 transition-colors"
                @click="showCreateModal = false"
              >
                {{ $t('common.cancel') || 'إلغاء' }}
              </button>
              <button
                type="submit"
                :disabled="submitting"
                class="flex-1 px-4 py-2.5 rounded-xl bg-gold text-dark font-semibold text-sm hover:bg-gold/90 transition-colors disabled:opacity-50"
              >
                {{ submitting ? $t('common.saving') || 'جارٍ النشر...' : $t('community.publish_topic') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </div>
</template>
