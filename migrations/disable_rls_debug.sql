-- =====================================================
-- DESHABILITAR RLS TEMPORALMENTE PARA DEBUGGING
-- USAR SOLO PARA TESTING - NO EN PRODUCCIÓN
-- =====================================================

-- Deshabilitar RLS en las tablas de historial
ALTER TABLE IF EXISTS lead_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contact_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS whatsapp_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS whatsapp_templates DISABLE ROW LEVEL SECURITY;

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '⚠️  RLS DESHABILITADO TEMPORALMENTE';
  RAISE NOTICE '⚠️  Esto es solo para debugging';
  RAISE NOTICE '⚠️  REACTIVAR RLS en producción';
END $$;

-- =====================================================
-- PARA REACTIVAR RLS (ejecutar después del debugging):
-- =====================================================
/*
ALTER TABLE lead_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
*/