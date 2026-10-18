<script setup lang="ts">
import type { Database } from '~/types/database'

definePageMeta({
  layout: 'dashboard',
  middleware: 'dashboard-auth',
  title: 'Circles & Communities',
})

const supabase = useSupabaseClient<Database>()
const { t } = useI18n()
const { profile, isOwner, isManager, isSuperAdmin } = useUser()

type Branch = Database['public']['Tables']['branches']['Row']

interface CircleItem {
  id: string
  name: Record<string, string> | string
  slug: string
  module_type: string
  is_active: boolean
  created_at: string
}

const circles = ref<CircleItem[]>([])
const loading = ref(true)
const showCreateModal = ref(false)
const creating = ref(false)
const error = ref('')
const success = ref('')

const form = reactive({
  name_ar: '',
  name_en: '',
  slug: '',
  is_private: false,
})

const canManageCircles = computed(() => isOwner.value || isManager.value || isSuperAdmin.value)
const orgId = computed(() => profile.value?.organization_id)

function getDisplayName(name: Record<string, string> | string | undefined): string {
  if (!name) return '—'
  if (typeof name === 'string') return name
  return name.ar || name.en || '—'
}

function generateSlug(val: string): string {
  return val
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function onNameEnInput(val: string) {
  if (!form.slug) {
    form.slug = generateSlug(val)
  }
}

async function fetchCircles() {
  if (!orgId.value) return
  loading.value = true
  error.value = ''

  try {
    const { data, error: fetchErr } = await supabase
      .from('branches')
      .select('*')
      .eq('organization_id', orgId.value)
      .order('created_at', { ascending: false })

    if (fetchErr) throw fetchErr
    circles.value = (data as unknown as CircleItem[]) || []
  } catch (err: any) {
    error.value = err.message || 'حدث خطأ أثناء تحميل الحلقات'
  } finally {
    loading.value = false
  }
}

async function createCircle() {
  if (!orgId.value || !form.name_ar) return
  creating.value = true
  error.value = ''
  success.value = ''

  try {
    const finalSlug = form.slug || generateSlug(form.name_en || form.name_ar)
    const { data, error: insertErr } = await supabase
      .from('branches')
      .insert({
        organization_id: orgId.value,
        name: { ar: form.name_ar, en: form.name_en || form.name_ar },
        slug: finalSlug,
        module_type: 'forum',
        is_active: true,
      })
      .select()
      .single()

    if (insertErr) throw insertErr

    circles.value.unshift(data as unknown as CircleItem)
    success.value = t('dashboard.circle_created')
    showCreateModal.value = false
    form.name_ar = ''
    form.name_en = ''
    form.slug = ''
    form.is_private = false
    setTimeout(() => { success.value = '' }, 4000)
  } catch (err: any) {
    error.value = err.message || 'تعذر إنشاء الحلقة'
  } finally {
    creating.value = false
  }
}

watch(orgId, fetchCircles, { immediate: true })
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-white/5">
      <div>
        <h1 class="text-xl font-bold text-white">{{ $t('dashboard.circles_title') }}</h1>
        <p class="text-xs text-gray-500 mt-1">{{ $t('dashboard.circles_desc') }}</p>
      </div>
      <div v-if="canManageCircles">
        <button
          type="button"
          class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold text-onyx font-bold text-sm hover:bg-gold-500 transition-all shadow-lg shadow-gold/10"
          @click="showCreateModal = true"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>{{ $t('dashboard.create_circle') }}</span>
        </button>
      </div>
    </div>

    <!-- Alert Messages -->
    <div v-if="error" class="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
      {{ error }}
    </div>
    <div v-if="success" class="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
      {{ success }}
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="i in 3" :key="i" class="h-36 rounded-2xl bg-white/5 animate-pulse" />
    </div>

    <!-- Empty State -->
    <div v-else-if="circles.length === 0" class="text-center py-12 glass rounded-2xl border border-white/5 space-y-3">
      <div class="w-12 h-12 mx-auto rounded-full bg-white/5 flex items-center justify-center text-gray-400">
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
        </svg>
      </div>
      <p class="text-sm text-gray-400">{{ $t('dashboard.no_circles') }}</p>
    </div>

    <!-- Circles Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="circle in circles"
        :key="circle.id"
        class="glass rounded-2xl p-5 border border-white/5 hover:border-gold/20 transition-all space-y-3 flex flex-col justify-between"
      >
        <div class="space-y-2">
          <div class="flex items-start justify-between gap-2">
            <h3 class="text-base font-bold text-white">{{ getDisplayName(circle.name) }}</h3>
            <span
              class="px-2 py-0.5 rounded-full text-[10px] font-medium border"
              :class="circle.is_active ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'"
            >
              {{ circle.is_active ? $t('dashboard.status_active') : $t('dashboard.status_inactive') }}
            </span>
          </div>
          <p class="text-xs font-mono text-gray-500" dir="ltr">@{{ circle.slug }}</p>
        </div>

        <div class="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
          <span>{{ circle.module_type === 'forum' ? 'مجتمع نقاشي' : 'مسار محتوى' }}</span>
          <span>{{ new Date(circle.created_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }) }}</span>
        </div>
      </div>
    </div>

    <!-- Create Circle Modal -->
    <Transition name="fade">
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showCreateModal = false" />
        <div class="relative w-full max-w-md glass rounded-2xl p-6 border border-white/10 space-y-5">
          <h2 class="text-lg font-bold text-white">{{ $t('dashboard.create_circle') }}</h2>

          <form @submit.prevent="createCircle" class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1.5">
                {{ $t('dashboard.circle_name_ar') }}
              </label>
              <input
                v-model="form.name_ar"
                type="text"
                required
                placeholder="حلقة رواد الأعمال"
                class="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-gold/50"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1.5">
                {{ $t('dashboard.circle_name_en') }}
              </label>
              <input
                v-model="form.name_en"
                type="text"
                dir="ltr"
                placeholder="Entrepreneurs Circle"
                class="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-gold/50"
                @input="onNameEnInput(($event.target as HTMLInputElement).value)"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1.5">
                {{ $t('dashboard.circle_slug') }}
              </label>
              <input
                v-model="form.slug"
                type="text"
                dir="ltr"
                placeholder="entrepreneurs"
                class="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 font-mono text-sm focus:outline-none focus:border-gold/50"
              />
            </div>

            <div class="flex gap-3 pt-2">
              <button
                type="button"
                class="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-gray-300 text-sm hover:bg-white/5 transition-colors"
                @click="showCreateModal = false"
              >
                {{ $t('common.cancel') }}
              </button>
              <button
                type="submit"
                :disabled="creating"
                class="flex-1 px-4 py-2.5 rounded-xl bg-gold text-onyx font-bold text-sm hover:bg-gold-500 transition-colors disabled:opacity-50"
              >
                {{ creating ? '...' : $t('dashboard.create_circle') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
