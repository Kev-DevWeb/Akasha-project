# 🚀 Akasha — Guía Paso a Paso (Desde Cero hasta Funcionando)

> Para: Honor 8A (y otros dispositivos Android) como dispositivo de escucha
> Sin: Tasker / AutoVoice (Uso nativo de PWA y Web APIs)

---

## Explicación de las Keys que Necesitas

### 1. 🔑 GEMINI_API_KEY
Es la llave para que Akasha "piense". Cada vez que dices algo, el texto se envía a Google Gemini y este responde de forma inteligente usando Structured Outputs para determinar intenciones.

### 2. 🔑 HF_ACCESS_TOKEN — ¿Qué es Hugging Face?
Nosotros usamos un modelo llamado `facebook/mms-tts-spa` alojado en Hugging Face que **convierte texto a voz en español**.

El flujo es:
```
Gemini genera texto: "Hola, ¿en qué puedo ayudarte?"
        ↓
Hugging Face recibe ese texto
        ↓
Devuelve un archivo de AUDIO con esa frase hablada
        ↓
Tu Honor 8A reproduce ese audio = Akasha "habla"
```

**Sin esta key**, Akasha pensaría pero sería muda.

**Cómo obtenerla:**
1. Ve a https://huggingface.co y crea una cuenta gratis.
2. Ve a https://huggingface.co/settings/tokens
3. Click en "Create new token".
4. Nombre: "akasha" — Tipo: "Read" (solo lectura, es suficiente).
5. Copia el token que empieza con `hf_...`.

### 3. 🔑 AKASHA_API_SECRET — Seguridad del Endpoint
Como la URL de Vercel es pública, cualquiera que la conozca podría hacer peticiones y consumir tu cuota. El `AKASHA_API_SECRET` es una **contraseña** que solo tú conoces. La aplicación web la añade como cabecera (`X-Akasha-Secret`) en cada comando.

**Cómo generarla:**
En tu terminal:
```bash
openssl rand -hex 32
# Te dará algo como: a3f8b2c1d4e5f6789012345678abcdef...
```

### 4. 🌐 NEXT_PUBLIC_APP_URL — Keep-Alive
Vercel apaga las funciones inactivas ("cold start"). Un robot (GitHub Actions) le hace "ping" a tu URL cada 10 minutos para mantenerla caliente y activa. La configuras con la URL que te da Vercel tras el deploy.

---

## PLAN PASO A PASO — Desde Ahora Hasta Funcionar

### FASE 1: Obtener las Keys (5-10 minutos)
1. **Gemini API Key:** Consíguela en [Google AI Studio](https://aistudio.google.com/app/apikey).
2. **Hugging Face Token:** Créalo en [Hugging Face Settings](https://huggingface.co/settings/tokens) con permisos `Read`.
3. **Generar Secreto:** Ejecuta `openssl rand -hex 32`.
4. **Llenar archivo `.env.local`:**
   ```
   GEMINI_API_KEY=AIzaSy...
   HF_ACCESS_TOKEN=hf_...
   AKASHA_API_SECRET=a3f8b2...
   ```

---

### FASE 2: Probar Localmente en tu PC (5 minutos)
```bash
cd ~/Documents/Project-Jarvis/Akasha-project/jarvis-backend
npm run dev
```
Abre http://localhost:3000 en tu navegador. Introduce tu `X-Akasha-Secret` en la pestaña **Consola**, activa el micrófono y di "Akasha, hola". Si todo está bien, escucharás su voz y verás los logs.

---

### FASE 3: Subir a Vercel (10-15 minutos)
1. **Crear repositorio en GitHub:**
   ```bash
   git init
   git add .
   git commit -m "feat: akasha asistente inteligente"
   gh repo create akasha-project --private --source=. --push
   ```
2. **Conectar con Vercel:** Importa el repositorio en [Vercel](https://vercel.com/new). Agrega las variables `GEMINI_API_KEY`, `HF_ACCESS_TOKEN`, `AKASHA_API_SECRET`, y `NEXT_PUBLIC_APP_URL`.
3. **Verificar endpoint:**
   ```bash
   curl https://tu-proyecto.vercel.app/api/akasha
   # Debería responder: {"status":"ok","message":"Akasha online",...}
   ```

---

### FASE 4: Configurar el Honor 8A (10-15 minutos)
1. **Ajustes de Batería:** Excluye Chrome (o Fully Kiosk) del ahorro de energía (ve a Ajustes → Batería → Inicio de aplicaciones → Chrome → desactivar gestión automática y habilitar las tres opciones de ejecución en segundo plano).
2. **Pantalla siempre encendida:** Habilita las Opciones de Desarrollador y marca "Permanecer activo durante la carga".
3. **Instalar PWA:** Navega en Chrome a tu URL de Vercel, pulsa los tres puntos de Chrome y selecciona **Instalar aplicación**.
4. **Autenticar y habilitar:** Abre la app en el Honor 8A, ve a Consola, escribe tu `X-Akasha-Secret` y marca **"Activar Escucha Manos Libres"**.

Consulta una guía detallada para el teléfono en [HONOR_8A_CONFIG.md](file:///home/gatoestirado/Documents/Project-Jarvis/Akasha-project/jarvis-backend/context/HONOR_8A_CONFIG.md).

---

### FASE 5: Keep-Alive (5 minutos)
1. Configura en los secrets de tu repositorio de GitHub:
   - `AKASHA_APP_URL` = La URL de tu app en Vercel.
   - `AKASHA_API_SECRET` = Tu contraseña secreta.
2. El workflow `.github/workflows/keep-alive.yml` ya está listo para hacer pings automáticos al endpoint `/api/akasha` cada 10 minutos.
