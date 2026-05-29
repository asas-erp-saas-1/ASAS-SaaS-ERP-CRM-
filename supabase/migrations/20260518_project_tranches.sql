-- Stage 12: Project Tranches & Appels de Fonds Orchestration

CREATE TABLE public.project_tranches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    percentage NUMERIC(5,2) NOT NULL,
    is_triggered BOOLEAN NOT NULL DEFAULT false,
    triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.project_tranches ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation Policy
CREATE POLICY "tenant_isolation_project_tranches" ON public.project_tranches
    FOR ALL
    USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID)
    WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);

-- Bootstrap default tranches into any existing projects via a trigger
CREATE OR REPLACE FUNCTION bootstrap_default_project_tranches()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.project_tranches (agency_id, project_id, label, percentage, is_triggered, triggered_at)
    VALUES 
        (NEW.agency_id, NEW.id, 'Réservation (Signature)', 20, true, NOW()),
        (NEW.agency_id, NEW.id, 'Achèvement Fondations', 15, false, null),
        (NEW.agency_id, NEW.id, 'Dalle RDC', 10, false, null),
        (NEW.agency_id, NEW.id, 'Hors d''eau (Toiture)', 20, false, null),
        (NEW.agency_id, NEW.id, 'Menuiseries & Cloisons', 15, false, null),
        (NEW.agency_id, NEW.id, 'Remise des Clés', 20, false, null);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_project_created
    AFTER INSERT ON public.projects
    FOR EACH ROW
    EXECUTE PROCEDURE bootstrap_default_project_tranches();

-- Also backfill existing projects if any exist
DO $$
DECLARE
    p RECORD;
BEGIN
    FOR p IN SELECT id, agency_id FROM public.projects LOOP
        IF NOT EXISTS (SELECT 1 FROM public.project_tranches WHERE project_id = p.id) THEN
            INSERT INTO public.project_tranches (agency_id, project_id, label, percentage, is_triggered, triggered_at)
            VALUES 
                (p.agency_id, p.id, 'Réservation (Signature)', 20, true, NOW()),
                (p.agency_id, p.id, 'Achèvement Fondations', 15, false, null),
                (p.agency_id, p.id, 'Dalle RDC', 10, false, null),
                (p.agency_id, p.id, 'Hors d''eau (Toiture)', 20, false, null),
                (p.agency_id, p.id, 'Menuiseries & Cloisons', 15, false, null),
                (p.agency_id, p.id, 'Remise des Clés', 20, false, null);
        END IF;
    END LOOP;
END;
$$;
