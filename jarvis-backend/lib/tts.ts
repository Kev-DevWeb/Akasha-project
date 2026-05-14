/**
 * lib/tts.ts
 * Motor de Síntesis de Voz (TTS) usando Microsoft Edge TTS.
 * Es 100% gratuito, sin límites de cuota y no requiere API Keys.
 */

import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

// DaliaNeural es una voz femenina mexicana, excelente para Akasha
const VOICE_NAME = "es-MX-DaliaNeural";

/**
 * Convierte texto a audio usando Edge TTS.
 * @param text - Texto a sintetizar en español
 * @returns Buffer de audio en formato MP3
 */
export async function textToSpeech(text: string): Promise<Buffer> {
  const tts = new MsEdgeTTS();

  // Configuramos el motor de Edge TTS para devolver un MP3 de buena calidad
  await tts.setMetadata(VOICE_NAME, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  // Generamos el flujo de audio
  const { audioStream } = tts.toStream(text);

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    audioStream.on("data", (chunk) => {
      chunks.push(Buffer.from(chunk));
    });

    audioStream.on("end", () => {
      const finalBuffer = Buffer.concat(chunks);
      if (finalBuffer.length === 0) {
        reject(new Error("El motor Edge TTS devolvió un audio vacío."));
      } else {
        resolve(finalBuffer);
      }
    });

    audioStream.on("error", (err) => {
      console.error("Error en Edge TTS:", err);
      reject(err);
    });
  });
}

/**
 * Determina el Content-Type correcto según los datos de audio.
 * Edge TTS en esta configuración siempre devuelve MP3.
 */
export function detectAudioContentType(buffer: Buffer): string {
  // Siempre devolvemos MP3
  return "audio/mpeg";
}
