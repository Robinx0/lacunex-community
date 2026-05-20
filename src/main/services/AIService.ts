import Store from 'electron-store';
import { appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { AiAction } from '@shared/ipc-contracts';
import { getUserDataRoot } from '../lib/paths';

const REQUEST_TIMEOUT_MS = 60_000;

/**
 * Validate an Ollama base URL. Ollama is local-only by design; allowing
 * arbitrary hostnames turns the desktop into an SSRF proxy: a renderer
 * could point it at `http://169.254.169.254/...` (cloud metadata) or any
 * intranet host and read the response body via the thrown error. We pin
 * the hostname to a literal loopback identifier.
 */
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function assertSafeOllamaUrl(url: string): void {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error('Invalid Ollama URL');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('Ollama URL must use http(s)');
  }
  const host = u.hostname.toLowerCase();
  if (!LOOPBACK_HOSTS.has(host)) {
    throw new Error('Ollama URL must point at localhost (127.0.0.1 / ::1)');
  }
}

interface PersistedSettings {
  model: string;
  ollamaUrl: string;
}

const DEFAULTS: PersistedSettings = {
  model: 'llama3.2',
  ollamaUrl: 'http://localhost:11434',
};

const SYSTEM_PROMPT_PER_ACTION: Record<AiAction, string> = {
  suggest_remediation:
    "You are a senior application security engineer. Given a vulnerability finding, write a concise, actionable remediation paragraph. Focus on root-cause fixes (parameterized queries, principle of least privilege, defense-in-depth). 80–160 words. Plain prose. No markdown headings.",
  improve_clarity:
    "Rewrite the user's paragraph to be clearer and more direct, preserving every technical detail. Penetration test report tone — professional, terse, no marketing fluff. Same approximate length. Plain prose.",
  summarize_section:
    "Summarize the user's report section in 3–5 sentences for an executive audience. Highlight the most severe finding, the business impact, and the recommended next step. Plain prose.",
};

// AI service. Talks to a local Ollama instance on 127.0.0.1:11434. No
// cloud LLM, no API-key storage.
export class AIService {
  private store: Store<{ ai: PersistedSettings }>;
  private logPath: string;

  constructor() {
    this.store = new Store<{ ai: PersistedSettings }>({
      name: 'lacunex-settings',
      defaults: { ai: DEFAULTS },
    });
    this.logPath = join(getUserDataRoot(), 'ai_usage.log');
  }

  private read(): PersistedSettings {
    return this.store.get('ai', DEFAULTS);
  }

  private write(next: PersistedSettings): void {
    this.store.set('ai', next);
  }

  getSettings() {
    const s = this.read();
    return {
      provider: 'ollama' as const,
      model: s.model,
      apiKeyConfigured: false,
      ollamaUrl: s.ollamaUrl,
    };
  }

  setSettings(input: { provider?: 'ollama'; model: string; ollamaUrl?: string }) {
    const current = this.read();
    const ollamaUrl = input.ollamaUrl ?? current.ollamaUrl;
    if (input.ollamaUrl !== undefined) assertSafeOllamaUrl(ollamaUrl);
    this.write({
      model: input.model,
      ollamaUrl,
    });
    return this.getSettings();
  }

  private logUsage(action: AiAction, model: string, bytes: number): void {
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      action,
      provider: 'ollama',
      model,
      bytes,
    }) + '\n';
    void appendFile(this.logPath, line).catch(() => {});
  }

  /**
   * Probe the configured Ollama instance. Used by the AI panel on open
   * to render an actionable empty state instead of letting the first
   * `generate` call surface "fetch failed".
   *
   * Hits `/api/tags` (cheap, no inference) with a 3-second timeout. The
   * timeout is intentionally short — Ollama responds in milliseconds
   * when up; anything longer means the daemon is missing, busy on a
   * cold model load, or routed somewhere weird.
   */
  async checkOllama(): Promise<
    | { available: true; sampleModel?: string; models: string[]; ollamaUrl: string }
    | {
        available: false;
        reason: 'not-running' | 'no-models' | 'invalid-url' | 'unknown';
        message: string;
        ollamaUrl: string;
      }
  > {
    const settings = this.read();
    const ollamaUrl = settings.ollamaUrl;
    try {
      assertSafeOllamaUrl(ollamaUrl);
    } catch (err) {
      return {
        available: false,
        reason: 'invalid-url',
        message: err instanceof Error ? err.message : 'Invalid Ollama URL',
        ollamaUrl,
      };
    }

    const url = `${ollamaUrl.replace(/\/$/, '')}/api/tags`;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 3_000);

    try {
      const res = await fetch(url, { signal: ac.signal });
      if (!res.ok) {
        return {
          available: false,
          reason: 'unknown',
          message: `Ollama returned HTTP ${res.status} from /api/tags`,
          ollamaUrl,
        };
      }
      const json = (await res.json()) as { models?: Array<{ name?: string }> };
      const models = (json.models ?? [])
        .map((m) => m.name)
        .filter((n): n is string => typeof n === 'string' && n.length > 0);
      if (models.length === 0) {
        return {
          available: false,
          reason: 'no-models',
          message:
            'Ollama is running but no models are installed. Pull one with: ollama pull llama3.2',
          ollamaUrl,
        };
      }
      const result: {
        available: true;
        sampleModel?: string;
        models: string[];
        ollamaUrl: string;
      } = { available: true, models, ollamaUrl };
      if (models[0] !== undefined) result.sampleModel = models[0];
      return result;
    } catch (err) {
      // Network refusal (ECONNREFUSED), DNS fail, abort — all map to
      // "the daemon isn't reachable." We don't try to distinguish them
      // because the user fix is the same: install / start Ollama.
      return {
        available: false,
        reason: 'not-running',
        message:
          err instanceof Error && err.name === 'AbortError'
            ? `Ollama did not respond within 3s at ${ollamaUrl}`
            : `Could not reach Ollama at ${ollamaUrl}`,
        ollamaUrl,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async generate(input: { action: AiAction; context: string; maxTokens?: number }): Promise<{
    text: string;
    provider: 'ollama';
    model: string;
  }> {
    const settings = this.read();
    const system = SYSTEM_PROMPT_PER_ACTION[input.action];
    const maxTokens = input.maxTokens ?? 600;

    // Defensive — `setSettings` already validates, but a stored value
    // from a prior version could pre-date the check.
    assertSafeOllamaUrl(settings.ollamaUrl);
    const url = `${settings.ollamaUrl.replace(/\/$/, '')}/api/generate`;

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), REQUEST_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: settings.model,
          system,
          prompt: input.context,
          stream: false,
          options: { num_predict: maxTokens },
        }),
        signal: ac.signal,
      });
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') {
        throw new Error('Ollama request timed out');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      const snippet = (await res.text().catch(() => '')).slice(0, 200);
      console.error('[AIService] ollama error', res.status, snippet);
      throw new Error(`Ollama HTTP ${res.status}`);
    }
    const json = (await res.json()) as { response?: string };
    const text = json.response ?? '';

    this.logUsage(input.action, settings.model, text.length);
    return { text, provider: 'ollama', model: settings.model };
  }
}
