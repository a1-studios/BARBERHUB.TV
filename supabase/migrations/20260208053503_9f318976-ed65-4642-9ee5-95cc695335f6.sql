-- Drop the broken INSERT policy on barber_bucks_transactions
DROP POLICY IF EXISTS "System can insert transactions" ON barber_bucks_transactions;

-- No public INSERT policy needed — edge functions use the service role key which bypasses RLS entirely.
-- The existing SELECT policy for users viewing their own transactions is correct and stays.