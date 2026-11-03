# Banca Lottery - Guia de Deploy a Render

## PASO 1: Subir codigo a GitHub

1. Entra a https://github.com/new
2. En "Repository name" escribi: `banca-loteria`
3. Toca "Create repository"
4. En la siguiente pantalla, copia los comandos que aparecen bajo "...or push an existing repository from the command line"

## PASO 2: Subir el proyecto desde tu PC

1. Descarga la carpeta del proyecto (te la doy en un ZIP)
2. Descomprimila en tu PC
3. Abri la terminal (CMD en Windows, Terminal en Mac)
4. Navega hasta la carpeta del proyecto:
   ```
   cd ruta/a/banca-loteria
   ```
5. Ejecuta estos comandos (uno por uno):
   ```
   git init
   git add .
   git commit -m "Primer commit"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/banca-loteria.git
   git push -u origin main
   ```
   (Reemplaza `TU-USUARIO` con tu usuario de GitHub)

## PASO 3: Conectar con Render

1. Entra a https://dashboard.render.com
2. Toca "New +" y selecciona "Web Service"
3. Conecta tu cuenta de GitHub si te lo pide
4. Selecciona el repositorio `banca-loteria`
5. Configura asi:
   - **Name**: `banca-loteria`
   - **Region**: Singapore (mas cerca de Venezuela)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free
6. En "Environment Variables", agrega estas variables (copialas del archivo `.env` que te paso):
   - `DATABASE_URL` = (tu URL de TiDB)
   - `APP_ID` = (tu APP_ID)
   - `APP_SECRET` = (tu APP_SECRET)
   - `VITE_APP_ID` = (mismo que APP_ID)
   - `OWNER_UNION_ID` = (tu OWNER_UNION_ID)
7. Toca "Create Web Service"

## PASO 4: Esperar

Render va a construir y desplegar tu app. Tarda unos 3-5 minutos la primera vez.
Cuando termine, te dara una URL como:
```
https://banca-loteria.onrender.com
```

Esa es tu app. Abrirla desde cualquier dispositivo y va a funcionar sincronizada.

## PASO 5: Actualizar datos

Si haces cambios en el codigo:
1. Modifica los archivos
2. Ejecuta:
   ```
   git add .
   git commit -m "Cambios"
   git push
   ```
3. Render se actualiza automaticamente en 1-2 minutos

## NOTAS IMPORTANTES

- Plan Free: El servidor se "duerme" despues de 15 min sin uso. La primera vez que entras al dia tarda ~30 segundos en despertar.
- Base de datos: Ya esta configurada (TiDB Cloud) y funciona gratis.
- Para sincronizacion en tiempo real entre dispositivos: La app carga datos del servidor cada vez que se abre.
