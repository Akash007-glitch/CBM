-- ============================================================
-- Migration 026 — Purge Rogue Organization/SaaS Triggers & Functions
-- ============================================================
-- An external multi-tenant / SaaS project's schema was mistakenly
-- executed against this database, leaving behind triggers and functions
-- that reference "organization_id".
--
-- This migration completely removes those rogue triggers and routines,
-- and restores the clean CBM triggers for activity logging.
-- ============================================================

-- ── 1. Drop Rogue Customer Activity Trigger ─────────────────
-- This was causing: Failed to create customer: column "organization_id" of relation "activity_logs" does not exist
DROP TRIGGER IF EXISTS on_customer_activity ON public.customers;
DROP FUNCTION IF EXISTS public.trigger_customer_activity();

-- ── 2. Drop Rogue prevent_organization_id_change Triggers ───
DROP TRIGGER IF EXISTS trg_prevent_org_change ON public.customers;
DROP TRIGGER IF EXISTS trg_prevent_org_change ON public.invoices;
DROP TRIGGER IF EXISTS trg_prevent_org_change ON public.invoice_items;
DROP TRIGGER IF EXISTS trg_prevent_org_change ON public.payments;
DROP TRIGGER IF EXISTS trg_prevent_org_change ON public.payment_allocations;
DROP TRIGGER IF EXISTS trg_prevent_org_change ON public.activity_logs;
DROP TRIGGER IF EXISTS trg_prevent_org_change ON public.day_book_entries;
DROP TRIGGER IF EXISTS trg_prevent_org_change ON public.import_batches;
DROP TRIGGER IF EXISTS trg_prevent_org_change ON public.import_errors;
DROP TRIGGER IF EXISTS trg_prevent_org_change ON public.salesmen;
DROP FUNCTION IF EXISTS public.prevent_organization_id_change();

-- ── 3. Drop Rogue SaaS / Multi-tenant Functions ──────────────
DROP FUNCTION IF EXISTS public.is_org_owner(uuid);
DROP FUNCTION IF EXISTS public.is_org_admin_or_owner();
DROP FUNCTION IF EXISTS public.get_user_organization_id();
DROP FUNCTION IF EXISTS public.get_user_organizations();
DROP FUNCTION IF EXISTS public.invite_user_to_org(uuid, text, text);
DROP FUNCTION IF EXISTS public.accept_organization_invitation(text);
DROP FUNCTION IF EXISTS public.create_organization_with_owner(text, text);
DROP FUNCTION IF EXISTS public.get_saas_dashboard_kpis(date, date);
DROP FUNCTION IF EXISTS public.get_saas_dashboard_kpis(date, date, uuid);
DROP FUNCTION IF EXISTS public.get_saas_sales_trend(date, date, text);
DROP FUNCTION IF EXISTS public.get_saas_sales_trend(date, date, text, uuid);
DROP FUNCTION IF EXISTS public.get_saas_outstanding_aging();
DROP FUNCTION IF EXISTS public.get_saas_outstanding_aging(uuid);
DROP FUNCTION IF EXISTS public.get_saas_top_customers(integer);
DROP FUNCTION IF EXISTS public.get_saas_top_customers(integer, uuid);
DROP FUNCTION IF EXISTS public.get_saas_salesman_performance();
DROP FUNCTION IF EXISTS public.get_saas_salesman_performance(uuid);
DROP FUNCTION IF EXISTS public.get_saas_recent_activity(integer);
DROP FUNCTION IF EXISTS public.get_saas_recent_activity(integer, uuid);

-- ── 4. Restore Clean CBM Trigger: Payments ──────────────────
CREATE OR REPLACE FUNCTION public.trigger_payment_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_customer_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT name INTO v_customer_name FROM public.customers WHERE id = NEW.customer_id;
    INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id, description, metadata)
    VALUES (
      NEW.created_by,
      'payment_received',
      'payment',
      NEW.id,
      format('Payment of %s received from %s via %s', NEW.amount, COALESCE(v_customer_name, 'Customer'), NEW.payment_method),
      jsonb_build_object('amount', NEW.amount, 'payment_method', NEW.payment_method, 'payment_number', NEW.payment_number, 'customer_name', v_customer_name, 'customer_id', NEW.customer_id)
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- ── 5. Restore Clean CBM Trigger: Invoices ──────────────────
CREATE OR REPLACE FUNCTION public.trigger_invoice_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_customer_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT name INTO v_customer_name FROM public.customers WHERE id = NEW.customer_id;
    INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id, description, metadata)
    VALUES (
      NEW.created_by,
      'invoice_created',
      'invoice',
      NEW.id,
      format('Invoice %s created for %s, amount=%s', NEW.invoice_number, COALESCE(v_customer_name, 'Customer'), NEW.total_amount),
      jsonb_build_object('invoice_number', NEW.invoice_number, 'total_amount', NEW.total_amount, 'status', NEW.status, 'customer_name', v_customer_name, 'customer_id', NEW.customer_id)
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO public.activity_logs (user_id, action, entity_type, entity_id, description, metadata)
    VALUES (
      NEW.created_by,
      CASE WHEN NEW.status = 'cancelled' THEN 'invoice_cancelled' ELSE 'invoice_updated' END,
      'invoice',
      NEW.id,
      format('Invoice %s status changed from %s to %s', NEW.invoice_number, OLD.status, NEW.status),
      jsonb_build_object('invoice_number', NEW.invoice_number, 'old_status', OLD.status, 'new_status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$function$;
