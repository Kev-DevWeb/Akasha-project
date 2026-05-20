/**
 * app/api/devices/route.ts
 * Endpoint de gestión de dispositivos.
 * 
 * GET /api/devices - Lista todos los dispositivos registrados
 * POST /api/devices/command - Envía un comando directo a un dispositivo
 */

import { NextRequest, NextResponse } from "next/server";
import { DEVICES } from "@/lib/devices";
import { sendTuyaCommand, TuyaCommand } from "@/lib/tuya";

export const runtime = "nodejs";

function checkAuth(request: NextRequest): boolean {
  const apiSecret = process.env.AKASHA_API_SECRET || process.env.JARVIS_API_SECRET;
  if (!apiSecret || apiSecret === "change_me_with_a_random_secret_key") {
    return true; // Sin protección en modo dev
  }
  const providedSecret =
    request.headers.get("X-Akasha-Secret") || request.headers.get("X-Jarvis-Secret");
  return providedSecret === apiSecret;
}

/**
 * GET - Listar todos los dispositivos configurados
 */
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const deviceList = Object.entries(DEVICES).map(([key, device]) => ({
    key,
    name: device.name,
    type: device.type,
    aliases: device.aliases,
    configured: !device.id.includes("REEMPLAZAR"),
  }));

  return NextResponse.json({
    devices: deviceList,
    total: deviceList.length,
    configured: deviceList.filter((d) => d.configured).length,
  });
}

/**
 * POST - Enviar comando directo a un dispositivo por su clave
 * Body: { "deviceKey": "luz_sala", "commands": [{ "code": "switch_led", "value": true }] }
 */
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { deviceKey, commands } = body as {
    deviceKey: string;
    commands: TuyaCommand[];
  };

  const device = DEVICES[deviceKey];
  if (!device) {
    return NextResponse.json(
      { error: `Dispositivo '${deviceKey}' no encontrado` },
      { status: 404 }
    );
  }

  if (device.id.includes("REEMPLAZAR")) {
    return NextResponse.json(
      { error: `El dispositivo '${deviceKey}' no está configurado` },
      { status: 422 }
    );
  }

  const result = await sendTuyaCommand(device.id, commands);
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
