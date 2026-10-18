-- 00023_fix_series_rls.sql
-- HALAQA H2-FIX-02 (DEC-H013): security extension beyond inherited 00001-00022.
-- Extension from 00023 authorized by DEC-H009. No inherited file is touched (H7).
-- F-RLS-01: public.series carries 5 policies (inherited 00006) but RLS was never ENABLEd upstream.
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;

-- Explicit extension dependency documentation for future reprovisioning:
-- Supabase hosted projects install these extensions in schema "extensions".
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;