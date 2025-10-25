-- Tabla para controlar qué se muestra en la pantalla de presentación
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

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_presentation_display_event_id ON presentation_display(event_id);
CREATE INDEX IF NOT EXISTS idx_presentation_display_active ON presentation_display(event_id, is_active) WHERE is_active = true;

-- Solo debe haber una presentación activa por evento
CREATE UNIQUE INDEX IF NOT EXISTS idx_presentation_display_unique_active 
ON presentation_display(event_id) WHERE is_active = true;

-- Habilitar RLS
ALTER TABLE presentation_display ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Presentation display viewable by everyone" ON presentation_display
  FOR SELECT USING (true);

CREATE POLICY "Presentation display manageable by authenticated users" ON presentation_display
  FOR ALL USING (true);

-- Función para actualizar el display de presentación
CREATE OR REPLACE FUNCTION update_presentation_display(
  p_event_id UUID,
  p_display_type VARCHAR(20),
  p_question_id UUID DEFAULT NULL,
  p_custom_message TEXT DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  -- Desactivar cualquier display activo previo
  UPDATE presentation_display 
  SET is_active = false, updated_at = CURRENT_TIMESTAMP
  WHERE event_id = p_event_id AND is_active = true;
  
  -- Crear nuevo display activo
  INSERT INTO presentation_display (event_id, display_type, question_id, custom_message, is_active)
  VALUES (p_event_id, p_display_type, p_question_id, p_custom_message, true)
  RETURNING 
    json_build_object(
      'id', id,
      'event_id', event_id,
      'display_type', display_type,
      'question_id', question_id,
      'custom_message', custom_message,
      'is_active', is_active,
      'created_at', created_at
    ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para actualizar updated_at
CREATE TRIGGER update_presentation_display_updated_at 
  BEFORE UPDATE ON presentation_display
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();