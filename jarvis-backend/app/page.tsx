"use client";

import { useState, useEffect, useRef } from "react";

interface LogEntry {
  time: string;
  type: "success" | "error" | "info" | "action";
  message: string;
}

interface ChatMessage {
  sender: "user" | "akasha";
  text: string;
  time: string;
}

interface Device {
  key: string;
  name: string;
  type: "light" | "switch" | "ir_blaster" | "tv";
  aliases: string[];
  configured: boolean;
  state: boolean; // Simulado
}

export default function AkashaDashboard() {
  // Configuración de pestañas
  const [activeTab, setActiveTab] = useState<"assistant" | "devices" | "console">("assistant");

  // Reloj y fecha
  const [timeString, setTimeString] = useState("");
  const [dateString, setDateString] = useState("");

  // Control de Akasha API
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [history, setHistory] = useState<Array<{role: "user" | "model", text: string}>>([]);
  const [status, setStatus] = useState<"idle" | "listening" | "processing" | "speaking">("idle");
  const [apiSecret, setApiSecret] = useState("");

  // Chat de burbujas
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Dispositivos IoT
  const [devices, setDevices] = useState<Device[]>([]);
  const [showRemote, setShowRemote] = useState(false);

  // Escucha de voz
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [isWaitingForCommand, setIsWaitingForCommand] = useState(false);

  // Wake Lock
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);
  const wakeLockRef = useRef<any>(null);

  // Refs de audio y logs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Refs de reconocimiento de voz y estado
  const recognitionRef = useRef<any>(null);
  const isVoiceActiveRef = useRef(isVoiceActive);
  const statusRef = useRef(status);
  const apiSecretRef = useRef(apiSecret);
  const historyRef = useRef(history);
  const isWaitingForCommandRef = useRef(isWaitingForCommand);
  const commandTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sincronizar referencias
  useEffect(() => { isVoiceActiveRef.current = isVoiceActive; }, [isVoiceActive]);
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { apiSecretRef.current = apiSecret; }, [apiSecret]);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { isWaitingForCommandRef.current = isWaitingForCommand; }, [isWaitingForCommand]);

  // Log helper
  const addLog = (type: LogEntry["type"], message: string) => {
    const time = new Date().toLocaleTimeString("es-MX");
    setLogs((prev) => [...prev.slice(-49), { time, type, message }]);
  };

  // Scroll helpers
  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  // Reloj digital
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeString(
        d.toLocaleTimeString("es-MX", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
      setDateString(
        d.toLocaleDateString("es-MX", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Cargar secreto guardado en localStorage y fetch dispositivos
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSecret = localStorage.getItem("akasha_api_secret") || localStorage.getItem("jarvis_api_secret") || "";
      if (savedSecret) {
        setApiSecret(savedSecret);
        apiSecretRef.current = savedSecret;
      }
    }
  }, []);

  // Fetch dispositivos cuando cambie el secreto o en mount
  useEffect(() => {
    fetchDevices();
  }, [apiSecret]);

  async function fetchDevices() {
    try {
      const headers: Record<string, string> = {};
      if (apiSecretRef.current) {
        headers["X-Akasha-Secret"] = apiSecretRef.current;
        headers["X-Jarvis-Secret"] = apiSecretRef.current;
      }
      const res = await fetch("/api/devices", { headers });
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices.map((d: any) => ({ ...d, state: false })));
        addLog("success", `Dispositivos cargados: ${data.configured} de ${data.total} configurados.`);
      } else if (res.status === 401) {
        addLog("error", "No autorizado para listar dispositivos. Ingresa el API Secret.");
      }
    } catch (e) {
      addLog("error", "Error al conectar con la API de dispositivos.");
    }
  }

  // Generador de Sonidos (Chimes) usando Web Audio API
  function playChime(type: "listening" | "success" | "error") {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      if (ctx.state === "suspended") ctx.resume();

      const now = ctx.currentTime;

      if (type === "listening") {
        // Tono agudo doble futurista
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(587.33, now); // D5
        gain1.gain.setValueAtTime(0.12, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.08);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(880, now + 0.09); // A5
        gain2.gain.setValueAtTime(0.15, now + 0.09);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.09);
        osc2.stop(now + 0.22);
      } else if (type === "success") {
        // Tono de confirmación hacia arriba
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(659.25, now); // E5
        osc.frequency.exponentialRampToValueAtTime(987.77, now + 0.15); // B5
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === "error") {
        // Tono grave de error
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.setValueAtTime(130, now + 0.12);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch (e) {
      console.warn("Chime error:", e);
    }
  }

  // Wake Lock API - Mantener Pantalla Encendida
  async function requestWakeLock() {
    if ("wakeLock" in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
        setIsWakeLockActive(true);
        addLog("info", "Screen Wake Lock activo. Pantalla encendida continuamente.");
        wakeLockRef.current.addEventListener("release", () => {
          setIsWakeLockActive(false);
        });
      } catch (err: any) {
        console.warn(`No se pudo activar el Wake Lock: ${err.message}`);
      }
    } else {
      console.warn("Wake Lock API no soportado por este navegador.");
    }
  }

  function releaseWakeLock() {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
      setIsWakeLockActive(false);
      addLog("info", "Screen Wake Lock desactivado.");
    }
  }

  // Manejar el Wake Lock según la Escucha por voz
  useEffect(() => {
    if (isVoiceActive) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
    return () => {
      releaseWakeLock();
    };
  }, [isVoiceActive]);

  // Inicializar Reconocimiento de Voz (Web Speech API)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        // Usar continuous = false para mayor estabilidad en Android
        // y evitar duplicación de texto acumulado.
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = "es-MX";

        recognitionRef.current.onresult = (event: any) => {
          const current = event.resultIndex;
          const transcript = event.results[current][0].transcript.trim();
          if (transcript) {
            setVoiceTranscript(transcript);
          }
        };

        recognitionRef.current.onend = () => {
          // Si el micrófono se cierra, lo reactivamos si el hands-free está encendido
          // y no estamos reproduciendo audio ni procesando.
          if (
            isVoiceActiveRef.current &&
            statusRef.current !== "speaking" &&
            statusRef.current !== "processing"
          ) {
            try {
              recognitionRef.current.start();
            } catch (e) {}
          }
        };

        recognitionRef.current.onerror = (e: any) => {
          console.warn("Reconocimiento de voz error:", e.error);
          if (e.error === "not-allowed") {
            setIsVoiceActive(false);
            addLog("error", "Permiso de micrófono denegado.");
          }
        };
      } else {
        addLog("error", "Reconocimiento de voz no soportado por este navegador.");
      }
    }
  }, []);

  // Activar/Desactivar Micrófono por estado hands-free
  useEffect(() => {
    if (isVoiceActive && recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setStatus("listening");
        addLog("info", "Escucha continua activada. Di 'Akasha' seguido de tu comando.");
      } catch (e) {}
    } else if (!isVoiceActive && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        if (statusRef.current === "listening") setStatus("idle");
        addLog("info", "Escucha continua desactivada.");
      } catch (e) {}
    }
  }, [isVoiceActive]);

  // Manejar el micrófono durante la reproducción de audio
  useEffect(() => {
    if (!recognitionRef.current) return;
    if (status === "speaking" || status === "processing") {
      try {
        recognitionRef.current.abort(); // Pausar escucha
      } catch (e) {}
    } else if (status === "idle" && isVoiceActive) {
      // Reactivar cuando termine
      try {
        recognitionRef.current.start();
        setStatus("listening");
      } catch (e) {}
    }
  }, [status, isVoiceActive]);

  // Máquina de estados para procesar la voz
  useEffect(() => {
    if (!voiceTranscript) return;
    const lower = voiceTranscript.toLowerCase();

    // Caso A: Ya escuchamos la palabra de activación, capturando el comando
    if (isWaitingForCommandRef.current) {
      if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
      setIsWaitingForCommand(false);
      isWaitingForCommandRef.current = false;

      addLog("info", `Comando de voz: "${voiceTranscript}"`);
      sendCommand(voiceTranscript);
      setVoiceTranscript("");
      return;
    }

    // Caso B: Esperando la palabra de activación ("Akasha")
    const keywords = ["akasha", "acasha"];
    let matchedKeyword = "";
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        matchedKeyword = kw;
        break;
      }
    }

    if (matchedKeyword) {
      const parts = lower.split(matchedKeyword);
      const command = parts[parts.length - 1].trim();

      if (command.length > 0) {
        // Activación de un solo paso: "Akasha, enciende la luz"
        addLog("info", `Activación '${matchedKeyword}' -> Comando: "${command}"`);
        sendCommand(command);
      } else {
        // Activación de dos pasos: "Akasha" -> *Chime* -> Esperar comando
        addLog("info", `Palabra clave '${matchedKeyword}' detectada. Escuchando...`);
        playChime("listening");
        setIsWaitingForCommand(true);
        isWaitingForCommandRef.current = true;

        // Auto cancelado a los 6 segundos de silencio
        commandTimeoutRef.current = setTimeout(() => {
          setIsWaitingForCommand(false);
          isWaitingForCommandRef.current = false;
          addLog("info", "Tiempo de espera agotado.");
          playChime("error");
          // Si sigue activo, volver a escuchar wakeword
          if (isVoiceActiveRef.current && statusRef.current !== "speaking") {
            try {
              recognitionRef.current.start();
              setStatus("listening");
            } catch (e) {}
          }
        }, 6000);
      }
    }

    setVoiceTranscript("");
  }, [voiceTranscript]);

  // Guardar API Secret en localStorage
  const handleSecretChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setApiSecret(val);
    localStorage.setItem("akasha_api_secret", val);
  };

  // Enviar Comando a Akasha
  async function sendCommand(overrideQuery?: string) {
    const queryText = typeof overrideQuery === "string" ? overrideQuery : query;
    if (!queryText.trim() || isLoading) return;

    setIsLoading(true);
    setStatus("processing");
    addLog("info", `Enviando comando: "${queryText}"`);

    // Añadir mensaje a burbujas de chat
    const time = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    setChatMessages((prev) => [...prev, { sender: "user", text: queryText, time }]);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiSecretRef.current) {
        headers["X-Akasha-Secret"] = apiSecretRef.current;
        headers["X-Jarvis-Secret"] = apiSecretRef.current;
      }

      const res = await fetch("/api/akasha", {
        method: "POST",
        headers,
        body: JSON.stringify({ query: queryText, history: historyRef.current }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
      }

      const intent = res.headers.get("X-Akasha-Intent") || res.headers.get("X-Jarvis-Intent") || "hablar";
      const responseText = decodeURIComponent(
        res.headers.get("X-Akasha-Response-Text") || res.headers.get("X-Jarvis-Response-Text") || ""
      );
      const latency = res.headers.get("X-Akasha-Latency-Ms") || res.headers.get("X-Jarvis-Latency-Ms");

      addLog(
        intent === "ejecutar_accion" ? "action" : "success",
        `[${latency}ms] ${responseText}`
      );

      // Añadir respuesta de Akasha a burbujas de chat
      setChatMessages((prev) => [...prev, { sender: "akasha", text: responseText, time }]);

      // Actualizar el contexto de la conversación
      setHistory((prev) => [
        ...prev.slice(-10),
        { role: "user", text: queryText },
        { role: "model", text: responseText },
      ]);

      // Reproducir audio TTS
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setStatus("speaking");
      playChime("success");

      // Refrescar dispositivos después de una acción por si cambió el estado
      if (intent === "ejecutar_accion") {
        setTimeout(fetchDevices, 1500);
      }

      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        audioRef.current.onended = () => {
          setStatus("idle");
          URL.revokeObjectURL(url);
        };
      }

      setQuery("");
    } catch (err: any) {
      addLog("error", `Error: ${err.message}`);
      playChime("error");
      setStatus("idle");
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "akasha",
          text: `Ocurrió un error al procesar tu solicitud: ${err.message}`,
          time,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  // Táctil: Alternar foco / switch
  async function toggleDevice(deviceKey: string, currentVal: boolean) {
    const nextVal = !currentVal;
    // Actualización optimista
    setDevices((prev) =>
      prev.map((d) => (d.key === deviceKey ? { ...d, state: nextVal } : d))
    );
    addLog("info", `Táctil: Enviando toggle a ${deviceKey} (${nextVal ? "ON" : "OFF"})`);

    const device = devices.find((d) => d.key === deviceKey);
    if (!device) return;

    const code = device.type === "light" ? "switch_led" : "switch_1";

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiSecret) {
        headers["X-Akasha-Secret"] = apiSecret;
        headers["X-Jarvis-Secret"] = apiSecret;
      }

      const res = await fetch("/api/devices", {
        method: "POST",
        headers,
        body: JSON.stringify({
          deviceKey,
          commands: [{ code, value: nextVal }],
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addLog("success", `Táctil: ${device.name} ajustado con éxito.`);
      playChime("success");
    } catch (e: any) {
      // Revertir
      setDevices((prev) =>
        prev.map((d) => (d.key === deviceKey ? { ...d, state: currentVal } : d))
      );
      addLog("error", `Táctil: Error al controlar ${device.name}: ${e.message}`);
      playChime("error");
    }
  }

  // Táctil: Enviar botón IR
  async function sendIRButton(irCode: string) {
    addLog("info", `Táctil: Enviando código IR "${irCode}"`);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiSecret) {
        headers["X-Akasha-Secret"] = apiSecret;
        headers["X-Jarvis-Secret"] = apiSecret;
      }

      const res = await fetch("/api/devices", {
        method: "POST",
        headers,
        body: JSON.stringify({
          deviceKey: "ir_blaster",
          commands: [{ code: "ir_send", value: irCode }],
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addLog("success", `Táctil: IR ${irCode} enviado.`);
      playChime("success");
    } catch (e: any) {
      addLog("error", `Táctil: Error al enviar comando IR: ${e.message}`);
      playChime("error");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendCommand();
    }
  }

  // Configuración visual según estado
  const statusConfig = {
    idle: { label: "En espera", color: "var(--color-text-muted)" },
    listening: { label: "Escuchando...", color: "var(--color-primary)" },
    processing: { label: "Pensando...", color: "var(--color-warning)" },
    speaking: { label: "Hablando...", color: "var(--color-success)" },
  };

  const logColors = {
    success: "var(--color-success)",
    error: "var(--color-danger)",
    info: "var(--color-primary)",
    action: "var(--color-accent)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "var(--color-bg)", position: "relative" }}>
      {/* Fondo holográfico de partículas */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(0,200,255,0.06) 0%, transparent 70%), radial-gradient(ellipse at 80% 80%, rgba(123,94,167,0.06) 0%, transparent 60%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* ── HEADER DE SMART DISPLAY (Reloj + Fecha) ── */}
      <header
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "24px 16px 8px",
          borderBottom: "1px solid rgba(0, 200, 255, 0.08)",
          background: "rgba(5, 10, 16, 0.6)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-brand)",
            fontSize: "clamp(36px, 8vw, 56px)",
            fontWeight: 900,
            color: "var(--color-primary)",
            letterSpacing: "0.05em",
            textShadow: "0 0 20px rgba(0, 200, 255, 0.5)",
            lineHeight: 1,
          }}
        >
          {timeString || "00:00:00"}
        </div>
        <div
          style={{
            color: "var(--color-text-muted)",
            fontSize: "13px",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            marginTop: "6px",
            textAlign: "center",
          }}
        >
          {dateString || "Cargando fecha..."}
        </div>
      </header>

      {/* ── CONTENIDO PRINCIPAL (Ajustado por pestañas) ── */}
      <main
        style={{
          flex: 1,
          position: "relative",
          zIndex: 1,
          padding: "16px",
          overflowY: "auto",
          paddingBottom: "100px", // Espacio para la barra de navegación inferior
          maxWidth: "900px",
          width: "100%",
          margin: "0 auto",
        }}
      >
        {/* PESTAÑA A: ASISTENTE */}
        {activeTab === "assistant" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", animation: "fade-in 0.4s ease forwards" }}>
            {/* Visualizador central */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px 0",
              }}
            >
              {/* Anillo exterior interactivo */}
              <div
                onClick={() => setIsVoiceActive(!isVoiceActive)}
                style={{
                  position: "relative",
                  width: "140px",
                  height: "140px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.3s ease",
                }}
              >
                {/* Ondas expansivas de voz */}
                {(status === "listening" || isWaitingForCommand) && (
                  <>
                    <div className="wave-ring ring-1" />
                    <div className="wave-ring ring-2" />
                  </>
                )}

                {/* Esfera central */}
                <div
                  style={{
                    position: "absolute",
                    width: "90px",
                    height: "90px",
                    borderRadius: "50%",
                    background:
                      status === "listening"
                        ? "radial-gradient(circle, #00c8ff 0%, #006080 100%)"
                        : status === "processing"
                        ? "radial-gradient(circle, #ffcc00 0%, #a68400 100%)"
                        : status === "speaking"
                        ? "radial-gradient(circle, #00e5a0 0%, #008059 100%)"
                        : "radial-gradient(circle, #203548 0%, #0a1520 100%)",
                    boxShadow:
                      status === "listening"
                        ? "0 0 30px rgba(0, 200, 255, 0.7), inset 0 0 15px rgba(255,255,255,0.4)"
                        : status === "processing"
                        ? "0 0 30px rgba(255, 204, 0, 0.7), inset 0 0 15px rgba(255,255,255,0.4)"
                        : status === "speaking"
                        ? "0 0 30px rgba(0, 229, 160, 0.7), inset 0 0 15px rgba(255,255,255,0.4)"
                        : "0 0 15px rgba(0, 200, 255, 0.15)",
                    border: `2px solid ${
                      status === "listening"
                        ? "#00c8ff"
                        : status === "processing"
                        ? "#ffcc00"
                        : status === "speaking"
                        ? "#00e5a0"
                        : "rgba(0, 200, 255, 0.2)"
                    }`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.3s ease",
                    zIndex: 2,
                  }}
                >
                  {/* Icono central de voz */}
                  {status === "processing" ? (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#050a10" strokeWidth="2.5" style={{ animation: "spin 2s linear infinite" }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  ) : status === "speaking" ? (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#050a10" strokeWidth="2.5">
                      <path d="M11 5 6 9H2v6h4l5 4V5z"/>
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                    </svg>
                  ) : (
                    <svg
                      width="34"
                      height="34"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={status === "listening" ? "#050a10" : "var(--color-primary)"}
                      strokeWidth="2"
                    >
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="22" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Texto de Estado */}
              <div style={{ marginTop: "12px", textAlign: "center" }}>
                <p
                  style={{
                    fontFamily: "var(--font-brand)",
                    color: isWaitingForCommand
                      ? "var(--color-primary)"
                      : statusConfig[status].color,
                    fontSize: "14px",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    fontWeight: 700,
                  }}
                >
                  {isWaitingForCommand ? "¡Te escucho! Di comando" : statusConfig[status].label}
                </p>
                {isVoiceActive && (
                  <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                    Escucha Manos Libres Activa {isWakeLockActive && "(Screen Lock ✓)"}
                  </span>
                )}
              </div>
            </div>

            {/* Ecualizador Animado en Speaking/Listening */}
            {(status === "speaking" || status === "listening") && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "6px",
                  height: "24px",
                }}
              >
                {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: "4px",
                      background: status === "speaking" ? "var(--color-success)" : "var(--color-primary)",
                      borderRadius: "2px",
                      animation: "wave 1.2s ease-in-out infinite",
                      animationDelay: `${i * 0.15}s`,
                      height: "8px",
                    }}
                  />
                ))}
              </div>
            )}

            {/* Burbujas de Diálogo / Chat */}
            <div
              className="card"
              style={{
                display: "flex",
                flexDirection: "column",
                height: "300px",
                background: "rgba(10, 21, 32, 0.4)",
                borderColor: "rgba(0, 200, 255, 0.1)",
              }}
            >
              {/* Contenedor de mensajes */}
              <div
                style={{
                  flex: 1,
                  padding: "16px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {chatMessages.length === 0 ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      color: "var(--color-text-muted)",
                      textAlign: "center",
                      gap: "8px",
                    }}
                  >
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ opacity: 0.4 }}>
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <p style={{ fontSize: "14px" }}>
                      Di "Akasha, ¿cómo estás?" o pulsa el micrófono para hablar.
                    </p>
                  </div>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
                        animation: "fade-in 0.3s ease forwards",
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "80%",
                          padding: "10px 14px",
                          borderRadius: "14px",
                          borderTopRightRadius: msg.sender === "user" ? "2px" : "14px",
                          borderTopLeftRadius: msg.sender === "akasha" ? "2px" : "14px",
                          background:
                            msg.sender === "user"
                              ? "var(--color-primary-dim)"
                              : "rgba(123, 94, 167, 0.12)",
                          border: `1px solid ${
                            msg.sender === "user"
                              ? "rgba(0, 200, 255, 0.3)"
                              : "rgba(123, 94, 167, 0.3)"
                          }`,
                        }}
                      >
                        <p style={{ fontSize: "14px", color: "var(--color-text)", wordBreak: "break-word" }}>
                          {msg.text}
                        </p>
                        <span
                          style={{
                            display: "block",
                            fontSize: "9px",
                            color: "var(--color-text-muted)",
                            textAlign: msg.sender === "user" ? "right" : "left",
                            marginTop: "4px",
                          }}
                        >
                          {msg.time}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Entrada de texto manual */}
              <div
                style={{
                  padding: "10px",
                  borderTop: "1px solid rgba(0, 200, 255, 0.08)",
                  display: "flex",
                  gap: "8px",
                }}
              >
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe un comando alternativo..."
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    background: "rgba(0, 200, 255, 0.03)",
                    border: "1px solid rgba(0, 200, 255, 0.15)",
                    borderRadius: "20px",
                    padding: "8px 16px",
                    color: "var(--color-text)",
                    fontSize: "14px",
                    outline: "none",
                  }}
                />
                <button
                  onClick={() => sendCommand()}
                  disabled={isLoading || !query.trim()}
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "50%",
                    background: "var(--color-primary)",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    opacity: isLoading || !query.trim() ? 0.5 : 1,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#050a10" strokeWidth="2.5">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Sugerencias Rápidas */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
              {["enciende la luz de la sala", "cuéntame un chiste", "apaga todo"].map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => {
                    setQuery(cmd);
                    sendCommand(cmd);
                  }}
                  className="btn btn-ghost"
                  style={{ fontSize: "11px", padding: "5px 12px", borderRadius: "15px" }}
                >
                  "{cmd}"
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PESTAÑA B: DISPOSITIVOS */}
        {activeTab === "devices" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", animation: "fade-in 0.4s ease forwards" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontFamily: "var(--font-brand)", fontSize: "18px", color: "var(--color-primary)" }}>
                DISPOSITIVOS DEL HOGAR
              </h2>
              <button
                onClick={fetchDevices}
                className="btn btn-ghost"
                style={{ padding: "4px 10px", fontSize: "12px" }}
              >
                Actualizar
              </button>
            </div>

            {/* Grid de Dispositivos */}
            {devices.length === 0 ? (
              <p style={{ color: "var(--color-text-muted)", textAlign: "center", padding: "40px 0" }}>
                Sin dispositivos. Ingresa el API Secret en Configuración o revisa tu conexión.
              </p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                  gap: "12px",
                }}
              >
                {devices.map((device) => {
                  const isLight = device.type === "light";
                  const isSwitch = device.type === "switch";
                  const isRemote = device.type === "ir_blaster" || device.type === "tv";

                  return (
                    <div
                      key={device.key}
                      className="card"
                      onClick={() => {
                        if (isRemote) {
                          setShowRemote(true);
                        } else {
                          toggleDevice(device.key, device.state);
                        }
                      }}
                      style={{
                        padding: "16px 12px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        textAlign: "center",
                        cursor: "pointer",
                        position: "relative",
                        borderColor: device.state ? "rgba(0, 229, 160, 0.4)" : "rgba(0, 200, 255, 0.15)",
                        background: device.state
                          ? "rgba(0, 229, 160, 0.05)"
                          : "var(--color-bg-card)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {/* Icono del Dispositivo */}
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "50%",
                          background: device.state ? "rgba(0, 229, 160, 0.15)" : "rgba(0, 200, 255, 0.05)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginBottom: "10px",
                          color: device.state ? "var(--color-success)" : "var(--color-primary)",
                        }}
                      >
                        {isLight ? (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .3 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                            <line x1="9" y1="18" x2="15" y2="18" />
                            <line x1="10" y1="22" x2="14" y2="22" />
                          </svg>
                        ) : isSwitch ? (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="5" y="2" width="14" height="20" rx="2" />
                            <circle cx="12" cy="7" r="1" />
                            <circle cx="12" cy="15" r="4" />
                            <line x1="12" y1="13" x2="12" y2="17" />
                          </svg>
                        ) : (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="3" width="20" height="14" rx="2" />
                            <line x1="8" y1="21" x2="16" y2="21" />
                            <line x1="12" y1="17" x2="12" y2="21" />
                          </svg>
                        )}
                      </div>

                      {/* Nombre */}
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "var(--color-text)",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          lineHeight: 1.2,
                          height: "28px",
                        }}
                      >
                        {device.name}
                      </span>

                      {/* Estado / Acción */}
                      <span
                        style={{
                          fontSize: "10px",
                          marginTop: "8px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          color: isRemote
                            ? "var(--color-accent)"
                            : device.state
                            ? "var(--color-success)"
                            : "var(--color-text-muted)",
                        }}
                      >
                        {isRemote ? "Abrir Control" : device.state ? "ENCENDIDO" : "APAGADO"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA C: CONSOLA */}
        {activeTab === "console" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", animation: "fade-in 0.4s ease forwards" }}>
            {/* Variables y Autenticación */}
            <div className="card" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <h3 style={{ fontFamily: "var(--font-brand)", fontSize: "14px", color: "var(--color-primary)" }}>
                CONFIGURACIÓN DEL DISPOSITIVO
              </h3>

              {/* API Secret */}
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "var(--color-text-muted)", marginBottom: "4px" }}>
                  X-Akasha-Secret:
                </label>
                <input
                  type="password"
                  value={apiSecret}
                  onChange={handleSecretChange}
                  placeholder="Introduce el token de autenticación"
                  style={{
                    width: "100%",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                    padding: "8px 12px",
                    color: "var(--color-text)",
                    fontSize: "13px",
                  }}
                />
              </div>

              {/* Opciones de Wake Lock y Micrófono */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={isVoiceActive}
                    onChange={(e) => setIsVoiceActive(e.target.checked)}
                    style={{ width: "16px", height: "16px", accentColor: "var(--color-primary)" }}
                  />
                  Activar Escucha Manos Libres (Micrófono Continuo)
                </label>

                <div
                  style={{
                    fontSize: "12px",
                    padding: "6px 12px",
                    borderRadius: "4px",
                    background: isWakeLockActive ? "rgba(0, 229, 160, 0.1)" : "rgba(255, 71, 87, 0.1)",
                    color: isWakeLockActive ? "var(--color-success)" : "var(--color-danger)",
                    border: `1px solid ${isWakeLockActive ? "rgba(0, 229, 160, 0.2)" : "rgba(255, 71, 87, 0.2)"}`,
                    width: "fit-content",
                  }}
                >
                  Wake Lock: {isWakeLockActive ? "ACTIVADO (Pantalla Bloqueada)" : "DESACTIVADO"}
                </div>
              </div>
            </div>

            {/* Actividad / Consola de Log */}
            <div className="card" style={{ padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <h3 style={{ fontFamily: "var(--font-brand)", fontSize: "14px", color: "var(--color-primary)" }}>
                  LOGS DE ACTIVIDAD EN TIEMPO REAL
                </h3>
                <button
                  onClick={() => setLogs([])}
                  className="btn btn-ghost"
                  style={{ padding: "4px 8px", fontSize: "11px" }}
                >
                  Limpiar Logs
                </button>
              </div>

              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: "12px",
                  background: "rgba(0, 0, 0, 0.3)",
                  borderRadius: "8px",
                  padding: "12px",
                  height: "220px",
                  overflowY: "auto",
                  border: "1px solid var(--color-border)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {logs.length === 0 ? (
                  <p style={{ color: "var(--color-text-muted)", textAlign: "center", paddingTop: "80px" }}>
                    Sin eventos registrados...
                  </p>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} style={{ marginBottom: "4px", display: "flex", gap: "6px" }}>
                      <span style={{ color: "var(--color-text-muted)" }}>[{log.time}]</span>
                      <span style={{ color: logColors[log.type] }}>
                        {log.type === "action" ? "⚡" : log.type === "error" ? "✗" : log.type === "success" ? "✓" : "→"}
                      </span>
                      <span style={{ color: "var(--color-text)" }}>{log.message}</span>
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── MODAL FLOTANTE: CONTROL REMOTO IR ── */}
      {showRemote && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10,
            background: "rgba(5, 10, 16, 0.8)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            animation: "fade-in 0.25s ease forwards",
          }}
        >
          {/* Tarjeta del Control */}
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "340px",
              padding: "20px",
              background: "#081018",
              border: "1px solid var(--color-border-glow)",
              boxShadow: "0 0 30px rgba(0, 200, 255, 0.25)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {/* Header del Control */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-brand)", fontSize: "14px", color: "var(--color-primary)" }}>
                CONTROL REMOTO
              </span>
              <button
                onClick={() => setShowRemote(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--color-danger)",
                  cursor: "pointer",
                  fontSize: "20px",
                  padding: "4px",
                }}
              >
                ✕
              </button>
            </div>

            {/* BOTONES REMOTOS */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Botón Encendido y Home */}
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                <button
                  onClick={() => sendIRButton("power")}
                  style={{
                    flex: 1,
                    padding: "10px",
                    background: "rgba(255, 71, 87, 0.15)",
                    border: "1px solid var(--color-danger)",
                    color: "var(--color-danger)",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  POWER
                </button>
                <button
                  onClick={() => sendIRButton("home")}
                  style={{
                    flex: 1,
                    padding: "10px",
                    background: "rgba(0, 200, 255, 0.1)",
                    border: "1px solid var(--color-primary)",
                    color: "var(--color-primary)",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  INICIO / HOME
                </button>
              </div>

              {/* PAD DIRECCIONAL (D-Pad) */}
              <div
                style={{
                  position: "relative",
                  width: "160px",
                  height: "160px",
                  margin: "0 auto",
                  borderRadius: "50%",
                  background: "rgba(0, 200, 255, 0.03)",
                  border: "1px solid rgba(0, 200, 255, 0.1)",
                }}
              >
                {/* D-Pad Arriba */}
                <button
                  onClick={() => sendIRButton("dpad_up")}
                  style={{
                    position: "absolute",
                    top: "10px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "36px",
                    height: "30px",
                    background: "rgba(0, 200, 255, 0.08)",
                    border: "1px solid rgba(0, 200, 255, 0.2)",
                    borderRadius: "6px",
                    color: "var(--color-text)",
                    cursor: "pointer",
                  }}
                >
                  ▲
                </button>
                {/* D-Pad Izquierda */}
                <button
                  onClick={() => sendIRButton("dpad_left")}
                  style={{
                    position: "absolute",
                    left: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "30px",
                    height: "36px",
                    background: "rgba(0, 200, 255, 0.08)",
                    border: "1px solid rgba(0, 200, 255, 0.2)",
                    borderRadius: "6px",
                    color: "var(--color-text)",
                    cursor: "pointer",
                  }}
                >
                  ◀
                </button>
                {/* OK / ENTER */}
                <button
                  onClick={() => sendIRButton("enter")}
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    background: "var(--color-primary)",
                    border: "none",
                    color: "#050a10",
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: "pointer",
                    boxShadow: "0 0 15px rgba(0, 200, 255, 0.4)",
                  }}
                >
                  OK
                </button>
                {/* D-Pad Derecha */}
                <button
                  onClick={() => sendIRButton("dpad_right")}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "30px",
                    height: "36px",
                    background: "rgba(0, 200, 255, 0.08)",
                    border: "1px solid rgba(0, 200, 255, 0.2)",
                    borderRadius: "6px",
                    color: "var(--color-text)",
                    cursor: "pointer",
                  }}
                >
                  ▶
                </button>
                {/* D-Pad Abajo */}
                <button
                  onClick={() => sendIRButton("dpad_down")}
                  style={{
                    position: "absolute",
                    bottom: "10px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "36px",
                    height: "30px",
                    background: "rgba(0, 200, 255, 0.08)",
                    border: "1px solid rgba(0, 200, 255, 0.2)",
                    borderRadius: "6px",
                    color: "var(--color-text)",
                    cursor: "pointer",
                  }}
                >
                  ▼
                </button>
              </div>

              {/* Botón Regresar y Reproducción */}
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                <button
                  onClick={() => sendIRButton("back")}
                  className="btn btn-ghost"
                  style={{ flex: 1, padding: "8px", fontSize: "12px", justifyContent: "center" }}
                >
                  ATRÁS / BACK
                </button>
                <button
                  onClick={() => sendIRButton("play_pause")}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: "8px", fontSize: "12px", justifyContent: "center" }}
                >
                  PLAY / PAUSE
                </button>
              </div>

              {/* CONTROL DE VOLUMEN */}
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", background: "rgba(255,255,255,0.02)", padding: "8px", borderRadius: "8px", border: "1px solid rgba(0,200,255,0.05)" }}>
                <button
                  onClick={() => sendIRButton("vol_down")}
                  className="btn btn-ghost"
                  style={{ padding: "6px 12px" }}
                >
                  VOL -
                </button>
                <button
                  onClick={() => sendIRButton("mute")}
                  className="btn btn-ghost"
                  style={{ padding: "6px 10px", fontSize: "11px", color: "var(--color-text-muted)" }}
                >
                  SILENCIO
                </button>
                <button
                  onClick={() => sendIRButton("vol_up")}
                  className="btn btn-ghost"
                  style={{ padding: "6px 12px" }}
                >
                  VOL +
                </button>
              </div>

              {/* ACCESOS DIRECTOS APPS */}
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => sendIRButton("netflix")}
                  style={{
                    flex: 1,
                    padding: "8px",
                    background: "#E50914",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  NETFLIX
                </button>
                <button
                  onClick={() => sendIRButton("youtube")}
                  style={{
                    flex: 1,
                    padding: "8px",
                    background: "white",
                    color: "#FF0000",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  YOUTUBE
                </button>
                <button
                  onClick={() => sendIRButton("prime_video")}
                  style={{
                    flex: 1,
                    padding: "8px",
                    background: "#00A8E1",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  PRIME
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── BARRA DE NAVEGACIÓN INFERIOR DE SMART DISPLAY ── */}
      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: "64px",
          background: "rgba(10, 21, 32, 0.85)",
          backdropFilter: "blur(16px)",
          borderTop: "1px solid var(--color-border)",
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          zIndex: 5,
        }}
      >
        {/* Pestaña Asistente */}
        <button
          onClick={() => setActiveTab("assistant")}
          style={{
            background: "transparent",
            border: "none",
            color: activeTab === "assistant" ? "var(--color-primary)" : "var(--color-text-muted)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
            cursor: "pointer",
            fontSize: "11px",
            fontWeight: 600,
            textTransform: "uppercase",
            fontFamily: "var(--font-brand)",
            transition: "color 0.2s ease",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
          </svg>
          Asistente
        </button>

        {/* Pestaña Dispositivos */}
        <button
          onClick={() => setActiveTab("devices")}
          style={{
            background: "transparent",
            border: "none",
            color: activeTab === "devices" ? "var(--color-primary)" : "var(--color-text-muted)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
            cursor: "pointer",
            fontSize: "11px",
            fontWeight: 600,
            textTransform: "uppercase",
            fontFamily: "var(--font-brand)",
            transition: "color 0.2s ease",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="9" />
            <rect x="14" y="3" width="7" height="5" />
            <rect x="14" y="12" width="7" height="9" />
            <rect x="3" y="16" width="7" height="5" />
          </svg>
          Hogar
        </button>

        {/* Pestaña Consola */}
        <button
          onClick={() => setActiveTab("console")}
          style={{
            background: "transparent",
            border: "none",
            color: activeTab === "console" ? "var(--color-primary)" : "var(--color-text-muted)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
            cursor: "pointer",
            fontSize: "11px",
            fontWeight: 600,
            textTransform: "uppercase",
            fontFamily: "var(--font-brand)",
            transition: "color 0.2s ease",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
          Consola
        </button>
      </nav>

      {/* Audio oculto para reproducción de TTS */}
      <audio ref={audioRef} style={{ display: "none" }} />

      {/* CSS local e inyecciones adicionales */}
      <style>{`
        /* Anillo expansivo de voz */
        .wave-ring {
          position: absolute;
          border: 2px solid var(--color-primary);
          border-radius: 50%;
          opacity: 0;
          pointer-events: none;
          z-index: 1;
        }

        .ring-1 {
          width: 95px;
          height: 95px;
          animation: ripple 1.6s cubic-bezier(0.1, 0.8, 0.3, 1) infinite;
        }

        .ring-2 {
          width: 95px;
          height: 95px;
          animation: ripple 1.6s cubic-bezier(0.1, 0.8, 0.3, 1) infinite;
          animation-delay: 0.6s;
        }

        @keyframes ripple {
          0% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(1.6); opacity: 0; }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes wave {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1.3); }
        }
      `}</style>
    </div>
  );
}
