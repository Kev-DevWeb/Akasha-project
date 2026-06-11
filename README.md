# Akasha 🌐✨
> Asistente personal inteligente con búsqueda web en tiempo real, potenciado por Gemini AI

[![Next.js](https://img.shields.io/badge/Next.js-black?logo=next.js)](https://nextjs.org/)
[![Gemini AI](https://img.shields.io/badge/Gemini-AI-blue?logo=google)](https://aistudio.google.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com)

## ✨ Características

- 💬 **Chat conversacional**: Diálogo natural con memoria de contexto en la conversación
- 🔍 **Búsqueda web en tiempo real**: Akasha consulta la web para darte respuestas actualizadas
- ⚡ **Respuestas rápidas**: Interfaz optimizada con streaming de respuestas
- 🌙 **Diseño limpio**: UI minimalista pensada para uso diario

## 🛠️ Stack

- **Frontend**: Next.js (App Router) + React + Tailwind CSS
- **IA**: Google Gemini AI
- **Hosting**: Vercel

## 🚀 Instalación

```bash
git clone https://github.com/TU_USUARIO/akasha.git
cd akasha
npm install
```

Crea un archivo `.env.local` en la raíz:

```env
GEMINI_API_KEY=tu_api_key
```

> Obtén tu API Key en [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

```bash
npm run dev  # http://localhost:3000
```

## 🔐 Seguridad

- La API Key de Gemini se expone únicamente en el servidor mediante API Routes
- Ninguna credencial se filtra al cliente

## 📄 Licencia

Proyecto privado — Todos los derechos reservados
