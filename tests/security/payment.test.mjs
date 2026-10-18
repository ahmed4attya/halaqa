import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'

class MoyasarSandboxProvider {
  constructor(secretKey = '', webhookSecret = '') {
    this.secretKey = secretKey || process.env.MOYASAR_SECRET_KEY || ''
    this.webhookSecret = webhookSecret || process.env.MOYASAR_WEBHOOK_SECRET || ''
  }

  async createInvoice(request) {
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

  verifyWebhookSignature(signature, payload) {
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

describe('Payment Engine — Moyasar Sandbox Unit Tests', () => {
  const secretKey = 'sk_test_mock_secret_key'
  const webhookSecret = 'whsec_mock_webhook_secret_key'

  test('creates mock invoice when keys are pending in sovereign queue', async () => {
    const providerWithoutKey = new MoyasarSandboxProvider('', '')
    const invoice = await providerWithoutKey.createInvoice({
      amount: 9900,
      currency: 'SAR',
      description: 'اشتراك باقة الانطلاق (99 ر.س)',
      callbackUrl: 'https://example.com/callback',
    })

    assert.ok(invoice.id.startsWith('inv_mock_'))
    assert.equal(invoice.status, 'initiated')
    assert.equal(invoice.amount, 9900)
    assert.equal(invoice.currency, 'SAR')
  })

  test('validates authentic HMAC-SHA256 signature correctly', () => {
    const provider = new MoyasarSandboxProvider(secretKey, webhookSecret)
    const payload = JSON.stringify({
      id: 'evt_12345',
      type: 'payment.paid',
      data: { id: 'pay_123', status: 'paid', amount: 9900, currency: 'SAR' },
    })

    const validSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex')

    const verified = provider.verifyWebhookSignature(validSignature, payload)
    assert.equal(verified, true, 'Valid signature should be accepted')
  })

  test('rejects tampered or invalid webhook signature (fail-closed)', () => {
    const provider = new MoyasarSandboxProvider(secretKey, webhookSecret)
    const payload = JSON.stringify({
      id: 'evt_12345',
      type: 'payment.paid',
      data: { id: 'pay_123', status: 'paid', amount: 9900, currency: 'SAR' },
    })

    const invalidSignature = 'bad_tampered_signature_hex'

    const verified = provider.verifyWebhookSignature(invalidSignature, payload)
    assert.equal(verified, false, 'Tampered signature must be rejected')
  })

  test('rejects verification when webhook secret is empty', () => {
    const provider = new MoyasarSandboxProvider(secretKey, '')
    const verified = provider.verifyWebhookSignature('any_sig', '{}')
    assert.equal(verified, false, 'Must fail-closed when secret is missing')
  })
})
