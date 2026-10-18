<script setup lang="ts">
definePageMeta({
  title: 'Pricing & Plans',
})

const { t, locale } = useI18n()
const { plan, isReadOnly } = useSubscription()
const { isAuthenticated } = useUser()

interface PricingTier {
  id: string
  nameKey: string
  descKey: string
  price: number
  popular?: boolean
  features: string[]
}

const tiers = computed<PricingTier[]>(() => [
  {
    id: 'starter',
    nameKey: 'pricing.plan_starter',
    descKey: 'pricing.plan_starter_desc',
    price: 99,
    features: [
      'pricing.feature_members_500',
      'pricing.feature_circles_3',
      'pricing.feature_payments',
      'pricing.feature_instant_payout',
    ],
  },
  {
    id: 'pro',
    nameKey: 'pricing.plan_pro',
    descKey: 'pricing.plan_pro_desc',
    price: 149,
    popular: true,
    features: [
      'pricing.feature_members_5000',
      'pricing.feature_circles_15',
      'pricing.feature_payments',
      'pricing.feature_instant_payout',
      'pricing.feature_priority_support',
    ],
  },
  {
    id: 'enterprise',
    nameKey: 'pricing.plan_enterprise',
    descKey: 'pricing.plan_enterprise_desc',
    price: 199,
    features: [
      'pricing.feature_members_unlimited',
      'pricing.feature_circles_unlimited',
      'pricing.feature_payments',
      'pricing.feature_instant_payout',
      'pricing.feature_priority_support',
    ],
  },
])

const isCurrentTier = (tierId: string) => {
  return plan.value?.slug === tierId
}
</script>

<template>
  <div class="min-h-screen bg-[#0a0a0a] text-gray-100 py-16 px-4 sm:px-6 lg:px-8">
    <div class="max-w-6xl mx-auto space-y-12">
      <!-- Section Header -->
      <div class="text-center space-y-4 max-w-3xl mx-auto">
        <span class="px-3.5 py-1.5 rounded-full text-xs font-bold bg-gold/10 text-gold border border-gold/20">
          باقات الشركاء والمجتمعات
        </span>
        <h1 class="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
          {{ $t('pricing.title') }}
        </h1>
        <p class="text-sm sm:text-base text-gray-400">
          {{ $t('pricing.subtitle') }}
        </p>
      </div>

      <!-- Pricing Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
        <div
          v-for="tier in tiers"
          :key="tier.id"
          class="relative glass rounded-3xl p-6 sm:p-8 border transition-all duration-300 flex flex-col justify-between"
          :class="tier.popular ? 'border-gold shadow-2xl shadow-gold/10 bg-gold/[0.02]' : 'border-white/10 hover:border-white/20'"
        >
          <!-- Popular Badge -->
          <div
            v-if="tier.popular"
            class="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gold text-onyx text-xs font-black shadow-lg"
          >
            الأكثر طلباً
          </div>

          <div class="space-y-6">
            <div>
              <h2 class="text-xl font-bold text-white mb-2">{{ $t(tier.nameKey) }}</h2>
              <p class="text-xs text-gray-400 leading-relaxed">{{ $t(tier.descKey) }}</p>
            </div>

            <!-- Price -->
            <div class="flex items-baseline gap-2 pt-2 border-t border-white/5">
              <span class="text-4xl font-black text-white font-mono">{{ tier.price }}</span>
              <span class="text-sm font-bold text-gold">{{ $t('pricing.currency_sar') }}</span>
              <span class="text-xs text-gray-500">{{ $t('pricing.per_month') }}</span>
            </div>

            <!-- Features -->
            <ul class="space-y-3 pt-4 border-t border-white/5 text-xs text-gray-300">
              <li
                v-for="(feature, idx) in tier.features"
                :key="idx"
                class="flex items-center gap-2.5"
              >
                <div class="w-4 h-4 rounded-full bg-green-500/10 text-green-400 flex items-center justify-center shrink-0">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>{{ $t(feature) }}</span>
              </li>
            </ul>
          </div>

          <!-- Action Button -->
          <div class="pt-8 mt-6 border-t border-white/5">
            <NuxtLink
              v-if="!isCurrentTier(tier.id)"
              :to="isAuthenticated ? '/dashboard' : '/signup'"
              class="w-full py-3 px-4 rounded-xl text-center font-bold text-sm transition-all duration-200 block"
              :class="tier.popular ? 'bg-gold text-onyx hover:bg-gold-500 shadow-lg shadow-gold/20' : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'"
            >
              {{ $t('pricing.subscribe_now') }}
            </NuxtLink>
            <div
              v-else
              class="w-full py-3 px-4 rounded-xl text-center font-bold text-xs bg-white/5 text-gray-400 border border-white/10 cursor-default"
            >
              {{ $t('pricing.current_plan') }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
