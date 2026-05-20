/**
 * lib/gemini.ts
 * Motor de razonamiento con Google Gemini 2.5 Flash.
 * Usa Structured Outputs (JSON Schema) para clasificar intenciones.
 */

import { GoogleGenAI, Type } from "@google/genai";

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

/** Schema JSON para la respuesta estructurada de Gemini */
const AKASHA_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    intencion: {
      type: Type.STRING,
      enum: ["hablar", "ejecutar_accion"],
      description:
        "Tipo de intención detectada: 'hablar' para respuestas conversacionales, 'ejecutar_accion' para controlar dispositivos.",
    },
    respuesta_texto: {
      type: Type.STRING,
      description:
        "La respuesta de Akasha en español, concisa y natural, máx 150 palabras.",
    },
    accion: {
      type: Type.OBJECT,
      nullable: true,
      description:
        "Presente solo cuando intencion='ejecutar_accion'. Describe la acción a realizar.",
      properties: {
        tipo: {
          type: Type.STRING,
          enum: [
            "encender_luz",
            "apagar_luz",
            "encender_enchufe",
            "apagar_enchufe",
            "comando_ir",
            "ajustar_brillo",
          ],
          description: "Tipo específico de acción a ejecutar.",
        },
        dispositivo: {
          type: Type.STRING,
          description:
            "Nombre del dispositivo mencionado por el usuario (ej: 'sala', 'cocina', 'tv').",
        },
        valor: {
          type: Type.STRING,
          nullable: true,
          description:
            "Valor adicional: para brillo (0-100), para IR el comando (ej: 'netflix', 'vol_up').",
        },
      },
      required: ["tipo", "dispositivo"],
    },
  },
  required: ["intencion", "respuesta_texto"],
};

/** Sistema de personalidad de Akasha */
const SYSTEM_PROMPT = `Eres Akasha, un asistente de hogar inteligente para toda la familia que habla en español mexicano.
Estás instalada en una casa ubicada en: La Alborada, Cuautitlán, Calle Monte San Miguel mz22 lt 4 c2, Estado de México. Asume esta ubicación por defecto para el clima, tiendas cercanas o cualquier consulta local.
Eres elegante, sabia, respetuosa con todos los miembros de la familia y tienes un toque místico.
Tienes acceso a internet en tiempo real para buscar información, como el clima, noticias o datos curiosos.
Usa frases cortas y directas. Responde siempre en español.
Cuando algún miembro de la familia quiere controlar un dispositivo del hogar (luces, enchufes, televisor), clasifica la intención como 'ejecutar_accion'.
Para todo lo demás (preguntas, clima, conversación, información), usa 'hablar'.
Actúa siempre como Akasha, no menciones que eres una IA, y responde con naturalidad a cualquier pregunta.

REGLA ESTRICTA: Tu respuesta DEBE ser ÚNICAMENTE un objeto JSON válido, sin bloques de código markdown, con la exacta siguiente estructura:
{
  "intencion": "hablar" o "ejecutar_accion",
  "respuesta_texto": "La respuesta hablada de Akasha al usuario",
  "accion": {
    "tipo": "encender_luz" | "apagar_luz" | "encender_enchufe" | "apagar_enchufe" | "comando_ir" | "ajustar_brillo",
    "dispositivo": "nombre del dispositivo",
    "valor": "valor opcional"
  } // (accion solo debe existir si intencion es ejecutar_accion)
}`;

export interface AkashaAnalysis {
  intencion: "hablar" | "ejecutar_accion";
  respuesta_texto: string;
  accion?: {
    tipo:
      | "encender_luz"
      | "apagar_luz"
      | "encender_enchufe"
      | "apagar_enchufe"
      | "comando_ir"
      | "ajustar_brillo";
    dispositivo: string;
    valor?: string;
  };
}

/**
 * Analiza el comando del usuario con Gemini 2.5 Flash.
 * @param userQuery - El texto que dijo el usuario (después de "Akasha")
 * @param conversationHistory - Historial opcional para contexto
 */
export async function analyzeCommand(
  userQuery: string,
  conversationHistory: Array<{ role: "user" | "model"; text: string }> = []
): Promise<AkashaAnalysis> {
  // Construir el historial de conversación si existe
  const contents = [
    ...conversationHistory.map((h) => ({
      role: h.role,
      parts: [{ text: h.text }],
    })),
    {
      role: "user" as const,
      parts: [{ text: userQuery }],
    },
  ];

  const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.7,
      maxOutputTokens: 512,
      tools: [{ googleSearch: {} }],
    },
  });

  let rawText = response.text;

  if (!rawText) {
    throw new Error("Gemini devolvió una respuesta vacía.");
  }

  // Limpiar markdown si el modelo lo añade accidentalmente
  rawText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

  console.log("Gemini Raw Response:", rawText);

  // Intentar parsear como JSON
  try {
    const parsed = JSON.parse(rawText) as AkashaAnalysis;
    if (parsed.intencion && parsed.respuesta_texto) {
      return parsed;
    }
  } catch {
    console.warn("Gemini no devolvió JSON estricto, usando texto plano.");
  }

  // Fallback: Si no es JSON, asumimos que es una respuesta conversacional
  return {
    intencion: "hablar",
    respuesta_texto: rawText,
  };
}
