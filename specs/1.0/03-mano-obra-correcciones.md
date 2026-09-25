# 03 — Correcciones de la mano de obra en packs

**Estado:** Implementada (2026-09-25), pendiente de aceptación

## Purpose
Que el total de la web, la descripción del lead y el pedido coincidan; que el mensaje del cliente se guarde de forma fiel y sin errores; y que la mano de obra se pueda gestionar desde el backend.

## Context
Commit e9f4b97:
- La línea de pedido usa `lp.quantity`, pero el resumen web y el "PRECIO ESTIMADO" usan solo `list_price`. Con quantity > 1 los totales no coinciden.
- `_build_description` concatena `contact_msg` y los nombres en HTML crudo. `crm.lead.description` es `fields.Html` sanitizado: no hay XSS, pero `<`, `&` y los saltos de línea se pierden.
- `contact.get('message', '').strip()` falla con `AttributeError` si llega `"message": null`.
- `selector.js` solo relee la mano de obra del DOM si el estado de localStorage no la tiene, así que un precio cambiado no se refleja para quien vuelve.
- `is_labour` no aparece en la vista de líneas del pack: solo se puede marcar por XML.

## Proposed change
1. `(contact.get('message') or '').strip()`.
2. Escapar `pack.name`, `product.name` y los atributos con `html_escape`; `contact_msg` con `plaintext2html`.
3. Nuevo helper `_get_labour_lines(pack_id)` → `[{name, base_product_id, variant, quantity, unit_price, subtotal}]`, usado en `pack_selector`, `_create_lead` y `_build_description`.
4. `selector.js`: leer siempre `#hg-labour-data` del DOM.
5. Nueva vista `selector_packs/views/product_pack_views.xml` que hereda `product_combo_pack.product_template_inherit_pack` y añade `is_labour` tras `quantity`.

## Technical decision
- Un solo helper evita tres búsquedas duplicadas y garantiza un único cálculo del precio (`variant.lst_price * quantity`).
- La vista va en `selector_packs` para no tocar el módulo vendorizado.

## Affected files
- `selector_packs/controller/main.py`
- `selector_packs/static/src/js/selector.js`
- `selector_packs/views/product_pack_views.xml` (nuevo)
- `selector_packs/__manifest__.py`

## Tests
- Labour con `quantity=2`: el resumen web, el PRECIO ESTIMADO del lead y el total del `sale.order` coinciden.
- Mensaje `<80cm & "test"` en varias líneas: se ve literal y con saltos de línea en el lead.
- API con `"message": null`: el lead se crea.
- Cambiar el precio de la mano de obra con estado guardado: el resumen muestra el precio nuevo.
- Backend: la columna "Mano de obra" es visible y editable en las líneas del pack.

## Acceptance criteria
- Los tres totales coinciden para cualquier cantidad.
- No se pierde texto del cliente y no hay errores con campos nulos.
- `is_labour` es gestionable desde el formulario del pack.

## Notas de implementación
- **Error de escapado durante la implementación.** `str += Markup` escapa el operando de la izquierda, y la primera versión escapó toda la descripción. Se corrigió interpolando con f-string.
- **Verificado:**
  - Con `quantity=2`, la web (1500 €), el lead (1711 €) y el pedido (1711 €) coinciden. La cantidad se devolvió después a 1.
  - `message: null` crea el lead sin error.
  - El mensaje con `<`, `&`, `"` y saltos de línea se ve literal.
  - La columna "Mano de obra" es visible en el backend.
