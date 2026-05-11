# Plan de Implementación: Pasos por Categorías en el Selector de Packs

## Resumen Ejecutivo

Reestructurar el frontend del selector de packs para que los pasos del stepper se organicen **por categoría de producto** en lugar de por producto individual. Esto reduce drásticamente el número de pasos (especialmente en PREMIUM: de 20 a 6) y mejora la experiencia de usuario al poder elegir entre varios productos de una misma categoría.

---

## 1. Problema Actual

El stepper crea **1 paso por cada `pack.products`** (línea individual de producto):

| Pack | Pasos actuales | Productos |
|------|:--------------:|:---------:|
| BASIC | 3 + resumen + contacto | plato, azulejo, mampara |
| BASIC PLUS | 4 + resumen + contacto | plato, azulejo, mampara, grifo |
| Integral BASIC | 6 + resumen + contacto | plato, grifo, mampara, mueble, inodoro, azulejo |
| PREMIUM | **20** + resumen + contacto | 5 platos + 7 mamparas + ... |

**Problemas:**
- PREMIUM tiene 20 pasos, insostenible
- El usuario no "elige" qué producto de cada categoría quiere
- No hay contexto de grupo (ej. "estos son los platos disponibles")
- La navegación es lineal y tediosa

---

## 2. Solución Propuesta

Los pasos se organizan por **categoría semántica**. Dentro de cada paso:

- **Categoría con 1 producto**: se muestra directamente con atributos expandidos (como ahora)
- **Categoría con varios productos**: se muestra una rejilla de productos para elegir; al seleccionar uno se expanden sus atributos

### 2.1 Flujo Esperado

| Pack | Paso 1 | Paso 2 | Paso 3 | Paso 4 | Paso 5 | Paso 6 |
|------|--------|--------|--------|--------|--------|--------|
| **BASIC** | Plato (Nature) | Azulejo (30x60) | Mampara (A20) | Resumen | Contacto | - |
| **BASIC PLUS** | Plato (Nature) | Azulejo (30x60) | Mampara (A20) | Grifo (STAR) | Resumen | Contacto |
| **Integral BASIC** | Plato (Nature) | Azulejo (30x60) | Mampara (A40) | Mueble (SANSA) | Grifo (KAPPA) | Sanitario + Resumen + Contacto |
| **PREMIUM** | **Plato** (elegir entre 5) | **Azulejo** (elegir entre 4) | **Mampara** (elegir entre 7+) | **Mueble** (SANSA) | **Grifo** (elegir entre 2) | **Sanitario** + Resumen + Contacto |

---

## 3. Fases de Implementación

### Fase 1: Backend — Nueva API `get_pack_categories`

**Archivo:** `controller/main.py`

- Nuevo método `_get_pack_categories(pack_id)` que agrupa `pack.products` por categoría
- Nueva acción API `get_pack_categories`
- Modificar `pack_selector()` para calcular `total_steps` basado en categorías
- Pasar datos de categorías al template QWeb

### Fase 2: Backend — API `get_category_products` con atributos pre-cargados

**Archivo:** `controller/main.py`

- Nuevo método `_get_category_products_with_attributes()` que devuelve productos de una categoría con sus atributos ya resueltos (incluyendo restricciones del pack)
- Nueva acción API `get_category_products`

### Fase 3: Frontend — Nuevo State Model

**Archivo:** `static/src/js/selector.js`

- Reemplazar `state.products` (array plano) por `state.steps` (array de categorías con productos dentro)
- Añadir `state.selected_product = {}` para tracking del producto seleccionado por categoría
- Añadir `state.product_attributes_cache = {}` para cachear atributos
- Modificar `initApp()` para cargar categorías vía API

### Fase 4: Frontend — Nuevo Renderizado de Pasos

**Archivo:** `static/src/js/selector.js`

- `renderStepper()`: pasos con nombres de categoría
- `renderContent()`: router actualizado para steps por categoría
- `renderCategoryStep()`: nuevo punto de entrada por categoría
- `renderSingleProductInCategory()`: producto único con atributos
- `renderProductGridInCategory()`: rejilla de productos con selección
- `selectProductInCategory()`: manejador de selección

### Fase 5: Frontend — Validación Actualizada

**Archivo:** `static/src/js/selector.js`

- `validateCurrentStep()` validar que hay producto seleccionado y atributos completos por categoría

### Fase 6: Frontend — Resumen Agrupado por Categoría

**Archivo:** `static/src/js/selector.js`

- `renderSummary()` tabla agrupando por categoría con columna de categoría + producto + variantes

### Fase 7: Template QWeb

**Archivo:** `views/templates.xml`

- Añadir data attributes con categorías y productos por categoría
- Actualizar `data-total-steps` al número de categorías

### Fase 8: CSS — Nuevos Estilos

**Archivo:** `static/src/css/selector.css`

- `.hg-product-grid`: grid de productos seleccionables
- `.hg-product-card.selected`: estilo para producto seleccionado
- `.hg-category-attributes`: contenedor de atributos expandidos

---

## 4. Detalle Técnico por Fase

### 4.1 Fase 1: Backend — `get_pack_categories`

```python
# controller/main.py

def _get_pack_categories(self, pack_id):
    products = self._get_pack_products(pack_id)

    category_order = ['plato', 'azulejo', 'mampara', 'mueble', 'grifo', 'sanitario']

    grouped = {}
    for p in products:
        cat = p['category']
        if cat not in grouped:
            grouped[cat] = []
        grouped[cat].append(p)

    steps = []
    for cat_key in category_order:
        if cat_key in grouped:
            steps.append({
                'key': cat_key,
                'name': self._get_categories_mapping()[cat_key],
                'products': grouped[cat_key],
                'single_product': len(grouped[cat_key]) == 1,
            })

    return steps
```

Nueva acción en `selector_api()`:
```python
elif action == 'get_pack_categories':
    result = self._get_pack_categories(params.get('pack_id'))
```

### 4.2 Fase 3: Nuevo Estado JS

```javascript
let state = {
    pack_id: null,
    pack_name: '',
    current_step: 1,
    steps: [],
    selections: {},
    selected_product: {},
    product_attributes_cache: {},
    contact: { name: '', email: '', phone: '', message: '' },
    lead_id: null,
};
```

### 4.3 Fase 4: Renderizado por Categoría

```
renderCategoryStep(step, container)
├── ¿single_product?
│   ├── Sí → renderSingleProductInCategory(producto, container)
│   │         muestra header categoría + card producto + atributos expandidos
│   └── No → renderProductGridInCategory(step, container)
│               muestra grid de productos + atributos del seleccionado
│
└── Botones Atrás / Siguiente
```

### 4.4 Fase 6: Resumen Agrupado

```
┌──────────┬──────────────┬──────────────────┬────────┐
│ Categoría │ Producto     │ Selección        │ Precio │
├──────────┼──────────────┼──────────────────┼────────┤
│ Plato     │ Nature       │ Blanco, 80x80    │ 211€   │
│ Azulejo   │ 30x60 Brillo │ -                │ 11€    │
│ Mampara   │ A20          │ Blanco, Transp.  │ 324€   │
├──────────┴──────────────┴──────────────────┼────────┤
│ Total estimado                             │ 546€   │
└─────────────────────────────────────────────┴────────┘
```

---

## 5. Dependencias y Orden

| Fase | Archivos | Depende de | Esfuerzo |
|------|----------|------------|----------|
| 1 | `controller/main.py` | - | Medio |
| 2 | `controller/main.py` | Fase 1 | Bajo |
| 3 | `selector.js` | Fase 1 | Medio |
| 4 | `selector.js` | Fase 3 | Alto |
| 5 | `selector.js` | Fase 3-4 | Bajo |
| 6 | `selector.js` | Fase 3-4 | Medio |
| 7 | `templates.xml` | Fase 1 | Bajo |
| 8 | `selector.css` | Fase 4 | Bajo |

**Orden recomendado:** 1 → 7 → 2 → 3 → 4 → 8 → 5 → 6

---

## 6. Consideraciones

### 6.1 Preselección automática
Si una categoría tiene 1 solo producto, se preselecciona automáticamente y se cargan sus atributos. El usuario solo elige variantes.

### 6.2 Cache de atributos
Para evitar llamadas API repetitivas al cambiar de producto dentro de una categoría, cachear los atributos ya cargados. Esto evita sobrecarga en PREMIUM donde el usuario podría probar varios platos.

### 6.3 Compatibilidad hacia atrás
La estructura de `selections` en `localStorage` sigue siendo `{productId: {attr: value}}`, no cambia. La sesión actual se perderá al cambiar la estructura de state (esperado al ser un cambio mayor).

### 6.4 Orden semántico de categorías
El orden definido es: `plato → azulejo → mampara → mueble → grifo → sanitario`. Si un pack no tiene alguna categoría, simplemente se omite.

### 6.5 Muebles con dependencias jerárquicas
Para categoría `mueble`, los atributos "Modelo → Acabado → Tipo" se renderizan en cascada igual que ahora, solo que dentro del paso de categoría. No requiere cambios adicionales.

---

## 7. Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `selector_packs/controller/main.py` | + `_get_pack_categories()`, nueva API action, modificar `pack_selector()` |
| `selector_packs/static/src/js/selector.js` | Reestructurar state, renderizado, validación, resumen |
| `selector_packs/static/src/css/selector.css` | Nuevos estilos para grid y selección |
| `selector_packs/views/templates.xml` | Actualizar data attributes y total_steps |

---

## 8. Histórico de Cambios

| Fecha | Cambio | Autor |
|-------|--------|-------|
| Mayo 2026 | Creación del plan | GSATEK |
