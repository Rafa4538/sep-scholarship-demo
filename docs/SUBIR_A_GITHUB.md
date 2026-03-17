# Subir este proyecto a GitHub

El repositorio git ya está inicializado y el primer commit está hecho en la rama `main`.

## Pasos para crear el repo en GitHub y subir el código

1. **Crear el repositorio en GitHub**
   - Entra a [github.com/new](https://github.com/new)
   - **Repository name:** `beca-sep-app` (o el nombre que prefieras)
   - Descripción opcional: "App Becas SEP - Next.js (previsualización, reporte CSV, prorrateo)"
   - Elige **Public**
   - **No** marques "Add a README", "Add .gitignore" ni "Choose a license" (el proyecto ya tiene todo)
   - Pulsa **Create repository**

2. **Conectar y subir desde tu PC**
   En la carpeta del proyecto (`beca-sep-app`) ejecuta (sustituye `TU_USUARIO` por tu usuario de GitHub):

   ```bash
   git remote add origin https://github.com/TU_USUARIO/beca-sep-app.git
   git push -u origin main
   ```

   Si usas SSH:
   ```bash
   git remote add origin git@github.com:TU_USUARIO/beca-sep-app.git
   git push -u origin main
   ```

3. **Autenticación**
   - Con HTTPS, GitHub pedirá usuario y contraseña; usa un **Personal Access Token** como contraseña (no la de tu cuenta).
   - Para crear un token: GitHub → Settings → Developer settings → Personal access tokens → Generate new token (con permiso `repo`).

Después de esto, tu código estará en GitHub y podrás conectarlo a Vercel u otro servicio.
