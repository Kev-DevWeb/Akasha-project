# 🚀 Jarvis — Guía Paso a Paso (Desde Cero hasta Funcionando)

> Para: Huawei Y7 2018 como dispositivo de escucha
> Sin: Tuya, Google Home (solo modo conversacional)

---

## Explicación de las Keys que Necesitas

### 1. 🔑 GEMINI_API_KEY (Ya la tienes/conoces)
Es la llave para que Jarvis "piense". Cada vez que dices algo, el texto se envía a
Google Gemini y él responde de forma inteligente.

### 2. 🔑 HF_ACCESS_TOKEN — ¿Qué es Hugging Face?

**Hugging Face** es como un "GitHub de inteligencia artificial". Tiene miles de modelos
de IA gratuitos. Nosotros usamos uno llamado `facebook/mms-tts-spa` que **convierte
texto a voz en español**.

El flujo es:
```
Gemini genera texto: "Hola señor, ¿en qué puedo ayudarle?"
        ↓
Hugging Face recibe ese texto
        ↓
Devuelve un archivo de AUDIO con esa frase hablada
        ↓
Tu Huawei reproduce ese audio = Jarvis "habla"
```

**Sin esta key**, Jarvis pensaría pero sería MUDO (no podría hablar).

**Cómo obtenerla:**
1. Ve a https://huggingface.co y crea una cuenta (gratis con Google/GitHub)
2. Ve a https://huggingface.co/settings/tokens
3. Click en "Create new token"
4. Nombre: "jarvis" — Tipo: "Read" (solo lectura, es suficiente)
5. Copias el token que empieza con `hf_...`

### 3. 🔑 JARVIS_API_SECRET — Seguridad del Endpoint

**¿Qué es un endpoint?** Es la URL pública donde vive Jarvis en internet, por ejemplo:
`https://jarvis-xyz.vercel.app/api/jarvis`

**El problema:** Como es pública, CUALQUIER persona que conozca la URL podría enviar
comandos a tu Jarvis y gastar tu cuota gratuita de Gemini y Hugging Face.

**La solución:** El `JARVIS_API_SECRET` es como una **contraseña** que solo tú conoces.
Cuando tu Huawei envía un comando, incluye esta contraseña en la petición.
Si alguien más intenta usar tu URL sin la contraseña → rechazado con error 401.

**Cómo generarla:**
```bash
# En tu terminal, ejecuta:
openssl rand -hex 32
# Te dará algo como: a3f8b2c1d4e5f6789012345678abcdef...
# Esa cadena larga ES tu secreto. Cópiala.
```

No viene de ningún servicio externo. **Tú la inventas** (o la generas con openssl).

### 4. 🌐 NEXT_PUBLIC_APP_URL — Keep-Alive

**¿Qué problema resuelve?**
Vercel apaga tu función cuando nadie la usa por un rato ("cold start").
La primera vez que le hablas después de un rato, tarda 3-5 segundos extra en despertar.

**La solución:** Un robot (GitHub Actions) le hace "ping" a tu URL cada 10 minutos,
como si alguien le hablara, para que nunca se duerma.

**¿Cuándo la configuras?** DESPUÉS del deploy en Vercel. Vercel te dará la URL final
y ahí la copias. Por ahora déjala vacía.

---

## PLAN PASO A PASO — Desde Ahora Hasta Funcionar

### FASE 1: Obtener las Keys (5-10 minutos)

#### Paso 1.1 — Gemini API Key
1. Abre https://aistudio.google.com/app/apikey
2. Inicia sesión con tu cuenta de Google
3. Click en "Create API Key"
4. Selecciona cualquier proyecto (o crea uno nuevo)
5. Copia la key que empieza con `AIza...`

#### Paso 1.2 — Hugging Face Token
1. Abre https://huggingface.co/join — crea cuenta (o usa Google/GitHub)
2. Ve a https://huggingface.co/settings/tokens
3. "Create new token" → Nombre: `jarvis` → Tipo: `Read`
4. Copia el token `hf_...`

#### Paso 1.3 — Generar tu Secreto
En tu terminal:
```bash
openssl rand -hex 32
```
Copia el resultado.

#### Paso 1.4 — Llenar el .env.local
Abre `/jarvis-backend/.env.local` y pon:
```
GEMINI_API_KEY=AIzaSy...tu_key_real...
HF_ACCESS_TOKEN=hf_...tu_token_real...
JARVIS_API_SECRET=a3f8b2...tu_secreto_generado...
```

---

### FASE 2: Probar Localmente en tu PC (5 minutos)

```bash
cd ~/Documents/Project-Jarvis/jarvis-backend

# Cargar Node.js
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"

# Iniciar servidor de desarrollo
npm run dev
```

Abre http://localhost:3000 en tu navegador. Verás el dashboard de Jarvis.
Escribe "Hola Jarvis" y presiona Enter. Si todo está bien:
- Verás el log con la respuesta de Gemini
- Escucharás el audio de la respuesta

**Si funciona localmente → estás listo para el deploy.**

---

### FASE 3: Subir a Vercel (10-15 minutos)

#### Paso 3.1 — Crear cuenta en Vercel
1. Ve a https://vercel.com/signup
2. Regístrate con tu cuenta de GitHub (recomendado)

#### Paso 3.2 — Crear repositorio en GitHub
```bash
cd ~/Documents/Project-Jarvis/jarvis-backend

# Inicializar git
git init
git add .
git commit -m "feat: jarvis v1.0 - modo conversacional"

# Crear repo en GitHub (necesitas GitHub CLI instalado)
# Si no tienes gh: sudo dnf install gh  (o desde https://cli.github.com)
gh auth login
gh repo create jarvis-backend --private --source=. --remote=origin --push
```

#### Paso 3.3 — Conectar con Vercel
1. Ve a https://vercel.com/new
2. Click en "Import Git Repository"
3. Selecciona `jarvis-backend`
4. **IMPORTANTE — Antes de hacer deploy**, expandir "Environment Variables" y agregar:
   - `GEMINI_API_KEY` = tu key
   - `HF_ACCESS_TOKEN` = tu token
   - `JARVIS_API_SECRET` = tu secreto
5. Click en "Deploy"
6. Espera ~1 minuto. Vercel te dará una URL como:
   `https://jarvis-backend-xyz.vercel.app`

#### Paso 3.4 — Verificar que funciona
```bash
# En tu terminal:
curl https://jarvis-backend-xyz.vercel.app/api/jarvis
# Debería responder: {"status":"ok","message":"Jarvis online",...}
```

---

### FASE 4: Configurar el Huawei Y7 2018 (20-30 minutos)

#### Paso 4.1 — Preparar el teléfono
1. **Resetear de fábrica** (opcional pero recomendado para liberar RAM)
   - Ajustes → Sistema → Restablecer → Restablecer datos de fábrica
2. Después del reset, NO instales apps innecesarias
3. **Desactivar actualizaciones automáticas:**
   - Google Play → ⚙️ → Actualización automática → No actualizar
4. **Pantalla siempre encendida:**
   - Ajustes → Sistema → Opciones de desarrollador
   - (Si no aparece: Ajustes → Sistema → Acerca del teléfono → toca "Número de compilación" 7 veces)
   - Activar "Pantalla activa durante la carga"
5. **Conectar a la corriente eléctrica** (va a estar enchufado 24/7)

#### Paso 4.2 — Instalar Apps Necesarias
Desde Google Play instala:
1. **Tasker** (~$3.49 USD) — https://play.google.com/store/apps/details?id=net.dinglisch.android.taskerm
2. **AutoVoice** (gratis) — https://play.google.com/store/apps/details?id=com.joaomgcd.autovoice

#### Paso 4.3 — Configurar AutoVoice
1. Abre AutoVoice
2. Otorga todos los permisos que pida (micrófono, accesibilidad, etc.)
3. Ve a **"Continuous"** (escucha continua)
4. Activa el toggle
5. En **"Hotword"** o **"Trigger word"**: escribe `jarvis`
6. Esto hará que el micrófono escuche constantemente esperando que digas "Jarvis"

#### Paso 4.4 — Crear el Perfil en Tasker

**Abre Tasker** y sigue estos pasos:

**A) Crear el PERFIL (el trigger):**
1. Toca el `+` abajo para crear un nuevo perfil
2. Selecciona **Evento** → **Plugin** → **AutoVoice** → **Recognized**
3. Toca el ✏️ (lápiz) para configurar
4. En "Command Filter": deja vacío (captura todo después de "Jarvis")
5. Guarda y regresa

**B) Crear la TAREA (lo que hace cuando escucha):**

Tasker te pedirá crear una tarea. Nómbrala: `Jarvis Comando`

**Acción 1 — Guardar el texto reconocido:**
1. `+` → Variables → Variable Set
2. Nombre: `%comando`
3. Valor: `%avcomm`
4. (Esto guarda lo que dijiste después de "Jarvis")

**Acción 2 — Enviar al servidor:**
1. `+` → Red → HTTP Request
2. Método: `POST`
3. URL: `https://jarvis-backend-xyz.vercel.app/api/jarvis`
   (reemplaza con TU URL de Vercel)
4. Headers:
   ```
   Content-Type:application/json
   X-Jarvis-Secret:tu_secreto_aqui
   ```
5. Body: `{"query": "%comando"}`
6. Output File: `/storage/emulated/0/jarvis_response.flac`
7. Timeout: `60` (segundos)

**Acción 3 — Reproducir la respuesta:**
1. `+` → Medios → Music Play
2. Archivo: `/storage/emulated/0/jarvis_response.flac`
3. Stream: `Music` (o `Notification` si quieres que suene con el volumen de notis)

**Acción 4 (OPCIONAL) — Feedback visual:**
1. `+` → Alerta → Flash
2. Texto: `Jarvis respondió ✓`

**C) Activar el perfil:**
1. Asegúrate de que el perfil esté activado (toggle ON)
2. Sal de Tasker (queda corriendo en segundo plano)

#### Paso 4.5 — Probar
1. Con el Huawei conectado a WiFi y a la corriente
2. Di en voz alta: **"Jarvis, hola cómo estás"**
3. Espera 3-8 segundos
4. Deberías escuchar la respuesta de Jarvis por la bocina del teléfono

---

### FASE 5: Keep-Alive (5 minutos, DESPUÉS de que todo funcione)

#### Paso 5.1 — Configurar en GitHub Actions
1. Ve a tu repositorio en GitHub
2. Settings → Secrets and variables → Actions → New repository secret
3. Agrega:
   - Nombre: `JARVIS_APP_URL` → Valor: `https://jarvis-backend-xyz.vercel.app`
   - Nombre: `JARVIS_API_SECRET` → Valor: tu secreto
4. El workflow `.github/workflows/keep-alive.yml` ya existe en el código
5. Se activará automáticamente y hará ping cada 10 minutos

---

## Resumen Visual del Flujo

```
Tú dices: "Jarvis, qué hora es"
            ↓
Huawei Y7 (micrófono) escucha 24/7
            ↓
AutoVoice detecta "Jarvis" → captura "qué hora es"
            ↓
Tasker envía POST a Vercel: {"query": "qué hora es"}
            ↓
Vercel → Gemini 2.5 Flash analiza → responde texto
            ↓
Vercel → Hugging Face TTS → convierte texto a audio
            ↓
Vercel devuelve audio al Huawei
            ↓
Huawei reproduce: "Son las 2:25 de la tarde, señor"
```

---

## Notas Específicas para el Huawei Y7 2018

- **RAM:** 2GB — suficiente para Tasker + AutoVoice
- **Android:** Probablemente 8.0 Oreo — compatible con Tasker
- **EMUI:** Huawei tiene gestión agresiva de batería. Debes:
  1. Ajustes → Batería → Inicio de aplicaciones
  2. Buscar Tasker y AutoVoice → desactivar "Gestionar automáticamente"
  3. Activar manualmente: Auto-inicio ✓, Ejecución en segundo plano ✓, Inicio secundario ✓
  4. Esto evita que EMUI mate Tasker en segundo plano
- **Modo No Molestar:** Desactívalo o excluye a Tasker para que siempre reproduzca audio
