-- =========================================
-- CONSULTAS SQL PARA GESTIÓN DE ROLES
-- =========================================
-- Ejecuta estas consultas en el SQL Editor de Supabase
-- https://app.supabase.com/project/[tu-proyecto]/sql/new

-- =========================================
-- 1. ASIGNAR SUPER ADMIN A TU CUENTA
-- =========================================
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    '"super_admin"'
)
WHERE email = 'kevinalbertoorellana@gmail.com';

-- =========================================
-- 2. ASIGNAR ADMIN A UN USUARIO
-- =========================================
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    '"admin"'
)
WHERE email = 'admin@ejemplo.com';  -- Cambia el email

-- =========================================
-- 3. ASIGNAR MODERADOR A UN USUARIO
-- =========================================
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    '"moderator"'
)
WHERE email = 'moderador@ejemplo.com';  -- Cambia el email

-- =========================================
-- 4. ASIGNAR USUARIO BÁSICO
-- =========================================
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    '"user"'
)
WHERE email = 'usuario@ejemplo.com';  -- Cambia el email

-- =========================================
-- 5. ASIGNAR MÚLTIPLES SUPER ADMINS DE UNA VEZ
-- =========================================
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    '"super_admin"'
)
WHERE email IN (
    'kevinalbertoorellana@gmail.com',
    'otro-admin@ejemplo.com',
    'tercer-admin@ejemplo.com'
);

-- =========================================
-- 6. VER TODOS LOS USUARIOS Y SUS ROLES
-- =========================================
SELECT 
    id,
    email,
    raw_user_meta_data->>'role' as role,
    raw_user_meta_data->>'status' as status,
    raw_user_meta_data->>'organization_name' as organization,
    created_at,
    last_sign_in_at
FROM auth.users
ORDER BY 
    CASE 
        WHEN raw_user_meta_data->>'role' = 'super_admin' THEN 1
        WHEN raw_user_meta_data->>'role' = 'admin' THEN 2
        WHEN raw_user_meta_data->>'role' = 'moderator' THEN 3
        ELSE 4
    END,
    created_at DESC;

-- =========================================
-- 7. VER SOLO ADMINISTRADORES
-- =========================================
SELECT 
    id,
    email,
    raw_user_meta_data->>'role' as role,
    created_at,
    last_sign_in_at
FROM auth.users
WHERE raw_user_meta_data->>'role' IN ('super_admin', 'admin')
ORDER BY created_at DESC;

-- =========================================
-- 8. CAMBIAR ROL DE UN USUARIO (GENERAL)
-- =========================================
-- Reemplaza 'email@ejemplo.com' con el email del usuario
-- Reemplaza 'nuevo_rol' con: super_admin, admin, moderator, o user
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    '"nuevo_rol"'
)
WHERE email = 'email@ejemplo.com';

-- =========================================
-- 9. REMOVER ROL (VOLVER A USUARIO BÁSICO)
-- =========================================
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data - 'role'
WHERE email = 'email@ejemplo.com';

-- =========================================
-- 10. VERIFICAR ROL DE UN USUARIO ESPECÍFICO
-- =========================================
SELECT 
    email,
    raw_user_meta_data->>'role' as role,
    raw_user_meta_data->>'status' as status,
    CASE 
        WHEN raw_user_meta_data->>'role' = 'super_admin' THEN 'Acceso completo'
        WHEN raw_user_meta_data->>'role' = 'admin' THEN 'Puede gestionar usuarios'
        WHEN raw_user_meta_data->>'role' = 'moderator' THEN 'Puede gestionar eventos'
        ELSE 'Usuario básico'
    END as permisos
FROM auth.users
WHERE email = 'kevinalbertoorellana@gmail.com';

-- =========================================
-- 11. ACTUALIZAR MÚLTIPLES CAMPOS DE METADATA
-- =========================================
-- Útil para actualizar rol Y estado al mismo tiempo
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || 
    '{"role": "admin", "status": "approved"}'::jsonb
WHERE email = 'admin@ejemplo.com';

-- =========================================
-- 12. CONTAR USUARIOS POR ROL
-- =========================================
SELECT 
    COALESCE(raw_user_meta_data->>'role', 'user') as role,
    COUNT(*) as total
FROM auth.users
GROUP BY raw_user_meta_data->>'role'
ORDER BY 
    CASE 
        WHEN raw_user_meta_data->>'role' = 'super_admin' THEN 1
        WHEN raw_user_meta_data->>'role' = 'admin' THEN 2
        WHEN raw_user_meta_data->>'role' = 'moderator' THEN 3
        ELSE 4
    END;

-- =========================================
-- NOTAS IMPORTANTES:
-- =========================================
-- 1. Los cambios en metadata se reflejan inmediatamente
-- 2. El usuario debe cerrar sesión y volver a iniciar para ver los cambios
-- 3. Solo ejecuta estas consultas desde el panel de Supabase
-- 4. Ten cuidado con los permisos de super_admin
-- 5. Mantén un registro de quién tiene qué rol

-- =========================================
-- ROLES DISPONIBLES:
-- =========================================
-- super_admin : Acceso completo, puede asignar roles
-- admin       : Gestión de usuarios y eventos
-- moderator   : Solo gestión de eventos
-- user        : Usuario básico con acceso al dashboard