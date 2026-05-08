import { get } from './storage.js';

export const DEFAULT_MODEL = 'gpt-4o-mini';
const ENDPOINT = 'https://api.openai.com/v1/chat/completions';

// Typed error so callers can render the right UI for each case.
export class AIError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AIError';
    this.code = code; // 'no_api_key' | 'aborted' | 'network' | 'api_error'
  }
}

// Single entry point. Returns the assistant's text response.
//   { system, user, model?, maxTokens?, signal? }
export async function callAI({
  system,
  user,
  model = DEFAULT_MODEL,
  maxTokens = 4096,
  signal,
}) {
  const apiKey = (get('apiKey', '') || '').trim();
  if (!apiKey) {
    throw new AIError(
      'no_api_key',
      'Add your OpenAI API key in Settings to use the AI Co-Pilot.',
    );
  }

  const body = {
    model,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  };

  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new AIError('aborted', 'Request cancelled.');
    }
    throw new AIError('network', 'Network error: ' + (e.message || 'unknown'));
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const errBody = await res.json();
      detail = errBody?.error?.message || detail;
    } catch {
      /* keep statusText */
    }
    throw new AIError('api_error', `API error (${res.status}): ${detail}`);
  }

  const json = await res.json();
  return json.choices?.[0]?.message?.content || '';
}

// Lightweight connectivity ping used by the Settings panel.
export async function ping({ signal } = {}) {
  return callAI({
    system: 'Reply with the single word: ok',
    user: 'ping',
    maxTokens: 5,
    signal,
  });
}
