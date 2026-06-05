const PATTERNS: [RegExp, string][] = [
  [/-----BEGIN [A-Z ]+ KEY-----[\s\S]*?-----END [A-Z ]+ KEY-----/g, '[REDACTED]'],
  [/sk-[A-Za-z0-9]{20,}/g, '[REDACTED]'],
  [/cf-[A-Za-z0-9]{20,}/g, '[REDACTED]'],
  [/AKIA[A-Z0-9]{16}/g, '[REDACTED]'],
  [/Bearer [A-Za-z0-9._-]{20,}/g, '[REDACTED]'],
  [/([A-Z_][A-Z0-9_]*)=([A-Za-z0-9!@#$%^&*()\-_+=[\]{};':"\\|,.<>/?]{20,})/g, '$1=[REDACTED]'],
];

export function maskPrompt(text: string): string {
  let result = text;
  for (const [pattern, replacement] of PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}
