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
      const base = config.base_url.replace(/\/$/, '');
      const res = await fetch(`${base}/api/events`, {
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
        if (failCount === 1) {
          console.warn(`  첫 번째 실패 — HTTP ${res.status}: ${await res.text().catch(() => '(응답 없음)')}`);
        }
      }
    } catch (err) {
      failCount++;
      if (failCount === 1) {
        console.warn(`  첫 번째 실패 — 네트워크 에러: ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      clearTimeout(timer);
    }
  }

  remove(successIds);
  console.log(`성공 ${successIds.length}건, 실패 ${failCount}건`);
}
