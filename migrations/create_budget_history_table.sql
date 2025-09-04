-- Migración para crear tabla budget_history para versionado de presupuestos
-- Fecha: 2025-02-26

-- Crear tabla budget_history
CREATE TABLE public.budget_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL,
  version_number integer NOT NULL,
  
  -- Campos copiados del presupuesto original para guardar el estado completo
  title text NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL,
  assigned_to uuid NOT NULL,
  organization_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  contact_id uuid NULL,
  lead_id uuid NULL,
  template_id uuid NULL,
  public_url text NULL,
  pdf_url text NULL,
  sent_at timestamp with time zone NULL,
  sent_by uuid NULL,
  slug text NULL,
  
  -- Campos de auditoría
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  action text NOT NULL CHECK (action IN ('created', 'updated', 'status_changed', 'restored')),
  changes_summary jsonb NULL, -- detalles de qué campos cambiaron
  
  -- Constraints
  CONSTRAINT budget_history_pkey PRIMARY KEY (id),
  CONSTRAINT budget_history_budget_id_fkey FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE,
  CONSTRAINT budget_history_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT budget_history_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES users(id),
  CONSTRAINT budget_history_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT budget_history_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id),
  CONSTRAINT budget_history_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES contacts(id),
  CONSTRAINT budget_history_template_id_fkey FOREIGN KEY (template_id) REFERENCES budget_templates(id),
  CONSTRAINT budget_history_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES users(id)
) TABLESPACE pg_default;

-- Crear índices para optimizar consultas
CREATE INDEX idx_budget_history_budget_id ON public.budget_history USING btree (budget_id) TABLESPACE pg_default;
CREATE INDEX idx_budget_history_version ON public.budget_history USING btree (budget_id, version_number DESC) TABLESPACE pg_default;
CREATE INDEX idx_budget_history_created_at ON public.budget_history USING btree (created_at DESC) TABLESPACE pg_default;
CREATE INDEX idx_budget_history_created_by ON public.budget_history USING btree (created_by) TABLESPACE pg_default;

-- Función para obtener el siguiente número de versión
CREATE OR REPLACE FUNCTION get_next_budget_version(budget_uuid uuid)
RETURNS integer AS $$
BEGIN
  RETURN COALESCE(
    (SELECT MAX(version_number) + 1 FROM budget_history WHERE budget_id = budget_uuid),
    1
  );
END;
$$ LANGUAGE plpgsql;

-- Función trigger para crear historial automáticamente
CREATE OR REPLACE FUNCTION create_budget_history()
RETURNS trigger AS $$
BEGIN
  -- Solo crear historial en INSERT o UPDATE (no en DELETE)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO budget_history (
      budget_id,
      version_number,
      title,
      description,
      amount,
      status,
      assigned_to,
      organization_id,
      branch_id,
      contact_id,
      lead_id,
      template_id,
      public_url,
      pdf_url,
      sent_at,
      sent_by,
      slug,
      created_by,
      action
    ) VALUES (
      NEW.id,
      1,
      NEW.title,
      NEW.description,
      NEW.amount,
      NEW.status,
      NEW.assigned_to,
      NEW.organization_id,
      NEW.branch_id,
      NEW.contact_id,
      NEW.lead_id,
      NEW.template_id,
      NEW.public_url,
      NEW.pdf_url,
      NEW.sent_at,
      NEW.sent_by,
      NEW.slug,
      NEW.assigned_to, -- En creación, el creador es el assigned_to
      'created'
    );
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    -- Crear entrada de historial con la nueva versión
    INSERT INTO budget_history (
      budget_id,
      version_number,
      title,
      description,
      amount,
      status,
      assigned_to,
      organization_id,
      branch_id,
      contact_id,
      lead_id,
      template_id,
      public_url,
      pdf_url,
      sent_at,
      sent_by,
      slug,
      created_by,
      action,
      changes_summary
    ) VALUES (
      NEW.id,
      get_next_budget_version(NEW.id),
      NEW.title,
      NEW.description,
      NEW.amount,
      NEW.status,
      NEW.assigned_to,
      NEW.organization_id,
      NEW.branch_id,
      NEW.contact_id,
      NEW.lead_id,
      NEW.template_id,
      NEW.public_url,
      NEW.pdf_url,
      NEW.sent_at,
      NEW.sent_by,
      NEW.slug,
      NEW.assigned_to, -- El usuario que hace el update es el assigned_to actual
      CASE 
        WHEN OLD.status != NEW.status THEN 'status_changed'
        ELSE 'updated'
      END,
      jsonb_build_object(
        'title_changed', OLD.title != NEW.title,
        'description_changed', OLD.description != NEW.description,
        'amount_changed', OLD.amount != NEW.amount,
        'status_changed', OLD.status != NEW.status,
        'contact_changed', OLD.contact_id != NEW.contact_id,
        'lead_changed', OLD.lead_id != NEW.lead_id
      )
    );
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger
DROP TRIGGER IF EXISTS budget_history_trigger ON budgets;
CREATE TRIGGER budget_history_trigger
  AFTER INSERT OR UPDATE ON budgets
  FOR EACH ROW
  EXECUTE FUNCTION create_budget_history();

-- Comentarios para documentación
COMMENT ON TABLE budget_history IS 'Tabla para almacenar el historial completo de cambios en presupuestos';
COMMENT ON COLUMN budget_history.version_number IS 'Número incremental de versión para cada presupuesto';
COMMENT ON COLUMN budget_history.action IS 'Tipo de acción: created, updated, status_changed, restored';
COMMENT ON COLUMN budget_history.changes_summary IS 'JSON con detalles de qué campos específicos cambiaron';
COMMENT ON FUNCTION get_next_budget_version IS 'Obtiene el siguiente número de versión para un presupuesto';
COMMENT ON FUNCTION create_budget_history IS 'Trigger function que crea automáticamente entradas de historial';