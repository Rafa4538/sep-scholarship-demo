# Despliegue del Demo en Railway + Vercel

Guía rápida para publicar la versión demo del sistema de Becas SEP en un portafolio.

---

## Requisitos previos

- Cuenta en [Railway](https://railway.app) (plan gratuito disponible)
- Proyecto ya vinculado a [Vercel](https://vercel.com)
- Git con los cambios del demo pusheados

---

## 1. Crear la base de datos en Railway

1. Entra a [railway.app](https://railway.app) y crea un **New Project**.
2. Elige **Deploy MySQL** (o el template MySQL).
3. Una vez desplegado, abre la pestaña **Connect** del servicio MySQL.
4. Copia los valores:
   - `MYSQL_HOST` → campo *Host*
   - `MYSQL_PORT` → campo *Port* (por defecto 3306)
   - `MYSQL_USER` → campo *User* (normalmente `root`)
   - `MYSQL_PASSWORD` → campo *Password*
   - `MYSQL_DATABASE` → campo *Database* (normalmente `railway`)

---

## 2. Cargar los datos de demostración

### Opción A – Desde la terminal de Railway

1. En Railway, abre el servicio MySQL → pestaña **Data** → **Query**.
2. Pega el contenido completo de `scripts/demo-seed.sql` y ejecútalo.

### Opción B – Desde línea de comandos local (mysql-client instalado)

```bash
mysql -h <MYSQL_HOST> -P <MYSQL_PORT> -u <MYSQL_USER> -p<MYSQL_PASSWORD> <MYSQL_DATABASE> < scripts/demo-seed.sql
```

### Opción C – TablePlus / DBeaver / phpMyAdmin

Conecta con las credenciales de Railway y ejecuta `scripts/demo-seed.sql` como script.

---

## 3. Configurar variables de entorno en Vercel

1. Entra a tu proyecto en [vercel.com](https://vercel.com) → **Settings** → **Environment Variables**.
2. Agrega cada variable del archivo `.env.demo.example`:

| Variable | Valor |
|---|---|
| `MYSQL_HOST` | host de Railway |
| `MYSQL_PORT` | `3306` |
| `MYSQL_USER` | usuario Railway |
| `MYSQL_PASSWORD` | contraseña Railway |
| `MYSQL_DATABASE` | `railway` |
| `CICLO_ESCOLAR_ACTUAL` | `25` |
| `NEXT_PUBLIC_DEMO_MODE` | `true` |

3. Aplica las variables a los entornos **Production** y **Preview**.

---

## 4. Desplegar

```bash
git add .
git commit -m "demo: datos ficticios y banner de versión demo"
git push origin main
```

Vercel desplegará automáticamente. La URL pública mostrará el banner ámbar de demo.

---

## Flujo de demostración recomendado

Con las pestañas en orden:

| Pestaña | Valores de ejemplo | Qué muestra |
|---|---|---|
| **Alumno** | ID: `1`, No. control: `ANA01`, Ciclo: `25` | Datos compartidos entre pestañas |
| **Previsualización** | Ref: `ANA01`, Mes corte: Noviembre | Desglose de excedente mes a mes, monto sugerido |
| **Guardar SEP** | Ref: `ANA01`, monto del preview, % `50` | INSERT/UPDATE en BD demo |
| **Prorrateo** | ID: `1` (Ana) o `2` (Luis) | Cálculo con excedente parcial, meses restantes |
| **Reporte CSV** | Mes: Noviembre, Todos los niveles | Descarga CSV con los 3 alumnos |

### Escenarios que demuestran las funciones del sistema

- **Ana García** (`ANA01`, alumno_id `1`)  
  Pagó precio completo sin aplicar beca. Previsualización muestra excedente de $6,700 y sugiere monto de ~$642.86. Demostrar `Guardar SEP` para actualizarlo.

- **Luis Martínez** (`LUI01`, alumno_id `2`)  
  Entrada tardía (sin pago de Septiembre). Prorrateo calcula meses restantes correctamente y devuelve $900/mes. Incluye una corrección en Noviembre.

- **Sofía López** (`SOF01`, alumno_id `3`)  
  Beca interna 10% + beca SEP 35%. El desglose muestra la interacción entre ambas becas.

---

## Notas

- Los datos son **completamente ficticios** y no corresponden a ningún alumno real.
- La BD demo en Railway es independiente de la BD de producción.
- Si Railway suspende el servicio por inactividad (plan gratuito), reconéctalo desde el dashboard.
- El banner ámbar de "DEMO" desaparece si eliminas `NEXT_PUBLIC_DEMO_MODE=true` de las env vars de Vercel.
