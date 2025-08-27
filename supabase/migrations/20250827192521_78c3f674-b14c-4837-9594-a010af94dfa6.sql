-- Update the handle_new_user function to include user_type
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, referral_code, display_name, user_type)
  VALUES (
    NEW.id, 
    public.generate_referral_code(),
    NEW.raw_user_meta_data ->> 'display_name',
    COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'fan')
  );
  RETURN NEW;
END;
$function$;