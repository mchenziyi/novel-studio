import { getDatabase } from './database';

// ==================== Webhook 通知系统 ====================

export interface WebhookConfig {
  id: string;
  novel_id: string;
  url: string;
  events: string[];       // ['pipeline_complete', 'pipeline_error', 'review_needed']
  secret?: string;        // HMAC-SHA256 签名密钥
  enabled: boolean;
  created_at: string;
}

// 获取小说的 webhook 配置
export function getWebhooks(novelId: string): WebhookConfig[] {
  const db = getDatabase();
  const row = db.prepare(
    "SELECT config_value FROM novel_configs WHERE novel_id = ? AND config_key = 'webhooks'"
  ).get(novelId) as any;

  if (!row) return [];
  try {
    return JSON.parse(row.config_value);
  } catch {
    return [];
  }
}

// 保存 webhook 配置
export function saveWebhooks(novelId: string, webhooks: WebhookConfig[]): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO novel_configs (novel_id, config_key, config_value, updated_at)
    VALUES (?, 'webhooks', ?, ?)
    ON CONFLICT(novel_id, config_key) DO UPDATE SET config_value = ?, updated_at = ?
  `).run(novelId, JSON.stringify(webhooks), now, JSON.stringify(webhooks), now);
}

// 添加 webhook
export function addWebhook(novelId: string, url: string, events: string[], secret?: string): WebhookConfig {
  const webhooks = getWebhooks(novelId);
  const webhook: WebhookConfig = {
    id: `wh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    novel_id: novelId,
    url,
    events,
    secret,
    enabled: true,
    created_at: new Date().toISOString(),
  };
  webhooks.push(webhook);
  saveWebhooks(novelId, webhooks);
  return webhook;
}

// 删除 webhook
export function removeWebhook(novelId: string, webhookId: string): void {
  const webhooks = getWebhooks(novelId).filter(w => w.id !== webhookId);
  saveWebhooks(novelId, webhooks);
}

// 发送 webhook 通知（异步，不阻塞主流程）
export async function notifyWebhooks(novelId: string, event: string, data: any): Promise<void> {
  const webhooks = getWebhooks(novelId).filter(w => w.enabled && w.events.includes(event));

  for (const webhook of webhooks) {
    try {
      const payload = JSON.stringify({
        event,
        novelId,
        data,
        timestamp: new Date().toISOString(),
      });

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // HMAC-SHA256 签名（如果配置了 secret）
      if (webhook.secret && typeof crypto !== 'undefined') {
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
          'raw', encoder.encode(webhook.secret),
          { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
        );
        const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
        const hashArray = Array.from(new Uint8Array(signature));
        headers['X-Signature-256'] = `sha256=${hashArray.map(b => b.toString(16).padStart(2, '0')).join('')}`;
      }

      // 发送（fire-and-forget）
      fetch(webhook.url, {
        method: 'POST',
        headers,
        body: payload,
        signal: AbortSignal.timeout(10000), // 10s 超时
      }).catch(err => {
        console.error(`Webhook ${webhook.id} failed:`, err.message);
      });

    } catch (err) {
      console.error(`Webhook ${webhook.id} error:`, err);
    }
  }
}
