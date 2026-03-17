'use client';

/**
 * 2026-03-17: Página Beca SEP – pestañas para optimizar espacio.
 * Referencia: index.html becas_sep_panel. Estilos en globals.css (.beca-*, .beca-tab).
 */

import { useState } from 'react';

type TabId = 'alumno' | 'reporte' | 'prorrateo' | 'preview' | 'guardar';

const TABS: { id: TabId; label: string }[] = [
  { id: 'alumno', label: 'Alumno' },
  { id: 'reporte', label: 'Reporte CSV' },
  { id: 'prorrateo', label: 'Prorrateo' },
  { id: 'preview', label: 'Previsualización' },
  { id: 'guardar', label: 'Guardar SEP' },
];

const MESES_CORTE = [
  { value: '01', label: 'Septiembre' },
  { value: '02', label: 'Octubre' },
  { value: '03', label: 'Noviembre' },
  { value: '04', label: 'Diciembre' },
  { value: '05', label: 'Enero' },
  { value: '06', label: 'Febrero' },
  { value: '07', label: 'Marzo' },
  { value: '08', label: 'Abril' },
  { value: '09', label: 'Mayo' },
  { value: '10', label: 'Junio' },
  { value: '26', label: 'Julio (11 meses)' },
];

function IconBeca() {
  return (
    <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );
}

export default function BecaSepPage() {
  const [activeTab, setActiveTab] = useState<TabId>('alumno');
  const [successMessage, setSuccessMessage] = useState('');
  const [alumnoId, setAlumnoId] = useState('');
  const [alumnoRef, setAlumnoRef] = useState('');
  const [sepCe, setSepCe] = useState(() => {
    const now = new Date();
    const y = now.getFullYear() % 100;
    const cmp = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return cmp < '07-10' ? String(y - 4) : String(y - 3);
  });
  const [sepFechaInicio, setSepFechaInicio] = useState(() =>
    new Date().toISOString().split('T')[0]
  );
  const [mesCorte, setMesCorte] = useState('03');
  const [nivelFiltro, setNivelFiltro] = useState('0');
  const [planFiltro, setPlanFiltro] = useState('0');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const [prorrateoLoading, setProrrateoLoading] = useState(false);
  const [prorrateoResult, setProrrateoResult] = useState('');
  const [prorrateoError, setProrrateoError] = useState('');
  const [sepMesCorte, setSepMesCorte] = useState('03');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState('');
  const [previewError, setPreviewError] = useState('');
  // 2026-03-17: Porcentaje beca SEP y beca interna verificada en BD (apartado Previsualización).
  const [previewPorcentajeSep, setPreviewPorcentajeSep] = useState<number | null>(null);
  const [previewBecaInterna, setPreviewBecaInterna] = useState<{ tiene: boolean; porcentaje: number } | null>(null);
  // 2026-03-17: Campo para ingresar % beca SEP y previsualizar con ese valor (opcional; si está vacío se usa el del registro).
  const [previewPctSepInput, setPreviewPctSepInput] = useState('');
  const [sepMontoProrrateado, setSepMontoProrrateado] = useState('');
  const [sepEstatus, setSepEstatus] = useState('1');
  const [sepPorcentaje, setSepPorcentaje] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3200);
  };

  const handleReport = async () => {
    setReportError('');
    setReportLoading(true);
    try {
      const res = await fetch(
        `/api/beca-sep/report?mes_corte=${mesCorte}&nivel_filtro=${nivelFiltro}&plan_filtro=${planFiltro}`
      );
      const contentType = res.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const data = await res.json();
        setReportError(data.message || 'Error al generar reporte.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `beca_sep_report_mes${mesCorte}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setReportError('Error de red o servidor.');
    } finally {
      setReportLoading(false);
    }
  };

  const handleProrrateo = async () => {
    setProrrateoError('');
    setProrrateoResult('');
    setProrrateoLoading(true);
    try {
      const res = await fetch('/api/beca-sep/prorrateo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alumno_id: parseInt(alumnoId, 10) || 0 }),
      });
      const data = await res.json();
      if (data.ok) setProrrateoResult(data.message || '');
      else setProrrateoError(data.message || 'Error en prorrateo.');
    } catch (e) {
      setProrrateoError('Error de red o servidor.');
    } finally {
      setProrrateoLoading(false);
    }
  };

  const handlePreview = async () => {
    setPreviewError('');
    setPreviewResult('');
    setPreviewLoading(true);
    try {
      const pctSepNum = previewPctSepInput.trim() ? parseFloat(previewPctSepInput.replace(/,/g, '.')) : undefined;
      const res = await fetch('/api/beca-sep/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alumno_ref: alumnoRef || undefined,
          ciclo_escolar: sepCe ? parseInt(sepCe, 10) : undefined,
          mes_corte: sepMesCorte,
          ...(pctSepNum != null && Number.isFinite(pctSepNum) ? { porcentaje_sep: pctSepNum } : {}),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setPreviewResult(data.message || '');
        if (typeof data.porcentaje_sep === 'number') {
          setPreviewPorcentajeSep(data.porcentaje_sep);
          if (!previewPctSepInput.trim()) setPreviewPctSepInput(String(data.porcentaje_sep));
        }
        if (data.beca_interna != null) setPreviewBecaInterna(data.beca_interna);
        if (typeof data.monto_sugerido === 'number') {
          setSepMontoProrrateado(data.monto_sugerido.toFixed(2));
        } else {
          const m = (data.message || '').match(/Monto sugerido prorrateado:\s*\$([0-9,]+\.[0-9]{2})/);
          if (m?.[1]) setSepMontoProrrateado(m[1].replace(/,/g, ''));
        }
      } else {
        setPreviewError(data.message || 'Error en previsualización.');
        setPreviewPorcentajeSep(null);
        setPreviewBecaInterna(null);
      }
    } catch (e) {
      setPreviewError('Error de red o servidor.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSave = async () => {
    setSaveError('');
    setSaveLoading(true);
    try {
      const res = await fetch('/api/beca-sep/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alumno_ref: alumnoRef,
          ciclo_escolar: parseInt(sepCe, 10) || undefined,
          monto_prorrateado: parseFloat(sepMontoProrrateado) || 0,
          fecha_inicio: sepFechaInicio || undefined,
          estatus: parseInt(sepEstatus, 10) || 1,
          porcentaje: parseFloat(sepPorcentaje) || 0,
        }),
      });
      const data = await res.json();
      if (data.ok) showSuccess(data.message || 'Guardado correctamente.');
      else setSaveError(data.message || 'Error al guardar.');
    } catch (e) {
      setSaveError('Error de red o servidor.');
    } finally {
      setSaveLoading(false);
    }
  };

  const anioCompletoDisponible = prorrateoResult.includes('OTORGAR_ANIO_COMPLETO_DISPONIBLE=SI');

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/80">
      {/* Toast de éxito */}
      {successMessage && (
        <div
          role="alert"
          className="beca-toast-enter fixed top-4 right-4 z-50 flex max-w-sm items-center gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 shadow-lg ring-1 ring-emerald-500/20"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <IconCheck />
          </span>
          <p className="text-sm font-medium text-slate-800">{successMessage}</p>
        </div>
      )}

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Cabecera + Pestañas */}
        <header className="mb-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-md ring-1 ring-slate-200/80 sm:h-14 sm:w-14 sm:rounded-2xl">
                <IconBeca />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">
                  Becas SEP
                </h1>
                <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                  Operación individual, reportes y prorrateo
                </p>
              </div>
            </div>
          </div>
          {/* Barra de pestañas */}
          <nav
            className="mt-6 border-b border-slate-200"
            aria-label="Apartados Becas SEP"
          >
            <div className="flex gap-1 overflow-x-auto pb-px">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`beca-tab flex-shrink-0 whitespace-nowrap ${activeTab === tab.id ? 'beca-tab-active' : ''}`}
                  aria-selected={activeTab === tab.id}
                  aria-controls={`panel-${tab.id}`}
                  id={`tab-${tab.id}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </nav>
        </header>

        {/* Contenido por pestaña */}
        <div className="min-h-[320px]">
          {activeTab === 'alumno' && (
            <section
              id="panel-alumno"
              className="beca-card border-l-4 border-l-slate-400 p-6"
              role="tabpanel"
              aria-labelledby="tab-alumno"
            >
              <h2 className="mb-4 text-base font-semibold text-slate-800">
                Datos del alumno
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="beca-label">ID alumno</label>
                  <input
                    type="text"
                    value={alumnoId}
                    onChange={(e) => setAlumnoId(e.target.value)}
                    className="beca-input"
                    placeholder="Ej. 123"
                  />
                </div>
                <div>
                  <label className="beca-label">No. de control</label>
                  <input
                    type="text"
                    value={alumnoRef}
                    onChange={(e) => setAlumnoRef(e.target.value)}
                    className="beca-input"
                    placeholder="Ej. 11479"
                  />
                </div>
                <div>
                  <label className="beca-label">Ciclo escolar</label>
                  <input
                    type="text"
                    value={sepCe}
                    onChange={(e) => setSepCe(e.target.value)}
                    className="beca-input w-24"
                    placeholder="25"
                  />
                </div>
                <div>
                  <label className="beca-label">Fecha inicio</label>
                  <input
                    type="date"
                    value={sepFechaInicio}
                    onChange={(e) => setSepFechaInicio(e.target.value)}
                    className="beca-input"
                  />
                </div>
              </div>
            </section>
          )}

          {activeTab === 'reporte' && (
            <section
              id="panel-reporte"
              className="beca-card border-l-4 border-l-blue-500 p-6"
              role="tabpanel"
              aria-labelledby="tab-reporte"
            >
              <h2 className="mb-4 text-base font-semibold text-slate-800">
                Reporte global CSV
              </h2>
              <div className="flex flex-wrap items-end gap-4">
                <div className="min-w-[140px]">
                  <label className="beca-label">Mes de corte</label>
                  <select
                    value={mesCorte}
                    onChange={(e) => setMesCorte(e.target.value)}
                    className="beca-input"
                  >
                    {MESES_CORTE.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div className="min-w-[140px]">
                  <label className="beca-label">Nivel</label>
                  <select
                    value={nivelFiltro}
                    onChange={(e) => setNivelFiltro(e.target.value)}
                    className="beca-input"
                  >
                    <option value="0">Todos</option>
                    <option value="1">Maternal</option>
                    <option value="2">Kinder</option>
                    <option value="3">Primaria</option>
                    <option value="4">Secundaria</option>
                  </select>
                </div>
                <div className="min-w-[140px]">
                  <label className="beca-label">Plan</label>
                  <select
                    value={planFiltro}
                    onChange={(e) => setPlanFiltro(e.target.value)}
                    className="beca-input"
                  >
                    <option value="0">Todos</option>
                    <option value="1">10 meses</option>
                    <option value="2">11 meses</option>
                  </select>
                </div>
                <button
                  onClick={handleReport}
                  disabled={reportLoading}
                  className="beca-btn-secondary"
                >
                  {reportLoading ? 'Generando…' : 'Descargar CSV'}
                </button>
              </div>
              {reportError && (
                <p className="mt-3 text-sm text-red-600">{reportError}</p>
              )}
            </section>
          )}

          {activeTab === 'prorrateo' && (
            <section
              id="panel-prorrateo"
              className="beca-card border-l-4 border-l-violet-500 p-6"
              role="tabpanel"
              aria-labelledby="tab-prorrateo"
            >
              <h2 className="mb-4 text-base font-semibold text-slate-800">
                Prorrateo por alumno
              </h2>
              <div className="flex flex-wrap items-end gap-4">
                <div className="w-36">
                  <label className="beca-label">ID alumno</label>
                  <input
                    type="number"
                    value={alumnoId}
                    onChange={(e) => setAlumnoId(e.target.value)}
                    className="beca-input"
                    placeholder="123"
                  />
                </div>
                <button
                  onClick={handleProrrateo}
                  disabled={prorrateoLoading}
                  className="beca-btn-primary"
                >
                  {prorrateoLoading ? 'Calculando…' : 'Calcular prorrateo'}
                </button>
              </div>
              {prorrateoError && (
                <p className="mt-3 text-sm text-red-600">{prorrateoError}</p>
              )}
              {prorrateoResult && (
                <div className="mt-4">
                  <p className="beca-label">Resultado</p>
                  <div className="beca-result-box">
                    <pre className="whitespace-pre-wrap">{prorrateoResult}</pre>
                    {anioCompletoDisponible && (
                      <div className="mt-4 flex justify-end border-t border-slate-200 pt-3">
                        <button
                          type="button"
                          className="beca-btn-primary text-sm"
                          onClick={() =>
                            alert(
                              'La función "Otorgar año completo" está preparada pero aún no está habilitada para registrar pagos automáticos. Consulte con sistemas.'
                            )
                          }
                        >
                          Otorgar año completo
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {activeTab === 'preview' && (
            <section
              id="panel-preview"
              className="beca-card border-l-4 border-l-amber-500 p-6"
              role="tabpanel"
              aria-labelledby="tab-preview"
            >
              <h2 className="mb-4 text-base font-semibold text-slate-800">
                Previsualización
              </h2>
              <div className="flex flex-wrap items-end gap-4">
                <div className="w-36">
                  <label className="beca-label">No. de control</label>
                  <input
                    type="text"
                    value={alumnoRef}
                    onChange={(e) => setAlumnoRef(e.target.value)}
                    className="beca-input"
                    placeholder="11479"
                  />
                </div>
                <div className="min-w-[160px]">
                  <label className="beca-label">Mes de colegiatura</label>
                  <select
                    value={sepMesCorte}
                    onChange={(e) => setSepMesCorte(e.target.value)}
                    className="beca-input"
                  >
                    {MESES_CORTE.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div className="w-28">
                  <label className="beca-label">Porcentaje SEP (%)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={previewPctSepInput}
                    onChange={(e) => setPreviewPctSepInput(e.target.value)}
                    className="beca-input"
                    placeholder="ej. 20"
                    title="Opcional: ingrese el % para previsualizar con ese valor; si se deja vacío se usa el del registro."
                  />
                </div>
                <button
                  onClick={handlePreview}
                  disabled={previewLoading || !alumnoRef}
                  className="beca-btn-accent"
                >
                  {previewLoading ? 'Calculando…' : 'Previsualizar'}
                </button>
              </div>
              {/* 2026-03-17: Porcentaje beca SEP y beca interna tomados/verificados en BD para otros procesos */}
              {(previewPorcentajeSep != null || previewBecaInterna != null) && (
                <div className="mt-4 flex flex-wrap gap-6 rounded-lg border border-amber-200/80 bg-amber-50/50 px-4 py-3 text-sm">
                  {previewPorcentajeSep != null && (
                    <div>
                      <span className="font-medium text-slate-600">Porcentaje beca SEP (registro):</span>{' '}
                      <span className="font-semibold text-slate-800">{previewPorcentajeSep}%</span>
                    </div>
                  )}
                  {previewBecaInterna != null && (
                    <div>
                      <span className="font-medium text-slate-600">Beca interna (verificado en BD):</span>{' '}
                      {previewBecaInterna.tiene ? (
                        <span className="font-semibold text-slate-800">Sí ({previewBecaInterna.porcentaje}%)</span>
                      ) : (
                        <span className="text-slate-600">No</span>
                      )}
                    </div>
                  )}
                </div>
              )}
              {previewError && (
                <p className="mt-3 text-sm text-red-600">{previewError}</p>
              )}
              {previewResult && (
                <div className="mt-4">
                  <p className="beca-label">Vista previa</p>
                  <div className="beca-result-box border-amber-200/60 bg-amber-50/40">
                    <pre className="whitespace-pre-wrap">{previewResult}</pre>
                  </div>
                </div>
              )}
            </section>
          )}

          {activeTab === 'guardar' && (
            <section
              id="panel-guardar"
              className="beca-card border-l-4 border-l-emerald-500 p-6"
              role="tabpanel"
              aria-labelledby="tab-guardar"
            >
              <h2 className="mb-4 text-base font-semibold text-slate-800">
                Guardar beca SEP
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="beca-label">No. de control</label>
                  <input
                    type="text"
                    value={alumnoRef}
                    onChange={(e) => setAlumnoRef(e.target.value)}
                    className="beca-input"
                    placeholder="11479"
                  />
                </div>
                <div>
                  <label className="beca-label">Monto prorrateado</label>
                  <input
                    type="text"
                    value={sepMontoProrrateado}
                    onChange={(e) => setSepMontoProrrateado(e.target.value)}
                    className="beca-input"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="beca-label">Fecha inicio</label>
                  <input
                    type="date"
                    value={sepFechaInicio}
                    onChange={(e) => setSepFechaInicio(e.target.value)}
                    className="beca-input"
                  />
                </div>
                <div>
                  <label className="beca-label">Estatus</label>
                  <select
                    value={sepEstatus}
                    onChange={(e) => setSepEstatus(e.target.value)}
                    className="beca-input"
                  >
                    <option value="1">Activo</option>
                    <option value="0">Inactivo</option>
                  </select>
                </div>
                <div>
                  <label className="beca-label">Porcentaje SEP (%)</label>
                  <input
                    type="text"
                    value={sepPorcentaje}
                    onChange={(e) => setSepPorcentaje(e.target.value)}
                    className="beca-input w-24"
                    placeholder="50"
                  />
                </div>
              </div>
              <div className="mt-5 flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saveLoading || !alumnoRef}
                  className="beca-btn-primary"
                >
                  {saveLoading ? 'Guardando…' : 'Guardar beca SEP'}
                </button>
                {saveError && (
                  <p className="text-sm text-red-600">{saveError}</p>
                )}
              </div>
            </section>
          )}
        </div>

        <footer className="mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
          Módulo Becas SEP · Cambie de pestaña para ver cada apartado
        </footer>
      </div>
    </main>
  );
}
