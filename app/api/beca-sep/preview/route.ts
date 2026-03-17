/**
 * 2026-03-17: API Previsualización beca SEP – calca de callback_3.php case '6d56cf8d0b8a40b2a6f5b4b97b2f41ea' (beca_sep_preview).
 * POST: alumno_ref, ciclo_escolar (opcional), mes_corte (opcional).
 * Requiere que exista registro en alumno_beca_sep (como PHP); devuelve texto con "Monto sugerido prorrateado: $X.XX".
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  queryRow,
  queryRows,
  queryValue,
  getCicloEscolarActual,
} from '@/lib/db';
import { MESES_10, MESES_11, NOMBRES_MES } from '@/lib/constants';
import { calcDifColDesglose, type ExcedenteParams } from '@/lib/excedente';

export async function POST(request: NextRequest) {
  let alumnoRef = '';
  let cicloEscolar = 0;
  let mesCorte = '10';
  let porcentajeSepOverride: number | null = null;
  try {
    const body = await request.json();
    alumnoRef = String(body?.alumno_ref ?? '').trim();
    cicloEscolar = Number(body?.ciclo_escolar) || getCicloEscolarActual();
    mesCorte = String(body?.mes_corte ?? '10').padStart(2, '0');
    if (body?.porcentaje_sep != null) porcentajeSepOverride = Number(body.porcentaje_sep);
  } catch {
    return NextResponse.json(
      { ok: false, message: 'Se requiere alumno_ref en el body.' },
      { status: 200 }
    );
  }
  if (!alumnoRef) {
    return NextResponse.json(
      { ok: false, message: 'Error: alumno_ref vacío.' },
      { status: 200 }
    );
  }

  const alumnoRefEsc = alumnoRef.replace(/'/g, "''");
  const ceStr = String(cicloEscolar).padStart(2, '0');

  // 2026-03-17: Incluir fecha_inicio y estatus para mensaje desglosado (calca callback_3).
  const sepRow = await queryRow(
    `SELECT id, monto_prorrateado, COALESCE(porcentaje,0), fecha_inicio, estatus FROM alumno_beca_sep WHERE alumno_ref='${alumnoRefEsc}' AND ciclo_escolar=${cicloEscolar} LIMIT 1`
  );
  if (!sepRow) {
    return NextResponse.json(
      {
        ok: false,
        message: `No hay registro de beca SEP para este alumno en el ciclo ${cicloEscolar}. Use 'Guardar SEP' para dar de alta el monto prorrateado.`,
      },
      { status: 200 }
    );
  }

  // 2026-03-17: Nombre completo para previsualización desglosada (como callback_3.php).
  const alumnoRow = await queryRow(
    `SELECT alumno_id, alumno_nivel, mes, CONCAT(alumno_app,' ',alumno_apm,' ',alumno_nombre) AS nombre_completo FROM alumno WHERE alumno_ref='${alumnoRefEsc}' LIMIT 1`
  );
  if (!alumnoRow || !alumnoRow[0]) {
    return NextResponse.json(
      { ok: false, message: `Alumno no encontrado para referencia ${alumnoRef}.` },
      { status: 200 }
    );
  }
  const alumnoId = Number(alumnoRow[0]);
  const alumnoNivel = Number(alumnoRow[1]);
  const alumnoMes = Number(alumnoRow[2]);
  const nombreCompleto = (alumnoRow[3] != null ? String(alumnoRow[3]) : '').trim() || alumnoRef;
  if (alumnoMes === 0) {
    return NextResponse.json(
      {
        ok: false,
        message: 'El alumno no tiene plan de pagos (10/11 meses).',
      },
      { status: 200 }
    );
  }

  let becaPct = Number(sepRow[2]);
  if (porcentajeSepOverride != null && Number.isFinite(porcentajeSepOverride)) {
    becaPct = Math.min(100, Math.max(0, porcentajeSepOverride));
  }

  // 2026-03-17: Consultar beca interna desde BD para devolverla en la respuesta (verificación para otros procesos).
  const becaIntRow = await queryRow(
    `SELECT COALESCE(beca_porcentaje,0) FROM alumno_beca WHERE alumno_id=${alumnoId} AND beca_estatus=1 AND beca_ciclo_escolar=${cicloEscolar} LIMIT 1`
  );
  const becaPctInt = becaIntRow ? Number(becaIntRow[0]) : 0;
  const becaInterna = { tiene: becaPctInt > 0, porcentaje: becaPctInt };

  if (becaPct >= 100) {
    const msg = 'Beca SEP al 100%: no se requiere cálculo de prorrateo.\nMonto sugerido prorrateado: $0.00';
    return NextResponse.json(
      { ok: true, message: msg, porcentaje_sep: becaPct, beca_interna: becaInterna },
      { status: 200 }
    );
  }

  const preciosRow = await queryRow(
    `SELECT precio_inscripcion, precio_colegiatura, precio_colegiatura2 FROM pago_boucher_precio WHERE alumno_nivel=${alumnoNivel} AND precio_ciclo_escolar=${cicloEscolar} LIMIT 1`
  );
  if (!preciosRow) {
    return NextResponse.json(
      { ok: false, message: `No hay precios para nivel ${alumnoNivel} en el ciclo.` },
      { status: 200 }
    );
  }
  const precioColFull =
    alumnoMes === 1 ? Number(preciosRow[1]) : Number(preciosRow[2]);
  const precioColRef =
    Math.round((precioColFull * (100 - becaPctInt)) / 100 * 100) / 100;
  const factorBeca = (100 - becaPct) / 100;
  const precioColBeca = Math.round(precioColFull * factorBeca * 100) / 100;

  const mesesPlan = alumnoMes === 1 ? MESES_10 : MESES_11;
  const idx10 = MESES_10.indexOf(mesCorte);
  const corte10 = idx10 !== -1 ? MESES_10.slice(0, idx10 + 1) : MESES_10;
  const idx11 = MESES_11.indexOf(mesCorte);
  const corte11 = idx11 !== -1 ? MESES_11.slice(0, idx11 + 1) : MESES_11;
  const corteMeses = alumnoMes === 1 ? corte10 : corte11;
  const nColPlan = mesesPlan.length;

  const colPagadas: string[] = [];
  const colRestantes: string[] = [];
  const pagosAmounts: Record<string, number> = {};
  const pagosRawP: Record<string, number> = {};
  for (const m of mesesPlan) {
    const pagoRaw =
      Number(
        await queryValue(
          `SELECT COALESCE(SUM(pago_importe),0) FROM pago_detalle WHERE alumno_id=${alumnoId} AND SUBSTR(pago_referencia,6,2)='${m}' AND SUBSTR(pago_referencia,8,2)='${ceStr}' AND pago_cancelado!=1 AND pago_cancelado!=2`
        )
      ) || 0;
    const pagoM = pagoRaw > 0 ? Math.min(pagoRaw, precioColFull) : 0;
    pagosAmounts[m] = pagoM;
    pagosRawP[m] = pagoRaw;
    if (pagoM > 0) colPagadas.push(m);
    else colRestantes.push(m);
  }
  const nColPagadas = colPagadas.length;
  // 2026-03-17: Pagadas hasta corte = solo meses del plan hasta mes_corte con pago; Restantes = plan - pagadas hasta corte (calca sistema antiguo).
  const nColPagadasHastaCorte = corteMeses.filter((m) => (pagosAmounts[m] ?? 0) > 0).length;
  const nColRestantes = nColPlan - nColPagadasHastaCorte;

  const insPagada =
    Number(
      await queryValue(
        `SELECT COALESCE(SUM(pago_importe),0) FROM pago_detalle WHERE alumno_id=${alumnoId} AND SUBSTR(pago_referencia,6,2) IN ('11','12','13') AND SUBSTR(pago_referencia,8,2)='${ceStr}' AND pago_cancelado!=1 AND pago_cancelado!=2`
      )
    ) || 0;
  const precioInsFull = Number(preciosRow[0]);
  const precioInsBeca = Math.round(precioInsFull * factorBeca * 100) / 100;

  const fechaPRaw = await queryRows(
    `SELECT SUBSTR(pago_referencia,6,2) AS mes_c, MAX(pago_fecha) AS f FROM pago_detalle WHERE alumno_id=${alumnoId} AND SUBSTR(pago_referencia,8,2)='${ceStr}' AND pago_cancelado!=1 AND pago_cancelado!=2 GROUP BY SUBSTR(pago_referencia,6,2)`
  );
  const pagosFechaP: Record<string, string> = {};
  for (const fr of fechaPRaw) {
    if (fr[1]) pagosFechaP[String(fr[0])] = String(fr[1]);
  }
  const corrRawP = await queryRows(
    `SELECT LPAD(pago_concepto,2,'0') FROM pago_prorroga WHERE alumno_id=${alumnoId} AND prorroga_ciclo_escolar=${cicloEscolar} AND correccion=1`
  );
  const mesesConCorreccionP = corrRawP.map((r) => String(r[0]));
  const pagosColForExcedente: Record<string, number> = {};
  for (const m of mesesPlan) {
    pagosColForExcedente[m] = pagosAmounts[m] ?? 0;
  }
  // 2026-03-17: Solo meses hasta el corte (no todos los pagados) para que el excedente coincida con el sistema antiguo.
  const excedenteParams: ExcedenteParams = {
    ce_actual: cicloEscolar,
    corte_meses: corteMeses,
    pagos_map: pagosRawP,
    pagos_fecha: pagosFechaP,
    pagos_col: pagosAmounts,
    col_full: precioColFull,
    col_beca: precioColRef,
    col_beca_sep: precioColBeca,
    beca_pct: becaPctInt,
    meses_con_correccion: mesesConCorreccionP,
  };
  // 2026-03-17: Usar desglose por mes para previsualización depurable (calca callback_3.php).
  const { total: difCol, desglose: desgloseMeses } = calcDifColDesglose(excedenteParams);
  const difInsRaw = Math.max(0, Math.round((insPagada - precioInsBeca) * 100) / 100);
  const difIns = Number.isFinite(difInsRaw) ? difInsRaw : 0;
  const excedente = Number.isFinite(difCol + difIns)
    ? Math.round((difCol + difIns) * 100) / 100
    : 0;

  const montoSepGuardado = Number(sepRow[1]) || 0;
  const fechaInicioSep = sepRow[3] != null ? String(sepRow[3]).slice(0, 10) : '';
  const estatusSep = sepRow[4] != null ? Number(sepRow[4]) : 1;
  const nombreMesCorte = NOMBRES_MES[mesCorte] ?? mesCorte;

  const lineas: string[] = [];
  lineas.push('=== PREVISUALIZACIÓN SEP ===');
  lineas.push(`Alumno: ${nombreCompleto} (${alumnoRef})`);
  lineas.push(`Ciclo: ${cicloEscolar}`);
  if (montoSepGuardado <= 0) {
    lineas.push(
      `Monto SEP guardado (por mes): $0.00 (sin guardar; abajo se calcula con % SEP como en el reporte)`
    );
  } else {
    lineas.push(`Monto SEP guardado (por mes): $${montoSepGuardado.toFixed(2)}`);
  }
  lineas.push(`Mes de colegiatura (corte): ${nombreMesCorte}`);
  lineas.push(
    `Plan: ${nColPlan} meses | Pagadas hasta corte: ${nColPagadasHastaCorte} | Restantes: ${nColRestantes}`
  );
  lineas.push(
    `Colegiatura completa: $${precioColFull.toFixed(2)} | con SEP ${becaPct}%: $${precioColBeca.toFixed(2)}`
  );
  if (becaPctInt > 0) {
    lineas.push(`Beca interna ${becaPctInt}%: $${precioColRef.toFixed(2)}`);
  }
  lineas.push(
    `Inscripción: pagada $${insPagada.toFixed(2)} | con SEP: $${precioInsBeca.toFixed(2)} → excedente inscripción: $${difIns.toFixed(2)}`
  );
  lineas.push(
    `Excedente colegiaturas: $${difCol.toFixed(2)} | Inscripción: $${difIns.toFixed(2)} | TOTAL: $${excedente.toFixed(2)}`
  );
  lineas.push('Desglose por mes hasta corte:');
  for (const d of desgloseMeses) {
    const vsSep = d.contribucion >= 0 ? `+$${d.contribucion.toFixed(2)}` : `$${d.contribucion.toFixed(2)}`;
    lineas.push(`  • ${d.mes}: pago real $${d.pagoReal.toFixed(2)} | ${d.tipoDesc} → vs SEP ${vsSep}`);
  }
  lineas.push('--- Fin desglose ---');

  let montoSugerido = 0;
  if (nColRestantes > 0) {
    if (excedente >= nColRestantes * precioColBeca) {
      montoSugerido = 0;
    } else if (excedente > 0) {
      const excedentePorCol = Math.round((excedente / nColRestantes) * 100) / 100;
      montoSugerido = Math.round((precioColBeca - excedentePorCol) * 100) / 100;
      if (montoSugerido < 0) montoSugerido = 0;
    } else {
      montoSugerido = precioColBeca;
    }
  }
  lineas.push(
    `Monto sugerido prorrateado: $${(Number.isFinite(montoSugerido) ? montoSugerido : 0).toFixed(2)}` +
      (montoSepGuardado <= 0
        ? " (igual lógica que el reporte; guarde este monto con 'Guardar SEP' para actualizar el registro)"
        : '')
  );
  lineas.push(
    `Registro SEP: Monto $${montoSepGuardado.toFixed(2)} | % SEP: ${becaPct}% | Fecha inicio: ${fechaInicioSep || '(vacío)'} | Estatus: ${estatusSep}`
  );

  const message = lineas.join('\n');
  return NextResponse.json(
    {
      ok: true,
      message,
      monto_sugerido: montoSugerido,
      porcentaje_sep: becaPct,
      beca_interna: becaInterna,
    },
    { status: 200 }
  );
}
