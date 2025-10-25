-- Agregar columna poll_id para permitir mostrar resultados de encuestas específicas
ALTER TABLE presentation_display 
ADD COLUMN poll_id UUID REFERENCES polls(id) ON DELETE SET NULL;

-- Mensaje de confirmación
SELECT 'Columna poll_id agregada exitosamente. Ahora se pueden mostrar resultados de encuestas específicas.' AS mensaje;