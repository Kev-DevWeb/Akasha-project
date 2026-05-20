# 🤖 Proyecto Akasha — Documentación Completa

> **Última actualización:** 20 de mayo de 2026
> **Versión:** 2.0.0

---

## 1. Descripción General

Akasha es un **asistente de hogar inteligente serverless** que convierte un Honor 8A (o cualquier dispositivo Android viejo) en una **pantalla inteligente y dispositivo de escucha permanente**. La interfaz web corre como una Progressive Web App (PWA) con la pantalla encendida continuamente (Wake Lock). El dispositivo:

1. Escucha permanentemente la palabra de activación: `"Akasha"`.
2. Emite sonidos de confirmación (chimes) generados localmente al activarse, procesarse y fallar.
3. Envía el comando de voz capturado a la API en Vercel.
4. Analiza la intención con **Google Gemini 2.5 Flash** (Structured Outputs).
5. Ejecuta la acción IoT vía **Tuya Cloud API** (luces, enchufes) o el **IR Blaster** (TV, Roku, Fire TV).
6. Genera la respuesta en audio mediante **Hugging Face TTS** y la reproduce en el dispositivo.
7. Muestra burbujas de diálogo, un reloj digital y un grid de control táctil en tiempo real con control remoto virtual para TV.

---

## 2. Tecnologías Utilizadas

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|-----------|
| **Framework** | Next.js (App Router) | 16.2.6 | Backend serverless + Dashboard web PWA |
| **Runtime** | Node.js | 24.15.0 | Ejecución de funciones en Vercel |
| **Lenguaje** | TypeScript | 5.x | Tipado estático en todo el proyecto |
| **LLM / NLP** | Google Gemini 2.5 Flash | — | Clasificación de intenciones + respuestas |
| **SDK Gemini** | @google/genai | latest | Structured Outputs con JSON Schema |
| **TTS** | Hugging Face Inference API | — | Síntesis de voz (facebook/mms-tts-spa) |
| **SDK HF** | @huggingface/inference | latest | Cliente para modelos de HF |
| **IoT** | Tuya Cloud API v1.0 | — | Control de focos, enchufes e IR blaster |
| **Cliente PWA** | Web Speech API + Wake Lock | Nivel Web | Escucha continua hands-free + pantalla encendida |
| **Sonidos** | Web Audio API | Nivel Web | Síntesis local offline de tonos/chimes |
| **Diseño** | CSS vanilla + Orbitron/Inter | — | UI dark sci-fi tipo Iron Man con pestañas y Kiosk Hub |

---

## 3. Arquitectura del Sistema

```
┌──────────────────────────────────────────────┐
│         Honor 8A (PWA Web Client)              │
│       - Pantalla Siempre Activa (Wake Lock)  │
│       - Reloj + Grid de Dispositivos + Chat  │
│       - Escucha Hands-Free ("Akasha")        │
└──────────┬───────────────────────────────────┘
           │ POST /api/akasha (Query de voz)
           ▼
┌─────────────────────────────────────────────┐
│  Vercel — Next.js App Router                │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ 1. Autenticación (X-Akasha-Secret)  │    │
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
│  │    → IR Blaster (TV/Roku/Fire TV)   │    │
│  └──────────┬──────────────────────────┘    │
│             ▼                               │
│  ┌─────────────────────────────────────┐    │
│  │ 4. Hugging Face TTS                 │    │
│  │    → facebook/mms-tts-spa           │    │
│  │    → Buffer de audio (flac/wav)     │    │
│  └──────────┬──────────────────────────┘    │
│             │                               │
└─────────────┼───────────────────────────────┘
              │ Response: audio/flac + headers (Intento/Respuesta)
              ▼
┌──────────────────────────────────────────────┐
│  Honor 8A reproduce audio y actualiza chat  │
└──────────────────────────────────────────────┘
```

---

## 4. Estructura de Archivos

```
jarvis-backend/
├── app/
│   ├── api/
│   │   ├── akasha/route.ts        # Endpoint principal (POST = comando, GET = ping)
│   │   └── devices/route.ts       # CRUD de dispositivos IoT + control táctil
│   ├── globals.css                # Sistema de diseño dark/sci-fi
│   ├── layout.tsx                 # Layout raíz con PWA Metadata y Viewport
│   └── page.tsx                   # Dashboard interactivo PWA + Kiosk Hub
├── lib/
│   ├── gemini.ts                  # NLP con Gemini Structured Outputs
│   ├── tts.ts                     # TTS con fallback entre modelos HF
│   ├── tuya.ts                    # Cliente Tuya (auth HMAC + caché de tokens)
│   ├── devices.ts                 # Registro de dispositivos + aliases de voz
│   └── actions.ts                 # Dispatch de acciones según intención
├── public/
│   └── manifest.json              # Configuración PWA para instalación móvil
├── context/
│   ├── PROJECT_DOCUMENTATION.md   # Este archivo
│   ├── FIRE_TV_STICK_HD.md        # Guía de integración de Fire TV
│   └── HONOR_8A_CONFIG.md         # Guía de configuración física para Honor 8A
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

## 5. Detalles de la Implementación PWA

### 5.1 `public/manifest.json` — Archivo PWA
Establece las reglas para que el sistema EMUI del Honor 8A reconozca la aplicación web como instalable.

### 5.2 `app/layout.tsx` — Optimizaciones para Smart Display
- Vincula el archivo manifest y configura etiquetas de pantalla inmersiva para Akasha.

### 5.3 `app/page.tsx` — Panel Kiosk Inteligente
- **Screen Wake Lock**: Evita que el Honor 8A apague la pantalla o duerma los procesos de escucha.
- **Audio Chimes locales**: Utiliza la Web Audio API nativa para sintetizar beeps de estado.
- **Reconocimiento continuo y pausa**: Cancela temporalmente la escucha del micrófono al procesar o hablar para prevenir eco/bucles de voz de Akasha, reactivándolo automáticamente al terminar.
- **Controles táctiles e IR remoto**: Muestra un mando a distancia virtual para TV y streaming al pulsar sobre dispositivos IR.
- **Burbujas de Chat**: Formatea la conversación en estilo burbuja (cyan a la derecha para usuario, morado a la izquierda para Akasha).

---

## 6. Pasos para Poner en Marcha en el Honor 8A

### Paso 1 — Desplegar el Backend en Vercel
1. Despliega el proyecto en Vercel con tus credenciales correctas configuradas en `.env.local` (`GEMINI_API_KEY`, `AKASHA_API_SECRET`, etc.).
2. Asegúrate de configurar la variable `AKASHA_API_SECRET` con un secreto único.

### Paso 2 — Instalar la App en el Honor 8A
1. Abre **Google Chrome** en el Honor 8A y navega a la URL de tu backend.
2. Toca el menú de tres puntos de Chrome y selecciona **"Instalar aplicación"** o **"Añadir a la pantalla de inicio"**.
3. Abre la aplicación recién instalada desde el escritorio del teléfono.

### Paso 3 — Configurar la Autenticación y Escucha
1. Ve a la pestaña **Consola** (barra inferior).
2. Introduce tu token secreto en el campo `X-Akasha-Secret`.
3. Activa la casilla **"Activar Escucha Manos Libres"**.
4. Otorga permiso permanente para usar el micrófono.

### Paso 4 — Montaje y Uso (Hands-Free)
1. Coloca el Honor 8A en su soporte.
2. Di `"Akasha"`. El teléfono emitirá un doble beep agudo, indicando que el visualizador central pasó a modo de escucha activo.
3. Di tu comando de voz inmediatamente (ej. `"enciende la luz de la sala"`).

---

## 7. Pruebas Rápidas con curl

```bash
# Verificar status online
curl https://tu-app.vercel.app/api/akasha

# Comando directo al dispositivo táctil
curl -X POST https://tu-app.vercel.app/api/devices \
  -H "Content-Type: application/json" \
  -H "X-Akasha-Secret: tu_secreto" \
  -d '{"deviceKey": "luz_sala", "commands": [{"code": "switch_led", "value": true}]}'
```

---

## 8. Troubleshooting

| Problema | Causa Probable | Solución |
|----------|---------------|----------|
| La pantalla se apaga sola | Wake Lock bloqueado o no soportado | Revisa la guía en [HONOR_8A_CONFIG.md](file:///home/gatoestirado/Documents/Project-Jarvis/Akasha-project/jarvis-backend/context/HONOR_8A_CONFIG.md) |
| No responde a la voz | Micrófono sin permisos o suspendido | Concede permisos de micrófono de forma permanente en los ajustes de Chrome |
| El micrófono se apaga al hablar Akasha | Comportamiento correcto | El micrófono se silencia mientras Akasha habla para evitar eco y reacciona de nuevo automáticamente al terminar |
| Dispositivos no cargan en la pestaña Hogar | Secret incorrecto o nulo | Ve a la pestaña Consola y verifica que `X-Akasha-Secret` coincida exactamente con tu variable en Vercel |
| Audio TTS no se escucha en el primer comando | Bloqueo de reproducción del navegador | El navegador requiere al menos una interacción táctil del usuario (pulsar el botón de micro central) para habilitar el audio |
