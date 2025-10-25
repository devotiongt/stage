-- =========================================
-- VERSIÓN CORREGIDA DE FUNCIONES PARA ORGANIZACIONES
-- =========================================

-- =========================================
-- 1. FUNCIÓN CORREGIDA PARA OBTENER ORGANIZACIONES
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

  -- Versión simplificada sin problemas de GROUP BY
  SELECT json_agg(
    json_build_object(
      'id', u.id::text,
      'email', u.email,
      'email_confirmed_at', u.email_confirmed_at,
      'created_at', u.created_at,
      'last_sign_in_at', u.last_sign_in_at,
      'organization_name', u.raw_user_meta_data->>'organization_name',
      'country', u.raw_user_meta_data->>'country',
      'phone', u.raw_user_meta_data->>'phone',
      'website', u.raw_user_meta_data->>'website',
      'facebook', u.raw_user_meta_data->>'facebook',
      'instagram', u.raw_user_meta_data->>'instagram',
      'description', u.raw_user_meta_data->>'description',
      'event_types', u.raw_user_meta_data->>'event_types',
      'expected_attendance', u.raw_user_meta_data->>'expected_attendance',
      'status', COALESCE(u.raw_user_meta_data->>'status', 'pending_verification'),
      'reviewed_at', u.raw_user_meta_data->>'reviewed_at',
      'reviewed_by', u.raw_user_meta_data->>'reviewed_by',
      'rejection_reason', u.raw_user_meta_data->>'rejection_reason'
    )
  ) INTO result
  FROM (
    SELECT *
    FROM auth.users
    WHERE raw_user_meta_data->>'organization_name' IS NOT NULL
    ORDER BY created_at DESC
  ) u;

  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================
-- 2. FUNCIÓN PARA APROBAR ORGANIZACIÓN (SIN CAMBIOS)
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
-- 3. FUNCIÓN PARA RECHAZAR ORGANIZACIÓN (SIN CAMBIOS)
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
-- CONSULTAS DE PRUEBA SEGURAS
-- =========================================

-- Ver organizaciones pendientes (consulta directa segura)
SELECT 
    id,
    email,
    raw_user_meta_data->>'organization_name' as organizacion,
    raw_user_meta_data->>'country' as pais,
    raw_user_meta_data->>'status' as estado,
    created_at as fecha_registro
FROM auth.users
WHERE 
    raw_user_meta_data->>'organization_name' IS NOT NULL
ORDER BY created_at DESC;

-- Probar la función (ejecutar como super_admin)
SELECT get_organizations_for_review();

-- Estadísticas simples
SELECT 
    COALESCE(raw_user_meta_data->>'status', 'pending_verification') as estado,
    COUNT(*) as total
FROM auth.users
WHERE raw_user_meta_data->>'organization_name' IS NOT NULL
GROUP BY raw_user_meta_data->>'status';