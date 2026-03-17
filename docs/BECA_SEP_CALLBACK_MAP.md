# Mapeo callback_3.php → Becas SEP (Next.js)

**2026-03-17** – Este módulo replica el comportamiento del apartado Becas SEP de `callback_3.php` y `module.js` / `index.html`.

## Casos PHP → Rutas API

| callback_3.php (case / opt) | Descripción | Ruta Next.js | Parámetros |
|-----------------------------|-------------|--------------|------------|
| `f2a7e6d8b1c3490e5f1a8c2d7b3e9f14` (beca_sep_report) | Reporte global CSV prorrateo SEP | `GET/POST /api/beca-sep/report` | `mes_corte`, `nivel_filtro`, `plan_filtro` (query o body) |
| `a7f3b91de2c4e658f9a1230bdc874e56` (prorrateo_beca_sep) | Prorrateo por alumno (internal_id_beca) | `POST /api/beca-sep/prorrateo` | body: `{ alumno_id }` |
| `6d56cf8d0b8a40b2a6f5b4b97b2f41ea` (beca_sep_preview) | Previsualización por alumno_ref | `POST /api/beca-sep/preview` | body: `alumno_ref`, `ciclo_escolar`, `mes_corte` |
| `4df8af22f0a04ec1a67f61f8d905c745` (beca_sep_save) | Guardar/actualizar en alumno_beca_sep | `POST /api/beca-sep/save` | body: `alumno_ref`, `ciclo_escolar`, `monto_prorrateado`, `fecha_inicio`, `estatus`, `porcentaje` |

## Variantes y validaciones (calca de PHP)

- **Reporte**: Requiere alumnos con beca SEP activa en `alumno_beca_sep` (estatus=1), filtros nivel y plan, mes de corte 01–10 o 26. CSV con BOM UTF-8.
- **Prorrateo**: Requiere alumno con plan 10/11 meses, beca SEP activa en el ciclo, precios del nivel; exige colegiatura Octubre pagada. Devuelve líneas `OTORGAR_ANIO_COMPLETO_DISPONIBLE=SI` y `OTORGAR_ANIO_COMPLETO_REFS=...` cuando aplica.
- **Preview**: **Exige que exista registro en `alumno_beca_sep`** para el alumno y ciclo; si no existe, mismo mensaje que PHP: *"No hay registro de beca SEP para este alumno en el ciclo X. Use 'Guardar SEP' para dar de alta el monto prorrateado."*
- **Save**: **Valida que exista el alumno** por `alumno_ref`; si no existe, mensaje *"No existe alumno con referencia X."* INSERT incluye `created_at` (NOW()). Fecha inicio vacía → fecha actual.

## Tablas y columnas

- `alumno`: alumno_id, alumno_ref, alumno_nivel, mes (1=10m, 2=11m), etc.
- `alumno_beca_sep`: alumno_ref, ciclo_escolar, monto_prorrateado, fecha_inicio, estatus, porcentaje, created_at.
- `alumno_beca`: beca interna (porcentaje); usada en reporte/prorrateo para comparar con SEP.
- `pago_detalle`, `pago_boucher_precio`, `pago_prorroga`: como en PHP.

## Frontend (page.tsx)

Las pestañas Alumno, Reporte CSV, Prorrateo, Previsualización y Guardar SEP envían a las rutas anteriores con los mismos criterios que `module.js` (opt_sep_*, sep_*).
