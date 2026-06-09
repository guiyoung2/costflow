import { createServiceRoleClient } from '../supabase/service-role';
import type { HookEvent } from '../../types/hook-event';

export async function processEvent(
  event: HookEvent,
  userId: string,
  apiKeyProjectId: string | null,
): Promise<void> {
  const supabase = createServiceRoleClient();

  // ① project 해석 (feat-2)
  let projectId: string;
  try {
    if (apiKeyProjectId) {
      projectId = apiKeyProjectId;
    } else {
      const { data: existing } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', userId)
        .eq('name', event.project_name)
        .maybeSingle();

      if (existing) {
        projectId = existing.id as string;
      } else {
        const { data: inserted, error } = await supabase
          .from('projects')
          .insert({ user_id: userId, name: event.project_name })
          .select('id')
          .single();
        if (error || !inserted) return;
        projectId = inserted.id as string;
      }
    }
  } catch {
    return;
  }

  // ② session upsert (feat-3)
  let sessionId: string;
  try {
    const { data: existing } = await supabase
      .from('sessions')
      .select('id')
      .eq('project_id', projectId)
      .eq('session_id_ext', event.session_id)
      .maybeSingle();

    if (existing) {
      sessionId = existing.id as string;
      if (event.hook_type === 'Stop' && event.model) {
        await supabase.from('sessions').update({ model: event.model }).eq('id', sessionId);
      } else if (event.hook_type === 'SessionEnd') {
        await supabase.from('sessions').update({ ended_at: event.timestamp }).eq('id', sessionId);
      }
    } else {
      const sessionInsert: Record<string, unknown> = {
        project_id: projectId,
        session_id_ext: event.session_id,
        started_at: event.timestamp,
        agent: event.agent ?? 'claude',
      };
      const { data: inserted, error } = await supabase
        .from('sessions')
        .insert(sessionInsert)
        .select('id')
        .single();
      if (error || !inserted) return;
      sessionId = inserted.id as string;
    }
  } catch {
    return;
  }

  // ④ prompt 저장 모드 결정 (feat-7) — event INSERT 전에 payload 결정
  const eventPayload: Record<string, unknown> = { ...event };
  if (event.hook_type === 'UserPromptSubmit') {
    try {
      const { data: settings } = await supabase
        .from('prompt_storage_settings')
        .select('mode')
        .eq('user_id', userId)
        .maybeSingle();

      const mode = (settings?.mode as string | undefined) ?? 'redacted';
      if (mode === 'redacted') {
        eventPayload['prompt'] = '[redacted]';
      } else if (mode === 'metadata_only') {
        eventPayload['prompt'] = null;
      }
      // 'raw': 원문 그대로
    } catch {
      eventPayload['prompt'] = '[redacted]';
    }
  }

  // ③ event INSERT (feat-5, feat-6)
  let eventId: string | null = null;
  try {
    const { data: insertedEvent } = await supabase
      .from('events')
      .insert({
        session_id: sessionId,
        type: event.hook_type,
        turn_index: event.turn_index ?? null,
        token_source: event.token_usage?.token_source ?? 'unknown',
        payload: eventPayload,
      })
      .select('id')
      .single();
    if (insertedEvent) eventId = insertedEvent.id as string;
  } catch {
    // continue to token_usage upsert regardless
  }

  // ⑤ token_usage upsert (feat-4, feat-6)
  if (
    event.hook_type === 'Stop' &&
    event.token_usage &&
    event.turn_index !== undefined
  ) {
    try {
      await supabase.from('token_usage').upsert(
        {
          session_id: sessionId,
          event_id: eventId,
          turn_index: event.turn_index,
          input_tokens: event.token_usage.input_tokens,
          output_tokens: event.token_usage.output_tokens,
          cache_creation_tokens: event.token_usage.cache_creation_tokens,
          cache_read_tokens: event.token_usage.cache_read_tokens,
        },
        { onConflict: 'session_id,turn_index' },
      );
    } catch {
      // swallow
    }
  }

  // ⑥ messages INSERT (UserPromptSubmit only)
  if (event.hook_type === 'UserPromptSubmit' && eventPayload['prompt'] != null) {
    try {
      await supabase.from('messages').upsert(
        {
          session_id: sessionId,
          turn_index: event.turn_index ?? 0,
          role: 'user',
          content: eventPayload['prompt'] as string,
        },
        { onConflict: 'session_id,turn_index,role', ignoreDuplicates: true },
      );
    } catch {
      // swallow
    }
  }

  // ⑦ tool_calls INSERT (Stop + non-empty tool_use_names)
  if (
    event.hook_type === 'Stop' &&
    event.tool_use_names &&
    event.tool_use_names.length > 0
  ) {
    try {
      await supabase.from('tool_calls').upsert(
        event.tool_use_names.map((toolName) => ({
          session_id: sessionId,
          event_id: eventId,
          turn_index: event.turn_index ?? null,
          tool_name: toolName,
        })),
        { onConflict: 'session_id,turn_index,tool_name', ignoreDuplicates: true },
      );
    } catch {
      // swallow
    }
  }
}
