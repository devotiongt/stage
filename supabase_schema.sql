-- Los datos de organizaciones ahora se almacenan en auth.users.user_metadata
-- No necesitamos tabla separada de perfiles

-- Crear tabla de eventos
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  access_code VARCHAR(20) NOT NULL UNIQUE,
  admin_code VARCHAR(20) NOT NULL,
  type VARCHAR(50) DEFAULT 'panel' CHECK (type IN ('panel', 'poll', 'quiz')),
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

-- =========================================
-- FUNCIÓN RPC PARA ACTUALIZAR ROLES DE USUARIO
-- =========================================
-- Esta función permite a los super_admin actualizar roles de otros usuarios
CREATE OR REPLACE FUNCTION update_user_role(
  target_email TEXT,
  new_role TEXT
)
RETURNS json AS $$
DECLARE
  current_user_role TEXT;
  target_user_id UUID;
  result json;
BEGIN
  -- Obtener el rol del usuario actual desde metadata
  SELECT raw_user_meta_data->>'role' INTO current_user_role
  FROM auth.users
  WHERE id = auth.uid();

  -- Verificar que el usuario actual es super_admin
  IF current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Solo los super administradores pueden asignar roles';
  END IF;

  -- Verificar que el nuevo rol es válido
  IF new_role NOT IN ('super_admin', 'admin', 'moderator', 'user') THEN
    RAISE EXCEPTION 'Rol no válido: %', new_role;
  END IF;

  -- Obtener el ID del usuario objetivo
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = target_email;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado: %', target_email;
  END IF;

  -- Actualizar el rol en metadata
  UPDATE auth.users 
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(new_role)
  )
  WHERE id = target_user_id;

  -- Retornar resultado
  result := json_build_object(
    'success', true,
    'message', format('Rol %s asignado a %s', new_role, target_email),
    'user_id', target_user_id,
    'role', new_role
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tabla para gestión de roles de usuarios
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'admin', 'moderator', 'user')),
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id)
);

-- Índices para user_roles
CREATE INDEX IF NOT EXISTS idx_user_roles_email ON user_roles(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Habilitar RLS en user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para user_roles
CREATE POLICY "User roles are viewable by admins" ON user_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "User roles can be managed by super_admins" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'super_admin'
    )
  );

-- Función para obtener el rol de un usuario
CREATE OR REPLACE FUNCTION get_user_role(user_email TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM user_roles 
    WHERE email = user_email
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para asignar rol a usuario
CREATE OR REPLACE FUNCTION assign_user_role(
  target_email TEXT,
  new_role TEXT,
  assigned_by_id UUID
)
RETURNS VOID AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Verificar que quien asigna es super_admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = assigned_by_id AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Solo los super administradores pueden asignar roles';
  END IF;

  -- Obtener el user_id del email objetivo
  SELECT id INTO target_user_id
  FROM auth.users 
  WHERE email = target_email;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado: %', target_email;
  END IF;

  -- Insertar o actualizar el rol
  INSERT INTO user_roles (user_id, email, role, assigned_by)
  VALUES (target_user_id, target_email, new_role, assigned_by_id)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    role = new_role,
    assigned_by = assigned_by_id,
    updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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