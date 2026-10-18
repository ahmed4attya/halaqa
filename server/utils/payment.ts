import crypto from 'node:crypto'

export interface PaymentInvoiceRequest {
  amount: number
  currency: 'SAR' | 'USD'
  description: string
  callbackUrl: string
  metadata?: Record<string, string | number>
}

export interface PaymentInvoiceResponse {
  id: string
  status: 'initiated' | 'paid' | 'failed'
  amount: number
  currency: string
  transactionUrl?: string
  rawResponse?: Record<string, any>
}

export interface PaymentProvider {
  createInvoice(request: PaymentInvoiceRequest): Promise<PaymentInvoiceResponse>
  verifyWebhookSignature(signature: string, payload: string | Buffer): boolean
}

export class MoyasarSandboxProvider implements PaymentProvider {
  private secretKey: string
  private webhookSecret: string

  constructor(secretKey?: string, webhookSecret?: string) {
    this.secretKey = secretKey || process.env.MOYASAR_SECRET_KEY || ''
    this.webhookSecret = webhookSecret || process.env.MOYASAR_WEBHOOK_SECRET || ''
  }

  async createInvoice(request: PaymentInvoiceRequest): Promise<PaymentInvoiceResponse> {
    if (!this.secretKey) {
      return {
        id: `inv_mock_${Date.now()}`,
        status: 'initiated',
        amount: request.amount,
        currency: request.currency,
        transactionUrl: `https://api.moyasar.com/v1/invoices/mock_${Date.now()}`,
      }
    }

    const authHeader = `Basic ${Buffer.from(`${this.secretKey}:`).toString('base64')}`
    const response = await fetch('https://api.moyasar.com/v1/invoices', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: request.amount,
        currency: request.currency,
        description: request.description,
        callback_url: request.callbackUrl,
        metadata: request.metadata,
      }),
    })

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}))
      throw new Error(`Moyasar API error (${response.status}): ${JSON.stringify(errBody)}`)
    }

    const data = await response.json()
    return {
      id: data.id,
      status: data.status,
      amount: data.amount,
      currency: data.currency,
      transactionUrl: data.url,
      rawResponse: data,
    }
  }

  verifyWebhookSignature(signature: string, payload: string | Buffer): boolean {
    if (!this.webhookSecret || !signature) {
      return false
    }

    try {
      const hmac = crypto.createHmac('sha256', this.webhookSecret)
      hmac.update(payload)
      const expected = hmac.digest('hex')

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'utf8'),
        Buffer.from(expected, 'utf8')
      )
    } catch {
      return false
    }
  }
}

let defaultProvider: PaymentProvider | null = null

export function getPaymentProvider(): PaymentProvider {
  if (!defaultProvider) {
    defaultProvider = new MoyasarSandboxProvider()
  }
  return defaultProvider
}
