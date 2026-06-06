#!/usr/bin/env node

import { runInit } from './commands/init';
import { runHook } from './commands/hook';
import { runFlush } from './commands/flush';
import { runStatus } from './commands/status';
import { runUninstall } from './commands/uninstall';
import { runSync } from './commands/sync';
import { enableScheduler, disableScheduler } from './commands/codex';

const [, , command] = process.argv;

function showHelp(): void {
  console.log(`costflow <command>

Commands:
  init      Connect current project to Costflow
  hook      Called by Claude Code hook (internal)
  status    Show connection status
  uninstall Remove Costflow hook from current project
  flush     Resend failed events from local outbox
  sync      Sync Codex session files to Costflow
  codex     Manage Codex sync scheduler
    enable [--interval <분>]  Register OS scheduler (default: 5 min)
    disable                   Unregister OS scheduler
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
  case 'sync': {
    const codexHomeArg = process.argv.indexOf('--codex-home');
    const codexHome = codexHomeArg !== -1 ? process.argv[codexHomeArg + 1] : undefined;
    runSync({ codexHome }).catch((err: unknown) => {
      console.error('Error:', err);
      process.exit(1);
    });
    break;
  }
  case 'codex': {
    const subcommand = process.argv[3];
    const intervalArg = process.argv.indexOf('--interval');
    const intervalMinutes = intervalArg !== -1 ? parseInt(process.argv[intervalArg + 1], 10) : undefined;
    if (subcommand === 'enable') {
      enableScheduler({ intervalMinutes }).catch((err: unknown) => {
        console.error('Error:', err);
        process.exit(1);
      });
    } else if (subcommand === 'disable') {
      disableScheduler().catch((err: unknown) => {
        console.error('Error:', err);
        process.exit(1);
      });
    } else {
      console.log('Usage: costflow codex enable [--interval <분>]');
      console.log('       costflow codex disable');
    }
    break;
  }
  default:
    showHelp();
}
