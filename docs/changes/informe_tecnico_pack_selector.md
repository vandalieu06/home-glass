# Informe Técnico: Implementación de Sistema de Selector de Packs de Reforma

## Resumen Ejecutivo

Este documento describe los cambios implementados para permitir que los productos de reforma (packs) funcionen como selectores web donde el usuario puede elegir variantes específicas de los productos base (platos de ducha, mamparas, grifos, etc.) antes de generar un presupuesto.

---

## 1. Contexto y Objetivo

### 1.1 Situación Inicial

El módulo `product_combo_pack` (de terceros) estaba diseñado para:
- Crear productos "pack" que contienen productos base
- Usar `product_id` (product.product - variantes) para los productos del pack
- Generar automáticamente movimientos de stock al confirmar pedidos de venta
- **Restringir** que los packs pudieran ser de tipo "service"

### 1.2 Requerimiento del Cliente (Home Glass)

La empresa necesita un sistema web para que clientes seleccionen packs de reforma donde:
- Cada pack contiene categorías de productos (platos, mamparas, grifos, etc.)
- El usuario selecciona las variantes específicas (color, medida, modelo)
- El resultado genera un `crm.lead` con líneas de presupuesto
- No requiere gestión de stock ni pagos en Odoo

### 1.3 Solución Implementada

- Packs como productos tipo "service" (no stock)
- Usar `product.template` en lugar de `product.product` para los productos del pack
- El selector web manejará la lógica de selección de variantes

---

## 2. Arquitectura de la Solución

### 2.1 Modelo de Datos

```
product.template (Pack de Reforma)
├── is_pack = True
├── type = 'service'
└── pack_products_ids (One2many)
    └── pack.products
        ├── product_tmpl_id → product.template (REQUERIDO)
        └── product_id → product.product (OCULTO)
```

### 2.2 Flujo de Usuario

```
1. Usuario accede a /reformas/packs
2. Ve los 4 tipos de packs disponibles:
   - Reforma BASIC
   - Reforma BASIC PLUS
   - Reforma Integral BASIC
   - Reforma Integral PREMIUM
3. Selecciona un pack → va a selector de variantes
4. Para cada producto base (plato, mampara, grifo):
   - Selecciona color, medida u otras variantes
5. Completa formulario de contacto
6. POST a controlador → genera crm.lead con sale.order.line
```

---

## 3. Cambios Realizados

### 3.1 Módulo: `product_combo_pack`

#### 3.1.1 Archivo: `models/pack_products.py`

**Cambios:**
- Campo `product_tmpl_id` ahora es **requerido**
- Campo `product_id` ahora es **opcional** (usado solo para casos legacy)
- Eliminados métodos `@api.onchange` que autocompletaban variants
- Eliminada validación ` _check_product_or_template`
- Actualizados métodos compute para soportar ambos casos

**Código modificado:**
```python
# Antes
product_id = fields.Many2one('product.product', string='Product', required=True,
                             domain=[('is_pack', '=', False)])
product_tmpl_id = fields.Many2one('product.template', string='Product')

# Después
product_id = fields.Many2one('product.product', string='Product (Variant)',
                             domain=[('is_pack', '=', False)],
                             help='Optional: Select specific variant for this pack line')
product_tmpl_id = fields.Many2one('product.template', string='Product',
                                   domain=[('is_pack', '=', False)],
                                   required=True)
```

#### 3.1.2 Archivo: `models/product_form.py`

**Cambios:**
- Eliminado restricción que impedía `is_pack=True` con `type='service'`
- Actualizado método `get_quantity()` para soportar `product_tmpl_id`
- Actualizado método `change_quantity_based_on_location()` para soportar templates

**Código eliminado:**
```python
# En create()
if values.get('type', False) == 'service':
    raise UserError(_('You cannot define a pack product as a service..!'))

# En write()
if rec.type == 'service':
    raise UserError(_('You cannot define a pack product as a service..!'))
```

#### 3.1.3 Archivo: `views/product_form_view.xml`

**Cambios:**
- Agregado campo `product_tmpl_id` a la vista del pack
- Ocultado campo `product_id` (invisible=True)
- Actualizadas etiquetas para mejor UX

---

### 3.2 Módulo: `selector_packs`

#### 3.2.1 Archivo: `__manifest__.py`

**Cambios:**
- Agregada dependencia `product_combo_pack`
- Agregado archivo de datos `data/pack_reforma.xml`

```python
'depends': ['base', 'web', 'website', 'product', 'product_combo_pack'],
'data': [
    'data/product.attribute.xml',
    'data/product.template.xml',
    'data/pack_reforma.xml',  # Nuevo
],
```

#### 3.2.2 Archivo: `data/pack_reforma.xml` (NUEVO)

**Contenido:**
- 4 productos de reforma como packs tipo service
- Cada pack con sus `pack_products_ids` apuntando a los templates base

| Pack | Productos Base (Templates) |
|------|----------------------------|
| Reforma BASIC | Plato Nature, Azulejo 30x60 Brillo, Mampara A20 |
| Reforma BASIC PLUS | + Grifo STAR |
| Reforma Integral BASIC | Plato Nature, Grifo KAPPA, Mampara A40, Mueble SANSA 80cm, Inodoro |
| Reforma Integral PREMIUM | Todos los productos del catálogo |

#### 3.2.3 Archivo: `data/product.template.xml`

**Cambios:**
- Eliminados registros duplicados de reforma (ahora están en pack_reforma.xml)

---

## 4. Productos Defined en el Sistema

### 4.1 Productos Base del Catálogo

Los siguientes templates están disponibles en `product.template.xml`:

#### Platos de Ducha (con atributo Color)
- Plato Ducha Nature
- Plato Ducha Hermes
- Plato Ducha Marco
- Plato Ducha Premium
- Plato Ducha Neo

#### Mamparas (con atributos Color + Vidrio)
- Serie Alfa: A20, A25, A40, A90
- Serie Beta: B20, B40, B90
- Serie Xi: C20, C25, C40, C90
- Serie Delta: D20, D25, D40, D90
- Serie Epsilon: E20
- Serie Omega: O00, O10, O11, O15
- Serie Gamma: G01, G02
- Serie Alfa/Gamma Gold: AG01, AG02, AG20, AG25, AG40, AG90

#### Productos Simples (sin variantes o con variantes predefinidas)
- Grifo STAR
- Grifo KAPPA
- Mueble SANSA 80cm
- Azulejo Blanco Brillo 30x60
- Azulejo Blanco Mate 30x60
- Revestimiento Blanco Brillo 30x90
- Revestimiento Blanco Mate 30x90
- Inodoro Sanitario

### 4.2 Packs de Reforma

| External ID | Nombre | Descripción |
|-------------|--------|-------------|
| `product_reforma_basic` | Reforma BASIC | Cambio bañera por plato de ducha |
| `product_reforma_basic_plus` | Reforma BASIC PLUS | Cambio bañera por plato + grifo |
| `product_reforma_integral_basic` | Reforma Integral BASIC | Reforma integral hasta 5m2 |
| `product_reforma_integral_premium` | Reforma Integral PREMIUM | Reforma integral con todos los materiales a elegir |

---

## 5. Atributos Definidos

### 5.1 Color Plato Ducha
- Blanco, Beige, Moka, Gris Perla, Gris, Grafito

### 5.2 Color Mampara
- Blanco, Negro, Aluminio Brillo

### 5.3 Vidrio
- Transparente

---

## 6. Corrección de Bug: Visualización de Producto Base

### 6.1 Problema Identificado

Al crear packs de reforma y agregar productos base, en la vista del formulario se mostraba el nombre del **pack** en lugar del **producto base** seleccionado. Esto causaba confusión al usuario.

**Causa raíz:** El campo `product_tmpl_id` en el modelo `pack.products` se usaba para dos propósitos simultáneamente:
1. La relación inversa del One2many (apunta al pack)
2. El producto base del pack

### 6.2 Solución Implementada

Se agregó un nuevo campo `base_product_id` para separar los dos conceptos:

| Campo | Propósito |
|-------|-----------|
| `product_tmpl_id` | Solo para la relación inversa (apunta al pack) - Campo técnico |
| `base_product_id` | Guarda el producto base del pack - Visible en UI |
| `product_id` | Opcional, para variantes específicas (oculto) |

### 6.3 Archivos Modificados

#### 6.3.1 `models/pack_products.py`
- Agregado campo `base_product_id` como requerido
- Actualizado `_rec_name` a `base_product_id`
- Actualizados métodos compute para usar `base_product_id`

```python
# Nuevo campo agregado
base_product_id = fields.Many2one('product.template', string='Base Product',
                                  domain=[('is_pack', '=', False)],
                                  required=True,
                                  help='The base product (template) included in this pack')
```

#### 6.3.2 `views/product_form_view.xml`
- Cambiado el campo mostrado de `product_tmpl_id` a `base_product_id`
- Ocultados campos técnicos `product_id` y `product_tmpl_id`

```xml
<field name="base_product_id" string="Product"
       options='{"no_open":True}'
       domain="[('is_pack', '=', False)]"/>
<field name="product_id" invisible="True"/>
<field name="product_tmpl_id" invisible="True"/>
```

#### 6.3.3 `models/product_form.py`
- Actualizado `get_quantity()` para usar `base_product_id`
- Actualizado `change_quantity_based_on_location()` para usar `base_product_id`

#### 6.3.4 `data/pack_reforma.xml`
- Estructura actualizada para usar ambos campos:
  - `product_tmpl_id` → apunta al pack (Reforma BASIC, etc.)
  - `base_product_id` → apunta al producto base (Plato Nature, Mampara A20, etc.)

```xml
<record id="product_reforma_basic_pack_line_1" model="pack.products">
    <field name="product_tmpl_id" ref="product_reforma_basic"/>  <!-- El pack -->
    <field name="base_product_id" ref="product_plato_nature"/>   <!-- El producto base -->
    <field name="quantity">1</field>
</record>
```

---

## 7. Pendientes de Implementación

### 7.1 Controlador Web (PRÓXIMO)
- `/reformas/packs` - Vista de selección de packs
- `/reformas/packs/<pack_id>` - Selector de variantes
- `/api/selector` - API centralizada para productos/variantes
- POST para generar crm.lead

### 7.2 Datos de Catálogo
- Completar precios por variante según catálogos (platos con medida, mamparas con medida)
- Agregar atributos de dimensión (ancho x largo) para platos y mamparas

---

## 8. Testing Recomendado

1. **Verificar packs en backend:**
   - Ir a Productos → Product Pack
   - Crear nuevo pack tipo service con is_pack=True
   - Agregar productos usando product_tmpl_id

2. **Verificar selector web:**
   - Acceder a /reformas/packs
   - Seleccionar un pack
   - Verificar que aparezcan las variantes de los productos

3. **Verificar generación de lead:**
   - Completar selector de variantes
   - Enviar formulario de contacto
   - Verificar crm.lead creado con líneas correctas

---

## 9. Glosario

| Término | Definición |
|---------|------------|
| `product.template` | Modelo Odoo que define un producto base (sin variantes) |
| `product.product` | Modelo Odoo que representa una variante específica |
| `pack.products` | Modelo intermedio que conecta un pack con sus productos |
| `is_pack` | Campo booleano que indica si un producto es un pack |
| `crm.lead` | Modelo Odoo para oportunidades/leads de clientes |
| `sale.order.line` | Modelo Odoo para líneas de presupuesto/venta |

---

## 10. Referencias

- Módulo `product_combo_pack`: /mnt/extra-addons-extra/product_combo_pack/
- Módulo `selector_packs`: /mnt/extra-addons-extra/selector_packs/
- Catálogo de productos: docs/productos/catalogo/
- Presupuestos: docs/presupuestos/

---

*Documento generado: Mayo 2026*
*Proyecto: Home Glass - Sistema de Selector de Packs de Reforma*
*Versión: 1.0*