# Beca SEP – Next.js + MySQL (Vercel)

**2025-03-17:** Migración del módulo de reporte y prorrateo beca SEP desde PHP a Next.js, React, TypeScript y Tailwind. Conectado a MySQL (el mismo que usas en phpMyAdmin), desplegable en Vercel.

## ¿Es posible conectar Vercel a MySQL?

Sí. Tu base MySQL puede estar en tu propio servidor (donde usas phpMyAdmin), en un hosting compartido o en un servicio en la nube. Next.js se conecta por red usando las credenciales de MySQL (host, usuario, contraseña, base de datos).

**Importante:** El servidor donde está MySQL debe aceptar conexiones desde fuera (desde los servidores de Vercel). En muchos hostings hay que activar “acceso remoto a MySQL” o añadir las IPs de Vercel. Si tu MySQL solo acepta `localhost`, solo funcionará en local; en ese caso puedes usar un túnel (por ejemplo ngrok) o un proxy para desarrollo local.

## Requisitos

- Node.js 18+
- Cuenta en Vercel (para desplegar)
- MySQL con las tablas del sistema escolar (alumno, alumno_beca_sep, pago_detalle, pago_boucher_precio, pago_prorroga, etc.)

## Instalación local

```bash
cd beca-sep-app
npm install
cp .env.local.example .env.local
```

Edita `.env.local` con los datos de tu MySQL (los mismos que usas en phpMyAdmin):

```env
MYSQL_HOST=tu-servidor.com
MYSQL_PORT=3306
MYSQL_USER=tu_usuario
MYSQL_PASSWORD=tu_password
MYSQL_DATABASE=tu_base_datos
```

Opcional: `CICLO_ESCOLAR_ACTUAL=25` (si no se define, se calcula por fecha con la regla 07-10).

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Desde la interfaz puedes:

- **Reporte global:** elegir mes de corte, nivel y plan, y descargar el CSV.
- **Prorrateo por alumno:** escribir el ID del alumno y ver el resumen de prorrateo.

## Despliegue en Vercel

1. Sube el proyecto a GitHub y conéctalo a Vercel.
2. En el proyecto de Vercel → **Settings → Environment Variables** añade las mismas variables que en `.env.local`:
   - `MYSQL_HOST`
   - `MYSQL_PORT`
   - `MYSQL_USER`
   - `MYSQL_PASSWORD`
   - `MYSQL_DATABASE`
   - (opcional) `CICLO_ESCOLAR_ACTUAL`
3. Redeploy. Las API routes (`/api/beca-sep/report`, `/api/beca-sep/prorrateo`) usarán esas variables.

Asegúrate de que el firewall o la configuración de tu MySQL permita conexiones desde las IPs de Vercel (o desde cualquier IP si tu proveedor lo permite).

## APIs

- **GET o POST `/api/beca-sep/report`**  
  Parámetros: `mes_corte` (01–10, 26), `nivel_filtro` (0–4), `plan_filtro` (0–2).  
  Respuesta: CSV para descarga (mismo formato que el reporte PHP).

- **POST `/api/beca-sep/prorrateo`**  
  Body: `{ "alumno_id": 123 }`.  
  Respuesta: JSON con el texto del resumen de prorrateo y, si aplica, referencias para “Otorgar año completo”.

## Estructura

- `lib/db.ts` – Conexión MySQL (una conexión por petición, compatible con serverless).
- `lib/constants.ts` – Nombres de meses/niveles, conceptos día 10, etc.
- `lib/excedente.ts` – Cálculo de diferencia a favor (excedente) en colegiaturas.
- `app/api/beca-sep/report/route.ts` – Genera el reporte CSV.
- `app/api/beca-sep/prorrateo/route.ts` – Calcula el prorrateo por alumno.
- `app/page.tsx` – Interfaz con Tailwind para reporte y prorrateo.
