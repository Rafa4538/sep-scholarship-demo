/**
 * 2026-03-17: API Reporte global beca SEP – calca de callback_3.php case 'f2a7e6d8b1c3490e5f1a8c2d7b3e9f14' (beca_sep_report).
 * GET o POST: mes_corte (01-26), nivel_filtro (0=todos, 1-4), plan_filtro (0=todos, 1=10m, 2=11m).
 * Devuelve CSV para descarga. data[1]=mes_corte, data[2]=nivel_filtro, data[3]=plan_filtro.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  queryRows,
  queryRow,
  getCicloEscolarActual,
} from '@/lib/db';
import {
  NOMBRES_MES,
  NOMBRES_NIVEL,
  MESES_10,
  MESES_11,
  MES_CONCEPTO_DIA10,
} from '@/lib/constants';
import { calcDifCol, type ExcedenteParams } from '@/lib/excedente';

function escapeCsv(val: string): string {
  const s = String(val);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function formatMoney(n: number): string {
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mesCorte = (searchParams.get('mes_corte') || '10').padStart(2, '0');
  const nivelFiltro = parseInt(searchParams.get('nivel_filtro') || '0', 10);
  const planFiltro = parseInt(searchParams.get('plan_filtro') || '0', 10);
  return runReport(mesCorte, nivelFiltro, planFiltro);
}

export async function POST(request: NextRequest) {
  let body: { mes_corte?: string; nivel_filtro?: number; plan_filtro?: number } = {};
  try {
    body = await request.json();
  } catch {
    // ignore
  }
  const mesCorte = String(body.mes_corte ?? '10').padStart(2, '0');
  const nivelFiltro = Number(body.nivel_filtro ?? 0) | 0;
  const planFiltro = Number(body.plan_filtro ?? 0) | 0;
  return runReport(mesCorte, nivelFiltro, planFiltro);
}

async function runReport(
  mesCorte: string,
  nivelFiltro: number,
  planFiltro: number
) {
  const ceActual = getCicloEscolarActual();
  const ceStr = String(ceActual).padStart(2, '0');
  const nivelSql = nivelFiltro > 0 ? `AND a.alumno_nivel=${nivelFiltro}` : '';
  const planSql = planFiltro > 0 ? `AND a.mes=${planFiltro}` : '';

  const students = await queryRows(`
    SELECT a.alumno_id, a.alumno_ref,
           CONCAT(a.alumno_app,' ',a.alumno_apm,' ',a.alumno_nombre) AS nombre,
           a.alumno_nivel, a.mes,
           COALESCE(ab.beca_porcentaje,0) AS beca_porcentaje,
           bs.monto_prorrateado,
           COALESCE(bs.porcentaje,0) AS sep_porcentaje
    FROM alumno a
    INNER JOIN alumno_beca_sep bs ON bs.alumno_ref=a.alumno_ref
      AND bs.ciclo_escolar=${ceActual} AND bs.estatus=1
    LEFT JOIN alumno_beca ab ON ab.alumno_id=a.alumno_id
      AND ab.beca_estatus=1 AND ab.beca_ciclo_escolar=${ceActual}
    WHERE a.alumno_status=1 AND a.mes>0 ${nivelSql} ${planSql}
    ORDER BY a.alumno_nivel ASC, a.mes ASC,
             a.alumno_app ASC, a.alumno_apm ASC, a.alumno_nombre ASC
  `);

  if (!students.length) {
    return NextResponse.json(
      {
        ok: false,
        code: 200,
        message: `No se encontraron alumnos con beca SEP activa y plan seleccionado para el ciclo ${ceActual}.`,
      },
      { status: 200 }
    );
  }

  const idx10 = MESES_10.indexOf(mesCorte);
  const corte10 = idx10 !== -1 ? MESES_10.slice(0, idx10 + 1) : MESES_10;
  const idx11 = MESES_11.indexOf(mesCorte);
  const corte11 = idx11 !== -1 ? MESES_11.slice(0, idx11 + 1) : MESES_11;
  const corte10Final = mesCorte === '26' ? MESES_10 : corte10;

  const preciosCache: Record<string, unknown[] | null> = {};
  const lines: string[] = [];
  const BOM = '\uFEFF';

  const pushCsv = (row: string[]) => {
    lines.push(row.map(escapeCsv).join(','));
  };

  let currentGrupo: string | null = null;
  let nivelNombreH = '';

  for (const s of students) {
    const aluId = Number(s[0]);
    const aluRef = String(s[1]);
    const aluNom = String(s[2]);
    const aluNivel = Number(s[3]);
    const aluMes = Number(s[4]);
    const becaPct = Number(s[5]);
    const montoSepDb = Number(s[6]);
    const sepPorcentaje = Number(s[7]);

    const mesesPlan = aluMes === 1 ? MESES_10 : MESES_11;
    const corteMeses = aluMes === 1 ? corte10Final : corte11;
    const planNombre = aluMes === 1 ? '10 meses' : '11 meses';
    const nPlan = mesesPlan.length;

    if (!corteMeses.length) continue;

    const cacheKey = `${aluNivel}_${aluMes}`;
    if (!(cacheKey in preciosCache)) {
      const pr = await queryRow(
        `SELECT precio_inscripcion, precio_colegiatura, precio_colegiatura2 FROM pago_boucher_precio WHERE alumno_nivel=${aluNivel} AND precio_ciclo_escolar=${ceActual} LIMIT 1`
      );
      preciosCache[cacheKey] = pr;
    }
    const pr = preciosCache[cacheKey];
    if (!pr) continue;

    const colFull = aluMes === 1 ? Number(pr[1]) : Number(pr[2]);
    const insFull = Number(pr[0]);
    const factorBeca = (100 - becaPct) / 100;
    const colBeca = Math.round(colFull * factorBeca * 100) / 100;
    const insBeca = Math.round(insFull * factorBeca * 100) / 100;
    const colBecaSep = Math.round((colFull * (100 - sepPorcentaje)) / 100 * 100) / 100;
    const insBecaSep = Math.round((insFull * (100 - sepPorcentaje)) / 100 * 100) / 100;

    const grupo = `${aluNivel}_${aluMes}`;
    if (grupo !== currentGrupo) {
      nivelNombreH = NOMBRES_NIVEL[aluNivel] ?? `Nivel ${aluNivel}`;
      const ceLabel = `${String(ceActual + 2000).slice(2)}-${String(ceActual + 2001).slice(2)}`;
      pushCsv([]);
      pushCsv([`Costos ${nivelNombreH} ${ceLabel} (${planNombre})`]);
      pushCsv(['Colegiatura', formatMoney(colFull), 'Inscripcion', formatMoney(insFull)]);
      pushCsv([]);
      // 2026-03-17: Cabeceras alineadas con reporte esperado (Numeros de control, Beca actual, Pago actual realizado en mes, etc.)
      const header = [
        'Numeros de control',
        'Beca actual',
        'Nivel educativo',
        'Porcentaje de Beca SEP',
        'Colegiatura con beneficio de beca sep',
        ...corteMeses.map((m) => 'Pago actual realizado en ' + (NOMBRES_MES[m] || m).toLowerCase()),
        'Diferencia a favor pagos de colegiatura para prorrateo',
        'Diferencia a favor de inscripcion para prorrateo',
        'Pago actual realizado de Inscripcion',
        'Inscripcion con beneficio de beca sep',
        'Monto SEP guardado',
        'Monto Final prorrateado para pago mensual',
      ];
      pushCsv(header);
      currentGrupo = grupo;
    }

    const pagosDetalle = await queryRows(`
      SELECT SUBSTR(pago_referencia,6,2) AS mes_code,
             COALESCE(SUM(pago_importe),0) AS total,
             MAX(pago_fecha) AS fecha_pago
      FROM pago_detalle
      WHERE alumno_id=${aluId}
        AND SUBSTR(pago_referencia,8,2)='${ceStr}'
        AND pago_cancelado!=1 AND pago_cancelado!=2
      GROUP BY SUBSTR(pago_referencia,6,2)
    `);
    const pagosMap: Record<string, number> = {};
    const pagosFecha: Record<string, string> = {};
    for (const pd of pagosDetalle) {
      const code = String(pd[0]);
      pagosMap[code] = Number(pd[1]);
      if (pd[2]) pagosFecha[code] = String(pd[2]);
    }

    let insPagada = 0;
    for (const ci of ['11', '12', '13']) {
      if (pagosMap[ci]) insPagada += pagosMap[ci];
    }

    const pagosCol: Record<string, number> = {};
    let paidCount = 0;
    for (const m of corteMeses) {
      const pagoRaw = pagosMap[m] ?? 0;
      const pagoM = pagoRaw > 0 ? Math.min(pagoRaw, colFull) : 0;
      pagosCol[m] = pagoM;
      if (pagoM > 0) paidCount++;
    }

    const corrRaw = await queryRows(
      `SELECT LPAD(pago_concepto,2,'0') FROM pago_prorroga WHERE alumno_id=${aluId} AND prorroga_ciclo_escolar=${ceActual} AND correccion=1`
    );
    const mesesConCorreccion = corrRaw.map((r) => String(r[0]));

    const excedenteParams: ExcedenteParams = {
      ce_actual: ceActual,
      corte_meses: corteMeses,
      pagos_map: pagosMap,
      pagos_fecha: pagosFecha,
      pagos_col: pagosCol,
      col_full: colFull,
      col_beca: colBeca,
      col_beca_sep: colBecaSep,
      beca_pct: becaPct,
      meses_con_correccion: mesesConCorreccion,
    };
    const difColRaw = calcDifCol(excedenteParams);
    const difInsRaw =
      insPagada > insBecaSep ? Math.round((insPagada - insBecaSep) * 100) / 100 : 0;
    const difCol = Number.isFinite(difColRaw) ? difColRaw : 0;
    const difIns = Number.isFinite(difInsRaw) ? difInsRaw : 0;
    const excTotal = difCol + difIns;
    const mesesRestantes = nPlan - paidCount;
    const montoFinal =
      mesesRestantes > 0
        ? Math.max(0, Math.round((colBecaSep - excTotal / mesesRestantes) * 100) / 100)
        : 0;

    const row = [
      aluRef,
      becaPct + '%',
      nivelNombreH,
      sepPorcentaje + '%',
      formatMoney(colBecaSep),
      ...corteMeses.map((m) => formatMoney(pagosCol[m] ?? 0)),
      formatMoney(difCol),
      formatMoney(difIns),
      formatMoney(insPagada),
      formatMoney(insBecaSep),
      formatMoney(montoSepDb),
      formatMoney(montoFinal),
    ];
    pushCsv(row);
  }

  const csv = BOM + lines.join('\r\n');
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="beca_sep_report_${ceActual}_mes${mesCorte}.csv"`,
    },
  });
}
