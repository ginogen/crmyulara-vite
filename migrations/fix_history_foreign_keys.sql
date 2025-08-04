-- =====================================================
-- CORRECCIÓN DE FOREIGN KEYS PARA HISTORIAL
-- Cambiar referencias de auth.users a public.users
-- =====================================================

-- Eliminar constraints existentes si existen
ALTER TABLE IF EXISTS lead_history DROP CONSTRAINT IF EXISTS lead_history_user_id_fkey;
ALTER TABLE IF EXISTS contact_history DROP CONSTRAINT IF EXISTS contact_history_user_id_fkey;

-- Recrear constraints apuntando a public.users
ALTER TABLE lead_history 
ADD CONSTRAINT lead_history_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE contact_history 
ADD CONSTRAINT contact_history_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- Verificar que las constraints se crearon correctamente
DO $$
BEGIN
  -- Verificar lead_history constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'lead_history_user_id_fkey' 
    AND table_name = 'lead_history'
  ) THEN
    RAISE NOTICE '✓ lead_history foreign key constraint creado correctamente';
  ELSE
    RAISE NOTICE '✗ Error creando lead_history foreign key constraint';
  END IF;

  -- Verificar contact_history constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'contact_history_user_id_fkey' 
    AND table_name = 'contact_history'
  ) THEN
    RAISE NOTICE '✓ contact_history foreign key constraint creado correctamente';
  ELSE
    RAISE NOTICE '✗ Error creando contact_history foreign key constraint';
  END IF;
END $$;