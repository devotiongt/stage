-- Schema para el sistema de encuestas/polls
-- Usar esto para crear las tablas necesarias para el sistema de encuestas

-- Tabla principal de encuestas
CREATE TABLE IF NOT EXISTS polls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'ended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Preguntas de encuesta
CREATE TABLE IF NOT EXISTS poll_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(20) DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'single_choice', 'text', 'rating')),
  is_required BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Opciones para preguntas de selección múltiple/única
CREATE TABLE IF NOT EXISTS poll_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES poll_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Respuestas de los participantes
CREATE TABLE IF NOT EXISTS poll_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES poll_questions(id) ON DELETE CASCADE,
  option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE,
  user_identifier VARCHAR(255) NOT NULL, -- IP o identificador único del usuario
  response_text TEXT, -- Para respuestas de texto libre
  rating_value INTEGER, -- Para preguntas tipo rating (1-5, 1-10, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Evitar respuestas duplicadas del mismo usuario a la misma pregunta
  UNIQUE(question_id, user_identifier)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_polls_event_id ON polls(event_id);
CREATE INDEX IF NOT EXISTS idx_polls_status ON polls(event_id, status);

CREATE INDEX IF NOT EXISTS idx_poll_questions_poll_id ON poll_questions(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_questions_order ON poll_questions(poll_id, order_index);

CREATE INDEX IF NOT EXISTS idx_poll_options_question_id ON poll_options(question_id);
CREATE INDEX IF NOT EXISTS idx_poll_options_order ON poll_options(question_id, order_index);

CREATE INDEX IF NOT EXISTS idx_poll_responses_poll_id ON poll_responses(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_responses_question_id ON poll_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_poll_responses_user ON poll_responses(poll_id, user_identifier);

-- Índice único para garantizar una sola encuesta activa por evento
CREATE UNIQUE INDEX IF NOT EXISTS idx_polls_unique_active 
ON polls(event_id) WHERE status = 'active';

-- HABILITAR RLS para que funcionen las suscripciones en tiempo real
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_responses ENABLE ROW LEVEL SECURITY;

-- Políticas para permitir acceso público a las encuestas (como en el resto de la app)
CREATE POLICY "polls_policy" ON polls FOR ALL TO anon, authenticated USING (true);
CREATE POLICY "poll_questions_policy" ON poll_questions FOR ALL TO anon, authenticated USING (true);
CREATE POLICY "poll_options_policy" ON poll_options FOR ALL TO anon, authenticated USING (true);
CREATE POLICY "poll_responses_policy" ON poll_responses FOR ALL TO anon, authenticated USING (true);

-- Función para obtener resultados de encuesta con estadísticas
CREATE OR REPLACE FUNCTION get_poll_results(p_poll_id UUID)
RETURNS TABLE (
  question_id UUID,
  question_text TEXT,
  question_type VARCHAR(20),
  option_id UUID,
  option_text TEXT,
  response_count BIGINT,
  total_responses BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH question_totals AS (
    SELECT 
      pr.question_id,
      COUNT(*) as total_count
    FROM poll_responses pr
    WHERE pr.poll_id = p_poll_id
    GROUP BY pr.question_id
  )
  SELECT 
    pq.id as question_id,
    pq.question_text,
    pq.question_type,
    po.id as option_id,
    po.option_text,
    COALESCE(COUNT(pr.id), 0) as response_count,
    COALESCE(qt.total_count, 0) as total_responses
  FROM poll_questions pq
  LEFT JOIN poll_options po ON pq.id = po.question_id
  LEFT JOIN poll_responses pr ON po.id = pr.option_id
  LEFT JOIN question_totals qt ON pq.id = qt.question_id
  WHERE pq.poll_id = p_poll_id
  GROUP BY pq.id, pq.question_text, pq.question_type, po.id, po.option_text, qt.total_count
  ORDER BY pq.order_index, po.order_index;
END;
$$ LANGUAGE plpgsql;

-- Función para activar una encuesta (desactivando otras del mismo evento)
CREATE OR REPLACE FUNCTION activate_poll(p_poll_id UUID)
RETURNS void AS $$
DECLARE
  v_event_id UUID;
BEGIN
  -- Obtener el event_id de la encuesta
  SELECT event_id INTO v_event_id FROM polls WHERE id = p_poll_id;
  
  -- Desactivar todas las encuestas del evento
  UPDATE polls 
  SET status = 'ended', ended_at = CURRENT_TIMESTAMP 
  WHERE event_id = v_event_id AND status = 'active';
  
  -- Activar la encuesta seleccionada
  UPDATE polls 
  SET status = 'active', started_at = CURRENT_TIMESTAMP 
  WHERE id = p_poll_id;
END;
$$ LANGUAGE plpgsql;

-- Verificar que las tablas se crearon correctamente
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as "RLS_enabled"
FROM pg_tables 
WHERE tablename IN ('polls', 'poll_questions', 'poll_options', 'poll_responses')
ORDER BY tablename;

-- Ejemplo de datos iniciales (comentado para evitar duplicados)
/*
-- Insertar una encuesta de ejemplo
INSERT INTO polls (event_id, title, status) 
VALUES ('your-event-id-here', 'Encuesta de Satisfacción', 'draft');

-- Obtener el ID de la encuesta recién creada
-- Reemplazar 'poll-id-here' con el ID real
INSERT INTO poll_questions (poll_id, question_text, question_type, order_index) VALUES
('poll-id-here', '¿Cómo calificarías este evento?', 'single_choice', 1),
('poll-id-here', '¿Qué temas te gustaron más?', 'multiple_choice', 2),
('poll-id-here', 'Comentarios adicionales', 'text', 3);

-- Opciones para la primera pregunta
INSERT INTO poll_options (question_id, option_text, order_index) VALUES
('question-1-id', 'Excelente', 1),
('question-1-id', 'Muy bueno', 2),
('question-1-id', 'Bueno', 3),
('question-1-id', 'Regular', 4),
('question-1-id', 'Malo', 5);

-- Opciones para la segunda pregunta
INSERT INTO poll_options (question_id, option_text, order_index) VALUES
('question-2-id', 'Tecnología', 1),
('question-2-id', 'Innovación', 2),
('question-2-id', 'Sustentabilidad', 3),
('question-2-id', 'Educación', 4);
*/