import { randomBytes } from 'crypto';

export function generateMessageId(): string {
  return `msg_${randomBytes(8).toString('hex')}`;
}

export function validateQueueName(name: string): boolean {
  // Only allow alphanumeric, hyphens, underscores
  return /^[a-zA-Z0-9_-]+$/.test(name) && name.length <= 64 && name.length > 0;
}

export function parseRedisInfo(info: string, key: string): string | null {
  const lines = info.split('\r\n');
  for (const line of lines) {
    if (line.startsWith(`${key}:`)) {
      return line.split(':')[1];
    }
  }
  return null;
}
