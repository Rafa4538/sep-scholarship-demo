/**
 * 2025-03-17: Constantes usadas en reporte y prorrateo beca SEP (migrado desde callback_3.php).
 */

export const NOMBRES_MES: Record<string, string> = {
  '01': 'Septiembre', '02': 'Octubre', '03': 'Noviembre',
  '04': 'Diciembre', '05': 'Enero', '06': 'Febrero', '07': 'Marzo',
  '08': 'Abril', '09': 'Mayo', '10': 'Junio', '26': 'Julio',
};

export const NOMBRES_NIVEL: Record<number, string> = {
  1: 'Maternal', 2: 'Kinder', 3: 'Primaria', 4: 'Secundaria',
};

export const MESES_10 = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'];
export const MESES_11 = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '26'];

/** Fecha límite día 10 por concepto y ciclo (2026-03-11). */
export const MES_CONCEPTO_DIA10: Record<string, string> = {
  '01': '09', '02': '10', '03': '11', '04': '12',
  '05': '01', '06': '02', '07': '03', '08': '04', '09': '05', '10': '06', '26': '07',
};

export const RECARGO_POR_MES = 75;
export const TOLERANCIA_MONTO = 5;
