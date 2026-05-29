-- =============================================================================
-- PHASE 6: DATABASE OPTIMIZATIONS & PERFORMANCE ENGINEERING
-- =============================================================================

-- 1. ADD MISSING INDEXES FOR IN-MEMORY AGGREGATIONS
-- These queries are frequently filtered by status, dates, and is_deleted
CREATE INDEX IF NOT EXISTS idx_deal_payments_status_paid ON public.deal_payments(status, paid_date DESC) WHERE status = 'paid';
CREATE INDEX IF NOT EXISTS idx_deal_payments_deal_status ON public.deal_payments(deal_id, status);
CREATE INDEX IF NOT EXISTS idx_deals_is_current ON public.deals(is_current) WHERE is_current = TRUE;
CREATE INDEX IF NOT EXISTS idx_leads_not_deleted ON public.leads(agency_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_commission_payments_date ON public.commission_payments(paid_at DESC);

-- 2. CREATE POSTGRES FUNCTIONS FOR SERVER-SIDE AGGREGATIONS
-- This prevents the OOM issues caused by fetching all rows to Node.js and reducing in-memory.

-- A: Get Cash Position (Aggregates multiple tables)
CREATE OR REPLACE FUNCTION public.fn_get_cash_position(p_agency_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cash_balance NUMERIC;
  v_receivables NUMERIC;
  v_payables NUMERIC;
BEGIN
  -- Cash
  SELECT COALESCE(SUM(amount), 0) INTO v_cash_balance 
  FROM public.deal_payments 
  WHERE status = 'paid' AND deal_id IN (SELECT id FROM public.deals WHERE agency_id = p_agency_id);
  
  -- Receivables
  SELECT COALESCE(SUM(amount), 0) INTO v_receivables 
  FROM public.deal_payments 
  WHERE status IN ('pending', 'overdue') AND deal_id IN (SELECT id FROM public.deals WHERE agency_id = p_agency_id);
  
  -- Payables
  SELECT COALESCE(SUM(outstanding_balance), 0) INTO v_payables 
  FROM public.vw_commission_balance 
  WHERE agency_id = p_agency_id;

  RETURN jsonb_build_object(
    'cashBalance', v_cash_balance,
    'receivablesTotal', v_receivables,
    'payablesTotal', v_payables,
    'netPosition', v_cash_balance - v_payables
  );
END;
$$;

-- B: Get Deal PnL (Aggregates specific deal)
CREATE OR REPLACE FUNCTION public.fn_get_deal_pnl(p_deal_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_revenue NUMERIC;
  v_comm_expense NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_revenue 
  FROM public.deal_payments 
  WHERE deal_id = p_deal_id AND status = 'paid';

  SELECT COALESCE(total_paid, 0) INTO v_comm_expense
  FROM public.vw_commission_balance
  WHERE deal_id = p_deal_id;

  RETURN jsonb_build_object(
    'revenueCash', v_revenue,
    'commissionExpense', v_comm_expense,
    'netProfit', v_revenue - v_comm_expense
  );
END;
$$;

-- C: Get Cash Flow (Inflows vs Outflows)
CREATE OR REPLACE FUNCTION public.fn_get_cash_flow(p_agency_id UUID, p_from_date DATE, p_to_date DATE)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_inflows NUMERIC;
  v_outflows NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_inflows 
  FROM public.deal_payments 
  WHERE status = 'paid' 
    AND paid_date >= p_from_date 
    AND paid_date <= p_to_date
    AND deal_id IN (SELECT id FROM public.deals WHERE agency_id = p_agency_id);

  SELECT COALESCE(SUM(amount), 0) INTO v_outflows 
  FROM public.expenses 
  WHERE expense_date >= p_from_date 
    AND expense_date <= p_to_date
    AND agency_id = p_agency_id;

  RETURN jsonb_build_object(
    'inflows', v_inflows,
    'outflows', v_outflows,
    'net', v_inflows - v_outflows
  );
END;
$$;

-- D: Get Company Profit (Revenue, Expenses, Commissions)
CREATE OR REPLACE FUNCTION public.fn_get_company_profit(p_agency_id UUID, p_from_date DATE, p_to_date DATE)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_revenue NUMERIC;
  v_expenses NUMERIC;
  v_commissions NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_revenue 
  FROM public.deal_payments 
  WHERE status = 'paid' 
    AND paid_date >= p_from_date 
    AND paid_date <= p_to_date
    AND deal_id IN (SELECT id FROM public.deals WHERE agency_id = p_agency_id);

  SELECT COALESCE(SUM(amount), 0) INTO v_expenses 
  FROM public.expenses 
  WHERE expense_date >= p_from_date 
    AND expense_date <= p_to_date
    AND agency_id = p_agency_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_commissions 
  FROM public.commission_payments 
  WHERE paid_at >= p_from_date::TIMESTAMP 
    AND paid_at <= (p_to_date::TIMESTAMP + INTERVAL '23 hours 59 mins 59 secs')
    AND agency_id = p_agency_id;

  RETURN jsonb_build_object(
    'revenueCash', v_revenue,
    'totalExpenses', v_expenses + v_commissions,
    'netProfit', v_revenue - (v_expenses + v_commissions),
    'commissionExpense', v_commissions,
    'operatingExpense', v_expenses
  );
END;
$$;
