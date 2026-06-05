import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { parseRolloutFile } from './parser';

function writeTempFile(content: string): string {
  const file = path.join(os.tmpdir(), `codex-parser-test-${Date.now()}.jsonl`);
  fs.writeFileSync(file, content, 'utf-8');
  return file;
}

function j(obj: unknown): string {
  return JSON.stringify(obj);
}

// --- Fixture helpers ---

const SESSION_META = j({ type: 'session_meta', payload: { id: 'sess-abc' } });

function taskStarted(id: string): string {
  return j({ type: 'event_msg', payload: { type: 'task_started', turn_id: id } });
}

function taskComplete(id: string): string {
  return j({ type: 'event_msg', payload: { type: 'task_complete', turn_id: id } });
}

function turnCtx(model: string): string {
  return j({ type: 'turn_context', payload: { model } });
}

function userMsg(msg: string): string {
  return j({ type: 'event_msg', payload: { type: 'user_message', message: msg } });
}

function functionCall(name: string): string {
  return j({ type: 'response_item', payload: { type: 'function_call', name, arguments: '{}', call_id: 'c1' } });
}

function tokenCount(input: number, cached: number, output: number, reasoning: number): string {
  const total = {
    input_tokens: input,
    cached_input_tokens: cached,
    output_tokens: output,
    reasoning_output_tokens: reasoning,
    total_tokens: input + cached + output + reasoning,
  };
  return j({
    type: 'event_msg',
    payload: {
      type: 'token_count',
      info: { total_token_usage: total, last_token_usage: total, model_context_window: 128000 },
      rate_limits: null,
    },
  });
}

// Test 1: basic parsing — session_id, model, tool names, prompt, tokens
test('parses session_id, model, tool names, prompt, and tokens from a fixture', () => {
  const lines = [
    SESSION_META,
    taskStarted('t1'),
    turnCtx('gpt-5.5'),
    userMsg('hello codex'),
    functionCall('shell_command'),
    functionCall('read_file'),
    tokenCount(100, 10, 50, 5),
    taskComplete('t1'),
  ].join('\n');

  const file = writeTempFile(lines);
  const turns = parseRolloutFile(file);
  fs.unlinkSync(file);

  assert.equal(turns.length, 1);
  const t = turns[0];
  assert.equal(t.session_id, 'sess-abc');
  assert.equal(t.model, 'gpt-5.5');
  assert.equal(t.prompt, 'hello codex');
  assert.deepEqual(t.tool_use_names, ['shell_command', 'read_file']);
  assert.equal(t.input_tokens, 100);
  assert.equal(t.cache_read_tokens, 10);
  assert.equal(t.output_tokens, 55); // 50 + 5 reasoning
  assert.equal(t.cache_creation_tokens, 0);
  assert.equal(t.agent, 'codex');
  assert.equal(t.turn_index, 0);
});

// Test 2: cumulative delta calculation
// session cumulative: [0] → turn1: [100] → turn2: [250] → turn3: [250+80=330]
// expected per-turn input_tokens: [100, 150, 80]
test('computes token usage as delta of cumulative values across turns', () => {
  const lines = [
    SESSION_META,
    taskStarted('t1'),
    tokenCount(100, 0, 0, 0),
    taskComplete('t1'),
    taskStarted('t2'),
    tokenCount(250, 0, 0, 0),
    taskComplete('t2'),
    taskStarted('t3'),
    tokenCount(330, 0, 0, 0),
    taskComplete('t3'),
  ].join('\n');

  const file = writeTempFile(lines);
  const turns = parseRolloutFile(file);
  fs.unlinkSync(file);

  assert.equal(turns.length, 3);
  assert.equal(turns[0].input_tokens, 100); // 100 - 0
  assert.equal(turns[1].input_tokens, 150); // 250 - 100
  assert.equal(turns[2].input_tokens, 80);  // 330 - 250
});

// Test 3: turns with zero token delta are ignored (pre-2025-09 logs)
test('ignores turns where all token deltas are zero', () => {
  const lines = [
    SESSION_META,
    // zero-token turn (external import / pre-2025-09 style)
    taskStarted('t-zero'),
    tokenCount(0, 0, 0, 0),
    taskComplete('t-zero'),
    // turn with no token_count event at all
    taskStarted('t-notoken'),
    userMsg('a message'),
    taskComplete('t-notoken'),
    // real turn
    taskStarted('t-real'),
    tokenCount(200, 0, 50, 0),
    taskComplete('t-real'),
  ].join('\n');

  const file = writeTempFile(lines);
  const turns = parseRolloutFile(file);
  fs.unlinkSync(file);

  assert.equal(turns.length, 1);
  assert.equal(turns[0].input_tokens, 200);
  assert.equal(turns[0].output_tokens, 50);
  assert.equal(turns[0].turn_index, 0);
});
