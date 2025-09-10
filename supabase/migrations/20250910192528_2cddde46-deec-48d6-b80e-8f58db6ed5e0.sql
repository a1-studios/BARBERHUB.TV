-- Create orders table to track battle entry payments
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id TEXT UNIQUE,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT DEFAULT 'pending',
  product_type TEXT DEFAULT 'battle_entry',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row-Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create policies for orders
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can insert orders" ON public.orders
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update orders" ON public.orders
  FOR UPDATE
  USING (true);

-- Add unique constraint to battle_votes to prevent duplicate votes
ALTER TABLE public.battle_votes 
ADD CONSTRAINT unique_user_battle_vote UNIQUE (voter_id, battle_id);

-- Add trigger for updated_at on orders
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();