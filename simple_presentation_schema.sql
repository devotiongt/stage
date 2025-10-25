-- Schema simplificado para la pantalla de presentación
-- Usar esto si tienes problemas con RLS o funciones RPC

-- Crear la tabla si no existe
CREATE TABLE IF NOT EXISTS presentation_display (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  display_type VARCHAR(20) NOT NULL CHECK (display_type IN ('welcome', 'qr_code', 'question', 'custom_message')),
  question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
  custom_message TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_presentation_display_event_id ON presentation_display(event_id);
CREATE INDEX IF NOT EXISTS idx_presentation_display_active ON presentation_display(event_id, is_active) WHERE is_active = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_presentation_display_unique_active 
ON presentation_display(event_id) WHERE is_active = true;

-- DESACTIVAR RLS para evitar problemas de conexión
ALTER TABLE presentation_display DISABLE ROW LEVEL SECURITY;

-- O si prefieres mantener RLS pero con políticas más permisivas:
-- ALTER TABLE presentation_display ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "presentation_display_policy" ON presentation_display;
-- CREATE POLICY "presentation_display_policy" ON presentation_display FOR ALL TO anon, authenticated USING (true);

-- Verificar que la tabla se creó correctamente
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as "RLS_enabled"
FROM pg_tables 
WHERE tablename = 'presentation_display';

-- Ver datos existentes
SELECT * FROM presentation_display ORDER BY created_at DESC LIMIT 5;