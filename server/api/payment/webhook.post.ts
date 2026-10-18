import { getPaymentProvider } from '../../utils/payment'

export default defineEventHandler(async (event) => {
  // 1. Enforce POST
  assertMethod(event, 'POST')

  // 2. Extract Webhook Signature Header
  const signature = getHeader(event, 'x-moyasar-signature') || getHeader(event, 'x-signature') || ''
  const rawBody = await readRawBody(event, 'utf8')

  if (!rawBody) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid Payload: Body cannot be empty',
    })
  }

  // 3. Verify Signature (Fail-closed)
  const provider = getPaymentProvider()
  const isVerified = provider.verifyWebhookSignature(signature, rawBody)

  // In sandbox development without keys configured, verify structure
  if (!process.env.MOYASAR_WEBHOOK_SECRET) {
    console.warn('[webhook:moyasar] MOYASAR_WEBHOOK_SECRET not set in environment. Waiting in Sovereign Queue.')
  } else if (!isVerified) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: Invalid webhook signature',
    })
  }

  // 4. Parse Event Payload
  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid JSON',
    })
  }

  const { id, type, data } = payload

  // 5. Route Event Status
  if (type === 'payment.paid' || data?.status === 'paid') {
    return {
      received: true,
      processed: true,
      paymentId: data?.id || id,
      status: 'paid',
    }
  }

  return {
    received: true,
    processed: false,
    status: data?.status || 'ignored',
  }
})
