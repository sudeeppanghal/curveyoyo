-- ════════════════════════════════════════════════════
-- YoyoSMM — Supabase Setup SQL
-- Run this in your Supabase SQL Editor (supabase.com)
-- ════════════════════════════════════════════════════

-- 1. Enable Row Level Security on all tables
-- (Run AFTER Prisma has pushed the schema)

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Users: each user can only see their own row
CREATE POLICY "users_own" ON users
  FOR ALL USING (supabase_id = auth.uid()::text);

-- 3. Panels: user can only see/edit their own panels
CREATE POLICY "panels_own" ON panels
  FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE supabase_id = auth.uid()::text)
  );

-- 4. Reels: user can only see/edit their own reels
CREATE POLICY "reels_own" ON reels
  FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE supabase_id = auth.uid()::text)
  );

-- 5. Orders: user can only see/edit their own orders
CREATE POLICY "orders_own" ON orders
  FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE supabase_id = auth.uid()::text)
  );

-- 6. Delivery events: user sees only events for their orders
CREATE POLICY "delivery_events_own" ON delivery_events
  FOR ALL USING (
    order_id IN (
      SELECT id FROM orders WHERE
        user_id IN (SELECT id FROM users WHERE supabase_id = auth.uid()::text)
    )
  );

-- 7. Subscriptions: user sees only their own
CREATE POLICY "subscriptions_own" ON subscriptions
  FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE supabase_id = auth.uid()::text)
  );

-- 8. Audit logs: user sees only their own
CREATE POLICY "audit_logs_own" ON audit_logs
  FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE supabase_id = auth.uid()::text)
  );

-- 9. Allow service role to bypass all RLS (for API routes)
-- (This is automatic for the service role key — no policy needed)

-- ════════════════════════════════════════════════════
-- DONE! Your database is now secured with RLS.
-- ════════════════════════════════════════════════════
