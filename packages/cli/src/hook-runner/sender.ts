import * as fs from 'fs';
import * as path from 'path';
import { readConfig } from '../config';
import { enqueue } from '../outbox';
import type { TokenUsage } from './transcript';

export interface HookEvent {
  hook_type: string;
  session_id: string;
  project_name: string;
  timestamp: string;
  turn_index?: number;
  prompt?: string;
  token_usage?: TokenUsage;
  model?: string;
  tool_use_names?: string[];
  agent?: 'claude' | 'codex';
}

type SendEventInput = Omit<HookEvent, 'project_name'>;

function getProjectName(): string {
  try {
    const raw = fs.readFileSync(
      path.join(process.cwd(), '.costflow', 'project.json'),
      'utf-8'
    );
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed.project_name === 'string') return parsed.project_name;
  } catch {
    // fall through
  }
  return path.basename(process.cwd());
}

export async function sendEvent(event: SendEventInput): Promise<void> {
  try {
    const project_name = getProjectName();
    const fullEvent: HookEvent = { ...event, project_name };

    const config = readConfig();
    if (!config) {
      enqueue(fullEvent);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(`${config.base_url}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.api_key}`,
        },
        body: JSON.stringify(fullEvent),
        signal: controller.signal,
      });

      if (!res.ok) {
        enqueue(fullEvent);
      }
    } catch {
      enqueue(fullEvent);
    } finally {
      clearTimeout(timer);
    }
  } catch {
    // silently swallow — must never throw
  }
}
