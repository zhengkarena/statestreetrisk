import { get } from './storage.js';

export const DEFAULT_MODEL = 'claude-sonnet-4-6';
const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

// Typed error so callers can render the right UI for each case.
export class ClaudeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ClaudeError';
    this.code = code; // 'no_api_key' | 'aborted' | 'network' | 'api_error'
  }
}

// Single entry point. Returns the assistant's text response.
//   { system, user, model?, maxTokens?, signal? }
export async function callClaude({
  system,
  user,
  model = DEFAULT_MODEL,
  maxTokens = 4096,
  signal,
}) {
  const apiKey = (get('apiKey', '') || '').trim();
  if (!apiKey) {
    throw new ClaudeError(
      'no_api_key',
      'Add your Anthropic API key in Settings to use the AI Co-Pilot.',
    );
  }

  const body = {
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  };

  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new ClaudeError('aborted', 'Request cancelled.');
    }
    throw new ClaudeError('network', 'Network error: ' + (e.message || 'unknown'));
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const errBody = await res.json();
      detail = errBody?.error?.message || detail;
    } catch {
      /* keep statusText */
    }
    throw new ClaudeError('api_error', `API error (${res.status}): ${detail}`);
  }

  const json = await res.json();
  const text = (json.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
  return text;
}

// Lightweight connectivity ping used by the Settings panel.
// Sends max_tokens: 1 with a single-token user message.
export async function ping({ signal } = {}) {
  return callClaude({
    system: 'Reply with the single word: ok',
    user: 'ping',
    maxTokens: 1,
    signal,
  });
}
