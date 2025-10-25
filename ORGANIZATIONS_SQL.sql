-- =========================================
-- FUNCIONES PARA GESTIÓN DE ORGANIZACIONES
-- =========================================

-- =========================================
-- 1. FUNCIÓN PARA OBTENER ORGANIZACIONES PENDIENTES DE REVISIÓN
-- =========================================
CREATE OR REPLACE FUNCTION get_organizations_for_review()
RETURNS json AS $$
DECLARE
  current_user_role TEXT;
  result json;
BEGIN
  -- Verificar que el usuario actual es super_admin
  SELECT raw_user_meta_data->>'role' INTO current_user_role
  FROM auth.users
  WHERE id = auth.uid();

  IF current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Solo los super administradores pueden ver organizaciones';
  END IF;

  -- Obtener todos los usuarios con sus datos de organización desde metadata
  WITH organization_data AS (
    SELECT 
      id,
      email,
      email_confirmed_at,
      created_at,
      last_sign_in_at,
      raw_user_meta_data->>'organization_name' as organization_name,
      raw_user_meta_data->>'country' as country,
      raw_user_meta_data->>'phone' as phone,
      raw_user_meta_data->>'website' as website,
      raw_user_meta_data->>'facebook' as facebook,
      raw_user_meta_data->>'instagram' as instagram,
      raw_user_meta_data->>'description' as description,
      raw_user_meta_data->>'event_types' as event_types,
      raw_user_meta_data->>'expected_attendance' as expected_attendance,
      COALESCE(raw_user_meta_data->>'status', 'pending_verification') as status,
      raw_user_meta_data->>'reviewed_at' as reviewed_at,
      raw_user_meta_data->>'reviewed_by' as reviewed_by,
      raw_user_meta_data->>'rejection_reason' as rejection_reason
    FROM auth.users
    WHERE raw_user_meta_data->>'organization_name' IS NOT NULL
    ORDER BY created_at DESC
  )
  SELECT json_agg(
    json_build_object(
      'id', id,
      'email', email,
      'email_confirmed_at', email_confirmed_at,
      'created_at', created_at,
      'last_sign_in_at', last_sign_in_at,
      'organization_name', organization_name,
      'country', country,
      'phone', phone,
      'website', website,
      'facebook', facebook,
      'instagram', instagram,
      'description', description,
      'event_types', event_types,
      'expected_attendance', expected_attendance,
      'status', status,
      'reviewed_at', reviewed_at,
      'reviewed_by', reviewed_by,
      'rejection_reason', rejection_reason
    )
  ) INTO result
  FROM organization_data;

  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================
-- 2. FUNCIÓN PARA APROBAR ORGANIZACIÓN
-- =========================================
CREATE OR REPLACE FUNCTION approve_organization(
  target_user_id UUID
)
RETURNS json AS $$
DECLARE
  current_user_role TEXT;
  current_user_email TEXT;
BEGIN
  -- Verificar que el usuario actual es super_admin
  SELECT raw_user_meta_data->>'role', email INTO current_user_role, current_user_email
  FROM auth.users
  WHERE id = auth.uid();

  IF current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Solo los super administradores pueden aprobar organizaciones';
  END IF;

  -- Actualizar el estado a aprobado
  UPDATE auth.users 
  SET raw_user_meta_data = raw_user_meta_data || 
    jsonb_build_object(
      'status', 'approved',
      'reviewed_at', CURRENT_TIMESTAMP::text,
      'reviewed_by', current_user_email
    )
  WHERE id = target_user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Organización aprobada exitosamente'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================
-- 3. FUNCIÓN PARA RECHAZAR ORGANIZACIÓN
-- =========================================
CREATE OR REPLACE FUNCTION reject_organization(
  target_user_id UUID,
  rejection_reason TEXT DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  current_user_role TEXT;
  current_user_email TEXT;
BEGIN
  -- Verificar que el usuario actual es super_admin
  SELECT raw_user_meta_data->>'role', email INTO current_user_role, current_user_email
  FROM auth.users
  WHERE id = auth.uid();

  IF current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Solo los super administradores pueden rechazar organizaciones';
  END IF;

  -- Actualizar el estado a rechazado
  UPDATE auth.users 
  SET raw_user_meta_data = raw_user_meta_data || 
    jsonb_build_object(
      'status', 'rejected',
      'reviewed_at', CURRENT_TIMESTAMP::text,
      'reviewed_by', current_user_email,
      'rejection_reason', COALESCE(rejection_reason, 'No cumple con los criterios de elegibilidad')
    )
  WHERE id = target_user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Organización rechazada'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================
-- 4. VER TODAS LAS ORGANIZACIONES PENDIENTES (QUERY DIRECTA)
-- =========================================
SELECT 
  email,
  raw_user_meta_data->>'organization_name' as organizacion,
  raw_user_meta_data->>'country' as pais,
  raw_user_meta_data->>'status' as estado,
  created_at as fecha_registro
FROM auth.users
WHERE 
  raw_user_meta_data->>'organization_name' IS NOT NULL
  AND (raw_user_meta_data->>'status' = 'pending_verification' 
       OR raw_user_meta_data->>'status' IS NULL)
ORDER BY created_at DESC;

-- =========================================
-- 5. VER ORGANIZACIONES APROBADAS
-- =========================================
SELECT 
  email,
  raw_user_meta_data->>'organization_name' as organizacion,
  raw_user_meta_data->>'status' as estado,
  raw_user_meta_data->>'reviewed_by' as aprobado_por,
  raw_user_meta_data->>'reviewed_at' as fecha_aprobacion
FROM auth.users
WHERE 
  raw_user_meta_data->>'status' = 'approved'
ORDER BY raw_user_meta_data->>'reviewed_at' DESC;

-- =========================================
-- 6. APROBAR ORGANIZACIÓN MANUALMENTE (SIN FUNCIÓN)
-- =========================================
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || 
  jsonb_build_object(
    'status', 'approved',
    'reviewed_at', NOW()::text,
    'reviewed_by', 'manual'
  )
WHERE email = 'organizacion@ejemplo.com';  -- Cambia el email

-- =========================================
-- 7. RECHAZAR ORGANIZACIÓN MANUALMENTE
-- =========================================
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || 
  jsonb_build_object(
    'status', 'rejected',
    'rejection_reason', 'No cumple requisitos',
    'reviewed_at', NOW()::text,
    'reviewed_by', 'manual'
  )
WHERE email = 'organizacion@ejemplo.com';  -- Cambia el email

-- =========================================
-- 8. ESTADÍSTICAS DE ORGANIZACIONES
-- =========================================
SELECT 
  COALESCE(raw_user_meta_data->>'status', 'pending_verification') as estado,
  COUNT(*) as total
FROM auth.users
WHERE raw_user_meta_data->>'organization_name' IS NOT NULL
GROUP BY raw_user_meta_data->>'status'
ORDER BY total DESC;