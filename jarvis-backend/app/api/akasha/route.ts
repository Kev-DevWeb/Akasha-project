/**
 * app/api/akasha/route.ts
 * Endpoint principal de Akasha.
 *
 * POST /api/akasha
 * Body: { "query": "enciende la luz de la sala" }
 * Headers: { "X-Akasha-Secret": "tu_secret_key" }  (opcional pero recomendado)
 *
 * Response: audio/mpeg o audio/flac con la respuesta de Akasha
 *
 * GET /api/akasha (Keep-Alive ping)
 * Response: { "status": "ok", "message": "Akasha online" }
 */

import { NextRequest, NextResponse } from "next/server";
import { analyzeCommand } from "@/lib/gemini";
import { executeAction } from "@/lib/actions";
import { textToSpeech, detectAudioContentType } from "@/lib/tts";

export const runtime = "nodejs"; // Usar Node.js runtime (no Edge) para mayor compatibilidad con crypto

/**
 * GET - Keep-Alive ping para prevenir cold starts
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      message: "Akasha online",
      timestamp: new Date().toISOString(),
      version: "2.0.0",
    },
    { status: 200 }
  );
}

/**
 * OPTIONS - Preflight CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Akasha-Secret, X-Jarvis-Secret",
    },
  });
}

/**
 * POST - Procesa el comando de voz del usuario
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ── 1. Autenticación opcional por header secreto ──────────────────────
    const apiSecret = process.env.AKASHA_API_SECRET || process.env.JARVIS_API_SECRET;
    if (apiSecret && apiSecret !== "change_me_with_a_random_secret_key") {
      const providedSecret =
        request.headers.get("X-Akasha-Secret") || request.headers.get("X-Jarvis-Secret");
      if (providedSecret !== apiSecret) {
        console.warn(
          `[Auth] Acceso no autorizado. Esperado: ${apiSecret ? apiSecret.slice(0, 5) + "..." : "vacío"}, Recibido: ${providedSecret ? providedSecret.slice(0, 5) + "..." : "vacío"}`
        );
        return NextResponse.json(
          { error: "No autorizado" },
          { status: 401 }
        );
      }
    }

    // ── 2. Parsear el body ────────────────────────────────────────────────
    let body: { query?: string; history?: Array<{role: "user" | "model", text: string}> };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Body inválido. Se esperaba JSON con el campo 'query'." },
        { status: 400 }
      );
    }

    const { query, history = [] } = body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json(
        { error: "El campo 'query' es requerido y no puede estar vacío." },
        { status: 400 }
      );
    }

    console.log(`[Akasha] Query recibida: "${query.slice(0, 100)}"`);

    // ── 3. Analizar intención con Gemini ──────────────────────────────────
    const analysis = await analyzeCommand(query.trim(), history);
    console.log(`[Akasha] Intención detectada: ${analysis.intencion}`, {
      accion: analysis.accion,
    });

    // ── 4. Ejecutar acción IoT si corresponde ─────────────────────────────
    let finalResponseText = analysis.respuesta_texto;

    if (analysis.intencion === "ejecutar_accion" && analysis.accion) {
      const actionResult = await executeAction(analysis);
      finalResponseText = actionResult.responseText;

      if (!actionResult.success) {
        console.warn("[Akasha] Acción fallida:", finalResponseText);
      }
    }

    console.log(`[Akasha] Respuesta: "${finalResponseText}"`);

    // ── 5. Generar audio con TTS ──────────────────────────────────────────
    const audioBuffer = await textToSpeech(finalResponseText);
    const contentType = detectAudioContentType(audioBuffer);

    const elapsed = Date.now() - startTime;
    console.log(`[Akasha] Completado en ${elapsed}ms. Audio: ${contentType}`);

    // ── 6. Retornar el audio al cliente ────────────────────────────────
    const audioBytes = new Uint8Array(audioBuffer);
    return new NextResponse(audioBytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": audioBytes.byteLength.toString(),
        "X-Akasha-Latency-Ms": elapsed.toString(),
        "X-Akasha-Intent": analysis.intencion,
        "X-Akasha-Response-Text": encodeURIComponent(finalResponseText),
        // Fallback para retrocompatibilidad
        "X-Jarvis-Latency-Ms": elapsed.toString(),
        "X-Jarvis-Intent": analysis.intencion,
        "X-Jarvis-Response-Text": encodeURIComponent(finalResponseText),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const err = error as Error;
    console.error("[Akasha] Error crítico:", err);

    // Intentar devolver un audio de error en lugar de JSON
    try {
      const errorAudio = await textToSpeech(
        "Lo siento, ocurrió un error en el sistema. Por favor intente de nuevo."
      );
      const contentType = detectAudioContentType(errorAudio);
      const errorBytes = new Uint8Array(errorAudio);
      return new NextResponse(errorBytes, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "X-Akasha-Error": encodeURIComponent(err.message),
          "X-Jarvis-Error": encodeURIComponent(err.message),
        },
      });
    } catch {
      // Si hasta el audio de error falla, devolver JSON de error
      return NextResponse.json(
        {
          error: "Error interno del servidor",
          details:
            process.env.NODE_ENV === "development" ? err.message : undefined,
        },
        { status: 500 }
      );
    }
  }
}
