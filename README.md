# Stage - Herramientas para Eventos en Vivo

Stage es una aplicación web que permite gestionar las preguntas del público durante eventos en vivo, conferencias y presentaciones.

## 🚀 Características

- **Panel de administración**: Gestiona y modera las preguntas en tiempo real
- **Vista de audiencia**: Los asistentes pueden enviar y votar preguntas
- **Actualizaciones en tiempo real**: Usando Supabase Realtime
- **Sistema de votación**: Las preguntas más votadas aparecen primero
- **Moderación**: Marca preguntas como respondidas o destacadas
- **Códigos de acceso**: Protege tus eventos con códigos únicos

## 🛠️ Stack Tecnológico

- **Frontend**: React + Vite
- **Backend**: Supabase (PostgreSQL + Realtime)
- **Deployment**: GitHub Pages
- **Estilos**: CSS puro con diseño responsive

## 📦 Instalación

1. Clona el repositorio:
```bash
git clone https://github.com/tu-usuario/stage.git
cd stage
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura Supabase:
   - Crea un proyecto en [Supabase](https://supabase.com)
   - Ejecuta el script SQL en `supabase_schema.sql` en el SQL Editor de Supabase
   - Copia las credenciales del proyecto

4. Configura las variables de entorno:
   - Copia `.env.example` a `.env`
   - Añade tus credenciales de Supabase:
```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
```

5. Ejecuta en desarrollo:
```bash
npm run dev
```

## 🚀 Deployment en GitHub Pages

1. Configura los secrets en tu repositorio de GitHub:
   - Ve a Settings > Secrets and variables > Actions
   - Añade `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`

2. Habilita GitHub Pages:
   - Ve a Settings > Pages
   - Source: GitHub Actions

3. Push a la rama main para activar el deployment automático

## 📱 Uso de la Aplicación

### Como Administrador:
1. Crea un nuevo evento desde el panel principal
2. Guarda los códigos de acceso y admin
3. Comparte el código de acceso con tu audiencia
4. Accede al panel de administración con el código admin
5. Modera las preguntas en tiempo real

### Como Audiencia:
1. Accede al evento con el código proporcionado
2. Envía tus preguntas (puedes usar tu nombre o ser anónimo)
3. Vota las preguntas de otros participantes
4. Ve las preguntas destacadas y respondidas en tiempo real

## 🔐 Configuración de Supabase

El archivo `supabase_schema.sql` contiene:
- Tablas para eventos y preguntas
- Row Level Security (RLS) configurado
- Políticas de seguridad permisivas
- Triggers para timestamps automáticos
- Índices para optimización

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📄 Licencia

MIT
