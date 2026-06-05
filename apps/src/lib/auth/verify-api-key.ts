import { createHash } from 'crypto';
import { createServiceRoleClient } from '../supabase/service-role';

export interface ApiKeyPayload {
  userId: string;
  projectId: string | null;
}

export async function verifyApiKey(rawKey: string): Promise<ApiKeyPayload | null> {
  try {
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('api_keys')
      .select('user_id, project_id')
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .single();

    if (error || !data) return null;

    // Update last_used_at — fire and forget, failure does not affect auth result
    void supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('key_hash', keyHash);

    return {
      userId: data.user_id as string,
      projectId: (data.project_id as string | null) ?? null,
    };
  } catch {
    return null;
  }
}
