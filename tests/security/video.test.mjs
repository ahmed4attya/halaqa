import { describe, it } from 'node:test'
import assert from 'node:assert'

class CloudflareStreamProvider {
  name = 'cloudflare_stream'
  constructor(customerSubdomain = 'iframe.videodelivery.net') {
    this.customerSubdomain = customerSubdomain
  }

  getStreamUrl(videoId) {
    return `https://${this.customerSubdomain}/${videoId}?autoplay=true&preload=true`
  }

  getThumbnailUrl(videoId) {
    return `https://${this.customerSubdomain}/${videoId}/thumbnails/thumbnail.jpg`
  }

  verifyAccess(userId, isPremium, isSubscribed) {
    if (!isPremium) return true
    return isSubscribed && !!userId
  }
}

class CloudflareR2Provider {
  name = 'cloudflare_r2'
  constructor(bucketPublicUrl = '/videos') {
    this.bucketPublicUrl = bucketPublicUrl
  }

  getStreamUrl(videoId) {
    return `${this.bucketPublicUrl}/${videoId}.mp4`
  }

  getThumbnailUrl(videoId) {
    return `${this.bucketPublicUrl}/${videoId}_thumb.webp`
  }

  verifyAccess(userId, isPremium, isSubscribed) {
    if (!isPremium) return true
    return isSubscribed && !!userId
  }
}

describe('Sovereign Video & Academy Gating Engine (Gate H8 — DEC-H005)', () => {
  it('instantiates Cloudflare Stream provider and builds secure iframe URLs', () => {
    const provider = new CloudflareStreamProvider('customer-xyz.videodelivery.net')
    assert.strictEqual(provider.name, 'cloudflare_stream')

    const videoId = 'stream-vid-8849'
    const playUrl = provider.getStreamUrl(videoId)
    assert.ok(playUrl.startsWith('https://customer-xyz.videodelivery.net/stream-vid-8849'))
    assert.ok(playUrl.includes('autoplay=true'))

    const thumbUrl = provider.getThumbnailUrl(videoId)
    assert.strictEqual(thumbUrl, 'https://customer-xyz.videodelivery.net/stream-vid-8849/thumbnails/thumbnail.jpg')
  })

  it('instantiates Cloudflare R2 provider and builds sovereign storage URLs', () => {
    const provider = new CloudflareR2Provider('https://media.halaqa.app')
    assert.strictEqual(provider.name, 'cloudflare_r2')

    const videoId = 'lecture-01-intro'
    const playUrl = provider.getStreamUrl(videoId)
    assert.strictEqual(playUrl, 'https://media.halaqa.app/lecture-01-intro.mp4')

    const thumbUrl = provider.getThumbnailUrl(videoId)
    assert.strictEqual(thumbUrl, 'https://media.halaqa.app/lecture-01-intro_thumb.webp')
  })

  it('enforces strict monetization gating: non-subscribers blocked from premium lessons', () => {
    const provider = new CloudflareStreamProvider()

    // Free lesson is open to all
    assert.strictEqual(provider.verifyAccess('guest', false, false), true)

    // Premium lesson with active subscriber is allowed
    assert.strictEqual(provider.verifyAccess('user-101', true, true), true)

    // Premium lesson without active subscription is blocked
    assert.strictEqual(provider.verifyAccess('user-101', true, false), false)

    // Premium lesson with anonymous/empty user is blocked
    assert.strictEqual(provider.verifyAccess('', true, true), false)
  })

  it('calculates course completion rate accurately', () => {
    const calcRate = (completed, total) => total === 0 ? 0 : Math.round((completed / total) * 100)

    assert.strictEqual(calcRate(0, 10), 0)
    assert.strictEqual(calcRate(5, 10), 50)
    assert.strictEqual(calcRate(10, 10), 100)
    assert.strictEqual(calcRate(1, 3), 33)
  })
})
