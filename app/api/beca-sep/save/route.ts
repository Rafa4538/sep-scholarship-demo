/**
 * 2026-03-17: API Guardar beca SEP – calca de callback_3.php case '4df8af22f0a04ec1a67f61f8d905c745' (beca_sep_save).
 * POST: alumno_ref, ciclo_escolar, monto_prorrateado, fecha_inicio, estatus, porcentaje.
 * Valida que exista alumno (como PHP); INSERT con created_at o UPDATE en alumno_beca_sep.
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryRow, queryExecute, queryNr, getCicloEscolarActual } from '@/lib/db';

export async function POST(request: NextRequest) {
  let alumnoRef = '';
  let cicloEscolar = 0;
  let montoProrrateado = 0;
  let fechaInicio = '';
  let estatus = 1;
  let porcentaje = 0;
  try {
    const body = await request.json();
    alumnoRef = String(body?.alumno_ref ?? '').trim();
    cicloEscolar = Number(body?.ciclo_escolar) || getCicloEscolarActual();
    montoProrrateado = Number(body?.monto_prorrateado) || 0;
    fechaInicio = String(body?.fecha_inicio ?? '').trim();
    estatus = Number(body?.estatus) ?? 1;
    porcentaje = Number(body?.porcentaje) ?? 0;
  } catch {
    return NextResponse.json(
      { ok: false, message: 'Datos inválidos en el body.' },
      { status: 200 }
    );
  }
  if (!alumnoRef) {
    return NextResponse.json(
      { ok: false, message: 'Error: alumno_ref (no. de control) es requerido.' },
      { status: 200 }
    );
  }

  const alumnoRefEsc = alumnoRef.replace(/'/g, "''");
  // Calca callback_3: validar que exista alumno (getNR SELECT * FROM alumno WHERE alumno_ref=...)
  const alumnoExiste = await queryNr(
    `SELECT 1 FROM alumno WHERE alumno_ref='${alumnoRefEsc}' LIMIT 1`
  );
  if (alumnoExiste === 0) {
    return NextResponse.json(
      { ok: false, message: `No existe alumno con referencia ${alumnoRef}.` },
      { status: 200 }
    );
  }

  const existe = await queryRow(
    `SELECT id FROM alumno_beca_sep WHERE alumno_ref='${alumnoRefEsc}' AND ciclo_escolar=${cicloEscolar} LIMIT 1`
  );

  const monto = Math.round(montoProrrateado * 100) / 100;
  // Calca callback_3: fecha vacía → date('Y-m-d')
  const fechaValida =
    fechaInicio && /^\d{4}-\d{2}-\d{2}$/.test(fechaInicio)
      ? fechaInicio
      : new Date().toISOString().slice(0, 10);

  if (existe && existe[0]) {
    const id = Number(existe[0]);
    const setParts = [
      `monto_prorrateado=${monto}`,
      `estatus=${estatus}`,
      `porcentaje=${porcentaje}`,
    ];
    if (fechaValida) setParts.push(`fecha_inicio='${fechaValida.replace(/'/g, "''")}'`);
    const sql = `UPDATE alumno_beca_sep SET ${setParts.join(', ')} WHERE id=${id}`;
    await queryExecute(sql);
    return NextResponse.json({
      ok: true,
      message: 'Beca SEP actualizada correctamente para el alumno ' + alumnoRef + ' en el ciclo ' + cicloEscolar + '.',
    }, { status: 200 });
  }

  // Calca callback_3: INSERT incluye created_at (now())
  const sql = `INSERT INTO alumno_beca_sep (alumno_ref, ciclo_escolar, monto_prorrateado, fecha_inicio, estatus, porcentaje, created_at) VALUES ('${alumnoRefEsc}', ${cicloEscolar}, ${monto}, '${fechaValida.replace(/'/g, "''")}', ${estatus}, ${porcentaje}, NOW())`;
  await queryExecute(sql);
  return NextResponse.json({
    ok: true,
    message: 'Beca SEP registrada correctamente para el alumno ' + alumnoRef + ' en el ciclo ' + cicloEscolar + '.',
  }, { status: 200 });
}
