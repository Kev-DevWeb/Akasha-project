# 📱 Guía de Configuración Física y Kiosk para Honor 8A

Esta guía detalla la preparación paso a paso del **Honor 8A (Android 9 / EMUI 9)** para albergar a **Akasha** como una pantalla inteligente instalada en pared o stand, activa las 24 horas del día, los 7 días de la semana, y escuchando tu voz.

---

## 1. Ajustes del Sistema Android (EMUI 9)

EMUI tiene una gestión de recursos y batería extremadamente agresiva. Para evitar que el sistema apague el micrófono, congele la PWA o interrumpa la reproducción de audio, aplica la siguiente configuración:

### 1.1 Exclusión de Batería y RAM
1. Abre **Ajustes** → **Batería** → **Inicio de aplicaciones**.
2. Busca **Chrome** (o **Fully Kiosk** si lo utilizas).
3. Desactiva la opción "Gestionar automáticamente".
4. Asegúrate de activar las tres opciones manuales:
   - **Auto-inicio** (Permite iniciar al encender el teléfono).
   - **Inicio secundario** (Permite que sea lanzado por otras apps).
   - **Ejecución en segundo plano** (Evita que Android suspenda el proceso al apagar la pantalla o pasar tiempo inactivo).
5. Ve a **Ajustes** → **Aplicaciones** → **Aplicaciones** → botón de tres puntos (arriba a la derecha) → **Acceso especial** → **Optimización de batería**.
6. Cambia el filtro a "Todas las aplicaciones", busca **Chrome** (o **Fully Kiosk**) y ponlo en **No permitir** (esto desactiva la optimización agresiva para esa app).

### 1.2 Opciones de Desarrollador (Mantener Pantalla Activa)
Para asegurar que la pantalla nunca se apague cuando el teléfono está conectado al cargador:
1. Ve a **Ajustes** → **Sistema** → **Acerca del teléfono**.
2. Presiona 7 veces seguidas sobre **Número de compilación** hasta que aparezca el mensaje *"Ahora eres un desarrollador"*.
3. Regresa a **Sistema** y entra en **Opciones de desarrollador**.
4. Activa la opción **Permanecer activo** (La pantalla no se apagará nunca durante la carga).

---

## 2. Instalación de la PWA (Método Ligero)

Este es el método nativo utilizando Google Chrome.

1. Abre **Google Chrome** en tu Honor 8A.
2. Navega a la URL de tu backend desplegado en Vercel (`https://tu-proyecto-akasha.vercel.app`).
3. Presiona el botón de menú de Chrome (tres puntos en la esquina superior derecha).
4. Selecciona **Añadir a la pantalla de inicio** o **Instalar aplicación**.
5. Se creará un icono de **Akasha** en el escritorio del teléfono.
6. Abre la aplicación desde el icono del escritorio. Se ejecutará sin barra de direcciones, a pantalla completa.

---

## 3. Configuración de Permisos en Chrome
Para evitar que Chrome bloquee el audio o solicite permisos de micrófono repetidamente:
1. Al abrir la app por primera vez, pulsa el botón del micrófono en la pantalla de Akasha.
2. Cuando el navegador pregunte *"¿Permitir a Akasha grabar audio?"*, selecciona **Permitir siempre**.
3. Ve a **Ajustes de Chrome** → **Configuración de sitios** → **Micrófono** y comprueba que la URL de tu proyecto esté listada bajo "Permitido".
4. En **Configuración de sitios** → **Sonido**, asegúrate de que tu sitio esté habilitado para reproducir audio automáticamente sin interacciones del usuario.

---

## 4. Método Avanzado: Fully Kiosk Browser (Recomendado)

Si vas a montar el Honor 8A permanentemente en la pared, el navegador normal puede cerrarse si hay poca memoria o mostrar popups. **Fully Kiosk Browser** (disponible gratis en Play Store o como APK) bloquea el dispositivo para que funcione únicamente como pantalla inteligente.

### Ajustes sugeridos en Fully Kiosk para Akasha:
1. **Start URL:** Introduce la URL de tu PWA (`https://tu-proyecto-akasha.vercel.app`).
2. **Web Content Settings:**
   - Activa **Play Text-to-Speech** y **Web Auto Play** (permite que los audios de Akasha se reproduzcan solos).
   - Activa **Grant Audio Capture Permission** (concede permiso automático de micrófono al motor de renderizado).
3. **Device Management:**
   - Activa **Keep Screen On** (obliga a la pantalla a mantenerse encendida pase lo que pase).
   - Activa **Launch on Boot** (si el Honor 8A se apaga por falta de luz y se enciende solo al volver la corriente, abrirá Akasha de inmediato).
4. **Power Management:**
   - Desactiva el protector de pantalla o configúralo para que sea negro tras horas de inactividad, despertando al tocar la pantalla.
