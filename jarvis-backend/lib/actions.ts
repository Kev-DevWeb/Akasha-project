/**
 * lib/actions.ts
 * Ejecutor de acciones IoT.
 * Recibe la intención analizada por Gemini y la ejecuta en los dispositivos.
 */

import { JarvisAnalysis } from "./gemini";
import {
  toggleLight,
  setBrightness,
  toggleSwitch,
  sendIRCommand,
} from "./tuya";
import { findDeviceByAlias, findIRCommand, DEVICES } from "./devices";

export interface ActionResult {
  success: boolean;
  responseText: string;
}

/**
 * Ejecuta la acción IoT correspondiente basándose en el análisis de Gemini.
 */
export async function executeAction(
  analysis: JarvisAnalysis
): Promise<ActionResult> {
  if (analysis.intencion !== "ejecutar_accion" || !analysis.accion) {
    return {
      success: true,
      responseText: analysis.respuesta_texto,
    };
  }

  const { tipo, dispositivo, valor } = analysis.accion;

  switch (tipo) {
    case "encender_luz": {
      const device = findDeviceByAlias(dispositivo);
      if (!device) {
        return {
          success: false,
          responseText: `No encontré ningún dispositivo llamado "${dispositivo}" en el sistema.`,
        };
      }
      const result = await toggleLight(device.id, true);
      return {
        success: result.success,
        responseText: result.success
          ? analysis.respuesta_texto ||
            `${device.name} encendida, señor.`
          : `No pude encender ${device.name}. ${result.message}`,
      };
    }

    case "apagar_luz": {
      const device = findDeviceByAlias(dispositivo);
      if (!device) {
        return {
          success: false,
          responseText: `No encontré ningún dispositivo llamado "${dispositivo}".`,
        };
      }
      const result = await toggleLight(device.id, false);
      return {
        success: result.success,
        responseText: result.success
          ? analysis.respuesta_texto ||
            `${device.name} apagada.`
          : `No pude apagar ${device.name}. ${result.message}`,
      };
    }

    case "encender_enchufe": {
      const device = findDeviceByAlias(dispositivo);
      if (!device) {
        return {
          success: false,
          responseText: `No encontré el enchufe "${dispositivo}".`,
        };
      }
      const result = await toggleSwitch(device.id, true);
      return {
        success: result.success,
        responseText: result.success
          ? analysis.respuesta_texto || `${device.name} encendido.`
          : `Error al encender ${device.name}: ${result.message}`,
      };
    }

    case "apagar_enchufe": {
      const device = findDeviceByAlias(dispositivo);
      if (!device) {
        return {
          success: false,
          responseText: `No encontré el enchufe "${dispositivo}".`,
        };
      }
      const result = await toggleSwitch(device.id, false);
      return {
        success: result.success,
        responseText: result.success
          ? analysis.respuesta_texto || `${device.name} apagado.`
          : `Error al apagar ${device.name}: ${result.message}`,
      };
    }

    case "ajustar_brillo": {
      const device = findDeviceByAlias(dispositivo);
      if (!device) {
        return {
          success: false,
          responseText: `No encontré el dispositivo "${dispositivo}" para ajustar el brillo.`,
        };
      }
      // Convertir porcentaje (0-100) a escala Tuya (0-1000)
      const percentage = parseInt(valor || "50", 10);
      const tuyaBrightness = Math.round((percentage / 100) * 1000);
      const result = await setBrightness(device.id, tuyaBrightness);
      return {
        success: result.success,
        responseText: result.success
          ? analysis.respuesta_texto ||
            `Brillo de ${device.name} ajustado al ${percentage}%.`
          : `Error al ajustar brillo: ${result.message}`,
      };
    }

    case "comando_ir": {
      const irDevice = DEVICES.ir_blaster;
      if (!irDevice || irDevice.id.includes("REEMPLAZAR")) {
        return {
          success: false,
          responseText:
            "El control infrarrojo no está configurado. Configure DEVICE_IR_BLASTER en las variables de entorno.",
        };
      }

      // Buscar el código IR correspondiente
      const irCode =
        findIRCommand(valor || dispositivo) ||
        findIRCommand(dispositivo);

      if (!irCode) {
        return {
          success: false,
          responseText: `No reconozco el comando "${valor || dispositivo}" para el control remoto.`,
        };
      }

      const result = await sendIRCommand(irDevice.id, irCode);
      return {
        success: result.success,
        responseText: result.success
          ? analysis.respuesta_texto || `Comando enviado al ${dispositivo}.`
          : `No pude enviar el comando IR: ${result.message}`,
      };
    }

    default: {
      return {
        success: false,
        responseText: `No reconozco el tipo de acción: ${tipo}.`,
      };
    }
  }
}
