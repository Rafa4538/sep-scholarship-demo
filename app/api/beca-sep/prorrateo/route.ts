/**
 * 2026-03-17: API Prorrateo beca SEP – calca de callback_3.php case 'a7f3b91de2c4e658f9a1230bdc874e56' (prorrateo_beca_sep).
 * POST body: { alumno_id: number } (equiv. data[1]=internal_id_beca).
 * Devuelve resumen en texto y marcadores OTORGAR_ANIO_COMPLETO_* para "Otorgar año completo".
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  queryRows,
  queryRow,
  queryValue,
  queryNr,
  getCicloEscolarActual,
} from '@/lib/db';
import { MESES_10, MESES_11, MES_CONCEPTO_DIA10 } from '@/lib/constants';
import { calcDifCol, type ExcedenteParams } from '@/lib/excedente';

const CONCEPTOS_PRIMER_ANIO = ['01', '02', '03', '04'];

function getMesesAtraso(
  fechaPago: string,
  mesConcepto: string,
  ceActual: number
): number {
  const f = String(fechaPago).trim().slice(0, 10);
  const yp = parseInt(f.slice(0, 4), 10);
  const mp = parseInt(f.slice(5, 7), 10);
  const yearLim = CONCEPTOS_PRIMER_ANIO.includes(mesConcepto)
    ? 2000 + ceActual
    : 2000 + ceActual + 1;
  const mesDia10 = MES_CONCEPTO_DIA10[mesConcepto];
  if (!mesDia10) return 0;
  const fechaLim = `${yearLim}-${mesDia10}-10`;
  if (f <= fechaLim) return 0;
  const yl = parseInt(fechaLim.slice(0, 4), 10);
  const ml = parseInt(fechaLim.slice(5, 7), 10);
  let atraso = (yp - yl) * 12 + (mp - ml);
  if (atraso <= 0) atraso = 1;
  return atraso;
}

export async function POST(request: NextRequest) {
  let alumnoId = 0;
  try {
    const body = await request.json();
    alumnoId = Number(body?.alumno_id) || 0;
  } catch {
    return NextResponse.json(
      { ok: false, code: 200, message: 'Se requiere alumno_id en el body.' },
      { status: 200 }
    );
  }
  if (!alumnoId) {
    return NextResponse.json(
      { ok: false, code: 200, message: 'Error: alumno_id inválido.' },
      { status: 200 }
    );
  }

  const ceActual = getCicloEscolarActual();
  const ceStr = String(ceActual).padStart(2, '0');

  const alumnoRow = await queryRow(
    `SELECT alumno_ref, alumno_nivel, mes FROM alumno WHERE alumno_id=${alumnoId} LIMIT 1`
  );
  if (!alumnoRow || !alumnoRow[0]) {
    return NextResponse.json(
      { ok: false, code: 200, message: 'Error: Alumno no encontrado.' },
      { status: 200 }
    );
  }
  const alumnoRef = String(alumnoRow[0]);
  const alumnoNivel = Number(alumnoRow[1]);
  const alumnoMes = Number(alumnoRow[2]);
  if (alumnoMes === 0) {
    return NextResponse.json(
      {
        ok: false,
        code: 200,
        message:
          'El alumno no tiene plan de pagos seleccionado (10 u 11 meses). No se puede aplicar el prorrateo.',
      },
      { status: 200 }
    );
  }

  const alumnoRefEsc = String(alumnoRef).replace(/'/g, "''");
  const sepRow = await queryRow(
    `SELECT id, monto_prorrateado, COALESCE(porcentaje,0) FROM alumno_beca_sep WHERE alumno_ref='${alumnoRefEsc}' AND ciclo_escolar=${ceActual} AND estatus=1 LIMIT 1`
  );
  if (!sepRow) {
    return NextResponse.json(
      {
        ok: false,
        code: 200,
        message:
          'El alumno no tiene beca SEP activa en el ciclo actual. Use el módulo Becas SEP para dar de alta el registro (Guardar SEP) antes de aplicar el prorrateo.',
      },
      { status: 200 }
    );
  }
  const becaPct = Number(sepRow[2]);
  if (becaPct >= 100) {
    return NextResponse.json(
      { ok: true, code: 200, message: 'Beca SEP al 100%: no se requiere cálculo de prorrateo.' },
      { status: 200 }
    );
  }

  const preciosRow = await queryRow(
    `SELECT precio_inscripcion, precio_colegiatura, precio_colegiatura2 FROM pago_boucher_precio WHERE alumno_nivel=${alumnoNivel} AND precio_ciclo_escolar=${ceActual} LIMIT 1`
  );
  if (!preciosRow) {
    return NextResponse.json(
      {
        ok: false,
        code: 200,
        message: `No se encontraron precios para el nivel ${alumnoNivel} en el ciclo actual.`,
      },
      { status: 200 }
    );
  }
  const precioInsFull = Number(preciosRow[0]);
  const precioColFull =
    alumnoMes === 1 ? Number(preciosRow[1]) : Number(preciosRow[2]);
  const becaIntRow = await queryRow(
    `SELECT COALESCE(beca_porcentaje,0) FROM alumno_beca WHERE alumno_id=${alumnoId} AND beca_estatus=1 AND beca_ciclo_escolar=${ceActual} LIMIT 1`
  );
  const becaPctInt = becaIntRow ? Number(becaIntRow[0]) : 0;
  const precioColRef =
    Math.round((precioColFull * (100 - becaPctInt)) / 100 * 100) / 100;
  const precioInsRef =
    Math.round((precioInsFull * (100 - becaPctInt)) / 100 * 100) / 100;

  const mesesPlan =
    alumnoMes === 1 ? MESES_10 : MESES_11;
  const nColPlan = mesesPlan.length;

  const octPagado = await queryNr(
    `SELECT * FROM pago_detalle WHERE alumno_id=${alumnoId} AND SUBSTR(pago_referencia,6,2)='02' AND SUBSTR(pago_referencia,8,2)='${ceStr}' AND pago_cancelado!=1 AND pago_cancelado!=2`
  );
  if (octPagado === 0) {
    return NextResponse.json(
      {
        ok: false,
        code: 200,
        message: `El alumno no tiene pagada la colegiatura de Octubre (${ceStr}). El prorrateo de beca SEP requiere que estén pagadas las colegiaturas hasta Octubre.`,
      },
      { status: 200 }
    );
  }

  const insPagada =
    Number(
      await queryValue(
        `SELECT COALESCE(SUM(pago_importe),0) FROM pago_detalle WHERE alumno_id=${alumnoId} AND SUBSTR(pago_referencia,6,2) IN ('11','12','13') AND SUBSTR(pago_referencia,8,2)='${ceStr}' AND pago_cancelado!=1 AND pago_cancelado!=2`
      )
    ) || 0;

  const colPagadas: string[] = [];
  const colRestantes: string[] = [];
  const pagosAmounts: Record<string, number> = {};
  const pagosRawP: Record<string, number> = {};
  // 2026-03-19: Optimización de rendimiento: recuperar pagos por mes en una sola consulta.
  const pagosPorMesRaw = await queryRows(
    `SELECT SUBSTR(pago_referencia,6,2) AS mes_c, COALESCE(SUM(pago_importe),0) AS total
     FROM pago_detalle
     WHERE alumno_id=${alumnoId}
       AND SUBSTR(pago_referencia,8,2)='${ceStr}'
       AND pago_cancelado!=1 AND pago_cancelado!=2
     GROUP BY SUBSTR(pago_referencia,6,2)`
  );
  const pagosPorMesMap: Record<string, number> = {};
  for (const row of pagosPorMesRaw) {
    pagosPorMesMap[String(row[0])] = Number(row[1]) || 0;
  }
  for (const m of mesesPlan) {
    const pagoRaw = pagosPorMesMap[m] ?? 0;
    const pagoM = pagoRaw > 0 ? Math.min(pagoRaw, precioColFull) : 0;
    pagosAmounts[m] = pagoM;
    pagosRawP[m] = pagoRaw;
    if (pagoM > 0) colPagadas.push(m);
    else colRestantes.push(m);
  }
  const nColPagadas = colPagadas.length;
  const nColRestantes = colRestantes.length;

  const fechaPRaw = await queryRows(
    `SELECT SUBSTR(pago_referencia,6,2) AS mes_c, MAX(pago_fecha) AS f FROM pago_detalle WHERE alumno_id=${alumnoId} AND SUBSTR(pago_referencia,8,2)='${ceStr}' AND pago_cancelado!=1 AND pago_cancelado!=2 GROUP BY SUBSTR(pago_referencia,6,2)`
  );
  const pagosFechaP: Record<string, string> = {};
  for (const fr of fechaPRaw) {
    if (fr[1]) pagosFechaP[String(fr[0])] = String(fr[1]);
  }

  const factorBeca = (100 - becaPct) / 100;
  const precioInsBeca = Math.round(precioInsFull * factorBeca * 100) / 100;
  const precioColBeca = Math.round(precioColFull * factorBeca * 100) / 100;

  const corrRawP = await queryRows(
    `SELECT LPAD(pago_concepto,2,'0') FROM pago_prorroga WHERE alumno_id=${alumnoId} AND prorroga_ciclo_escolar=${ceActual} AND correccion=1`
  );
  const mesesConCorreccionP = corrRawP.map((r) => String(r[0]));

  const pagosColForExcedente: Record<string, number> = {};
  for (const m of mesesPlan) {
    pagosColForExcedente[m] = pagosAmounts[m] ?? 0;
  }
  const excedenteParams: ExcedenteParams = {
    ce_actual: ceActual,
    corte_meses: colPagadas,
    pagos_map: pagosRawP,
    pagos_fecha: pagosFechaP,
    pagos_col: pagosAmounts,
    col_full: precioColFull,
    col_beca: precioColRef,
    col_beca_sep: precioColBeca,
    beca_pct: becaPctInt,
    meses_con_correccion: mesesConCorreccionP,
  };
  const difCol = calcDifCol(excedenteParams);
  const difIns = Math.max(0, Math.round((insPagada - precioInsBeca) * 100) / 100);
  const excedente = Math.round((difCol + difIns) * 100) / 100;

  const lineas: string[] = [];
  lineas.push('=== PRORRATEO BECA SEP ===');
  lineas.push(`Ciclo: ${ceActual} | Beca: ${becaPct}% | Plan: ${nColPlan} meses`);
  lineas.push('Precio colegiatura completa: $' + precioColFull.toFixed(2));
  lineas.push('Precio colegiatura con beca: $' + precioColBeca.toFixed(2));
  lineas.push('Inscripción pagada (real): $' + insPagada.toFixed(2));
  lineas.push('Inscripción con beca: $' + precioInsBeca.toFixed(2));
  lineas.push(`Colegiaturas con pago registrado: ${nColPagadas} / ${nColPlan}`);
  lineas.push('Diferencia colegiaturas: $' + difCol.toFixed(2));
  lineas.push('Diferencia inscripción: $' + difIns.toFixed(2));
  lineas.push(
    (excedente >= 0 ? 'Excedente total: ' : 'Déficit total: ') +
      '$' + Math.abs(excedente).toFixed(2)
  );
  lineas.push('Colegiaturas restantes por cubrir: ' + nColRestantes);

  const refsAnioCompleto: string[] = [];
  if (nColRestantes > 0) {
    if (excedente >= nColRestantes * precioColBeca) {
      for (const m of colRestantes) {
        refsAnioCompleto.push(alumnoRef + m + ceStr + '000');
      }
      const saldoFinal = Math.round((excedente - nColRestantes * precioColBeca) * 100) / 100;
      lineas.push(
        'Resultado: El excedente cubre todas las colegiaturas restantes con beca SEP (prorrateo sugerido = $0.00).'
      );
      lineas.push(
        'Puede usar el botón "Otorgar año completo" para registrar automáticamente las colegiaturas restantes cuando se habilite esta función.'
      );
      if (saldoFinal > 0.01) {
        lineas.push(
          'Saldo a favor restante estimado después de otorgar año completo: $' +
            saldoFinal.toFixed(2) +
            ' (gestionar devolución manualmente).'
        );
      }
    } else {
      if (excedente > 0) {
        const excedentePorCol = Math.round((excedente / nColRestantes) * 100) / 100;
        let precioRestanteCol = Math.round((precioColBeca - excedentePorCol) * 100) / 100;
        if (precioRestanteCol < 0) precioRestanteCol = 0;
        lineas.push(
          'Excedente parcial: $' +
            excedente.toFixed(2) +
            ' no cubre el total de colegiaturas restantes.'
        );
        lineas.push('Excedente por colegiatura: $' + excedentePorCol.toFixed(2));
        lineas.push(
          'Precio prorrateado por colegiatura restante: $' +
            precioRestanteCol.toFixed(2)
        );
        lineas.push(
          'No se registran pagos. Aplica este precio en cada colegiatura pendiente manualmente.'
        );
      } else {
        lineas.push(
          'Déficit: el alumno adeuda pagos. Precio de colegiatura con beca SEP: $' +
            precioColBeca.toFixed(2)
        );
        lineas.push('No se registran pagos automáticos.');
      }
    }
  } else {
    lineas.push('No hay colegiaturas restantes por pagar en el plan.');
    if (excedente > 0.01) {
      lineas.push(
        'Saldo a favor: $' + excedente.toFixed(2) + ' (gestionar devolución manualmente)'
      );
    }
  }

  if (refsAnioCompleto.length > 0) {
    lineas.push('OTORGAR_ANIO_COMPLETO_DISPONIBLE=SI');
    lineas.push('OTORGAR_ANIO_COMPLETO_REFS=' + refsAnioCompleto.join(','));
  }

  lineas.push('Procesado: ' + new Date().toISOString().slice(0, 19).replace('T', ' '));

  const alert = lineas.join('\n');
  return NextResponse.json({
    ok: true,
    code: 200,
    success: 1,
    message: alert,
    lineas,
    refs_anio_completo: refsAnioCompleto,
  });
}
