import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const TASK_NAME = 'CostflowSync';
const PLIST_ID = 'com.costflow.sync';
const PLIST_PATH = path.join(os.homedir(), 'Library', 'LaunchAgents', `${PLIST_ID}.plist`);

const VBS_RUNNER_PATH = path.join(os.homedir(), '.costflow', 'sync-runner.vbs');

function registerWindows(intervalMinutes: number): void {
  const nodePath = process.execPath;
  const scriptPath = process.argv[1];
  const workingDir = os.homedir();

  // VBScript 래퍼: 창 완전 숨김(0) + WorkingDirectory 설정
  const vbs = [
    `Set oShell = CreateObject("WScript.Shell")`,
    `oShell.CurrentDirectory = "${workingDir}"`,
    `oShell.Run """${nodePath}"" ""${scriptPath}"" sync", 0, False`,
  ].join('\r\n');

  fs.mkdirSync(path.dirname(VBS_RUNNER_PATH), { recursive: true });
  fs.writeFileSync(VBS_RUNNER_PATH, vbs, 'utf-8');

  const result = spawnSync(
    'schtasks',
    ['/create', '/tn', TASK_NAME, '/tr', `wscript.exe "${VBS_RUNNER_PATH}"`, '/sc', 'minute', '/mo', String(intervalMinutes), '/f'],
    { stdio: 'inherit' }
  );
  if (result.status !== 0) {
    throw new Error('schtasks 등록 실패');
  }
  console.log(`스케줄러 등록됨: ${intervalMinutes}분 간격으로 costflow sync 실행`);
}

function unregisterWindows(): void {
  const result = spawnSync('schtasks', ['/delete', '/tn', TASK_NAME, '/f'], { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error('schtasks 해제 실패');
  }
  if (fs.existsSync(VBS_RUNNER_PATH)) {
    fs.unlinkSync(VBS_RUNNER_PATH);
  }
  console.log('스케줄러 해제됨');
}

function registerMacOS(intervalMinutes: number): void {
  const plistArgs = [process.execPath, process.argv[1], 'sync']
    .map(a => `    <string>${a}</string>`)
    .join('\n');

  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${PLIST_ID}</string>
  <key>ProgramArguments</key>
  <array>
${plistArgs}
  </array>
  <key>StartInterval</key>
  <integer>${intervalMinutes * 60}</integer>
  <key>RunAtLoad</key>
  <false/>
</dict>
</plist>`;

  fs.mkdirSync(path.dirname(PLIST_PATH), { recursive: true });
  fs.writeFileSync(PLIST_PATH, plist, 'utf-8');

  const result = spawnSync('launchctl', ['load', PLIST_PATH], { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error('launchctl load 실패');
  }
  console.log(`스케줄러 등록됨: ${intervalMinutes}분 간격으로 costflow sync 실행`);
}

function unregisterMacOS(): void {
  spawnSync('launchctl', ['unload', PLIST_PATH], { stdio: 'inherit' });
  if (fs.existsSync(PLIST_PATH)) {
    fs.unlinkSync(PLIST_PATH);
  }
  console.log('스케줄러 해제됨');
}

export async function enableScheduler(options?: { intervalMinutes?: number }): Promise<void> {
  const intervalMinutes = options?.intervalMinutes ?? 5;
  if (process.platform === 'win32') {
    registerWindows(intervalMinutes);
  } else if (process.platform === 'darwin') {
    registerMacOS(intervalMinutes);
  } else {
    console.error('Linux/other는 지원하지 않습니다. cron에 직접 등록하세요.');
    process.exit(1);
  }
}

export async function disableScheduler(): Promise<void> {
  if (process.platform === 'win32') {
    unregisterWindows();
  } else if (process.platform === 'darwin') {
    unregisterMacOS();
  } else {
    console.error('Linux/other는 지원하지 않습니다. cron에 직접 등록하세요.');
    process.exit(1);
  }
}
