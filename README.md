# 🎓 ScholarFlow – SEP Scholarship Proration Engine

Sistema demostrativo orientado a la automatización del cálculo y prorrateo de becas SEP.

El proyecto nace a partir de una problemática administrativa real donde el cálculo de ajustes de colegiaturas debía realizarse manualmente considerando historial de pagos, descuentos internos y redistribución de excedentes sobre mensualidades futuras.

ScholarFlow automatiza este proceso mediante reglas de negocio y simulación de escenarios.

---

## Tecnologías

- Next.js
- React
- TypeScript
- Tailwind CSS
- MySQL (Railway en demo)
- Vercel
- Cursor AI
- Git

---

## Problema

En procesos administrativos escolares el cálculo de becas SEP puede involucrar:

- Historial de pagos previos
- Becas internas
- Becas SEP
- Colegiaturas liquidadas
- Pagos excedentes
- Redistribución de descuentos

Tradicionalmente este procedimiento puede realizarse manualmente.

El objetivo del proyecto es automatizar la lógica de cálculo y generar escenarios de ajuste.

---

## Funcionalidades

### Gestión de alumnos

- Alta de alumnos demo
- Configuración de colegiaturas
- Asociación de becas SEP e internas

### Gestión de pagos

- Registro de pagos realizados
- Historial de movimientos por mensualidad

### Motor de prorrateo SEP

El sistema calcula automáticamente:

- Descuento SEP
- Excedentes de pago
- Diferencia acumulada
- Redistribución sobre colegiaturas restantes
- Ajuste final por mensualidad

### Módulos de la app

- **Previsualización** — desglose por mes y monto sugerido
- **Prorrateo** — resumen por alumno
- **Reporte CSV** — exportación masiva
- **Guardar SEP** — alta/actualización de registro

---

## Ejemplo de simulación

Entrada:

- Colegiatura: $4,000
- Beca SEP: 20%
- Excedente pagado: $2,000
- Colegiaturas restantes: 10

Proceso:

- Colegiatura ajustada: 4000 − 20% = **$3,200**
- Excedente distribuido: 2000 ÷ 10 = **$200**

Resultado:

- Pago mensual ajustado = **$3,000**

---

## Arquitectura

| Capa | Stack |
|------|--------|
| Frontend | Next.js + React + TypeScript |
| UI | Tailwind CSS |
| Persistencia | MySQL |
| Deploy | Vercel |
| Datos demo | Ficticios (`scripts/demo-seed.sql`) |

---

## Consideraciones

Este proyecto utiliza únicamente datos ficticios.

No contiene información institucional, registros reales ni estructuras de producción.

Fue desarrollado como demostración técnica inspirada en experiencias de automatización administrativa.

---

## Instalación y demo

Ver guía completa en **[docs/DEMO_DEPLOY.md](docs/DEMO_DEPLOY.md)**.

Resumen:

```bash
npm install
cp .env.demo.example .env.local
# Editar .env.local con credenciales MySQL (Railway)
npm run dev
```

Variables clave:

- `MYSQL_*` — conexión a base de datos
- `CICLO_ESCOLAR_ACTUAL=25` — ciclo del seed demo
- `NEXT_PUBLIC_DEMO_MODE=true` — banner identificador de demo

Alumnos de prueba: **ANA01**, **LUI01**, **SOF01** (ciclo `25`).

---

## APIs

- **GET/POST** `/api/beca-sep/report` — reporte CSV
- **POST** `/api/beca-sep/prorrateo` — prorrateo por `alumno_id`
- **POST** `/api/beca-sep/preview` — previsualización por `alumno_ref`
- **POST** `/api/beca-sep/save` — guardar beca SEP

---

## Estado del proyecto

En desarrollo activo.

Próximas funcionalidades:

- Historial de simulaciones
- Exportación PDF
- Dashboard analítico
- Escenarios múltiples

---

## 🤖 Desarrollo asistido por IA

Herramientas: Cursor AI, ChatGPT.

---

## 🌐 Demo

Despliegue en Vercel con MySQL en Railway. Ver [docs/DEMO_DEPLOY.md](docs/DEMO_DEPLOY.md).

---

## 👨‍💻 Autor

**Rafael de Jesús Salazar García**

Ingeniero en Sistemas Computacionales — automatización de procesos y desarrollo Full Stack.
