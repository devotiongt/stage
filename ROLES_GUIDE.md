# 🔐 Guía de Gestión de Roles y Permisos - Stage

## Sistema de Roles Implementado

### 🌟 **Roles Disponibles**

#### 1. **Super Admin** 
- **Email configurado:** `kevinalbertoorellana@gmail.com`
- **Permisos:** Acceso completo al sistema
- **Puede:**
  - ✅ Gestionar usuarios y organizaciones
  - ✅ Asignar roles a otros usuarios
  - ✅ Acceder a configuración del sistema
  - ✅ Gestionar eventos
  - ✅ Ver panel de administración completo

#### 2. **Admin** (Administrador)
- **Asignación:** Solo por Super Admin
- **Permisos:** Gestión de usuarios y eventos
- **Puede:**
  - ✅ Gestionar usuarios y organizaciones  
  - ✅ Ver panel de verificación de usuarios
  - ✅ Aprobar/rechazar organizaciones
  - ✅ Gestionar eventos
  - ❌ No puede asignar roles

#### 3. **Moderator** (Moderador)
- **Asignación:** Solo por Super Admin
- **Permisos:** Gestión de eventos únicamente
- **Puede:**
  - ✅ Gestionar eventos
  - ✅ Crear eventos
  - ❌ No puede gestionar usuarios
  - ❌ No ve panel de verificación de usuarios

#### 4. **User** (Usuario)
- **Asignación:** Automática al aprobar cuenta
- **Permisos:** Uso básico del sistema
- **Puede:**
  - ✅ Acceder al dashboard
  - ✅ Crear eventos (si está aprobado)
  - ❌ No puede gestionar usuarios
  - ❌ No puede asignar roles

---

## 🚀 **Cómo Asignar Roles a Usuarios**

### **Método 1: Usando la Interfaz (Recomendado)**

1. **Inicia sesión** con tu cuenta de Super Admin (`kevinalbertoorellana@gmail.com`)
2. **Navega** al panel "Gestión Usuarios" 
3. **Verás la sección "Gestión de Roles"** (solo visible para Super Admin)
4. **Ingresa el email** del usuario al que quieres asignar el rol
5. **Selecciona el rol** deseado del dropdown
6. **Haz clic en "Asignar Rol"**

### **Método 2: Modificación Manual en Código**

Para asignar roles manualmente, puedes editar el archivo `AuthContext.jsx`:

```javascript
// En la función getUserRole(), agrega casos específicos:
const getUserRole = () => {
  if (!user) return 'guest'
  
  // Super Admin
  if (user.email === 'kevinalbertoorellana@gmail.com') {
    return 'super_admin'
  }
  
  // Administradores específicos
  if (['admin1@ejemplo.com', 'admin2@ejemplo.com'].includes(user.email)) {
    return 'admin'
  }
  
  // Moderadores específicos  
  if (['moderador1@ejemplo.com'].includes(user.email)) {
    return 'moderator'
  }
  
  // ... resto del código
}
```

---

## 🔧 **Configuración de Roles por Email**

### **Ejemplos de Asignación:**

```javascript
// SUPER ADMINS
const SUPER_ADMINS = [
  'kevinalbertoorellana@gmail.com'
]

// ADMINISTRADORES
const ADMINS = [
  'admin@tuempresa.com',
  'manager@tuempresa.com'
]

// MODERADORES
const MODERATORS = [
  'moderador@tuempresa.com',
  'eventos@tuempresa.com'  
]
```

---

## 📋 **Matriz de Permisos**

| Funcionalidad | Super Admin | Admin | Moderator | User |
|--------------|-------------|-------|-----------|------|
| **Gestión de Usuarios** | ✅ | ✅ | ❌ | ❌ |
| **Asignar Roles** | ✅ | ❌ | ❌ | ❌ |
| **Gestionar Eventos** | ✅ | ✅ | ✅ | ✅* |
| **Crear Eventos** | ✅ | ✅ | ✅ | ✅* |
| **Acceso Dashboard** | ✅ | ✅ | ✅ | ✅* |
| **Configuración Sistema** | ✅ | ❌ | ❌ | ❌ |

*\* Solo si la cuenta está aprobada*

---

## 🛡️ **Seguridad y Validaciones**

### **Validaciones Implementadas:**
- ✅ Solo Super Admin puede asignar roles
- ✅ Verificación de permisos en cada página
- ✅ Redirección automática si no tiene permisos
- ✅ Mensajes claros de acceso denegado
- ✅ Estado de cuenta (aprobado/pendiente/rechazado)

### **Protecciones:**
- 🔒 **Panel de Gestión de Usuarios:** Solo Admin y Super Admin
- 🔒 **Asignación de Roles:** Solo Super Admin
- 🔒 **Configuración:** Solo Super Admin
- 🔒 **Dashboard:** Solo usuarios con cuentas aprobadas

---

## 🚨 **Resolución de Problemas**

### **Usuario no ve "Gestión Usuarios"**
- ✅ Verificar que tenga rol `admin` o `super_admin`
- ✅ Verificar que la cuenta esté aprobada
- ✅ Revisar logs del navegador para errores

### **No aparece opción de "Asignar Roles"**
- ✅ Solo visible para `super_admin`
- ✅ Verificar email configurado correctamente

### **Cambios de rol no se reflejan**
- ✅ Cerrar sesión y volver a iniciar
- ✅ Verificar que el rol se haya asignado correctamente
- ✅ Revisar permisos en el contexto de autenticación

---

## 📝 **Logs y Debugging**

El sistema incluye logs detallados en la consola del navegador:

```javascript
console.log('🔍 Auth Debug:', {
  user: user?.email,
  role: userRole,
  status: user?.user_metadata?.status,
  permissions: permissions
})
```

Revisa estos logs para verificar que los roles se asignen correctamente.

---

**¡Sistema de roles implementado y funcionando! 🎉**