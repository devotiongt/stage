# 🔐 Sistema de Roles con Metadata de Supabase

## ✅ **Cómo Funciona Ahora**

El sistema de roles ahora usa **exclusivamente la metadata del usuario** en Supabase Auth.

```javascript
// El código solo verifica la metadata:
const metadataRole = user.user_metadata?.role

// Roles disponibles:
// - super_admin : Acceso completo
// - admin       : Gestión de usuarios
// - moderator   : Gestión de eventos
// - user        : Usuario básico
```

---

## 🚀 **Cómo Asignarte Super Admin**

### **1. Ve al SQL Editor de Supabase:**
https://app.supabase.com/project/[tu-proyecto]/sql/new

### **2. Ejecuta esta consulta:**
```sql
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    '"super_admin"'
)
WHERE email = 'kevinalbertoorellana@gmail.com';
```

### **3. Cierra sesión y vuelve a iniciar sesión**

¡Listo! Ya eres Super Admin 🎉

---

## 📋 **Consultas SQL Útiles**

### **Asignar Admin a alguien:**
```sql
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    '"admin"'
)
WHERE email = 'admin@ejemplo.com';  -- Cambia el email
```

### **Ver todos los usuarios y sus roles:**
```sql
SELECT 
    email,
    raw_user_meta_data->>'role' as role,
    raw_user_meta_data->>'status' as status,
    created_at
FROM auth.users
ORDER BY created_at DESC;
```

### **Asignar múltiples Super Admins:**
```sql
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    '"super_admin"'
)
WHERE email IN (
    'kevinalbertoorellana@gmail.com',
    'otro-admin@ejemplo.com'
);
```

### **Ver tu rol actual:**
```sql
SELECT 
    email,
    raw_user_meta_data->>'role' as role,
    CASE 
        WHEN raw_user_meta_data->>'role' = 'super_admin' THEN '✅ Tienes acceso completo'
        WHEN raw_user_meta_data->>'role' = 'admin' THEN '✅ Puedes gestionar usuarios'
        WHEN raw_user_meta_data->>'role' = 'moderator' THEN '✅ Puedes gestionar eventos'
        ELSE '👤 Usuario básico'
    END as permisos
FROM auth.users
WHERE email = 'kevinalbertoorellana@gmail.com';
```

---

## 🎯 **Desde la Interfaz (Para Super Admins)**

Una vez que seas super_admin:

1. **Ve a "Gestión Usuarios"** en el menú lateral
2. **Verás la sección "Gestión de Roles"**
3. **Ingresa el email** del usuario
4. **Selecciona el rol** deseado
5. **Clic en "Asignar Rol"**

---

## 🔧 **Función RPC para Asignar Roles**

Si quieres que la interfaz funcione para asignar roles, ejecuta esto en Supabase:

```sql
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

  -- Actualizar el rol
  UPDATE auth.users 
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(new_role)
  )
  WHERE email = target_email;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 📊 **Matriz de Permisos**

| Rol | Gestión Usuarios | Asignar Roles | Gestión Eventos | Dashboard |
|-----|-----------------|---------------|-----------------|-----------|
| **super_admin** | ✅ | ✅ | ✅ | ✅ |
| **admin** | ✅ | ❌ | ✅ | ✅ |
| **moderator** | ❌ | ❌ | ✅ | ✅ |
| **user** | ❌ | ❌ | ✅* | ✅* |

*Solo si la cuenta está aprobada

---

## ⚡ **Pasos Rápidos**

### **Para hacerte Super Admin AHORA:**

1. Abre Supabase SQL Editor
2. Copia y pega:
```sql
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    '"super_admin"'
)
WHERE email = 'kevinalbertoorellana@gmail.com';
```
3. Ejecuta (Run)
4. Cierra sesión en la app
5. Vuelve a iniciar sesión
6. ¡Ya eres Super Admin! 🎉

---

## 🔍 **Verificación**

Después de asignarte el rol, verifica en la consola del navegador:

```javascript
// Deberías ver algo así:
🔍 Auth Debug: {
  user: "kevinalbertoorellana@gmail.com",
  role: "super_admin",
  permissions: {
    canManageUsers: true,
    canManageEvents: true,
    canCreateEvents: true,
    canAccessDashboard: true,
    canManageSettings: true
  }
}
```

---

**¡Sistema de roles simplificado y funcionando! 🚀**

No hay emails hardcodeados, todo se gestiona desde la metadata de Supabase.