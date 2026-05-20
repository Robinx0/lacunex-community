import { describe, it, expect } from 'vitest';
import { assertSafeOllamaUrl } from '../../src/main/services/AIService';

/**
 * Adversarial coverage for the Ollama URL guard. The previous version
 * only checked the protocol — a renderer could point Ollama at any
 * intranet host or cloud-metadata endpoint, and the response body
 * leaked back through the thrown error. This test pins the loopback-
 * only invariant against the obvious bypass attempts.
 */
describe('assertSafeOllamaUrl', () => {
  it.each([
    ['http://localhost:11434'],
    ['http://localhost'],
    ['http://127.0.0.1:11434'],
    ['https://localhost:11434'],
    ['http://[::1]:11434'],
    ['http://localhost:11434/api/'],
  ])('accepts loopback URL %s', (url) => {
    expect(() => assertSafeOllamaUrl(url)).not.toThrow();
  });

  it.each([
    // Cloud metadata services — the SSRF case the audit called out.
    ['http://169.254.169.254/latest/meta-data/iam/security-credentials/'],
    ['http://metadata.google.internal/computeMetadata/v1/'],
    // Intranet hosts.
    ['http://10.0.0.5:11434'],
    ['http://192.168.1.10:11434'],
    ['http://172.16.0.5:11434'],
    // External hosts dressed up as Ollama.
    ['http://attacker.example.com'],
    ['https://api.openai.com/v1'],
    // DNS-rebinding bait — `localhost.attacker.com` resolves to whatever
    // the attacker wants but is NOT a literal loopback identifier.
    ['http://localhost.attacker.com'],
    ['http://127.0.0.1.attacker.com'],
  ])('rejects non-loopback URL %s', (url) => {
    expect(() => assertSafeOllamaUrl(url)).toThrow(/localhost/i);
  });

  it.each([
    ['file:///etc/passwd'],
    ['gopher://localhost:11434'],
    ['javascript:alert(1)'],
    ['data:text/html,<script>x</script>'],
  ])('rejects non-http(s) protocol %s', (url) => {
    expect(() => assertSafeOllamaUrl(url)).toThrow(/http/i);
  });

  it('rejects malformed URLs', () => {
    expect(() => assertSafeOllamaUrl('not-a-url')).toThrow(/Invalid Ollama URL/);
  });
});
