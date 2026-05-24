import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

export function createUserClient(req: Request): SupabaseClient {
  const authHeader = req.headers.get('Authorization') ?? '';
  return createClient(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_ANON_KEY'),
    {
      global: {
        headers: { Authorization: authHeader },
      },
    },
  );
}

export function createServiceClient(): SupabaseClient {
  return createClient(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  );
}

export async function requireUser(supabase: SupabaseClient) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Response(JSON.stringify({ error: 'not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return data.user;
}

export async function assertOrgAdmin(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data || (data.role !== 'owner' && data.role !== 'admin')) {
    throw new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
