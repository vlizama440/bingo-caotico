# Bingo 2.2 — corrección de acceso de jugadores

Esta versión corrige el error que impedía mostrar el cartón después de entrar a la sala. El servidor registraba al jugador, pero la vista de jugador intentaba acceder al historial completo de números (`state.drawn`), que por diseño solo se envía al animador. Ahora se usa `playerSummary()` y se evita el error.

También se evita enviar dos solicitudes de entrada accidentalmente mientras se procesa la primera.

## Actualización

Sube `index.html` a la raíz de tu repositorio de GitHub y reemplaza el existente. Render publicará la actualización de forma automática. No es necesario reiniciar la partida ni volver a crear el servicio.

Tras la publicación, los jugadores que ya habían entrado pueden **recargar la página en el mismo navegador y teléfono**; se recuperará su cartón usando la sesión guardada. Si su navegador borró los datos, deberá coordinarse con el animador para entrar con otro nombre o empezar una nueva sala.
