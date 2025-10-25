-- =========================================
-- HACERTE SUPER ADMIN PARA PODER USAR LAS FUNCIONES
-- =========================================

-- Ejecuta esta consulta primero para hacerte super admin:
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    '"super_admin"'
)
WHERE email = 'kevinalbertoorellana@gmail.com';

-- Verificar que funcionó:
SELECT 
    email,
    raw_user_meta_data->>'role' as rol,
    CASE 
        WHEN raw_user_meta_data->>'role' = 'super_admin' THEN '✅ Eres Super Admin'
        ELSE '❌ No eres Super Admin'
    END as estado
FROM auth.users
WHERE email = 'kevinalbertoorellana@gmail.com';