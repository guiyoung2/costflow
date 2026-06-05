import * as fs from 'fs';

export interface CodexTurn {
  session_id: string;
  turn_index: number;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_creation_tokens: 0;
  tool_use_names: string[];
  prompt: string | null;
  agent: 'codex';
}

interface CumulativeTokens {
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
  reasoning_output_tokens: number;
}

interface TurnAccum {
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  tool_use_names: string[];
  prompt: string | null;
  hasTokenData: boolean;
}

function newAccum(): TurnAccum {
  return {
    model: null,
    input_tokens: 0,
    output_tokens: 0,
    cache_read_tokens: 0,
    tool_use_names: [],
    prompt: null,
    hasTokenData: false,
  };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function parseRolloutFile(filePath: string): CodexTurn[] {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split('\n').filter((l) => l.trim());

  let session_id = '';
  const results: CodexTurn[] = [];
  let turnIndex = 0;
  let inTurn = false;
  let accum: TurnAccum = newAccum();

  // Cumulative token totals across the entire session (grows monotonically)
  let prevCumulative: CumulativeTokens = {
    input_tokens: 0,
    cached_input_tokens: 0,
    output_tokens: 0,
    reasoning_output_tokens: 0,
  };

  for (const line of lines) {
    let record: unknown;
    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }
    if (!isObject(record)) continue;

    const type = record['type'] as string | undefined;
    const payload = record['payload'];

    // session_meta — extract session_id
    if (type === 'session_meta' && isObject(payload)) {
      if (typeof payload['id'] === 'string') session_id = payload['id'];
      continue;
    }

    // turn_context — capture model for current turn
    if (type === 'turn_context' && isObject(payload) && inTurn) {
      if (typeof payload['model'] === 'string') accum.model = payload['model'];
      continue;
    }

    if (type === 'event_msg' && isObject(payload)) {
      const ptype = payload['type'] as string | undefined;

      if (ptype === 'task_started') {
        inTurn = true;
        accum = newAccum();
        continue;
      }

      if (ptype === 'task_complete' && inTurn) {
        inTurn = false;
        if (accum.hasTokenData) {
          results.push({
            session_id,
            turn_index: turnIndex++,
            model: accum.model,
            input_tokens: accum.input_tokens,
            output_tokens: accum.output_tokens,
            cache_read_tokens: accum.cache_read_tokens,
            cache_creation_tokens: 0,
            tool_use_names: accum.tool_use_names,
            prompt: accum.prompt,
            agent: 'codex',
          });
        }
        continue;
      }

      if (ptype === 'user_message' && inTurn) {
        if (typeof payload['message'] === 'string') accum.prompt = payload['message'];
        continue;
      }

      if (ptype === 'token_count') {
        const info = payload['info'];
        if (!isObject(info)) continue;
        const total = info['total_token_usage'];
        if (!isObject(total)) continue;

        // Compute delta from previous cumulative (turn-by-turn delta)
        const curIn = (total['input_tokens'] as number) || 0;
        const curCached = (total['cached_input_tokens'] as number) || 0;
        const curOut = (total['output_tokens'] as number) || 0;
        const curReason = (total['reasoning_output_tokens'] as number) || 0;

        const deltaIn = curIn - prevCumulative.input_tokens;
        const deltaCached = curCached - prevCumulative.cached_input_tokens;
        const deltaOut = curOut - prevCumulative.output_tokens;
        const deltaReason = curReason - prevCumulative.reasoning_output_tokens;

        prevCumulative = {
          input_tokens: curIn,
          cached_input_tokens: curCached,
          output_tokens: curOut,
          reasoning_output_tokens: curReason,
        };

        // Skip zero-delta events (pre-2025-09 logs or no-cost events)
        if (deltaIn + deltaCached + deltaOut + deltaReason === 0) continue;

        if (inTurn) {
          accum.input_tokens += deltaIn;
          accum.cache_read_tokens += deltaCached;
          accum.output_tokens += deltaOut + deltaReason;
          accum.hasTokenData = true;
        }
        continue;
      }
    }

    // response_item — capture tool use names within a turn
    if (type === 'response_item' && isObject(payload) && inTurn) {
      if (payload['type'] === 'function_call' && typeof payload['name'] === 'string') {
        accum.tool_use_names.push(payload['name']);
      }
    }
  }

  return results;
}
