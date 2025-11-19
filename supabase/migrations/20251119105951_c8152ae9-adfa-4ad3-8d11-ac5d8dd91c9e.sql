-- Phase 1: Monetization System Database Foundation

-- 1. Barber Subscription Tiers Table
CREATE TABLE IF NOT EXISTS barber_subscription_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name TEXT NOT NULL UNIQUE CHECK (tier_name IN ('bronze', 'silver', 'gold')),
  display_name TEXT NOT NULL,
  price_monthly_cents INTEGER NOT NULL CHECK (price_monthly_cents > 0),
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default tiers
INSERT INTO barber_subscription_tiers (tier_name, display_name, price_monthly_cents, features) VALUES
  ('bronze', 'Bronze Creator', 1000, '[
    "Listed in Barbers Directory",
    "Access to Battle Portal",
    "3x Vote Power",
    "Create 1 battle per month",
    "Basic analytics dashboard",
    "Bronze profile badge"
  ]'::jsonb),
  ('silver', 'Silver Master', 2500, '[
    "All Bronze features",
    "Priority directory listing",
    "Create unlimited battles",
    "Create recurring challenges",
    "Advanced analytics & insights",
    "Portfolio video hosting (5 videos)",
    "10% discount on Barber Bucks",
    "15% discount on gear",
    "Animated Silver badge",
    "Featured profile rotation"
  ]'::jsonb),
  ('gold', 'Gold Elite', 5000, '[
    "All Silver features",
    "Premium directory placement",
    "Unlimited video hosting",
    "20% discount on Barber Bucks",
    "30% discount on all gear",
    "Access to Premium Elite Gear",
    "Custom profile URL",
    "Animated Gold badge",
    "Priority support",
    "Homepage carousel feature",
    "Early access to new features",
    "20% tournament entry discount"
  ]'::jsonb)
ON CONFLICT (tier_name) DO NOTHING;

-- 2. Barber Subscriptions Table
CREATE TABLE IF NOT EXISTS barber_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES barber_subscription_tiers(id) ON DELETE RESTRICT,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'expired', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Index for subscription lookups
CREATE INDEX IF NOT EXISTS idx_barber_subscriptions_user_id ON barber_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_barber_subscriptions_status ON barber_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_barber_subscriptions_stripe_id ON barber_subscriptions(stripe_subscription_id);

-- 3. Update barber_profiles with subscription tracking
ALTER TABLE barber_profiles 
  ADD COLUMN IF NOT EXISTS active_subscription_tier TEXT CHECK (active_subscription_tier IN ('bronze', 'silver', 'gold')),
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS battles_created_this_month INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_battle_reset TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Index for subscription tier filtering
CREATE INDEX IF NOT EXISTS idx_barber_profiles_subscription_tier ON barber_profiles(active_subscription_tier);

-- 4. Barber Bucks Transactions Table
CREATE TABLE IF NOT EXISTS barber_bucks_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Can be positive (credit) or negative (debit)
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'donation', 'appointment', 'gear_purchase', 'competition_entry', 'refund', 'bonus', 'admin_adjustment')),
  description TEXT,
  reference_id UUID, -- Links to related record (donation_id, order_id, etc)
  stripe_payment_id TEXT,
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast balance lookups and transaction history
CREATE INDEX IF NOT EXISTS idx_bb_transactions_user_date ON barber_bucks_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bb_transactions_type ON barber_bucks_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_bb_transactions_reference ON barber_bucks_transactions(reference_id) WHERE reference_id IS NOT NULL;

-- 5. Products Table (Gear & Merchandise)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('apparel', 'tools', 'accessories', 'digital')),
  tier_required TEXT CHECK (tier_required IN ('bronze', 'silver', 'gold')), -- null means everyone can purchase
  price_bb INTEGER NOT NULL CHECK (price_bb > 0), -- Price in Barber Bucks
  price_usd_cents INTEGER CHECK (price_usd_cents > 0), -- Optional USD price
  barber_discount_percent INTEGER NOT NULL DEFAULT 0 CHECK (barber_discount_percent >= 0 AND barber_discount_percent <= 100),
  is_premium_gear BOOLEAN NOT NULL DEFAULT false, -- Gold tier exclusive
  image_url TEXT,
  stock_quantity INTEGER CHECK (stock_quantity >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for product browsing and filtering
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_tier ON products(tier_required) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_premium ON products(is_premium_gear) WHERE is_active = true AND is_premium_gear = true;

-- 6. Product Orders Table
CREATE TABLE IF NOT EXISTS product_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  total_bb_cost INTEGER NOT NULL CHECK (total_bb_cost > 0),
  discount_applied INTEGER NOT NULL DEFAULT 0 CHECK (discount_applied >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'canceled', 'refunded')),
  shipping_address JSONB,
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for order tracking
CREATE INDEX IF NOT EXISTS idx_product_orders_user_id ON product_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_orders_status ON product_orders(status);

-- 7. RLS Policies for barber_subscription_tiers
ALTER TABLE barber_subscription_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view subscription tiers"
  ON barber_subscription_tiers
  FOR SELECT
  USING (true);

CREATE POLICY "Only system can modify tiers"
  ON barber_subscription_tiers
  FOR ALL
  USING (false);

-- 8. RLS Policies for barber_subscriptions
ALTER TABLE barber_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription"
  ON barber_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert subscriptions"
  ON barber_subscriptions
  FOR INSERT
  WITH CHECK (false); -- Only edge functions can insert

CREATE POLICY "System can update subscriptions"
  ON barber_subscriptions
  FOR UPDATE
  USING (false); -- Only edge functions can update

-- 9. RLS Policies for barber_bucks_transactions
ALTER TABLE barber_bucks_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions"
  ON barber_bucks_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert transactions"
  ON barber_bucks_transactions
  FOR INSERT
  WITH CHECK (false); -- Only edge functions can insert

-- 10. RLS Policies for products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products"
  ON products
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Only system can manage products"
  ON products
  FOR ALL
  USING (false);

-- 11. RLS Policies for product_orders
ALTER TABLE product_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders"
  ON product_orders
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create orders"
  ON product_orders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update orders"
  ON product_orders
  FOR UPDATE
  USING (false); -- Only edge functions can update order status

-- 12. Function to get current Barber Bucks balance
CREATE OR REPLACE FUNCTION get_barber_bucks_balance(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance INTEGER;
BEGIN
  -- Get latest balance from transactions
  SELECT balance_after INTO current_balance
  FROM barber_bucks_transactions
  WHERE user_id = user_uuid
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no transactions, return profile balance or 0
  IF current_balance IS NULL THEN
    SELECT COALESCE(barber_bucks, 0) INTO current_balance
    FROM profiles
    WHERE user_id = user_uuid;
  END IF;
  
  RETURN COALESCE(current_balance, 0);
END;
$$;

-- 13. Function to check if user has active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM barber_subscriptions
    WHERE user_id = user_uuid
      AND status = 'active'
      AND (current_period_end IS NULL OR current_period_end > NOW())
  );
END;
$$;

-- 14. Function to get user's subscription tier
CREATE OR REPLACE FUNCTION get_subscription_tier(user_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tier_name TEXT;
BEGIN
  SELECT bst.tier_name INTO tier_name
  FROM barber_subscriptions bs
  JOIN barber_subscription_tiers bst ON bs.tier_id = bst.id
  WHERE bs.user_id = user_uuid
    AND bs.status = 'active'
    AND (bs.current_period_end IS NULL OR bs.current_period_end > NOW())
  LIMIT 1;
  
  RETURN tier_name;
END;
$$;

-- 15. Trigger to update barber_profiles subscription fields
CREATE OR REPLACE FUNCTION sync_subscription_to_barber_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tier_name TEXT;
BEGIN
  -- Get tier name
  SELECT bst.tier_name INTO tier_name
  FROM barber_subscription_tiers bst
  WHERE bst.id = NEW.tier_id;
  
  -- Update barber_profiles
  UPDATE barber_profiles
  SET 
    active_subscription_tier = CASE 
      WHEN NEW.status = 'active' THEN tier_name
      ELSE NULL
    END,
    subscription_expires_at = NEW.current_period_end
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_subscription_change
  AFTER INSERT OR UPDATE ON barber_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_subscription_to_barber_profile();

-- 16. Trigger to auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_barber_subscriptions_timestamp
  BEFORE UPDATE ON barber_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_timestamp();

CREATE TRIGGER update_products_timestamp
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_timestamp();

CREATE TRIGGER update_product_orders_timestamp
  BEFORE UPDATE ON product_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_timestamp();

CREATE TRIGGER update_subscription_tiers_timestamp
  BEFORE UPDATE ON barber_subscription_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_timestamp();

-- 17. Monthly battle counter reset function
CREATE OR REPLACE FUNCTION reset_monthly_battle_counters()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE barber_profiles
  SET 
    battles_created_this_month = 0,
    last_battle_reset = NOW()
  WHERE last_battle_reset < DATE_TRUNC('month', NOW());
END;
$$;

COMMENT ON TABLE barber_subscription_tiers IS 'Defines the three subscription tiers: Bronze ($10), Silver ($25), Gold ($50)';
COMMENT ON TABLE barber_subscriptions IS 'Tracks active barber subscriptions with Stripe integration';
COMMENT ON TABLE barber_bucks_transactions IS 'Complete transaction history for Barber Bucks currency ($1 = 5 BB)';
COMMENT ON TABLE products IS 'Merchandise and gear catalog with tier-based access control';
COMMENT ON TABLE product_orders IS 'Order history for gear purchases using Barber Bucks';
COMMENT ON FUNCTION get_barber_bucks_balance IS 'Returns current Barber Bucks balance for a user';
COMMENT ON FUNCTION has_active_subscription IS 'Checks if user has an active paid subscription';
COMMENT ON FUNCTION get_subscription_tier IS 'Returns current subscription tier name (bronze/silver/gold)';
COMMENT ON FUNCTION reset_monthly_battle_counters IS 'Resets battle creation counter for Bronze tier users (run monthly via cron)';