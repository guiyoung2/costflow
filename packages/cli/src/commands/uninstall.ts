import * as path from 'path';
import * as fs from 'fs';
import { removeCostflowHooks, removeCodexHooks } from '../settings';

export function runUninstall(): void {
  const settingsPath = path.join(process.cwd(), '.claude', 'settings.json');
  const projectJsonPath = path.join(process.cwd(), '.costflow', 'project.json');

  removeCostflowHooks(settingsPath);
  console.log('Removed Costflow hooks from .claude/settings.json');

  const codexHooksPath = path.join(process.cwd(), '.codex', 'hooks.json');
  if (fs.existsSync(codexHooksPath)) {
    removeCodexHooks(codexHooksPath);
    console.log('Removed Costflow hooks from .codex/hooks.json');
  }

  if (fs.existsSync(projectJsonPath)) {
    fs.unlinkSync(projectJsonPath);
    console.log('Removed .costflow/project.json');
  }

  console.log('Uninstall complete. ~/.costflow/config.json preserved.');
}
