import * as readline from 'readline';
import * as tty from 'tty';
import * as fs from 'fs';
import * as path from 'path';
import { writeConfig } from '../config';
import { addCostflowHooks } from '../settings';

function promptSecret(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);

    const stdin = process.stdin as unknown as tty.ReadStream;
    const isTTY = process.stdin.isTTY;
    if (isTTY) stdin.setRawMode(true);
    process.stdin.resume();

    let input = '';
    const onData = (buf: Buffer): void => {
      const char = buf.toString('utf8');
      if (char === '\n' || char === '\r' || char === '') {
        if (isTTY) stdin.setRawMode(false);
        process.stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(input);
      } else if (char === '') {
        process.exit(0);
      } else if (char === '' || char === '\b') {
        input = input.slice(0, -1);
      } else {
        input += char;
      }
    };
    process.stdin.on('data', onData);
  });
}

function promptLine(question: string, defaultValue: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

export async function runInit(): Promise<void> {
  const api_key = await promptSecret('API key: ');
  const base_url = await promptLine(
    'Base URL (default: http://localhost:3000): ',
    'http://localhost:3000'
  );

  writeConfig({ api_key, base_url });

  const projectDir = path.join(process.cwd(), '.costflow');
  fs.mkdirSync(projectDir, { recursive: true });
  fs.writeFileSync(
    path.join(projectDir, 'project.json'),
    JSON.stringify(
      { project_name: path.basename(process.cwd()), created_at: new Date().toISOString() },
      null,
      2
    ),
    'utf-8'
  );

  addCostflowHooks(path.join(process.cwd(), '.claude', 'settings.json'));

  console.log('Costflow initialized successfully.');
}
