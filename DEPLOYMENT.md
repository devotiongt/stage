# Guía de Deployment a GitHub Pages

Este documento explica cómo configurar y desplegar la aplicación Stage en GitHub Pages con dominio personalizado.

## Pre-requisitos

1. Repositorio de GitHub creado
2. Cuenta de Supabase con el proyecto configurado
3. Node.js 18 o superior instalado localmente
4. Dominio personalizado configurado (stage.devotiongt.org)

## Configuración Inicial

### 1. Configurar Variables de Entorno en GitHub

Ve a tu repositorio en GitHub y configura los siguientes secrets:

1. Ve a **Settings** → **Secrets and variables** → **Actions**
2. Haz clic en **New repository secret**
3. Agrega los siguientes secrets:

   - **VITE_SUPABASE_URL**: URL de tu proyecto Supabase
   - **VITE_SUPABASE_ANON_KEY**: Anon/Public key de tu proyecto Supabase

### 2. Habilitar GitHub Pages

1. Ve a **Settings** → **Pages** en tu repositorio
2. En **Source**, selecciona **GitHub Actions**
3. Guarda los cambios

### 3. Configurar Dominio Personalizado

**IMPORTANTE**: Este proyecto usa dominio personalizado (`stage.devotiongt.org`), por lo tanto:

#### En GitHub:
1. Ve a **Settings** → **Pages**
2. En **Custom domain**, ingresa: `stage.devotiongt.org`
3. Habilita **Enforce HTTPS** (después de que el DNS se propague)

#### En tu proveedor de DNS:
Configura un registro CNAME:
```
Type: CNAME
Name: stage
Value: [tu-usuario-github].github.io
```

### 4. Verificar Configuración para Dominio Personalizado

Para dominio personalizado, la configuración debe ser:

**vite.config.js:**
```javascript
export default defineConfig({
  plugins: [react()],
  base: '/', // Para dominio personalizado
})
```

**src/App.jsx:**
```javascript
<Router> {/* Sin basename */}
  {/* rutas */}
</Router>
```

**public/CNAME:**
```
stage.devotiongt.org
```

**public/404.html:**
```javascript
var pathSegmentsToKeep = 0; // Para dominio personalizado
```

## Manejo de Rutas SPA (Single Page Application)

GitHub Pages es un servidor estático que no maneja rutas dinámicas de forma nativa. Este proyecto implementa la solución **spa-github-pages** para resolver este problema.

### ¿Cómo funciona?

1. **404.html** (`public/404.html`): 
   - Cuando visitas una ruta directamente (ej: `/dashboard`) o haces reload en una página, GitHub Pages retorna 404
   - El archivo `404.html` intercepta esto y convierte la ruta en un query string
   - Ejemplo: `/dashboard` → `/?/dashboard`
   - `pathSegmentsToKeep = 0` porque no hay path base (usamos dominio personalizado)

2. **index.html**:
   - Un script lee el query string modificado
   - Lo convierte de vuelta a la ruta original usando `history.replaceState()`
   - React Router puede entonces manejar la ruta correctamente

3. **CNAME**:
   - Se copia automáticamente al build para mantener el dominio personalizado
   - GitHub Pages lo usa para configurar el dominio

### Archivos importantes:

```
public/
  404.html              # Intercepta 404s y redirige con query string
  CNAME                 # Define el dominio personalizado
index.html              # Restaura la URL original desde query string
src/App.jsx             # BrowserRouter SIN basename
vite.config.js          # base: '/'
```

### Resultado:

✅ Las rutas funcionan correctamente al:
- Navegar dentro de la app
- Hacer reload en cualquier página
- Acceder directamente a una URL específica
- Compartir links de páginas internas

## Deployment Automático

El deployment se ejecuta automáticamente cuando:

- Haces push al branch `main`
- O puedes ejecutarlo manualmente desde **Actions** → **Deploy to GitHub Pages** → **Run workflow**

## Deployment Manual (Alternativo)

Si prefieres hacer deployment manual usando gh-pages:

```bash
# Instalar dependencias
npm install

# Build y deploy
npm run deploy
```

**Nota:** El comando `gh-pages` copiará automáticamente el archivo `public/CNAME` al branch gh-pages.

## Verificar el Deployment

1. Ve a **Actions** en tu repositorio de GitHub
2. Verifica que el workflow **Deploy to GitHub Pages** se haya completado exitosamente
3. Tu aplicación estará disponible en: `https://stage.devotiongt.org/`
4. Espera a que el DNS se propague (puede tomar hasta 48 horas, usualmente minutos)

## Estructura de Archivos

```
.github/
  workflows/
    deploy.yml          # Workflow de GitHub Actions
public/
  404.html              # Manejo de rutas SPA en GitHub Pages
  CNAME                 # Dominio personalizado
index.html              # HTML principal con script de SPA routing
vite.config.js          # Configuración de Vite (base: '/')
src/App.jsx             # BrowserRouter SIN basename
.env.example            # Ejemplo de variables de entorno
package.json            # Scripts de build y deploy
```

## Diferencia: Dominio Personalizado vs GitHub Pages Path

### Con Dominio Personalizado (actual - stage.devotiongt.org):
```javascript
// vite.config.js
base: '/'

// App.jsx
<Router>

// 404.html
pathSegmentsToKeep = 0

// Resultado
https://stage.devotiongt.org/dashboard ✅
```

### Con GitHub Pages Path (ej: username.github.io/stage/):
```javascript
// vite.config.js
base: '/stage/'

// App.jsx
<Router basename="/stage">

// 404.html
pathSegmentsToKeep = 1

// Resultado
https://username.github.io/stage/dashboard ✅
```

## Troubleshooting

### El workflow falla en el build

- Verifica que los secrets `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` estén configurados correctamente
- Revisa los logs en la pestaña **Actions** de GitHub

### La aplicación muestra 404 o no carga los assets

- ✅ **Verifica que `base: '/'` en `vite.config.js`** (para dominio personalizado)
- ✅ **Verifica que NO haya `basename` en el Router de App.jsx**
- Verifica que GitHub Pages esté configurado para usar **GitHub Actions** como source
- Verifica que exista el archivo `public/404.html`
- Verifica que exista el archivo `public/CNAME` con tu dominio

### El dominio personalizado no funciona

- Verifica que el registro CNAME en tu DNS esté configurado correctamente
- Espera a que el DNS se propague (usa https://dnschecker.org)
- Verifica que el archivo `public/CNAME` contenga tu dominio
- En Settings → Pages, verifica que aparezca tu dominio personalizado

### Las rutas de React Router no funcionan al hacer reload

✅ **Ya está solucionado** con los archivos `404.html` e `index.html` que implementan spa-github-pages.

Si aún tienes problemas:
- Verifica que `pathSegmentsToKeep = 0` en `public/404.html` (para dominio personalizado)
- Verifica que NO haya `basename` en `App.jsx`
- Limpia la caché del navegador

### El código QR genera URLs incorrectas

- Verifica que en `PresentationScreen.jsx` uses `window.location.origin` completo
- Para dominio personalizado: `https://stage.devotiongt.org/event/ABC123` ✅
- No uses rutas relativas para generar el QR, usa la URL completa

## Actualizaciones

Para actualizar la aplicación desplegada, simplemente:

1. Haz tus cambios en el código
2. Commit y push al branch `main`
3. GitHub Actions automáticamente construirá y desplegará la nueva versión

## Notas Importantes

- ✅ El proyecto está configurado para **dominio personalizado** (`stage.devotiongt.org`)
- El deployment usa Node.js 18 (definido en el workflow)
- Se utiliza `npm ci` para instalar dependencias de forma determinística
- El build se genera en la carpeta `dist/`
- Los secrets nunca se exponen en los logs de GitHub Actions
- La solución de routing funciona con todos los navegadores modernos
- El archivo `404.html` debe ser > 512 bytes para funcionar en IE (ya cumplido)
- El archivo `CNAME` se copia automáticamente al build

## Referencias

- [spa-github-pages](https://github.com/rafgraph/spa-github-pages) - Solución implementada para routing SPA
- [GitHub Pages Docs](https://docs.github.com/en/pages)
- [GitHub Pages Custom Domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
