/**
 * 2025-03-17: Cálculo de diferencia a favor (excedente) en colegiaturas para beca SEP.
 * Migrado desde callback_3.php - reglas día 10, recargos $75, correcciones, beca interna vs SEP.
 */

import {
  MES_CONCEPTO_DIA10,
  NOMBRES_MES,
  RECARGO_POR_MES,
  TOLERANCIA_MONTO,
} from './constants';

const CONCEPTOS_PRIMER_ANIO = ['01', '02', '03', '04'];

export interface ExcedenteParams {
  ce_actual: number;
  corte_meses: string[];
  pagos_map: Record<string, number>;
  pagos_fecha: Record<string, string>;
  pagos_col: Record<string, number>;
  col_full: number;
  col_beca: number;
  col_beca_sep: number;
  beca_pct: number;
  meses_con_correccion: string[];
}

function getMesesAtraso(
  fechaPago: string,
  mesConcepto: string,
  ce_actual: number
): number {
  const f = String(fechaPago).trim().slice(0, 10);
  // 2026-03-17: Solo interpretar fechas YYYY-MM-DD; evitar NaN con formatos tipo "Wed Mar 11"
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) return 0;
  const yp = parseInt(f.slice(0, 4), 10);
  const mp = parseInt(f.slice(5, 7), 10);
  if (!Number.isFinite(yp) || !Number.isFinite(mp)) return 0;
  const yearLim = CONCEPTOS_PRIMER_ANIO.includes(mesConcepto)
    ? 2000 + ce_actual
    : 2000 + ce_actual + 1;
  const mesDia10 = MES_CONCEPTO_DIA10[mesConcepto];
  if (!mesDia10) return 0;
  const fechaLim = `${yearLim}-${mesDia10}-10`;
  if (f <= fechaLim) return 0;
  const yl = parseInt(fechaLim.slice(0, 4), 10);
  const ml = parseInt(fechaLim.slice(5, 7), 10);
  let atraso = (yp - yl) * 12 + (mp - ml);
  if (atraso <= 0) atraso = 1;
  return Number.isFinite(atraso) ? atraso : 0;
}

function isDespuesDia10(
  fechaPago: string,
  mesConcepto: string,
  ce_actual: number
): boolean {
  const f = String(fechaPago).trim().slice(0, 10);
  const yearLim = CONCEPTOS_PRIMER_ANIO.includes(mesConcepto)
    ? 2000 + ce_actual
    : 2000 + ce_actual + 1;
  const mesDia10 = MES_CONCEPTO_DIA10[mesConcepto];
  if (!mesDia10) return false;
  const fechaLim = `${yearLim}-${mesDia10}-10`;
  return f > fechaLim;
}

/** Calcula excedente de referencia para corrección sin beca (primer mes con pago > col_beca_sep que no sea recargo). */
export function calcExcedenteRef(params: ExcedenteParams): number | null {
  const {
    ce_actual,
    corte_meses,
    pagos_map,
    pagos_fecha,
    pagos_col,
    col_full,
    col_beca,
    col_beca_sep,
    beca_pct,
  } = params;
  if (beca_pct > 0) return null;
  for (const m of corte_meses) {
    const pagoRef = pagos_col[m] ?? 0;
    if (pagoRef <= 0 || pagoRef <= col_beca_sep) continue;
    const rawRef = pagos_map[m] ?? 0;
    const mesesAtrasoRef = pagos_fecha[m]
      ? getMesesAtraso(pagos_fecha[m], m, ce_actual)
      : 0;
    const recargoRef = RECARGO_POR_MES * mesesAtrasoRef;
    const esRecRef =
      Math.abs(rawRef - (col_full + recargoRef)) <= 2 ||
      (recargoRef > 0 &&
        col_beca > 0 &&
        Math.abs(rawRef - (col_beca + recargoRef)) <= 2);
    if (!esRecRef) {
      const val = Math.max(0, Math.round((pagoRef - col_beca_sep - recargoRef) * 100) / 100);
      if (val > 0) return val;
    }
  }
  return null;
}

/**
 * Calcula la diferencia a favor (excedente) en colegiaturas para un alumno.
 * 2025-03-17: Migrado desde callback_3.php (reporte y prorrateo beca SEP).
 */
export function calcDifCol(params: ExcedenteParams): number {
  const {
    ce_actual,
    corte_meses,
    pagos_map,
    pagos_fecha,
    pagos_col,
    col_full,
    col_beca,
    col_beca_sep,
    beca_pct,
    meses_con_correccion,
  } = params;
  let difCol = 0;
  const tol = TOLERANCIA_MONTO;

  for (const m of corte_meses) {
    const pagoRaw = pagos_map[m] ?? 0;
    const pagoM = pagos_col[m] ?? 0;
    if (pagoM <= 0) continue;
    const enCorreccion = meses_con_correccion.includes(m);
    let mesesAtraso = pagos_fecha[m]
      ? getMesesAtraso(pagos_fecha[m], m, ce_actual)
      : 0;
    const recargoMonto = RECARGO_POR_MES * mesesAtraso;
    let esRecargoBeca = Math.abs(pagoRaw - (col_beca + recargoMonto)) <= 2;
    let esRecargoFull = Math.abs(pagoRaw - (col_full + recargoMonto)) <= 2;
    if (!esRecargoBeca && pagoRaw > col_beca && col_beca > 0) {
      for (let n = 1; n <= 6; n++) {
        if (Math.abs(pagoRaw - (col_beca + RECARGO_POR_MES * n)) <= 2) {
          esRecargoBeca = true;
          mesesAtraso = n;
          break;
        }
      }
    }
    if (!esRecargoFull && pagoRaw > col_full && col_full > 0) {
      for (let n = 1; n <= 6; n++) {
        if (Math.abs(pagoRaw - (col_full + RECARGO_POR_MES * n)) <= 2) {
          esRecargoFull = true;
          break;
        }
      }
    }
    let pagoEsPctEstandar = false;
    if (col_full > 0) {
      for (let ke = 0; ke <= 50; ke += 5) {
        const pctVal = Math.round((col_full * (100 - ke)) / 100 * 100) / 100;
        if (Math.abs(pagoM - pctVal) <= tol) {
          pagoEsPctEstandar = true;
          break;
        }
      }
    }
    if (!pagoEsPctEstandar && pagoM > col_beca_sep) {
      for (let nInf = 1; nInf <= 6; nInf++) {
        const baseCand = pagoM - RECARGO_POR_MES * nInf;
        let ok = false;
        if (beca_pct > 0) {
          ok =
            Math.abs(baseCand - col_beca) <= tol ||
            Math.abs(baseCand - col_full) <= tol;
          if (!ok && col_full > 0) {
            for (let k = 0; k <= 50; k += 5) {
              const pctV = Math.round((col_full * (100 - k)) / 100 * 100) / 100;
              if (
                Math.abs(baseCand - pctV) <= tol &&
                Math.abs(pctV - col_beca_sep) > tol
              ) {
                ok = true;
                break;
              }
            }
          }
        } else {
          ok =
            Math.abs(baseCand - col_beca_sep) <= tol ||
            Math.abs(baseCand - col_beca) <= tol ||
            Math.abs(baseCand - col_full) <= tol;
          if (!ok && col_full > 0) {
            for (let k = 0; k <= 50; k += 5) {
              if (
                Math.abs(baseCand - Math.round((col_full * (100 - k)) / 100 * 100) / 100) <=
                tol
              ) {
                ok = true;
                break;
              }
            }
          }
        }
        if (ok && baseCand >= col_beca_sep - tol) {
          mesesAtraso = nInf;
          esRecargoBeca =
            Math.abs(pagoRaw - (col_beca + RECARGO_POR_MES * nInf)) <= 2 ||
            Math.abs(baseCand - col_beca) <= tol;
          break;
        }
      }
    }
    const recargoMontoFinal = RECARGO_POR_MES * (pagoEsPctEstandar ? 0 : mesesAtraso);

    if (enCorreccion) {
      if (beca_pct > 0) {
        if (Math.abs(pagoM - col_full) <= 5) {
          difCol += Math.max(0, col_full - col_beca_sep);
        } else if (Math.abs(pagoM - col_beca) <= 5) {
          difCol += Math.max(0, col_beca - col_beca_sep);
        } else if (pagoM > col_beca) {
          difCol += Math.max(0, col_full - col_beca_sep);
        } else {
          difCol += Math.max(0, col_beca - col_beca_sep);
        }
      } else {
        if (Math.abs(pagoM - col_full) <= 5) {
          difCol += Math.max(0, col_full - col_beca_sep);
        } else {
          // 2026-03-17: Corrección sin beca = se contempla como pago completo para no afectar prorrateo (no usar excedenteRef).
          difCol += Math.max(0, col_full - col_beca_sep);
        }
      }
      continue;
    }

    const despuesDia10 = pagos_fecha[m]
      ? isDespuesDia10(pagos_fecha[m], m, ce_actual)
      : false;

    if (despuesDia10 && beca_pct > 0) {
      if (esRecargoBeca) {
        difCol += Math.max(0, col_beca - col_beca_sep);
      } else if (Math.abs(pagoM - col_beca) <= 5) {
        difCol += Math.max(0, col_beca - col_beca_sep);
      } else {
        difCol += Math.max(0, pagoM - col_beca_sep - recargoMontoFinal);
      }
      continue;
    }
    if (despuesDia10 && beca_pct === 0) {
      if (esRecargoFull) {
        difCol += Math.max(0, col_full - col_beca_sep);
      } else if (Math.abs(pagoM - col_beca_sep) <= 5) {
        // nada
      } else if (enCorreccion && Math.abs(pagoM - col_full) <= 5) {
        difCol += Math.max(0, col_full - col_beca_sep);
      } else if (!enCorreccion && Math.abs(pagoM - col_full) <= 5) {
        difCol += Math.max(0, col_full - col_beca_sep);
      } else {
        difCol += Math.max(0, pagoM - col_beca_sep - recargoMontoFinal);
      }
      continue;
    }
    if (pagoRaw > col_full) {
      if (esRecargoFull || esRecargoBeca) {
        difCol += Math.max(0, col_full - col_beca_sep);
      } else if (beca_pct === 0) {
        difCol += Math.max(0, col_full - col_beca_sep);
      }
      continue;
    }
    if (enCorreccion) {
      if (beca_pct > 0) {
        if (Math.abs(pagoM - col_full) <= 5) {
          difCol += Math.max(0, col_full - col_beca_sep);
        } else if (Math.abs(pagoM - col_beca) <= 5) {
          difCol += Math.max(0, col_beca - col_beca_sep);
        } else if (pagoM > col_beca) {
          if (esRecargoBeca) {
            difCol += Math.max(0, col_beca - col_beca_sep);
          } else {
            difCol += Math.max(0, col_full - col_beca_sep);
          }
        } else {
          difCol += Math.max(0, col_beca - col_beca_sep);
        }
      } else {
        if (Math.abs(pagoM - col_full) <= 5) {
          difCol += 0;
        } else {
          // 2026-03-17: Corrección sin beca = como pago completo para no afectar prorrateo.
          difCol += Math.max(0, col_full - col_beca_sep);
        }
      }
    } else {
      if (beca_pct > 0 && Math.abs(pagoM - col_beca) <= 5) {
        difCol += Math.max(0, col_beca - col_beca_sep);
      } else if (beca_pct > 0 && pagoM > col_beca) {
        if (esRecargoBeca) {
          difCol += Math.max(0, col_beca - col_beca_sep);
        } else {
          difCol += Math.max(0, pagoM - col_beca_sep - recargoMontoFinal);
        }
      } else {
        difCol += Math.max(0, pagoM - col_beca_sep - recargoMontoFinal);
      }
    }
  }
  const result = Math.round(difCol * 100) / 100;
  // 2026-03-17: Evitar NaN en previsualización/reporte (valores no numéricos o edge cases)
  return Number.isFinite(result) ? result : 0;
}

/** 2026-03-17: Elemento del desglose por mes para previsualización (calca callback_3.php). */
export interface DesgloseMes {
  mes: string;
  pagoReal: number;
  contribucion: number;
  tipoDesc: string;
}

/**
 * Calcula diferencia a favor en colegiaturas y desglose por mes para depuración.
 * 2026-03-17: Misma lógica que calcDifCol; devuelve total + líneas por mes (como callback_3.php).
 */
export function calcDifColDesglose(
  params: ExcedenteParams
): { total: number; desglose: DesgloseMes[] } {
  const {
    ce_actual,
    corte_meses,
    pagos_map,
    pagos_fecha,
    pagos_col,
    col_full,
    col_beca,
    col_beca_sep,
    beca_pct,
    meses_con_correccion,
  } = params;
  let difCol = 0;
  const tol = TOLERANCIA_MONTO;
  const desglose: DesgloseMes[] = [];
  const nombreMes = (m: string) => NOMBRES_MES[m] ?? m;

  for (const m of corte_meses) {
    const pagoRaw = pagos_map[m] ?? 0;
    const pagoM = pagos_col[m] ?? 0;
    if (pagoM <= 0) continue;
    const enCorreccion = meses_con_correccion.includes(m);
    let mesesAtraso = pagos_fecha[m]
      ? getMesesAtraso(pagos_fecha[m], m, ce_actual)
      : 0;
    // 2026-03-17: Evitar NaN en recargo/contribución cuando la fecha de pago es inválida
    if (!Number.isFinite(mesesAtraso)) mesesAtraso = 0;
    const recargoMonto = RECARGO_POR_MES * mesesAtraso;
    let esRecargoBeca = Math.abs(pagoRaw - (col_beca + recargoMonto)) <= 2;
    let esRecargoFull = Math.abs(pagoRaw - (col_full + recargoMonto)) <= 2;
    if (!esRecargoBeca && pagoRaw > col_beca && col_beca > 0) {
      for (let n = 1; n <= 6; n++) {
        if (Math.abs(pagoRaw - (col_beca + RECARGO_POR_MES * n)) <= 2) {
          esRecargoBeca = true;
          mesesAtraso = n;
          break;
        }
      }
    }
    if (!esRecargoFull && pagoRaw > col_full && col_full > 0) {
      for (let n = 1; n <= 6; n++) {
        if (Math.abs(pagoRaw - (col_full + RECARGO_POR_MES * n)) <= 2) {
          esRecargoFull = true;
          break;
        }
      }
    }
    let pagoEsPctEstandar = false;
    if (col_full > 0) {
      for (let ke = 0; ke <= 50; ke += 5) {
        const pctVal = Math.round((col_full * (100 - ke)) / 100 * 100) / 100;
        if (Math.abs(pagoM - pctVal) <= tol) {
          pagoEsPctEstandar = true;
          break;
        }
      }
    }
    if (!pagoEsPctEstandar && pagoM > col_beca_sep) {
      for (let nInf = 1; nInf <= 6; nInf++) {
        const baseCand = pagoM - RECARGO_POR_MES * nInf;
        let ok = false;
        if (beca_pct > 0) {
          ok =
            Math.abs(baseCand - col_beca) <= tol ||
            Math.abs(baseCand - col_full) <= tol;
          if (!ok && col_full > 0) {
            for (let k = 0; k <= 50; k += 5) {
              const pctV = Math.round((col_full * (100 - k)) / 100 * 100) / 100;
              if (
                Math.abs(baseCand - pctV) <= tol &&
                Math.abs(pctV - col_beca_sep) > tol
              ) {
                ok = true;
                break;
              }
            }
          }
        } else {
          ok =
            Math.abs(baseCand - col_beca_sep) <= tol ||
            Math.abs(baseCand - col_beca) <= tol ||
            Math.abs(baseCand - col_full) <= tol;
          if (!ok && col_full > 0) {
            for (let k = 0; k <= 50; k += 5) {
              if (
                Math.abs(baseCand - Math.round((col_full * (100 - k)) / 100 * 100) / 100) <=
                tol
              ) {
                ok = true;
                break;
              }
            }
          }
        }
        if (ok && baseCand >= col_beca_sep - tol) {
          mesesAtraso = nInf;
          esRecargoBeca =
            Math.abs(pagoRaw - (col_beca + RECARGO_POR_MES * nInf)) <= 2 ||
            Math.abs(baseCand - col_beca) <= tol;
          break;
        }
      }
    }
    const recargoMontoFinal = RECARGO_POR_MES * (pagoEsPctEstandar ? 0 : mesesAtraso);

    let contrib = 0;
    let tipoDesc = '';

    if (enCorreccion) {
      if (beca_pct > 0) {
        if (Math.abs(pagoM - col_full) <= 5) {
          contrib = Math.max(0, col_full - col_beca_sep);
          tipoDesc = 'Corrección sin beca (como completa)';
        } else if (Math.abs(pagoM - col_beca) <= 5) {
          contrib = Math.max(0, col_beca - col_beca_sep);
          tipoDesc = 'Corrección con beca interna';
        } else if (pagoM > col_beca) {
          contrib = Math.max(0, col_full - col_beca_sep);
          tipoDesc = 'Corrección sin beca (como completa)';
        } else {
          contrib = Math.max(0, col_beca - col_beca_sep);
          tipoDesc = 'Corrección con beca interna';
        }
      } else {
        if (Math.abs(pagoM - col_full) <= 5) {
          contrib = Math.max(0, col_full - col_beca_sep);
          tipoDesc = 'Corrección sin beca (como completa)';
        } else {
          // 2026-03-17: Corrección sin beca = se contempla como pago completo para no afectar prorrateo.
          contrib = Math.max(0, col_full - col_beca_sep);
          tipoDesc = 'Corrección sin beca (como completa)';
        }
      }
      const contribSafe0 = Number.isFinite(contrib) ? contrib : 0;
      difCol += contribSafe0;
      desglose.push({
        mes: nombreMes(m),
        pagoReal: pagoRaw,
        contribucion: contribSafe0,
        tipoDesc,
      });
      continue;
    }

    const despuesDia10 = pagos_fecha[m]
      ? isDespuesDia10(pagos_fecha[m], m, ce_actual)
      : false;

    if (despuesDia10 && beca_pct > 0) {
      if (esRecargoBeca) {
        contrib = Math.max(0, col_beca - col_beca_sep);
        tipoDesc = 'Recargo (después día 10)';
      } else if (Math.abs(pagoM - col_beca) <= 5) {
        contrib = Math.max(0, col_beca - col_beca_sep);
        tipoDesc = 'Pago después del día 10 (pagó beca)';
      } else {
        contrib = Math.max(0, pagoM - col_beca_sep - recargoMontoFinal);
        tipoDesc = 'Pago después del día 10 (pagó completa)';
      }
      const contribSafe1 = Number.isFinite(contrib) ? contrib : 0;
      difCol += contribSafe1;
      desglose.push({
        mes: nombreMes(m),
        pagoReal: pagoRaw,
        contribucion: contribSafe1,
        tipoDesc,
      });
      continue;
    }
    if (despuesDia10 && beca_pct === 0) {
      if (esRecargoFull) {
        contrib = Math.max(0, col_full - col_beca_sep);
        tipoDesc = 'Recargo (después día 10)';
      } else if (Math.abs(pagoM - col_beca_sep) <= 5) {
        contrib = 0;
        tipoDesc = 'Pago con SEP (sin excedente)';
      } else if (enCorreccion && Math.abs(pagoM - col_full) <= 5) {
        contrib = Math.max(0, col_full - col_beca_sep);
        tipoDesc = 'Corrección sin beca (como completa)';
      } else if (!enCorreccion && Math.abs(pagoM - col_full) <= 5) {
        contrib = Math.max(0, col_full - col_beca_sep);
        tipoDesc = 'Pago después del día 10 (pagó completa)';
      } else {
        contrib = Math.max(0, pagoM - col_beca_sep - recargoMontoFinal);
        tipoDesc = 'Pago después del día 10 (pagó completa)';
      }
      const contribSafe2 = Number.isFinite(contrib) ? contrib : 0;
      difCol += contribSafe2;
      desglose.push({
        mes: nombreMes(m),
        pagoReal: pagoRaw,
        contribucion: contribSafe2,
        tipoDesc,
      });
      continue;
    }
    if (pagoRaw > col_full) {
      if (esRecargoFull || esRecargoBeca) {
        contrib = Math.max(0, col_full - col_beca_sep);
        tipoDesc = 'Recargo (pago completo + recargo)';
      } else if (beca_pct === 0) {
        contrib = Math.max(0, col_full - col_beca_sep);
        tipoDesc = 'Pago completo (sin beca interna)';
      } else {
        contrib = 0;
        tipoDesc = 'Pago completo';
      }
      const contribSafe3 = Number.isFinite(contrib) ? contrib : 0;
      difCol += contribSafe3;
      desglose.push({
        mes: nombreMes(m),
        pagoReal: pagoRaw,
        contribucion: contribSafe3,
        tipoDesc,
      });
      continue;
    }
    if (enCorreccion) {
      if (beca_pct > 0) {
        if (Math.abs(pagoM - col_full) <= 5) {
          contrib = Math.max(0, col_full - col_beca_sep);
          tipoDesc = 'Corrección sin beca (como completa)';
        } else if (Math.abs(pagoM - col_beca) <= 5) {
          contrib = Math.max(0, col_beca - col_beca_sep);
          tipoDesc = 'Corrección con beca interna';
        } else if (pagoM > col_beca) {
          if (esRecargoBeca) {
            contrib = Math.max(0, col_beca - col_beca_sep);
            tipoDesc = 'Recargo (corrección)';
          } else {
            contrib = Math.max(0, col_full - col_beca_sep);
            tipoDesc = 'Corrección sin beca (como completa)';
          }
        } else {
          contrib = Math.max(0, col_beca - col_beca_sep);
          tipoDesc = 'Corrección con beca interna';
        }
      } else {
        if (Math.abs(pagoM - col_full) <= 5) {
          contrib = 0;
          tipoDesc = 'Corrección (pago completo)';
        } else {
          // 2026-03-17: Corrección sin beca = como pago completo para no afectar prorrateo.
          contrib = Math.max(0, col_full - col_beca_sep);
          tipoDesc = 'Corrección sin beca (como completa)';
        }
      }
    } else {
      if (beca_pct > 0 && Math.abs(pagoM - col_beca) <= 5) {
        contrib = Math.max(0, col_beca - col_beca_sep);
        tipoDesc = 'Pago beca interna (a tiempo)';
      } else if (beca_pct > 0 && pagoM > col_beca) {
        if (esRecargoBeca) {
          contrib = Math.max(0, col_beca - col_beca_sep);
          tipoDesc = 'Recargo (beca interna)';
        } else {
          contrib = Math.max(0, pagoM - col_beca_sep - recargoMontoFinal);
          tipoDesc = 'Pago después del día 10 (pagó completa)';
        }
      } else {
        contrib = Math.max(0, pagoM - col_beca_sep - recargoMontoFinal);
        tipoDesc = 'Pago vs SEP (diferencia a favor)';
      }
    }
    const contribSafe4 = Number.isFinite(contrib) ? contrib : 0;
    difCol += contribSafe4;
    desglose.push({
      mes: nombreMes(m),
      pagoReal: pagoRaw,
      contribucion: contribSafe4,
      tipoDesc,
    });
  }
  const total = Number.isFinite(Math.round(difCol * 100) / 100)
    ? Math.round(difCol * 100) / 100
    : 0;
  return { total, desglose };
}
