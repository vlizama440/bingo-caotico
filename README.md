# Bingo Caótico — listo para publicar desde el navegador

Bingo en vivo para un animador y hasta 40 jugadores. El animador pulsa «Sacar siguiente número» una vez por sorteo. Los participantes tocan sus números manualmente. Los cartones son distintos y el servidor valida líneas y bingo.

## Publicación sin instalar programas

Se necesitan cuentas gratuitas de GitHub y Render, abiertas desde tu navegador. **No uses Netlify Drop para este proyecto:** el juego usa un servidor Node.js con WebSockets para sincronizar jugadores.

1. Descarga el ZIP entregado en ChatGPT y descomprímelo (doble clic en Mac).
2. En https://github.com/new, crea un repositorio llamado `bingo-caotico` (puede ser privado). Puedes seleccionar «Add a README» o no.
3. Dentro del repositorio, elige «Add file» → «Upload files». Arrastra los **cinco elementos directamente desde dentro de la carpeta `bingo-caotico`**: `public` (carpeta), `server.js`, `package.json`, `render.yaml` y este `README.md`. Confirma «Commit changes». Los archivos deben quedar en la raíz del repositorio (no en una subcarpeta).
4. En https://dashboard.render.com, crea una cuenta, elige «New» → «Web Service», conecta tu GitHub y selecciona el repositorio `bingo-caotico`.
5. Configura el servicio: **Language: Node**, **Build command: `npm install`**, **Start command: `npm start`**, **Instance type: Free** (para pruebas). Publica con «Deploy Web Service».
6. Cuando aparezca una URL del tipo `https://bingo-caotico-xxxx.onrender.com`, ábrela. Desde ahí crea la sala, proyecta el QR, pide a los jugadores que entren, inicia y pulsa «Sacar siguiente número» cada vez.

El archivo `render.yaml` también documenta automáticamente la configuración para un eventual despliegue tipo Blueprint.

## Antes de jugar con 40 personas

- Prueba con 2-3 celulares y el computador del animador.
- Abre el enlace unos minutos antes de la actividad. En el plan gratuito Render apaga servicios inactivos después de 15 minutos y pueden tardar en reactivarse.
- Esta primera versión guarda salas y cartones **en memoria**: si el servicio se reinicia, se pierde la partida y hay que crear otra sala. Para un evento con premios importantes se recomienda almacenamiento persistente y alojamiento siempre activo.
- Se permite un máximo de 40 participantes. Cada participante debería usar su propio celular y navegador.

## Funcionamiento

- Un cartón por jugador, 75 números y centro libre.
- Se anuncian líneas de 5 casillas horizontales, verticales o diagonales. El primer bingo completo finaliza la partida.
- Los participantes solo pueden marcar números que ya salieron; pueden desmarcarlos.
- La sesión puede recuperarse en el mismo navegador mientras el servidor siga activo.

## Opcional: ejecutar localmente

Con Node.js >=20: `npm install` y `npm start`.
