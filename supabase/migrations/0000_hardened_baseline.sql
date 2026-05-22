-- 0000 · Hardened baseline (default-deny on public)
--
-- Why: Supabase grants USAGE on public + broad table access by default.
-- One forgotten "ENABLE ROW LEVEL SECURITY" can expose every row.
-- We revoke first, then grant only what each table needs (see 0001_*).
--
-- Learn: defense-in-depth = privilege layer AND RLS must both allow an action.

revoke all on schema public from anon, authenticated;

revoke all on all tables in schema public from anon, authenticated;

revoke all on all sequences in schema public from anon, authenticated;

revoke all on all functions in schema public from anon, authenticated;

-- Schema access only; table privileges are granted per-table in later migrations.
grant usage on schema public to anon, authenticated;
