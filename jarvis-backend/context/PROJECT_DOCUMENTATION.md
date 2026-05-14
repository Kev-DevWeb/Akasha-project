# 🤖 Proyecto Jarvis — Documentación Completa

> **Última actualización:** 14 de mayo de 2026
> **Versión:** 1.0.0

---

## 1. Descripción General

Jarvis es un **asistente de hogar inteligente serverless** que convierte un Moto G5 Play en un dispositivo de escucha permanente. El usuario dice "Jarvis" seguido de un comando; el teléfono envía el texto a una API en Vercel que:

1. Analiza la intención con **Google Gemini 2.5 Flash**
2. Ejecuta acciones IoT vía **Tuya Cloud API** (luces, enchufes, IR blaster)
3. Genera una respuesta de audio con **Hugging Face TTS**
4. Devuelve el audio al teléfono para reproducción inmediata

---

## 2. Tecnologías Utilizadas

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|-----------|
| **Framework** | Next.js (App Router) | 16.2.6 | Backend serverless + Dashboard web |
| **Runtime** | Node.js | 24.15.0 | Ejecución de funciones en Vercel |
| **Lenguaje** | TypeScript | 5.x | Tipado estático en todo el proyecto |
| **LLM / NLP** | Google Gemini 2.5 Flash | — | Clasificación de intenciones + respuestas |
| **SDK Gemini** | @google/genai | latest | Structured Outputs con JSON Schema |
| **TTS** | Hugging Face Inference API | — | Síntesis de voz (facebook/mms-tts-spa) |
| **SDK HF** | @huggingface/inference | latest | Cliente para modelos de HF |
| **IoT** | Tuya Cloud API v1.0 | — | Control de focos, enchufes e IR blaster |
| **Auth Tuya** | HMAC-SHA256 | — | Firma de peticiones a Tuya |
| **Hosting** | Vercel | — | Despliegue serverless |
| **CI/CD** | GitHub Actions | — | Keep-alive ping cada 10 min |
| **Cliente** | Tasker + AutoVoice | — | Escucha continua en Moto G5 Play |
| **Diseño** | CSS vanilla + Orbitron/Inter | — | UI dark sci-fi con glassmorphism |

---

## 3. Arquitectura del Sistema

```
┌─────────────────────────────┐
│  Moto G5 Play (Android)     │
│  Tasker + AutoVoice          │
│  "Jarvis, enciende la luz"  │
└──────────┬──────────────────┘
           │ POST /api/jarvis
           │ {"query": "enciende la luz de la sala"}
           ▼
┌─────────────────────────────────────────────┐
│  Vercel — Next.js App Router                │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ 1. Autenticación (X-Jarvis-Secret)  │    │
│  └──────────┬──────────────────────────┘    │
│             ▼                               │
│  ┌─────────────────────────────────────┐    │
│  │ 2. Gemini 2.5 Flash (NLP)          │    │
│  │    → Structured Output JSON         │    │
│  │    → intención: hablar | acción     │    │
│  └──────────┬──────────────────────────┘    │
│             ▼                               │
│  ┌─────────────────────────────────────┐    │
│  │ 3. Ejecutor de Acciones IoT         │    │
│  │    → Tuya API (luces/enchufes)      │    │
│  │    → IR Blaster (TV/Roku)           │    │
│  └──────────┬──────────────────────────┘    │
│             ▼                               │
│  ┌─────────────────────────────────────┐    │
│  │ 4. Hugging Face TTS                 │    │
│  │    → facebook/mms-tts-spa           │    │
│  │    → Buffer de audio (flac/wav)     │    │
│  └──────────┬──────────────────────────┘    │
│             │                               │
└─────────────┼───────────────────────────────┘
              │ Response: audio/flac
              ▼
┌─────────────────────────────┐
│  Moto G5 reproduce el audio │
└─────────────────────────────┘
```

---

## 4. Estructura de Archivos

```
jarvis-backend/
├── app/
│   ├── api/
│   │   ├── jarvis/route.ts        # Endpoint principal (POST = comando, GET = ping)
│   │   └── devices/route.ts       # CRUD de dispositivos IoT
│   ├── globals.css                # Sistema de diseño dark/sci-fi
│   ├── layout.tsx                 # Layout raíz con Inter font
│   └── page.tsx                   # Dashboard web interactivo
├── lib/
│   ├── gemini.ts                  # NLP con Gemini Structured Outputs
│   ├── tts.ts                     # TTS con fallback entre modelos HF
│   ├── tuya.ts                    # Cliente Tuya (auth HMAC + caché de tokens)
│   ├── devices.ts                 # Registro de dispositivos + aliases de voz
│   └── actions.ts                 # Dispatch de acciones según intención
├── context/
│   └── PROJECT_DOCUMENTATION.md   # Este archivo
├── .github/workflows/
│   └── keep-alive.yml             # Cron cada 10 min anti cold-start
├── .env.local                     # Variables privadas (NO subir a git)
├── .env.example                   # Plantilla de variables
├── vercel.json                    # Config de despliegue (timeout, CORS)
├── next.config.ts                 # Config de Next.js (CORS, body size)
├── tsconfig.json                  # Configuración TypeScript
└── package.json                   # Dependencias del proyecto
```

---

## 5. Qué se Implementó (Detalle por Archivo)

### 5.1 `lib/gemini.ts` — Motor de Razonamiento
- Inicializa el cliente `@google/genai` con la API key
- Define un **JSON Schema** para Structured Outputs que fuerza a Gemini a devolver:
  - `intencion`: `"hablar"` o `"ejecutar_accion"`
  - `respuesta_texto`: texto en español mexicano
  - `accion`: objeto con `tipo`, `dispositivo` y `valor` (opcional)
- System prompt con personalidad tipo Iron Man en español mexicano
- Temperatura: 0.7, max tokens: 512

### 5.2 `lib/tts.ts` — Síntesis de Voz
- Llama a la Hugging Face Inference API con modelos TTS
- Prioridad: `facebook/mms-tts-spa` (español) → `espnet/kan-bayashi_ljspeech_vits` (fallback)
- Maneja el estado HTTP 503 (modelo cargando) con reintento automático
- Detecta el tipo de audio por magic bytes (FLAC, WAV, MP3)
- Limita texto a 500 caracteres para evitar timeouts

### 5.3 `lib/tuya.ts` — Cliente Tuya IoT
- Autenticación HMAC-SHA256 según especificación Tuya Cloud
- Caché de tokens en memoria con expiración automática
- Funciones helper: `toggleLight()`, `setBrightness()`, `toggleSwitch()`, `sendIRCommand()`
- Manejo de errores con mensajes descriptivos en español

### 5.4 `lib/devices.ts` — Registro de Dispositivos
- Mapa centralizado de dispositivos (`DEVICES`) con:
  - Device ID (de Tuya o variable de entorno)
  - Nombre legible
  - Tipo: `light`, `switch`, `ir_blaster`, `tv`
  - Aliases de voz (normalización NFD para tildes)
- Función `findDeviceByAlias()` para buscar por nombre hablado
- Mapeo de comandos IR (power, netflix, vol_up, etc.)

### 5.5 `lib/actions.ts` — Ejecutor de Acciones
- Recibe el análisis de Gemini y hace dispatch por tipo:
  - `encender_luz` / `apagar_luz` → `toggleLight()`
  - `encender_enchufe` / `apagar_enchufe` → `toggleSwitch()`
  - `ajustar_brillo` → `setBrightness()` (convierte % a escala Tuya 0-1000)
  - `comando_ir` → `sendIRCommand()` con mapeo de nombres a códigos

### 5.6 `app/api/jarvis/route.ts` — Endpoint Principal
- **GET**: Devuelve JSON de status (para keep-alive ping)
- **OPTIONS**: Preflight CORS
- **POST**: Pipeline completo:
  1. Autenticación por header `X-Jarvis-Secret` (opcional)
  2. Parseo del body `{"query": "..."}`
  3. Análisis NLP con Gemini
  4. Ejecución de acción IoT si corresponde
  5. Generación de audio TTS
  6. Retorna el buffer de audio con headers informativos
- Si falla, intenta devolver un audio de error (para que Tasker lo reproduzca)

### 5.7 `app/api/devices/route.ts` — Gestión de Dispositivos
- **GET**: Lista todos los dispositivos con su estado de configuración
- **POST**: Envía comandos directos a un dispositivo por clave (sin NLP)

### 5.8 `app/page.tsx` — Dashboard Web
- Logo animado con anillos pulsantes estilo Iron Man
- Input de texto con envío por Enter
- Botones de comandos rápidos predefinidos
- Reproducción de audio TTS en el navegador
- Log de actividad en tiempo real con colores por tipo
- Campo para API secret
- Indicador de estado: idle / processing / speaking

### 5.9 `app/globals.css` — Sistema de Diseño
- Paleta dark sci-fi con cyan primario (`#00c8ff`)
- Glassmorphism con backdrop-filter
- Tipografías: Orbitron (marca) + Inter (cuerpo)
- Animaciones: pulse-ring, float, fade-in, blink, scan-line
- Componentes: `.card`, `.btn`, `.glass`, `.status-badge`
- Scrollbar personalizada

### 5.10 `.github/workflows/keep-alive.yml`
- Cron job cada 10 minutos
- Ping GET al endpoint de Jarvis
- Verifica código HTTP 200
- Se puede disparar manualmente con `workflow_dispatch`

### 5.11 `vercel.json`
- Región: `iad1` (US East para menor latencia)
- Timeout: 60s para `/api/jarvis` (el TTS puede tardar)
- CORS global para todas las rutas `/api/*`

---

## 6. Pasos para Poner en Marcha

### Paso 1 — Obtener API Keys

| Servicio | URL | Qué necesitas |
|----------|-----|---------------|
| Google AI Studio | https://aistudio.google.com/app/apikey | `GEMINI_API_KEY` |
| Hugging Face | https://huggingface.co/settings/tokens | `HF_ACCESS_TOKEN` |
| Tuya IoT | https://iot.tuya.com | `TUYA_CLIENT_ID` + `TUYA_CLIENT_SECRET` |

### Paso 2 — Configurar Variables de Entorno

```bash
cd jarvis-backend
cp .env.example .env.local
# Editar .env.local con tus valores reales
```

Variables requeridas:
```
GEMINI_API_KEY=AIza...
HF_ACCESS_TOKEN=hf_...
TUYA_CLIENT_ID=...
TUYA_CLIENT_SECRET=...
TUYA_BASE_URL=https://openapi.tuyaus.com
JARVIS_API_SECRET=<openssl rand -hex 32>
```

### Paso 3 — Añadir Device IDs de Tuya

En Tuya Developer Console → Cloud → Devices, copia cada Device ID y añádelo a `.env.local`:

```
DEVICE_LUZ_SALA=eb...
DEVICE_LUZ_RECAMARA=eb...
DEVICE_LUZ_COCINA=eb...
DEVICE_ENCHUFE_TV=eb...
DEVICE_IR_BLASTER=eb...
```

### Paso 4 — Probar Localmente

```bash
npm install
npm run dev
# Abrir http://localhost:3000
```

### Paso 5 — Desplegar en Vercel

```bash
# Opción A: Vercel CLI
npm i -g vercel
vercel

# Opción B: GitHub (CI/CD automático)
git init && git add . && git commit -m "feat: jarvis v1.0"
gh repo create jarvis-backend --private --source=. --push
# Conectar en https://vercel.com/new
# Inyectar variables de entorno en el panel de Vercel
```

### Paso 6 — Configurar Tasker en el Moto G5

1. Instalar **Tasker** + **AutoVoice**
2. En AutoVoice: activar **Continuous Recognition**, keyword: `Jarvis`
3. Crear perfil en Tasker:
   - **Trigger**: AutoVoice Recognized (filtro: "Jarvis")
   - **Acción 1**: Variable Set → `%comando` = `%avcommandfull`
   - **Acción 2**: HTTP Request POST a `https://tu-app.vercel.app/api/jarvis` con body `{"query": "%comando"}`
   - **Acción 3**: Music Play → reproducir el archivo descargado

### Paso 7 — Activar Keep-Alive

En el repo de GitHub → Settings → Secrets → Actions:
- `JARVIS_APP_URL` = `https://tu-app.vercel.app`
- `JARVIS_API_SECRET` = tu secreto

El workflow se ejecuta automáticamente cada 10 minutos.

---

## 7. Pruebas con curl

```bash
# Ping (verificar que está online)
curl https://tu-app.vercel.app/api/jarvis

# Comando conversacional
curl -X POST https://tu-app.vercel.app/api/jarvis \
  -H "Content-Type: application/json" \
  -H "X-Jarvis-Secret: tu_secreto" \
  -d '{"query": "hola jarvis, como estas"}' \
  --output respuesta.flac

# Comando IoT
curl -X POST https://tu-app.vercel.app/api/jarvis \
  -H "Content-Type: application/json" \
  -H "X-Jarvis-Secret: tu_secreto" \
  -d '{"query": "enciende la luz de la sala"}' \
  --output respuesta.flac

# Listar dispositivos
curl https://tu-app.vercel.app/api/devices \
  -H "X-Jarvis-Secret: tu_secreto"
```

---

## 8. Troubleshooting

| Problema | Causa Probable | Solución |
|----------|---------------|----------|
| `401 No autorizado` | Header `X-Jarvis-Secret` incorrecto | Verificar variable en Vercel |
| Audio vacío o silencio | Modelo HF en cold start | Esperar ~30s y reintentar |
| `Tuya auth failed` | Client ID/Secret mal | Revisar región en `TUYA_BASE_URL` |
| Gemini no responde | API Key inválida o sin cuota | Verificar en AI Studio |
| Respuesta muy lenta | Cold start de Vercel | Verificar que el keep-alive funcione |
| Dispositivo no encontrado | Device ID no configurado | Revisar `.env.local` y `lib/devices.ts` |
| Error de CORS | Headers faltantes | Ya configurado en `vercel.json` y `next.config.ts` |

---

## 9. Dependencias del Proyecto

```json
{
  "dependencies": {
    "@google/genai": "Cliente oficial de Google Gemini",
    "@huggingface/inference": "Cliente para HF Inference API",
    "crypto-js": "Utilidades criptográficas (firma Tuya)",
    "next": "Framework web (App Router)",
    "react": "UI del dashboard",
    "react-dom": "Renderizado del dashboard"
  }
}
```

---

## 10. Extensiones Futuras

- [ ] Historial de conversación (pasar contexto a Gemini)
- [ ] Reconocimiento por perfil de usuario
- [ ] Rutinas ("Modo noche": apagar todo + bajar persianas)
- [ ] Notificaciones push al cambiar estado de dispositivos
- [ ] Google Home Graph para Chromecast / Fire TV nativo
- [ ] Fallback a LLM local si no hay internet
- [ ] Modelo TTS personalizado con voz propia
