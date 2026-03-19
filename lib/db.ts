/**
 * 2025-03-17: Conexión MySQL compatible con Vercel (serverless).
 * 2026-03-19: Optimización de rendimiento con pool reutilizable para reducir latencia por handshake.
 * Si tu MySQL está en un hosting compartido, usa estas mismas credenciales que en phpMyAdmin.
 */

import mysql from 'mysql2/promise';

const config = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
};

// 2026-03-19: Pool global para reutilizar conexiones en peticiones consecutivas y mejorar tiempos de respuesta.
const pool = mysql.createPool({
  ...config,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export type Row = unknown[];

/** Ejecuta una query y devuelve filas como arrays en orden de columnas (compatible con getResultSetJSON del PHP). */
export async function queryRows(
  sql: string,
  params: (string | number)[] = []
): Promise<Row[]> {
  const [rows, fields] = await pool.execute(sql, params);
  const ra = rows as Record<string, unknown>[];
  const fa = (fields as { name: string }[]) || [];
  if (fa.length === 0) return ra.map((r) => Object.values(r));
  return ra.map((r) => fa.map((f) => r[f.name]));
}

/** Una sola fila (compatible con getDataRow). */
export async function queryRow(
  sql: string,
  params: (string | number)[] = []
): Promise<Row | null> {
  const rows = await queryRows(sql, params);
  return rows.length ? rows[0] : null;
}

/** Un solo valor (compatible con getField). */
export async function queryValue(
  sql: string,
  params: (string | number)[] = []
): Promise<string | number | null> {
  const row = await queryRow(sql, params);
  if (!row || row.length === 0) return null;
  const v = row[0];
  return v as string | number | null;
}

/** Número de filas que devuelve la query (compatible con getNR del PHP). */
export async function queryNr(sql: string, params: (string | number)[] = []): Promise<number> {
  const rows = await queryRows(sql, params);
  return rows.length;
}

/** Ejecutar INSERT/UPDATE/DELETE. */
export async function queryExecute(
  sql: string,
  params: (string | number)[] = []
): Promise<{ affectedRows: number }> {
  const [result] = await pool.execute(sql, params);
  const r = result as { affectedRows?: number };
  return { affectedRows: r?.affectedRows ?? 0 };
}

/** Obtener ciclo escolar actual (regla 07-10 como en PHP). */
export function getCicloEscolarActual(): number {
  const env = process.env.CICLO_ESCOLAR_ACTUAL;
  if (env !== undefined && env !== '') return parseInt(env, 10);
  const now = new Date();
  const y = now.getFullYear() % 100;
  const cmd = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const ciclo = y - 3;
  return cmd < '07-10' ? ciclo - 1 : ciclo;
}
