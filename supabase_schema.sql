-- Los datos de organizaciones ahora se almacenan en auth.users.user_metadata
-- No necesitamos tabla separada de perfiles

-- Crear tabla de eventos
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  access_code VARCHAR(20) NOT NULL UNIQUE,
  admin_code VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de preguntas
CREATE TABLE IF NOT EXISTS questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_name VARCHAR(100) DEFAULT 'Anónimo',
  votes INTEGER DEFAULT 0,
  is_answered BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_questions_event_id ON questions(event_id);
CREATE INDEX IF NOT EXISTS idx_questions_votes ON questions(votes DESC);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at DESC);

-- Habilitar Row Level Security (RLS)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para events
CREATE POLICY "Events are viewable by everyone" ON events
  FOR SELECT USING (true);

CREATE POLICY "Events can be created by anyone" ON events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Events can be updated by admin" ON events
  FOR UPDATE USING (true);

-- Políticas de seguridad para questions
CREATE POLICY "Questions are viewable by everyone" ON questions
  FOR SELECT USING (true);

CREATE POLICY "Questions can be created by anyone" ON questions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Questions can be updated by anyone" ON questions
  FOR UPDATE USING (true);

CREATE POLICY "Questions can be deleted by anyone" ON questions
  FOR DELETE USING (true);

-- Función para actualizar el timestamp updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at automáticamente
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();