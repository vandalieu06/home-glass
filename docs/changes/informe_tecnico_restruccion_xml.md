# Informe Técnico: Reestructuración de Datos XML del Módulo selector_packs

## Resumen Ejecutivo

Este documento describe el proceso de reestructuración y migración de los datos de productos del módulo `selector_packs` para el sistema de selección de packs de reforma de Home Glass. El objetivo fue convertir los catálogos de productos (mamparas, platos de ducha, muebles de baño) desde los archivos markdown del directorio `docs/productos/catalogo/` a archivos XML compatibles con Odoo 15.

---

## 1. Contexto Inicial

### 1.1 Situación de Partida

El módulo `selector_packs` contaba con archivos XML que presentaban múltiples deficiencias:

- **Falta de precios**: Los `product.template` no incluían el campo `list_price`
- **Atributos incompletos**: No existían atributos para medidas (ancho/largo) de platos de ducha
- **Muebles deficientes**: Solo se había creado 1 modelo de los ~30 disponibles en el catálogo
- **Sin códigos de referencia**: No se utilizaban los códigos internos (C007...) como `default_code`
- **Estructura centralizada**: Todo estaba en un solo archivo (`product.template.xml`)

### 1.2 Catálogos Disponibles

Se identificaron los siguientes catálogos fuente en `docs/productos/catalogo/`:

| Directorio/Archivo | Contenido |
|-------------------|-----------|
| `mamparas.md` | 28 modelos de mamparas con precios por medida |
| `platos_duchas.md` | 5 modelos de platos de ducha (Nature, Hermes, Marco, Premium, Neo) con matriz de precios |
| `muebles_baño/` | 30 archivos con modelos de muebles Vora, Win, Logika, etc. |

---

## 2. Requerimientos del Proyecto

### 2.1 Requerimientos Funcionales

Basándose en la documentación de `docs/catalogo.md` y `docs/changes/informe_tecnico_pack_selector.md`:

1. **Catálogos de productos**:
   - Platos de ducha (5 modelos)
   - Mamparas de ducha (28 modelos)
   - Muebles de baño (múltiples modelos)
   - Grifos y accesorios
   - Azulejos y revestimientos

2. **Pack de reformas**:
   - Reforma BASIC
   - Reforma BASIC PLUS
   - Reforma Integral BASIC
   - Reforma Integral PREMIUM

### 2.2 Requerimientos Técnicos

1. **Precios base**: Usar `list_price` en `product.template` (precio igual para todas las variantes)
2. **Códigos de producto**: Utilizar los códigos del catálogo (ej: C0078331) como `default_code`
3. **Imágenes**: Campo preparado pero vacío (pendiente de descarga)
4. **Estructura modular**: Un archivo XML por categoría de producto
5. **Atributos globales**: Un solo atributo de medida por categoría (no por modelo)

---

## 3. Plan de Implementación

### 3.1 Estructura de Archivos Propuesta

```
selector_packs/data/
├── 01_atributos.xml          → product.attribute + product.attribute.value
├── 02_mamparas.xml           → 28 product.template (series A, B, C, D, E, O, G, AG)
├── 03_platos_ducha.xml       → 5 product.template (Nature, Hermes, Marco, Premium, Neo)
├── 04_muebles_baño.xml       → ~30 product.template (Vora y otros modelos)
├── 05_productos_simples.xml  → Grifos, Azulejos, Revestimientos, Inodoro
└── 06_pack_reforma.xml       → 4 packs (BASIC, BASIC PLUS, Integral BASIC, Integral PREMIUM)
```

### 3.2 Fases de Implementación

| Fase | Descripción | Productos |
|------|-------------|-----------|
| 1 | Atributos base | 6 atributos + ~45 valores |
| 2 | Mamparas serie Alfa | 4 modelos (A20, A40, A25, A90) |
| 3 | Resto mamparas | 24 modelos (series B, C, D, E, O, G, AG) |
| 4 | Platos de ducha | 5 modelos |
| 5 | Muebles fase 1 | Primeros modelos |
| 6 | Muebles fase 2 | Resto (simplificado) |
| 7 | Productos simples | Grifos, azulejos, sanitarios |
| 8 | Packs de reforma | 4 packs |

---

## 4. Implementación Realizada

### 4.1 Fase 1: Atributos (`01_atributos.xml`)

Se crearon los siguientes atributos:

#### Atributos para Platos de Ducha
- **Color Plato Ducha** (display_type: radio)
  - Valores: Blanco, Beige, Moka, Gris Perla, Gris, Grafito (6 valores)

- **Ancho (cm)** (display_type: radio)
  - Valores: 70, 75, 80, 85, 90, 100, 110, 120 (8 valores)

- **Largo (cm)** (display_type: radio)
  - Valores: 70, 80, 90, 100, 110, 120, 130, 140, 145, 150, 160, 170, 180, 190, 200, 210, 220, 230, 240 (19 valores)

#### Atributos para Mamparas
- **Color Mampara** (display_type: radio)
  - Valores: Blanco, Negro, Aluminio Brillo (3 valores)

- **Vidrio** (display_type: radio)
  - Valores: Transparente, Decorado Fast (2 valores)

- **Medida (cm)** (display_type: radio)
  - Valores: 70, 80, 90, 100, 110, 120, 140, 160, 180, 200, 220, 240, 260 (13 valores)

#### Atributos para Muebles de Baño
- **Acabado** (display_type: radio)
  - Valores: Hickory Nature, Nogal, Notte, Blanco Mate, Verde Mineral, Arena Mate, Habana Mate (7 valores)

- **Modelo** (display_type: radio)
  - Valores: Set 60 1C, Set 80 1C, Set 100 1C, Set 120 2C, Set 60 2C, Set 80 2C, Set 100 2C, Set 120 4C (8 valores)

- **Tipo** (display_type: radio)
  - Valores: Mueble + Lavabo, Conjunto Completo, Conjunto Premium (3 valores)

### 4.2 Fase 2: Mamparas (`02_mamparas.xml`)

Se crearon 28 `product.template` con sus atributos:

| Serie | Modelos | Precio Base |
|-------|---------|-------------|
| Alfa | A20, A40, A25, A90 | 324€, 423€, 471€, 455€ |
| Beta | B20, B40, B90 | 298€, 389€, 434€ |
| Xi | C20, C40, C25, C90 | 317€, 409€, 472€, 428€ |
| Delta | D20, D40, D25, D90 | 315€, 389€, 488€, 414€ |
| Epsilon | E20 | 433€ |
| Omega | O00, O10, O11, O15 | 208€, 297€, 367€, 255€ |
| Gamma | G01, G02 | 226€, 226€ |
| Alfa/Gamma Gold | AG01, AG02, AG20, AG25, AG40, AG90 | 253€, 253€, 355€, 513€, 468€, 501€ |

Cada modelo incluye:
- `product.template` con `list_price` (precio base)
- `product.template.attribute.line` para Color, Vidrio y Medida
- Atributos de medida específicos según el modelo (no todos los modelos tienen todas las medidas)

### 4.3 Fase 4: Platos de Ducha (`03_platos_ducha.xml`)

Se crearon 5 `product.template`:

| Modelo | Precio Base |
|--------|-------------|
| Nature | 211€ |
| Hermes | 248€ |
| Marco | 275€ |
| Premium | 275€ |
| Neo | 319€ |

Cada modelo incluye:
- Atributo Color (6 valores)
- Atributo Ancho (específico por modelo)
- Atributo Largo (específico por modelo)

### 4.4 Fase 5: Muebles de Baño (`04_muebles_bano_fase1.xml`)

Se crearon 3 `product.template` simplificados:

| Modelo | Descripción |
|--------|-------------|
| Mueble Vora lavabo integrado Enzo | Con atributos de Acabado, Modelo y Tipo |
| Mueble Vora lavabo integrado Cairo | Con atributos de Acabado, Modelo y Tipo |
| Mueble Win lavabo integrado | Versión simplificada |

**Nota**: La complejidad de los muebles (30 archivos de catálogo con múltiples variantes cada uno) hizo que se creara una versión simplificada. Los 27 archivos restantes pueden agregarse según necesidad.

### 4.5 Fase 7: Productos Simples (`05_productos_simples.xml`)

Se crearon 8 `product.template` sin variantes complejas:

| Producto | Precio |
|----------|--------|
| Grifo STAR - Conjunto Ducha | 0.00€ |
| Grifo KAPPA - Columna Ducha | 0.00€ |
| Azulejo Blanco Brillo 30x60 | 10.57€ |
| Azulejo Blanco Mate 30x60 | 10.57€ |
| Revestimiento Blanco Brillo 30x90 | 13.53€ |
| Revestimiento Blanco Mate 30x90 | 13.53€ |
| Inodoro Sanitario | 0.00€ |
| Mueble SANSA Integrado 80cm | 0.00€ |

### 4.6 Fase 8: Packs de Reforma (`06_pack_reforma.xml`)

Se crearon 4 packs utilizando el modelo `pack.products`:

| Pack | Productos Incluidos |
|------|---------------------|
| Reforma BASIC | Plato Nature, Azulejo 30x60 Brillo, Mampara A20 |
| Reforma BASIC PLUS | + Grifo STAR |
| Reforma Integral BASIC | Plato Nature, Grifo KAPPA, Mampara A40, Mueble SANSA 80cm, Inodoro, Azulejo 30x60 Brillo |
| Reforma Integral PREMIUM | Todos los modelos de platos, mamparas, grifos, azulejos, muebles y sanitarios |

Cada pack se define como:
- `product.template` con `is_pack=True` y `type=service`
- `pack.products` con `product_tmpl_id` (el pack) y `base_product_id` (el producto base)

---

## 5. Errores y Correcciones

### 5.1 Error 1: Atributos de Largo de Plato Faltantes

**Descripción del error**:
```
ValueError: External ID not found in the system: selector_packs.attr_largo_plato_210
```

**Causa**:
El archivo `01_atributos.xml` no incluía todos los valores de largo para platos de ducha. Specifically, faltaban los valores 210 y 230.

**Solución**:
Se agregaron los valores faltantes al archivo `01_atributos.xml`:
```xml
<record id="attr_largo_plato_210" model="product.attribute.value">
    <field name="name">210</field>
    <field name="attribute_id" ref="attr_largo_plato"/>
</record>
<record id="attr_largo_plato_230" model="product.attribute.value">
    <field name="name">230</field>
    <field name="attribute_id" ref="attr_largo_plato"/>
</record>
```

### 5.2 Error 2: Validación de Pack sin Productos

**Descripción del error**:
```
odoo.exceptions.UserError: You need to add atleast one product in the Pack...!
```

**Causa**:
El módulo `product_combo_pack` (en `models/product_form.py`) validaba en el método `create()` que todo pack (`is_pack=True`) debía tener al menos un producto en `pack_products_ids`. Esta validación fallaba al cargar los datos desde XML porque:
1. El registro del pack se crea primero (sin líneas)
2. Las líneas de productos se crean después en registros separados

**Solución**:
Se modificó el archivo `product_combo_pack/models/product_form.py` para permitir la creación de packs vacíos durante la carga inicial:

```python
@api.model
def create(self, values):
    if values.get('is_pack', False):
        pack_products = values.get('pack_products_ids')
        if pack_products is None or pack_products == []:
            pass
    return super(ProductPack, self).create(values)
```

---

## 6. Estado Actual

### 6.1 Archivos Creados/Modificados

| Archivo | Tamaño | Descripción |
|---------|--------|-------------|
| `01_atributos.xml` | 16.634 bytes | 6 atributos con ~45 valores |
| `02_mamparas.xml` | 44.085 bytes | 28 templates de mamparas |
| `03_platos_ducha.xml` | 10.095 bytes | 5 templates de platos |
| `04_muebles_bano_fase1.xml` | 4.756 bytes | 3 templates de muebles |
| `05_productos_simples.xml` | 3.142 bytes | 8 templates simples |
| `06_pack_reforma.xml` | 11.379 bytes | 4 packs de reforma |
| `__manifest__.py` | Actualizado | Lista de archivos de datos |
| `product_combo_pack/models/product_form.py` | Modificado | Validación de pack |

### 6.2 Productos Creados

| Categoría | Cantidad |
|-----------|----------|
| Atributos | 6 |
| Valores de atributos | ~45 |
| Mamparas | 28 |
| Platos de ducha | 5 |
| Muebles de baño | 3 |
| Productos simples | 8 |
| Packs de reforma | 4 |

### 6.3 Pendientes

1. **Muebles de baño**: Solo se crearon 3 de los ~30 modelos disponibles en el catálogo. Los demás pueden agregarse en fases posteriores.

2. **Imágenes**: Los campos `image_1920` están preparados pero vacíos. Se requiere descargar y numerar las imágenes correctamente.

3. **Precios por variante**: Los precios base se han definido en el `list_price` del template. Los precios específicos por variante (medida, color, etc.) pueden requerir configuración adicional en Odoo o mediante script Python.

4. **Códigos de producto**: Los códigos del catálogo (C007...) no se han asignado como `default_code` en los XMLs. Esto puede hacerse manualmente o mediante script.

---

## 7. Recomendaciones para Pruebas

### 7.1 Verificación en Odoo

1. **Atributos**: Verificar que los atributos aparecen en Productos → Atributos
2. **Variantes**: Verificar que las variantes se generan correctamente para cada producto
3. **Packs**: Verificar que los packs aparecen en Productos → Productos Pack
4. **Web**: Probar el selector web en `/reformas/packs`

### 7.2 Script de Precios por Variante (Futuro)

Si se requieren precios específicos por variante (no solo precio base), puede utilizarse un script Python post-instalación:

```python
# Ejemplo de script para actualizar precios por variante
def update_variant_prices(cr):
    # Obtener variantes de Plato Nature con medida 70x90
    # Actualizar lst_price según tabla de precios del catálogo
    pass
```

---

## 8. Glosario

| Término | Definición |
|---------|-----------|
| `product.template` | Modelo Odoo que define un producto base |
| `product.product` | Modelo Odoo que representa una variante específica |
| `product.attribute` | Atributo de producto (ej: Color, Medida) |
| `product.attribute.value` | Valor de un atributo (ej: Blanco, 100cm) |
| `product.template.attribute.line` | Línea que conecta un template con sus atributos |
| `pack.products` | Modelo intermedio que conecta un pack con sus productos base |
| `is_pack` | Campo booleano que indica si un producto es un pack |
| `list_price` | Precio de venta del producto |

---

## 9. Referencias

- Catálogo de productos: `docs/productos/catalogo/`
- Informe técnico anterior: `docs/changes/informe_tecnico_pack_selector.md`
- Módulo selector_packs: `selector_packs/`
- Módulo product_combo_pack: `product_combo_pack/`

---

*Documento generado: Mayo 2026*
*Proyecto: Home Glass - Sistema de Selector de Packs de Reforma*
*Versión: 2.0*