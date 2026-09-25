# 09 — Imagen propia por pack en /reformas/packs

**Estado:** Implementada (2026-09-25), pendiente de aceptación

## Purpose
Que cada tarjeta de `/reformas/packs` muestre la imagen del propio pack (producto de servicio de reforma), subida desde el backend, y que use la imagen de ejemplo actual cuando el pack no tenga imagen.

## Context
- `packs_home` (`views/templates.xml`) pinta la misma imagen estática en todas las tarjetas: `/selector_packs/static/src/img/web/home_glass_ejemplo_pack_reforma.jpeg`. Se fijó en el commit `1a159fd` porque ningún pack tenía imagen.
- Hoy los 4 packs (ids 75–78 en local) no tienen `image_1920`. **La clienta subirá las fotos desde el backend**; el usuario pondrá ahora unas de ejemplo. No se añaden imágenes al módulo.
- La ruta pública `/homeglass/image/<id>/<campo>` (spec 07) ya sirve imágenes de packs (`is_pack=True`) a visitantes sin login.
- Si el pack no tiene imagen, esa ruta responde **200 con el placeholder de Odoo**, no con un error, así que un `onerror` en el navegador no serviría como respaldo.
- La tarjeta ya define la proporción: `.hg-pack-image` con `aspect-ratio: 4 / 3`, y la `img` con `width/height: 100%` y `object-fit: cover` (`selector.css:137-152`). El `<img>` lleva `width="400" height="300"`.

## Proposed change
En `packs_home`, elegir la imagen en el servidor según si el pack tiene imagen:
```xml
<t t-set="pack_img_url" t-value="'/homeglass/image/%s/' % pack.id"/>
<t t-if="pack.image_1920">
    <img t-att-src="pack_img_url + 'image_512'"
         t-att-srcset="'%simage_512 1x, %simage_1024 2x' % (pack_img_url, pack_img_url)"
         t-att-alt="pack.name" width="400" height="300" loading="lazy"/>
</t>
<t t-else="">
    <img src="/selector_packs/static/src/img/web/home_glass_ejemplo_pack_reforma.jpeg"
         t-att-alt="pack.name" width="400" height="300" loading="lazy"/>
</t>
```

## Technical decision
- **Respaldo en el servidor** (`t-if pack.image_1920`): la ruta de imagen nunca da error, así que el navegador no puede detectar la falta de foto.
- **`image_512`** es suficiente para una tarjeta de unos 400px de ancho, y `srcset` con `image_1024 2x` da nitidez en pantallas retina.
- **Proporción y recorte:** se mantienen `aspect-ratio: 4/3` y `object-fit: cover`. Cualquier foto se recorta centrada, sin deformarse, y los atributos `width`/`height` evitan saltos de maquetación.
- **`loading="lazy"`**, porque las tarjetas quedan por debajo de la cabecera.
- `packs` llega con `sudo()` desde `list_packs`, así que leer `image_1920` no da error de permisos al usuario público.

## Affected files
- `selector_packs/views/templates.xml`

## Tests
1. Sin imágenes en ningún pack: las 4 tarjetas muestran la imagen de ejemplo (igual que ahora).
2. Subir una imagen a un pack desde el backend: su tarjeta la muestra y el resto sigue con la de ejemplo.
3. Sesión anónima: la imagen del pack se ve (no sale el placeholder de Odoo).
4. Probar con una imagen vertical y otra panorámica: ambas se recortan a 4:3, sin deformarse.
5. En la pestaña Network, la tarjeta pide `image_512` (o `image_1024` en 2x).

## Acceptance criteria
- Cada pack con imagen muestra la suya; los que no tienen, la de ejemplo.
- La tarjeta mantiene la proporción 4:3 sin saltos de maquetación, con cualquier foto.
- Visible para visitantes sin login.

## Notas de implementación
- **Verificado en sesión anónima:**
  - Sin imágenes, las 4 tarjetas muestran la de ejemplo.
  - Con una imagen panorámica temporal (603×237) en el pack 76, su tarjeta pide `/homeglass/image/76/image_512`, que llega a 512×201 y se recorta con `object-fit: cover` a la misma caja de 268×201 (4:3) que el resto, sin deformarse.
- La imagen temporal se quitó después: los packs locales vuelven a estar sin imagen, a la espera de las de ejemplo del usuario.
