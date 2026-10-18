import type { Database, Json } from '~/types/database'

export interface CourseLesson {
  id: string
  series_id: string
  branch_id: string
  organization_id: string
  title: { ar: string; en: string }
  content: { ar: string; en: string }
  video_id?: string | null
  primary_source: string
  fallback_source?: string | null
  fallback_url?: string | null
  is_premium: boolean
  sort_order: number
  is_completed?: boolean
}

export const useCourseTracker = () => {
  const supabase = useSupabaseClient<Database>()
  const { profile, isOwner, isManager, isSuperAdmin } = useUser()
  const { isSubscribed } = useSubscription()

  // Local storage cache for offline / learner progress
  const completedLessonIds = ref<string[]>([])

  const loadProgress = (seriesId: string) => {
    if (import.meta.client) {
      try {
        const stored = localStorage.getItem(`halaqa_progress_${seriesId}`)
        if (stored) {
          completedLessonIds.value = JSON.parse(stored)
        }
      } catch (e) {
        completedLessonIds.value = []
      }
    }
  }

  const markLessonComplete = (seriesId: string, lessonId: string) => {
    if (!completedLessonIds.value.includes(lessonId)) {
      completedLessonIds.value.push(lessonId)
      if (import.meta.client) {
        try {
          localStorage.setItem(`halaqa_progress_${seriesId}`, JSON.stringify(completedLessonIds.value))
        } catch (e) {
          // ignore storage quota errors
        }
      }
    }
  }

  const canAccessLesson = (lesson: { is_premium: boolean }): boolean => {
    // If not premium, everyone can access
    if (!lesson.is_premium) return true

    // Platform and organization staff always have access
    if (isOwner.value || isManager.value || isSuperAdmin.value) return true

    // Active subscription required for premium lectures
    return !!isSubscribed.value
  }

  const calculateCompletionRate = (totalLessons: number): number => {
    if (totalLessons === 0) return 0
    return Math.min(100, Math.round((completedLessonIds.value.length / totalLessons) * 100))
  }

  return {
    completedLessonIds,
    loadProgress,
    markLessonComplete,
    canAccessLesson,
    calculateCompletionRate,
  }
}
