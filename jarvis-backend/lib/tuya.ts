/**
 * lib/tuya.ts
 * Cliente para la Tuya IoT Cloud API.
 * Maneja autenticación HMAC-SHA256, tokens de acceso y envío de comandos.
 */

import { createHmac } from "crypto";

const BASE_URL = process.env.TUYA_BASE_URL || "https://openapi.tuyaus.com";
const CLIENT_ID = process.env.TUYA_CLIENT_ID!;
const CLIENT_SECRET = process.env.TUYA_CLIENT_SECRET!;

interface TuyaToken {
  access_token: string;
  expire_time: number;
  refresh_token: string;
  uid: string;
}

interface TuyaTokenCache {
  token: TuyaToken;
  fetchedAt: number;
}

// Cache simple en memoria (funciona dentro del mismo proceso Edge)
let tokenCache: TuyaTokenCache | null = null;

/** Genera la firma HMAC-SHA256 requerida por Tuya */
function sign(
  clientId: string,
  secret: string,
  timestamp: string,
  accessToken: string,
  method: string,
  path: string,
  body: string = ""
): string {
  const bodyHash = require("crypto")
    .createHash("sha256")
    .update(body)
    .digest("hex");

  const stringToSign = [method, bodyHash, "", path].join("\n");
  const signStr = clientId + accessToken + timestamp + stringToSign;

  return createHmac("sha256", secret)
    .update(signStr)
    .digest("hex")
    .toUpperCase();
}

/** Obtiene o refresca el token de acceso de Tuya */
export async function getTuyaAccessToken(): Promise<string> {
  const now = Date.now();

  // Si el token en caché aún es válido (con 60s de margen), lo reutilizamos
  if (
    tokenCache &&
    now < tokenCache.fetchedAt + (tokenCache.token.expire_time - 60) * 1000
  ) {
    return tokenCache.token.access_token;
  }

  const timestamp = now.toString();
  const method = "GET";
  const path = "/v1.0/token?grant_type=1";
  const signature = sign(CLIENT_ID, CLIENT_SECRET, timestamp, "", method, path);

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      client_id: CLIENT_ID,
      sign: signature,
      t: timestamp,
      sign_method: "HMAC-SHA256",
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Tuya auth error: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(`Tuya auth failed: ${data.msg || JSON.stringify(data)}`);
  }

  tokenCache = {
    token: data.result,
    fetchedAt: now,
  };

  return data.result.access_token;
}

/** Interfaz para un comando Tuya */
export interface TuyaCommand {
  code: string;
  value: boolean | string | number;
}

/**
 * Envía comandos a un dispositivo Tuya específico.
 * @param deviceId - ID del dispositivo en Tuya
 * @param commands - Array de comandos a ejecutar
 */
export async function sendTuyaCommand(
  deviceId: string,
  commands: TuyaCommand[]
): Promise<{ success: boolean; message: string }> {
  try {
    const accessToken = await getTuyaAccessToken();
    const timestamp = Date.now().toString();
    const method = "POST";
    const path = `/v1.0/iot-03/devices/${deviceId}/commands`;
    const body = JSON.stringify({ commands });

    const signature = sign(
      CLIENT_ID,
      CLIENT_SECRET,
      timestamp,
      accessToken,
      method,
      path,
      body
    );

    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        client_id: CLIENT_ID,
        access_token: accessToken,
        sign: signature,
        t: timestamp,
        sign_method: "HMAC-SHA256",
        "Content-Type": "application/json",
      },
      body,
    });

    const data = await response.json();

    if (!data.success) {
      console.error("Tuya command failed:", data);
      return {
        success: false,
        message: `Error al controlar dispositivo: ${data.msg}`,
      };
    }

    return { success: true, message: "Dispositivo controlado correctamente" };
  } catch (error) {
    console.error("Tuya sendCommand error:", error);
    return {
      success: false,
      message: `Error de conexión con Tuya: ${(error as Error).message}`,
    };
  }
}

/**
 * Obtiene el estado actual de un dispositivo Tuya.
 */
export async function getTuyaDeviceStatus(
  deviceId: string
): Promise<{ success: boolean; status?: Record<string, unknown> }> {
  try {
    const accessToken = await getTuyaAccessToken();
    const timestamp = Date.now().toString();
    const method = "GET";
    const path = `/v1.0/iot-03/devices/${deviceId}/status`;

    const signature = sign(
      CLIENT_ID,
      CLIENT_SECRET,
      timestamp,
      accessToken,
      method,
      path
    );

    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        client_id: CLIENT_ID,
        access_token: accessToken,
        sign: signature,
        t: timestamp,
        sign_method: "HMAC-SHA256",
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return { success: data.success, status: data.result };
  } catch (error) {
    return { success: false };
  }
}

/**
 * Acceso directo: enciende o apaga un foco/enchufe.
 */
export async function toggleLight(
  deviceId: string,
  turnOn: boolean
): Promise<{ success: boolean; message: string }> {
  return sendTuyaCommand(deviceId, [{ code: "switch_led", value: turnOn }]);
}

/**
 * Acceso directo: cambia el brillo de un foco (0-1000).
 */
export async function setBrightness(
  deviceId: string,
  brightness: number
): Promise<{ success: boolean; message: string }> {
  const clamped = Math.max(0, Math.min(1000, brightness));
  return sendTuyaCommand(deviceId, [
    { code: "bright_value_v2", value: clamped },
  ]);
}

/**
 * Acceso directo: enciende o apaga un enchufe inteligente.
 */
export async function toggleSwitch(
  deviceId: string,
  turnOn: boolean
): Promise<{ success: boolean; message: string }> {
  return sendTuyaCommand(deviceId, [{ code: "switch_1", value: turnOn }]);
}

/**
 * Acceso directo: envía un comando IR mapeado (para Fire TV / Roku).
 * @param irDeviceId - ID del blaster IR en Tuya
 * @param irCode - Código IR del botón (ej: "power", "netflix", "vol_up")
 */
export async function sendIRCommand(
  irDeviceId: string,
  irCode: string
): Promise<{ success: boolean; message: string }> {
  return sendTuyaCommand(irDeviceId, [
    { code: "ir_send", value: irCode },
  ]);
}
