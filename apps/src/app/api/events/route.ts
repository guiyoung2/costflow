import { verifyApiKey } from '../../../lib/auth/verify-api-key';
import { processEvent } from '../../../lib/ingestion';
import type { HookEvent } from '../../../types/hook-event';

export async function POST(request: Request): Promise<Response> {
  // ① Authorization 헤더 파싱
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const rawKey = authHeader.slice('Bearer '.length);

  // ② API key 검증
  const keyPayload = await verifyApiKey(rawKey);
  if (!keyPayload) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ③ 요청 바디 파싱 + 최소 검증
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: 'Bad Request' }, { status: 400 });
  }

  const { hook_type, session_id, project_name, timestamp } = body;
  if (
    typeof hook_type !== 'string' ||
    typeof session_id !== 'string' ||
    typeof project_name !== 'string' ||
    typeof timestamp !== 'string'
  ) {
    return Response.json({ error: 'Bad Request' }, { status: 400 });
  }

  const event = body as unknown as HookEvent;

  // ④ Ingestion 처리
  await processEvent(event, keyPayload.userId, keyPayload.projectId);

  // ⑤ 응답
  return Response.json({ ok: true }, { status: 200 });
}
