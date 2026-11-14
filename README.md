# Bingo Caótico 2.0 — hasta 50 personas

Incluye: cartones individuales BINGO 5×5, sala de **3 dígitos**, un animador que sortea los números de uno en uno, tómbola animada durante **2 segundos**, números marcados manualmente (incluso si todavía no han salido), cartón aleatorio y personalización de color/fichas antes de comenzar y comprobación de línea o cartón **por jugador desde el panel del animador**.

## Actualizar tu bingo ya publicado en GitHub y Render

1. Descomprime el ZIP y abre tu repositorio existente `bingo-caotico` en GitHub.
2. Reemplaza los archivos de la raíz `server.js`, `index.html`, `package.json`, `README.md` y `render.yaml` por los de esta versión. **No subas la carpeta completa ni el ZIP cerrado.**
3. En GitHub presiona **Commit changes**. Render debería desplegar automáticamente la nueva versión usando el mismo servicio Node configurado con `npm install` y `npm start`.
4. Abre el enlace existente de Render. Si no se actualiza, en Render elige **Manual Deploy → Deploy latest commit**.

## Reglas y validación

- Todos tienen un cartón diferente y la casilla central es gratis.
- Cada jugador puede poner/quitar una ficha en cualquier número mientras la partida esté en curso, incluso en un número que aún no fue sorteado.
- **Solo son válidos los números que fueron sorteados y que el participante marcó**. El servidor verifica esto; marcar antes un número no lo vuelve válido hasta que salga.
- El animador puede pulsar **Comprobar línea** o **Comprobar cartón** en cualquier jugador. Se muestra si corresponde el premio y los números que faltan por estar sorteados/marcados. Las líneas válidas son horizontales, verticales y diagonales.
- El cartón y su apariencia se pueden modificar únicamente **antes** de comenzar. Después quedan bloqueados.
- La primera persona que complete el cartón provoca el final de la partida. El animador puede reiniciar con **Nueva partida**.

## Importante para el día del evento

El servidor guarda las salas en memoria. En el plan gratuito de Render, si el servidor se reinicia o entra en reposo, la partida puede perderse. Conviene usar una instancia estable para sesiones importantes y hacer una prueba previa con varios celulares. Los jugadores pueden volver a conectarse con el mismo navegador si la sala continúa activa. No uses el mismo navegador para dos jugadores diferentes: la sesión local del navegador es única.
