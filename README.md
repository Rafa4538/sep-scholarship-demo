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
- Supabase
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
- Historial académico
- Configuración de colegiaturas
- Asociación de becas

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

---

## Ejemplo de simulación

Entrada:

Colegiatura: $4000

Beca SEP: 20%

Excedente pagado: $2000

Colegiaturas restantes: 10


Proceso:

Colegiatura ajustada:

4000 - 20% = 3200

Excedente distribuido:

2000 / 10 = 200

Resultado final:

3200 - 200 = $3000


Resultado:

Pago mensual ajustado = $3000

---

## Arquitectura

Frontend:

Next.js + React + TypeScript


UI:

Tailwind CSS


Persistencia:

Supabase


Deploy:

Vercel


Datos:

Información ficticia para entorno demo


---

## Consideraciones

Este proyecto utiliza únicamente datos ficticios.

No contiene información institucional, registros reales ni estructuras de producción.

Fue desarrollado como demostración técnica inspirada en experiencias de automatización administrativa.

---

## Estado del proyecto
 En desarrollo activo

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

Próximamente disponible en Vercel

---

## 📷 Capturas

Pendiente de integración.

---

## 👨‍💻 Autor

Rafael de Jesús Salazar García

Ingeniero en Sistemas Computacionales

Especializado en automatización de procesos y desarrollo Full Stack.
