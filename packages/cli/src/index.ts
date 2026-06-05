#!/usr/bin/env node

import { runInit } from './commands/init';
import { runHook } from './commands/hook';
import { runFlush } from './commands/flush';
import { runStatus } from './commands/status';
import { runUninstall } from './commands/uninstall';

const [, , command] = process.argv;

function showHelp(): void {
  console.log(`costflow <command>

Commands:
  init      Connect current project to Costflow
  hook      Called by Claude Code hook (internal)
  status    Show connection status
  uninstall Remove Costflow hook from current project
  flush     Resend failed events from local outbox
`);
}

switch (command) {
  case 'init':
    runInit().catch((err: unknown) => {
      console.error('Error:', err);
      process.exit(1);
    });
    break;
  case 'hook':
    runHook().catch(() => process.exit(0));
    break;
  case 'status':
    runStatus();
    break;
  case 'uninstall':
    runUninstall();
    break;
  case 'flush':
    runFlush().catch((err: unknown) => {
      console.error('Error:', err);
    });
    break;
  default:
    showHelp();
}
