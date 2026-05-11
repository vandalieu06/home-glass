# Informe de Sesión: Corrección Frontend y Generación de Presupuesto desde Lead

## Resumen

Se corrigió un bug en el envío de datos del selector web y se implementó la generación automática de `sale.order` + `sale.order.line` al crear un `crm.lead`.

---

## 1. Problema Identificado

### Síntoma
Al generar un lead desde el selector web, la descripción mostraba:
```
PRESUPUESTO - Reforma Integral PREMIUM
SELECCIONES:
PRECIO ESTIMADO: 0.00€ (sin IVA)
```

### Causa Raíz

**Frontend:** El método `submitContact()` en `selector.js` solo enviaba `state.selections` (atributos seleccionados por producto) al backend, pero **no enviaba `state.selected_product`** (qué producto se eligió en cada categoría).

Esto provocaba que:
- El backend recibiera un diccionario vacío o incompleto
- `_build_description` iterara sobre claves vacías → 0 productos, 0.00€
- No se crearan líneas de presupuesto reales

### Problema Adicional
El backend creaba únicamente un `crm.lead` con la selección del usuario almacenada como **texto plano** en el campo `description`. No se generaba ningún `sale.order` (presupuesto real) ni `sale.order.line`, por lo que los datos quedaban en formato no estructurado e inutilizable para el flujo comercial de Odoo.

---

## 2. Cambios Realizados

### 2.1 Frontend: `selector_packs/static/src/js/selector.js`

**Fase 1 — Corrección de envío de datos**

- **Línea 813:** Se añadió `selected_product: state.selected_product` al payload de la llamada API `create_lead`.

```js
// Antes
api('create_lead', {
    pack_id: state.pack_id,
    selections: state.selections,
    contact: state.contact,
})

// Después
api('create_lead', {
    pack_id: state.pack_id,
    selections: state.selections,
    selected_product: state.selected_product,  // <-- NUEVO
    contact: state.contact,
})
```

Esto asegura que el backend reciba el mapeo completo de `{categoría: product_tmpl_id}`, permitiendo saber exactamente qué productos seleccionó el usuario.

---

### 2.2 Backend: `selector_packs/controller/main.py`

**Fase 2 — Generación de presupuesto desde lead**

#### 2.2.1 Método `_create_lead` (línea 210)

- Se añadió el parámetro `selected_product` del payload
- Ahora se crea un `sale.order` vinculado al lead mediante `opportunity_id`
- Se itera sobre `selected_product` para crear `sale.order.line` por cada producto

```python
# Nuevo: creación de sale.order vinculado al lead
sale_order = request.env['sale.order'].sudo().create({
    'partner_id': partner.id,
    'opportunity_id': lead.id,
    'origin': lead.name,
})

# Nuevo: creación de sale.order.line para cada producto seleccionado
for product_tmpl_id in selected_product.values():
    product_tmpl_id = int(product_tmpl_id)
    template = request.env['product.template'].sudo().browse(product_tmpl_id)
    if not template.exists():
        continue
    attribute_selections = selections.get(str(product_tmpl_id), {})
    variant = self._resolve_variant(template, attribute_selections)
    if not variant:
        continue
    request.env['sale.order.line'].sudo().create({
        'order_id': sale_order.id,
        'product_id': variant.id,
        'product_uom_qty': 1,
        'price_unit': variant.lst_price or 0.0,
        'name': template.name,
    })
```

- El retorno ahora incluye `sale_order_id`

#### 2.2.2 Nuevo método `_resolve_variant` (línea 559)

Resuelve un `product.product` (variante concreta) desde un `product.template` + selección de atributos.

```python
def _resolve_variant(self, template, attribute_selections):
    """Resuelve product.product desde un template + selección de atributos"""
    if not template.exists():
        return None
    if not attribute_selections or not any(attribute_selections.values()):
        return template.product_variant_id
    attr_value_ids = set()
    for value_id in attribute_selections.values():
        if value_id:
            attr_value_ids.add(int(value_id))
    if not attr_value_ids:
        return template.product_variant_id
    for variant in template.product_variant_ids:
        variant_attr_ids = set(
            variant.product_template_attribute_value_ids.mapped('product_attribute_value_id').ids
        )
        if variant_attr_ids == attr_value_ids:
            return variant
    return template.product_variant_id
```

#### 2.2.3 Método `_build_description` actualizado (línea 588)

- Cambiada la iteración: ahora usa `selected_product.values()` en lugar de `selections.keys()`
- Calcula precios usando `lst_price` de la variante resuelta mediante `_resolve_variant`

---

## 3. Flujo Actualizado

```
1. Usuario completa selección de productos y atributos en el selector web
2. Hace clic en "Solicitar Presupuesto"
3. Frontend envía: pack_id + selections + selected_product + contact
4. Backend:
   a. Crea/obtiene res.partner
   b. Crea crm.lead con descripción estructurada
   c. Crea sale.order vinculado al lead (opportunity_id)
   d. Por cada producto en selected_product:
      - Resuelve la variante (product.product) desde template + atributos
      - Crea sale.order.line con producto, cantidad y precio
   e. Retorna lead_id + sale_order_id
```

---

## 4. Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `selector_packs/static/src/js/selector.js` | Añadido `selected_product` al payload de `create_lead` |
| `selector_packs/controller/main.py` | Nueva lógica de creación de `sale.order` + `sale.order.line` |
| `selector_packs/controller/main.py` | Nuevo método `_resolve_variant` |
| `selector_packs/controller/main.py` | Actualizado `_build_description` para usar `selected_product` |

---

## 5. Testing Recomendado

1. **Acceder a un pack** → `/reformas/packs/<id>`
2. **Seleccionar productos y atributos** en cada categoría
3. **Enviar formulario de contacto**
4. **Verificar en backend:**
   - `crm.lead` creado con partner y descripción correcta
   - `sale.order` creado con `opportunity_id` apuntando al lead
   - `sale.order.line` con los productos y variantes seleccionados
   - Precios correctos según la variante

---

*Documento generado: Mayo 2026*
*Proyecto: Home Glass - Sistema de Selector de Packs de Reforma*
