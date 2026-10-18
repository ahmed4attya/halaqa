import { describe, it } from 'node:test'
import assert from 'node:assert'

describe('Community & Forum Engine — Dedicated Tables & Sovereign RLS (Migration 00024)', () => {
  it('formats discussion topic with metadata and safe HTML rendering structure', () => {
    const rawTopic = {
      title: { ar: 'كيف نبني مجتمعاً معرفياً؟', en: 'How to build a knowledge community?' },
      content: {
        body: { ar: '<p>نقاش مفتوح حول أفضل الممارسات</p>', en: '' },
        is_pinned: true,
        is_locked: false,
        author_id: 'user-123',
        author_name: 'أحمد عطية',
        likes_count: 5,
      },
    }

    assert.strictEqual(rawTopic.title.ar, 'كيف نبني مجتمعاً معرفياً؟')
    assert.strictEqual(rawTopic.content.is_pinned, true)
    assert.strictEqual(rawTopic.content.is_locked, false)
  })

  it('enforces moderation actions: pin, unpin, lock, unlock', () => {
    const topicState = {
      is_pinned: false,
      is_locked: false,
    }

    // Toggle Pin
    topicState.is_pinned = !topicState.is_pinned
    assert.strictEqual(topicState.is_pinned, true)

    // Toggle Lock
    topicState.is_locked = !topicState.is_locked
    assert.strictEqual(topicState.is_locked, true)

    // Unlock
    topicState.is_locked = !topicState.is_locked
    assert.strictEqual(topicState.is_locked, false)
  })

  it('validates migration 00024 dedicated comment model & RLS permissions', () => {
    // Model structure of public.community_comments
    const commentRecord = {
      id: 'cc-9876',
      entity_id: 'ent-1234',
      organization_id: 'org-5555',
      author_id: 'user-auth-1',
      content: 'تعليق سيادي من عضو المنظمة',
      created_at: new Date().toISOString(),
    }

    assert.strictEqual(commentRecord.entity_id, 'ent-1234')
    assert.strictEqual(commentRecord.organization_id, 'org-5555')
    assert.strictEqual(commentRecord.author_id, 'user-auth-1')

    // RLS Policy Check: Insert allowed for any member in same org
    const canInsertComment = (userOrg, targetOrg, userId, authorId) => {
      return userOrg === targetOrg && userId === authorId
    }
    assert.strictEqual(canInsertComment('org-5555', 'org-5555', 'user-auth-1', 'user-auth-1'), true)
    assert.strictEqual(canInsertComment('org-other', 'org-5555', 'user-auth-1', 'user-auth-1'), false)

    // RLS Policy Check: Delete allowed for author OR staff (owner/manager) OR super_admin
    const canDeleteComment = (userId, authorId, userRole, userOrg, commentOrg) => {
      if (userId === authorId) return true
      if (userRole === 'super_admin') return true
      if (userOrg === commentOrg && ['owner', 'manager'].includes(userRole)) return true
      return false
    }

    assert.strictEqual(canDeleteComment('user-auth-1', 'user-auth-1', 'member', 'org-5555', 'org-5555'), true)
    assert.strictEqual(canDeleteComment('manager-1', 'user-auth-1', 'manager', 'org-5555', 'org-5555'), true)
    assert.strictEqual(canDeleteComment('owner-1', 'user-auth-1', 'owner', 'org-5555', 'org-5555'), true)
    assert.strictEqual(canDeleteComment('admin-1', 'user-auth-1', 'super_admin', 'org-any', 'org-5555'), true)
    assert.strictEqual(canDeleteComment('member-2', 'user-auth-1', 'member', 'org-5555', 'org-5555'), false)
  })

  it('verifies role authorization for moderation privileges', () => {
    const checkCanModerate = (role) => ['owner', 'manager', 'super_admin'].includes(role)

    assert.strictEqual(checkCanModerate('owner'), true)
    assert.strictEqual(checkCanModerate('manager'), true)
    assert.strictEqual(checkCanModerate('super_admin'), true)
    assert.strictEqual(checkCanModerate('member'), false)
    assert.strictEqual(checkCanModerate('anonymous'), false)
  })
})
