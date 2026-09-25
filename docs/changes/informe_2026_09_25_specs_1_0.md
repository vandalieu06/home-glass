# Informe 2026-09-25 — Implementación de specs 1.0 (01–06)

Referencia: `specs/1.0/00-changelog.md`.

## Estado real tras los cambios
- **Menús web.** Se usan los del core (`website.menu_home`, `website.menu_contactus`) más Selector y Sobre Nosotros de `selector_packs`. La limpieza de duplicados se hace con el cron de un solo uso `selector_packs.cron_limpieza_menus_duplicados` (inactivo tras ejecutarse).
- **Footer.** `div#footer.hg-footer` dentro de `footer#bottom` del core. El copyright de Odoo no se renderiza (`t-if="False"`).
- **CSS.** `website.css` va en `web.assets_frontend`. El preload de la hero solo se hace en la home.
- **Mano de obra.**
  - El helper `_get_labour_lines` es la única fuente de precio (`lst_price * quantity`) para la web, el lead y el pedido.
  - `is_labour` es editable en las líneas del pack (vista `selector_packs.product_template_pack_labour_view`).
- **Restricciones por pack.** Ahora sí se aplican: `_get_xml_name` quita el prefijo de módulo del XML ID. El BASIC ofrece Plato Nature Blanco, Azulejo 30x60 Brillo/Mate y Mampara A20 Blanco + Transparente.
- **Campos del selector.** Selects e inputs de 40px (44px en mobile) sin padding vertical: el texto ya no se corta.

## Pendientes y decisiones
1. **Preselección del mueble Sansa (Integral BASIC):** decidido no preseleccionar modelo. El catálogo solo tiene modelos de 2 piezas y el cliente elige.
2. **Imágenes para visitantes anónimos:** resuelto (spec `1.0/07`) con la ruta pública `/homeglass/image/<id>/<campo>`. Tiene lista blanca de campos de imagen y solo sirve packs y productos de pack.
3. **Datos de prueba en `home-glass-dev`:** los leads y pedidos 1–4 (`qa-*@example.com`) se conservan porque es una BD de pruebas.
4. **Stepper en móvil:** resuelto (spec `1.0/08`). Por debajo de 1024px se muestra una barra de progreso segmentada: "Paso N de M", el paso actual y el siguiente.
5. **Gotcha de assets:** el minificador JS de Odoo 15 (`rjsmin`) borra el espacio tras `:` dentro de los template literals. Para texto visible usar `&nbsp;` o concatenar con comillas normales.
