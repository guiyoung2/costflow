#!/usr/bin/env node

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
  case "init":
    console.log("init: not implemented yet");
    break;
  case "hook":
    // Called by Claude Code hook — must exit 0 and not block
    process.exit(0);
    break;
  case "status":
    console.log("status: not implemented yet");
    break;
  case "uninstall":
    console.log("uninstall: not implemented yet");
    break;
  case "flush":
    console.log("flush: not implemented yet");
    break;
  default:
    showHelp();
}
