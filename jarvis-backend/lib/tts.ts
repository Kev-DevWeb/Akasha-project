/**
 * lib/tts.ts
 * Motor de Síntesis de Voz (TTS) via Gemini 2.5 Flash TTS.
 * Usa la misma API key de Gemini — no requiere servicios externos adicionales.
 */

import { GoogleGenAI } from "@google/genai";

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

/**
 * Voces disponibles en Gemini TTS.
 * Referencia: https://ai.google.dev/gemini-api/docs/text-to-speech
 * 
 * Voces femeninas recomendadas para español:
 * - Aoede: Cálida, clara
 * - Kore: Joven, brillante  
 * - Leda: Suave, tranquila
 * 
 * Voces masculinas:
 * - Charon: Profunda
 * - Fenrir: Dinámica
 * - Puck: Neutral, versátil
 */
const VOICE_NAME = "Kore"; // Voz femenina joven — la más cercana al estilo de Akasha

/**
 * Genera el encabezado estándar RIFF de 44 bytes para un archivo WAV.
 * Gemini TTS devuelve PCM 16-bit a 24000 Hz.
 */
function createWavHeader(dataLength: number, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const buffer = Buffer.alloc(44);
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataLength, 40);

  return buffer;
}

/**
 * Convierte texto a audio usando Gemini 2.5 Flash TTS.
 * @param text - Texto a sintetizar en español
 * @returns Buffer de audio en formato WAV (PCM linear16)
 */
export async function textToSpeech(text: string): Promise<Buffer> {
  // Limitar el texto para evitar timeouts
  const trimmed = text.slice(0, 500);

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: trimmed,
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: VOICE_NAME,
            },
          },
        },
      },
    });

    // Extraer el audio de la respuesta
    const candidate = response.candidates?.[0];
    const part = candidate?.content?.parts?.[0];

    if (!part?.inlineData?.data) {
      throw new Error("Gemini TTS no devolvió datos de audio.");
    }

    // inlineData.data viene en base64 y es RAW PCM 16-bit 24kHz
    const rawAudioBuffer = Buffer.from(part.inlineData.data, "base64");

    if (rawAudioBuffer.length === 0) {
      throw new Error("El buffer de audio está vacío.");
    }

    // Agregar el encabezado WAV para que los navegadores lo puedan reproducir
    const wavHeader = createWavHeader(rawAudioBuffer.length);
    const finalWavBuffer = Buffer.concat([wavHeader, rawAudioBuffer]);

    return finalWavBuffer;
  } catch (error) {
    console.error("Error en Gemini TTS:", (error as Error).message);
    throw error;
  }
}

/**
 * Determina el Content-Type correcto según los datos de audio.
 * Gemini TTS devuelve audio con mimeType en la respuesta,
 * pero como fallback detectamos por magic bytes.
 */
export function detectAudioContentType(buffer: Buffer): string {
  if (buffer.length < 4) return "audio/wav";

  // WAV/RIFF: 0x52494646
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    return "audio/wav";
  }
  // FLAC: 0x664C6143
  if (buffer[0] === 0x66 && buffer[1] === 0x4c && buffer[2] === 0x61 && buffer[3] === 0x43) {
    return "audio/flac";
  }
  // MP3: 0xFF 0xFB o 0xFF 0xF3 o ID3
  if (buffer[0] === 0xff && (buffer[1] === 0xfb || buffer[1] === 0xf3)) {
    return "audio/mpeg";
  }
  if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
    return "audio/mpeg";
  }
  // OGG: 0x4F676753
  if (buffer[0] === 0x4f && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) {
    return "audio/ogg";
  }

  // Gemini TTS devuelve PCM linear16 en formato WAV por defecto
  return "audio/wav";
}
