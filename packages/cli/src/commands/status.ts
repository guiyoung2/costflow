import * as path from 'path';
import * as fs from 'fs';
import { readConfig, configPath } from '../config';
import { hasCostflowHooks } from '../settings';

interface ProjectJson {
  project_name: string;
}

export function runStatus(): void {
  const config = readConfig();
  const projectJsonPath = path.join(process.cwd(), '.costflow', 'project.json');
  const settingsPath = path.join(process.cwd(), '.claude', 'settings.json');

  console.log('=== Costflow Status ===');

  if (config) {
    const masked = config.api_key.length >= 4
      ? `...${config.api_key.slice(-4)}`
      : '****';
    console.log(`Config:  ${configPath()}`);
    console.log(`  API key:  ${masked}`);
    console.log(`  Base URL: ${config.base_url}`);
  } else {
    console.log(`Config:  not found (run "costflow init")`);
  }

  if (fs.existsSync(projectJsonPath)) {
    const project = JSON.parse(fs.readFileSync(projectJsonPath, 'utf-8')) as ProjectJson;
    console.log(`Project: ${project.project_name}`);
  } else {
    console.log('Project: not connected');
  }

  const hooksOk = hasCostflowHooks(settingsPath);
  console.log(`Hooks:   ${hooksOk ? 'registered' : 'not registered'}`);
}
