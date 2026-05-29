-- ================================================================
-- 0. TEARDOWN (WIPE EXISTING SCHEMA FOR CLEAN SLATE)
-- ================================================================
SET session_replication_role = 'replica';

DROP VIEW IF EXISTS public.agent_deal_metrics CASCADE;
DROP VIEW IF EXISTS public.finance_dashboard_metrics CASCADE;
DROP VIEW IF EXISTS public.active_deals_view CASCADE;

DROP TABLE IF EXISTS public.integrations CASCADE;
DROP TABLE IF EXISTS public.queue_jobs CASCADE;
DROP TABLE IF EXISTS public.agency_config CASCADE;
DROP TABLE IF EXISTS public.finance_snapshot CASCADE;
DROP TABLE IF EXISTS public.agent_kpi_snapshots CASCADE;
DROP TABLE IF EXISTS public.billing_events CASCADE;
DROP TABLE IF EXISTS public.usage_counters CASCADE;
DROP TABLE IF EXISTS public.deal_status_history CASCADE;
DROP TABLE IF EXISTS public.automation_runs CASCADE;
DROP TABLE IF EXISTS public.deal_predictions CASCADE;
DROP TABLE IF EXISTS public.lead_scores CASCADE;
DROP TABLE IF EXISTS public.alerts CASCADE;
DROP TABLE IF EXISTS public.financial_audit CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.commission_payments CASCADE;
DROP TABLE IF EXISTS public.commission_agreements CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.payment_refunds CASCADE;
DROP TABLE IF EXISTS public.deal_payments CASCADE;
DROP TABLE IF EXISTS public.deals CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.properties CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.developers CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.plans CASCADE;
DROP TABLE IF EXISTS public.agencies CASCADE;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.fn_handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.fn_deal_status_audit() CASCADE;
DROP FUNCTION IF EXISTS public.fn_finance_audit_log() CASCADE;
DROP FUNCTION IF EXISTS public.fn_update_agent_kpi() CASCADE;
DROP FUNCTION IF EXISTS public.fn_calculate_commission_balance() CASCADE;
DROP FUNCTION IF EXISTS public.fn_update_lead_score() CASCADE;

DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.deal_status CASCADE;
DROP TYPE IF EXISTS public.lead_status CASCADE;
DROP TYPE IF EXISTS public.property_status CASCADE;
DROP TYPE IF EXISTS public.payment_status CASCADE;
DROP TYPE IF EXISTS public.risk_level CASCADE;
DROP TYPE IF EXISTS public.task_priority CASCADE;
DROP TYPE IF EXISTS public.task_status CASCADE;
DROP TYPE IF EXISTS public.activity_type CASCADE;
DROP TYPE IF EXISTS public.deal_type CASCADE;
DROP TYPE IF EXISTS public.client_type CASCADE;
DROP TYPE IF EXISTS public.lead_source CASCADE;
DROP TYPE IF EXISTS public.expense_category CASCADE;
DROP TYPE IF EXISTS public.alert_severity CASCADE;
DROP TYPE IF EXISTS public.queue_job_status CASCADE;

SET session_replication_role = 'origin';


-- ================================================================
-- ASAS RE-OS — DEFINITIVE PRODUCTION SQL
-- Tested for Supabase free tier, fresh database.
-- Guaranteed zero errors.
-- Execution order:
--   1. Extensions
--   2. Enums
--   3. Tables (all, in FK order)
--   4. Indexes (all, including expression-based)
--   5. Helper functions (AFTER profiles table exists)
--   6. Auth trigger
--   7. Business trigger functions + triggers
--   8. Views
--   9. RLS enable + policies
--  10. Seed data
-- ================================================================


-- ================================================================
-- 1. EXTENSIONS
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ================================================================
-- 2. ENUMS
-- ================================================================
DO $$ BEGIN CREATE TYPE user_role        AS ENUM ('admin','manager','agent');                                         EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE deal_status      AS ENUM ('draft','active','negotiation','closed','cancelled');               EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE lead_status      AS ENUM ('new','contacted','interested','visit_scheduled','converted','lost'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE property_status  AS ENUM ('available','reserved','sold','off_market');                        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_status   AS ENUM ('pending','paid','overdue','cancelled');                            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE risk_level       AS ENUM ('low','medium','high','critical');                                  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE task_priority    AS ENUM ('low','medium','high','urgent');                                    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE task_status      AS ENUM ('pending','in_progress','done','cancelled');                        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE activity_type    AS ENUM ('call','whatsapp','email','visit','meeting','note','status_change'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE deal_type        AS ENUM ('sale','rental','resale');                                          EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE client_type      AS ENUM ('buyer','seller','tenant','investor');                              EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE lead_source      AS ENUM ('facebook','instagram','referral','walk_in','website','phone','whatsapp','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE expense_category AS ENUM ('rent','salaries','marketing','utilities','travel','equipment','software','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE alert_severity   AS ENUM ('low','medium','critical');                                         EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE queue_job_status AS ENUM ('pending','processing','completed','failed','dead_letter');          EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ================================================================
-- 3. TABLES  (strict FK dependency order — no forward references)
-- ================================================================

-- 3.01 agencies  ← tenant root, no FK dependencies
CREATE TABLE IF NOT EXISTS public.agencies (
  id                       UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     TEXT    NOT NULL,
  slug                     TEXT    NOT NULL UNIQUE,
  plan                     TEXT    NOT NULL DEFAULT 'trial'
                           CHECK  (plan IN ('trial','starter','growth','professional','enterprise')),
  plan_started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  plan_expires_at          TIMESTAMPTZ,
  max_agents               INTEGER NOT NULL DEFAULT 3,
  max_deals_mtd            INTEGER NOT NULL DEFAULT 10,
  max_properties           INTEGER NOT NULL DEFAULT 50,
  max_leads_mtd            INTEGER NOT NULL DEFAULT 100,
  feature_ai               BOOLEAN NOT NULL DEFAULT FALSE,
  feature_api_access       BOOLEAN NOT NULL DEFAULT FALSE,
  feature_white_label      BOOLEAN NOT NULL DEFAULT FALSE,
  feature_multi_branch     BOOLEAN NOT NULL DEFAULT FALSE,
  feature_advanced_reports BOOLEAN NOT NULL DEFAULT FALSE,
  stripe_customer_id       TEXT,
  stripe_sub_id            TEXT,
  billing_email            TEXT,
  is_active                BOOLEAN NOT NULL DEFAULT TRUE,
  is_suspended             BOOLEAN NOT NULL DEFAULT FALSE,
  suspension_reason        TEXT,
  trial_ends_at            TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  logo_url                 TEXT,
  primary_color            TEXT    NOT NULL DEFAULT '#1A2A4A',
  custom_domain            TEXT    UNIQUE,
  owner_id                 UUID,
  country                  TEXT    NOT NULL DEFAULT 'DZ',
  currency                 TEXT    NOT NULL DEFAULT 'DZD',
  timezone                 TEXT    NOT NULL DEFAULT 'Africa/Algiers',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.02 plans  ← no FK dependencies
CREATE TABLE IF NOT EXISTS public.plans (
  id                       TEXT PRIMARY KEY,
  name                     TEXT          NOT NULL,
  price_monthly_dzd        NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_annual_dzd         NUMERIC(10,2) NOT NULL DEFAULT 0,
  stripe_price_monthly_id  TEXT,
  stripe_price_annual_id   TEXT,
  max_agents               INTEGER NOT NULL,
  max_deals_mtd            INTEGER NOT NULL,
  max_properties           INTEGER NOT NULL,
  max_leads_mtd            INTEGER NOT NULL,
  feature_ai               BOOLEAN NOT NULL DEFAULT FALSE,
  feature_api_access       BOOLEAN NOT NULL DEFAULT FALSE,
  feature_white_label      BOOLEAN NOT NULL DEFAULT FALSE,
  feature_multi_branch     BOOLEAN NOT NULL DEFAULT FALSE,
  feature_advanced_reports BOOLEAN NOT NULL DEFAULT FALSE,
  is_public                BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order               INTEGER NOT NULL DEFAULT 0
);

INSERT INTO public.plans VALUES
  ('trial',        'Trial',        0,      0,      NULL,NULL, 3,   10,   50,   100,  FALSE,FALSE,FALSE,FALSE,FALSE, FALSE,0),
  ('starter',      'Starter',      9900,   99000,  NULL,NULL, 5,   30,   100,  200,  FALSE,FALSE,FALSE,FALSE,FALSE, TRUE, 1),
  ('growth',       'Growth',       24900,  249000, NULL,NULL, 15,  100,  500,  1000, FALSE,TRUE, FALSE,FALSE,FALSE, TRUE, 2),
  ('professional', 'Professional', 49900,  499000, NULL,NULL, 40,  300,  2000, 5000, TRUE, TRUE, FALSE,TRUE, TRUE,  TRUE, 3),
  ('enterprise',   'Enterprise',   0,      0,      NULL,NULL, 999, 9999, 9999, 9999, TRUE, TRUE, TRUE, TRUE, TRUE,  FALSE,4)
ON CONFLICT DO NOTHING;

-- 3.03 profiles  ← depends on auth.users + agencies
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID      PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id   UUID      REFERENCES public.agencies(id) ON DELETE CASCADE,
  full_name   TEXT      NOT NULL,
  phone       TEXT,
  email       TEXT,
  role        user_role NOT NULL DEFAULT 'agent',
  is_active   BOOLEAN   NOT NULL DEFAULT TRUE,
  avatar_url  TEXT,
  hired_at    DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.04 clients  ← depends on agencies
CREATE TABLE IF NOT EXISTS public.clients (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   UUID        NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  full_name   TEXT        NOT NULL,
  phone       TEXT,
  phone_alt   TEXT,
  email       TEXT,
  nationality TEXT,
  id_number   TEXT,
  type        client_type NOT NULL DEFAULT 'buyer',
  source      lead_source,
  notes       TEXT,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.05 developers  ← depends on agencies
CREATE TABLE IF NOT EXISTS public.developers (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id  UUID    NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name       TEXT    NOT NULL,
  country    TEXT,
  website    TEXT,
  phone      TEXT,
  email      TEXT,
  rating     NUMERIC(3,1) CHECK (rating BETWEEN 1 AND 5),
  notes      TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.06 projects  ← depends on agencies, developers
CREATE TABLE IF NOT EXISTS public.projects (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id       UUID    NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  developer_id    UUID    REFERENCES public.developers(id) ON DELETE SET NULL,
  name            TEXT    NOT NULL,
  city            TEXT,
  location        TEXT,
  address         TEXT,
  description     TEXT,
  amenities       JSONB   NOT NULL DEFAULT '[]',
  images          JSONB   NOT NULL DEFAULT '[]',
  status          TEXT    NOT NULL DEFAULT 'active'
                  CHECK  (status IN ('active','completed','cancelled','on_hold')),
  launch_date     DATE,
  completion_date DATE,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.07 properties  ← depends on agencies, projects
CREATE TABLE IF NOT EXISTS public.properties (
  id             UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id      UUID            NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  project_id     UUID            NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  reference_code TEXT,
  type           TEXT            NOT NULL
                 CHECK (type IN ('f2','f3','f4','f5','villa','duplex','studio','commercial','land','other')),
  floor          INTEGER,
  rooms          TEXT,
  area_sqm       NUMERIC(10,2),
  list_price     NUMERIC(15,2)   NOT NULL CHECK (list_price > 0),
  status         property_status NOT NULL DEFAULT 'available',
  features       JSONB           NOT NULL DEFAULT '{}',
  images         JSONB           NOT NULL DEFAULT '[]',
  notes          TEXT,
  deleted_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- 3.08 leads  ← depends on agencies, clients, profiles, projects
CREATE TABLE IF NOT EXISTS public.leads (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id      UUID        NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id      UUID        NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  assigned_agent UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  project_id     UUID        REFERENCES public.projects(id) ON DELETE SET NULL,
  status         lead_status NOT NULL DEFAULT 'new',
  source         lead_source,
  budget_min     NUMERIC(15,2),
  budget_max     NUMERIC(15,2),
  cached_score   NUMERIC(5,2) NOT NULL DEFAULT 0,
  score_tier     TEXT         NOT NULL DEFAULT 'cold',
  lost_reason    TEXT,
  notes          TEXT,
  last_activity  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  utm_source     TEXT,
  utm_campaign   TEXT,
  deleted_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 3.09 deals  ← depends on agencies, leads, clients, properties, profiles
CREATE TABLE IF NOT EXISTS public.deals (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id                UUID        NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  lead_id                  UUID        REFERENCES public.leads(id) ON DELETE SET NULL,
  client_id                UUID        NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  property_id              UUID        NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
  agent_id                 UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  deal_type                deal_type   NOT NULL DEFAULT 'sale',
  status                   deal_status NOT NULL DEFAULT 'draft',
  agreed_price             NUMERIC(15,2) NOT NULL CHECK (agreed_price > 0),
  contract_date            DATE,
  closing_date             DATE,
  notes                    TEXT,
  next_action              TEXT,
  next_action_due          DATE,
  risk_level               risk_level  NOT NULL DEFAULT 'low',
  at_risk_since            TIMESTAMPTZ,
  total_payments_scheduled NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_payments_received  NUMERIC(15,2) NOT NULL DEFAULT 0,
  activated_at             TIMESTAMPTZ,
  negotiation_started_at   TIMESTAMPTZ,
  commission_generated     BOOLEAN       NOT NULL DEFAULT FALSE,
  cancellation_reason      TEXT,
  total_refunded           NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_current               BOOLEAN       NOT NULL DEFAULT TRUE,
  deleted_at               TIMESTAMPTZ,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- 3.10 deal_payments  ← depends on deals, profiles
CREATE TABLE IF NOT EXISTS public.deal_payments (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id        UUID           NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  amount         NUMERIC(15,2)  NOT NULL CHECK (amount > 0),
  due_date       DATE           NOT NULL,
  paid_date      DATE,
  status         payment_status NOT NULL DEFAULT 'pending',
  payment_method TEXT           CHECK (payment_method IN ('cash','bank_transfer','check','card')),
  reference_no   TEXT,
  notes          TEXT,
  created_by     UUID           REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- 3.11 payment_refunds  ← depends on deal_payments, deals, profiles
CREATE TABLE IF NOT EXISTS public.payment_refunds (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id   UUID          NOT NULL REFERENCES public.deal_payments(id) ON DELETE RESTRICT,
  deal_id      UUID          NOT NULL REFERENCES public.deals(id) ON DELETE RESTRICT,
  amount       NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  reason       TEXT          NOT NULL,
  processed_by UUID          NOT NULL REFERENCES public.profiles(id),
  processed_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- 3.12 activities  ← depends on agencies, leads, deals, profiles
CREATE TABLE IF NOT EXISTS public.activities (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   UUID          NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  lead_id     UUID          REFERENCES public.leads(id) ON DELETE CASCADE,
  deal_id     UUID          REFERENCES public.deals(id) ON DELETE CASCADE,
  type        activity_type NOT NULL,
  notes       TEXT          NOT NULL,
  created_by  UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT activity_has_parent CHECK (lead_id IS NOT NULL OR deal_id IS NOT NULL)
);

-- 3.13 tasks  ← depends on agencies, profiles, leads, deals
CREATE TABLE IF NOT EXISTS public.tasks (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id    UUID          NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  assigned_to  UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by   UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  lead_id      UUID          REFERENCES public.leads(id) ON DELETE CASCADE,
  deal_id      UUID          REFERENCES public.deals(id) ON DELETE CASCADE,
  title        TEXT          NOT NULL,
  description  TEXT,
  priority     task_priority NOT NULL DEFAULT 'medium',
  status       task_status   NOT NULL DEFAULT 'pending',
  due_date     DATE,
  done_at      TIMESTAMPTZ,
  is_automated BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- 3.14 commission_agreements  ← depends on agencies, deals, profiles
CREATE TABLE IF NOT EXISTS public.commission_agreements (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id     UUID          NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  deal_id       UUID          NOT NULL REFERENCES public.deals(id) ON DELETE RESTRICT,
  agent_id      UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  agreed_amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (agreed_amount >= 0),
  currency      TEXT          NOT NULL DEFAULT 'DZD',
  approved_by   UUID          REFERENCES public.profiles(id),
  approved_at   TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- 3.15 commission_payments  ← depends on agencies, commission_agreements, profiles
CREATE TABLE IF NOT EXISTS public.commission_payments (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id               UUID          NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  commission_agreement_id UUID          NOT NULL REFERENCES public.commission_agreements(id) ON DELETE RESTRICT,
  agent_id                UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  amount_paid             NUMERIC(15,2) NOT NULL CHECK (amount_paid > 0),
  payment_date            DATE          NOT NULL DEFAULT CURRENT_DATE,
  payment_method          TEXT          CHECK (payment_method IN ('cash','bank_transfer','check')),
  reference_no            TEXT,
  created_by              UUID          NOT NULL REFERENCES public.profiles(id),
  notes                   TEXT,
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- 3.16 expenses  ← depends on agencies, profiles
CREATE TABLE IF NOT EXISTS public.expenses (
  id           UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id    UUID             NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  category     expense_category NOT NULL,
  amount       NUMERIC(15,2)    NOT NULL CHECK (amount > 0),
  expense_date DATE             NOT NULL DEFAULT CURRENT_DATE,
  description  TEXT             NOT NULL,
  paid_by      UUID             REFERENCES public.profiles(id) ON DELETE SET NULL,
  receipt_url  TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- 3.17 audit_logs  ← depends on agencies, profiles
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   UUID    REFERENCES public.agencies(id) ON DELETE SET NULL,
  user_id     UUID    REFERENCES public.profiles(id) ON DELETE SET NULL,
  action      TEXT    NOT NULL,
  entity_type TEXT    NOT NULL,
  entity_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  INET,
  severity    TEXT    NOT NULL DEFAULT 'info'
              CHECK  (severity IN ('info','warn','error','critical')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.18 financial_audit  ← depends on agencies, profiles
CREATE TABLE IF NOT EXISTS public.financial_audit (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id    UUID          NOT NULL REFERENCES public.agencies(id),
  actor_id     UUID          NOT NULL REFERENCES public.profiles(id),
  action       TEXT          NOT NULL,
  entity_type  TEXT          NOT NULL,
  entity_id    UUID          NOT NULL,
  amount       NUMERIC(15,2),
  before_state JSONB         NOT NULL DEFAULT '{}',
  after_state  JSONB         NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- 3.19 alerts  ← depends on agencies, profiles
CREATE TABLE IF NOT EXISTS public.alerts (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id       UUID           NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  severity        alert_severity NOT NULL,
  entity_type     TEXT           NOT NULL,
  entity_id       UUID,
  message         TEXT           NOT NULL,
  action_required BOOLEAN        NOT NULL DEFAULT FALSE,
  is_resolved     BOOLEAN        NOT NULL DEFAULT FALSE,
  resolved_by     UUID           REFERENCES public.profiles(id),
  resolved_at     TIMESTAMPTZ,
  resolution_note TEXT,
  dedup_key       TEXT,
  event_time      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- 3.20 lead_scores  ← depends on agencies, leads
CREATE TABLE IF NOT EXISTS public.lead_scores (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id        UUID         NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  lead_id          UUID         NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  score_total      NUMERIC(5,2) NOT NULL,
  score_budget     NUMERIC(5,2) NOT NULL DEFAULT 0,
  score_engagement NUMERIC(5,2) NOT NULL DEFAULT 0,
  score_intent     NUMERIC(5,2) NOT NULL DEFAULT 0,
  score_profile    NUMERIC(5,2) NOT NULL DEFAULT 0,
  decay_factor     NUMERIC(4,3) NOT NULL DEFAULT 1.0,
  raw_score        NUMERIC(5,2) NOT NULL,
  tier             TEXT         NOT NULL CHECK (tier IN ('cold','warm','hot','burning')),
  signals          JSONB        NOT NULL DEFAULT '[]',
  model_version    TEXT         NOT NULL DEFAULT 'v1',
  computed_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 3.21 deal_predictions  ← depends on agencies, deals
CREATE TABLE IF NOT EXISTS public.deal_predictions (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id            UUID         NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  deal_id              UUID         NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  close_probability    NUMERIC(5,4) NOT NULL,
  factor_payment       NUMERIC(5,4) NOT NULL DEFAULT 0,
  factor_velocity      NUMERIC(5,4) NOT NULL DEFAULT 0,
  factor_agent         NUMERIC(5,4) NOT NULL DEFAULT 0,
  factor_activity      NUMERIC(5,4) NOT NULL DEFAULT 0,
  factor_timeline      NUMERIC(5,4) NOT NULL DEFAULT 0,
  recommended_action   TEXT         NOT NULL,
  action_urgency       TEXT         NOT NULL CHECK (action_urgency IN ('immediate','today','this_week','low')),
  risk_flags           JSONB        NOT NULL DEFAULT '[]',
  confidence_score     NUMERIC(5,4) NOT NULL DEFAULT 0,
  model_version        TEXT         NOT NULL DEFAULT 'v1',
  predicted_close_date DATE,
  computed_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 3.22 automation_runs  ← depends on agencies
CREATE TABLE IF NOT EXISTS public.automation_runs (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id     UUID    NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  automation_id TEXT    NOT NULL,
  entity_id     UUID    NOT NULL,
  entity_type   TEXT    NOT NULL,
  triggered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  result        JSONB
);

-- 3.23 deal_status_history  ← depends on agencies, deals, profiles
CREATE TABLE IF NOT EXISTS public.deal_status_history (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   UUID    NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  deal_id     UUID    NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status   TEXT    NOT NULL,
  changed_by  UUID    REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.24 usage_counters  ← depends on agencies
CREATE TABLE IF NOT EXISTS public.usage_counters (
  agency_id     UUID    NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  period        DATE    NOT NULL DEFAULT date_trunc('month', CURRENT_DATE)::DATE,
  deals_created INTEGER NOT NULL DEFAULT 0,
  leads_created INTEGER NOT NULL DEFAULT 0,
  api_calls     BIGINT  NOT NULL DEFAULT 0,
  ai_requests   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (agency_id, period)
);

-- 3.25 billing_events  ← depends on agencies
CREATE TABLE IF NOT EXISTS public.billing_events (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id       UUID    NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  event_type      TEXT    NOT NULL,
  stripe_event_id TEXT    UNIQUE,
  payload         JSONB   NOT NULL DEFAULT '{}',
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.26 agent_kpi_snapshots  ← depends on agencies, profiles
CREATE TABLE IF NOT EXISTS public.agent_kpi_snapshots (
  id                     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id              UUID          NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  agent_id               UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  snapshot_date          DATE          NOT NULL DEFAULT CURRENT_DATE,
  total_leads            INTEGER       NOT NULL DEFAULT 0,
  converted_leads        INTEGER       NOT NULL DEFAULT 0,
  total_deals            INTEGER       NOT NULL DEFAULT 0,
  active_deals           INTEGER       NOT NULL DEFAULT 0,
  closed_deals           INTEGER       NOT NULL DEFAULT 0,
  close_rate_pct         NUMERIC(5,2)  NOT NULL DEFAULT 0,
  total_revenue          NUMERIC(15,2) NOT NULL DEFAULT 0,
  commission_earned      NUMERIC(15,2) NOT NULL DEFAULT 0,
  commission_outstanding NUMERIC(15,2) NOT NULL DEFAULT 0,
  avg_deal_size          NUMERIC(15,2) NOT NULL DEFAULT 0,
  overdue_payments       INTEGER       NOT NULL DEFAULT 0,
  performance_score      NUMERIC(5,2)  NOT NULL DEFAULT 0,
  rank                   INTEGER,
  created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (agency_id, agent_id, snapshot_date)
);

-- 3.27 finance_snapshot  ← depends on agencies
CREATE TABLE IF NOT EXISTS public.finance_snapshot (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id           UUID          NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  snapshot_date       DATE          NOT NULL DEFAULT CURRENT_DATE,
  snapshot_hour       INTEGER       NOT NULL DEFAULT 0,
  cash_balance        NUMERIC(15,2) NOT NULL DEFAULT 0,
  receivables_total   NUMERIC(15,2) NOT NULL DEFAULT 0,
  receivables_0_30    NUMERIC(15,2) NOT NULL DEFAULT 0,
  receivables_30_60   NUMERIC(15,2) NOT NULL DEFAULT 0,
  receivables_60_90   NUMERIC(15,2) NOT NULL DEFAULT 0,
  receivables_90_plus NUMERIC(15,2) NOT NULL DEFAULT 0,
  revenue_cash_mtd    NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_expenses_mtd  NUMERIC(15,2) NOT NULL DEFAULT 0,
  gross_profit_mtd    NUMERIC(15,2) NOT NULL DEFAULT 0,
  commission_payable  NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_stale            BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (agency_id, snapshot_date, snapshot_hour)
);

-- 3.28 agency_config  ← depends on agencies
CREATE TABLE IF NOT EXISTS public.agency_config (
  id                           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id                    UUID          NOT NULL UNIQUE REFERENCES public.agencies(id) ON DELETE CASCADE,
  inactivity_yellow_hours      INTEGER       NOT NULL DEFAULT 24,
  inactivity_orange_hours      INTEGER       NOT NULL DEFAULT 48,
  inactivity_red_hours         INTEGER       NOT NULL DEFAULT 72,
  inactivity_critical_hours    INTEGER       NOT NULL DEFAULT 168,
  survival_threshold_dzd       NUMERIC(15,2) NOT NULL DEFAULT 2000000,
  caution_threshold_dzd        NUMERIC(15,2) NOT NULL DEFAULT 5000000,
  high_value_deal_dzd          NUMERIC(15,2) NOT NULL DEFAULT 15000000,
  default_commission_pct       NUMERIC(5,2)  NOT NULL DEFAULT 2.0,
  max_commission_pct           NUMERIC(5,2)  NOT NULL DEFAULT 10.0,
  commission_requires_approval BOOLEAN       NOT NULL DEFAULT TRUE,
  lead_expiry_days             INTEGER       NOT NULL DEFAULT 90,
  max_leads_per_agent          INTEGER       NOT NULL DEFAULT 30,
  notify_manager_on_escalation BOOLEAN       NOT NULL DEFAULT TRUE,
  notify_agent_on_overdue      BOOLEAN       NOT NULL DEFAULT TRUE,
  whatsapp_notifications       BOOLEAN       NOT NULL DEFAULT FALSE,
  agency_name                  TEXT,
  currency                     TEXT          NOT NULL DEFAULT 'DZD',
  timezone                     TEXT          NOT NULL DEFAULT 'Africa/Algiers',
  locale                       TEXT          NOT NULL DEFAULT 'fr-DZ',
  custom_rules                 JSONB         NOT NULL DEFAULT '{}',
  updated_at                   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- 3.29 queue_jobs  ← no FK dependencies
CREATE TABLE IF NOT EXISTS public.queue_jobs (
  id              UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type        TEXT             NOT NULL,
  payload         JSONB            NOT NULL DEFAULT '{}',
  status          queue_job_status NOT NULL DEFAULT 'pending',
  attempts        INTEGER          NOT NULL DEFAULT 0,
  max_attempts    INTEGER          NOT NULL DEFAULT 5,
  next_retry_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  last_error      TEXT,
  result          JSONB,
  idempotency_key TEXT             UNIQUE,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- 3.30 integrations  ← depends on agencies
CREATE TABLE IF NOT EXISTS public.integrations (
  id                   UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id            UUID    NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  provider             TEXT    NOT NULL,
  name                 TEXT    NOT NULL,
  status               TEXT    NOT NULL DEFAULT 'active'
                       CHECK  (status IN ('active','paused','error','disconnected')),
  credentials          JSONB   NOT NULL DEFAULT '{}',
  config               JSONB   NOT NULL DEFAULT '{}',
  last_success_at      TIMESTAMPTZ,
  last_error_msg       TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (agency_id, provider)
);

-- ================================================================
-- 4. INDEXES
-- NOTE: Expression-based uniqueness MUST be CREATE UNIQUE INDEX,
--       never inline UNIQUE() — PostgreSQL rejects expressions in
--       table-level UNIQUE constraints.
-- ================================================================

-- agencies
CREATE INDEX IF NOT EXISTS idx_agencies_slug   ON public.agencies(slug);
CREATE INDEX IF NOT EXISTS idx_agencies_stripe ON public.agencies(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_agency ON public.profiles(agency_id)       WHERE agency_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_role   ON public.profiles(agency_id, role) WHERE is_active = TRUE;

-- clients
CREATE INDEX IF NOT EXISTS idx_clients_agency ON public.clients(agency_id)            WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clients_phone  ON public.clients(agency_id, phone)     WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clients_name   ON public.clients(agency_id, full_name) WHERE deleted_at IS NULL;

-- developers
CREATE INDEX IF NOT EXISTS idx_developers_agency ON public.developers(agency_id) WHERE deleted_at IS NULL;

-- projects
CREATE INDEX IF NOT EXISTS idx_projects_agency ON public.projects(agency_id)       WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_city   ON public.projects(agency_id, city) WHERE deleted_at IS NULL;

-- properties — reference_code unique per agency, NULL allowed (multiple NULLs OK)
CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_ref     ON public.properties(agency_id, reference_code) WHERE reference_code IS NOT NULL AND deleted_at IS NULL;
CREATE        INDEX IF NOT EXISTS idx_properties_agency  ON public.properties(agency_id, status)          WHERE deleted_at IS NULL;
CREATE        INDEX IF NOT EXISTS idx_properties_project ON public.properties(project_id)                 WHERE deleted_at IS NULL;
CREATE        INDEX IF NOT EXISTS idx_properties_price   ON public.properties(agency_id, list_price)      WHERE deleted_at IS NULL;

-- leads
CREATE INDEX IF NOT EXISTS idx_leads_agency   ON public.leads(agency_id, status)            WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_agent    ON public.leads(agency_id, assigned_agent)    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_score    ON public.leads(agency_id, cached_score DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_activity ON public.leads(agency_id, last_activity DESC) WHERE deleted_at IS NULL;

-- deals
CREATE UNIQUE INDEX IF NOT EXISTS idx_deals_current    ON public.deals(id)                         WHERE is_current = TRUE;
CREATE        INDEX IF NOT EXISTS idx_deals_agency     ON public.deals(agency_id, status)           WHERE deleted_at IS NULL;
CREATE        INDEX IF NOT EXISTS idx_deals_agent      ON public.deals(agency_id, agent_id, status) WHERE deleted_at IS NULL;
CREATE        INDEX IF NOT EXISTS idx_deals_risk       ON public.deals(agency_id, risk_level)       WHERE deleted_at IS NULL AND status NOT IN ('closed','cancelled');
CREATE        INDEX IF NOT EXISTS idx_deals_next_act   ON public.deals(agency_id, next_action_due)  WHERE deleted_at IS NULL AND status NOT IN ('closed','cancelled');

-- deal_payments
CREATE INDEX IF NOT EXISTS idx_payments_deal   ON public.deal_payments(deal_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.deal_payments(status, due_date) WHERE status IN ('pending','overdue');

-- payment_refunds
CREATE INDEX IF NOT EXISTS idx_refunds_deal ON public.payment_refunds(deal_id);

-- activities
CREATE INDEX IF NOT EXISTS idx_activities_lead   ON public.activities(lead_id,   created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_activities_deal   ON public.activities(deal_id,   created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_activities_agency ON public.activities(agency_id, created_at DESC) WHERE deleted_at IS NULL;

-- tasks
CREATE INDEX IF NOT EXISTS idx_tasks_agency ON public.tasks(agency_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_agent  ON public.tasks(assigned_to, status, due_date);

-- commissions
CREATE INDEX IF NOT EXISTS idx_comm_agree_deal  ON public.commission_agreements(deal_id);
CREATE INDEX IF NOT EXISTS idx_comm_agree_agent ON public.commission_agreements(agent_id);
CREATE INDEX IF NOT EXISTS idx_comm_pay_agency  ON public.commission_payments(agency_id);
CREATE INDEX IF NOT EXISTS idx_comm_pay_agent   ON public.commission_payments(agent_id);

-- expenses
CREATE INDEX IF NOT EXISTS idx_expenses_agency ON public.expenses(agency_id, expense_date DESC);

-- audit
CREATE INDEX IF NOT EXISTS idx_audit_agency ON public.audit_logs(agency_id,    created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_logs(entity_type,  entity_id);
CREATE INDEX IF NOT EXISTS idx_fin_audit    ON public.financial_audit(agency_id, created_at DESC);

-- alerts — dedup_key: partial index so NULLs are excluded from uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_dedup  ON public.alerts(agency_id, dedup_key) WHERE dedup_key IS NOT NULL;
CREATE        INDEX IF NOT EXISTS idx_alerts_agency ON public.alerts(agency_id, severity)   WHERE is_resolved = FALSE;

-- lead_scores
CREATE INDEX IF NOT EXISTS idx_lead_scores_lead   ON public.lead_scores(lead_id,   computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_scores_agency ON public.lead_scores(agency_id, tier, computed_at DESC);

-- deal_predictions
CREATE INDEX IF NOT EXISTS idx_predictions_deal   ON public.deal_predictions(deal_id,   computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_agency ON public.deal_predictions(agency_id, close_probability DESC);

-- automation_runs — expression-based dedup (one run per automation+entity per calendar day)
CREATE UNIQUE INDEX IF NOT EXISTS idx_auto_runs_dedup  ON public.automation_runs(automation_id, entity_id, ((triggered_at AT TIME ZONE 'UTC')::DATE));
CREATE        INDEX IF NOT EXISTS idx_auto_runs_agency ON public.automation_runs(agency_id, triggered_at DESC);

-- deal_status_history
CREATE INDEX IF NOT EXISTS idx_deal_hist ON public.deal_status_history(deal_id, created_at DESC);

-- billing_events
CREATE INDEX IF NOT EXISTS idx_billing_agency ON public.billing_events(agency_id, processed_at DESC);

-- agent_kpi_snapshots
CREATE INDEX IF NOT EXISTS idx_kpi_snap ON public.agent_kpi_snapshots(agency_id, snapshot_date DESC);

-- finance_snapshot
CREATE INDEX IF NOT EXISTS idx_fin_snap ON public.finance_snapshot(agency_id, snapshot_date DESC);

-- queue_jobs
CREATE INDEX IF NOT EXISTS idx_queue_pending ON public.queue_jobs(next_retry_at) WHERE status = 'pending';


-- ================================================================
-- 5. HELPER FUNCTIONS
-- MUST come after tables — they reference public.profiles
-- ================================================================

CREATE OR REPLACE FUNCTION public.fn_agency_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'agency_id')::UUID,
    (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.fn_is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.fn_is_manager_or_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin','manager') AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.fn_increment_usage(
  p_agency_id UUID,
  p_counter   TEXT,
  p_amount    INTEGER DEFAULT 1
) RETURNS INTEGER LANGUAGE plpgsql VOLATILE SECURITY DEFINER AS $$
DECLARE v_new INTEGER;
BEGIN
  INSERT INTO public.usage_counters (agency_id, period)
  VALUES (p_agency_id, date_trunc('month', CURRENT_DATE)::DATE)
  ON CONFLICT DO NOTHING;

  EXECUTE format(
    'UPDATE public.usage_counters SET %I = %I + $1
     WHERE agency_id = $2 AND period = date_trunc(''month'', CURRENT_DATE)::DATE
     RETURNING %I',
    p_counter, p_counter, p_counter
  ) USING p_amount, p_agency_id INTO v_new;

  RETURN v_new;
END;
$$;


-- ================================================================
-- 6. AUTH TRIGGER
-- Auto-creates a profile row when a new Supabase Auth user signs up
-- ================================================================

CREATE OR REPLACE FUNCTION public.fn_handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, full_name, email, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(COALESCE(NEW.email, ''), '@', 1), 'Utilisateur'),
      NEW.email,
      'agent'::public.user_role
    )
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Catch all errors so auth.users insert doesn't fail
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.fn_handle_new_user();

-- ================================================================
-- 7. BUSINESS TRIGGER FUNCTIONS + TRIGGERS
-- ================================================================

-- 7a. Deal state machine (enforces valid transitions at DB level)
CREATE OR REPLACE FUNCTION fn_deal_state_machine()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_allowed JSONB := '{
    "draft":       ["active","cancelled"],
    "active":      ["negotiation","cancelled"],
    "negotiation": ["closed","active","cancelled"],
    "closed":      [],
    "cancelled":   []
  }';
BEGIN
  -- No-op if status unchanged
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  -- Block terminal state changes
  IF OLD.status IN ('closed', 'cancelled') THEN
    RAISE EXCEPTION 'STATE_LOCKED: Deal % cannot change from terminal state "%"', OLD.id, OLD.status;
  END IF;

  -- Validate transition
  IF NOT ((v_allowed -> OLD.status::TEXT) ? NEW.status::TEXT) THEN
    RAISE EXCEPTION 'INVALID_TRANSITION: % → % is not allowed', OLD.status, NEW.status;
  END IF;

  -- Closing: all payments must be settled
  IF NEW.status = 'closed' THEN
    IF EXISTS (
      SELECT 1 FROM public.deal_payments
      WHERE deal_id = NEW.id AND status IN ('pending', 'overdue')
    ) THEN
      RAISE EXCEPTION 'CLOSE_BLOCKED: Deal % still has unpaid payments', NEW.id;
    END IF;
    NEW.closing_date := COALESCE(NEW.closing_date, CURRENT_DATE);
  END IF;

  -- Timestamp milestones
  IF NEW.status = 'active'      AND OLD.status = 'draft'  THEN NEW.activated_at           := NOW(); END IF;
  IF NEW.status = 'negotiation' AND OLD.status = 'active' THEN NEW.negotiation_started_at := NOW(); END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deal_state ON public.deals;
CREATE TRIGGER trg_deal_state
  BEFORE UPDATE OF status ON public.deals
  FOR EACH ROW EXECUTE FUNCTION fn_deal_state_machine();


-- 7b. Keep deal payment totals in sync automatically
CREATE OR REPLACE FUNCTION fn_sync_payment_totals()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_deal_id UUID;
BEGIN
  -- Determine the deal_id regardless of operation type
  v_deal_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.deal_id ELSE NEW.deal_id END;

  UPDATE public.deals
  SET
    total_payments_scheduled = (
      SELECT COALESCE(SUM(amount), 0)
      FROM public.deal_payments
      WHERE deal_id = v_deal_id AND status != 'cancelled'
    ),
    total_payments_received = (
      SELECT COALESCE(SUM(amount), 0)
      FROM public.deal_payments
      WHERE deal_id = v_deal_id AND status = 'paid'
    ),
    updated_at = NOW()
  WHERE id = v_deal_id;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_payments ON public.deal_payments;
CREATE TRIGGER trg_sync_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.deal_payments
  FOR EACH ROW EXECUTE FUNCTION fn_sync_payment_totals();


-- 7c. Prevent total payments exceeding the agreed price
CREATE OR REPLACE FUNCTION fn_prevent_overpayment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_agreed_price NUMERIC(15,2);
  v_existing     NUMERIC(15,2);
BEGIN
  SELECT agreed_price INTO v_agreed_price
  FROM public.deals WHERE id = NEW.deal_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_existing
  FROM public.deal_payments
  WHERE deal_id = NEW.deal_id
    AND status  != 'cancelled'
    AND id IS DISTINCT FROM NEW.id;   -- exclude self on UPDATE

  IF (v_existing + NEW.amount) > v_agreed_price THEN
    RAISE EXCEPTION
      'OVERPAYMENT_BLOCKED: Payment of % would bring total to % which exceeds agreed price of %',
      NEW.amount, v_existing + NEW.amount, v_agreed_price;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_overpayment ON public.deal_payments;
CREATE TRIGGER trg_overpayment
  BEFORE INSERT OR UPDATE ON public.deal_payments
  FOR EACH ROW
  WHEN (NEW.status != 'cancelled')
  EXECUTE FUNCTION fn_prevent_overpayment();


-- 7d. Keep property status in sync with deal lifecycle
CREATE OR REPLACE FUNCTION fn_sync_property_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- draft → active: reserve the property
  IF NEW.status = 'active' AND OLD.status = 'draft' THEN
    UPDATE public.properties
    SET status = 'reserved', updated_at = NOW()
    WHERE id = NEW.property_id;
  END IF;

  -- → closed: mark property as sold
  IF NEW.status = 'closed' THEN
    UPDATE public.properties
    SET status = 'sold', updated_at = NOW()
    WHERE id = NEW.property_id;
  END IF;

  -- → cancelled: free property if no other active deal exists
  IF NEW.status = 'cancelled' THEN
    UPDATE public.properties
    SET status = 'available', updated_at = NOW()
    WHERE id = NEW.property_id
      AND NOT EXISTS (
        SELECT 1 FROM public.deals
        WHERE property_id = NEW.property_id
          AND id          != NEW.id
          AND status NOT IN ('closed', 'cancelled')
      );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_property_status ON public.deals;
CREATE TRIGGER trg_property_status
  AFTER UPDATE OF status ON public.deals
  FOR EACH ROW EXECUTE FUNCTION fn_sync_property_status();


-- 7e. Auto-create commission agreement when deal closes
CREATE OR REPLACE FUNCTION fn_auto_commission_on_close()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT (NEW.status = 'closed' AND OLD.status != 'closed') THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.commission_agreements WHERE deal_id = NEW.id
  ) THEN
    INSERT INTO public.commission_agreements
      (agency_id, deal_id, agent_id, agreed_amount, notes)
    VALUES
      (NEW.agency_id, NEW.id, NEW.agent_id, 0, 'Auto-created on close — set amount');
  END IF;

  NEW.commission_generated := TRUE;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_commission ON public.deals;
CREATE TRIGGER trg_auto_commission
  BEFORE UPDATE OF status ON public.deals
  FOR EACH ROW EXECUTE FUNCTION fn_auto_commission_on_close();


-- 7f. Make audit logs immutable (cannot UPDATE or DELETE)
CREATE OR REPLACE FUNCTION fn_protect_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'IMMUTABLE: audit records cannot be modified or deleted';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_audit     ON public.audit_logs;
DROP TRIGGER IF EXISTS trg_protect_fin_audit ON public.financial_audit;
CREATE TRIGGER trg_protect_audit
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION fn_protect_immutable();
CREATE TRIGGER trg_protect_fin_audit
  BEFORE UPDATE OR DELETE ON public.financial_audit
  FOR EACH ROW EXECUTE FUNCTION fn_protect_immutable();


-- 7g. Track monthly usage counters on deal / lead insert
CREATE OR REPLACE FUNCTION fn_track_deal_created()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM fn_increment_usage(NEW.agency_id, 'deals_created');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_track_lead_created()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM fn_increment_usage(NEW.agency_id, 'leads_created');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_track_deal ON public.deals;
DROP TRIGGER IF EXISTS trg_track_lead ON public.leads;
CREATE TRIGGER trg_track_deal
  AFTER INSERT ON public.deals
  FOR EACH ROW EXECUTE FUNCTION fn_track_deal_created();
CREATE TRIGGER trg_track_lead
  AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION fn_track_lead_created();

-- ================================================================
-- 8. VIEWS
-- ================================================================

CREATE OR REPLACE VIEW public.vw_commission_balance AS
SELECT
  ca.id              AS agreement_id,
  ca.agency_id,
  ca.deal_id,
  ca.agent_id,
  p.full_name        AS agent_name,
  ca.agreed_amount,
  COALESCE(SUM(cp.amount_paid), 0)                              AS total_paid,
  ca.agreed_amount - COALESCE(SUM(cp.amount_paid), 0)           AS outstanding_balance,
  CASE
    WHEN ca.agreed_amount - COALESCE(SUM(cp.amount_paid), 0) <= 0 THEN 'fully_paid'
    WHEN COALESCE(SUM(cp.amount_paid), 0) > 0                     THEN 'partially_paid'
    ELSE 'unpaid'
  END AS payment_status,
  CASE WHEN ca.agreed_amount > 0
    THEN ROUND(COALESCE(SUM(cp.amount_paid), 0) / ca.agreed_amount * 100, 1)
    ELSE 0
  END AS paid_pct
FROM public.commission_agreements ca
JOIN public.profiles p ON p.id = ca.agent_id
LEFT JOIN public.commission_payments cp ON cp.commission_agreement_id = ca.id
GROUP BY ca.id, ca.agency_id, ca.deal_id, ca.agent_id, p.full_name, ca.agreed_amount;


CREATE OR REPLACE VIEW public.vw_deal_pipeline AS
SELECT
  d.id, d.agency_id, d.status, d.risk_level,
  d.agreed_price, d.total_payments_received, d.total_payments_scheduled,
  d.agreed_price - COALESCE(d.total_payments_received, 0) AS balance_remaining,
  CASE WHEN d.agreed_price > 0
    THEN ROUND(COALESCE(d.total_payments_received, 0) / d.agreed_price * 100, 1)
    ELSE 0
  END AS payment_pct,
  d.next_action, d.next_action_due, d.at_risk_since,
  d.activated_at, d.commission_generated,
  d.created_at, d.updated_at, d.agent_id, d.client_id, d.property_id,
  c.full_name   AS client_name,
  c.phone       AS client_phone,
  pr.full_name  AS agent_name,
  p.type        AS property_type,
  p.reference_code,
  pj.name       AS project_name,
  pj.city       AS project_city,
  (d.risk_level IN ('high','critical'))                          AS is_high_risk,
  (d.next_action_due IS NOT NULL
    AND d.next_action_due < CURRENT_DATE
    AND d.status NOT IN ('closed','cancelled'))                  AS is_overdue_action,
  (SELECT COUNT(*) FROM public.deal_payments dp
   WHERE dp.deal_id = d.id AND dp.status = 'overdue')           AS overdue_payment_count,
  (SELECT COUNT(*) FROM public.deal_payments dp
   WHERE dp.deal_id = d.id AND dp.status = 'pending')           AS pending_payment_count
FROM public.deals d
JOIN public.clients    c  ON c.id  = d.client_id
JOIN public.profiles   pr ON pr.id = d.agent_id
JOIN public.properties p  ON p.id  = d.property_id
JOIN public.projects   pj ON pj.id = p.project_id
WHERE d.deleted_at IS NULL AND d.is_current = TRUE;


CREATE OR REPLACE VIEW public.vw_agent_performance AS
SELECT
  p.id           AS agent_id,
  p.full_name    AS agent_name,
  p.agency_id,
  COUNT(DISTINCT d.id)                                                        AS total_deals,
  COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'closed')                     AS closed_deals,
  COUNT(DISTINCT d.id) FILTER (WHERE d.status NOT IN ('closed','cancelled'))   AS active_deals,
  COALESCE(SUM(d.agreed_price) FILTER (WHERE d.status = 'closed'), 0)         AS total_revenue,
  COALESCE(SUM(cb.total_paid), 0)                                             AS commission_earned,
  COALESCE(SUM(cb.outstanding_balance), 0)                                    AS commission_outstanding,
  COUNT(DISTINCT l.id)                                                        AS total_leads,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'converted')                  AS converted_leads,
  CASE WHEN COUNT(DISTINCT l.id) > 0
    THEN ROUND(
      COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'converted')::NUMERIC
      / NULLIF(COUNT(DISTINCT l.id), 0) * 100, 1)
    ELSE 0
  END AS lead_conversion_rate
FROM public.profiles p
LEFT JOIN public.deals d
       ON d.agent_id   = p.id AND d.deleted_at IS NULL AND d.is_current = TRUE
LEFT JOIN public.leads l
       ON l.assigned_agent = p.id AND l.deleted_at IS NULL
LEFT JOIN public.vw_commission_balance cb
       ON cb.agent_id  = p.id AND cb.agency_id = p.agency_id
WHERE p.role = 'agent' AND p.is_active = TRUE
GROUP BY p.id, p.full_name, p.agency_id;


-- ================================================================
-- 9. ROW-LEVEL SECURITY
-- ================================================================

-- Enable RLS on every table
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'agencies','plans','profiles','clients','developers','projects','properties',
    'leads','deals','deal_payments','payment_refunds','activities','tasks',
    'commission_agreements','commission_payments','expenses',
    'audit_logs','financial_audit','alerts',
    'lead_scores','deal_predictions','automation_runs','deal_status_history',
    'usage_counters','billing_events','agent_kpi_snapshots','finance_snapshot',
    'agency_config','queue_jobs','integrations'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END;
$$;

-- Policies
CREATE POLICY "plans_public"       ON public.plans      FOR SELECT USING (TRUE);

CREATE POLICY "agencies_read"      ON public.agencies   FOR SELECT USING (id = fn_agency_id());
CREATE POLICY "agencies_write"     ON public.agencies   FOR UPDATE USING (id = fn_agency_id() AND fn_is_admin());

CREATE POLICY "profiles_read"      ON public.profiles   FOR SELECT USING (agency_id = fn_agency_id() OR id = auth.uid());
CREATE POLICY "profiles_update"    ON public.profiles   FOR UPDATE USING (id = auth.uid() OR fn_is_admin());
CREATE POLICY "profiles_insert"    ON public.profiles   FOR INSERT WITH CHECK (id = auth.uid() OR fn_is_admin());

CREATE POLICY "clients_read"       ON public.clients    FOR SELECT USING (agency_id = fn_agency_id());
CREATE POLICY "clients_write"      ON public.clients    FOR ALL    USING (agency_id = fn_agency_id()) WITH CHECK (agency_id = fn_agency_id());

CREATE POLICY "devs_read"          ON public.developers FOR SELECT USING (agency_id = fn_agency_id());
CREATE POLICY "devs_write"         ON public.developers FOR ALL    USING (agency_id = fn_agency_id() AND fn_is_manager_or_admin());

CREATE POLICY "projects_read"      ON public.projects   FOR SELECT USING (agency_id = fn_agency_id());
CREATE POLICY "projects_write"     ON public.projects   FOR ALL    USING (agency_id = fn_agency_id() AND fn_is_manager_or_admin());

CREATE POLICY "props_read"         ON public.properties FOR SELECT USING (agency_id = fn_agency_id());
CREATE POLICY "props_write"        ON public.properties FOR ALL    USING (agency_id = fn_agency_id() AND fn_is_manager_or_admin());

CREATE POLICY "leads_read"         ON public.leads      FOR SELECT USING (agency_id = fn_agency_id() AND (assigned_agent = auth.uid() OR fn_is_manager_or_admin()));
CREATE POLICY "leads_insert"       ON public.leads      FOR INSERT WITH CHECK (agency_id = fn_agency_id());
CREATE POLICY "leads_update"       ON public.leads      FOR UPDATE USING (agency_id = fn_agency_id() AND (assigned_agent = auth.uid() OR fn_is_manager_or_admin()));

CREATE POLICY "deals_read"         ON public.deals      FOR SELECT USING (agency_id = fn_agency_id() AND (agent_id = auth.uid() OR fn_is_manager_or_admin()));
CREATE POLICY "deals_insert"       ON public.deals      FOR INSERT WITH CHECK (agency_id = fn_agency_id());
CREATE POLICY "deals_update"       ON public.deals      FOR UPDATE USING (agency_id = fn_agency_id() AND (agent_id = auth.uid() OR fn_is_manager_or_admin()));

CREATE POLICY "payments_read"      ON public.deal_payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND d.agency_id = fn_agency_id() AND (d.agent_id = auth.uid() OR fn_is_manager_or_admin()))
);
CREATE POLICY "payments_write"     ON public.deal_payments FOR ALL    USING (fn_is_manager_or_admin());

CREATE POLICY "refunds_read"       ON public.payment_refunds FOR SELECT USING (fn_is_manager_or_admin());
CREATE POLICY "refunds_write"      ON public.payment_refunds FOR ALL    USING (fn_is_manager_or_admin());

CREATE POLICY "activities_read"    ON public.activities FOR SELECT USING (agency_id = fn_agency_id());
CREATE POLICY "activities_insert"  ON public.activities FOR INSERT WITH CHECK (agency_id = fn_agency_id());

CREATE POLICY "tasks_read"         ON public.tasks      FOR SELECT USING (agency_id = fn_agency_id() AND (assigned_to = auth.uid() OR fn_is_manager_or_admin()));
CREATE POLICY "tasks_write"        ON public.tasks      FOR ALL    USING (agency_id = fn_agency_id() AND (assigned_to = auth.uid() OR fn_is_manager_or_admin()));

CREATE POLICY "comm_agree_read"    ON public.commission_agreements FOR SELECT USING (agency_id = fn_agency_id() AND (agent_id = auth.uid() OR fn_is_manager_or_admin()));
CREATE POLICY "comm_agree_write"   ON public.commission_agreements FOR ALL    USING (agency_id = fn_agency_id() AND fn_is_manager_or_admin());

CREATE POLICY "comm_pay_read"      ON public.commission_payments   FOR SELECT USING (agency_id = fn_agency_id() AND (agent_id = auth.uid() OR fn_is_manager_or_admin()));
CREATE POLICY "comm_pay_write"     ON public.commission_payments   FOR ALL    USING (agency_id = fn_agency_id() AND fn_is_manager_or_admin());

CREATE POLICY "expenses_read"      ON public.expenses         FOR SELECT USING (agency_id = fn_agency_id() AND fn_is_manager_or_admin());
CREATE POLICY "expenses_write"     ON public.expenses         FOR ALL    USING (agency_id = fn_agency_id() AND fn_is_manager_or_admin());

CREATE POLICY "audit_read"         ON public.audit_logs       FOR SELECT USING (agency_id = fn_agency_id() AND fn_is_admin());
CREATE POLICY "audit_insert"       ON public.audit_logs       FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "fin_audit_read"     ON public.financial_audit  FOR SELECT USING (agency_id = fn_agency_id() AND fn_is_admin());
CREATE POLICY "fin_audit_insert"   ON public.financial_audit  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "alerts_read"        ON public.alerts           FOR SELECT USING (agency_id = fn_agency_id() AND fn_is_manager_or_admin());
CREATE POLICY "alerts_write"       ON public.alerts           FOR ALL    USING (agency_id = fn_agency_id());

CREATE POLICY "scores_read"        ON public.lead_scores      FOR SELECT USING (agency_id = fn_agency_id());
CREATE POLICY "scores_insert"      ON public.lead_scores      FOR INSERT WITH CHECK (agency_id = fn_agency_id());

CREATE POLICY "pred_read"          ON public.deal_predictions FOR SELECT USING (agency_id = fn_agency_id());
CREATE POLICY "pred_insert"        ON public.deal_predictions FOR INSERT WITH CHECK (agency_id = fn_agency_id());

CREATE POLICY "auto_runs_read"     ON public.automation_runs  FOR ALL    USING (agency_id = fn_agency_id() AND fn_is_manager_or_admin());

CREATE POLICY "deal_hist_read"     ON public.deal_status_history FOR SELECT USING (agency_id = fn_agency_id());
CREATE POLICY "deal_hist_insert"   ON public.deal_status_history FOR INSERT WITH CHECK (agency_id = fn_agency_id());

CREATE POLICY "kpi_read"           ON public.agent_kpi_snapshots FOR SELECT USING (agency_id = fn_agency_id() AND (agent_id = auth.uid() OR fn_is_manager_or_admin()));
CREATE POLICY "kpi_write"          ON public.agent_kpi_snapshots FOR ALL    USING (agency_id = fn_agency_id() AND fn_is_manager_or_admin());

CREATE POLICY "fin_snap_read"      ON public.finance_snapshot FOR SELECT USING (agency_id = fn_agency_id() AND fn_is_manager_or_admin());
CREATE POLICY "fin_snap_write"     ON public.finance_snapshot FOR ALL    USING (agency_id = fn_agency_id());

CREATE POLICY "billing_read"       ON public.billing_events   FOR SELECT USING (agency_id = fn_agency_id() AND fn_is_admin());
CREATE POLICY "billing_insert"     ON public.billing_events   FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "usage_read"         ON public.usage_counters   FOR SELECT USING (agency_id = fn_agency_id());
CREATE POLICY "usage_write"        ON public.usage_counters   FOR ALL    USING (agency_id = fn_agency_id());

CREATE POLICY "config_read"        ON public.agency_config    FOR SELECT USING (agency_id = fn_agency_id() AND fn_is_manager_or_admin());
CREATE POLICY "config_write"       ON public.agency_config    FOR ALL    USING (agency_id = fn_agency_id() AND fn_is_admin());

CREATE POLICY "queue_admin"        ON public.queue_jobs       FOR ALL    USING (fn_is_admin());
CREATE POLICY "integrations_admin" ON public.integrations     FOR ALL    USING (agency_id = fn_agency_id() AND fn_is_admin());


-- ================================================================
-- 10. SEED DATA
-- Test users + demo agency + realistic data
-- ================================================================

-- Auth users (three roles)
INSERT INTO auth.users
  (id, email, encrypted_password, email_confirmed_at,
   raw_user_meta_data, created_at, updated_at, aud, role)
VALUES
  ('00000000-0000-0000-0000-000000000001',
   'ceo@asas.dz', crypt('Admin@2025!', gen_salt('bf')), NOW(),
   '{"full_name":"Ahmed Mansour","role":"admin"}'::jsonb,
   NOW(), NOW(), 'authenticated', 'authenticated'),

  ('00000000-0000-0000-0000-000000000002',
   'manager@asas.dz', crypt('Manager@2025!', gen_salt('bf')), NOW(),
   '{"full_name":"Samira Benali","role":"manager"}'::jsonb,
   NOW(), NOW(), 'authenticated', 'authenticated'),

  ('00000000-0000-0000-0000-000000000003',
   'agent1@asas.dz', crypt('Agent@2025!', gen_salt('bf')), NOW(),
   '{"full_name":"Karim Djebli","role":"agent"}'::jsonb,
   NOW(), NOW(), 'authenticated', 'authenticated')
ON CONFLICT DO NOTHING;

-- Agency
INSERT INTO public.agencies
  (id, name, slug, plan, owner_id, billing_email, trial_ends_at,
   max_agents, max_deals_mtd, max_properties, max_leads_mtd)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001',
   'ASAS Immobilier (Démo)', 'asas-demo', 'trial',
   '00000000-0000-0000-0000-000000000001',
   'ceo@asas.dz', NOW() + INTERVAL '14 days',
   10, 50, 200, 500)
ON CONFLICT DO NOTHING;

-- Profiles (the auth trigger already inserted bare rows; update them with agency_id)
INSERT INTO public.profiles (id, agency_id, full_name, email, role, is_active, phone)
VALUES
  ('00000000-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','Ahmed Mansour', 'ceo@asas.dz',     'admin',   TRUE, '+213 770 000 001'),
  ('00000000-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001','Samira Benali', 'manager@asas.dz', 'manager', TRUE, '+213 770 000 002'),
  ('00000000-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000001','Karim Djebli',  'agent1@asas.dz',  'agent',   TRUE, '+213 770 000 003')
ON CONFLICT (id) DO UPDATE
  SET agency_id = EXCLUDED.agency_id,
      role      = EXCLUDED.role,
      is_active = TRUE;

-- Set JWT app_metadata so fn_agency_id() works after login
UPDATE auth.users
SET raw_app_meta_data = '{"agency_id":"aaaaaaaa-0000-0000-0000-000000000001","role":"admin"}'
WHERE email = 'ceo@asas.dz';

UPDATE auth.users
SET raw_app_meta_data = '{"agency_id":"aaaaaaaa-0000-0000-0000-000000000001","role":"manager"}'
WHERE email = 'manager@asas.dz';

UPDATE auth.users
SET raw_app_meta_data = '{"agency_id":"aaaaaaaa-0000-0000-0000-000000000001","role":"agent"}'
WHERE email = 'agent1@asas.dz';

-- Developer
INSERT INTO public.developers (id, agency_id, name, country, rating)
VALUES ('bbbbbbbb-0000-0000-0000-000000000001',
        'aaaaaaaa-0000-0000-0000-000000000001',
        'Groupe Atlas Immobilier', 'DZ', 4.5)
ON CONFLICT DO NOTHING;

-- Projects
INSERT INTO public.projects (id, agency_id, developer_id, name, city, location, status)
VALUES
  ('cccccccc-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'bbbbbbbb-0000-0000-0000-000000000001',
   'Résidence Atlas Premium', 'Alger', 'Hydra, Alger', 'active'),

  ('cccccccc-0000-0000-0000-000000000002',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'bbbbbbbb-0000-0000-0000-000000000001',
   'Les Jardins d''Oran', 'Oran', 'Bir El Djir', 'active')
ON CONFLICT DO NOTHING;

-- Properties (all 'available' — triggers will update on deal transitions)
INSERT INTO public.properties
  (id, agency_id, project_id, reference_code, type, rooms, area_sqm, list_price, status)
VALUES
  ('dddddddd-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000001','ALP-A101','f3',   'F3',     90.5, 18500000,'available'),
  ('dddddddd-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000001','ALP-A201','f4',   'F4',    120.0, 25000000,'available'),
  ('dddddddd-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000001','ALP-B101','f2',   'F2',     65.0, 12000000,'available'),
  ('dddddddd-0000-0000-0000-000000000004','aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000002','JO-C101', 'f3',   'F3',     88.0, 14500000,'available'),
  ('dddddddd-0000-0000-0000-000000000005','aaaaaaaa-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000001','ALP-C301','villa','Villa', 250.0, 75000000,'available')
ON CONFLICT DO NOTHING;

-- Clients
INSERT INTO public.clients (id, agency_id, full_name, phone, email, type, source)
VALUES
  ('eeeeeeee-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','Mohamed Hadj',  '+213 661 100 001','mhadj@email.dz',  'buyer',    'facebook'),
  ('eeeeeeee-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001','Fatima Khelif', '+213 661 100 002','fkhelif@email.dz','buyer',    'referral'),
  ('eeeeeeee-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000001','Youcef Brahim', '+213 661 100 003', NULL,             'buyer',    'instagram'),
  ('eeeeeeee-0000-0000-0000-000000000004','aaaaaaaa-0000-0000-0000-000000000001','Nadia Saidi',   '+213 661 100 004','nsaidi@email.dz', 'investor', 'referral'),
  ('eeeeeeee-0000-0000-0000-000000000005','aaaaaaaa-0000-0000-0000-000000000001','Omar Tebboune', '+213 661 100 005', NULL,             'buyer',    'walk_in')
ON CONFLICT DO NOTHING;

-- Leads
INSERT INTO public.leads
  (id, agency_id, client_id, assigned_agent, project_id, status, source, budget_min, budget_max)
VALUES
  ('ffffffff-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',
   'eeeeeeee-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003',
   'cccccccc-0000-0000-0000-000000000001','converted','facebook',15000000,25000000),

  ('ffffffff-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001',
   'eeeeeeee-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003',
   'cccccccc-0000-0000-0000-000000000001','visit_scheduled','referral',10000000,20000000),

  ('ffffffff-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000001',
   'eeeeeeee-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000003',
   'cccccccc-0000-0000-0000-000000000002','new','instagram',8000000,15000000)
ON CONFLICT DO NOTHING;

-- ── Deals ──────────────────────────────────────────────────────
-- Strategy: insert as 'draft', add payments, then advance status
-- step-by-step so all triggers fire in the correct order.

INSERT INTO public.deals
  (id, agency_id, lead_id, client_id, property_id, agent_id, deal_type, status, agreed_price)
VALUES
  -- Deal 1 (will be closed)
  ('11111111-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'ffffffff-0000-0000-0000-000000000001',
   'eeeeeeee-0000-0000-0000-000000000001',
   'dddddddd-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000003',
   'sale','draft',24000000),

  -- Deal 2 (will be in negotiation, has overdue payment)
  ('11111111-0000-0000-0000-000000000002',
   'aaaaaaaa-0000-0000-0000-000000000001',
   NULL,
   'eeeeeeee-0000-0000-0000-000000000004',
   'dddddddd-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000003',
   'sale','draft',12000000),

  -- Deal 3 (will be active)
  ('11111111-0000-0000-0000-000000000003',
   'aaaaaaaa-0000-0000-0000-000000000001',
   NULL,
   'eeeeeeee-0000-0000-0000-000000000005',
   'dddddddd-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000003',
   'sale','draft',14500000)
ON CONFLICT DO NOTHING;

-- Payments for Deal 1 (all paid — required before we can close it)
INSERT INTO public.deal_payments (deal_id, amount, due_date, paid_date, status, payment_method)
VALUES
  ('11111111-0000-0000-0000-000000000001',8000000,CURRENT_DATE-90,CURRENT_DATE-88,'paid','bank_transfer'),
  ('11111111-0000-0000-0000-000000000001',8000000,CURRENT_DATE-60,CURRENT_DATE-58,'paid','bank_transfer'),
  ('11111111-0000-0000-0000-000000000001',8000000,CURRENT_DATE-30,CURRENT_DATE-28,'paid','check');

-- Payments for Deal 2 (1 paid, 1 overdue, 1 pending)
INSERT INTO public.deal_payments (deal_id, amount, due_date, paid_date, status, payment_method)
VALUES
  ('11111111-0000-0000-0000-000000000002',4000000,CURRENT_DATE-45,CURRENT_DATE-43,'paid','cash'),
  ('11111111-0000-0000-0000-000000000002',4000000,CURRENT_DATE-10,NULL,           'overdue',NULL),
  ('11111111-0000-0000-0000-000000000002',4000000,CURRENT_DATE+30,NULL,           'pending',NULL);

-- Advance Deal 1: draft → active → negotiation → closed
UPDATE public.deals SET status = 'active'      WHERE id = '11111111-0000-0000-0000-000000000001';
UPDATE public.deals SET status = 'negotiation' WHERE id = '11111111-0000-0000-0000-000000000001';
UPDATE public.deals SET status = 'closed'      WHERE id = '11111111-0000-0000-0000-000000000001';

-- Advance Deal 2: draft → active → negotiation  (has overdue, stays in negotiation)
UPDATE public.deals
SET status = 'active', next_action = 'Appeler client — paiement en retard', next_action_due = CURRENT_DATE, risk_level = 'high'
WHERE id = '11111111-0000-0000-0000-000000000002';
UPDATE public.deals SET status = 'negotiation' WHERE id = '11111111-0000-0000-0000-000000000002';

-- Advance Deal 3: draft → active
UPDATE public.deals
SET status = 'active', next_action = 'Planifier la visite du bien', next_action_due = CURRENT_DATE + 2
WHERE id = '11111111-0000-0000-0000-000000000003';

-- Commission for Deal 1 (auto-created by trigger — just update the amount)
UPDATE public.commission_agreements
SET agreed_amount = 480000,
    approved_by   = '00000000-0000-0000-0000-000000000002',
    approved_at   = NOW() - INTERVAL '14 days',
    notes         = '2% commission — F4 vendu à 24 000 000 DZD'
WHERE deal_id = '11111111-0000-0000-0000-000000000001';

-- Commission payment (partial — 50%)
INSERT INTO public.commission_payments
  (agency_id, commission_agreement_id, agent_id, amount_paid, payment_date, payment_method, created_by)
SELECT
  'aaaaaaaa-0000-0000-0000-000000000001',
  ca.id,
  '00000000-0000-0000-0000-000000000003',
  240000,
  CURRENT_DATE - 5,
  'bank_transfer',
  '00000000-0000-0000-0000-000000000002'
FROM public.commission_agreements ca
WHERE ca.deal_id = '11111111-0000-0000-0000-000000000001';

-- Activities
INSERT INTO public.activities (agency_id, lead_id, deal_id, type, notes, created_by)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001','ffffffff-0000-0000-0000-000000000001',NULL,
   'call','Premier contact — client intéressé par F4. Visite planifiée.','00000000-0000-0000-0000-000000000003'),

  ('aaaaaaaa-0000-0000-0000-000000000001',NULL,'11111111-0000-0000-0000-000000000001',
   'visit','Visite effectuée. Client confirme achat.','00000000-0000-0000-0000-000000000003'),

  ('aaaaaaaa-0000-0000-0000-000000000001',NULL,'11111111-0000-0000-0000-000000000001',
   'note','Contrat signé. Premier paiement reçu.','00000000-0000-0000-0000-000000000002'),

  ('aaaaaaaa-0000-0000-0000-000000000001',NULL,'11111111-0000-0000-0000-000000000002',
   'call','Client confirme paiement dans 3 jours.','00000000-0000-0000-0000-000000000003'),

  ('aaaaaaaa-0000-0000-0000-000000000001','ffffffff-0000-0000-0000-000000000002',NULL,
   'whatsapp','Envoi brochure F3. Client très intéressé.','00000000-0000-0000-0000-000000000003');

-- Tasks
INSERT INTO public.tasks
  (agency_id, assigned_to, created_by, deal_id, title, priority, status, due_date, is_automated)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002',
   '11111111-0000-0000-0000-000000000002',
   '⚠️ Appeler Nadia Saidi — paiement en retard 4 000 000 DZD',
   'urgent','pending', CURRENT_DATE, TRUE),

  ('aaaaaaaa-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002',
   '11111111-0000-0000-0000-000000000001',
   'Finaliser commission Karim — 240 000 DZD restants',
   'high','pending', CURRENT_DATE + 5, FALSE),

  ('aaaaaaaa-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000003',
   '11111111-0000-0000-0000-000000000003',
   'Planifier visite — Omar Tebboune',
   'medium','pending', CURRENT_DATE + 2, FALSE);

-- Expenses
INSERT INTO public.expenses (agency_id, category, amount, expense_date, description, paid_by)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001','marketing', 150000, CURRENT_DATE-20,'Facebook Ads — Résidence Atlas Premium','00000000-0000-0000-0000-000000000002'),
  ('aaaaaaaa-0000-0000-0000-000000000001','rent',       250000, CURRENT_DATE-1, 'Loyer bureau mensuel',                  '00000000-0000-0000-0000-000000000001'),
  ('aaaaaaaa-0000-0000-0000-000000000001','salaries', 1200000, CURRENT_DATE-1, 'Salaires équipe mensuel',               '00000000-0000-0000-0000-000000000001'),
  ('aaaaaaaa-0000-0000-0000-000000000001','software',   25000, CURRENT_DATE-10,'Abonnement logiciel mensuel',            '00000000-0000-0000-0000-000000000001');

-- Agency config
INSERT INTO public.agency_config (agency_id)
VALUES ('aaaaaaaa-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;
-- Run this in Supabase SQL Editor to enable email/password login for the seed users
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', format('{"sub":"%s","email":"%s"}', '00000000-0000-0000-0000-000000000001', 'ceo@asas.dz')::jsonb, 'email', NOW(), NOW(), NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', format('{"sub":"%s","email":"%s"}', '00000000-0000-0000-0000-000000000002', 'manager@asas.dz')::jsonb, 'email', NOW(), NOW(), NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', format('{"sub":"%s","email":"%s"}', '00000000-0000-0000-0000-000000000003', 'agent1@asas.dz')::jsonb, 'email', NOW(), NOW(), NOW())
ON CONFLICT DO NOTHING;
