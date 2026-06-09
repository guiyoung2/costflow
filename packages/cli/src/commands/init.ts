import * as readline from 'readline';
import * as tty from 'tty';
import * as fs from 'fs';
import * as path from 'path';
import { writeConfig } from '../config';
import { addCostflowHooks, addCodexHooks } from '../settings';

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

  const codexAnswer = await promptLine(
    'Codex hook도 등록할까요? (Codex v0.114+ 필요) [y/N]: ',
    'N'
  );
  if (codexAnswer.toLowerCase() === 'y') {
    addCodexHooks(path.join(process.cwd(), '.codex', 'hooks.json'));
    console.log('Codex hook 등록 완료.');
    console.log('  → Codex를 열고 /hooks 메뉴에서 costflow를 trust 해주세요.');
    if (process.platform === 'win32') {
      console.log('  ⚠ Windows에서 Codex hook은 실험적 기능입니다.');
    }
  }

  console.log('Costflow initialized successfully.');
}
