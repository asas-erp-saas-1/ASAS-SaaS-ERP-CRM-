-- =============================================================================
-- PHASE H: DECISION INTELLIGENCE, FORECASTING & EXECUTIVE OPERATIONS SCHEMA
-- =============================================================================

-- 1. KPI SNAPSHOTS & HISTORICAL RUNS
CREATE TABLE IF NOT EXISTS public.kpi_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    metric_namespace TEXT NOT NULL, -- 'financial', 'commercial', 'construction', 'recovery', 'sla'
    metric_key TEXT NOT NULL,       -- e.g., 'cash_burn_rate_dzd', 'delinquency_ratio_percent'
    metric_value NUMERIC(20, 4) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_agency_date_metric UNIQUE (agency_id, snapshot_date, metric_namespace, metric_key)
);

-- 2. CASHFLOW & TREASURY FORECASTING MODELS
CREATE TABLE IF NOT EXISTS public.forecasting_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    model_type TEXT NOT NULL DEFAULT 'monte_carlo' CHECK (model_type IN ('deterministic', 'monte_carlo', 'linear_trend', 'algerian_delayed_financing')),
    parameters JSONB NOT NULL DEFAULT '{}'::jsonb, -- Confidence parameters, delay coefficients
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.forecasting_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    model_id UUID NOT NULL REFERENCES public.forecasting_models(id) ON DELETE CASCADE,
    run_date DATE NOT NULL DEFAULT CURRENT_DATE,
    horizon_months INTEGER NOT NULL DEFAULT 12 CHECK (horizon_months > 0),
    confidence_level NUMERIC(4, 3) DEFAULT 0.950 CHECK (confidence_level > 0.500),
    execution_status TEXT NOT NULL DEFAULT 'completed' CHECK (execution_status IN ('pending', 'running', 'completed', 'failed')),
    summary_metrics JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g. Max stress deficit, median cash reserves
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.treasury_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    run_id UUID NOT NULL REFERENCES public.forecasting_runs(id) ON DELETE CASCADE,
    prediction_date DATE NOT NULL,
    predicted_inflow NUMERIC(20, 2) NOT NULL DEFAULT 0.00,
    predicted_outflow NUMERIC(20, 2) NOT NULL DEFAULT 0.00,
    expected_balance NUMERIC(20, 2) NOT NULL DEFAULT 0.00,
    p10_balance NUMERIC(20, 2), -- 10% confidence interval (worst-case stress)
    p90_balance NUMERIC(20, 2), -- 90% confidence interval (best-case velocity)
    uncollected_delay_impact NUMERIC(20, 2) DEFAULT 0.00, -- Specific to bank delay impact (DZD)
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CUSTOMER DELINQUENCY & COLLECTION RISK SCORES
CREATE TABLE IF NOT EXISTS public.delinquency_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    delinquency_probability NUMERIC(4, 3) NOT NULL CHECK (delinquency_probability BETWEEN 0.000 AND 1.000),
    risk_tier TEXT NOT NULL CHECK (risk_tier IN ('low', 'medium', 'high', 'critical')),
    weighted_score NUMERIC(5, 2) NOT NULL, -- Consolidated scoring engine output
    underlying_factors JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g. ['late_bank_agreement', 'whatsapp_unresponsive']
    payment_instability_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    escalation_triggered BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. CONSTRUCTION PROGRESSION & CHANTIER PROFITABILITY EROSION RISK
CREATE TABLE IF NOT EXISTS public.chantier_risk_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    delay_index_days INTEGER NOT NULL DEFAULT 0,
    cost_overrun_ratio NUMERIC(5, 4) NOT NULL DEFAULT 0.0000, -- e.g. 1.1500 indicates 15% override
    material_shortage_index NUMERIC(4, 3) NOT NULL DEFAULT 0.000,
    subcontractor_reliability NUMERIC(4, 3) NOT NULL DEFAULT 1.000,
    estimated_margin_erosion NUMERIC(20, 2) NOT NULL DEFAULT 0.00, -- Projected profit drop (DZD)
    critical_blockages JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'nominal' CHECK (status IN ('nominal', 'under_observation', 'critical')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. BRANCH PERFORMANCE COMPARATIVE SCORES (NETWORK ANALYTICS)
CREATE TABLE IF NOT EXISTS public.branch_health_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL, -- Polmorphic or explicit relation (often matches branch profiles or teams)
    evaluation_month DATE NOT NULL,
    sales_velocity_score NUMERIC(4, 3) NOT NULL,
    collection_velocity_score NUMERIC(4, 3) NOT NULL,
    sla_compliance_score NUMERIC(4, 3) NOT NULL,
    capital_efficiency_index NUMERIC(4, 3) NOT NULL,
    rank_in_agency INTEGER CHECK (rank_in_agency > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_agency_month_branch UNIQUE (agency_id, evaluation_month, branch_id)
);

-- 6. EXECUTIVE ACTIONABLE DECISION ALERTS
CREATE TABLE IF NOT EXISTS public.operational_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('medium', 'high', 'critical')),
    namespace TEXT NOT NULL, -- 'treasury', 'construction', 'crm_growth', 'sla_leak'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    associated_entity_id UUID,
    associated_entity_type TEXT,
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action_taken TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- PERFORMANCE TUNING INDEXES FOR ANALYTICAL WORKLOADS
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_kpi_snapshots_lookup ON public.kpi_snapshots(agency_id, snapshot_date, metric_namespace);
CREATE INDEX IF NOT EXISTS idx_treasury_pred_run ON public.treasury_predictions(run_id, prediction_date ASC);
CREATE INDEX IF NOT EXISTS idx_delinquency_prob ON public.delinquency_predictions(agency_id, risk_tier) WHERE delinquency_probability > 0.500;
CREATE INDEX IF NOT EXISTS idx_chantier_risk_proj ON public.chantier_risk_scores(project_id, assessment_date DESC);
CREATE INDEX IF NOT EXISTS idx_op_alerts_unresolved ON public.operational_alerts(agency_id, severity) WHERE is_resolved = false;

-- =============================================================================
-- TENANT ROW LEVEL SECURITY CODES
-- =============================================================================
ALTER TABLE public.kpi_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecasting_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecasting_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delinquency_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chantier_risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_kpi_snapshots" ON public.kpi_snapshots FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_forecasting_models" ON public.forecasting_models FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_forecasting_runs" ON public.forecasting_runs FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_treasury_predictions" ON public.treasury_predictions FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_delinquency_predictions" ON public.delinquency_predictions FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_chantier_risk_scores" ON public.chantier_risk_scores FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_branch_health_scores" ON public.branch_health_scores FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
CREATE POLICY "tenant_isolation_decision_alerts" ON public.operational_alerts FOR ALL USING (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID) WITH CHECK (agency_id = (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID);
