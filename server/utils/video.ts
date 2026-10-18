/**
 * Sovereign Video Provider Engine for HALAQA (DEC-H005)
 * Abstract provider layer supporting Cloudflare Stream, R2 Storage,
 * self-hosted MP4/HLS streams, and fallback providers.
 */

export interface VideoStreamConfig {
  id: string
  provider: 'cloudflare_stream' | 'cloudflare_r2' | 'direct_hls' | 'local_sandbox'
  playbackUrl: string
  thumbnailUrl?: string
  durationSeconds?: number
  isSecured: boolean
}

export interface VideoProvider {
  name: string
  getStreamUrl(videoId: string): string
  getThumbnailUrl(videoId: string): string
  verifyAccess(userId: string, isPremium: boolean, isSubscribed: boolean): boolean
}

export class CloudflareStreamProvider implements VideoProvider {
  name = 'cloudflare_stream'
  private customerSubdomain: string

  constructor(customerSubdomain = 'iframe.videodelivery.net') {
    this.customerSubdomain = customerSubdomain
  }

  getStreamUrl(videoId: string): string {
    return `https://${this.customerSubdomain}/${videoId}?autoplay=true&preload=true`
  }

  getThumbnailUrl(videoId: string): string {
    return `https://${this.customerSubdomain}/${videoId}/thumbnails/thumbnail.jpg`
  }

  verifyAccess(userId: string, isPremium: boolean, isSubscribed: boolean): boolean {
    if (!isPremium) return true
    return isSubscribed && !!userId
  }
}

export class CloudflareR2Provider implements VideoProvider {
  name = 'cloudflare_r2'
  private bucketPublicUrl: string

  constructor(bucketPublicUrl = '/videos') {
    this.bucketPublicUrl = bucketPublicUrl
  }

  getStreamUrl(videoId: string): string {
    return `${this.bucketPublicUrl}/${videoId}.mp4`
  }

  getThumbnailUrl(videoId: string): string {
    return `${this.bucketPublicUrl}/${videoId}_thumb.webp`
  }

  verifyAccess(userId: string, isPremium: boolean, isSubscribed: boolean): boolean {
    if (!isPremium) return true
    return isSubscribed && !!userId
  }
}

export class LocalSandboxVideoProvider implements VideoProvider {
  name = 'local_sandbox'

  getStreamUrl(videoId: string): string {
    return `/videos/sandbox/${videoId}.mp4`
  }

  getThumbnailUrl(videoId: string): string {
    return `/videos/sandbox/${videoId}-poster.webp`
  }

  verifyAccess(userId: string, isPremium: boolean, isSubscribed: boolean): boolean {
    if (!isPremium) return true
    return isSubscribed && !!userId
  }
}

export const createVideoProvider = (
  providerType: 'cloudflare_stream' | 'cloudflare_r2' | 'local_sandbox' = 'cloudflare_stream',
  subdomain?: string,
): VideoProvider => {
  switch (providerType) {
    case 'cloudflare_stream':
      return new CloudflareStreamProvider(subdomain)
    case 'cloudflare_r2':
      return new CloudflareR2Provider(subdomain)
    case 'local_sandbox':
    default:
      return new LocalSandboxVideoProvider()
  }
}
