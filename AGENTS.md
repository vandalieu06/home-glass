# AGENTS.md

## Entorno local

- Odoo **15.0** en `http://localhost:8071`, base de datos `home-glass-dev`, contenedor `home-glass-web-1` (DB: `home-glass-db-1`).
- Credenciales locales: usuario `admin`, password `admin`. Nunca reutilizarlas fuera de local. El master password de Odoo es `admin1234` (en `config/odoo.conf`, fuera del repo).
- El repo se monta en `/mnt/extra-addons-extra`; el compose y `odoo.conf` viven en `/home/jhonnyc/Dev/work/containers/home-glass/`, **no** en este repo.
- Fuente Odoo 15 en `/home/jhonnyc/Dev/work/source_odoo/15` (`odoo/` + `addons/`). Leerla antes de asumir comportamiento del core o de la API (es Odoo 15, no 16+).
- Actualizar un módulo tras cambiar código:

  ```bash
  podman exec -it home-glass-web-1 odoo -d home-glass-dev -u selector_packs --stop-after-init
  ```

  Varios módulos: `-u selector_packs,product_combo_pack`.

## Interactuar con la instancia

- Navegador en `http://localhost:8071` (backend `/web`, web `/reformas/packs`).
- Shell Odoo (para consultar modelos/datos en vivo sin adivinar desde el código):

  ```bash
  podman exec -it home-glass-web-1 odoo shell -d home-glass-dev
  ```

- SQL directo: `podman exec -it home-glass-db-1 psql -U odoo -d home-glass-dev`.

## Gotcha: `noupdate="1"` en los datos

- Todos los `selector_packs/data/*.xml` usan `<data noupdate="1">` salvo `06_pack_reforma.xml`. Por eso `-u` **no** reaplica precios, imágenes, atributos ni variantes ya creados.
- Para forzar la reaplicación hay que reinicializar (`-i selector_packs`) o actualizar el registro a mano. No basta con `-u`.

## Estructura y arquitectura

- `selector_packs`: capa custom. No tiene modelos (`models/__init__.py` vacío); son controller + vistas QWeb + datos + assets.
  - Controller único: `controller/main.py`. Web `/reformas/packs` y `/reformas/packs/<id>`; API JSON `/homeglass/selector/api` (POST, `csrf=False`) que despacha por `action` (`get_packs`, `get_pack_products`, `get_product_attributes`, `get_pack_categories`, `get_category_products`, `validate_selections`, `create_lead`); PDF `/print/presupuesto/<sale_order_id>`.
  - Todo va con `sudo()` y `auth='public'`: el portal es público y crea `crm.lead` + `sale.order` (no factura).
  - La categoría de producto (`plato`, `mampara`, `grifo`, `azulejo`, `mueble`, `sanitario`) se deduce **por palabras del nombre**, no por `product.category` (`_get_product_category`). Renombrar un producto puede romper la agrupación del selector.
  - Preselección y restricciones de atributos están **hardcodeadas por XML ID externo** (`pack_reforma_basic`, `plato_nature`, `mampara_a20`, `mueble_sansa`...). Cambiar un `id=` de `data/*.xml` rompe el comportamiento.
- `product_combo_pack`: módulo vendorizado de Cybrosys (AGPL-3, v15.0.1.0.1). Define `product.template.is_pack`, `pack.products`, `pack_products_ids`. Evitar tocarlo; las personalizaciones van en `selector_packs`.
- `DESIGN.md` es el sistema de diseño (MiniMax) que aplican tanto `website.css` como el reporte PDF QWeb. Leerlo antes de cambiar estilos.
- i18n en `selector_packs/i18n/*.po` (es/ca/en); `translate_modules = ['all']` en `odoo.conf`.

## Convenciones

- Commits en conventional commits **sin scope** (`feat:`, `fix:`, `style:`, `chore:`) o con prefijo `[ADD]`/`[FIX]`; en español.
- Docs y comentarios/plantillas en español.
- Python: estilo Odoo 15, `from odoo import ...`, `_` para traducción, 4 espacios, sin tests ni linters configurados.

## Flujo specs-driven (obligatorio)

- Nada de código sin spec: toda feature o fix se documenta antes en `specs/<version>/NN-tema.md` y se confirma con el usuario.
- Formato de spec: Purpose / Context / Proposed change / Technical decision / Affected files / Tests / Acceptance criteria.
- Cada versión lleva `specs/<version>/00-changelog.md`. Los cambios nuevos se anotan en la versión actual; al publicar un set se sube la versión.
- Al terminar: marcar la spec como implementada/aceptada, actualizar `docs/` y anotar el commit en el changelog. `docs/` es la referencia autoritativa del estado real; `specs/` es el contrato/plan por versión.
- Histórico previo a `specs/`: `docs/changes/plan_*.md` e `informe_*.md`; se conservan como referencia.
