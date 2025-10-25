# Guía de Deployment a GitHub Pages

Este documento explica cómo configurar y desplegar la aplicación Stage en GitHub Pages.

## Pre-requisitos

1. Repositorio de GitHub creado
2. Cuenta de Supabase con el proyecto configurado
3. Node.js 18 o superior instalado localmente

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

### 3. Verificar el Base Path

Asegúrate de que `vite.config.js` tenga la configuración correcta:

```javascript
export default defineConfig({
  plugins: [react()],
  base: '/stage/', // Cambia 'stage' por el nombre de tu repositorio
})
```

## Manejo de Rutas SPA (Single Page Application)

GitHub Pages es un servidor estático que no maneja rutas dinámicas de forma nativa. Este proyecto implementa la solución **spa-github-pages** para resolver este problema.

### ¿Cómo funciona?

1. **404.html** (`public/404.html`): 
   - Cuando visitas una ruta directamente (ej: `/stage/dashboard`) o haces reload en una página, GitHub Pages retorna 404
   - El archivo `404.html` intercepta esto y convierte la ruta en un query string
   - Ejemplo: `/stage/dashboard` → `/stage/?/dashboard`
   - `pathSegmentsToKeep = 1` preserva el nombre del repositorio (`/stage/`)

2. **index.html**:
   - Un script lee el query string modificado
   - Lo convierte de vuelta a la ruta original usando `history.replaceState()`
   - React Router puede entonces manejar la ruta correctamente

### Archivos importantes:

```
public/
  404.html              # Intercepta 404s y redirige con query string
index.html              # Restaura la URL original desde query string
src/App.jsx             # BrowserRouter con basename="/stage"
vite.config.js          # base: '/stage/'
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

## Verificar el Deployment

1. Ve a **Actions** en tu repositorio de GitHub
2. Verifica que el workflow **Deploy to GitHub Pages** se haya completado exitosamente
3. Tu aplicación estará disponible en: `https://[tu-usuario].github.io/stage/`

## Estructura de Archivos

```
.github/
  workflows/
    deploy.yml          # Workflow de GitHub Actions
public/
  404.html              # Manejo de rutas SPA en GitHub Pages
index.html              # HTML principal con script de SPA routing
vite.config.js          # Configuración de Vite con base path
src/App.jsx             # BrowserRouter con basename
.env.example            # Ejemplo de variables de entorno
package.json            # Scripts de build y deploy
```

## Troubleshooting

### El workflow falla en el build

- Verifica que los secrets `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` estén configurados correctamente
- Revisa los logs en la pestaña **Actions** de GitHub

### La aplicación no carga o muestra errores 404

- Verifica que el `base` en `vite.config.js` coincida con el nombre de tu repositorio
- Asegúrate de que GitHub Pages esté configurado para usar **GitHub Actions** como source
- Verifica que exista el archivo `public/404.html`

### Las rutas de React Router no funcionan al hacer reload

✅ **Ya está solucionado** con los archivos `404.html` e `index.html` que implementan spa-github-pages.

Si aún tienes problemas:
- Verifica que `App.jsx` tenga `<BrowserRouter basename="/stage">`
- Verifica que `pathSegmentsToKeep = 1` en `public/404.html`
- Limpia la caché del navegador

### El código QR genera URLs incorrectas

- Verifica que en `PresentationScreen.jsx` uses `window.location.origin` completo
- No uses rutas relativas para generar el QR, usa la URL completa

## Actualizaciones

Para actualizar la aplicación desplegada, simplemente:

1. Haz tus cambios en el código
2. Commit y push al branch `main`
3. GitHub Actions automáticamente construirá y desplegará la nueva versión

## Notas Importantes

- El deployment usa Node.js 18 (definido en el workflow)
- Se utiliza `npm ci` para instalar dependencias de forma determinística
- El build se genera en la carpeta `dist/`
- Los secrets nunca se exponen en los logs de GitHub Actions
- La solución de routing funciona con todos los navegadores modernos
- El archivo `404.html` debe ser > 512 bytes para funcionar en IE (ya cumplido)

## Referencias

- [spa-github-pages](https://github.com/rafgraph/spa-github-pages) - Solución implementada para routing SPA
- [GitHub Pages Docs](https://docs.github.com/en/pages)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
