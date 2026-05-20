# 📺 Integración Directa — Fire TV Stick HD y TV Panasonic sin Tuya (Vía ADB sobre Wi-Fi)

Esta guía describe cómo configurar tu **Fire TV Stick HD** y tu **TV Panasonic** para controlarlos por voz con **Akasha** (volumen, encendido/apagado y apps) sin necesidad de comprar ni configurar ningún dispositivo Tuya o emisor infrarrojo físico.

---

## 💡 ¿Cómo funciona?

1. **Tu Mando Físico de Fire TV (Bluetooth):** Sigue funcionando exactamente igual, sin ningún cambio ni restricción.
2. **HDMI-CEC (Viera Link en Panasonic):** Permite que tu televisión y el Fire TV Stick se comuniquen a través del cable HDMI. Cuando el Fire TV "despierta", enciende la TV Panasonic. Cuando se "duerme", apaga la TV. Cuando el Fire TV recibe órdenes de volumen, las reenvía a la TV Panasonic.
3. **ADB sobre Wi-Fi (Android Debug Bridge):** El Fire TV Stick corre sobre Android. Si habilitamos la depuración de red, el backend de Akasha (corriendo en tu red local) puede enviarle pulsaciones de teclas virtuales (`keyevents`) a través de la red Wi-Fi de tu casa.

---

## 🛠️ Paso 1: Configurar el Fire TV Stick HD

Para permitir que Akasha se conecte a tu Fire TV, debes activar la depuración:

1. Ve a **Configuración** → **Mi Fire TV** → **Acerca de**.
2. Presiona el primer elemento (el nombre de tu Fire TV) **7 veces seguidas** hasta que aparezca el mensaje: *"No es necesario, ya eres un desarrollador"*.
3. Vuelve atrás y entra a la nueva opción: **Opciones para desarrolladores**.
4. Activa **Depuración ADB** (ADB Debugging).

---

## 📌 Paso 2: Fijar la IP del Fire TV Stick

Es muy importante que la dirección IP de tu Fire TV no cambie al reiniciar el router:

1. Ve a **Configuración** → **Mi Fire TV** → **Acerca de** → **Red**.
2. Anota la **Dirección IP** (ejemplo: `192.168.1.150`).
3. *(Opcional pero muy recomendado)*: Entra a la configuración de tu router de casa y asigna una "IP estática" (o reserva de IP) a la dirección MAC de tu Fire TV para que siempre sea la misma.

---

## 💻 Paso 3: Instalar ADB en el Servidor/PC Local

Dado que Akasha se ejecutará localmente para poder hablar con el Fire TV en tu misma red de casa:

### En Linux (Ubuntu/Debian/Termux):
```bash
sudo apt update
sudo apt install android-tools-adb
```

### En macOS (usando Homebrew):
```bash
brew install android-platform-tools
```

### En Windows:
Descarga las [SDK Platform Tools oficiales](https://developer.android.com/studio/releases/platform-tools) de Google, extrae el ZIP y agrega la carpeta a las variables de entorno de tu sistema (PATH).

---

## 🧪 Paso 4: Realizar una Prueba Manual en la Terminal

Asegúrate de que tu PC puede hablar con el Fire TV y que el control CEC de Panasonic funciona:

1. Abre una terminal en tu PC.
2. Conéctate al Fire TV (reemplaza con tu IP):
   ```bash
   adb connect 192.168.1.150
   ```
   *Nota: La primera vez aparecerá una ventana en la pantalla de tu televisión Panasonic preguntando si deseas permitir la depuración. Marca **"Permitir siempre desde esta computadora"** y pulsa Aceptar.*

3. Prueba los comandos del volumen y encendido:
   ```bash
   # Subir volumen de la TV
   adb shell input keyevent 24
   
   # Bajar volumen de la TV
   adb shell input keyevent 25
   
   # Apagar TV (Poner en reposo el Fire TV y apagar TV vía HDMI-CEC)
   adb shell input keyevent 223
   
   # Enceder TV (Despertar el Fire TV y encender TV vía HDMI-CEC)
   adb shell input keyevent 224
   ```

Si la televisión Panasonic responde subiendo, bajando el volumen o apagándose, ¡tu control CEC y ADB están perfectamente configurados!

---

## ⚙️ Paso 5: Configurar Akasha

1. Abre el archivo [.env.local](file:///home/gatoestirado/Documents/Project-Jarvis/Akasha-project/jarvis-backend/.env.local).
2. Configura tu variable `FIRE_TV_IP` con la IP que anotaste:
   ```bash
   FIRE_TV_IP=192.168.1.150
   ```
3. Inicia el servidor de desarrollo local de Akasha:
   ```bash
   npm run dev
   ```

---

## 🗣️ Comandos de Voz Admitidos

Una vez configurado, puedes hablarle a Akasha en tu Honor 8A diciendo:

* *"Akasha, enciende la televisión"* (Despierta el stick y enciende la TV)
* *"Akasha, apaga la tele"* (Duerme el stick y apaga la TV)
* *"Akasha, sube el volumen"* (Sube 1 punto de volumen en la TV)
* *"Akasha, sube mucho el volumen"* (Puedes repetirlo para ajustar más rápido)
* *"Akasha, baja el volumen"*
* *"Akasha, pon silencio / quita el silencio"*
* *"Akasha, pon pausa / reproduce"*
* *"Akasha, pon Netflix / abre YouTube / pon Prime Video"* (Lanza la aplicación de forma instantánea en tu pantalla)
* *"Akasha, vete al menú de inicio"* (Regresa a la pantalla principal del Fire TV)
