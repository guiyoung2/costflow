import * as fs from 'fs';
import * as path from 'path';

const COSTFLOW_HOOK_COMMAND = "costflow hook";
const HOOK_EVENTS = ["UserPromptSubmit", "Stop", "SessionEnd", "PreCompact"] as const;

interface HookEntry {
  type: string;
  command: string;
  commandWindows?: string;
}

interface HookGroup {
  hooks: HookEntry[];
}

// Partial so index access returns HookGroup[] | undefined
type HooksMap = Partial<Record<string, HookGroup[]>>;
type Settings = { hooks?: HooksMap; [key: string]: unknown };

function readSettings(settingsPath: string): Settings {
  if (!fs.existsSync(settingsPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf-8')) as Settings;
  } catch {
    return {};
  }
}

function writeSettings(settingsPath: string, settings: Settings): void {
  const dir = path.dirname(settingsPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
}

export function addCostflowHooks(settingsPath: string): void {
  const settings = readSettings(settingsPath);
  if (!settings.hooks) settings.hooks = {};

  for (const event of HOOK_EVENTS) {
    const groups: HookGroup[] = settings.hooks[event] ?? [];
    const alreadyExists = groups.some(g =>
      g.hooks.some(h => h.command === COSTFLOW_HOOK_COMMAND)
    );
    if (!alreadyExists) {
      groups.push({ hooks: [{ type: "command", command: COSTFLOW_HOOK_COMMAND, commandWindows: COSTFLOW_HOOK_COMMAND }] });
    }
    settings.hooks[event] = groups;
  }

  writeSettings(settingsPath, settings);
}

export function removeCostflowHooks(settingsPath: string): void {
  if (!fs.existsSync(settingsPath)) return;
  const settings = readSettings(settingsPath);
  if (!settings.hooks) return;

  for (const event of HOOK_EVENTS) {
    const groups = settings.hooks[event];
    if (!groups) continue;

    const filtered = groups
      .map(g => ({ ...g, hooks: g.hooks.filter(h => h.command !== COSTFLOW_HOOK_COMMAND) }))
      .filter(g => g.hooks.length > 0);

    if (filtered.length === 0) {
      delete settings.hooks[event];
    } else {
      settings.hooks[event] = filtered;
    }
  }

  writeSettings(settingsPath, settings);
}

export function hasCostflowHooks(settingsPath: string): boolean {
  const settings = readSettings(settingsPath);
  if (!settings.hooks) return false;

  return HOOK_EVENTS.some(event => {
    const groups = settings.hooks?.[event];
    return groups?.some(g => g.hooks.some(h => h.command === COSTFLOW_HOOK_COMMAND)) ?? false;
  });
}

const CODEX_HOOK_COMMAND = "costflow hook --agent codex";
const CODEX_HOOK_EVENTS = ["Stop", "UserPromptSubmit"] as const;

export function addCodexHooks(hooksJsonPath: string): void {
  const settings = readSettings(hooksJsonPath);
  if (!settings.hooks) settings.hooks = {};

  for (const event of CODEX_HOOK_EVENTS) {
    const groups: HookGroup[] = settings.hooks[event] ?? [];
    let alreadyExists = false;
    for (const group of groups) {
      for (const hook of group.hooks) {
        if (hook.command === CODEX_HOOK_COMMAND) {
          alreadyExists = true;
          if (!hook.commandWindows) {
            hook.commandWindows = CODEX_HOOK_COMMAND;
          }
        }
      }
    }
    if (!alreadyExists) {
      groups.push({ hooks: [{ type: "command", command: CODEX_HOOK_COMMAND, commandWindows: CODEX_HOOK_COMMAND }] });
    }
    settings.hooks[event] = groups;
  }

  writeSettings(hooksJsonPath, settings);
}

export function removeCodexHooks(hooksJsonPath: string): void {
  if (!fs.existsSync(hooksJsonPath)) return;
  const settings = readSettings(hooksJsonPath);
  if (!settings.hooks) return;

  for (const event of CODEX_HOOK_EVENTS) {
    const groups = settings.hooks[event];
    if (!groups) continue;

    const filtered = groups
      .map(g => ({ ...g, hooks: g.hooks.filter(h => h.command !== CODEX_HOOK_COMMAND) }))
      .filter(g => g.hooks.length > 0);

    if (filtered.length === 0) {
      delete settings.hooks[event];
    } else {
      settings.hooks[event] = filtered;
    }
  }

  writeSettings(hooksJsonPath, settings);
}

export function hasCodexHooks(hooksJsonPath: string): boolean {
  const settings = readSettings(hooksJsonPath);
  if (!settings.hooks) return false;

  const matchesCodexHook = (h: HookEntry): boolean =>
    h.command.includes('hook --agent codex') ||
    (h.commandWindows !== undefined && h.commandWindows.includes('hook --agent codex'));

  return CODEX_HOOK_EVENTS.every(event => {
    const groups = settings.hooks?.[event];
    return groups?.some(g => g.hooks.some(matchesCodexHook)) ?? false;
  });
}
