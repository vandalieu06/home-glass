# 05 — Texto cortado en selects e inputs del selector

**Estado:** Implementada (2026-09-25), pendiente de aceptación

## Purpose
Que el texto de los desplegables de atributos ("Seleccionar...", valores) y de los inputs del formulario de contacto se vea completo, sin cortarse por abajo.

## Context
Medido con agent-browser en `/reformas/packs/75` (viewport 960×700). `.hg-attribute-select` tiene:
- `height: 40px`, `box-sizing: border-box`, `padding: 12px 16px`, borde de 1px
- `font-size: 16px`, `line-height: 1.5` → cada línea necesita 24px

Espacio útil para el texto: 40 − 24 (padding) − 2 (borde) = **14px** (12px en foco, con borde de 2px). La línea de 24px no cabe y se corta.
Los inputs de contacto (`.hg-form-group input`, `selector.css:803-818`) tienen la misma combinación.
DESIGN.md (`text-input`) fija 40px de alto (44px en mobile) con `padding: {spacing.sm} {spacing.md}`. Esa combinación no cabe con texto de 16px; manda la altura.

## Proposed change
1. `.hg-attribute-select` (`selector.css:596-610`): `padding: 0 var(--mm-space-md)` y se mantiene `height: 40px`.
2. `.hg-form-group input`: separar su regla de la del textarea y darle también `padding: 0 var(--mm-space-md)` con `height: 40px`. El textarea conserva `padding: var(--mm-space-sm) var(--mm-space-md)`, `height: auto` y `min-height: 80px` (`selector.css:820-824`).
3. Foco (`.hg-attribute-select:focus`, `.hg-form-group input:focus`): mantener el borde de 2px y compensar con `padding-inline: calc(var(--mm-space-md) - 1px)` para que el texto no salte.
4. `@media (max-width: 767px)` (`selector.css:960`): `height: 44px` para select e input, como pide DESIGN.md.

## Technical decision
- Se respeta la altura de DESIGN.md y se ajusta solo el padding vertical: el navegador centra de forma nativa el texto de `select` e `input`.
- No se toca `line-height`, para no cambiar la tipografía `body-md`.

## Affected files
- `selector_packs/static/src/css/selector.css`

## Tests
Capturas con agent-browser a 960px y 390px, en reposo y en foco:
- select de atributos (paso Plato de Ducha del BASIC)
- inputs de nombre, email y teléfono del paso de contacto
- textarea del mensaje

## Acceptance criteria
- Ningún texto de select o input sale cortado, ni en reposo ni en foco.
- Altura de 40px en desktop y 44px en mobile.
- El textarea no cambia de aspecto.
