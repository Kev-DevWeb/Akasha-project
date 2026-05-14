# 🤖 Proyecto Jarvis — Guía de Implementación Completa

> Sistema de asistente doméstico inteligente serverless · Gemini 2.5 Flash + Tuya IoT + HF TTS

---

## Arquitectura del Sistema

```
Moto G5 Play (Tasker + AutoVoice)
        │  POST /api/jarvis {"query": "..."}
        ▼
  Vercel (Next.js App Router)
        │
        ├─→ Gemini 2.5 Flash (NLP + Structured JSON)
        │         │
        │    intención: "hablar" ──────────→ TTS (HF)
        │    intención: "ejecutar_accion" ─→ Tuya/IR → TTS (HF)
        │
        └─→ Respuesta: audio/flac o audio/mpeg
                │
                ▼
        Moto G5 reproduce el audio
```

---

## Paso 1: Variables de Entorno

Edita `.env.local` con tus credenciales reales:

| Variable | Fuente |
|----------|--------|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `HF_ACCESS_TOKEN` | [Hugging Face Settings](https://huggingface.co/settings/tokens) |
| `TUYA_CLIENT_ID` | [Tuya Developer Console](https://iot.tuya.com) |
| `TUYA_CLIENT_SECRET` | Tuya Developer Console |
| `JARVIS_API_SECRET` | `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | URL de Vercel (después del deploy) |

---

## Paso 2: Configurar Device IDs de Tuya

1. Abre [Tuya Developer Console](https://iot.tuya.com) → Cloud → tu Proyecto → Devices
2. Copia el **Device ID** de cada dispositivo
3. Añade al `.env.local`:

```bash
DEVICE_LUZ_SALA=eb...
DEVICE_LUZ_RECAMARA=eb...
DEVICE_LUZ_COCINA=eb...
DEVICE_ENCHUFE_TV=eb...
DEVICE_IR_BLASTER=eb...
```

Para dispositivos adicionales, edita `lib/devices.ts`.

---

## Paso 3: Despliegue en Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy interactivo
cd jarvis-backend
vercel

# O vía GitHub (CI/CD automático):
git init
git add .
git commit -m "feat: jarvis initial setup"
gh repo create jarvis-backend --private --source=. --push
# Luego conecta el repo en https://vercel.com/new
# e inyecta las variables de entorno en el panel de Vercel
```

---

## Paso 4: Configurar Tasker en el Moto G5

### Apps requeridas
- **Tasker** (~$3 USD en Play Store)
- **AutoVoice** (plugin de Tasker, gratuito)

### Perfil en Tasker

**TRIGGER:** Evento → Plugin → AutoVoice Recognized → Filtro: `Jarvis`

**ACCIÓN 1 — Guardar comando:**
```
Variable Set: %comando = %avcommandfull
```

**ACCIÓN 2 — Petición HTTP:**
```
HTTP Request
  Método:  POST
  URL:     https://tu-proyecto.vercel.app/api/jarvis
  Headers: Content-Type:application/json
           X-Jarvis-Secret:tu_secreto
  Body:    {"query": "%comando"}
  Output File: /sdcard/jarvis_audio.flac
```

**ACCIÓN 3 — Reproducir audio:**
```
Audio → Music Play
  File: /sdcard/jarvis_audio.flac
```

---

## Paso 5: Keep-Alive Anti-Cold-Start

### Opción A: GitHub Actions (gratis, recomendado)

1. Sube el código a GitHub:
```bash
gh repo create jarvis-backend --private --source=. --push
```
2. Ve a **Settings → Secrets → Actions** y añade:
   - `JARVIS_APP_URL` = `https://tu-proyecto.vercel.app`
   - `JARVIS_API_SECRET` = tu secreto

El workflow `.github/workflows/keep-alive.yml` hace ping cada 10 minutos automáticamente.

### Opción B: cron-job.org
- URL: `https://tu-proyecto.vercel.app/api/jarvis`
- Método: `GET`
- Header: `X-Jarvis-Secret: tu_secreto`
- Intervalo: cada 10 minutos

---

## Pruebas con curl

```bash
# Verificar sistema online
curl https://tu-proyecto.vercel.app/api/jarvis

# Comando de conversación
curl -X POST https://tu-proyecto.vercel.app/api/jarvis \
  -H "Content-Type: application/json" \
  -H "X-Jarvis-Secret: tu_secreto" \
  -d '{"query": "hola jarvis"}' \
  --output respuesta.flac && aplay respuesta.flac

# Controlar dispositivo
curl -X POST https://tu-proyecto.vercel.app/api/jarvis \
  -H "Content-Type: application/json" \
  -H "X-Jarvis-Secret: tu_secreto" \
  -d '{"query": "enciende la luz de la sala"}' \
  --output respuesta.flac && aplay respuesta.flac

# Listar dispositivos
curl https://tu-proyecto.vercel.app/api/devices \
  -H "X-Jarvis-Secret: tu_secreto"
```

---

## Solución de Problemas

| Síntoma | Causa | Solución |
|---------|-------|----------|
| `401 No autorizado` | Secret incorrecto | Verificar `JARVIS_API_SECRET` en Vercel |
| Audio en silencio | Modelo HF cargando | Esperar 30s (el modelo se calienta automáticamente) |
| `Tuya auth failed` | Credenciales incorrectas | Revisar CLIENT_ID/SECRET y región TUYA_BASE_URL |
| Gemini no responde | API Key inválida | Verificar en Google AI Studio |
| Cold Start lento | Keep-alive sin configurar | Activar GitHub Action |
| Dispositivo no encontrado | Device ID incorrecto | Verificar en Tuya Cloud Console |

---

## Estructura del Proyecto

```
jarvis-backend/
├── app/
│   ├── api/
│   │   ├── jarvis/route.ts      ← Endpoint principal
│   │   └── devices/route.ts     ← Gestión de dispositivos
│   ├── globals.css              ← Diseño dark/sci-fi
│   ├── layout.tsx
│   └── page.tsx                 ← Dashboard web
├── lib/
│   ├── gemini.ts                ← NLP + Structured Outputs
│   ├── tts.ts                   ← TTS via Hugging Face
│   ├── tuya.ts                  ← Tuya IoT API
│   ├── devices.ts               ← Registro de dispositivos
│   └── actions.ts               ← Ejecutor de acciones IoT
├── .github/workflows/
│   └── keep-alive.yml           ← Ping anti-cold-start
├── .env.local                   ← Credenciales privadas
├── .env.example                 ← Plantilla
└── vercel.json                  ← Configuración Vercel
```

---

## Desarrollo Local

```bash
cd jarvis-backend
cp .env.example .env.local
# editar .env.local con tus keys reales
npm run dev
# → Dashboard en http://localhost:3000
```
