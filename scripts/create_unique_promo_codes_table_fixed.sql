-- Create unique promo codes table
CREATE TABLE IF NOT EXISTS public.unique_promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.promotional_campaigns(id) ON DELETE CASCADE,
  promo_code TEXT NOT NULL UNIQUE,
  is_issued BOOLEAN DEFAULT FALSE,
  issued_to_email TEXT,
  issued_at TIMESTAMP WITH TIME ZONE,
  is_redeemed BOOLEAN DEFAULT FALSE,
  redeemed_at TIMESTAMP WITH TIME ZONE,
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_unique_promo_codes_campaign_id ON public.unique_promo_codes(campaign_id);
CREATE INDEX IF NOT EXISTS idx_unique_promo_codes_promo_code ON public.unique_promo_codes(promo_code);
CREATE INDEX IF NOT EXISTS idx_unique_promo_codes_issued_to_email ON public.unique_promo_codes(issued_to_email);
CREATE INDEX IF NOT EXISTS idx_unique_promo_codes_is_issued ON public.unique_promo_codes(is_issued);

-- Enable RLS
ALTER TABLE public.unique_promo_codes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Master admin can manage promo codes" ON public.unique_promo_codes;
DROP POLICY IF EXISTS "System can insert promo codes" ON public.unique_promo_codes;
DROP POLICY IF EXISTS "Public can view issued codes" ON public.unique_promo_codes;
DROP POLICY IF EXISTS "Anyone can view their own issued codes" ON public.unique_promo_codes;

-- RLS Policies
-- Master admin can do everything
CREATE POLICY "Master admin can manage promo codes"
ON public.unique_promo_codes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.superusers
    WHERE email = auth.jwt() ->> 'email'
    AND is_active = true
  )
);

-- System/API can insert codes during campaign creation (service role)
CREATE POLICY "System can insert promo codes"
ON public.unique_promo_codes
FOR INSERT
TO service_role
WITH CHECK (true);

-- System can update codes when issuing to users (service role)
CREATE POLICY "System can update promo codes"
ON public.unique_promo_codes
FOR UPDATE
TO service_role
USING (true);

-- Anyone can view their own issued codes
CREATE POLICY "Anyone can view their own issued codes"
ON public.unique_promo_codes
FOR SELECT
TO anon, authenticated
USING (
  is_issued = true 
  AND issued_to_email = current_setting('request.jwt.claims', true)::json->>'email'
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_unique_promo_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_unique_promo_codes_updated_at ON public.unique_promo_codes;
CREATE TRIGGER update_unique_promo_codes_updated_at
  BEFORE UPDATE ON public.unique_promo_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_unique_promo_codes_updated_at();

COMMENT ON TABLE public.unique_promo_codes IS 'Stores unique promo codes generated for each campaign';
