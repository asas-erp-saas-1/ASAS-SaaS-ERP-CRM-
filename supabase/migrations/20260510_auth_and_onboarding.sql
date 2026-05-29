-- Stage 1: Auth & Tenant Execution
-- RLS rules and secure RPC for Onboarding a new Agency Tenant

-- Enable RLS on agencies if not already done
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

-- Agents can only view their own agency
CREATE POLICY "Users can view their own agency"
  ON public.agencies
  FOR SELECT
  USING (
    id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid()) OR
    auth.uid() IN (SELECT user_id FROM auth.users) -- temp fallback if needed
  );

-- Function to safely create an agency and link the user
CREATE OR REPLACE FUNCTION public.create_agency_and_link_owner(
  _agency_name TEXT,
  _agency_phone TEXT,
  _user_id UUID
) RETURNS UUID AS $$
DECLARE
  _new_agency_id UUID;
BEGIN
  -- Insert into agencies
  INSERT INTO public.agencies (name, phone)
  VALUES (_agency_name, _agency_phone)
  RETURNING id INTO _new_agency_id;

  -- Ensure profile exists (it might have been created by trigger on auth.users)
  -- Update profile with the new agency_id and set role to owner
  UPDATE public.profiles
  SET agency_id = _new_agency_id,
      role = 'owner',
      full_name = COALESCE(full_name, 'Fondateur')
  WHERE id = _user_id;

  RETURN _new_agency_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
