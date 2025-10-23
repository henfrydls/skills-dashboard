# Dashboard de Competencias

Visualizador interactivo del marco de competencias del equipo de I+D+i y Transformación Digital. El tablero permite revisar el estado de cada persona, categoría y skill, identificando brechas críticas y fortalezas. Los datos se persisten localmente en `data/database.json`.

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
  Contiene los datos demo iniciales con 9 colaboradores de ejemplo, 6 categorías y 39 skills. Este archivo se incluye en el repositorio y sirve como plantilla.

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
git clone <url-del-repositorio>
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
   - Mientras `allowResetFromDemo` sea `true`, el botón “Iniciar desde cero” estará activo.
   - Al confirmarlo se eliminan los perfiles demo, el JSON queda con `collaborators: []` y `allowResetFromDemo` pasa a `false`.
   - Después de ese punto, el botón queda deshabilitado y cualquier intento manual devolverá HTTP 409.

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

## Roadmap

Funcionalidades planificadas para futuras versiones:

### Gestión de categorías
- **Crear categorías** desde la UI
- **Editar categorías** existentes (nombre, abreviatura)
- **Eliminar categorías** (con validación de skills asociados)
- Reordenar categorías mediante drag & drop

### Gestión de skills
- **Crear skills** desde la UI
- **Editar skills** existentes (nombre, categoría asociada)
- **Eliminar skills** (con validación de evaluaciones existentes)
- Reordenar skills dentro de cada categoría

### Importación/exportación de datos
- Exportar datos a CSV/Excel
- Importar colaboradores desde CSV
- Exportar reportes en PDF
- Backup automático de datos

### Mejoras de UI/UX
- Editor inline de colaboradores (sin modal)
- Filtros avanzados por categoría, rol, nivel
- Modo oscuro
- Vistas comparativas personalizables

### Colaboración
- Modo multiusuario con sincronización
- Historial de cambios
- Comentarios y notas por colaborador

---

## Licencia

Copyright © 2025  
Henfry De Los Santos

Última actualización: 2025-10-10
