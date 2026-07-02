// OpenClaw gateway client.
//
// OpenClaw exposes an OpenAI-compatible chat API. Routing to a specific agent
// is done via the `model` field: `openclaw/<agentId>`. We POST the messages and
// pull the assistant text out of the standard `choices[0].message.content`.
//
// Never throws — on any problem it returns a human-readable placeholder so the
// caller can always respond `ok: false` without a stack trace reaching the user.

import process from 'node:process'

export interface ChatMsg {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * Ask a specific OpenClaw agent. `agentId` is the agent's id on the gateway
 * (e.g. `claimsboard`, `main`). Returns the assistant reply text.
 */
export async function askAgent(
  agentId: string,
  messages: ChatMsg[],
): Promise<{ text: string, ok: boolean }> {
  // Read env lazily — server.ts loads .env after this module's imports run.
  const gatewayUrl = (process.env.OPENCLAW_GATEWAY_URL ?? '').replace(/\/$/, '')
  const token = process.env.OPENCLAW_TOKEN

  if (!token || !gatewayUrl) {
    return {
      ok: false,
      text: '[OpenClaw placeholder] Set OPENCLAW_GATEWAY_URL and OPENCLAW_TOKEN in .env to reach the gateway.',
    }
  }

  try {
    const res = await fetch(`${gatewayUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: `openclaw/${agentId}`,
        messages,
        stream: false,
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return {
        ok: false,
        text: `[OpenClaw error] Gateway returned ${res.status}: ${body.slice(0, 160)}`,
      }
    }

    const data = await res.json() as {
      choices?: { message?: { content?: string } }[]
    }
    const text = data.choices?.[0]?.message?.content?.trim()
    return { ok: true, text: text || '(empty reply)' }
  }
  catch (err) {
    console.error('[openclaw] request failed:', err)
    return { ok: false, text: '[OpenClaw error] Could not reach the gateway.' }
  }
}

/**
 * Legacy single-prompt wrapper — kept so existing callers (frank) compile.
 * Routes to the shared `main` agent.
 */
export async function askOpenClaw(prompt: string): Promise<{ text: string, ok: boolean }> {
  return askAgent('main', [{ role: 'user', content: prompt }])
}
