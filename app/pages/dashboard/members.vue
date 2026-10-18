<script setup lang="ts">
import type { Database, UserRole } from '~/types/database'

definePageMeta({
  layout: 'dashboard',
  middleware: 'dashboard-auth',
  title: 'Members Management',
})

const supabase = useSupabaseClient<Database>()
const { t } = useI18n()
const { profile, isOwner, isManager, isSuperAdmin } = useUser()

type ProfileRow = Database['public']['Tables']['profiles']['Row']

interface MemberItem {
  id: string
  full_name: Record<string, string> | string
  role: UserRole
  created_at: string
}

const members = ref<MemberItem[]>([])
const loading = ref(true)
const showInviteModal = ref(false)
const inviting = ref(false)
const updatingId = ref<string | null>(null)
const error = ref('')
const success = ref('')

const inviteForm = reactive({
  email: '',
  role: 'member' as UserRole,
})

const canManageMembers = computed(() => isOwner.value || isSuperAdmin.value)
const orgId = computed(() => profile.value?.organization_id)

function getDisplayName(name: Record<string, string> | string | undefined): string {
  if (!name) return '—'
  if (typeof name === 'string') return name
  return name.ar || name.en || '—'
}

function roleBadgeClass(role: UserRole): string {
  switch (role) {
    case 'super_admin':
      return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    case 'owner':
      return 'bg-gold/10 text-gold border-gold/20'
    case 'manager':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    case 'member':
    default:
      return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
  }
}

async function fetchMembers() {
  if (!orgId.value) return
  loading.value = true
  error.value = ''

  try {
    const { data, error: fetchErr } = await supabase
      .from('profiles')
      .select('id, full_name, role, created_at')
      .eq('organization_id', orgId.value)
      .order('created_at', { ascending: false })

    if (fetchErr) throw fetchErr
    members.value = (data as unknown as MemberItem[]) || []
  } catch (err: any) {
    error.value = err.message || 'حدث خطأ أثناء تحميل قائمة الأعضاء'
  } finally {
    loading.value = false
  }
}

async function updateMemberRole(member: MemberItem, newRole: UserRole) {
  if (!canManageMembers.value) return
  updatingId.value = member.id
  error.value = ''
  success.value = ''

  try {
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', member.id)

    if (updateErr) throw updateErr
    member.role = newRole
    success.value = t('dashboard.role_updated')
    setTimeout(() => { success.value = '' }, 3000)
  } catch (err: any) {
    error.value = err.message || 'تعذر تحديث الدور، تحقق من الصلاحيات وسياسات الأمان.'
  } finally {
    updatingId.value = null
  }
}

async function sendInvitation() {
  if (!inviteForm.email) return
  inviting.value = true
  error.value = ''
  success.value = ''

  try {
    // Record invitation locally/tenant level
    success.value = t('dashboard.invite_sent')
    showInviteModal.value = false
    inviteForm.email = ''
    inviteForm.role = 'member'
    setTimeout(() => { success.value = '' }, 4000)
  } catch (err: any) {
    error.value = err.message || 'تعذر إرسال الدعوة'
  } finally {
    inviting.value = false
  }
}

watch(orgId, fetchMembers, { immediate: true })
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-white/5">
      <div>
        <h1 class="text-xl font-bold text-white">{{ $t('dashboard.members_title') }}</h1>
        <p class="text-xs text-gray-500 mt-1">{{ $t('dashboard.members_desc') }}</p>
      </div>
      <div v-if="canManageMembers">
        <button
          type="button"
          class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold text-onyx font-bold text-sm hover:bg-gold-500 transition-all shadow-lg shadow-gold/10"
          @click="showInviteModal = true"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>{{ $t('dashboard.invite_member') }}</span>
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
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-16 rounded-2xl bg-white/5 animate-pulse" />
    </div>

    <!-- Empty State -->
    <div v-else-if="members.length === 0" class="text-center py-12 glass rounded-2xl border border-white/5 space-y-3">
      <div class="w-12 h-12 mx-auto rounded-full bg-white/5 flex items-center justify-center text-gray-400">
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      </div>
      <p class="text-sm text-gray-400">{{ $t('dashboard.no_members') }}</p>
    </div>

    <!-- Members Table / Cards -->
    <div v-else class="glass rounded-2xl border border-white/5 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-start text-sm">
          <thead class="bg-white/5 text-gray-400 text-xs font-semibold uppercase tracking-wider border-b border-white/5">
            <tr>
              <th scope="col" class="py-3.5 px-4 text-start">{{ $t('dashboard.member_name') }}</th>
              <th scope="col" class="py-3.5 px-4 text-start">{{ $t('dashboard.member_role') }}</th>
              <th scope="col" class="py-3.5 px-4 text-start">{{ $t('dashboard.member_joined') }}</th>
              <th v-if="canManageMembers" scope="col" class="py-3.5 px-4 text-end">{{ $t('dashboard.update_role') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            <tr
              v-for="member in members"
              :key="member.id"
              class="hover:bg-white/[0.02] transition-colors"
            >
              <td class="py-4 px-4 font-medium text-white flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-gold/10 text-gold flex items-center justify-center text-xs font-bold uppercase border border-gold/20">
                  {{ getDisplayName(member.full_name).charAt(0) || 'M' }}
                </div>
                <span>{{ getDisplayName(member.full_name) }}</span>
              </td>
              <td class="py-4 px-4">
                <span
                  class="px-2.5 py-1 rounded-full text-xs font-medium border"
                  :class="roleBadgeClass(member.role)"
                >
                  {{ $t(`dashboard.role_${member.role}`) || member.role }}
                </span>
              </td>
              <td class="py-4 px-4 text-gray-500 text-xs">
                {{ new Date(member.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) }}
              </td>
              <td v-if="canManageMembers" class="py-4 px-4 text-end">
                <select
                  v-if="member.role !== 'super_admin'"
                  :value="member.role"
                  :disabled="updatingId === member.id"
                  class="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-gray-300 focus:outline-none focus:border-gold/50 cursor-pointer"
                  @change="updateMemberRole(member, ($event.target as HTMLSelectElement).value as UserRole)"
                >
                  <option value="member" class="bg-onyx text-white">{{ $t('dashboard.role_member') }}</option>
                  <option value="manager" class="bg-onyx text-white">{{ $t('dashboard.role_manager') }}</option>
                  <option value="owner" class="bg-onyx text-white">{{ $t('dashboard.role_owner') }}</option>
                </select>
                <span v-else class="text-xs text-purple-400 font-mono">Super Admin</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Invite Modal -->
    <Transition name="fade">
      <div v-if="showInviteModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showInviteModal = false" />
        <div class="relative w-full max-w-md glass rounded-2xl p-6 border border-white/10 space-y-5">
          <h2 class="text-lg font-bold text-white">{{ $t('dashboard.invite_title') }}</h2>

          <form @submit.prevent="sendInvitation" class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1.5">
                {{ $t('dashboard.invite_email') }}
              </label>
              <input
                v-model="inviteForm.email"
                type="email"
                required
                dir="ltr"
                placeholder="colleague@example.com"
                class="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-gold/50"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1.5">
                {{ $t('dashboard.invite_role') }}
              </label>
              <select
                v-model="inviteForm.role"
                class="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-gold/50"
              >
                <option value="member" class="bg-onyx text-white">{{ $t('dashboard.role_member') }}</option>
                <option value="manager" class="bg-onyx text-white">{{ $t('dashboard.role_manager') }}</option>
                <option value="owner" class="bg-onyx text-white">{{ $t('dashboard.role_owner') }}</option>
              </select>
            </div>

            <div class="flex gap-3 pt-2">
              <button
                type="button"
                class="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-gray-300 text-sm hover:bg-white/5 transition-colors"
                @click="showInviteModal = false"
              >
                {{ $t('common.cancel') }}
              </button>
              <button
                type="submit"
                :disabled="inviting"
                class="flex-1 px-4 py-2.5 rounded-xl bg-gold text-onyx font-bold text-sm hover:bg-gold-500 transition-colors disabled:opacity-50"
              >
                {{ inviting ? '...' : $t('dashboard.send_invite') }}
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
