# 01 — Menús duplicados, footer y preload de la hero

**Estado:** Implementada (2026-09-25), pendiente de aceptación

## Purpose
Eliminar los menús duplicados de la cabecera, dejar un único footer válido y evitar precargas innecesarias.

## Context
- `website/data/website_data.xml` (Odoo 15) ya crea `Home` (`/`) y `Contact us` (`/contactus`), traducidos por el core a "Inicio"/"Contáctenos" (es) e "Inici"/"Contacta'ns" (ca). Nuestros `menu_inicio` y `menu_contacto` los duplican.
- `website.menu.create()` sin `website_id` crea una copia por website **sin xmlid**; al quitar el record del XML, `-u` borra el genérico pero no las copias.
- `custom_footer` reemplaza `div#footer` por un `<footer>` que queda anidado dentro de `footer#bottom`, pierde `t-if="not no_footer"`. El bloque `o_footer_copyright` se oculta solo por CSS (`display:none`) pero se sigue renderizando.
- El `<link rel="preload">` de `home_glass_portada.webp` está en `website.layout`, así que se precarga en todas las páginas.
- El selector de idioma del footer está comentado; su CSS (`.hg-footer-lang*`) queda muerto.

## Proposed change
1. Quitar `menu_inicio` y `menu_contacto` y sus entradas en `i18n/*.po`. Las copias por website ya creadas se borran con una acción planificada de un solo uso (`cron_limpieza_menus_duplicados`).
2. Footer como `<div id="footer" class="hg-footer" t-if="not no_footer">`; no renderizar `o_footer_copyright` con `t-if="False"` (sin borrar el nodo) y quitar la regla CSS que lo oculta.
3. Preload de la hero solo si `main_object` es la `website.page` con url `/`.
4. Borrar el bloque comentado y el CSS `.hg-footer-lang*`.

## Technical decision
- Reutilizar los menús del core evita mantener traducciones propias. `website/models/ir_translation.py` ya propaga traducciones a las copias por website.
- Limpieza mediante `ir.cron` de un solo uso en `data/07_limpieza_menus.xml` (`noupdate="1"`): `state=code`, `model_id=website.model_website_menu`, `numbercall=1`, `nextcall=now`. El código ejecuta `env['website.menu'].with_context(lang='en_US').search([('website_id','!=',False),('page_id','=',False),('url','in',['/','/contactus']),('name','in',['Inicio','Contáctenos'])]).unlink()`.
  - **`lang='en_US'` es obligatorio.** En Odoo 15, `search` sobre un campo traducible compara con el valor en el idioma del contexto, y en es_ES los "Home"/"Contact us" del core se llaman "Inicio"/"Contáctenos". En la primera ejecución en `home-glass-dev` (sin este contexto) se borraron también los menús del core de la web 1, y se restauraron a mano.
  - **`page_id=False`** es una segunda protección: los menús del core apuntan a `homepage_page`/`contactus_page` y los nuestros no.
  - Odoo 15 lo desactiva solo tras ejecutarlo (`ir_cron.py:345-362`). Queda visible en Ajustes → Técnico → Acciones planificadas y se puede relanzar a mano.
  - Se prefiere a un `<delete>` o a un script de migración: se ve y se controla desde la interfaz, y no hace falta mantener migraciones.
  - Volver a ejecutarlo no tiene efecto. El nombre fuente de los menús del core es "Home"/"Contact us", así que no los toca. El domain se comprueba en `odoo shell` antes.
  - Se ejecuta de forma asíncrona, en el siguiente ciclo de crons tras arrancar el servidor, no durante `-u --stop-after-init`. Requiere `max_cron_threads > 0`.
- Ocultar el copyright vía atributo mantiene el nodo para otros xpath del core (`website_templates.xml:141,1804`).

## Affected files
- `selector_packs/views/website_pages.xml`
- `selector_packs/data/07_limpieza_menus.xml` (nuevo)
- `selector_packs/__manifest__.py` (registrar el data)
- `selector_packs/i18n/{es,ca_ES,en_US}.po`
- `selector_packs/static/src/css/website.css`

## Tests
- `-u selector_packs` sin errores; arrancar el servidor y comprobar que el cron se ejecutó y quedó `active=False`, `numbercall=0`.
- `odoo shell`: menús de primer nivel por website = Inicio/Home, Selector, Sobre Nosotros, Contact us (4, sin duplicados), en es/ca/en.
- Inspector: un solo `<footer id="bottom">`, sin `<footer>` anidado ni "Powered by Odoo".
- `/contactus`: sin precarga de `home_glass_portada.webp` en Network.

## Acceptance criteria
- Cabecera sin duplicados y traducida en los tres idiomas.
- Footer único y HTML válido.
- La hero solo se precarga en la home.

## Notas de implementación
- **Incidencia en la primera ejecución.** El cron se ejecutó en `home-glass-dev` sin `lang='en_US'` y borró también los menús del core "Home" y "Contact us" de la web 1 (ids 5 y 6).
  - Se restauraron con nombre fuente, `page_id` y traducciones es_ES copiadas del menú plantilla (ids nuevos 15 y 16).
  - Se corrigió el código del cron en el XML y en el registro de esta BD.
- **Verificado:**
  - Cabecera: Inicio · Selector · Sobre Nosotros · Contáctenos.
  - Un solo `<footer>`, sin anidar y sin copyright de Odoo.
  - El preload de la hero solo aparece en `/`.
