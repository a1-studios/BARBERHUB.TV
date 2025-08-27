-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_creator BOOLEAN DEFAULT false,
  creator_level TEXT DEFAULT 'Bronze' CHECK (creator_level IN ('Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond')),
  barber_bucks INTEGER DEFAULT 0,
  total_earnings INTEGER DEFAULT 0,
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create creator_content table for content tracking
CREATE TABLE public.creator_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('tutorial', 'technique', 'product_review', 'style_showcase', 'tip')),
  media_url TEXT,
  thumbnail_url TEXT,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  earnings INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create earning_transactions table for tracking earnings
CREATE TABLE public.earning_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('content_view', 'content_like', 'content_share', 'referral_bonus', 'milestone_bonus', 'manual_adjustment')),
  amount INTEGER NOT NULL,
  description TEXT,
  reference_id UUID, -- Can reference creator_content.id or other relevant entities
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create referral_tracking table
CREATE TABLE public.referral_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  bonus_earned INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create creator_milestones table
CREATE TABLE public.creator_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL CHECK (milestone_type IN ('first_content', 'views_milestone', 'likes_milestone', 'referral_milestone', 'level_up')),
  milestone_value INTEGER,
  reward_amount INTEGER NOT NULL,
  achieved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earning_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_milestones ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Creator content policies
CREATE POLICY "Content is viewable by everyone" ON public.creator_content FOR SELECT USING (status = 'published');
CREATE POLICY "Creators can manage their own content" ON public.creator_content FOR ALL USING (auth.uid() = creator_id);

-- Earning transactions policies
CREATE POLICY "Users can view their own transactions" ON public.earning_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert transactions" ON public.earning_transactions FOR INSERT WITH CHECK (true);

-- Referral tracking policies
CREATE POLICY "Users can view their referral data" ON public.referral_tracking 
FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
CREATE POLICY "System can manage referrals" ON public.referral_tracking FOR ALL USING (true);

-- Creator milestones policies
CREATE POLICY "Users can view their own milestones" ON public.creator_milestones FOR SELECT USING (auth.uid() = creator_id);
CREATE POLICY "System can insert milestones" ON public.creator_milestones FOR INSERT WITH CHECK (true);

-- Create functions for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_creator_content_updated_at
  BEFORE UPDATE ON public.creator_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate unique referral codes
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    code := 'BB' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = code) INTO exists;
    IF NOT exists THEN
      EXIT;
    END IF;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, referral_code)
  VALUES (NEW.id, public.generate_referral_code());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX idx_creator_content_creator_id ON public.creator_content(creator_id);
CREATE INDEX idx_creator_content_status ON public.creator_content(status);
CREATE INDEX idx_earning_transactions_user_id ON public.earning_transactions(user_id);
CREATE INDEX idx_referral_tracking_referrer_id ON public.referral_tracking(referrer_id);
CREATE INDEX idx_referral_tracking_referred_id ON public.referral_tracking(referred_id);