import { readConfig } from '../config';
import { drain, remove } from '../outbox';

export async function runFlush(): Promise<void> {
  const config = readConfig();
  if (!config) {
    console.log('costflow init을 먼저 실행하세요.');
    return;
  }

  const rows = drain(50);
  if (rows.length === 0) {
    console.log('outbox가 비어 있습니다.');
    return;
  }

  const successIds: number[] = [];
  let failCount = 0;

  for (const row of rows) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(`${config.base_url}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.api_key}`,
        },
        body: row.payload,
        signal: controller.signal,
      });

      if (res.ok) {
        successIds.push(row.id);
      } else {
        failCount++;
      }
    } catch {
      failCount++;
    } finally {
      clearTimeout(timer);
    }
  }

  remove(successIds);
  console.log(`성공 ${successIds.length}건, 실패 ${failCount}건`);
}
