-- ============================================================
-- Migration 017 — Fix activity trigger descriptions to use customer name
-- ============================================================

-- 1. Update trigger_payment_activity to use customer name instead of customer_id
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

-- 2. Update trigger_invoice_activity to use customer name instead of customer_id
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

-- 3. Clean up existing activity_logs records
UPDATE public.activity_logs a
SET description = replace(a.description, 'customer_id=' || c.id::text, c.name)
FROM public.customers c
WHERE a.description LIKE '%customer_id=' || c.id::text || '%';

UPDATE public.activity_logs a
SET description = replace(a.description, 'customer_id=', '')
WHERE a.description LIKE '%customer_id=%';
