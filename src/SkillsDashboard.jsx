import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, LabelList } from 'recharts';
// Paleta de colores
const COLORS = {
  primary: '#2d676e',
  secondary: '#c6ccd1',
  neutral: '#a6ae3d',
  warning: '#da8a0c',
  background: '#f5f5f5',
  white: '#ffffff',
  success: '#10b981',
  danger: '#ef4444',
  text: {
    primary: '#2d676e',
    secondary: '#6b7280',
    light: '#9ca3af'
  }
};
const computeCategoriasDesdeSkills = (skillsMap = {}, skillsList = [], categoriasList = []) => {
  const categoriasCalculadas = {};
  categoriasList.forEach(cat => {
    const catSkills = skillsList.filter(skill => skill.categoria === cat.id);
    let total = 0;
    let count = 0;
    catSkills.forEach(skill => {
      const skillState = skillsMap[skill.id];
      if (!skillState || skillState.criticidad === 'N') return;
      const nivel = parseFloat(skillState.nivel);
      if (!Number.isNaN(nivel)) {
        total += nivel;
        count += 1;
      }
    });
    categoriasCalculadas[`cat${cat.id}`] = count > 0 ? parseFloat((total / count).toFixed(1)) : 0;
  });
  return categoriasCalculadas;
};
const buildEmptyCollaborator = (skillsList = []) => ({
  nombre: '',
  rol: '',
  esDemo: false,
  skills: skillsList.reduce((acc, skill) => {
    acc[skill.id] = { nivel: 0, criticidad: 'N', frecuencia: 'N' };
    return acc;
  }, {})
});
// Catálogo de categorías
// Catálogo de skills según Marco de Competencias oficial
const CRITICIDAD_OPTIONS = [
  { value: "C", label: "Crítica (C)" },
  { value: "I", label: "Importante (I)" },
  { value: "D", label: "Deseable (D)" },
  { value: "N", label: "No aplica (N)" }
];
const FRECUENCIA_OPTIONS = [
  { value: "D", label: "Diaria (D)" },
  { value: "S", label: "Semanal (S)" },
  { value: "M", label: "Mensual (M)" },
  { value: "T", label: "Trimestral (T)" },
  { value: "N", label: "Nunca (N)" }
];

const SkillsDashboard = () => {
  const [CATEGORIAS, setCategoriasState] = useState([]);
  const [SKILLS, setSkillsState] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [mostrarFormularioColaborador, setMostrarFormularioColaborador] = useState(false);
  const [errorNuevoColaborador, setErrorNuevoColaborador] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState('');
  const [isSavingColaborador, setIsSavingColaborador] = useState(false);
  const [allowResetFromDemo, setAllowResetFromDemo] = useState(false);
  const [isResettingDemo, setIsResettingDemo] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const calcularCategoriasDesdeSkills = (skillsMap = {}, skillsList = SKILLS, categoriasList = CATEGORIAS) =>
    computeCategoriasDesdeSkills(skillsMap, skillsList, categoriasList);
  const createEmptyCollaborator = (skillsList = SKILLS) => buildEmptyCollaborator(skillsList);
  const [nuevoColaborador, setNuevoColaborador] = useState(() => createEmptyCollaborator());
  const [vistaActual, setVistaActual] = useState('resumen');
  const [colaboradorSeleccionado, setColaboradorSeleccionado] = useState(null);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
  const [mostrarExplicacion, setMostrarExplicacion] = useState(false);
  const loadData = useCallback(async () => {
    try {
      setDataError('');
      setIsLoadingData(true);
      setResetError('');
      setResetMessage('');
      const response = await fetch('/api/data');
      if (!response.ok) {
        throw new Error('Error al cargar los datos');
      }
      const payload = await response.json();
      const categorias = Array.isArray(payload.categories) ? payload.categories : [];
      const skills = Array.isArray(payload.skills) ? payload.skills : [];
      const colaboradoresPayload = Array.isArray(payload.collaborators) ? payload.collaborators : [];
      const colaboradoresNormalizados = colaboradoresPayload.map(col => ({
        ...col,
        esDemo: Boolean(col.esDemo),
        categorias: computeCategoriasDesdeSkills(col.skills, skills, categorias)
      }));
      const allowReset = typeof payload.allowResetFromDemo === 'boolean' ? payload.allowResetFromDemo : false;
      setCategoriasState(categorias);
      setSkillsState(skills);
      setColaboradores(colaboradoresNormalizados);
      setNuevoColaborador(buildEmptyCollaborator(skills));
      setAllowResetFromDemo(allowReset);
    } catch (error) {
      console.error('Error al cargar datos iniciales:', error);
      setDataError('No se pudo cargar la información del dashboard. Revisa el archivo data/database.json o reinicia el servidor.');
    } finally {
      setIsLoadingData(false);
    }
  }, []);
  useEffect(() => {
    loadData();
  }, [loadData]);
  // ============================================================
  // SISTEMA DE EVALUACIN: CRITICIDAD + FRECUENCIA + NIVEL
  // ============================================================
  /**
   * Evalúa una skill y retorna su estado basado en:
   * - Criticidad (C=Crítica, I=Importante, D=Deseable, N=No aplica)
   * - Frecuencia (D=Diaria, S=Semanal, M=Mensual, T=Trimestral, N=Nunca)
   * - Nivel de competencia (0-5)
   */
  const evaluarSkill = (nivel, frecuencia, criticidad) => {
    // Pesos para el cálculo de prioridad
    const pesosCriticidad = { 'C': 3, 'I': 2, 'D': 1, 'N': 0 };
    const pesosFrecuencia = { 'D': 3, 'S': 2, 'M': 1.5, 'T': 1, 'N': 0 };
    const pesoCombinado = pesosCriticidad[criticidad] * pesosFrecuencia[frecuencia];
    // 1. BRECHA CRíTICA: Alta criticidad + Alta frecuencia + Nivel bajo
    if (criticidad === 'C' && ['D', 'S'].includes(frecuencia) && nivel < 3) {
      return {
        estado: 'BRECHA CRíTICA',
        prioridad: 10,
        color: COLORS.danger,
        descripcion: 'Skill crítica de uso frecuente con nivel insuficiente',
        accion: 'Capacitación urgente requerida',
        peso: pesoCombinado
      };
    }
    // 2. ÁREA DE MEJORA PRIORITARIA: Alta criticidad + Frecuencia media + Nivel bajo
    if (criticidad === 'C' && ['M', 'T'].includes(frecuencia) && nivel < 3) {
      return {
        estado: 'ÁREA DE MEJORA',
        prioridad: 8,
        color: COLORS.warning,
        descripcion: 'Skill crítica con nivel bajo',
        accion: 'Plan de desarrollo a corto plazo',
        peso: pesoCombinado
      };
    }
    // 3. FORTALEZA CLAVE: Alta criticidad + Alta frecuencia + Alto nivel
    if (criticidad === 'C' && ['D', 'S'].includes(frecuencia) && nivel >= 4) {
      return {
        estado: 'FORTALEZA CLAVE',
        prioridad: 2,
        color: COLORS.success,
        descripcion: 'Skill crítica dominada y utilizada regularmente',
        accion: 'Mantener y compartir conocimiento',
        peso: pesoCombinado
      };
    }
    // 4. TALENTO SUBUTILIZADO: Alto nivel + Baja/nula frecuencia
    if (nivel >= 4 && ['N', 'T'].includes(frecuencia) && criticidad !== 'N') {
      return {
        estado: 'TALENTO SUBUTILIZADO',
        prioridad: 6,
        color: '#9333ea',
        descripcion: 'Alto nivel de competencia sin uso efectivo',
        accion: 'Evaluar reasignación de proyectos',
        peso: pesoCombinado
      };
    }
    // 5. COMPETENCIA SLIDA: Criticidad importante + Nivel adecuado
    if (['C', 'I'].includes(criticidad) && nivel >= 3 && nivel < 4) {
      return {
        estado: 'COMPETENTE',
        prioridad: 4,
        color: COLORS.neutral,
        descripcion: 'Nivel adecuado para las necesidades del rol',
        accion: 'Continuar aplicación práctica',
        peso: pesoCombinado
      };
    }
    // 6. EN DESARROLLO: Skills importantes con nivel básico
    if (['I', 'D'].includes(criticidad) && nivel >= 2 && nivel < 3) {
      return {
        estado: 'EN DESARROLLO',
        prioridad: 5,
        color: COLORS.text.secondary,
        descripcion: 'Skill en proceso de consolidación',
        accion: 'Continuar práctica y mentoría',
        peso: pesoCombinado
      };
    }
    // 7. FORTALEZA ESTRATGICA: Alto nivel en skill crítica/importante
    if (['C', 'I'].includes(criticidad) && nivel >= 4) {
      return {
        estado: 'FORTALEZA',
        prioridad: 3,
        color: COLORS.primary,
        descripcion: 'Alto nivel en skill relevante',
        accion: 'Potenciar como referente',
        peso: pesoCombinado
      };
    }
    // 8. BÁSICO/AWARENESS: Nivel bajo en skills no críticas
    if (nivel < 3 && ['D', 'N'].includes(criticidad)) {
      return {
        estado: 'BÁSICO',
        prioridad: 1,
        color: COLORS.text.light,
        descripcion: 'Skill deseable con nivel básico',
        accion: 'Opcional según intereses',
        peso: pesoCombinado
      };
    }
    // Default: Competente
    return {
      estado: 'COMPETENTE',
      prioridad: 4,
      color: COLORS.neutral,
      descripcion: 'Nivel adecuado',
      accion: 'Mantener',
      peso: pesoCombinado
    };
  };
  // ============================================================
  // ANÁLISIS DE DESARROLLO DEL COLABORADOR
  // ============================================================
  const getColaboradorInsights = (colaborador) => {
    const allSkills = SKILLS.map(skill => {
      const skillData = colaborador.skills[skill.id];
      const evaluacion = evaluarSkill(skillData.nivel, skillData.frecuencia, skillData.criticidad);
      return {
        ...skill,
        ...skillData,
        evaluacion
      };
    });
    // Agrupar por estado
    const brechasCriticas = allSkills
      .filter(s => s.evaluacion.estado === 'BRECHA CRíTICA')
      .sort((a, b) => b.evaluacion.peso - a.evaluacion.peso);
    const areasMejora = allSkills
      .filter(s => s.evaluacion.estado === 'ÁREA DE MEJORA')
      .sort((a, b) => b.evaluacion.peso - a.evaluacion.peso);
    const fortalezasClave = allSkills
      .filter(s => s.evaluacion.estado === 'FORTALEZA CLAVE')
      .sort((a, b) => b.evaluacion.peso - a.evaluacion.peso);
    const talentoSubutilizado = allSkills
      .filter(s => s.evaluacion.estado === 'TALENTO SUBUTILIZADO')
      .sort((a, b) => b.nivel - a.nivel);
    const fortalezas = allSkills
      .filter(s => ['FORTALEZA', 'FORTALEZA CLAVE'].includes(s.evaluacion.estado))
      .sort((a, b) => b.nivel - a.nivel);
    // Calcular mí©tricas de madurez
    const totalCriticas = allSkills.filter(s => s.criticidad === 'C').length;
    const criticasCumplidas = allSkills.filter(s => s.criticidad === 'C' && s.nivel >= 3).length;
    const porcentajeMadurezCriticas = totalCriticas > 0 ? (criticasCumplidas / totalCriticas * 100) : 0;
    const totalImportantes = allSkills.filter(s => s.criticidad === 'I').length;
    const importantesCumplidas = allSkills.filter(s => s.criticidad === 'I' && s.nivel >= 3).length;
    const porcentajeMadurezImportantes = totalImportantes > 0 ? (importantesCumplidas / totalImportantes * 100) : 0;
    // Nivel de riesgo general
    let nivelRiesgo = 'BAJO';
    let colorRiesgo = COLORS.success;
    if (brechasCriticas.length > 0) {
      nivelRiesgo = 'CRíTICO';
      colorRiesgo = COLORS.danger;
    } else if (areasMejora.length > 2) {
      nivelRiesgo = 'MODERADO';
      colorRiesgo = COLORS.warning;
    } else if (areasMejora.length > 0) {
      nivelRiesgo = 'BAJO-MODERADO';
      colorRiesgo = COLORS.neutral;
    }
    return {
      brechasCriticas,
      areasMejora,
      fortalezasClave,
      talentoSubutilizado,
      fortalezas,
      metricas: {
        totalCriticas,
        criticasCumplidas,
        porcentajeMadurezCriticas,
        totalImportantes,
        importantesCumplidas,
        porcentajeMadurezImportantes,
        nivelRiesgo,
        colorRiesgo
      }
    };
  };
  // Funciones auxiliares
  const calcularPromedioEquipo = () => {
    if (CATEGORIAS.length === 0 || colaboradores.length === 0) {
      return CATEGORIAS.reduce((acc, cat) => {
        acc[`cat${cat.id}`] = '0.0';
        return acc;
      }, {});
    }
    const promedios = {};
    CATEGORIAS.forEach(cat => {
      promedios[`cat${cat.id}`] = 0;
    });
    colaboradores.forEach(col => {
      CATEGORIAS.forEach(cat => {
        const key = `cat${cat.id}`;
        promedios[key] += col.categorias[key] ?? 0;
      });
    });
    CATEGORIAS.forEach(cat => {
      const key = `cat${cat.id}`;
      promedios[key] = (promedios[key] / colaboradores.length).toFixed(1);
    });
    return promedios;
  };
  const calcularPromedioGeneral = (categorias) => {
    const valores = Object.values(categorias).map((valor) => {
      if (typeof valor === 'number') return valor;
      const parsed = parseFloat(valor);
      return Number.isNaN(parsed) ? 0 : parsed;
    });
    if (valores.length === 0) {
      return '0.0';
    }
    const sum = valores.reduce((acum, valor) => acum + valor, 0);
    return (sum / valores.length).toFixed(1);
  };
  const getStatusColor = (nivel) => {
    if (nivel >= 3.5) return COLORS.primary;
    if (nivel >= 2.5) return COLORS.neutral;
    return COLORS.warning;
  };
  const getStatusInfo = (nivel) => {
    if (nivel >= 3.5) return { label: 'Fortaleza', color: COLORS.primary };
    if (nivel >= 2.5) return { label: 'Competente', color: COLORS.neutral };
    return { label: 'Requiere atención', color: COLORS.warning };
  };
  const getExecutiveInsights = () => {
    const promedios = calcularPromedioEquipo();
    const gaps = Object.entries(promedios)
      .filter(([, val]) => parseFloat(val) < 2.5)
      .map(([cat, val]) => ({
        categoria: CATEGORIAS[parseInt(cat.replace('cat', '')) - 1].nombre,
        valor: parseFloat(val)
      }));
    const fortalezas = Object.entries(promedios)
      .filter(([, val]) => parseFloat(val) >= 3.5)
      .map(([cat, val]) => ({
        categoria: CATEGORIAS[parseInt(cat.replace('cat', '')) - 1].nombre,
        valor: parseFloat(val)
      }));
    return { gaps, fortalezas };
  };
  const handleNuevoColaboradorCampo = (campo, valor) => {
    setNuevoColaborador(prev => ({
      ...prev,
      [campo]: valor
    }));
  };
  const handleNuevoColaboradorSkillChange = (skillId, campo, valor) => {
    setNuevoColaborador(prev => ({
      ...prev,
      skills: {
        ...prev.skills,
        [skillId]: {
          ...prev.skills[skillId],
          [campo]: campo === 'nivel' ? parseFloat(valor) : valor
        }
      }
    }));
  };
  const handleAbrirFormularioNuevoColaborador = () => {
    setMostrarFormularioColaborador(prev => {
      const next = !prev;
      setNuevoColaborador(createEmptyCollaborator());
      setErrorNuevoColaborador('');
      return next;
    });
  };
  const handleCancelarNuevoColaborador = () => {
    setMostrarFormularioColaborador(false);
    setNuevoColaborador(createEmptyCollaborator());
    setErrorNuevoColaborador('');
  };
  const handleResetDemo = async () => {
    if (!allowResetFromDemo || isResettingDemo) return;
    const confirmado = typeof window !== 'undefined'
      ? window.confirm('Esta acción eliminará los colaboradores de demostración y no se podrá deshacer. ¿Deseas continuar?')
      : false;
    if (!confirmado) return;
    try {
      setIsResettingDemo(true);
      setResetError('');
      setResetMessage('');
      const response = await fetch('/api/reset-demo', { method: 'POST' });
      if (response.status === 409) {
        const payload = await response.json().catch(() => ({}));
        const mensaje = payload?.message || 'La demo ya fue inicializada.';
        setAllowResetFromDemo(false);
        setResetError(mensaje);
        return;
      }
      if (!response.ok) {
        throw new Error('Respuesta no válida del servidor');
      }
      const payload = await response.json();
      setColaboradores([]);
      setAllowResetFromDemo(Boolean(payload.allowResetFromDemo));
      setColaboradorSeleccionado(null);
      setMostrarFormularioColaborador(false);
      setNuevoColaborador(createEmptyCollaborator());
      setResetMessage('Datos demo eliminados. Comienza a registrar tus colaboradores reales.');
    } catch (error) {
      console.error('Error al reiniciar los datos demo:', error);
      setResetError('No se pudo reiniciar la demo. Intenta nuevamente.');
    } finally {
      setIsResettingDemo(false);
    }
  };
  const handleGuardarNuevoColaborador = async (event) => {
    event.preventDefault();
    const nombre = nuevoColaborador.nombre.trim();
    const rol = nuevoColaborador.rol.trim();
    if (!nombre || !rol) {
      setErrorNuevoColaborador('Por favor completa el nombre y el rol.');
      return;
    }
    try {
      setIsSavingColaborador(true);
      setResetMessage('');
      setResetError('');
      const categorias = calcularCategoriasDesdeSkills(nuevoColaborador.skills);
      const nuevosSkills = Object.fromEntries(
        Object.entries(nuevoColaborador.skills).map(([id, skill]) => [
          Number(id),
          {
            nivel: parseFloat(skill.nivel) || 0,
            criticidad: skill.criticidad || 'N',
            frecuencia: skill.frecuencia || 'N'
          }
        ])
      );
      const nuevoId = colaboradores.length > 0 ? Math.max(...colaboradores.map(col => col.id)) + 1 : 1;
      const colaboradorAGuardar = {
        id: nuevoId,
        nombre,
        rol,
        categorias,
        skills: nuevosSkills,
        esDemo: false
      };
      const response = await fetch('/api/collaborators', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(colaboradorAGuardar)
      });
      if (!response.ok) {
        throw new Error('Respuesta no válida del servidor');
      }
      const saved = await response.json();
      setColaboradores(prev => [...prev, saved]);
      setMostrarFormularioColaborador(false);
      setNuevoColaborador(createEmptyCollaborator());
      setErrorNuevoColaborador('');
    } catch (error) {
      console.error('Error al guardar colaborador:', error);
      setErrorNuevoColaborador('No se pudo guardar el colaborador. Intenta nuevamente.');
    } finally {
      setIsSavingColaborador(false);
    }
  };
  const getCategoriasBarData = () => {
    const promedios = calcularPromedioEquipo();
    const ponderaciones = { C: 5, I: 4, D: 3, N: 0 };
    const calcularObjetivoCategoria = (catIdx) => {
      const categoriaId = catIdx + 1;
      const categoriaSkills = SKILLS.filter(skill => skill.categoria === categoriaId);
      if (categoriaSkills.length === 0) {
        return 3;
      }
      const sumaObjetivos = categoriaSkills.reduce((acum, skill) => {
        const totalPeso = colaboradores.reduce((pesoAcum, col) => {
          const criticidad = col.skills[skill.id]?.criticidad ?? 'N';
          return pesoAcum + (ponderaciones[criticidad] || 0);
        }, 0);
        const objetivoSkill = colaboradores.length > 0
          ? totalPeso / colaboradores.length
          : 0;
        return acum + objetivoSkill;
      }, 0);
      const objetivoPromedio = sumaObjetivos / categoriaSkills.length;
      return parseFloat(objetivoPromedio.toFixed(1));
    };
    return CATEGORIAS
      .map((cat, idx) => ({
        nombre: cat.abrev,
        fullName: cat.nombre,
        promedio: parseFloat(promedios[`cat${idx + 1}`]),
        id: idx + 1,
        objetivo: calcularObjetivoCategoria(idx)
      }))
      .map(entry => {
        const gapReal = parseFloat((entry.objetivo - entry.promedio).toFixed(1));
        const prioridad = gapReal > 0 ? gapReal : 0;
        return { ...entry, gap: gapReal, prioridad };
      })
      .sort((a, b) => {
        if (b.prioridad !== a.prioridad) return b.prioridad - a.prioridad;
        return b.gap - a.gap;
      });
  };
  const promedioEquipo = calcularPromedioEquipo();
  const insights = getExecutiveInsights();
  const categoriasData = getCategoriasBarData();
  const categoriasPreviasFormulario = calcularCategoriasDesdeSkills(nuevoColaborador.skills);
  const hasDemoCollaborators = colaboradores.some(col => col.esDemo);
  const disableResetDemo = !allowResetFromDemo || isResettingDemo || isLoadingData || colaboradores.length === 0;
  if (isLoadingData) {
    return (
      <div style={{ backgroundColor: COLORS.background, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-center space-y-2">
          <div className="text-sm uppercase tracking-wide" style={{ color: COLORS.text.light }}>Cargando</div>
          <div className="text-2xl font-light" style={{ color: COLORS.primary }}>Preparando dashboard de competencias...</div>
        </div>
      </div>
    );
  }
  if (dataError) {
    return (
      <div style={{ backgroundColor: COLORS.background, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="text-center space-y-4 bg-white shadow-md rounded-lg px-8 py-10 border" style={{ borderColor: COLORS.secondary }}>
          <h2 className="text-xl font-semibold" style={{ color: COLORS.danger }}>No se pudo cargar la información</h2>
          <p className="text-sm" style={{ color: COLORS.text.secondary }}>{dataError}</p>
          <button
            type="button"
            onClick={loadData}
            className="px-4 py-2 text-sm font-medium rounded-md transition-colors"
            style={{ backgroundColor: COLORS.primary, color: COLORS.white }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }
  return (
    <div style={{ backgroundColor: COLORS.background, minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-light mb-2" style={{ color: COLORS.primary }}>
            Dashboard de Competencias
          </h1>
          <p className="text-base" style={{ color: COLORS.text.secondary }}>
            Sistema de evaluación basado en criticidad y frecuencia de uso
          </p>
        </div>
        {/* Navegación */}
        <div className="flex gap-4 mb-8 items-center flex-wrap">
          {[
            { id: 'resumen', label: 'Resumen Ejecutivo' },
            { id: 'colaboradores', label: 'Por Colaborador' },
            { id: 'categorias', label: 'Por Categoría' }
          ].map(vista => (
            <button
              key={vista.id}
              onClick={() => {
                setVistaActual(vista.id);
                setColaboradorSeleccionado(null);
                setCategoriaSeleccionada(null);
              }}
              className={`pb-3 font-medium transition-all ${
                vistaActual === vista.id ? 'border-b-2' : ''
              }`}
              style={{
                color: vistaActual === vista.id ? COLORS.primary : COLORS.text.light,
                borderColor: vistaActual === vista.id ? COLORS.primary : 'transparent'
              }}
            >
              {vista.label}
            </button>
          ))}
          <button
            onClick={() => setMostrarExplicacion(!mostrarExplicacion)}
            className="pb-3 font-medium ml-auto transition-all"
            style={{ color: COLORS.text.light }}
          >
            {mostrarExplicacion ? '✕ Cerrar' : 'ⓘ Sistema de Puntuación'}
          </button>
        </div>
        {/* Sistema de Puntuación Explicado */}
        {mostrarExplicacion && (
          <div className="bg-white p-8 mb-8 border-l-4 shadow-sm" style={{ borderColor: COLORS.primary }}>
            <h2 className="text-2xl font-light mb-6" style={{ color: COLORS.primary }}>
              Sistema de Evaluación de Competencias
            </h2>
            <div className="mb-8">
              <h3 className="text-lg font-medium mb-4" style={{ color: COLORS.text.primary }}>
                Metodología de Evaluación
              </h3>
              <p className="text-sm mb-4" style={{ color: COLORS.text.secondary }}>
                Cada skill se evalúa mediante <strong>tres dimensiones clave</strong> que determinan su estado y prioridad de desarrollo:
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 mb-8">
              {/* Criticidad */}
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: COLORS.primary }}>
                  1. CRITICIDAD DEL ROL
                </h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-lg" style={{ color: COLORS.danger }}>C</span>
                    <div>
                      <div className="font-medium" style={{ color: COLORS.text.primary }}>Crítica (peso: 3)</div>
                      <div className="text-xs" style={{ color: COLORS.text.secondary }}>Esencial para el desempeí±o del rol. Sin esta competencia, no se pueden cumplir las responsabilidades principales.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-lg" style={{ color: COLORS.warning }}>I</span>
                    <div>
                      <div className="font-medium" style={{ color: COLORS.text.primary }}>Importante (peso: 2)</div>
                      <div className="text-xs" style={{ color: COLORS.text.secondary }}>Necesaria para un desempeí±o óptimo. Contribuye significativamente al í©xito del rol.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-lg" style={{ color: COLORS.neutral }}>D</span>
                    <div>
                      <div className="font-medium" style={{ color: COLORS.text.primary }}>Deseable (peso: 1)</div>
                      <div className="text-xs" style={{ color: COLORS.text.secondary }}>Complementaria. Aí±ade valor pero no es determinante para el rol.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-lg" style={{ color: COLORS.text.light }}>N</span>
                    <div>
                      <div className="font-medium" style={{ color: COLORS.text.primary }}>No aplica (peso: 0)</div>
                      <div className="text-xs" style={{ color: COLORS.text.secondary }}>No relevante para el rol actual.</div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Frecuencia */}
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: COLORS.primary }}>
                  2. FRECUENCIA DE USO
                </h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-lg" style={{ color: COLORS.primary }}>D</span>
                    <div>
                      <div className="font-medium" style={{ color: COLORS.text.primary }}>Diaria (peso: 3)</div>
                      <div className="text-xs" style={{ color: COLORS.text.secondary }}>Se utiliza todos los días en las actividades del rol.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-lg" style={{ color: COLORS.primary }}>S</span>
                    <div>
                      <div className="font-medium" style={{ color: COLORS.text.primary }}>Semanal (peso: 2)</div>
                      <div className="text-xs" style={{ color: COLORS.text.secondary }}>Se aplica varias veces por semana regularmente.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-lg" style={{ color: COLORS.neutral }}>M</span>
                    <div>
                      <div className="font-medium" style={{ color: COLORS.text.primary }}>Mensual (peso: 1.5)</div>
                      <div className="text-xs" style={{ color: COLORS.text.secondary }}>Se utiliza en momentos específicos del mes.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-lg" style={{ color: COLORS.text.secondary }}>T</span>
                    <div>
                      <div className="font-medium" style={{ color: COLORS.text.primary }}>Trimestral (peso: 1)</div>
                      <div className="text-xs" style={{ color: COLORS.text.secondary }}>Se aplica ocasionalmente en proyectos específicos.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-lg" style={{ color: COLORS.text.light }}>N</span>
                    <div>
                      <div className="font-medium" style={{ color: COLORS.text.primary }}>Nunca (peso: 0)</div>
                      <div className="text-xs" style={{ color: COLORS.text.secondary }}>Actualmente no se utiliza en las responsabilidades del rol.</div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Nivel */}
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: COLORS.primary }}>
                  3. NIVEL DE COMPETENCIA
                </h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-lg" style={{ color: COLORS.success }}>5</span>
                    <div>
                      <div className="font-medium" style={{ color: COLORS.text.primary }}>Experto</div>
                      <div className="text-xs" style={{ color: COLORS.text.secondary }}>Referente reconocido. Entrena y desarrolla a otros.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-lg" style={{ color: COLORS.primary }}>4</span>
                    <div>
                      <div className="font-medium" style={{ color: COLORS.text.primary }}>Avanzado</div>
                      <div className="text-xs" style={{ color: COLORS.text.secondary }}>Dominio práctico profundo. Resuelve problemas complejos.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-lg" style={{ color: COLORS.neutral }}>3</span>
                    <div>
                      <div className="font-medium" style={{ color: COLORS.text.primary }}>Competente</div>
                      <div className="text-xs" style={{ color: COLORS.text.secondary }}>Aplica con autonomía en situaciones habituales.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-lg" style={{ color: COLORS.warning }}>2</span>
                    <div>
                      <div className="font-medium" style={{ color: COLORS.text.primary }}>Básico</div>
                      <div className="text-xs" style={{ color: COLORS.text.secondary }}>Conocimiento teórico. Requiere supervisión.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-lg" style={{ color: COLORS.text.secondary }}>1</span>
                    <div>
                      <div className="font-medium" style={{ color: COLORS.text.primary }}>Awareness</div>
                      <div className="text-xs" style={{ color: COLORS.text.secondary }}>Conciencia básica del concepto.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-lg" style={{ color: COLORS.text.light }}>0</span>
                    <div>
                      <div className="font-medium" style={{ color: COLORS.text.primary }}>Sin conocimiento</div>
                      <div className="text-xs" style={{ color: COLORS.text.secondary }}>No tiene exposición a la competencia.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Fórmula de Peso */}
            <div className="bg-gray-50 p-6 mb-8 rounded">
              <h4 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: COLORS.primary }}>
                CÁLCULO DE PESO DE LA SKILL
              </h4>
              <div className="text-center text-xl font-light mb-2" style={{ color: COLORS.text.primary }}>
                Peso = Criticidad  Frecuencia
              </div>
              <p className="text-xs text-center" style={{ color: COLORS.text.secondary }}>
                Este peso determina la prioridad de atención y el orden en el análisis de desarrollo
              </p>
              <div className="mt-4 grid grid-cols-3 gap-4 text-xs">
                <div className="text-center">
                  <div className="font-semibold mb-1" style={{ color: COLORS.text.primary }}>Peso Máximo</div>
                  <div style={{ color: COLORS.danger }}>C (3)  D (3) = 9</div>
                  <div className="text-xs mt-1" style={{ color: COLORS.text.light }}>Crítica + Diaria</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold mb-1" style={{ color: COLORS.text.primary }}>Peso Medio</div>
                  <div style={{ color: COLORS.warning }}>I (2)  S (2) = 4</div>
                  <div className="text-xs mt-1" style={{ color: COLORS.text.light }}>Importante + Semanal</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold mb-1" style={{ color: COLORS.text.primary }}>Peso Bajo</div>
                  <div style={{ color: COLORS.neutral }}>D (1)  M (1.5) = 1.5</div>
                  <div className="text-xs mt-1" style={{ color: COLORS.text.light }}>Deseable + Mensual</div>
                </div>
              </div>
            </div>
            {/* Estados Posibles */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: COLORS.primary }}>
                ESTADOS DE COMPETENCIA RESULTANTES
              </h4>
              <p className="text-sm mb-4" style={{ color: COLORS.text.secondary }}>
                Según la combinación de Criticidad, Frecuencia y Nivel, cada skill se clasifica en uno de estos estados:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  {
                    estado: 'BRECHA CRíTICA',
                    color: COLORS.danger,
                    condicion: 'Criticidad: C + Frecuencia: D/S + Nivel: < 3',
                    significado: 'Skill esencial de uso diario/semanal con nivel insuficiente',
                    accion: 'Capacitación urgente + Plan de desarrollo inmediato'
                  },
                  {
                    estado: 'ÁREA DE MEJORA',
                    color: COLORS.warning,
                    condicion: 'Criticidad: C + Frecuencia: M/T + Nivel: < 3',
                    significado: 'Skill crítica con nivel bajo pero uso menos frecuente',
                    accion: 'Plan de desarrollo a corto plazo (1-3 meses)'
                  },
                  {
                    estado: 'FORTALEZA CLAVE',
                    color: COLORS.success,
                    condicion: 'Criticidad: C + Frecuencia: D/S + Nivel:  4',
                    significado: 'Competencia estratí©gica dominada y aplicada constantemente',
                    accion: 'Mantener, documentar y compartir con el equipo'
                  },
                  {
                    estado: 'TALENTO SUBUTILIZADO',
                    color: '#9333ea',
                    condicion: 'Nivel:  4 + Frecuencia: N/T + Criticidad: C/I',
                    significado: 'Alta competencia que no se está aprovechando',
                    accion: 'Evaluar reasignación de proyectos o roles'
                  },
                  {
                    estado: 'FORTALEZA',
                    color: COLORS.primary,
                    condicion: 'Criticidad: C/I + Nivel:  4',
                    significado: 'Alto nivel en competencias relevantes para el rol',
                    accion: 'Potenciar como referente interno'
                  },
                  {
                    estado: 'COMPETENTE',
                    color: COLORS.neutral,
                    condicion: 'Criticidad: C/I + Nivel: 3',
                    significado: 'Nivel adecuado para cumplir con las responsabilidades',
                    accion: 'Mantener práctica regular'
                  },
                  {
                    estado: 'EN DESARROLLO',
                    color: COLORS.text.secondary,
                    condicion: 'Criticidad: I/D + Nivel: 2',
                    significado: 'Competencia en proceso de consolidación',
                    accion: 'Continuar práctica con mentoría'
                  },
                  {
                    estado: 'BÁSICO',
                    color: COLORS.text.light,
                    condicion: 'Criticidad: D/N + Nivel: < 3',
                    significado: 'Skill complementaria con nivel inicial',
                    accion: 'Desarrollo opcional según intereses'
                  }
                ].map(item => (
                  <div key={item.estado} className="p-4 border rounded" style={{ borderColor: COLORS.secondary }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold" style={{ color: item.color }}>{item.estado}</span>
                    </div>
                    <div className="text-xs mb-2 font-mono" style={{ color: COLORS.text.secondary }}>
                      {item.condicion}
                    </div>
                    <div className="text-sm mb-2" style={{ color: COLORS.text.primary }}>
                      <strong>Significado:</strong> {item.significado}
                    </div>
                    <div className="text-sm" style={{ color: COLORS.text.secondary }}>
                      <strong>Acción:</strong> {item.accion}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500">
              <p className="text-sm" style={{ color: COLORS.text.primary }}>
                <strong>Nota:</strong> El sistema prioriza automáticamente las skills según su peso combinado,
                asegurando que las competencias críticas y de uso frecuente reciban la atención necesaria primero.
              </p>
            </div>
          </div>
        )}
        {/* VISTA: RESUMEN EJECUTIVO */}
        {vistaActual === 'resumen' && (
          <div className="space-y-8">
            {/* Insight principal - Lo más importante primero */}
            <div className="bg-white p-8">
              <h2 className="text-2xl font-light mb-6" style={{ color: COLORS.primary }}>
                {insights.gaps.length > 0
                  ? `${insights.gaps.length} área${insights.gaps.length > 1 ? 's' : ''} requiere${insights.gaps.length > 1 ? 'n' : ''} atención inmediata`
                  : 'El equipo muestra competencias sólidas'}
              </h2>
              {insights.gaps.length > 0 ? (
                <div className="space-y-4">
                  {insights.gaps.map((gap, idx) => (
                    <div key={idx} className="flex items-start gap-4 pb-4" style={{
                      borderBottom: idx < insights.gaps.length - 1 ? `1px solid ${COLORS.secondary}` : 'none'
                    }}>
                      <div
                        className="text-3xl font-bold mt-1"
                        style={{ color: COLORS.warning }}
                      >
                        {gap.valor.toFixed(1)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium mb-1" style={{ color: COLORS.text.primary }}>
                          {gap.categoria}
                        </p>
                        <p className="text-sm" style={{ color: COLORS.text.secondary }}>
                          Por debajo del umbral de competencia (2.5). Capacitación prioritaria requerida.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: COLORS.text.secondary }}>
                  Todas las categorías cumplen con el nivel mínimo de competencia.
                </p>
              )}
            </div>
            {/* Mí©trica clave única y grande */}
            <div className="bg-white p-12 text-center">
              <p className="text-sm uppercase tracking-wide mb-2" style={{ color: COLORS.text.secondary }}>
                Promedio General del Equipo
              </p>
              <p className="text-7xl font-light mb-4" style={{ color: COLORS.primary }}>
                {calcularPromedioGeneral(promedioEquipo)}
              </p>
              <div className="flex items-center justify-center gap-8 text-sm">
                <div>
                  <span style={{ color: COLORS.text.light }}>de</span>
                  <span className="font-semibold ml-1" style={{ color: COLORS.text.secondary }}>5.0</span>
                </div>
                <div style={{ color: COLORS.text.light }}></div>
                <div>
                  <span className="font-semibold" style={{ color: COLORS.primary }}>
                    {insights.fortalezas.length}
                  </span>
                  <span style={{ color: COLORS.text.secondary }} className="ml-1">
                    fortaleza{insights.fortalezas.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div style={{ color: COLORS.text.light }}></div>
                <div>
                  <span className="font-semibold" style={{ color: COLORS.warning }}>
                    {insights.gaps.length}
                  </span>
                  <span style={{ color: COLORS.text.secondary }} className="ml-1">
                    gap{insights.gaps.length !== 1 ? 's' : ''} crítico{insights.gaps.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
            {/* Gráfico comparativo - minimalista */}
            <div className="bg-white p-8">
              <h3 className="text-xl font-light mb-2" style={{ color: COLORS.primary }}>
                Prioridades de desarrollo
              </h3>
              <p className="text-sm mb-8" style={{ color: COLORS.text.secondary }}>
                Gap respecto al objetivo ponderado por criticidad. Mayor gap implica mayor urgencia de desarrollo.
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={categoriasData}
                  layout="vertical"
                  margin={{ top: 0, right: 40, left: 40, bottom: 0 }}
                >
                  <XAxis
                    type="number"
                    domain={[0, 5]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: COLORS.text.light, fontSize: 12 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: COLORS.text.primary, fontSize: 13 }}
                    width={100}
                  />
                  <ReferenceLine
                    x={3}
                    stroke={COLORS.neutral}
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                  />
                  <Tooltip
                    cursor={{ fill: COLORS.secondary + '30' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const status = getStatusInfo(payload[0].value);
                        const item = payload[0].payload;
                        const objetivo = Number(item.objetivo ?? 0);
                        const gapValor = Number(item.gap ?? 0);
                        return (
                          <div className="bg-white p-3 border" style={{ borderColor: COLORS.secondary }}>
                            <p className="font-medium mb-1" style={{ color: COLORS.text.primary }}>
                              {item.fullName}
                            </p>
                            <p className="text-2xl font-light" style={{ color: status.color }}>
                              {payload[0].value.toFixed(1)}
                            </p>
                            <p className="text-sm" style={{ color: COLORS.text.secondary }}>
                              Objetivo: {objetivo.toFixed(1)}
                            </p>
                            <p className="text-sm" style={{ color: gapValor > 0 ? COLORS.warning : COLORS.primary }}>
                              Gap: {gapValor.toFixed(1)}
                            </p>
                            <p className="text-sm mt-1" style={{ color: COLORS.text.secondary }}>
                              {status.label}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="promedio"
                    radius={[0, 4, 4, 0]}
                  >
                    {categoriasData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getStatusColor(entry.promedio)} />
                    ))}
                    <LabelList
                      dataKey="promedio"
                      position="right"
                      formatter={(value) => value.toFixed(1)}
                      fill={COLORS.text.primary}
                      fontSize={12}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs mt-4" style={{ color: COLORS.text.light }}>
                Objetivo ponderado por criticidad (C=5, I=4, D=3, N=0).
              </p>
            </div>
            {/* Tabla simple y limpia - solo lo esencial */}
            <div className="bg-white p-8">
              <h3 className="text-xl font-light mb-6" style={{ color: COLORS.primary }}>
                Perfil del equipo
              </h3>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: `2px solid ${COLORS.primary}` }}>
                    <th className="text-left py-3 font-medium" style={{ color: COLORS.text.primary }}>
                      Colaborador
                    </th>
                    <th className="text-left py-3 font-medium" style={{ color: COLORS.text.primary }}>
                      Rol
                    </th>
                    {CATEGORIAS.map(cat => (
                      <th key={cat.id} className="text-center py-3 font-medium text-sm" style={{ color: COLORS.text.secondary }}>
                        {cat.abrev}
                      </th>
                    ))}
                    <th className="text-center py-3 font-medium" style={{ color: COLORS.text.primary }}>
                      Promedio
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {colaboradores.map((col) => {
                    const promedio = calcularPromedioGeneral(col.categorias);
                    return (
                      <tr
                        key={col.id}
                        style={{ borderBottom: `1px solid ${COLORS.secondary}` }}
                        className="hover:bg-opacity-50 transition-colors"
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.background}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td className="py-4">
                          <button
                            onClick={() => {
                              setColaboradorSeleccionado(col);
                              setVistaActual('colaboradores');
                            }}
                            className="font-medium hover:underline"
                            style={{ color: COLORS.primary }}
                          >
                            {col.nombre}
                          </button>
                        </td>
                        <td className="py-4 text-sm" style={{ color: COLORS.text.secondary }}>
                          {col.rol}
                        </td>
                        {Object.values(col.categorias).map((valor, catIdx) => (
                          <td key={catIdx} className="text-center py-4">
                            <span
                              className="text-sm font-medium"
                              style={{ color: getStatusColor(valor) }}
                            >
                              {valor.toFixed(1)}
                            </span>
                          </td>
                        ))}
                        <td className="text-center py-4">
                          <span
                            className="text-lg font-medium"
                            style={{ color: getStatusColor(parseFloat(promedio)) }}
                          >
                            {promedio}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={{ backgroundColor: COLORS.background }}>
                    <td className="py-4 font-medium" colSpan="2" style={{ color: COLORS.text.primary }}>
                      Promedio del equipo
                    </td>
                    {Object.values(promedioEquipo).map((val, idx) => (
                      <td key={idx} className="text-center py-4">
                        <span
                          className="font-semibold"
                          style={{ color: getStatusColor(parseFloat(val)) }}
                        >
                          {val}
                        </span>
                      </td>
                    ))}
                    <td className="text-center py-4">
                      <span
                        className="text-lg font-semibold"
                        style={{ color: COLORS.primary }}
                      >
                        {calcularPromedioGeneral(promedioEquipo)}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* VISTA: POR COLABORADOR */}
        {vistaActual === 'colaboradores' && !colaboradorSeleccionado && (
          <div className="bg-white p-8 rounded-lg shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
              <h2 className="text-2xl font-light" style={{ color: COLORS.primary }}>
                Selecciona un colaborador para ver detalle
              </h2>
              <div className="flex flex-col sm:flex-row gap-3 md:justify-end">
                <button
                  type="button"
                  onClick={handleResetDemo}
                  disabled={disableResetDemo}
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: disableResetDemo ? COLORS.secondary : COLORS.danger,
                    color: COLORS.white
                  }}
                >
                  {allowResetFromDemo ? (isResettingDemo ? 'Reiniciando...' : 'Iniciar desde cero') : 'Demo inicializada'}
                </button>
                <button
                  type="button"
                  onClick={handleAbrirFormularioNuevoColaborador}
                  disabled={isLoadingData || SKILLS.length === 0}
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: isLoadingData || SKILLS.length === 0 ? COLORS.secondary : COLORS.primary,
                    color: COLORS.white
                  }}
                >
                  {mostrarFormularioColaborador ? 'Cancelar' : 'Agregar colaborador'}
                </button>
              </div>
            </div>
            {(resetError || resetMessage || (allowResetFromDemo && hasDemoCollaborators)) && (
              <div className="text-sm rounded-md px-3 py-2 mb-6" style={{
                backgroundColor: resetError
                  ? COLORS.danger + '15'
                  : resetMessage
                    ? COLORS.success + '15'
                    : COLORS.secondary + '20',
                color: resetError
                  ? COLORS.danger
                  : resetMessage
                    ? COLORS.success
                    : COLORS.text.secondary
              }}>
                {resetError || resetMessage || 'Este entorno incluye colaboradores demo. Usa “Iniciar desde cero” para eliminarlos (disponible una sola vez).'}
              </div>
            )}
            {mostrarFormularioColaborador && (
              <form
                onSubmit={handleGuardarNuevoColaborador}
                className="mb-10 border border-dashed rounded-lg p-6 space-y-6"
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: COLORS.text.secondary }}>
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={nuevoColaborador.nombre}
                      onChange={(event) => handleNuevoColaboradorCampo('nombre', event.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2"
                      style={{ borderColor: COLORS.secondary }}
                      placeholder="Ej. Ana Martínez"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: COLORS.text.secondary }}>
                      Rol
                    </label>
                    <input
                      type="text"
                      value={nuevoColaborador.rol}
                      onChange={(event) => handleNuevoColaboradorCampo('rol', event.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2"
                      style={{ borderColor: COLORS.secondary }}
                      placeholder="Ej. Tech Lead"
                    />
                  </div>
                </div>
                {errorNuevoColaborador && (
                  <div className="text-sm px-3 py-2 rounded" style={{ backgroundColor: COLORS.danger + '15', color: COLORS.danger }}>
                    {errorNuevoColaborador}
                  </div>
                )}
                {CATEGORIAS.map(cat => {
                  const promedioCategoria = categoriasPreviasFormulario[`cat${cat.id}`];
                  return (
                    <div key={cat.id} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold" style={{ color: COLORS.text.primary }}>
                          {cat.nombre}
                        </h3>
                        <span className="text-xs font-medium" style={{ color: COLORS.text.secondary }}>
                          Promedio estimado: {promedioCategoria.toFixed(1)}
                        </span>
                      </div>
                      <div className="space-y-4">
                        {SKILLS.filter(skill => skill.categoria === cat.id).map(skill => {
                          const skillState = nuevoColaborador.skills[skill.id] || { nivel: 0, criticidad: 'N', frecuencia: 'N' };
                          return (
                            <div key={skill.id} className="grid md:grid-cols-12 gap-3 items-center">
                              <span className="md:col-span-6 text-sm" style={{ color: COLORS.text.primary }}>
                                {skill.nombre}
                              </span>
                              <div className="md:col-span-4 flex items-center gap-3">
                                <input
                                  type="range"
                                  min="0"
                                  max="5"
                                  step="0.5"
                                  value={skillState.nivel}
                                  onChange={(event) => handleNuevoColaboradorSkillChange(skill.id, 'nivel', event.target.value)}
                                  className="w-full"
                                />
                                <span className="text-sm font-semibold w-10 text-right" style={{ color: COLORS.text.primary }}>
                                  {Number(skillState.nivel || 0).toFixed(1)}
                                </span>
                              </div>
                              <div className="md:col-span-1">
                                <select
                                  className="w-full border rounded px-2 py-1 text-xs"
                                  style={{ borderColor: COLORS.secondary }}
                                  value={skillState.criticidad}
                                  onChange={(event) => handleNuevoColaboradorSkillChange(skill.id, 'criticidad', event.target.value)}
                                >
                                  {CRITICIDAD_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="md:col-span-1">
                                <select
                                  className="w-full border rounded px-2 py-1 text-xs"
                                  style={{ borderColor: COLORS.secondary }}
                                  value={skillState.frecuencia}
                                  onChange={(event) => handleNuevoColaboradorSkillChange(skill.id, 'frecuencia', event.target.value)}
                                >
                                  {FRECUENCIA_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCancelarNuevoColaborador}
                    className="px-4 py-2 text-sm rounded-md border transition-colors"
                    style={{ borderColor: COLORS.secondary, color: COLORS.text.secondary }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingColaborador}
                    className="px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    style={{ backgroundColor: isSavingColaborador ? COLORS.secondary : COLORS.primary, color: COLORS.white }}
                  >
                    {isSavingColaborador ? 'Guardando...' : 'Guardar colaborador'}
                  </button>
                </div>
              </form>
            )}
            <div className="space-y-4">
              {colaboradores.map(col => {
                const promedioGeneral = calcularPromedioGeneral(col.categorias);
                const status = getStatusInfo(parseFloat(promedioGeneral));
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => setColaboradorSeleccionado(col)}
                    className="w-full text-left border rounded-lg p-6 transition-all bg-white hover:shadow-md"
                    style={{ borderColor: COLORS.secondary, borderWidth: '1px' }}
                    onMouseEnter={(event) => { event.currentTarget.style.borderColor = COLORS.primary; }}
                    onMouseLeave={(event) => { event.currentTarget.style.borderColor = COLORS.secondary; }}
                  >
                    <div className="flex justify-between items-start gap-6 mb-4">
                      <div>
                        <h3 className="text-lg font-medium" style={{ color: COLORS.text.primary }}>
                          {col.nombre}
                        </h3>
                        <p className="text-sm" style={{ color: COLORS.text.secondary }}>
                          {col.rol}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-light" style={{ color: status.color }}>
                          {promedioGeneral}
                        </p>
                        <p className="text-xs mt-1" style={{ color: COLORS.text.light }}>
                          {status.label}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-6 flex-wrap">
                      {Object.entries(col.categorias).map(([catKey, valor], idx) => (
                        <div key={catKey} className="text-center">
                          <p className="text-xs mb-1 uppercase tracking-wide" style={{ color: COLORS.text.light }}>
                            {(CATEGORIAS[idx] && CATEGORIAS[idx].abrev) || catKey}
                          </p>
                          <p
                            className="text-sm font-semibold"
                            style={{ color: getStatusColor(valor) }}
                          >
                            {valor.toFixed(1)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {/* DETALLE DEL COLABORADOR */}
        {/* DETALLE DEL COLABORADOR */}
        {vistaActual === 'colaboradores' && colaboradorSeleccionado && (
          <div className="space-y-8">
            {/* Header del colaborador */}
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <button
                onClick={() => setColaboradorSeleccionado(null)}
                className="mb-4 text-sm font-medium transition-colors"
                style={{ color: COLORS.text.secondary }}
              >
                ← Volver a colaboradores
              </button>
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-3xl font-light mb-2" style={{ color: COLORS.primary }}>
                    {colaboradorSeleccionado.nombre}
                  </h2>
                  <p className="text-lg" style={{ color: COLORS.text.secondary }}>
                    {colaboradorSeleccionado.rol}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm mb-1" style={{ color: COLORS.text.secondary }}>
                    Promedio General
                  </p>
                  <p className="text-5xl font-light" style={{ color: getStatusColor(parseFloat(calcularPromedioGeneral(colaboradorSeleccionado.categorias))) }}>
                    {calcularPromedioGeneral(colaboradorSeleccionado.categorias)}
                  </p>
                </div>
              </div>
            </div>
            {/* Análisis de Desarrollo */}
            {(() => {
              const analysis = getColaboradorInsights(colaboradorSeleccionado);
              return (
                <div className="bg-white p-8 rounded-lg shadow-sm">
                  <h2 className="text-2xl font-light mb-6" style={{ color: COLORS.primary }}>
                    Análisis de Desarrollo
                  </h2>
                  {/* Mí©tricas de madurez */}
                  <div className="grid md:grid-cols-4 gap-6 mb-8">
                    <div className="text-center p-4 rounded" style={{ backgroundColor: COLORS.background }}>
                      <div className="text-3xl font-light mb-2" style={{ color: analysis.metricas.colorRiesgo }}>
                        {analysis.metricas.nivelRiesgo}
                      </div>
                      <div className="text-xs" style={{ color: COLORS.text.secondary }}>
                        Nivel de Riesgo
                      </div>
                    </div>
                    <div className="text-center p-4 rounded" style={{ backgroundColor: COLORS.background }}>
                      <div className="text-3xl font-light mb-2" style={{ color: COLORS.primary }}>
                        {analysis.metricas.porcentajeMadurezCriticas.toFixed(0)}%
                      </div>
                      <div className="text-xs" style={{ color: COLORS.text.secondary }}>
                        Skills Críticas (3)
                      </div>
                      <div className="text-xs mt-1" style={{ color: COLORS.text.light }}>
                        {analysis.metricas.criticasCumplidas} de {analysis.metricas.totalCriticas}
                      </div>
                    </div>
                    <div className="text-center p-4 rounded" style={{ backgroundColor: COLORS.background }}>
                      <div className="text-3xl font-light mb-2" style={{ color: COLORS.neutral }}>
                        {analysis.metricas.porcentajeMadurezImportantes.toFixed(0)}%
                      </div>
                      <div className="text-xs" style={{ color: COLORS.text.secondary }}>
                        Skills Importantes (3)
                      </div>
                      <div className="text-xs mt-1" style={{ color: COLORS.text.light }}>
                        {analysis.metricas.importantesCumplidas} de {analysis.metricas.totalImportantes}
                      </div>
                    </div>
                    <div className="text-center p-4 rounded" style={{ backgroundColor: COLORS.background }}>
                      <div className="text-3xl font-light mb-2" style={{ color: COLORS.success }}>
                        {analysis.fortalezas.length}
                      </div>
                      <div className="text-xs" style={{ color: COLORS.text.secondary }}>
                        Fortalezas Identificadas
                      </div>
                    </div>
                  </div>
                  {/* Brechas Críticas */}
                  {analysis.brechasCriticas.length > 0 && (
                    <div className="mb-8 p-6 border-l-4 rounded" style={{
                      backgroundColor: COLORS.danger + '10',
                      borderColor: COLORS.danger
                    }}>
                      <h3 className="text-lg font-medium mb-4" style={{ color: COLORS.danger }}>
                        Brechas Críticas ({analysis.brechasCriticas.length})
                      </h3>
                      <p className="text-sm mb-4" style={{ color: COLORS.text.secondary }}>
                        Skills críticas de uso frecuente con nivel insuficiente. <strong>Requieren atención inmediata.</strong>
                      </p>
                      <div className="space-y-3">
                        {analysis.brechasCriticas.slice(0, 5).map(skill => (
                          <div key={skill.id} className="flex justify-between items-center p-3 bg-white rounded">
                            <div className="flex-1">
                              <div className="font-medium text-sm" style={{ color: COLORS.text.primary }}>
                                {skill.nombre}
                              </div>
                              <div className="text-xs mt-1" style={{ color: COLORS.text.secondary }}>
                                Criticidad: {skill.criticidad}  Frecuencia: {skill.frecuencia}  Peso: {skill.evaluacion.peso}
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <div className="text-2xl font-light" style={{ color: COLORS.danger }}>
                                {skill.nivel}
                              </div>
                              <div className="text-xs" style={{ color: COLORS.text.light }}>
                                actual
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Áreas de Mejora */}
                  {analysis.areasMejora.length > 0 && (
                    <div className="mb-8 p-6 border-l-4 rounded" style={{
                      backgroundColor: COLORS.warning + '10',
                      borderColor: COLORS.warning
                    }}>
                      <h3 className="text-lg font-medium mb-4" style={{ color: COLORS.warning }}>
                        Áreas de Mejora ({analysis.areasMejora.length})
                      </h3>
                      <p className="text-sm mb-4" style={{ color: COLORS.text.secondary }}>
                        Skills críticas que requieren desarrollo a corto plazo.
                      </p>
                      <div className="space-y-3">
                        {analysis.areasMejora.slice(0, 5).map(skill => (
                          <div key={skill.id} className="flex justify-between items-center p-3 bg-white rounded">
                            <div className="flex-1">
                              <div className="font-medium text-sm" style={{ color: COLORS.text.primary }}>
                                {skill.nombre}
                              </div>
                              <div className="text-xs mt-1" style={{ color: COLORS.text.secondary }}>
                                Criticidad: {skill.criticidad}  Frecuencia: {skill.frecuencia}  Peso: {skill.evaluacion.peso}
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <div className="text-2xl font-light" style={{ color: COLORS.warning }}>
                                {skill.nivel}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Fortalezas Clave */}
                  {analysis.fortalezasClave.length > 0 && (
                    <div className="mb-8 p-6 border-l-4 rounded" style={{
                      backgroundColor: COLORS.success + '10',
                      borderColor: COLORS.success
                    }}>
                      <h3 className="text-lg font-medium mb-4" style={{ color: COLORS.success }}>
                        Fortalezas Clave ({analysis.fortalezasClave.length})
                      </h3>
                      <p className="text-sm mb-4" style={{ color: COLORS.text.secondary }}>
                        Skills críticas dominadas y aplicadas frecuentemente.
                      </p>
                      <div className="grid md:grid-cols-2 gap-3">
                        {analysis.fortalezasClave.slice(0, 6).map(skill => (
                          <div key={skill.id} className="flex justify-between items-center p-3 bg-white rounded">
                            <div className="font-medium text-sm" style={{ color: COLORS.text.primary }}>
                              {skill.nombre}
                            </div>
                            <div className="text-xl font-light" style={{ color: COLORS.success }}>
                              {skill.nivel}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Talento Subutilizado */}
                  {analysis.talentoSubutilizado.length > 0 && (
                    <div className="mb-8 p-6 border-l-4 rounded" style={{
                      backgroundColor: '#9333ea15',
                      borderColor: '#9333ea'
                    }}>
                      <h3 className="text-lg font-medium mb-4" style={{ color: '#9333ea' }}>
                        Talento Subutilizado ({analysis.talentoSubutilizado.length})
                      </h3>
                      <p className="text-sm mb-4" style={{ color: COLORS.text.secondary }}>
                        Competencias de alto nivel que no se están aprovechando. <strong>Considerar reasignación de proyectos.</strong>
                      </p>
                      <div className="space-y-3">
                        {analysis.talentoSubutilizado.map(skill => (
                          <div key={skill.id} className="flex justify-between items-center p-3 bg-white rounded">
                            <div className="flex-1">
                              <div className="font-medium text-sm" style={{ color: COLORS.text.primary }}>
                                {skill.nombre}
                              </div>
                              <div className="text-xs mt-1" style={{ color: COLORS.text.secondary }}>
                                Criticidad: {skill.criticidad}  Frecuencia actual: {skill.frecuencia}
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <div className="text-2xl font-light" style={{ color: '#9333ea' }}>
                                {skill.nivel}
                              </div>
                              <div className="text-xs" style={{ color: COLORS.text.light }}>
                                alto nivel
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Mensaje si no hay alertas */}
                  {analysis.brechasCriticas.length === 0 && analysis.areasMejora.length === 0 && (
                    <div className="p-6 text-center rounded" style={{ backgroundColor: COLORS.success + '10' }}>
                      <div className="text-4xl mb-3"></div>
                      <p className="font-medium mb-2" style={{ color: COLORS.success }}>
                        Excelente perfil de competencias
                      </p>
                      <p className="text-sm" style={{ color: COLORS.text.secondary }}>
                        No se detectaron brechas críticas. Continuar fortaleciendo las competencias clave.
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
            {/* Perfil por categora - lollipop */}
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <h2 className="text-2xl font-light mb-6" style={{ color: COLORS.primary }}>
                Perfil por Categora
              </h2>
              <div className="space-y-5">
                {CATEGORIAS.map((cat, idx) => {
                  const valor = colaboradorSeleccionado.categorias[`cat${idx + 1}`] ?? 0;
                  const porcentaje = Math.max(0, Math.min((valor / 5) * 100, 100));
                  const color = getStatusColor(valor);
                  return (
                    <div key={cat.id}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium" style={{ color: COLORS.text.primary }}>
                          {cat.nombre}
                        </span>
                        <span className="text-sm font-semibold" style={{ color }}>
                          {valor.toFixed(1)}
                        </span>
                      </div>
                      <div className="relative h-2 rounded-full" style={{ backgroundColor: COLORS.secondary + '55' }}>
                        <div
                          className="absolute top-0 left-0 h-full rounded-full"
                          style={{
                            backgroundColor: color,
                            width: `${porcentaje}%`
                          }}
                        />
                        <div
                          className="absolute top-1/2 w-4 h-4 rounded-full transform -translate-y-1/2 -translate-x-1/2"
                          style={{
                            backgroundColor: COLORS.white,
                            border: `2px solid ${color}`,
                            left: `${porcentaje}%`
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Tabla detallada de todas las skills */}
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <h2 className="text-2xl font-light mb-6" style={{ color: COLORS.primary }}>
                Detalle Completo de Competencias
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${COLORS.primary}` }}>
                      <th className="text-left py-3 px-3 font-medium" style={{ color: COLORS.text.secondary }}>
                        Skill
                      </th>
                      <th className="text-left py-3 px-3 font-medium" style={{ color: COLORS.text.secondary }}>
                        Categoría
                      </th>
                      <th className="text-center py-3 px-3 font-medium" style={{ color: COLORS.text.secondary }}>
                        Nivel
                      </th>
                      <th className="text-center py-3 px-3 font-medium" style={{ color: COLORS.text.secondary }}>
                        Criticidad
                      </th>
                      <th className="text-center py-3 px-3 font-medium" style={{ color: COLORS.text.secondary }}>
                        Frecuencia
                      </th>
                      <th className="text-left py-3 px-3 font-medium" style={{ color: COLORS.text.secondary }}>
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {SKILLS.map(skill => {
                      const skillData = colaboradorSeleccionado.skills[skill.id];
                      const evaluacion = evaluarSkill(skillData.nivel, skillData.frecuencia, skillData.criticidad);
                      const categoria = CATEGORIAS.find(c => c.id === skill.categoria);
                      return (
                        <tr key={skill.id} style={{ borderBottom: `1px solid ${COLORS.secondary}` }}>
                          <td className="py-3 px-3" style={{ color: COLORS.text.primary }}>
                            {skill.nombre}
                          </td>
                          <td className="py-3 px-3 text-xs" style={{ color: COLORS.text.secondary }}>
                            {categoria.abrev}
                          </td>
                          <td className="text-center py-3 px-3">
                            <span
                              className="text-lg font-semibold"
                              style={{ color: evaluacion.color }}
                            >
                              {skillData.nivel}
                            </span>
                          </td>
                          <td className="text-center py-3 px-3 font-medium" style={{ color: COLORS.text.primary }}>
                            {skillData.criticidad}
                          </td>
                          <td className="text-center py-3 px-3 font-medium" style={{ color: COLORS.text.primary }}>
                            {skillData.frecuencia}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className="text-xs px-2 py-1 rounded"
                              style={{
                                backgroundColor: evaluacion.color + '15',
                                color: evaluacion.color
                              }}
                            >
                              {evaluacion.estado}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {/* VISTA: POR CATEGORíA */}
        {vistaActual === 'categorias' && !categoriaSeleccionada && (
          <div className="grid md:grid-cols-2 gap-6">
            {CATEGORIAS.map(cat => {
              const promedioCat = parseFloat(promedioEquipo[`cat${cat.id}`]);
              const status = getStatusInfo(promedioCat);
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategoriaSeleccionada(cat)}
                  className="bg-white p-6 rounded-lg text-left transition-all hover:shadow-lg"
                  style={{ border: `1px solid ${COLORS.secondary}` }}
                >
                  <h3 className="text-xl font-medium mb-1" style={{ color: COLORS.primary }}>
                    {cat.nombre}
                  </h3>
                  <p className="text-sm mb-4" style={{ color: COLORS.text.secondary }}>
                    {cat.skillCount} competencias evaluadas
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: COLORS.text.secondary }}>
                      Promedio del equipo
                    </span>
                    <span className="text-3xl font-light" style={{ color: status.color }}>
                      {promedioCat.toFixed(1)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        {/* DETALLE DE CATEGORíA */}
        {vistaActual === 'categorias' && categoriaSeleccionada && (
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <button
                onClick={() => setCategoriaSeleccionada(null)}
                className="mb-4 text-sm font-medium transition-colors"
                style={{ color: COLORS.text.secondary }}
              >
                ← Volver a categorías
              </button>
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-3xl font-light mb-2" style={{ color: COLORS.primary }}>
                    {categoriaSeleccionada.nombre}
                  </h2>
                  <p className="text-lg" style={{ color: COLORS.text.secondary }}>
                    {categoriaSeleccionada.skillCount} competencias
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm mb-1" style={{ color: COLORS.text.secondary }}>
                    Promedio del Equipo
                  </p>
                  <p className="text-5xl font-light" style={{
                    color: getStatusColor(parseFloat(promedioEquipo[`cat${categoriaSeleccionada.id}`]))
                  }}>
                    {parseFloat(promedioEquipo[`cat${categoriaSeleccionada.id}`]).toFixed(1)}
                  </p>
                </div>
              </div>
            </div>
            {/* Resumen por colaborador */}
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <h3 className="text-xl font-light mb-6" style={{ color: COLORS.primary }}>
                Resumen por Colaborador
              </h3>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: `2px solid ${COLORS.primary}` }}>
                    <th className="text-left py-3 font-medium" style={{ color: COLORS.text.primary }}>
                      Colaborador
                    </th>
                    <th className="text-left py-3 font-medium" style={{ color: COLORS.text.primary }}>
                      Rol
                    </th>
                    <th className="text-center py-3 font-medium" style={{ color: COLORS.text.primary }}>
                      Promedio
                    </th>
                    <th className="text-center py-3 font-medium" style={{ color: COLORS.text.primary }}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {colaboradores.map(col => {
                    const promedioCat = col.categorias[`cat${categoriaSeleccionada.id}`];
                    const status = getStatusInfo(promedioCat);
                    return (
                      <tr key={col.id} style={{ borderBottom: `1px solid ${COLORS.secondary}` }}>
                        <td className="py-4 font-medium" style={{ color: COLORS.text.primary }}>
                          {col.nombre}
                        </td>
                        <td className="py-4 text-sm" style={{ color: COLORS.text.secondary }}>
                          {col.rol}
                        </td>
                        <td className="text-center py-4">
                          <span className="text-lg font-semibold" style={{ color: status.color }}>
                            {promedioCat.toFixed(1)}
                          </span>
                        </td>
                        <td className="text-center py-4">
                          <span
                            className="px-3 py-1 rounded text-xs font-medium"
                            style={{
                              backgroundColor: status.color + '15',
                              color: status.color
                            }}
                          >
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={{ backgroundColor: COLORS.background }}>
                    <td className="py-4 font-medium" colSpan="2" style={{ color: COLORS.text.primary }}>
                      Promedio del equipo
                    </td>
                    <td className="text-center py-4">
                      <span className="text-lg font-semibold" style={{ color: COLORS.primary }}>
                        {parseFloat(promedioEquipo[`cat${categoriaSeleccionada.id}`]).toFixed(1)}
                      </span>
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
            {/* Detalle de skills */}
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <h3 className="text-xl font-light mb-6" style={{ color: COLORS.primary }}>
                Detalle por Skill
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: `2px solid ${COLORS.secondary}` }}>
                    <th className="text-left py-3 font-medium" style={{ color: COLORS.text.secondary }}>
                      Skill
                    </th>
                    {colaboradores.map(col => (
                      <th key={col.id} className="text-center py-3 font-medium" style={{ color: COLORS.text.secondary }}>
                        {col.nombre.split(' ')[0]}
                      </th>
                    ))}
                    <th className="text-center py-3 font-medium" style={{ color: COLORS.text.primary }}>
                      Promedio
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {SKILLS.filter(s => s.categoria === categoriaSeleccionada.id).map(skill => {
                    const niveles = colaboradores.map(col => col.skills[skill.id].nivel);
                    const promedioSkill = (niveles.reduce((a, b) => a + b, 0) / niveles.length);
                    return (
                      <tr key={skill.id} style={{ borderBottom: `1px solid ${COLORS.secondary}` }}>
                        <td className="py-3" style={{ color: COLORS.text.primary }}>
                          {skill.nombre}
                        </td>
                        {colaboradores.map(col => {
                          const skillData = col.skills[skill.id];
                          return (
                            <td key={col.id} className="text-center py-3">
                              <span
                                className="font-medium"
                                style={{ color: getStatusColor(skillData.nivel) }}
                              >
                                {skillData.nivel}
                              </span>
                            </td>
                          );
                        })}
                        <td className="text-center py-3">
                          <span
                            className="font-semibold"
                            style={{ color: getStatusColor(promedioSkill) }}
                          >
                            {promedioSkill.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default SkillsDashboard;
