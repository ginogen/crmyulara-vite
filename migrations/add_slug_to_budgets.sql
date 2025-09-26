-- Migración para agregar campo slug a tabla budgets
-- Fecha: 2025-01-29

-- Agregar columna slug a la tabla budgets
ALTER TABLE public.budgets 
ADD COLUMN slug text NULL;

-- Crear índice único para slug (para URLs públicas únicas)
CREATE UNIQUE INDEX budgets_slug_key ON public.budgets USING btree (slug) 
WHERE slug IS NOT NULL;

-- Comentario para documentación
COMMENT ON COLUMN public.budgets.slug IS 'URL slug único para acceso público al presupuesto';