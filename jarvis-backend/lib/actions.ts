/**
 * lib/actions.ts
 * Ejecutor de acciones IoT y red local.
 * Recibe la intención analizada por Gemini y la ejecuta en los dispositivos.
 * Soporta control de Fire TV Stick HD vía ADB sobre Wi-Fi.
 */

import { exec } from "child_process";
import { AkashaAnalysis } from "./gemini";
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
 * Envía un comando ADB al Fire TV Stick HD sobre Wi-Fi.
 */
function executeADBCommand(
  fireTvIp: string,
  irCode: string
): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    let adbCommand = "";

    // Mapeo de códigos a keyevents o lanzadores de aplicaciones
    if (irCode === "netflix") {
      adbCommand = `adb connect ${fireTvIp} && adb shell monkey -p com.netflix.ninja -c android.intent.category.LAUNCHER 1`;
    } else if (irCode === "youtube") {
      adbCommand = `adb connect ${fireTvIp} && adb shell monkey -p com.amazon.firetv.youtube -c android.intent.category.LAUNCHER 1`;
    } else if (irCode === "prime_video") {
      adbCommand = `adb connect ${fireTvIp} && adb shell monkey -p com.amazon.amazonvideo.livingroom -c android.intent.category.LAUNCHER 1`;
    } else {
      let keyCode = "";
      switch (irCode) {
        case "wakeup":
          keyCode = "224"; // WAKEUP
          break;
        case "sleep":
          keyCode = "223"; // SLEEP
          break;
        case "power":
          keyCode = "26";  // POWER TOGGLE
          break;
        case "vol_up":
          keyCode = "24";  // VOLUME_UP
          break;
        case "vol_down":
          keyCode = "25";  // VOLUME_DOWN
          break;
        case "mute":
          keyCode = "164"; // VOLUME_MUTE
          break;
        case "play_pause":
          keyCode = "85";  // MEDIA_PLAY_PAUSE
          break;
        case "home":
          keyCode = "3";   // HOME
          break;
        case "back":
          keyCode = "4";   // BACK
          break;
        case "dpad_up":
          keyCode = "19";  // DPAD_UP
          break;
        case "dpad_down":
          keyCode = "20";  // DPAD_DOWN
          break;
        case "dpad_left":
          keyCode = "21";  // DPAD_LEFT
          break;
        case "dpad_right":
          keyCode = "22";  // DPAD_RIGHT
          break;
        case "enter":
          keyCode = "66";  // ENTER
          break;
        default:
          resolve({
            success: false,
            message: `Código de control "${irCode}" no mapeado en ADB.`,
          });
          return;
      }
      adbCommand = `adb connect ${fireTvIp} && adb shell input keyevent ${keyCode}`;
    }

    console.log(`[ADB] Ejecutando comando: ${adbCommand}`);
    exec(adbCommand, (error, stdout, stderr) => {
      if (error) {
        console.error("[ADB] Error:", error);
        resolve({ success: false, message: error.message });
      } else {
        console.log("[ADB] Salida:", stdout);
        resolve({ success: true, message: "Comando ADB enviado con éxito" });
      }
    });
  });
}

/**
 * Ejecuta la acción IoT correspondiente basándose en el análisis de Gemini.
 */
export async function executeAction(
  analysis: AkashaAnalysis
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
          ? analysis.respuesta_texto || `${device.name} encendida.`
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
          ? analysis.respuesta_texto || `${device.name} apagada.`
          : `No pude apagar ${device.name}. ${result.message}`,
      };
    }

    case "encender_enchufe": {
      const device = findDeviceByAlias(dispositivo);
      if (!device) {
        return {
          success: false,
          responseText: `No encontré el enchufe o televisor "${dispositivo}".`,
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
          responseText: `No encontré el enchufe o televisor "${dispositivo}".`,
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
      const fireTvIp = process.env.FIRE_TV_IP;
      const irCode =
        findIRCommand(valor || dispositivo) ||
        findIRCommand(dispositivo);

      // Si FIRE_TV_IP está configurado, usamos ADB en lugar del IR Blaster de Tuya
      if (fireTvIp && fireTvIp !== "REEMPLAZAR_CON_IP_LOCAL") {
        if (!irCode) {
          return {
            success: false,
            responseText: `No reconozco el comando "${valor || dispositivo}" para el control de Fire TV.`,
          };
        }

        // Traducir power a wakeup o sleep preciso según la frase hablada
        let actionWord = irCode;
        const normalizedQuery = (valor || dispositivo || "").toLowerCase();
        if (normalizedQuery.includes("encender") || normalizedQuery.includes("prender")) {
          actionWord = "wakeup";
        } else if (normalizedQuery.includes("apagar")) {
          actionWord = "sleep";
        }

        const adbResult = await executeADBCommand(fireTvIp, actionWord);
        return {
          success: adbResult.success,
          responseText: adbResult.success
            ? analysis.respuesta_texto || `Comando enviado al Fire TV por red.`
            : `Error de control ADB: ${adbResult.message}`,
        };
      }

      // Fallback: Si no hay FIRE_TV_IP configurado, usar Tuya IR Blaster
      const irDevice = DEVICES.ir_blaster;
      if (!irDevice || irDevice.id.includes("REEMPLAZAR")) {
        return {
          success: false,
          responseText:
            "El control infrarrojo no está configurado. Configure DEVICE_IR_BLASTER o FIRE_TV_IP.",
        };
      }

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
