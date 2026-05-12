# Sesión: Cambio de mueble fijo a configurable en pack Reforma Integral BASIC

## Fecha
2026-05-12

## Contexto
El pack **Reforma Integral BASIC** usaba el producto simple `mueble_sansa_80` ("Mueble SANSA Integrado 80cm") en el paso de muebles, pero debería usar el producto configurable `mueble_sansa` ("Mueble Sansa suspendido") con la variante de 80cm preseleccionada.

## Investigación
- `selector_packs/data/06_pack_reforma.xml:83` — el pack `pack_reforma_integral_basic` referenciaba `mueble_sansa_80`
- `selector_packs/data/05_productos_simples.xml:96-107` — definición del producto simple `mueble_sansa_80` (sin atributos)
- `selector_packs/data/04_muebles_bano_fase1.xml:739` — producto configurable `mueble_sansa` con atributos (Acabado, Modelo, Tipo)
- `selector_packs/controller/main.py:470` — `mueble_sansa` ya estaba en la lista de productos preseleccionados
- `selector_packs/controller/main.py:492-513` — ya existía lógica para preseleccionar Modelo="Set 80 1C" y Tipo="Integrado"

## Cambios realizados

### 1. `selector_packs/data/06_pack_reforma.xml` (línea 83)
- **Antes:** `<field name="base_product_id" ref="mueble_sansa_80"/>`
- **Después:** `<field name="base_product_id" ref="mueble_sansa"/>`

### 2. `selector_packs/data/05_productos_simples.xml` (líneas 96-107)
- Eliminado el registro `mueble_sansa_80` al quedar huérfano (sin referencias)

## Archivos modificados
- `selector_packs/data/06_pack_reforma.xml`
- `selector_packs/data/05_productos_simples.xml`

## Notas
- No fue necesario modificar el controlador (`main.py`) porque ya tenía toda la lógica para `mueble_sansa` en `pack_reforma_integral_basic`.
- El producto `mueble_sansa` ya no tenía referencias externas tras el cambio, por lo que se eliminó.
