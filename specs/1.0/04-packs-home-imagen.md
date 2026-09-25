# 04 — `alt` de la imagen en las tarjetas de pack

**Estado:** Implementada (2026-09-25), pendiente de aceptación

## Purpose
Accesibilidad y SEO: el `alt` debe ser el nombre del pack.

## Context
`templates.xml` usa `alt="pack.name"` (texto literal), no un atributo QWeb. La imagen estática única para todos los packs se mantiene como decisión de diseño.

## Proposed change
`alt="pack.name"` → `t-att-alt="pack.name"`.

## Affected files
- `selector_packs/views/templates.xml`

## Tests
- En `/reformas/packs`, cada `<img>` tiene como `alt` el nombre de su pack.

## Acceptance criteria
- `alt` dinámico en todas las tarjetas.
