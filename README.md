# 🎓 ScholarFlow – SEP Scholarship Proration Engine

Sistema demostrativo orientado a la automatización del cálculo y prorrateo de becas SEP.

El proyecto nace a partir de una problemática administrativa real donde el cálculo de ajustes de colegiaturas debía realizarse manualmente considerando historial de pagos, descuentos internos y redistribución de excedentes sobre mensualidades futuras.

ScholarFlow automatiza este proceso mediante reglas de negocio y simulación de escenarios.

---

## 🚀 Tecnologías

- Next.js
- React
- TypeScript
- Tailwind CSS
- MySQL (Railway en demo)
- Vercel
- Cursor AI
- Git

---

## 📌 Problema

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

## ⚙️ Funcionalidades

### Gestión de alumnos

- Alta de alumnos demo
- Historial académico
- Configuración de colegiaturas
- Asociación de becas SEP e internas

### Gestión de pagos

- Registro de pagos realizados
- Historial de movimientos
- Consulta de mensualidades

### Motor de prorrateo SEP

El sistema calcula automáticamente:

- Descuento SEP
- Excedentes de pago
- Diferencia acumulada
- Redistribución sobre colegiaturas restantes
- Ajuste final por mensualidad

### Módulos de la aplicación

| Pestaña | Descripción |
|---------|-------------|
| **Alumno** | Datos compartidos (ID, no. de control, ciclo escolar) |
| **Previsualización** | Desglose por mes y monto prorrateado sugerido |
| **Prorrateo** | Resumen de excedente y colegiaturas restantes |
| **Reporte CSV** | Exportación masiva por nivel y plan |
| **Guardar SEP** | Alta o actualización del registro de beca SEP |

---

## 📖 Instrucciones de uso (demo)

### Requisitos previos

1. Base de datos MySQL con el script `scripts/demo-seed.sql` ejecutado (ver [docs/DEMO_DEPLOY.md](docs/DEMO_DEPLOY.md)).
2. Variables de entorno configuradas (Vercel o `.env.local`).
3. **Ciclo escolar `25`** en la pestaña Alumno y en `CICLO_ESCOLAR_ACTUAL` (coincide con los datos del seed).

> **Importante:** La pestaña **Prorrateo** usa el ciclo del servidor (`CICLO_ESCOLAR_ACTUAL`). **Previsualización** y **Guardar SEP** usan el campo **Ciclo escolar** de la pestaña Alumno. Si no coinciden, puede aparecer *"No hay precios para nivel X en el ciclo"* aunque Prorrateo funcione.

### Alumnos de prueba

| No. control | ID alumno | Escenario |
|-------------|-----------|-----------|
| `ANA01` | `1` | Primaria, SEP 50%, pagó precio completo (excedente alto) |
| `LUI01` | `2` | Secundaria 11 meses, entrada tardía, SEP 40% |
| `SOF01` | `3` | Kinder, beca interna 10% + SEP 35% |

### Flujo recomendado (5–10 min)

1. **Pestaña Alumno**
   - No. de control: `ANA01`
   - Ciclo escolar: **`25`**
   - (Opcional) ID alumno: `1`

2. **Previsualización**
   - No. de control: `ANA01`
   - Mes de colegiatura: **Noviembre** (o el mes que quieras analizar)
   - Clic en **Previsualizar** → verás desglose por mes y **monto sugerido prorrateado**

3. **Guardar SEP**
   - Usa el monto sugerido de la previsualización
   - Porcentaje SEP: `50` (o el del registro)
   - Clic en **Guardar** → persiste en la base de datos demo

4. **Prorrateo**
   - ID alumno: `1` (Ana) o `2` (Luis) o `3` (Sofía)
   - Clic en **Calcular prorrateo** → resumen con excedente y meses restantes

5. **Reporte CSV**
   - Mes de corte: **Noviembre**
   - Nivel: Todos | Plan: Todos
   - Descarga el CSV con los tres alumnos demo

### Variables de entorno

Copia `.env.demo.example` a `.env.local` (local) o configúralas en Vercel:

```env
MYSQL_HOST=tu-host.railway.app
MYSQL_PORT=49666
MYSQL_USER=root
MYSQL_PASSWORD=tu_password
MYSQL_DATABASE=railway
CICLO_ESCOLAR_ACTUAL=25
NEXT_PUBLIC_DEMO_MODE=true
```

Con `NEXT_PUBLIC_DEMO_MODE=true` aparece el banner ámbar **DEMO** en la parte superior.

### Instalación local

```bash
npm install
cp .env.demo.example .env.local
# Editar .env.local con credenciales Railway
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

---

## 🧠 Ejemplo de simulación

**Entrada:**

- Colegiatura: $4,000
- Beca SEP: 20%
- Excedente pagado: $2,000
- Colegiaturas restantes: 10

**Proceso:**

- Colegiatura ajustada: 4000 − 20% = **$3,200**
- Excedente distribuido: 2000 ÷ 10 = **$200**

**Resultado:**

- Pago mensual ajustado = **$3,000**

---

## 🏗 Arquitectura

| Capa | Stack |
|------|--------|
| Frontend | Next.js + React + TypeScript |
| UI | Tailwind CSS |
| Persistencia | MySQL |
| Deploy | Vercel |
| Datos demo | Ficticios (`scripts/demo-seed.sql`) |

### APIs

- `GET/POST` `/api/beca-sep/report` — reporte CSV
- `POST` `/api/beca-sep/prorrateo` — prorrateo por `alumno_id`
- `POST` `/api/beca-sep/preview` — previsualización por `alumno_ref`
- `POST` `/api/beca-sep/save` — guardar beca SEP

---

## 🔐 Consideraciones

Este proyecto utiliza únicamente datos ficticios.

No contiene información institucional, registros reales ni estructuras de producción.

Fue desarrollado como demostración técnica inspirada en experiencias de automatización administrativa.

---

## 🧩 Estado del proyecto

En desarrollo activo.

Próximas funcionalidades:

- Historial de simulaciones
- Exportación PDF
- Dashboard analítico
- Escenarios múltiples
- Reportes administrativos

---

## 🤖 Desarrollo asistido por IA

Herramientas utilizadas:

- Cursor AI
- ChatGPT

Aplicaciones:

- Generación inicial de componentes
- Refactorización
- Optimización de lógica
- Documentación

---

## 🌐 Demo

Despliegue en **Vercel** con **MySQL en Railway**.

Guía paso a paso: **[docs/DEMO_DEPLOY.md](docs/DEMO_DEPLOY.md)**

Repositorio: [github.com/Rafa4538/sep-scholarship-demo](https://github.com/Rafa4538/sep-scholarship-demo)

---

## 📷 Capturas

Pendiente de integración.

---

## 👨‍💻 Autor

**Rafael de Jesús Salazar García**

Ingeniero en Sistemas Computacionales

Especializado en automatización de procesos y desarrollo Full Stack.
