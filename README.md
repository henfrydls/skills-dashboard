# Dashboard de Competencias

Visualizador interactivo del marco de competencias de referencia de I+D+i y Transformación Digital. El tablero permite revisar el estado de cada persona, categoría y skill, identificando brechas críticas y fortalezas. Los datos se persisten localmente en `data/database.json`.

**Marco de Competencias:** 6 categorías | 40 skills | Evaluación tridimensional (Nivel, Criticidad, Frecuencia)

---

## Funcionalidades principales

- **Resumen ejecutivo** con prioridades ordenadas por el *gap* frente al objetivo ponderado por criticidad.
- **Vista por colaborador** con análisis automático (brechas, áreas de mejora, fortalezas, talento subutilizado) y gráfica tipo *lollipop* por categoría.
- **Vista por categoría** con comparativos entre personas y detalle de cada skill.
- **Alta de colaboradores** desde la UI; al guardar se actualiza `data/database.json`.
- **Reset de demo**: botón “Iniciar desde cero” (una sola vez) que elimina los perfiles demo y bloquea futuros reseteos automáticos.

---

## Estructura de archivos de datos

El proyecto utiliza dos archivos para gestionar los datos:

- **`data/database.template.json`** (trackeado en Git)
  Contiene los datos demo iniciales con 9 colaboradores de ejemplo, 6 categorías y 40 skills. Este archivo se incluye en el repositorio y sirve como plantilla.

- **`data/database.json`** (NO trackeado en Git, en `.gitignore`)
  Archivo de trabajo local que contiene tus datos personalizados. Al iniciar la aplicación por primera vez, se crea automáticamente copiando el contenido del template. Todas las modificaciones (agregar colaboradores, resetear demo) se aplican a este archivo.

---

## Modelo de datos (`data/database.json`)

```json
{
  "allowResetFromDemo": true,
  "categories": [
    { "id": 1, "nombre": "Innovación & Diseño", "abrev": "Innovación", "skillCount": 6 }
  ],
  "skills": [
    { "id": 1, "categoria": 1, "nombre": "Design Thinking avanzado" }
  ],
  "collaborators": [
    {
      "id": 1,
      "nombre": "Laura Méndez",
      "rol": "Product Manager",
      "esDemo": true,
      "categorias": { "cat1": 4.0 },
      "skills": {
        "1": { "nivel": 4, "criticidad": "C", "frecuencia": "D" }
      }
    }
  ]
}
```

> Nota: los promedios por categoría ignoran las skills cuya criticidad es `N` (No aplica).

---

## Endpoints locales

El middleware definido en `vite.config.js` expone:

- `GET /api/data` → devuelve categorías, skills, colaboradores y el flag `allowResetFromDemo`.
- `POST /api/collaborators` → agrega un colaborador; el payload debe incluir `id`, `nombre`, `rol`, `categorias`, `skills` y `esDemo`.
- `POST /api/reset-demo` → borra los colaboradores demo y marca `allowResetFromDemo` como `false`. Solo responde 200 la primera vez; posteriores llamadas devuelven 409.

---

## Instalación y ejecución

### Requisitos
- Node.js 18 o superior
- npm

### Pasos

```bash
git clone https://github.com/henfrydls/skills-dashboard.git
cd skills-dashboard
npm install
npm run dev
```

El servidor se levanta en `http://localhost:5173`. Para cambiar host o puerto:

```bash
npm run dev -- --host --port 4173
```

Detén el servidor con `Ctrl + C`.

---

## Uso del tablero

1. **Agregar colaborador**  
   - En la vista “Por colaborador”, pulsa “Agregar colaborador”.
   - Completa nombre, rol y ajusta cada skill con el slider (nivel), criticidad y frecuencia.
   - Al guardar se recalculan los promedios por categoría y se persiste el registro en `data/database.json`.

2. **Iniciar desde cero (una sola vez)**
   - Mientras `allowResetFromDemo` sea `true`, el botón "Iniciar desde cero" estará visible.
   - Al confirmarlo se eliminan los perfiles demo, el JSON queda con `collaborators: []` y `allowResetFromDemo` pasa a `false`.
   - Después de ese punto, el botón se oculta completamente y cualquier intento manual de reset devolverá HTTP 409.

3. **Editar información existente**  
   - Modifica directamente el JSON (respetando el formato) y reinicia `npm run dev`, o implementa la edición en la UI reutilizando los endpoints.

4. **Revisión de datos**
   - Cada cálculo ignora las skills con criticidad `N`.
   - El objetivo por categoría se deriva automáticamente ponderando criticidad y frecuencia.

---

## Cómo restaurar datos demo

Si deseas volver a los datos demo originales después de haber modificado o reseteado tu base de datos local:

1. **Detén el servidor de desarrollo** (si está corriendo)
2. **Elimina el archivo local:**
   ```bash
   rm data/database.json
   ```
   (En Windows: `del data\database.json`)

3. **Reinicia el servidor:**
   ```bash
   npm run dev
   ```

Al iniciar, el sistema detectará que no existe `database.json` y lo recreará automáticamente copiando el contenido de `database.template.json`, restaurando los 9 colaboradores demo y el flag `allowResetFromDemo: true`.

> **Nota:** Si modificaste el template por error, puedes recuperarlo desde Git con `git checkout data/database.template.json`

---

## Scripts disponibles

```bash
npm run dev      # Desarrollo con hot reload
npm run build    # Compilar para producción
npm run preview  # Servir la build de producción localmente
npm run lint     # Ejecutar ESLint
```

---

## Estructura del proyecto

```
skills-dashboard/
|-- data/
|   |-- database.template.json # Plantilla con datos demo (trackeado en Git)
|   `-- database.json          # Datos locales del usuario (NO trackeado, generado automáticamente)
|-- scripts/
|   `-- exportData.mjs         # Utilidad para regenerar el JSON desde el JSX (opcional)
|-- src/
|   |-- SkillsDashboard.jsx    # Componente principal
|   |-- App.jsx
|   `-- main.jsx
|-- public/
|-- vite.config.js             # Configuración + middleware local de datos
|-- package.json
`-- README.md
```

---

## Capturas de Pantalla

### Dashboard Principal
<!-- Agregar imagen aquí -->

### Vista Por Colaborador
<!-- Agregar imagen aquí -->

### Resumen de un Colaborador
<!-- Agregar imagen aquí -->

### Vista Por Categoría
<!-- Agregar imagen aquí -->

### Resumen de Categoría
<!-- Agregar imagen aquí -->

---

## Roadmap

Evolución planificada del proyecto desde la versión actual hasta una arquitectura full-stack profesional.

---

### 📍 **Fase 0: Estado Actual** ✅

**Arquitectura:** Frontend React + Vite + JSON local
**Persistencia:** Archivo `database.json` (local, no compartido)

**Características implementadas:**
- ✅ Dashboard con 3 vistas (Resumen, Por Colaborador, Por Categoría)
- ✅ Agregar colaboradores desde la UI
- ✅ Sistema de evaluación tridimensional (Nivel, Criticidad, Frecuencia)
- ✅ Análisis automático de brechas y fortalezas
- ✅ Gráficos interactivos (Recharts)
- ✅ Persistencia en JSON local con sistema de template
- ✅ Reset de datos demo (una sola vez)
- ✅ 6 categorías, 40 skills predefinidos

---

### 📍 **Fase 1: Gestión Completa desde UI** 🔄

**Objetivo:** Permitir CRUD completo de categorías y skills sin modificar JSON manualmente

#### 1.1 Gestión de Categorías
- [ ] **Crear categorías** desde la UI
- [ ] **Editar categorías** existentes (nombre, abreviatura, skillCount)
- [ ] **Eliminar categorías** con validación de dependencias
- [ ] **Reordenar categorías** mediante drag & drop
- [ ] Validaciones: nombres únicos, al menos 1 categoría activa

#### 1.2 Gestión de Skills
- [ ] **Crear skills** desde la UI (asignar a categoría)
- [ ] **Editar skills** existentes (nombre, reasignar categoría)
- [ ] **Eliminar skills** con validación de evaluaciones existentes
- [ ] **Reordenar skills** dentro de cada categoría
- [ ] Búsqueda y filtrado de skills por categoría

#### 1.3 Gestión de Colaboradores
- [ ] **Editar colaboradores** existentes (inline o modal)
- [ ] **Eliminar colaboradores** con confirmación
- [ ] **Duplicar colaborador** como plantilla
- [ ] Validación de campos requeridos

---

### 📍 **Fase 2: Importación/Exportación & Reportes** 📊

**Objetivo:** Facilitar migración de datos y generación de reportes

#### 2.1 Importación de Datos
- [ ] **Importar colaboradores desde CSV** (con mapeo de columnas)
- [ ] **Importar categorías y skills desde CSV**
- [ ] Validación y preview antes de importar
- [ ] Manejo de errores y conflictos (IDs duplicados)

#### 2.2 Exportación de Datos
- [ ] **Exportar datos a CSV/Excel** (colaboradores, skills, evaluaciones)
- [ ] **Exportar reportes en PDF** (por colaborador, por categoría)
- [ ] **Backup automático** de `database.json` (cada N días)
- [ ] Plantillas de reportes personalizables

#### 2.3 Visualizaciones Avanzadas
- [ ] Comparativas entre colaboradores en gráficos radar
- [ ] Timeline de evolución de competencias
- [ ] Dashboard de equipo con métricas agregadas

---

### 📍 **Fase 3: Mejoras de UI/UX** 🎨

**Objetivo:** Mejorar experiencia de usuario y usabilidad

#### 3.1 Interfaz
- [ ] **Modo oscuro** (toggle light/dark)
- [ ] **Responsive design** optimizado para tablets
- [ ] **Editor inline** de colaboradores (sin modal)
- [ ] Confirmaciones y feedback visual (toast notifications)

#### 3.2 Filtros y Búsqueda
- [ ] **Filtros avanzados** por categoría, rol, nivel de competencia
- [ ] **Búsqueda global** de colaboradores y skills
- [ ] Guardado de vistas y filtros favoritos

#### 3.3 Accesibilidad
- [ ] Navegación por teclado completa
- [ ] ARIA labels para lectores de pantalla
- [ ] Contraste WCAG 2.1 AA

---

### 📍 **Fase 4: Backend Django + SQLite** 🚀

**Objetivo:** Migrar a arquitectura full-stack con backend robusto y base de datos relacional

#### 4.1 Arquitectura Propuesta

```
┌─────────────────────────────────────────┐
│         FRONTEND (React + Vite)         │
│  - Dashboard UI                         │
│  - Recharts visualizations              │
│  - HTTP Client (Axios/Fetch)            │
└────────────────┬────────────────────────┘
                 │ REST API (JSON)
                 ↓
┌─────────────────────────────────────────┐
│      BACKEND (Django + Django REST)     │
│  - Django 5.x                           │
│  - Django REST Framework                │
│  - Autenticación (JWT/Sessions)         │
│  - API Endpoints CRUD                   │
└────────────────┬────────────────────────┘
                 │ ORM (Django Models)
                 ↓
┌─────────────────────────────────────────┐
│         DATABASE (SQLite)               │
│  - Tablas: Category, Skill,             │
│    Collaborator, SkillEvaluation        │
│  - Relaciones: ForeignKey, ManyToMany   │
└─────────────────────────────────────────┘
```

#### 4.2 Modelos Django (Ejemplo)

```python
# models.py
class Category(models.Model):
    name = models.CharField(max_length=100)
    abbreviation = models.CharField(max_length=20)
    order = models.IntegerField(default=0)

class Skill(models.Model):
    name = models.CharField(max_length=200)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    order = models.IntegerField(default=0)

class Collaborator(models.Model):
    name = models.CharField(max_length=100)
    role = models.CharField(max_length=100)
    is_demo = models.BooleanField(default=False)

class SkillEvaluation(models.Model):
    collaborator = models.ForeignKey(Collaborator, on_delete=models.CASCADE)
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE)
    level = models.FloatField()
    criticality = models.CharField(max_length=1)  # C, I, D, N
    frequency = models.CharField(max_length=1)    # D, S, M, T, N
```

#### 4.3 API Endpoints (REST)

```
# Categorías
GET    /api/categories/          # Listar todas
POST   /api/categories/          # Crear
GET    /api/categories/{id}/     # Detalle
PUT    /api/categories/{id}/     # Actualizar
DELETE /api/categories/{id}/     # Eliminar

# Skills
GET    /api/skills/              # Listar todos
POST   /api/skills/              # Crear
GET    /api/skills/{id}/         # Detalle
PUT    /api/skills/{id}/         # Actualizar
DELETE /api/skills/{id}/         # Eliminar

# Colaboradores
GET    /api/collaborators/       # Listar todos
POST   /api/collaborators/       # Crear
GET    /api/collaborators/{id}/  # Detalle con evaluaciones
PUT    /api/collaborators/{id}/  # Actualizar
DELETE /api/collaborators/{id}/  # Eliminar

# Evaluaciones
POST   /api/evaluations/         # Crear/actualizar evaluación
GET    /api/evaluations/?collaborator_id={id}  # Por colaborador

# Dashboard
GET    /api/dashboard/summary/   # Resumen ejecutivo
GET    /api/dashboard/gaps/      # Brechas críticas
```

#### 4.4 Tareas Fase 4

**Backend Development:**
- [ ] Setup Django project + Django REST Framework
- [ ] Crear modelos (Category, Skill, Collaborator, SkillEvaluation)
- [ ] Implementar serializers para todos los modelos
- [ ] Crear ViewSets y endpoints CRUD
- [ ] Implementar lógica de cálculo de promedios por categoría
- [ ] Agregar validaciones (nivel 0-5, criticidad válida, etc.)
- [ ] Script de migración: JSON → SQLite
- [ ] Tests unitarios para modelos y endpoints

**Frontend Adaptations:**
- [ ] Reemplazar llamadas locales (`/api/data`) por endpoints Django
- [ ] Implementar cliente HTTP (Axios/Fetch)
- [ ] Manejo de estados de carga y errores
- [ ] Autenticación: login/logout flows
- [ ] Variables de entorno para API URL

**DevOps & Deployment:**
- [ ] Configurar CORS en Django
- [ ] Docker Compose (frontend + backend)
- [ ] Scripts de despliegue
- [ ] Documentación de API (Swagger/OpenAPI)

---

### 📍 **Fase 5: Features Avanzadas** 🌟

**Objetivo:** Funcionalidades empresariales y escalabilidad

#### 5.1 Autenticación y Permisos
- [ ] Sistema de usuarios (Django User)
- [ ] Roles: Admin, Manager, Viewer
- [ ] Permisos granulares por modelo
- [ ] Autenticación JWT

#### 5.2 Multitenancy
- [ ] Soporte para múltiples organizaciones
- [ ] Aislamiento de datos por tenant
- [ ] Subdominios o path-based tenancy

#### 5.3 Colaboración en Tiempo Real
- [ ] WebSockets (Django Channels)
- [ ] Notificaciones en tiempo real
- [ ] Historial de cambios (auditoría)
- [ ] Comentarios y notas por colaborador

#### 5.4 Integraciones
- [ ] API pública con autenticación
- [ ] Webhooks para eventos (nuevo colaborador, evaluación)
- [ ] Integración con Slack/Teams
- [ ] SSO (Single Sign-On)

#### 5.5 Escalabilidad
- [ ] Migración de SQLite → PostgreSQL
- [ ] Caché con Redis
- [ ] Background tasks con Celery
- [ ] Load balancing

---

### 🎯 Cronograma Sugerido

| Fase | Duración Estimada | Esfuerzo |
|------|------------------|----------|
| **Fase 1:** CRUD UI Completo | 2-3 semanas | Medio |
| **Fase 2:** Import/Export | 1-2 semanas | Bajo-Medio |
| **Fase 3:** UI/UX Mejoras | 1-2 semanas | Medio |
| **Fase 4:** Backend Django | 4-6 semanas | Alto |
| **Fase 5:** Features Avanzadas | 6-8 semanas | Muy Alto |

**Total estimado:** 3-5 meses para llegar a producción con backend completo

---

## Licencia

Copyright © 2025
Henfry De Los Santos

Última actualización: 2025-10-23
