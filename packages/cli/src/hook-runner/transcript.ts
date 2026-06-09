import * as fs from 'fs';

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  token_source: 'actual' | 'unknown';
}

export interface TranscriptSummary {
  model: string | null;
  token_usage: TokenUsage | null;
  tool_use_names: string[];
  turn_index: number;
}

export function parseTranscript(transcriptPath: string): TranscriptSummary {
  try {
    const lines = fs.readFileSync(transcriptPath, 'utf-8').split('\n').filter((l) => l.trim());
    let lastAssistant: Record<string, unknown> | null = null;
    let turn_index = -1;

    for (const line of lines) {
      try {
        const record = JSON.parse(line) as Record<string, unknown>;
        if (record.type === 'assistant') {
          lastAssistant = record;
          turn_index++;
        }
      } catch {
        // skip malformed lines
      }
    }

    if (!lastAssistant) return { model: null, token_usage: null, tool_use_names: [], turn_index: 0 };

    const message = lastAssistant.message as Record<string, unknown> | undefined;
    const model = typeof message?.model === 'string' ? message.model : null;
    const usage = message?.usage as Record<string, unknown> | undefined;

    const tool_use_names: string[] = [];
    const content = message?.content;
    if (Array.isArray(content)) {
      for (const item of content as Record<string, unknown>[]) {
        if (item.type === 'tool_use' && typeof item.name === 'string') {
          tool_use_names.push(item.name);
        }
      }
    }

    const input_tokens = usage?.input_tokens;
    const output_tokens = usage?.output_tokens;
    const cache_creation_tokens = usage?.cache_creation_input_tokens;
    const cache_read_tokens = usage?.cache_read_input_tokens;

    if (
      typeof input_tokens !== 'number' ||
      typeof output_tokens !== 'number' ||
      typeof cache_creation_tokens !== 'number' ||
      typeof cache_read_tokens !== 'number'
    ) {
      return { model, token_usage: null, tool_use_names, turn_index };
    }

    return {
      model,
      token_usage: {
        input_tokens,
        output_tokens,
        cache_creation_tokens,
        cache_read_tokens,
        token_source: 'actual',
      },
      tool_use_names,
      turn_index,
    };
  } catch {
    return { model: null, token_usage: null, tool_use_names: [], turn_index: 0 };
  }
}
