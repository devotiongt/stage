-- =========================================
-- CONSULTAS RÁPIDAS PARA ORGANIZACIONES
-- =========================================

-- =========================================
-- 1. VER TODAS LAS ORGANIZACIONES REGISTRADAS
-- =========================================
SELECT 
    email,
    raw_user_meta_data->>'organization_name' as organizacion,
    raw_user_meta_data->>'country' as pais,
    raw_user_meta_data->>'status' as estado,
    created_at as fecha_registro
FROM auth.users
WHERE raw_user_meta_data->>'organization_name' IS NOT NULL
ORDER BY created_at DESC;

-- =========================================
-- 2. VER SOLO ORGANIZACIONES PENDIENTES
-- =========================================
SELECT 
    id,
    email,
    raw_user_meta_data->>'organization_name' as organizacion,
    raw_user_meta_data->>'description' as descripcion,
    raw_user_meta_data->>'status' as estado
FROM auth.users
WHERE 
    raw_user_meta_data->>'organization_name' IS NOT NULL
    AND (raw_user_meta_data->>'status' = 'pending_verification' 
         OR raw_user_meta_data->>'status' IS NULL);

-- =========================================
-- 3. APROBAR UNA ORGANIZACIÓN (SIMPLE)
-- =========================================
-- Cambia 'organizacion@ejemplo.com' por el email real
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
    raw_user_meta_data, 
    '{status}', 
    '"approved"'
)
WHERE email = 'organizacion@ejemplo.com';

-- =========================================
-- 4. RECHAZAR UNA ORGANIZACIÓN (SIMPLE)
-- =========================================
-- Cambia 'organizacion@ejemplo.com' por el email real
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
    jsonb_set(
        raw_user_meta_data, 
        '{status}', 
        '"rejected"'
    ),
    '{rejection_reason}',
    '"No cumple con los requisitos"'
)
WHERE email = 'organizacion@ejemplo.com';

-- =========================================
-- 5. ESTADÍSTICAS RÁPIDAS
-- =========================================
SELECT 
    CASE 
        WHEN raw_user_meta_data->>'status' = 'approved' THEN 'Aprobadas'
        WHEN raw_user_meta_data->>'status' = 'rejected' THEN 'Rechazadas'
        ELSE 'Pendientes'
    END as estado,
    COUNT(*) as cantidad
FROM auth.users
WHERE raw_user_meta_data->>'organization_name' IS NOT NULL
GROUP BY raw_user_meta_data->>'status';

-- =========================================
-- 6. BUSCAR ORGANIZACIÓN POR EMAIL
-- =========================================
-- Cambia 'email@buscar.com' por el email que buscas
SELECT 
    email,
    raw_user_meta_data->>'organization_name' as organizacion,
    raw_user_meta_data->>'status' as estado,
    raw_user_meta_data->>'description' as descripcion,
    created_at
FROM auth.users
WHERE 
    email = 'email@buscar.com' 
    AND raw_user_meta_data->>'organization_name' IS NOT NULL;