# 06 — Restricciones de materiales por pack (Reforma BASIC)

**Estado:** Implementada (2026-09-25), pendiente de aceptación

## Purpose
Que la Reforma BASIC ofrezca solo los materiales del presupuesto PRE/25506 (`docs/presupuestos/basic.md`) y que las restricciones y preselecciones definidas para cada pack se apliquen de verdad.
- **Plato:** Nature, solo en Blanco.
- **Azulejos:** Blanco Mate o Blanco Brillo 30x60.
- **Mampara:** A20 Blanco con vidrio Transparente.

## Context
- **Causa raíz.** `get_external_id()` devuelve `'selector_packs.pack_reforma_basic'`, con prefijo de módulo (`odoo/models.py`). Sin embargo, `color_restrictions`, `vidrio_restrictions`, `azulejo_restrictions` y `preselected_products` del controller se buscan con claves sin prefijo (`'pack_reforma_basic'`, `'plato_nature'`…). Por eso **ninguna restricción ni preselección se aplica en ningún pack**.
  - Afecta a `_get_pack_products`, `_filter_attributes_by_pack`, `_is_product_preselected` y `_get_preselected_values`.
- **Evidencia (API `get_category_products`, pack 75).**
  - Plato Nature devuelve los 6 colores (Blanco, Beige, Moka, Gris Perla, Gris, Grafito).
  - Mampara A20 devuelve Blanco/Negro/Aluminio Brillo y vidrio Transparente/Decorado Fast.
- **Datos.** El BASIC solo tiene la línea `azulejo_30x60_brillo` (`06_pack_reforma.xml:18-22`), así que el cliente no puede elegir Mate. Brillo y Mate son dos productos separados, sin atributo "Acabado", por lo que `azulejo_restrictions` nunca tiene efecto. La clave `'azulejo_30x60'` de las preselecciones no corresponde a ningún producto.
- **Detalle de UI.** `default_value` solo se pinta en el `<select>` (`selector.js:536`), no se guarda en `state.selections`. Un atributo con un único valor permitido no queda seleccionado de verdad.

## Proposed change
1. **Helper** `_get_xml_name(record)` en `controller/main.py`, que devuelve el nombre del XML ID sin módulo:
   `(record.get_external_id().get(record.id) or '').split('.')[-1]`
   Se usa en los 4 métodos en lugar de `get_external_id().get(...)`.
2. **Datos** (`06_pack_reforma.xml`, sin `noupdate`, basta con `-u`): nueva línea `pack_reforma_basic_line_5` con `azulejo_30x60_mate`, quantity 1. El paso Azulejos ofrecerá Brillo o Mate.
3. **Claves de preselección** (`main.py:322-325` y `498-508`): `'azulejo_30x60'` → `'azulejo_30x60_brillo'`.
4. **Autoselección de valor único** (`selector.js`, render del paso de categoría, junto al bloque de preselección de `:333`): si un atributo ya filtrado tiene un solo valor y no hay selección, se asigna directamente en `state.selections[productId][attr.name]` y luego `saveState()`.
   - No se llama a `selectAttribute()`, porque vuelve a renderizar y provocaría un bucle.
   - "Blanco" quedará elegido y se enviará al crear el lead.

## Technical decision
- Se corrige la lectura de la clave, no los diccionarios: las restricciones ya están bien definidas por pack y producto.
- Quitar el prefijo con `split('.')` sirve para cualquier módulo; los XML ID de los packs son únicos dentro de `selector_packs`.
- Brillo y Mate se modelan como dos líneas del pack, siguiendo el patrón ya usado en Integral PREMIUM (`06_pack_reforma.xml:199-204`). No se crea un atributo nuevo.
- **Efecto colateral buscado:** empiezan a aplicarse también las restricciones y preselecciones de BASIC PLUS e Integral BASIC (colores del plato y la mampara, vidrio, grifo Star y Kappa, mueble Sansa Set 80 1C Integrado). Se validan contra `docs/presupuestos/basic_plus.md` e `integral_basic.md`.

## Affected files
- `selector_packs/controller/main.py`
- `selector_packs/data/06_pack_reforma.xml`
- `selector_packs/static/src/js/selector.js`

## Tests
1. `curl` a `get_category_products` con `pack_id=75`:
   - plato → Color solo `['Blanco']`
   - mampara → Color `['Blanco']`, Vidrio `['Transparente']`
   - azulejo → 2 productos (Brillo y Mate)
2. Repetir con los packs 76 y 77 y comparar con sus presupuestos en `docs/presupuestos/`.
3. Flujo completo con agent-browser en el BASIC:
   - el color del plato y el de la mampara salen ya seleccionados
   - en azulejos se puede elegir Mate
   - al enviar, el `sale.order` lleva la variante Blanco del plato y el azulejo elegido
4. Pack 78 (PREMIUM, sin restricciones): sigue ofreciendo todas las opciones.

## Acceptance criteria
- El BASIC solo permite los materiales de PRE/25506.
- Las restricciones y preselecciones de todos los packs se aplican según lo definido en el controller.
- Los atributos con un único valor quedan seleccionados y se guardan en el pedido.

## Notas de implementación
- **Preselección del mueble Sansa (Integral BASIC).** Al arreglar la clave empezó a aplicarse `Modelo = "Set 80 1C"`, pero `mueble_sansa` no tiene ese valor (sí tiene "Set 80 2C" y "Set 80 2P"), y tampoco hay ningún `Tipo` que contenga "Integrado". Ahora `_get_preselected_values` descarta los valores que el producto no tiene, así que esa preselección no se aplica. **Decisión del usuario (2026-09-25):** es correcto no preseleccionar el modelo. En el catálogo solo hay de 2 piezas, así que el cliente elige en el selector.
- **Verificado:**
  - BASIC: Plato Nature solo Blanco (autoseleccionado); azulejos Brillo o Mate; Mampara A20 Blanco + Transparente (autoseleccionados).
  - `sale.order` de prueba con las variantes correctas.
  - PREMIUM sigue sin restricciones.
