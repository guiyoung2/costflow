import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { parseTranscript } from './transcript';

function writeTempFile(content: string): string {
  const file = path.join(os.tmpdir(), `transcript-test-${Date.now()}.jsonl`);
  fs.writeFileSync(file, content, 'utf-8');
  return file;
}

function j(obj: unknown): string {
  return JSON.stringify(obj);
}

function assistantTurn(model = 'claude-opus-4-5', withUsage = true): string {
  const usage = withUsage
    ? {
        input_tokens: 100,
        output_tokens: 50,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 10,
      }
    : undefined;
  return j({
    type: 'assistant',
    message: {
      model,
      content: [{ type: 'tool_use', name: 'Read', id: 't1' }],
      ...(usage ? { usage } : {}),
    },
  });
}

test('1-turn-returns-zero', () => {
  const file = writeTempFile(assistantTurn());
  const result = parseTranscript(file);
  fs.unlinkSync(file);
  assert.equal(result.turn_index, 0);
});

test('3-turn-returns-two', () => {
  const lines = [assistantTurn(), assistantTurn(), assistantTurn()].join('\n');
  const file = writeTempFile(lines);
  const result = parseTranscript(file);
  fs.unlinkSync(file);
  assert.equal(result.turn_index, 2);
});

test('no-assistant-returns-zero', () => {
  const file = writeTempFile('');
  const result = parseTranscript(file);
  fs.unlinkSync(file);
  assert.equal(result.turn_index, 0);
});

test('no-usage-non-negative', () => {
  const file = writeTempFile(assistantTurn('claude-opus-4-5', false));
  const result = parseTranscript(file);
  fs.unlinkSync(file);
  assert.ok(result.turn_index >= 0);
});
