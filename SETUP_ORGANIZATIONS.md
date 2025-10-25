# 🏢 Configuración de Sistema de Organizaciones

## ✅ **Paso 1: Hacerte Super Admin**

**Ve a:** https://app.supabase.com/project/[tu-proyecto]/sql/new

**Ejecuta:**
```sql
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    '"super_admin"'
)
WHERE email = 'kevinalbertoorellana@gmail.com';
```

**Verifica:**
```sql
SELECT 
    email,
    raw_user_meta_data->>'role' as rol
FROM auth.users
WHERE email = 'kevinalbertoorellana@gmail.com';
```

---

## ✅ **Paso 2: Crear Funciones SQL**

**Copia TODO el contenido del archivo `ORGANIZATIONS_SQL.sql` y pégalo en el SQL Editor.**

Las funciones que se crearán:
- `get_organizations_for_review()` - Obtener organizaciones
- `approve_organization()` - Aprobar organización  
- `reject_organization()` - Rechazar organización

---

## ✅ **Paso 3: Probar las Funciones**

**Obtener organizaciones:**
```sql
SELECT get_organizations_for_review();
```

**Si no hay organizaciones, crear una de prueba:**
```sql
-- Insertar un usuario con datos de organización
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
    crypt('password123', gen_salt('bf')),
    NOW(),
    '{
        "organization_name": "Organización de Prueba",
        "country": "GT", 
        "description": "Esta es una organización de prueba",
        "phone": "+502 1234-5678",
        "status": "pending_verification"
    }'::jsonb,
    NOW(),
    NOW()
);
```

---

## ✅ **Paso 4: Verificar en la Aplicación**

1. **Cierra sesión** en la aplicación web
2. **Inicia sesión** de nuevo
3. **Ve a "Gestión Usuarios"** - deberías ver el badge "SUPER"
4. **Revisa la consola** del navegador para logs

### **Si ves organizaciones:**
¡Perfecto! El sistema está funcionando.

### **Si NO ves organizaciones:**
- Revisa la consola del navegador
- Verifica que las funciones SQL se ejecutaron correctamente
- Asegúrate de ser Super Admin

---

## 🧪 **Paso 5: Probar Aprobar/Rechazar**

**Desde la interfaz:**
1. Ve al panel de Gestión Usuarios
2. Busca organizaciones pendientes
3. Usa los botones "Aprobar" o "Rechazar"

**Desde SQL (alternativo):**
```sql
-- Aprobar
SELECT approve_organization(
    (SELECT id FROM auth.users WHERE email = 'test-org@ejemplo.com')
);

-- Rechazar  
SELECT reject_organization(
    (SELECT id FROM auth.users WHERE email = 'test-org@ejemplo.com'),
    'No cumple requisitos'
);
```

---

## 🔍 **Troubleshooting**

### **Error: "function get_organizations_for_review() does not exist"**
- Las funciones SQL no están creadas
- Ejecuta el contenido completo de `ORGANIZATIONS_SQL.sql`

### **Error: "Solo los super administradores pueden ver organizaciones"**
- No eres Super Admin
- Ejecuta el paso 1 para hacerte Super Admin
- Cierra sesión y vuelve a iniciar

### **No veo organizaciones pendientes**
- No hay usuarios registrados con datos de organización
- Crea organizaciones de prueba con el SQL del paso 3
- O espera a que usuarios reales se registren

### **Los cambios no se reflejan**
- Refresca la página
- Revisa la consola del navegador para errores
- Verifica que eres Super Admin

---

## 📊 **Consultas Útiles de Depuración**

**Ver todas las organizaciones:**
```sql
SELECT 
    email,
    raw_user_meta_data->>'organization_name' as org,
    raw_user_meta_data->>'status' as estado
FROM auth.users
WHERE raw_user_meta_data->>'organization_name' IS NOT NULL;
```

**Ver tu rol:**
```sql
SELECT 
    email,
    raw_user_meta_data->>'role' as rol
FROM auth.users
WHERE email = 'kevinalbertoorellana@gmail.com';
```

**Estadísticas:**
```sql
SELECT 
    COALESCE(raw_user_meta_data->>'status', 'pending') as estado,
    COUNT(*) as total
FROM auth.users
WHERE raw_user_meta_data->>'organization_name' IS NOT NULL
GROUP BY raw_user_meta_data->>'status';
```

---

## ✅ **Una vez configurado, tendrás:**

- ✅ Panel de gestión de organizaciones funcional
- ✅ Datos reales desde la base de datos  
- ✅ Capacidad de aprobar/rechazar organizaciones
- ✅ Auditoría de quién aprobó/rechazó cada organización
- ✅ Sistema completamente funcional

¡Sigue estos pasos y tendrás el sistema de organizaciones funcionando completamente! 🚀