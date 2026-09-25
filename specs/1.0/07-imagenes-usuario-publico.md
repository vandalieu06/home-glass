# 07 — Imágenes de producto visibles para usuarios sin login

**Estado:** Implementada (2026-09-25), pendiente de aceptación

## Purpose
Que los visitantes anónimos vean las fotos reales de los productos y packs en el selector, en lugar del placeholder de Odoo.

## Context
- Sin `website_sale`, el usuario público no tiene lectura sobre `product.template`. Por eso `/web/image/product.template/<id>/image_1024` devuelve el placeholder (20 KB) aunque la imagen existe: el plato Nature tiene 200 KB en `ir_attachment`.
- Con sesión iniciada las fotos se ven, y por eso no se había detectado.
- El controller construye estas URLs en `_get_packs`, `_get_product_attributes_data` y `_get_pack_products` (`controller/main.py`). El PDF no usa imágenes.

## Proposed change
1. Nueva ruta en `controller/main.py`: `@http.route('/homeglass/image/<int:product_tmpl_id>/<string:field>', type='http', auth='public')`.
   - **Campos permitidos:** `image_128`, `image_256`, `image_512`, `image_1024`, `image_1920`. Cualquier otro → 404.
   - **Registros permitidos:** packs (`is_pack=True`) o productos que sean `base_product_id` de alguna línea de `pack.products`. Cualquier otro → 404.
   - **Respuesta:** `request.env['ir.http'].sudo()._content_image(model='product.template', res_id=..., field=...)`, el helper del core (`addons/web/models/ir_http.py:140`), que ya gestiona el placeholder, el redimensionado, el ETag/304 y la caché.
2. Cambiar las tres URLs `/web/image/product.template/{id}/image_1024` por `/homeglass/image/{id}/image_1024`.

## Technical decision
- No se da lectura de `product.template` al grupo público mediante `ir.model.access`. Eso expondría todos los productos y sus campos (costes, etc.).
- La ruta con `sudo` limita la exposición a imágenes de productos del selector, y reutilizar el helper del core evita reimplementar la caché y el redimensionado.

## Affected files
- `selector_packs/controller/main.py`

## Tests
- `curl` sin cookie:
  - `/homeglass/image/29/image_1024` → 200, unos 200 KB, `image/*`.
  - `/homeglass/image/29/list_price` → 404.
  - Un template que no está en ningún pack → 404.
- agent-browser, en sesión anónima: la foto del plato Nature aparece en el paso Plato del BASIC.

## Acceptance criteria
- Un visitante sin login ve las fotos reales de los productos y packs del selector.
- No se puede obtener, por esta ruta, ningún campo ni producto fuera de la lista blanca.

## Notas de implementación
- **Verificado sin cookie:**
  - `/homeglass/image/29/image_1024` → 200 `image/png` de 202 890 bytes (la foto real).
  - `/homeglass/image/29/list_price` → 404.
  - `/homeglass/image/99999/...` → 404.
  - Template 8, que no está en ningún pack → 404.
- En agent-browser, en sesión anónima, se ven las fotos del plato Nature (BASIC) y de los 5 platos de la PREMIUM.
- Los packs sin imagen propia (p. ej. 75) devuelven el placeholder del core. Es lo esperado: `packs_home` usa una imagen estática.
