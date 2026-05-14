/**
 * lib/devices.ts
 * Registro central de dispositivos IoT del hogar.
 *
 * INSTRUCCIONES DE CONFIGURACIÓN:
 * 1. Abre la app Smart Life en tu teléfono.
 * 2. En Tuya Developer Console → Cloud → tu proyecto → Devices, 
 *    copia el Device ID de cada dispositivo.
 * 3. Reemplaza los valores "REEMPLAZAR_CON_..." con los IDs reales.
 */

export interface DeviceConfig {
  id: string;
  name: string;
  type: "light" | "switch" | "ir_blaster" | "tv";
  aliases: string[]; // Nombres que Jarvis puede usar para identificar el dispositivo
}

/**
 * Mapa de dispositivos de tu hogar.
 * Añade o modifica entradas según tus dispositivos reales.
 */
export const DEVICES: Record<string, DeviceConfig> = {
  // Luces
  luz_sala: {
    id: process.env.DEVICE_LUZ_SALA || "REEMPLAZAR_CON_DEVICE_ID",
    name: "Luz de la Sala",
    type: "light",
    aliases: ["luz sala", "luz de la sala", "sala", "living"],
  },
  luz_recamara: {
    id: process.env.DEVICE_LUZ_RECAMARA || "REEMPLAZAR_CON_DEVICE_ID",
    name: "Luz de la Recámara",
    type: "light",
    aliases: ["luz cuarto", "luz recámara", "cuarto", "recámara", "dormitorio"],
  },
  luz_cocina: {
    id: process.env.DEVICE_LUZ_COCINA || "REEMPLAZAR_CON_DEVICE_ID",
    name: "Luz de la Cocina",
    type: "light",
    aliases: ["luz cocina", "cocina"],
  },

  // Enchufes inteligentes
  enchufe_tv: {
    id: process.env.DEVICE_ENCHUFE_TV || "REEMPLAZAR_CON_DEVICE_ID",
    name: "Enchufe del Televisor",
    type: "switch",
    aliases: ["enchufe tv", "enchufe televisor", "corriente tv"],
  },

  // IR Blaster (controla Fire TV, Roku, AC, etc.)
  ir_blaster: {
    id: process.env.DEVICE_IR_BLASTER || "REEMPLAZAR_CON_DEVICE_ID",
    name: "Control Infrarrojo",
    type: "ir_blaster",
    aliases: ["fire tv", "roku", "televisor", "tv", "control remoto"],
  },
};

/**
 * Encuentra un dispositivo en el registro usando cualquiera de sus aliases.
 */
export function findDeviceByAlias(
  query: string
): DeviceConfig | undefined {
  const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  for (const device of Object.values(DEVICES)) {
    for (const alias of device.aliases) {
      const normalizedAlias = alias
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      if (q.includes(normalizedAlias)) {
        return device;
      }
    }
  }

  return undefined;
}

/**
 * Mapeo de comandos de voz IR para Fire TV / Roku.
 * Estos códigos deben configurarse en el IR Blaster de Tuya
 * usando la app Smart Life → Aprender códigos IR.
 */
export const IR_COMMANDS: Record<string, string> = {
  encender: "power",
  apagar: "power",
  netflix: "netflix",
  prime: "prime_video",
  youtube: "youtube",
  subir_volumen: "vol_up",
  bajar_volumen: "vol_down",
  silencio: "mute",
  pausa: "play_pause",
  reproducir: "play_pause",
  inicio: "home",
  regresar: "back",
  arriba: "dpad_up",
  abajo: "dpad_down",
  izquierda: "dpad_left",
  derecha: "dpad_right",
  seleccionar: "enter",
};

/**
 * Encuentra el código IR correspondiente a una acción de voz.
 */
export function findIRCommand(action: string): string | undefined {
  const normalized = action
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  for (const [key, value] of Object.entries(IR_COMMANDS)) {
    if (normalized.includes(key)) return value;
  }

  return undefined;
}
