import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { parseRolloutFile } from '../codex/parser';
import { maskPrompt } from '../hook-runner/masking';
import { sendEvent } from '../hook-runner/sender';

interface SessionState {
  lastSentTurnIndex: number;
}

interface FileState {
  mtime: number;
  sessions: Record<string, SessionState>;
}

interface SyncState {
  files: Record<string, FileState>;
}

const SYNC_STATE_PATH = path.join(os.homedir(), '.costflow', 'sync-state.json');

function loadSyncState(): SyncState {
  try {
    const raw = fs.readFileSync(SYNC_STATE_PATH, 'utf-8');
    return JSON.parse(raw) as SyncState;
  } catch {
    return { files: {} };
  }
}

function saveSyncState(state: SyncState): void {
  const dir = path.dirname(SYNC_STATE_PATH);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SYNC_STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
}

function findRolloutFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  function walk(current: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && /^rollout-.*\.jsonl$/.test(entry.name)) {
        results.push(full);
      }
    }
  }

  walk(dir);
  return results;
}

export async function runSync(options?: { codexHome?: string }): Promise<void> {
  const codexHome = options?.codexHome ?? path.join(os.homedir(), '.codex');
  const sessionsDir = path.join(codexHome, 'sessions');

  const files = findRolloutFiles(sessionsDir);

  if (files.length === 0) {
    console.log(`Codex 세션 파일 없음 (${sessionsDir})`);
    return;
  }

  const state = loadSyncState();
  let totalSent = 0;

  for (const filePath of files) {
    let stat: fs.Stats;
    try {
      stat = fs.statSync(filePath);
    } catch {
      continue;
    }
    const mtime = stat.mtimeMs;

    const fileState = state.files[filePath];
    if (fileState && fileState.mtime === mtime) {
      continue;
    }

    const turns = parseRolloutFile(filePath);

    if (!state.files[filePath]) {
      state.files[filePath] = { mtime, sessions: {} };
    }

    for (const turn of turns) {
      const sessionState = state.files[filePath].sessions[turn.session_id];
      const lastSent = sessionState?.lastSentTurnIndex ?? -1;

      if (turn.turn_index <= lastSent) continue;

      const maskedPrompt = turn.prompt ? maskPrompt(turn.prompt) : undefined;

      await sendEvent({
        hook_type: 'Stop',
        session_id: turn.session_id,
        timestamp: new Date().toISOString(),
        turn_index: turn.turn_index,
        prompt: maskedPrompt,
        token_usage: {
          input_tokens: turn.input_tokens,
          output_tokens: turn.output_tokens,
          cache_creation_tokens: turn.cache_creation_tokens,
          cache_read_tokens: turn.cache_read_tokens,
          token_source: 'actual',
        },
        model: turn.model ?? undefined,
        tool_use_names: turn.tool_use_names,
        agent: 'codex',
      });

      state.files[filePath].sessions[turn.session_id] = {
        lastSentTurnIndex: turn.turn_index,
      };

      totalSent++;
    }

    state.files[filePath].mtime = mtime;
  }

  saveSyncState(state);

  if (totalSent > 0) {
    console.log(`Codex sync 완료: ${totalSent}개 turn 전송`);
  } else {
    console.log('Codex sync: 새 turn 없음');
  }
}
