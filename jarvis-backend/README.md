# 🤖 Proyecto Akasha — Guía de Implementación Completa

> Sistema de asistente doméstico inteligente serverless · Gemini 2.5 Flash + Tuya IoT + HF TTS
> Cliente Web PWA Autocontenido para Honor 8A (y otros dispositivos Android)

---

## Arquitectura del Sistema

```
         Honor 8A (PWA Web Client en Chrome / Fully Kiosk)
         - Escucha continua local ("Akasha")
         - Pantalla Activa (Wake Lock) + Beeps (Web Audio API)
                             │
                             │  POST /api/akasha {"query": "..."}
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
         Honor 8A reproduce el audio y actualiza la pantalla
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
| `TUYA_BASE_URL` | Región correspondiente (ej: `https://openapi.tuyaus.com`) |
| `AKASHA_API_SECRET` | Secreto aleatorio (ej. `openssl rand -hex 32`) |
| `NEXT_PUBLIC_APP_URL` | URL de tu despliegue (para logs y pings) |

---

## Paso 2: Configurar Device IDs de Tuya

1. Abre [Tuya Developer Console](https://iot.tuya.com) → Cloud → tu Proyecto → Devices.
2. Copia el **Device ID** de cada dispositivo.
3. Añádelos a tu archivo `.env.local`:

```bash
DEVICE_LUZ_SALA=eb...
DEVICE_LUZ_RECAMARA=eb...
DEVICE_LUZ_COCINA=eb...
DEVICE_ENCHUFE_TV=eb...
DEVICE_IR_BLASTER=eb...
```

Para añadir más dispositivos, edita el registro central en `lib/devices.ts`.

---

## Paso 3: Despliegue en Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Desplegar en la carpeta jarvis-backend
cd jarvis-backend
vercel

# O vía GitHub (CI/CD automático):
git init
git add .
git commit -m "feat: akasha client pwa update"
gh repo create jarvis-backend --private --source=. --push
# Luego conecta tu repositorio en https://vercel.com/new
# y añade tus Variables de Entorno en el panel de Vercel.
```

---

## Paso 4: Configurar e Instalar PWA en el Honor 8A

Consulta la guía detallada de configuración física y de sistema en [HONOR_8A_CONFIG.md](file:///home/gatoestirado/Documents/Project-Jarvis/Akasha-project/jarvis-backend/context/HONOR_8A_CONFIG.md).

1. **Instalar**: Abre el navegador **Chrome** en tu Honor 8A y ve a la URL de tu despliegue de Vercel.
2. **Añadir a la pantalla de inicio**: Pulsa el menú del navegador y selecciona **"Instalar aplicación"** o **"Añadir a la pantalla de inicio"**. Esto creará un acceso directo en tu escritorio que se abre a pantalla completa.
3. **Autenticar**: Abre la app instalada, ve a la pestaña **Consola** (barra inferior) e introduce tu `X-Akasha-Secret` para desbloquear el control de dispositivos y el envío de consultas.
4. **Permisos**: Activa **"Escucha Manos Libres"** y concede permanentemente el permiso de micrófono al navegador.
5. **Wake Lock**: Verás que el indicador de Wake Lock se activa en verde. Mantén el teléfono conectado a la corriente y la pantalla no se atenuará ni se suspenderá la escucha de voz.

---

## Paso 5: Keep-Alive Anti-Cold-Start

Para evitar la latencia del primer arranque de funciones serverless de Vercel (Cold Starts), mantén la app caliente:

### Opción A: GitHub Actions (Automático y Gratis)
El repositorio incluye el workflow `.github/workflows/keep-alive.yml` que hace pings GET automáticos cada 10 minutos. Configura en **Settings → Secrets → Actions** de tu repositorio:
- `AKASHA_APP_URL` = La URL de tu app en Vercel.
- `AKASHA_API_SECRET` = Tu contraseña secreta.

### Opción B: cron-job.org
- Crea un cron gratuito apuntando a: `https://tu-proyecto.vercel.app/api/akasha`
- Método: `GET`
- Header: `X-Akasha-Secret: tu_secreto`
- Frecuencia: Cada 10 minutos.

---

## Desarrollo Local

```bash
cd jarvis-backend
npm install
npm run dev
# Abre http://localhost:3000 para probar la PWA e interactuar por voz o mandos rápidos.
```
