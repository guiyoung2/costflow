import { parseTranscript } from '../hook-runner/transcript';
import { maskPrompt } from '../hook-runner/masking';
import { sendEvent as defaultSendEvent } from '../hook-runner/sender';
import type { TokenUsage } from '../hook-runner/transcript';
import type { HookEvent } from '../hook-runner/sender';
import { runSync as defaultRunSync } from './sync';

type Agent = 'claude' | 'codex';
type SendEventInput = Omit<HookEvent, 'project_name'>;

interface HookDependencies {
  sendEvent: (event: SendEventInput) => Promise<void>;
  runSync: () => Promise<void>;
}

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

export async function handleHookPayload(
  payload: Record<string, unknown>,
  agent: Agent,
  dependencies: HookDependencies = {
    sendEvent: defaultSendEvent,
    runSync: defaultRunSync,
  }
): Promise<void> {
  const hook_type = String(payload.hook_event_name ?? '');
  const session_id = String(payload.session_id ?? '');
  const timestamp = new Date().toISOString();

  if (agent === 'codex') {
    if (hook_type === 'Stop' || hook_type === 'SessionEnd') {
      await dependencies.runSync();
    }
    return;
  }

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

      await dependencies.sendEvent({ hook_type, session_id, timestamp, token_usage, model, tool_use_names, turn_index, agent });
      break;
    }
    case 'UserPromptSubmit': {
      const raw_prompt = String(payload.prompt ?? '');
      const prompt = maskPrompt(raw_prompt);
      await dependencies.sendEvent({ hook_type, session_id, timestamp, prompt, agent });
      break;
    }
    case 'PreCompact': {
      await dependencies.sendEvent({ hook_type, session_id, timestamp });
      break;
    }
    default:
      break;
  }
}

export async function runHook(): Promise<void> {
  const agentIdx = process.argv.indexOf('--agent');
  const agentRaw = agentIdx !== -1 ? process.argv[agentIdx + 1] : 'claude';
  const agent: Agent = agentRaw === 'codex' ? 'codex' : 'claude';

  const raw = await readStdin();

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    process.exit(0);
    return;
  }

  try {
    await handleHookPayload(payload, agent);
  } catch {
    // Hooks must never interrupt the editor/agent process.
  }

  process.exit(0);
}
