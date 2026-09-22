/**
 * SMS provider interface. Plug an Israeli provider in by implementing `SmsProvider`
 * (or by configuring the generic HTTP provider) and selecting it with SMS_PROVIDER.
 */
import type { Env } from './env';

export interface SmsResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export interface SmsProvider {
  readonly name: string;
  send(toE164: string, text: string): Promise<SmsResult>;
}

/** Development: logs the message. The OTP flow may echo the code when EXPOSE_DEV_OTP=1. */
export class MockSmsProvider implements SmsProvider {
  readonly name = 'mock';
  async send(to: string, text: string): Promise<SmsResult> {
    console.log(`[sms:mock] to=${to} text=${JSON.stringify(text)}`);
    return { ok: true, id: 'mock' };
  }
}

/**
 * Generic JSON-over-HTTPS provider. Many Israeli gateways accept a POST like:
 *   { "sender": "...", "to": "+9725...", "message": "..." }
 * Adjust `body()` to your provider's schema; auth goes in SMS_HTTP_AUTH (sent as Authorization).
 */
export class HttpSmsProvider implements SmsProvider {
  readonly name = 'http';
  constructor(private url: string, private auth: string | undefined, private sender: string) {}

  protected body(to: string, text: string): unknown {
    return { sender: this.sender, to, message: text };
  }

  async send(to: string, text: string): Promise<SmsResult> {
    try {
      const res = await fetch(this.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(this.auth ? { authorization: this.auth } : {}) },
        body: JSON.stringify(this.body(to, text)),
      });
      if (!res.ok) return { ok: false, error: `http_${res.status}` };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'network_error' };
    }
  }
}

export function smsProvider(env: Env): SmsProvider {
  switch (env.SMS_PROVIDER ?? 'mock') {
    case 'http':
      if (!env.SMS_HTTP_URL) throw new Error('SMS_HTTP_URL is required for SMS_PROVIDER=http');
      return new HttpSmsProvider(env.SMS_HTTP_URL, env.SMS_HTTP_AUTH, env.SMS_SENDER ?? 'Mortgage');
    case 'mock':
      return new MockSmsProvider();
    default:
      throw new Error(`Unknown SMS_PROVIDER: ${env.SMS_PROVIDER}`);
  }
}
