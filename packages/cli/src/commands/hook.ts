import { parseTranscript } from '../hook-runner/transcript';
import { maskPrompt } from '../hook-runner/masking';
import { sendEvent } from '../hook-runner/sender';
import type { TokenUsage } from '../hook-runner/transcript';

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk: string) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
  });
}

export async function runHook(): Promise<void> {
  const agentIdx = process.argv.indexOf('--agent');
  const agent = (agentIdx !== -1 ? process.argv[agentIdx + 1] : 'claude') as 'claude' | 'codex';

  const raw = await readStdin();

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    process.exit(0);
    return;
  }

  const hook_type = String(payload.hook_event_name ?? '');
  const session_id = String(payload.session_id ?? '');
  const timestamp = new Date().toISOString();

  try {
    switch (hook_type) {
      case 'Stop':
      case 'SessionEnd': {
        const transcript_path = payload.transcript_path as string | undefined;
        let token_usage: TokenUsage | undefined;
        let model: string | undefined;
        let tool_use_names: string[] | undefined;

        let turn_index: number | undefined;
        if (transcript_path) {
          const summary = parseTranscript(transcript_path);
          token_usage = summary.token_usage ?? undefined;
          model = summary.model ?? undefined;
          tool_use_names = summary.tool_use_names;
          turn_index = summary.turn_index;
        }

        await sendEvent({ hook_type, session_id, timestamp, token_usage, model, tool_use_names, turn_index, agent });
        break;
      }
      case 'UserPromptSubmit': {
        const raw_prompt = String(payload.prompt ?? '');
        const prompt = maskPrompt(raw_prompt);
        await sendEvent({ hook_type, session_id, timestamp, prompt, agent });
        break;
      }
      case 'PreCompact': {
        await sendEvent({ hook_type, session_id, timestamp });
        break;
      }
      default:
        break;
    }
  } catch {
    // sendEvent never throws, but defensive catch
  }

  process.exit(0);
}
