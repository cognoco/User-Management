import crypto from 'crypto';
import { z } from 'zod';
import type {
  IWebhookDataProvider,
  WebhookDelivery,
} from '@/core/webhooks';

interface WebhookPayload {
  event: string;
  data: unknown;
}

export enum DeliveryErrorType {
  NETWORK = 'network',
  CLIENT = 'client',
  SERVER = 'server',
  INVALID_PAYLOAD = 'invalid-payload',
  SIGNATURE = 'signature',
}

const payloadSchema = z.object({
  event: z.string().min(1),
  data: z.any(),
});

/** Result of a single webhook delivery */
interface WebhookDeliveryResult extends WebhookDelivery {
  /** Whether the delivery succeeded */
  success: boolean;
  /** Categorized error type when failed */
  errorType?: DeliveryErrorType;
  /** Human readable error */
  errorMessage?: string;
}

/**
 * Signs the webhook payload using the webhook's secret
 * @param payload The webhook payload to sign
 * @param secret The webhook secret
 * @returns A signature string to be used in the X-Webhook-Signature header
 */
export function signPayload(payload: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  return hmac.update(payload).digest('hex');
}

export function verifySignature(
  payload: string,
  secret: string,
  signature: string,
): void {
  const expected = signPayload(payload, secret);
  const valid = crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature),
  );
  if (!valid) {
    throw new Error('Invalid signature');
  }
}

/**
 * Records a webhook delivery attempt in the database
 * @param webhookId The ID of the webhook
 * @param eventType The type of event
 * @param payload The payload that was sent
 * @param statusCode The HTTP status code from the response
 * @param response The response text
 * @param error Error message, if any
 */
async function recordDelivery(
  provider: IWebhookDataProvider,
  delivery: WebhookDelivery
): Promise<void> {
  try {
    await provider.recordDelivery(delivery);
  } catch (err) {
    console.error('Failed to record webhook delivery:', err);
  }
}

async function sendWithRetry(
  url: string,
  options: RequestInit,
  retries = 2,
): Promise<Response> {
  let lastError: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.status >= 500 && attempt < retries) {
        lastError = new Error(`Server error ${res.status}`);
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < retries) continue;
      throw err;
    }
  }
  throw lastError;
}

/**
 * Sends an event to all webhooks registered for that event type
 * @param eventType The type of event to send
 * @param payload The event payload
 * @param userId Optional: If provided, only sends to webhooks owned by this user
 * @returns Array of delivery results
 */
export interface WebhookSender {
  sendWebhookEvent(
    eventType: string,
    payload: unknown,
    userId: string
  ): Promise<WebhookDeliveryResult[]>;
  getWebhookDeliveries(
    userId: string,
    webhookId: string,
    limit?: number
  ): Promise<WebhookDelivery[]>;
}

export function createWebhookSender(
  provider: IWebhookDataProvider
): WebhookSender {
  async function sendWebhookEvent(
    eventType: string,
    payload: unknown,
    userId: string
  ): Promise<WebhookDeliveryResult[]> {
    const webhooks = await provider.listWebhooks(userId);
    const eligible = webhooks.filter(
      (w) => w.isActive && w.events.includes(eventType)
    );
    if (eligible.length === 0) {
      return [];
    }

    const fullPayload: WebhookPayload = { event: eventType, data: payload };
    const parse = payloadSchema.safeParse(fullPayload);
    if (!parse.success) {
      return eligible.map((webhook) => ({
        id: crypto.randomBytes(16).toString('hex'),
        webhookId: webhook.id,
        eventType,
        payload: fullPayload,
        error: 'Invalid payload',
        createdAt: new Date().toISOString(),
        success: false,
        errorType: DeliveryErrorType.INVALID_PAYLOAD,
        errorMessage: 'Invalid payload',
      }));
    }

    const payloadStr = JSON.stringify(fullPayload);

    const results: WebhookDeliveryResult[] = [];

    await Promise.allSettled(
      eligible.map(async (webhook) => {
        try {
          const signature = signPayload(payloadStr, webhook.secret);
          const response = await sendWithRetry(
            webhook.url,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Signature': signature,
                'X-Webhook-Event': eventType,
              },
              body: payloadStr,
            },
          );

          const responseText = await response.text();
          const success = response.ok;
          const errorType = success
            ? undefined
            : response.status >= 500
              ? DeliveryErrorType.SERVER
              : DeliveryErrorType.CLIENT;
          const delivery: WebhookDeliveryResult = {
            id:
              (crypto as any).randomUUID?.() ||
              crypto.randomBytes(16).toString('hex'),
            webhookId: webhook.id,
            eventType,
            payload: fullPayload,
            statusCode: response.status,
            response: responseText,
            createdAt: new Date().toISOString(),
            success,
            ...(success
              ? {}
              : {
                  error: `Failed with status: ${response.status}`,
                  errorType,
                  errorMessage: `Failed with status: ${response.status}`,
                }),
          };

          await recordDelivery(provider, delivery);
          results.push(delivery);
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : 'Unknown error delivering webhook';
          const delivery: WebhookDeliveryResult = {
            id:
              (crypto as any).randomUUID?.() ||
              crypto.randomBytes(16).toString('hex'),
            webhookId: webhook.id,
            eventType,
            payload: fullPayload,
            error: errorMessage,
            createdAt: new Date().toISOString(),
            success: false,
            errorType: DeliveryErrorType.NETWORK,
            errorMessage,
          };

          await recordDelivery(provider, delivery);
          results.push(delivery);
        }
      })
    );

    return results;
  }

  async function getWebhookDeliveries(
    userId: string,
    webhookId: string,
    limit = 10
  ): Promise<WebhookDelivery[]> {
    const result = await provider.listDeliveries(userId, webhookId, limit);
    return result.deliveries;
  }

  return { sendWebhookEvent, getWebhookDeliveries };
}
