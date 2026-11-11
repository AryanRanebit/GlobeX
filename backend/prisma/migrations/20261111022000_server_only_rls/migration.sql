-- GlobeX accesses these tables only through the trusted Prisma backend.
-- Custom application JWTs are not Supabase Auth tokens. Do not add public
-- auth.uid() policies here. postgres backend access remains unchanged.
BEGIN;
ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comtrade_cache ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.analysis_history, public.trade_flows,
  public.comtrade_cache FROM anon, authenticated;
COMMIT;
