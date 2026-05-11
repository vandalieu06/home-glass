# Informe Técnico: Análisis de Problemas en el Frontend del Selector de Packs

## Resumen Ejecutivo

Este documento identifica los problemas encontrados en la implementación actual del frontend (`selector.js` y `controller/main.py`) comparándolos con el planteamiento inicial definido en la documentación técnica (`docs/objectivo.md` y `docs/changes/`). Se detectaron **3 problemas principales**:

1. **Flujo de selección incorrecto**: Los muebles de baño deben seguir un flujo jerárquico (Modelo → Acabado → Tipo), pero actualmente se muestran todos los atributos a la vez
2. **Restricciones de packs incompletas**: Las restricciones definidas en `objectivo.md` no están completamente implementadas
3. **Selección de todos los productos**: No se está aplicando correctamente el flujo paso a paso por tipo de producto

---

## 1. Análisis del Planteamiento Inicial

### 1.1 Flujo Esperado según `objectivo.md`

Según la documentación de objetivos, el flujo de selección para muebles de baño debería ser:

```
PACK "Reforma Integral BASIC"
├── 1. Seleccionar MODELO de mueble de baño (primero se elige el modelo: SANSA, Vora, Win, etc.)
│   └── Mostrar solo los modelos disponibles en el catálogo
├── 2. Seleccionar ACABADO/Color disponible para ese modelo
│   └── Mostrar acabados específicos del modelo elegido
├── 3. Seleccionar TIPO (medida/set)
│   └── Mostrar medidas disponibles para ese modelo+acabado
└── 4. Continuar con siguiente producto del pack
```

### 1.2 Flujo Actual Implementado

El flujo actual es **plano** y **no jerárquico**:

```
PACK "Reforma Integral BASIC"
├── 1. Plato Nature → mostrar TODOS los atributos (Color, Ancho, Largo)
├── 2. Mampara A40 → mostrar TODOS los atributos (Color, Vidrio, Medida)
├── 3. Mueble SANSA → mostrar TODOS los atributos (Acabado, Modelo, Tipo) ***INCORRECTO***
├── 4. Grifo → sin variantes
└── 5. Inodoro → sin variantes
```

**Problema**: Para el Mueble SANSA, el usuario ve simultáneamente:
- Acabado: [Hickory Nature, Nogal, Notte, Blanco Mate, Verde Mineral, Arena Mate, Habana Mate]
- Modelo: [Set 60 1C, Set 80 1C, Set 100 1C, Set 120 2C, ...]
- Tipo: [Mueble + Lavabo, Conjunto Completo, Conjunto Premium]

Cuando debería ser **jerárquico**:
1. Primero: Elegir modelo (ej: "Set 80 1C")
2. Segundo: Elegir acabado (ej: "Blanco Mate")
3. Tercero: Elegir tipo (ej: "Conjunto Completo")

---

## 2. Problemas Identificados

### Problema 1: Flujo de Selección Jerárquica No Implementada

**Descripción**: Los productos con múltiples atributos (especialmente muebles de baño) requieren un flujo jerárquico donde cada selección condiciona las opciones disponibles en la siguiente fase.

**Ubicación en código**:
- `selector.js:246-298` - `renderProductStep()`
- `selector.js:300-320` - `renderAttributeSelector()`
- `controller/main.py:122-139` - `_get_product_attributes()`

**Comportamiento actual**:
```javascript
// selector.js - renderAttributeSelector()
function renderAttributeSelector(productId, attribute, selection) {
    const selectedValue = selection[attribute.name] || null;
    const values = attribute.values || [];

    if (values.length === 0) return '';

    return `
        <div class="hg-attribute">
            <label class="hg-attribute-label">${escapeHtml(attribute.name)}</label>
            <select class="hg-attribute-select"
                    onchange="selectAttribute('${escapeAttr(productId)}', '${escapeAttr(attribute.name)}', this.value)">
                <option value="">Seleccionar...</option>
                ${values.map(v => `
                    <option value="${v.id}" ${selectedValue == v.id ? 'selected' : ''}>
                        ${escapeHtml(v.name)}
                    </option>
                `).join('')}
            </select>
        </div>
    `;
}
```

Este código renderiza **TODOS** los atributos al mismo tiempo sin considerar dependencias entre ellos.

**Comportamiento esperado (seudocódigo)**:
```javascript
// Para muebles de baño:
// 1. Mostrar solo el atributo "Modelo" primero
// 2. Cuando se seleccione un modelo, filtrar los acabados disponibles
// 3. Cuando se seleccione un acabado, filtrar los tipos disponibles

function renderAttributeSelectorMueble(productId, attribute, selection) {
    if (attribute.name === 'Modelo') {
        // Mostrar todos los modelos disponibles
        return renderModeloSelector(productId, attribute, selection);
    }
    if (attribute.name === 'Acabado') {
        // Filtrar acabados según el modelo seleccionado
        const selectedModel = selection['Modelo'];
        const filteredAcabados = filterAcabadosByModelo(selectedModel);
        return renderAcabadoSelector(productId, filteredAcabados, selection);
    }
    if (attribute.name === 'Tipo') {
        // Filtrar tipos según modelo + acabado seleccionados
        const selectedModel = selection['Modelo'];
        const selectedAcabado = selection['Acabado'];
        const filteredTipos = filterTiposByModeloyAcabado(selectedModel, selectedAcabado);
        return renderTipoSelector(productId, filteredTipos, selection);
    }
}
```

### Problema 2: Restricciones de Packs Incompletas

**Descripción**: Las restricciones definidas en `objectivo.md` están parcialmente implementadas. Faltan restricciones para azulejos y productos simples.

**Restricciones definidas en `objectivo.md`**:

| Pack | Plato | Mampara | Azulejo | Grifo | Mueble |
|------|-------|---------|---------|-------|--------|
| BASIC | Nature solo **Blanco** | A20 solo **Blanco** y **Transparente** | 30x60 **Blanco Brillo** o **Mate** | - | - |
| BASIC PLUS | Nature **Blanco, Gris Cemento, Gris Antracita** | A20 **Blanco, Negro, Aluminio Brillo**, Transparente | 30x60 **Blanco Brillo** o **Mate** | STAR | - |
| Integral BASIC | Nature **Blanco, Gris Cemento, Gris Antracita** | A40 **Blanco, Negro, Aluminio Brillo**, Transparente | 30x60 **Blanco Brillo** o **Mate** | KAPPA | SANSA 80cm integrado + Lavabo + Espejo + Luminaria |
| PREMIUM | **Todos** | **Todos** | **Todos** | **Todos** | **Todos** |

**Ubicación en código**: `controller/main.py:262-317` - `_filter_attributes_by_pack()`

**Comportamiento actual**: Solo filtra **Color** y **Vidrio** para platos y mamparas. No filtra:
- Azulejos: Debería mostrar solo Brillo/Mate 30x60
- Grifos: Debería estar pre-seleccionado (STAR o KAPPA según pack)
- Muebles: Debería estar pre-seleccionado con modelo exacto (SANSA 80cm para Integral BASIC)

**Código actual problemático**:
```python
# controller/main.py:274-301
color_restrictions = {
    'pack_reforma_basic': {
        'plato_nature': ['Blanco'],
        'mampara_a20': ['Blanco'],
    },
    # ... otras restricciones
    'pack_reforma_integral_premium': {},  # Sin restricciones
}

vidrio_restrictions = {
    'pack_reforma_basic': {
        'mampara_a20': ['Transparente'],
    },
    # ... otras restricciones
}

# Solo se filtra color y vidrio
if 'color' in attr_name_lower:
    # filtrar por color
if 'vidrio' in attr_name_lower:
    # filtrar por vidrio

# NO hay filtrado para:
# - azulejo (tipo: Brillo/Mate)
# - grifo (modelo exacto)
# - mueble (modelo + medida exactos)
```

### Problema 3: Modelo de Pack "Reforma Integral BASIC" Específico

**Descripción**: El pack "Reforma Integral BASIC" tiene requisitos específicos que no están implementados:

1. **Mueble SANSA**: Debe ser el modelo "SANSA suspendido 80cm" específico
2. **Conjunto obligatorio**: Incluye lavabo cerámico + Espejo Murano + Luminaria URI 30
3. **Sanitarios**: Productos específicos predefinidos

**Comportamiento actual**: El usuario puede elegir cualquier mueble de cualquier modelo/acabado.

**Comportamiento esperado**:
- Para Integral BASIC: El Mueble SANSA debería estar **pre-seleccionado** con:
  - Modelo: Set 80 1C
  - Acabado: (mostrar todas las opciones disponibles del SANSA)
  - Tipo: Integrado (única opción válida)
  - Descuento adicional por incluir lavabo + espejo + luminaria

---

## 3. Análisis de Causa Raíz

### 3.1 Estructura de Atributos Actual

Los muebles de baño tienen 3 atributos independientes:
- `attr_acabado_mueble`: Lista plana de todos los acabados (no agrupados por familia)
- `attr_modelo_mueble`: Lista de sets (60 1C, 80 1C, 100 1C, etc.)
- `attr_tipo_mueble`: Mueble + Lavabo, Conjunto Completo, Conjunto Premium

**Problema**: Cada mueble del catálogo tiene acabados **diferentes**, pero los XML usan los mismos atributos para todos.

### 3.2 Ejemplo: Mueble SANSA vs Mueble Vora

**Mueble SANSA** (`mueble_sansa`):
- Acabados válidos: Gris Arenado, Roble Colonial, Nogal Arenado, Blanco Brillo
- Modelos: Set 60 1C, Set 80 1C, Set 100 1C, Set 120 2C
- Tipos: Integrado, Sobre encimera, A suelo, Profundidad reducida

**Mueble Vora Enzo** (`mueble_vora_enzo`):
- Acabados válidos: Hickory Nature, Nogal, Notte, Blanco Mate, Verde Mineral, Arena Mate, Habana Mate
- Modelos: Set 60 1C, Set 80 1C, Set 100 1C, Set 120 2C
- Tipos: Mueble + Lavabo, Conjunto Completo, Conjunto Premium

**Problema actual**: El usuario ve TODOS los acabados de TODOS los muebles cuando selecciona "Mueble de baño".

### 3.3 Pack "Reforma Integral BASIC" - Estructura Actual

En `06_pack_reforma.xml`, el pack Integral BASIC incluye:
```xml
<!-- pack_reforma_integral_basic -->
<field name="base_product_id" ref="mueble_sansa"/>  <!-- Solo referencia al producto base -->
```

**Problema**: No hay forma de indicar que:
1. El modelo debe ser específicamente "Set 80 1C"
2. El tipo debe ser "Integrado suspendido"
3. Debe incluir automáticamente espejo y luminaria

---

## 4. Soluciones Propuestas

### 4.1 Opción A: Flujo Jerárquico en Frontend (Recomendado)

Implementar un flujo donde los atributos de muebles se muestren **secuencialmente**:
1. Primero: Seleccionar el **Modelo/Set** (60 1C, 80 1C, etc.)
2. Segundo: Seleccionar el **Acabado** (filtrado según familia)
3. Tercero: Seleccionar el **Tipo** (si aplica)

**Cambios necesarios**:

#### 4.1.1 Backend: Nuevo método `_get_product_attribute_dependencies()`
```python
# controller/main.py
def _get_product_attribute_dependencies(self, product_tmpl_id):
    """
    Define las dependencias jerárquicas entre atributos para cada producto.
    Retorna el orden y las dependencias.
    """
    # Ejemplo para muebles de baño:
    if self._get_product_category(product_tmpl_id) == 'mueble':
        return {
            'order': ['Modelo', 'Acabado', 'Tipo'],
            'dependencies': {
                'Acabado': {'depends_on': 'Modelo'},
                'Tipo': {'depends_on': ['Modelo', 'Acabado']},
            }
        }
    return None
```

#### 4.1.2 Frontend: Renderizado en cascada
```javascript
// selector.js
function renderAttributeSelectorCascade(productId, attribute, selection, allAttributes) {
    const attrName = attribute.name;
    const deps = getAttributeDependencies(productId);

    // Si el atributo tiene dependencias, verificar que estén resueltas
    if (deps && deps.dependencies[attrName]) {
        const dependsOn = deps.dependencies[attrName].depends_on;
        if (!areDependenciesMet(selection, dependsOn)) {
            return ''; // No mostrar aún este atributo
        }
    }

    // Obtener valores filtrados según selecciones anteriores
    let values = attribute.values;
    if (attrName === 'Acabado' && selection['Modelo']) {
        values = filterAcabadosByModelo(selection['Modelo'], productId);
    }

    return renderAttributeSelector(productId, attrName, values, selection);
}

function filterAcabadosByModelo(modeloValue, productId) {
    // Filtrar acabados específicos del modelo seleccionado
    // ej: Si modelo="Set 80 1C" y producto="mueble_vora_enzo"
    // mostrar solo acabados de la familia Vora
}
```

### 4.2 Opción B: Atributos Específicos por Familia

Crear atributos específicos por familia de muebles:
- `attr_acabado_sansa`: Solo acabados del SANSA
- `attr_acabado_vora`: Solo acabados del Vora
- etc.

**Ventaja**: Más simple de implementar
**Desventaja**: Mayor mantenimiento de XML

### 4.3 Implementación de Restricciones Completas

Modificar `_filter_attributes_by_pack()` para incluir:

#### 4.3.1 Azulejos
```python
azulejo_restrictions = {
    'pack_reforma_basic': {
        'product_type': ['Azulejo'],
        'size': ['30x60'],
        'finish': ['Blanco Brillo', 'Blanco Mate'],
    },
    'pack_reforma_basic_plus': {
        'product_type': ['Azulejo'],
        'size': ['30x60'],
        'finish': ['Blanco Brillo', 'Blanco Mate'],
    },
    'pack_reforma_integral_basic': {
        'product_type': ['Azulejo'],
        'size': ['30x60'],
        'finish': ['Blanco Brillo', 'Blanco Mate'],
    },
    'pack_reforma_integral_premium': {},  # Sin restricciones
}
```

#### 4.3.2 Grifos Predefinidos
```python
grifo_restrictions = {
    'pack_reforma_basic': {},
    'pack_reforma_basic_plus': {
        'model': ['STAR'],
        'display': 'pre-selected',
    },
    'pack_reforma_integral_basic': {
        'model': ['KAPPA'],
        'display': 'pre-selected',
    },
    'pack_reforma_integral_premium': {},  # Sin restricciones
}
```

#### 4.3.3 Muebles Predefinidos para Integral BASIC
```python
mueble_restrictions = {
    'pack_reforma_basic': {},
    'pack_reforma_basic_plus': {},
    'pack_reforma_integral_basic': {
        'model': ['mueble_sansa'],
        'modelo': ['Set 80 1C'],
        'tipo': ['Integrado'],
        'display': 'pre-selected with options',
    },
    'pack_reforma_integral_premium': {},  # Sin restricciones
}
```

---

## 5. Plan de Implementación

### Fase 1: Corrección de Restricciones de Packs

1. **Ampliar `_filter_attributes_by_pack()`** para incluir azulejos
2. **Añadir lógica de pre-selección** para grifos
3. **Añadir lógica de pre-selección** para muebles específicos de Integral BASIC

### Fase 2: Implementación de Flujo Jerárquico

1. **Backend**: Añadir método `_get_product_attribute_dependencies()`
2. **Backend**: Modificar `_get_product_attributes()` para retornar info de dependencias
3. **Frontend**: Nuevo `renderAttributeSelectorCascade()` en selector.js
4. **Frontend**: Actualizar `selectAttribute()` para detectar cambios en cascada

### Fase 3: Validación y Testing

1. Verificar flujo para pack BASIC
2. Verificar flujo para pack BASIC PLUS
3. Verificar flujo para pack Integral BASIC
4. Verificar flujo para pack PREMIUM

---

## 6. Impacto en Código Existente

### 6.1 Archivos a Modificar

| Archivo | Cambio | Complejidad |
|---------|--------|--------------|
| `controller/main.py` | Añadir `_get_product_attribute_dependencies()` | Media |
| `controller/main.py` | Ampliar `_filter_attributes_by_pack()` | Baja |
| `controller/main.py` | Modificar `_get_product_attributes()` | Baja |
| `static/src/js/selector.js` | Nuevo `renderAttributeSelectorCascade()` | Alta |
| `static/src/js/selector.js` | Actualizar `selectAttribute()` | Baja |
| `views/templates.xml` | Actualizar templates si necesario | Baja |

### 6.2 Compatibilidad

- Los cambios son **retrocompatibles**
- Los productos sin dependencias funcionarán igual que antes
- Solo afecta a productos con múltiples atributos dependientes

---

## 7. Estado Actual vs Esperado

### 7.1 Pack "Reforma Integral BASIC"

**Estado actual**:
```
Paso 1: Plato Nature
  ├─ Color: [Blanco ✓] (restringido)
  ├─ Ancho: [70, 75, 80, 85, 90, 100, 110, 120]
  └─ Largo: [70, 80, 90, 100, ...]

Paso 2: Mampara A40
  ├─ Color: [Blanco, Negro, Aluminio ✓] (restringido)
  ├─ Vidrio: [Transparente ✓] (restringido)
  └─ Medida: [70, 80, 90, ...]

Paso 3: Mueble SANSA
  ├─ Acabado: [todos los acabados de todos los muebles]
  ├─ Modelo: [todos los sets]
  └─ Tipo: [todos los tipos]

Paso 4: Grifo KAPPA (mostrado al usuario)
Paso 5: Azulejo (todas las opciones)
Paso 6: Inodoro (sin variantes)
```

**Estado esperado**:
```
Paso 1: Plato Nature
  └─ Selección jerárquica: Color → Ancho → Largo

Paso 2: Mampara A40
  └─ Selección jerárquica: Color → Vidrio → Medida

Paso 3: Grifo KAPPA
  └─ Pre-seleccionado, mostrar info (no selectable)

Paso 4: Mueble SANSA Integrado 80cm
  └─ Paso 4a: Elegir Modelo → [Set 80 1C] (única opción para Integral BASIC)
  └─ Paso 4b: Elegir Acabado → [Gris Arenado, Roble Colonial, Nogal Arenado, Blanco Brillo]
  └─ Paso 4c: Verificar tipo → [Integrado] (mostrar info del conjunto incluido)

Paso 5: Azulejo 30x60
  └─ Tipo: [Blanco Brillo, Blanco Mate]

Paso 6: Sanitarios
  └─ Pre-seleccionado, mostrar info
```

---

## 8. Conclusión

La implementación actual del frontend funciona correctamente para productos simples (platos de ducha, mamparas con pocas opciones), pero presenta problemas significativos para:

1. **Muebles de baño**: El flujo de selección debería ser jerárquico, mostrando primero modelos, luego acabados filtrados, luego tipos filtrados
2. **Restricciones de packs**: Faltan restricciones para azulejos y productos pre-seleccionados (grifos, muebles específicos)
3. **Pack Integral BASIC**: El mueble SANSA debería estar pre-configurado, no任由 selección libre

**Recomendación**: Implementar Fase 1 (restricciones) para una corrección rápida, seguida de Fase 2 (flujo jerárquico) para una solución completa.

---

## 9. Referencias

- Planteamiento inicial: `docs/objectivo.md`
- Informe técnico selector web: `docs/changes/informe_tecnico_selector_web.md`
- Plan implementación muebles: `docs/changes/plan_muebles_bano_implementacion.md`
- Código frontend: `selector_packs/static/src/js/selector.js`
- Código backend: `selector_packs/controller/main.py`

---

## 10. Histórico de Cambios

| Fecha | Cambio | Autor |
|-------|--------|-------|
| Mayo 2026 | Creado informe de problemas | Sistema |
| Mayo 2026 | Implementada Fase 1: Restricciones de packs | Sistema |

### Cambios Implementados (Fase 1)

#### Backend (`controller/main.py`)

1. **Ampliado `_filter_attributes_by_pack()`**:
   - Añadido filtrado de azulejos por tipo (Brillo/Mate 30x60)
   - Mantenida lógica de restricciones para Color y Vidrio

2. **Nuevo método `_is_product_preselected()`**:
   - Detecta productos pre-seleccionados por pack
   - BASIC PLUS: Grifo STAR, Azulejo 30x60
   - Integral BASIC: Grifo KAPPA, Mueble SANSA, Azulejo 30x60

3. **Nuevo método `_get_preselected_values()`**:
   - Para Integral BASIC: Pre-selecciona "Set 80 1C" y "Integrado" en muebles SANSA

4. **Nuevo método `_get_attribute_dependency()`**:
   - Define dependencias: Modelo → Acabado → Tipo
   - Usado para renderizado jerárquico

5. **Nuevo método `_get_attribute_order()`**:
   - Define orden de atributos para muebles

6. **Actualizado `_get_product_attributes()`**:
   - Retorna información de categoría, preselección y dependencias
   - Ordena atributos según `_get_attribute_order()`
   - Incluye valores pre-seleccionados

7. **Actualizado `_get_pack_products()`**:
   - Incluye campo `is_preselected` en cada producto

#### Frontend (`selector.js`)

1. **Nueva función `renderAttributesCascade()`**:
   - Renderiza atributos de muebles en orden jerárquico
   - Solo muestra atributos cuyas dependencias están resueltas

2. **Nueva función `renderPreselectedInfo()`**:
   - Muestra banner de información para productos pre-seleccionados

3. **Actualizado `renderProductStep()`**:
   - Pasa `pack_id` a la API
   - Usa `renderAttributesCascade()` para muebles
   - Muestra info de productos pre-seleccionados
   - Re-renderiza al cambiar un atributo

4. **Actualizado `renderAttributeSelector()`**:
   - Soporta valores pre-seleccionados
   - Deshabilita selects cuyas dependencias no están resueltas

5. **Actualizado `selectAttribute()`**:
   - Re-renderiza el paso al cambiar un atributo

6. **Actualizado `initApp()`**:
   - Lee el campo `is_preselected` del producto

#### CSS (`selector.css`)

1. **Nuevo estilo `.hg-attribute-disabled`**:
   - Reduce opacidad de atributos deshabilitados

2. **Nuevo estilo `.hg-attribute-select:disabled`**:
   - Fondo gris para selects deshabilitados

3. **Nueva clase `.hg-preselected-info`**:
   - Banner verde con icono de check para productos pre-seleccionados

#### Templates (`views/templates.xml`)

1. **Actualizado `#pack_selector`**:
   - Incluye `data-preselected` en productos

---

*Documento actualizado tras implementación*
*Fecha de actualización: 2026-05-09*
*Versión: 1.1*
*Estado: Fase 1 completada, pruebas pendientes*
