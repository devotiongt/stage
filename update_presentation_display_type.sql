-- Actualizar el constraint de display_type para incluir 'active_poll'

-- Primero, eliminar el constraint existente
ALTER TABLE presentation_display 
DROP CONSTRAINT presentation_display_display_type_check;

-- Luego, agregar el nuevo constraint con 'active_poll' incluido
ALTER TABLE presentation_display 
ADD CONSTRAINT presentation_display_display_type_check 
CHECK (display_type IN ('welcome', 'qr_code', 'question', 'custom_message', 'active_poll', 'poll_results'));

-- Mensaje de confirmación
SELECT 'Constraint actualizado exitosamente. Ahora display_type acepta: welcome, qr_code, question, custom_message, active_poll, poll_results' AS mensaje;