"use client";

import { useState, useEffect, useRef } from "react";

interface LogEntry {
  time: string;
  type: "success" | "error" | "info" | "action";
  message: string;
}

export default function JarvisDashboard() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [history, setHistory] = useState<Array<{role: "user" | "model", text: string}>>([]);
  const [status, setStatus] = useState<"idle" | "listening" | "processing" | "speaking">("idle");
  const [apiSecret, setApiSecret] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = (type: LogEntry["type"], message: string) => {
    const time = new Date().toLocaleTimeString("es-MX");
    setLogs((prev) => [...prev.slice(-49), { time, type, message }]);
  };

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  useEffect(() => {
    // Ping al cargar para verificar que el sistema está online
    fetch("/api/jarvis")
      .then((r) => r.json())
      .then((data) => {
        addLog("success", `Sistema online — ${data.message} v${data.version}`);
      })
      .catch(() => addLog("error", "No se pudo conectar con el backend"));
  }, []);

  async function sendCommand() {
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    setStatus("processing");
    addLog("info", `Enviando: "${query}"`);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiSecret) headers["X-Jarvis-Secret"] = apiSecret;

      const res = await fetch("/api/jarvis", {
        method: "POST",
        headers,
        body: JSON.stringify({ query, history }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
      }

      const intent = res.headers.get("X-Jarvis-Intent") || "hablar";
      const responseText = decodeURIComponent(
        res.headers.get("X-Jarvis-Response-Text") || ""
      );
      const latency = res.headers.get("X-Jarvis-Latency-Ms");

      addLog(
        intent === "ejecutar_accion" ? "action" : "success",
        `[${latency}ms] ${responseText}`
      );

      // Actualizar el contexto de la conversación (últimos 10 mensajes)
      setHistory((prev) => [
        ...prev.slice(-10),
        { role: "user", text: query },
        { role: "model", text: responseText }
      ]);

      // Reproducir audio
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setStatus("speaking");

      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        audioRef.current.onended = () => {
          setStatus("idle");
          URL.revokeObjectURL(url);
        };
      }

      setQuery("");
    } catch (err) {
      addLog("error", `Error: ${(err as Error).message}`);
      setStatus("idle");
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendCommand();
    }
  }

  const statusConfig = {
    idle: { label: "En espera", color: "var(--color-text-muted)" },
    listening: { label: "Escuchando...", color: "var(--color-primary)" },
    processing: { label: "Procesando...", color: "var(--color-warning)" },
    speaking: { label: "Hablando...", color: "var(--color-success)" },
  };

  const logColors = {
    success: "var(--color-success)",
    error: "var(--color-danger)",
    info: "var(--color-primary)",
    action: "var(--color-accent)",
  };

  return (
    <div style={{ minHeight: "100vh", padding: "24px", maxWidth: "1000px", margin: "0 auto" }}>
      {/* Fondo de partículas simulado */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(ellipse at 20% 50%, rgba(0,200,255,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(123,94,167,0.06) 0%, transparent 60%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* ── Header ─────────────────────────────────────────── */}
        <header
          style={{
            textAlign: "center",
            marginBottom: "40px",
            animation: "fade-in 0.6s ease forwards",
          }}
        >
          {/* Logo animado */}
          <div
            style={{
              position: "relative",
              width: "100px",
              height: "100px",
              margin: "0 auto 20px",
            }}
          >
            {/* Rings */}
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  inset: `${(i - 1) * 14}px`,
                  borderRadius: "50%",
                  border: "1px solid rgba(0,200,255,0.3)",
                  animation: `pulse-ring ${1.5 + i * 0.4}s ease-in-out infinite`,
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
            {/* Centro */}
            <div
              style={{
                position: "absolute",
                inset: "28px",
                borderRadius: "50%",
                background: "var(--color-primary)",
                boxShadow: "0 0 30px rgba(0,200,255,0.8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
                fontWeight: 900,
                fontFamily: "var(--font-brand)",
                color: "#050a10",
              }}
            >
              A
            </div>
          </div>

          <h1
            style={{
              fontFamily: "var(--font-brand)",
              fontSize: "clamp(28px, 5vw, 48px)",
              fontWeight: 900,
              letterSpacing: "0.15em",
              color: "var(--color-primary)",
              textShadow: "0 0 30px rgba(0,200,255,0.5)",
              marginBottom: "8px",
            }}
          >
            AKASHA
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "14px", letterSpacing: "0.1em" }}>
            SISTEMA DE ASISTENTE DOMÉSTICO INTELIGENTE
          </p>

          {/* Status badge */}
          <div style={{ marginTop: "12px" }}>
            <span
              className="status-badge"
              style={{
                background: `${statusConfig[status].color}18`,
                color: statusConfig[status].color,
                border: `1px solid ${statusConfig[status].color}44`,
              }}
            >
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: statusConfig[status].color,
                  animation: status !== "idle" ? "blink 1s ease infinite" : undefined,
                  display: "inline-block",
                }}
              />
              {statusConfig[status].label}
            </span>
          </div>
        </header>

        {/* ── Panel de entrada ─────────────────────────────── */}
        <div className="card" style={{ padding: "24px", marginBottom: "24px" }}>
          <label
            style={{
              display: "block",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: "var(--color-text-muted)",
              marginBottom: "10px",
              textTransform: "uppercase",
            }}
          >
            Comando de Voz / Texto
          </label>

          <div style={{ display: "flex", gap: "12px" }}>
            <input
              id="jarvis-query-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='Ej: "¿Cómo está el clima?" o "Cuéntame algo interesante"'
              disabled={isLoading}
              style={{
                flex: 1,
                background: "rgba(0,200,255,0.05)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                padding: "12px 16px",
                color: "var(--color-text)",
                fontSize: "15px",
                outline: "none",
                transition: "border-color 0.2s ease",
                fontFamily: "var(--font-body)",
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = "var(--color-primary)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = "var(--color-border)")
              }
            />
            <button
              id="jarvis-send-btn"
              onClick={sendCommand}
              disabled={isLoading || !query.trim()}
              className="btn btn-primary"
              style={{
                opacity: isLoading || !query.trim() ? 0.5 : 1,
                minWidth: "110px",
              }}
            >
              {isLoading ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Proceso...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="m22 2-7 20-4-9-9-4 20-7z" />
                  </svg>
                  Enviar
                </>
              )}
            </button>
          </div>

          {/* Campo de API Secret */}
          <div style={{ marginTop: "12px" }}>
            <input
              id="jarvis-secret-input"
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="X-Jarvis-Secret (opcional)"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                padding: "8px 16px",
                color: "var(--color-text-muted)",
                fontSize: "13px",
                outline: "none",
                fontFamily: "var(--font-body)",
              }}
            />
          </div>
        </div>

        {/* ── Comandos rápidos ─────────────────────────────── */}
        <div className="card" style={{ padding: "20px", marginBottom: "24px" }}>
          <p
            style={{
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: "var(--color-text-muted)",
              textTransform: "uppercase",
              marginBottom: "12px",
            }}
          >
            Comandos Rápidos
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {[
              "¿Cuál es la temperatura hoy?",
              "Cuéntame un dato curioso",
              "Pon música relajante",
              "¿Qué día es hoy?",
              "Cuéntame un chiste",
              "Dame una receta rápida",
            ].map((cmd) => (
              <button
                key={cmd}
                onClick={() => setQuery(cmd)}
                className="btn btn-ghost"
                style={{ fontSize: "12px", padding: "6px 14px" }}
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>

        {/* ── Log de actividad ─────────────────────────────── */}
        <div className="card" style={{ padding: "20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "14px",
            }}
          >
            <p
              style={{
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.1em",
                color: "var(--color-text-muted)",
                textTransform: "uppercase",
              }}
            >
              Log de Actividad
            </p>
            <button
              onClick={() => setLogs([])}
              className="btn btn-ghost"
              style={{ fontSize: "11px", padding: "4px 10px" }}
            >
              Limpiar
            </button>
          </div>

          <div
            style={{
              fontFamily: "'Courier New', monospace",
              fontSize: "13px",
              background: "rgba(0,0,0,0.3)",
              borderRadius: "var(--radius-md)",
              padding: "16px",
              maxHeight: "300px",
              overflowY: "auto",
              border: "1px solid var(--color-border)",
            }}
          >
            {logs.length === 0 ? (
              <p style={{ color: "var(--color-text-muted)", textAlign: "center" }}>
                Sin actividad aún...
              </p>
            ) : (
              logs.map((log, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: "6px",
                    animation: "fade-in 0.3s ease forwards",
                    display: "flex",
                    gap: "8px",
                  }}
                >
                  <span style={{ color: "var(--color-text-muted)", minWidth: "80px" }}>
                    [{log.time}]
                  </span>
                  <span style={{ color: logColors[log.type] }}>
                    {log.type === "action" ? "⚡" : log.type === "error" ? "✗" : log.type === "success" ? "✓" : "→"}
                  </span>
                  <span style={{ color: "var(--color-text)", wordBreak: "break-word" }}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>

        {/* Footer */}
        <p
          style={{
            textAlign: "center",
            color: "var(--color-text-muted)",
            fontSize: "12px",
            marginTop: "24px",
            opacity: 0.6,
          }}
        >
          Akasha v1.0 · Powered by Gemini 2.5 Flash + Hugging Face TTS
        </p>
      </div>

      {/* Audio oculto para reproducción de TTS */}
      <audio ref={audioRef} style={{ display: "none" }} />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        input::placeholder { color: var(--color-text-muted); opacity: 0.6; }
      `}</style>
    </div>
  );
}
