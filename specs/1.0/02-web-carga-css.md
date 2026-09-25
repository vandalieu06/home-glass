# 02 — Carga del CSS crítico

**Estado:** Implementada (2026-09-25), pendiente de aceptación

## Purpose
Eliminar el FOUC y el layout shift causados por cargar `website.css` de forma diferida.

## Context
El commit 6e73552 carga `website.css` con `media="print" onload="this.media='all'"`. Ese fichero contiene los estilos del header, hero y footer (above‑the‑fold), así que la página se pinta primero sin estilos. Esto contradice el objetivo de rendimiento (CLS).

## Proposed change
- Quitar el `<link media="print">` y el `<noscript>` de `inject_website_css`.
- Añadir `selector_packs/static/src/css/website.css` a `web.assets_frontend` en `__manifest__.py`.
- Mantener los `preconnect` y el `<link>` de Google Fonts (`display=swap`).

## Technical decision
El bundle de assets de Odoo ya se minifica y cachea. Incluir el CSS ahí evita una petición extra y garantiza que esté disponible en el primer render.

## Affected files
- `selector_packs/views/website_pages.xml`
- `selector_packs/__manifest__.py`

## Tests
- Recarga con caché vacía en `/`: sin destello sin estilos.
- Lighthouse en `/`: CLS igual o mejor que antes.

## Acceptance criteria
- `website.css` se sirve dentro de `web.assets_frontend` y no hay un `<link>` suelto.
- No hay FOUC en la home.
