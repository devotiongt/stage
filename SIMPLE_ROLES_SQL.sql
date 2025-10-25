-- =========================================
-- SISTEMA SIMPLIFICADO: SOLO 2 ROLES
-- =========================================
-- super_admin: Acceso completo, gestión de usuarios
-- user: Usuario normal (por defecto si no tiene rol)

-- =========================================
-- 1. HACERTE SUPER ADMIN
-- =========================================
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    '"super_admin"'
)
WHERE email = 'kevinalbertoorellana@gmail.com';

-- =========================================
-- 2. HACER SUPER ADMIN A OTRO USUARIO
-- =========================================
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    '"super_admin"'
)
WHERE email = 'otro-admin@ejemplo.com';  -- Cambia el email

-- =========================================
-- 3. CONVERTIR A USUARIO NORMAL (QUITAR SUPER ADMIN)
-- =========================================
-- Opción 1: Eliminar el campo role completamente
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data - 'role'
WHERE email = 'usuario@ejemplo.com';

-- Opción 2: Establecer explícitamente como user
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    '"user"'
)
WHERE email = 'usuario@ejemplo.com';

-- =========================================
-- 4. VER TODOS LOS SUPER ADMINS
-- =========================================
SELECT 
    email,
    raw_user_meta_data->>'role' as role,
    created_at,
    last_sign_in_at
FROM auth.users
WHERE raw_user_meta_data->>'role' = 'super_admin'
ORDER BY created_at DESC;

-- =========================================
-- 5. VER TODOS LOS USUARIOS Y SU TIPO
-- =========================================
SELECT 
    email,
    CASE 
        WHEN raw_user_meta_data->>'role' = 'super_admin' THEN '🌟 Super Admin'
        ELSE '👤 Usuario Normal'
    END as tipo_usuario,
    raw_user_meta_data->>'status' as estado_cuenta,
    created_at
FROM auth.users
ORDER BY 
    CASE WHEN raw_user_meta_data->>'role' = 'super_admin' THEN 0 ELSE 1 END,
    created_at DESC;

-- =========================================
-- 6. VERIFICAR TU ROL ACTUAL
-- =========================================
SELECT 
    email,
    CASE 
        WHEN raw_user_meta_data->>'role' = 'super_admin' THEN '✅ Eres Super Admin - Tienes acceso completo'
        ELSE '👤 Eres Usuario Normal - Acceso estándar'
    END as tu_rol
FROM auth.users
WHERE email = 'kevinalbertoorellana@gmail.com';

-- =========================================
-- 7. HACER MÚLTIPLES SUPER ADMINS DE UNA VEZ
-- =========================================
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    '"super_admin"'
)
WHERE email IN (
    'kevinalbertoorellana@gmail.com',
    'admin2@ejemplo.com',
    'admin3@ejemplo.com'
);

-- =========================================
-- 8. CONTAR USUARIOS POR TIPO
-- =========================================
SELECT 
    CASE 
        WHEN raw_user_meta_data->>'role' = 'super_admin' THEN 'Super Admins'
        ELSE 'Usuarios Normales'
    END as tipo,
    COUNT(*) as total
FROM auth.users
GROUP BY 
    CASE WHEN raw_user_meta_data->>'role' = 'super_admin' THEN 'Super Admins' ELSE 'Usuarios Normales' END;

-- =========================================
-- FUNCIÓN RPC ACTUALIZADA PARA 2 ROLES
-- =========================================
CREATE OR REPLACE FUNCTION update_user_role(
  target_email TEXT,
  new_role TEXT
)
RETURNS json AS $$
DECLARE
  current_user_role TEXT;
  target_user_id UUID;
BEGIN
  -- Verificar que el usuario actual es super_admin
  SELECT raw_user_meta_data->>'role' INTO current_user_role
  FROM auth.users
  WHERE id = auth.uid();

  IF current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Solo los super administradores pueden asignar roles';
  END IF;

  -- Verificar que el nuevo rol es válido (solo super_admin o user)
  IF new_role NOT IN ('super_admin', 'user') THEN
    RAISE EXCEPTION 'Rol no válido. Solo: super_admin o user';
  END IF;

  -- Si es 'user', simplemente eliminar el rol (por defecto serán usuarios normales)
  IF new_role = 'user' THEN
    UPDATE auth.users 
    SET raw_user_meta_data = raw_user_meta_data - 'role'
    WHERE email = target_email;
  ELSE
    -- Si es super_admin, asignarlo
    UPDATE auth.users 
    SET raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{role}',
      to_jsonb(new_role)
    )
    WHERE email = target_email;
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', format('Rol %s asignado a %s', new_role, target_email)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;