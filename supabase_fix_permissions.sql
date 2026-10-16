-- ============================================================
-- SCRIPT DE PERMISOS SUPABASE: Habilitar UPDATE y DELETE en formularios
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query > Run
-- Proyecto: rjubbjhilulctbqsjxuv (Sekunet Acción de Personal)
-- ============================================================

-- Opción recomendada: Deshabilitar RLS en la tabla formularios
-- Esto garantiza que las firmas de Jefatura y RRHH se guarden inmediatamente sin bloqueos.
ALTER TABLE public.formularios DISABLE ROW LEVEL SECURITY;

-- Por si se prefiere mantener RLS activo con políticas permisivas:
/*
ALTER TABLE public.formularios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "formularios_select_all" ON public.formularios;
CREATE POLICY "formularios_select_all" ON public.formularios FOR SELECT USING (true);

DROP POLICY IF EXISTS "formularios_insert_all" ON public.formularios;
CREATE POLICY "formularios_insert_all" ON public.formularios FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "formularios_update_all" ON public.formularios;
CREATE POLICY "formularios_update_all" ON public.formularios FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "formularios_delete_all" ON public.formularios;
CREATE POLICY "formularios_delete_all" ON public.formularios FOR DELETE USING (true);
*/
