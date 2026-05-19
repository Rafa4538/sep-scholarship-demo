-- ============================================================
-- demo-seed.sql  |  2026-05-19
-- Script de datos ficticios para la versión demo del sistema
-- de Becas SEP.  Ejecutar sobre una base de datos vacía.
--
-- Ciclo escolar usado: 25  (configurar CICLO_ESCOLAR_ACTUAL=25
-- en las variables de entorno de Vercel / .env.local)
--
-- Alumnos demo:
--   ANA01  – Ana García      (Primaria,    10 meses, SEP 50%)
--   LUI01  – Luis Martínez   (Secundaria,  11 meses, SEP 40%)
--   SOF01  – Sofía López     (Kinder,      10 meses, SEP 35% + beca interna 10%)
--
-- Formato pago_referencia: RRRRR MM CC 000
--   pos 1-5  = alumno_ref (5 chars)
--   pos 6-7  = código de mes (01-10, 11=insc, 26=Jul)
--   pos 8-9  = ciclo escolar (2 dígitos)
--   pos 10-12 = relleno '000'
-- ============================================================

SET NAMES utf8mb4;

-- ------------------------------------------------------------
-- Tablas
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS alumno (
  alumno_id      INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  alumno_ref     VARCHAR(20)  NOT NULL,
  alumno_nombre  VARCHAR(100) NOT NULL DEFAULT '',
  alumno_app     VARCHAR(100) NOT NULL DEFAULT '',
  alumno_apm     VARCHAR(100) NOT NULL DEFAULT '',
  alumno_nivel   INT          NOT NULL DEFAULT 0,
  mes            INT          NOT NULL DEFAULT 0,
  alumno_status  INT          NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS alumno_beca_sep (
  id                INT            NOT NULL AUTO_INCREMENT PRIMARY KEY,
  alumno_ref        VARCHAR(20)    NOT NULL,
  ciclo_escolar     INT            NOT NULL,
  monto_prorrateado DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  fecha_inicio      DATE               NULL,
  estatus           INT            NOT NULL DEFAULT 1,
  porcentaje        DECIMAL(5,2)   NOT NULL DEFAULT 0.00,
  created_at        DATETIME           NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS alumno_beca (
  id                  INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  alumno_id           INT           NOT NULL,
  beca_porcentaje     DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
  beca_estatus        INT           NOT NULL DEFAULT 1,
  beca_ciclo_escolar  INT           NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pago_detalle (
  pago_id         INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  alumno_id       INT           NOT NULL,
  pago_referencia VARCHAR(30)   NOT NULL DEFAULT '',
  pago_importe    DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  pago_fecha      DATE              NULL,
  pago_cancelado  INT           NOT NULL DEFAULT 0,
  pago_concepto   INT               NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pago_boucher_precio (
  id                  INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  alumno_nivel        INT           NOT NULL,
  precio_ciclo_escolar INT          NOT NULL,
  precio_inscripcion  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  precio_colegiatura  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  precio_colegiatura2 DECIMAL(10,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pago_prorroga (
  id                    INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  alumno_id             INT NOT NULL,
  prorroga_ciclo_escolar INT NOT NULL,
  correccion            INT NOT NULL DEFAULT 0,
  pago_concepto         INT     NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Precios por nivel – ciclo escolar 25
-- (inscripcion | colegiatura 10 meses | colegiatura 11 meses)
-- ------------------------------------------------------------

INSERT INTO pago_boucher_precio
  (alumno_nivel, precio_ciclo_escolar, precio_inscripcion, precio_colegiatura, precio_colegiatura2)
VALUES
  (1, 25,  3200.00,  2500.00,  2350.00),   -- Maternal
  (2, 25,  3500.00,  2800.00,  2650.00),   -- Kinder
  (3, 25,  3800.00,  3200.00,  3050.00),   -- Primaria
  (4, 25,  4500.00,  3800.00,  3600.00);   -- Secundaria

-- ------------------------------------------------------------
-- Alumnos
-- alumno_nivel: 1=Maternal 2=Kinder 3=Primaria 4=Secundaria
-- mes:          1=10 meses 2=11 meses
-- ------------------------------------------------------------

INSERT INTO alumno
  (alumno_id, alumno_ref, alumno_nombre, alumno_app, alumno_apm, alumno_nivel, mes, alumno_status)
VALUES
  (1, 'ANA01', 'ANA',   'GARCIA',   'LOPEZ',    3, 1, 1),  -- Primaria  10 meses
  (2, 'LUI01', 'LUIS',  'MARTINEZ', 'HERNANDEZ',4, 2, 1),  -- Secundaria 11 meses
  (3, 'SOF01', 'SOFIA', 'LOPEZ',    'GARCIA',   2, 1, 1);  -- Kinder    10 meses

-- ------------------------------------------------------------
-- Becas SEP  (ciclo 25)
--   ANA01: SEP 50%, monto_prorrateado=0 (demostrar Guardar SEP)
--   LUI01: SEP 40%, monto ya guardado ($900.00)
--   SOF01: SEP 35%, monto ya guardado ($1,207.50)
-- ------------------------------------------------------------

INSERT INTO alumno_beca_sep
  (alumno_ref, ciclo_escolar, monto_prorrateado, fecha_inicio, estatus, porcentaje, created_at)
VALUES
  ('ANA01', 25,     0.00, '2024-09-01', 1, 50.00, NOW()),
  ('LUI01', 25,   900.00, '2024-10-01', 1, 40.00, NOW()),
  ('SOF01', 25, 1207.50,  '2024-09-01', 1, 35.00, NOW());

-- ------------------------------------------------------------
-- Beca interna – solo Sofía López (10% descuento adicional)
-- ------------------------------------------------------------

INSERT INTO alumno_beca
  (alumno_id, beca_porcentaje, beca_estatus, beca_ciclo_escolar)
VALUES
  (3, 10.00, 1, 25);

-- ------------------------------------------------------------
-- Pagos – alumno Ana García (ANA01, alumno_id=1)
--   Pagó precio completo ($3,200) sin aplicar beca SEP.
--   Inscripción también a precio completo ($3,800).
--   Referencia: ANA01 + mes(2) + ciclo(2) + 000
-- ------------------------------------------------------------

INSERT INTO pago_detalle
  (alumno_id, pago_referencia, pago_importe, pago_fecha, pago_cancelado)
VALUES
  -- Inscripción (código de mes '11')
  (1, 'ANA011125000',  3800.00, '2024-08-15', 0),
  -- Sep (01)
  (1, 'ANA010125000',  3200.00, '2024-09-05', 0),
  -- Oct (02) – requerido para prorrateo
  (1, 'ANA010225000',  3200.00, '2024-10-07', 0),
  -- Nov (03)
  (1, 'ANA010325000',  3200.00, '2024-11-08', 0),
  -- Dic (04)
  (1, 'ANA010425000',  3200.00, '2024-12-06', 0);

-- Excedentes esperados al corte Nov (03) – previsualización:
--   col_beca_sep = 3200 * 0.50 = $1,600 por mes
--   Sep + Oct + Nov = 3 x (3200 - 1600) = $4,800 excedente colegiaturas
--   Inscripción: 3800 - 3800*0.50 = $1,900 excedente inscripción
--   Total excedente = $6,700 | Meses restantes = 7
--   Monto sugerido = 1600 - (6700/7) ≈ $642.86

-- ------------------------------------------------------------
-- Pagos – alumno Luis Martínez (LUI01, alumno_id=2)
--   Entrada tardía: sin pago de Sep; empieza desde Oct.
--   Pagó precio completo ($3,600 plan 11 meses).
--   Referencia: LUI01 + mes(2) + ciclo(2) + 000
-- ------------------------------------------------------------

INSERT INTO pago_detalle
  (alumno_id, pago_referencia, pago_importe, pago_fecha, pago_cancelado)
VALUES
  -- Inscripción (código '11')
  (2, 'LUI011125000',  4500.00, '2024-08-20', 0),
  -- Oct (02) – primer mes pagado (sin Sep)
  (2, 'LUI010225000',  3600.00, '2024-10-08', 0),
  -- Nov (03)
  (2, 'LUI010325000',  3600.00, '2024-11-09', 0),
  -- Dic (04)
  (2, 'LUI010425000',  3600.00, '2024-12-05', 0),
  -- Ene (05)
  (2, 'LUI010525000',  3600.00, '2025-01-08', 0);

-- Excedentes esperados en prorrateo (corte = último mes pagado = Ene):
--   col_beca_sep = 3600 * 0.60 = $2,160 por mes
--   Oct + Nov + Dic + Ene = 4 x (3600 - 2160) = $5,760 excedente colegiaturas
--   Inscripción: 4500 - 4500*0.60 = $1,800 excedente inscripción
--   Total excedente = $7,560 | Meses restantes (post-Ene) = 6
--   Monto prorrateado = 2160 - (7560/6) = $900.00

-- Corrección de Nov (03) para Luis – demuestra el bloque "enCorreccion":
INSERT INTO pago_prorroga
  (alumno_id, prorroga_ciclo_escolar, correccion, pago_concepto)
VALUES
  (2, 25, 1, 3);

-- ------------------------------------------------------------
-- Pagos – alumno Sofía López (SOF01, alumno_id=3)
--   Beca interna 10%: paga al precio con beca interna ($2,520).
--   Beca SEP 35%: col_beca_sep = 2800*0.65 = $1,820.
--   Referencia: SOF01 + mes(2) + ciclo(2) + 000
-- ------------------------------------------------------------

INSERT INTO pago_detalle
  (alumno_id, pago_referencia, pago_importe, pago_fecha, pago_cancelado)
VALUES
  -- Inscripción (código '11') – precio con beca interna (3500*0.90 = 3150)
  (3, 'SOF011125000',  3150.00, '2024-08-18', 0),
  -- Sep (01)
  (3, 'SOF010125000',  2520.00, '2024-09-06', 0),
  -- Oct (02) – requerido para prorrateo
  (3, 'SOF010225000',  2520.00, '2024-10-09', 0),
  -- Nov (03)
  (3, 'SOF010325000',  2520.00, '2024-11-12', 0),
  -- Dic (04)
  (3, 'SOF010425000',  2520.00, '2024-12-03', 0);

-- Excedentes esperados al corte Nov (03) – previsualización:
--   col_beca = 2800*0.90 = $2,520 (beca interna 10%)
--   col_beca_sep = 2800*0.65 = $1,820
--   Por mes: col_beca - col_beca_sep = 2520 - 1820 = $700
--   Sep + Oct + Nov = 3 x $700 = $2,100 excedente colegiaturas
--   Inscripción pagada: $3,150 | con SEP: 3500*0.65 = $2,275
--   Excedente inscripción = 3150 - 2275 = $875
--   Total excedente = $2,975 | Meses restantes = 7
--   Monto sugerido = 1820 - (2975/7) ≈ $1,395.00

-- ============================================================
-- FIN DEL SEED
-- Verificar con:
--   SELECT * FROM alumno;
--   SELECT * FROM alumno_beca_sep;
--   SELECT * FROM pago_boucher_precio;
-- ============================================================
