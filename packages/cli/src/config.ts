import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface CostflowConfig {
  api_key: string;
  base_url: string;
}

export function configPath(): string {
  return path.join(os.homedir(), '.costflow', 'config.json');
}

export function readConfig(): CostflowConfig | null {
  const p = configPath();
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as CostflowConfig;
  } catch {
    return null;
  }
}

export function writeConfig(config: CostflowConfig): void {
  const dir = path.dirname(configPath());
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(config, null, 2), 'utf-8');
}
