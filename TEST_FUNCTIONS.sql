-- =========================================
-- PROBAR LAS FUNCIONES DE ORGANIZACIONES
-- =========================================

-- 1. Probar obtener organizaciones (debe ejecutarse como super_admin)
SELECT get_organizations_for_review();

-- 2. Si no hay organizaciones reales, crear una de prueba:
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'test-org@ejemplo.com',
    '$2a$10$dummy.hash.for.testing',
    NOW(),
    '{
        "organization_name": "Organización de Prueba",
        "country": "GT", 
        "description": "Esta es una organización de prueba",
        "status": "pending_verification"
    }'::jsonb,
    NOW(),
    NOW()
);

-- 3. Aprobar la organización de prueba:
SELECT approve_organization(
    (SELECT id FROM auth.users WHERE email = 'test-org@ejemplo.com')
);

-- 4. Ver el resultado:
SELECT get_organizations_for_review();