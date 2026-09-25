# 08 — Indicador de pasos en móvil (barra de progreso)

**Estado:** Implementada (2026-09-25), pendiente de aceptación

## Purpose
En móvil y tablet (< 1024px), que el usuario vea en qué paso está, cuántos quedan y cuál viene después, sin scroll horizontal y con un diseño cuidado.

## Context
- En `selector.css` (`@media (max-width: 1023px)`), `.hg-stepper-content-inner` es un flex con `overflow-x: auto`, y cada `.hg-stepper-item` hereda `width: 100%` con `flex-shrink: 0`. Cada paso ocupa todo el ancho: solo se ve "1 Plato de Ducha" y aparece la barra de scroll.
- Hay entre 5 pasos (BASIC) y 8 (PREMIUM: 6 categorías + Resumen + Contacto). Con 8 pasos, los nombres no caben en 390px de ancho.
- El usuario eligió el diseño "barra de progreso".

## Proposed change
```
Reforma BASIC
PASO 2 DE 5                Siguiente: Mampara
Azulejos
████████ ████████ ░░░░░░░ ░░░░░░░ ░░░░░░░
```
1. **Cabecera:**
   - Caption "Paso N de M": 13px, 600, mayúsculas, `--mm-steel` (`caption-bold`).
   - Nombre del paso actual: 18px, 600, `--mm-ink`.
   - A la derecha, "Siguiente: <nombre>" en 13px `--mm-stone`, con `ellipsis`. No aparece en el último paso.
2. **Barra segmentada:** un segmento por paso; todos caben siempre.
   - `display: flex; gap: 4px`, segmentos con `flex: 1`, 6px de alto, `border-radius: var(--mm-rounded-full)`.
   - Completado y actual: `--mm-primary`. Pendiente: `--mm-hairline`.
   - Transición de `background` de 0.2s.
3. **Interacción:** cada segmento es un `<button>` con `aria-label="Paso N: nombre"`. Llama a `goToStep(n)` si `canGoToStep(n)`; si no, queda `disabled`. Área táctil de al menos 24px de alto (padding transparente alrededor de la barra de 6px).
4. **Accesibilidad:** contenedor con `role="progressbar"` y `aria-valuemin`, `aria-valuemax`, `aria-valuenow` y `aria-valuetext` ("Paso N de M: nombre").
5. **Paso de éxito:** la barra se ve completa y el caption dice "Completado".
6. **Desktop (≥ 1024px):** la barra lateral actual no cambia.

## Technical decision
- `renderStepper()` (`selector.js`) reutiliza el array `steps` que ya calcula y genera, además de la lista actual, un bloque `.hg-stepper-mobile`. Reutiliza `escapeHtml`, `canGoToStep` y `goToStep`. No añade estado: `renderStepper` ya se llama en cada cambio de paso.
- CSS:
  - `.hg-stepper-mobile` oculto por defecto.
  - En `@media (max-width: 1023px)`: la lista se oculta y la barra se muestra.
  - Se borran las reglas de mobile de `.hg-stepper-content-inner` e `.hg-stepper-item`, que dejan de usarse.
  - `.hg-stepper-header h3` pasa a 16px en mobile.
- La barra escala a cualquier número de pasos. Los tokens son de DESIGN.md: `primary`, `hairline`, `steel`, `stone`, `rounded.full`, `caption-bold`.

## Affected files
- `selector_packs/static/src/js/selector.js`
- `selector_packs/static/src/css/selector.css`

## Tests (agent-browser)
- A 390px y 768px, en BASIC (5 pasos) y PREMIUM (8 pasos): sin scroll horizontal (`scrollWidth <= clientWidth` en `.hg-stepper`).
- En el paso 2 del BASIC:
  - caption "Paso 2 de 5", nombre "Azulejos" y "Siguiente: Mampara"
  - 2 segmentos rellenos
- Tocar el segmento 1 vuelve a Plato; tocar un segmento bloqueado no hace nada.
- A 1280px: se ve la barra lateral de siempre y la barra de progreso queda oculta.
- Capturas antes y después.

## Acceptance criteria
- En móvil se ven el paso actual, el total y el siguiente paso, sin scroll horizontal, para cualquier número de pasos.
- Se puede volver a un paso ya completado tocando la barra.
- El desktop no cambia.

## Notas de implementación
- **Gotcha del minificador.** Odoo 15 minifica el JS con `rjsmin`, que no entiende los template literals y borra el espacio tras `:` (`Siguiente: ${x}` → "Siguiente:Azulejos").
  - En texto visible se usa `&nbsp;`, y en atributos, concatenación con comillas normales.
  - Se corrigió también el "Incluye: …" de `renderPreselectedInfo`, que tenía el mismo fallo desde antes.
- **Verificado:**
  - Sin scroll horizontal en BASIC (5 pasos) y PREMIUM (8 pasos) a 390px y a 768px.
  - En el paso 2: "Paso 2 de 5 · Azulejos · Siguiente: Mampara", con 2 segmentos rellenos y `aria-valuetext` correcto.
  - Tocar el segmento 4 (bloqueado) no hace nada; tocar el 1 vuelve a Plato.
  - A 1280px se ve la barra lateral y la barra de progreso queda oculta.
