import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleHookPayload } from './hook';
import type { HookEvent } from '../hook-runner/sender';

function deps() {
  const sent: Omit<HookEvent, 'project_name'>[] = [];
  let syncs = 0;
  return {
    sent,
    get syncs() {
      return syncs;
    },
    dependencies: {
      sendEvent: async (event: Omit<HookEvent, 'project_name'>) => {
        sent.push(event);
      },
      runSync: async () => {
        syncs++;
      },
    },
  };
}

test('codex stop hook runs sync without sending tokenless event', async () => {
  const state = deps();

  await handleHookPayload(
    { hook_event_name: 'Stop', session_id: 'codex-session' },
    'codex',
    state.dependencies
  );

  assert.equal(state.syncs, 1);
  assert.equal(state.sent.length, 0);
});

test('codex prompt hook does not send duplicate prompt-only event', async () => {
  const state = deps();

  await handleHookPayload(
    { hook_event_name: 'UserPromptSubmit', session_id: 'codex-session', prompt: 'hello' },
    'codex',
    state.dependencies
  );

  assert.equal(state.syncs, 0);
  assert.equal(state.sent.length, 0);
});

