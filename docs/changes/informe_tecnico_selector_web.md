# Informe Técnico: Implementación del Selector Web de Packs de Reforma

## Resumen Ejecutivo

Este documento describe los cambios implementados para crear un sistema web de selección de packs de reforma para Home Glass. El sistema permite a los usuarios seleccionar variantes específicas de los productos incluidos en cada pack mediante un proceso paso a paso (step-by-step), culminando en la generación de un lead en CRM.

---

## 1. Contexto y Objetivo

### 1.1 Situación Inicial

El módulo `selector_packs` contenía:
- Datos XML de productos (platos, mamparas, muebles, etc.)
- Definición de 4 packs de reforma (BASIC, BASIC PLUS, Integral BASIC, PREMIUM)
- Sistema de atributos para variantes de productos

**Falta:** Interfaz web para que los usuarios seleccionen las variantes.

### 1.2 Requerimiento del Cliente

Sistema web con:
- Página principal con los 4 packs disponibles
- Selector step-by-step por cada pack
- Selección de variantes (color, medida, etc.) según el producto
- Formulario de contacto
- Generación de lead en CRM

---

## 2. Arquitectura de la Solución

### 2.1 Estructura de Archivos

```
selector_packs/
├── __manifest__.py              ← Actualizado: dependencias, assets
├── controller/
│   └── main.py                 ← NUEVO: rutas + API JSON
├── views/
│   └── templates.xml            ← Actualizado: templates QWeb
├── static/src/
│   ├── js/selector.js          ← NUEVO: lógica frontend
│   └── css/selector.css        ← NUEVO: estilos
└── data/
    └── [existentes]
```

### 2.2 Flujo de Usuario

```
1. Usuario accede a /reformas/packs
2. Ve los 4 packs disponibles
3. Selecciona un pack → /reformas/packs/<pack_id>
4. Step-by-step: selecciona variantes de cada producto
5. Revisa resumen
6. Completa formulario de contacto
7. Se crea crm.lead con las selecciones
```

### 2.3 Rutas y Endpoints

| Ruta | Tipo | Descripción |
|------|------|-------------|
| `/reformas/packs` | HTTP | Lista de packs |
| `/reformas/packs/<id>` | HTTP | Selector step-by-step |
| `/homeglass/selector/api` | JSON | API centralizada |

### 2.4 API JSON

| Acción | Descripción |
|--------|-------------|
| `get_packs` | Lista todos los packs |
| `get_pack_products` | Obtiene productos de un pack |
| `get_product_attributes` | Obtiene atributos de un producto |
| `validate_selections` | Valida las selecciones |
| `create_lead` | Crea lead en CRM |

---

## 3. Cambios Realizados

### 3.1 Módulo: `selector_packs`

#### 3.1.1 Archivo: `__manifest__.py`

**Cambios:**
- Añadida dependencia `crm`
- Añadido archivo de datos `views/templates.xml`
- Añadidos assets estáticos (CSS + JS)

```python
'depends': ['base', 'web', 'website', 'product', 'product_combo_pack', 'crm'],
'data': [
    ...
    'views/templates.xml',
],
'assets': {
    'web.assets_frontend': [
        'selector_packs/static/src/css/selector.css',
        'selector_packs/static/src/js/selector.js',
    ],
},
```

#### 3.1.2 Archivo: `controller/main.py` (NUEVO)

**Contenido:**
- Ruta `list_packs()` - Página principal
- Ruta `pack_selector()` - Selector de un pack específico
- API centralizada `selector_api()` - Maneja todas las acciones JSON
- Métodos auxiliares para obtener productos, filtrar atributos, crear leads

**Funcionalidades clave:**

1. **Obtención de productos del pack:**
   - Busca `pack.products` relacionados con el pack
   - Obtiene información del producto base (nombre, precio, imagen)
   - Asigna categoría (plato, mampara, grifo, etc.)

2. **Filtrado de atributos por pack:**
   - Restricciones hardcoded según `docs/objectivo.md`
   - BASIC: Plato solo blanco, mampara solo blanco/transparente
   - BASIC PLUS: Plato (blanco, gris cemento, gris antracita), mampara (blanco, negro, aluminio)
   - PREMIUM: Sin restricciones

3. **Creación de lead:**
   - Busca o crea partner por email
   - Genera descripción con las selecciones
   - Asigna a usuario administrador

#### 3.1.3 Archivo: `views/templates.xml`

**Templates creados:**

1. `packs_home` - Página principal con grid de 4 packs
2. `pack_selector` - Contenedor del selector step-by-step

**Snippets:**
- `pack_card_snippet` - Card de pack
- `variant_selector_snippet` - Selector de variante
- `stepper_item_snippet` - Item del stepper

#### 3.1.4 Archivo: `static/src/js/selector.js` (NUEVO)

**Funcionalidades:**
- Gestión de estado (localStorage)
- Renderizado step-by-step
- Integración con API JSON
- Validaciones de formularios
- Persistencia de selections

**Estructura del estado:**
```javascript
{
    pack_id: null,
    pack_name: '',
    current_step: 1,
    total_steps: 0,
    products: [],
    selections: {},
    contact: {name, email, phone, message},
}
```

#### 3.1.5 Archivo: `static/src/css/selector.css` (NUEVO)

**Estilos:**
- Layout: Sidebar stepper + contenido principal
- Componentes: stepper, cards, selects, formularios
- Responsive: Adaptable a móvil/tablet/desktop
- Tema: Colores neutros con énfasis en usabilidad

---

## 4. Restricciones de Atributos por Pack

Según documentación `docs/objectivo.md`:

| Pack | Producto | Atributos permitidos |
|------|----------|----------------------|
| **BASIC** | Plato Nature | Color: Solo **Blanco** |
| **BASIC** | Mampara A20 | Color: Solo **Blanco**, Vidrio: Solo **Transparente** |
| **BASIC PLUS** | Plato Nature | Color: Blanco, Gris Cemento, Gris Antracita |
| **BASIC PLUS** | Mampara A20 | Color: Blanco, Negro, Aluminio Brillo, Vidrio: Transparente |
| **Integral BASIC** | Plato Nature | Color: Blanco, Gris Cemento, Gris Antracita |
| **Integral BASIC** | Mampara A40 | Color: Blanco, Negro, Aluminio Brillo, Vidrio: Transparente |
| **PREMIUM** | Todos | **Sin restricciones** (todos los colores/medidas) |

---

## 5. Modelo de Datos

### 5.1 Productos del Pack

Cada pack contiene productos base definidos en `pack.products`:
- `product_tmpl_id` → El pack (Reforma BASIC, etc.)
- `base_product_id` → Producto base (Plato Nature, Mampara A20, etc.)
- `quantity` → Cantidad

### 5.2 Atributos por Producto

Los productos tienen atributos configurados en `product.template.attribute.line`:
- Platos: Color, Ancho (cm), Largo (cm)
- Mamparas: Color, Vidrio, Medida (cm)
- Muebles: Acabado, Modelo, Tipo

### 5.3 Lead en CRM

Al enviar el formulario se crea:
- `crm.lead` con partner (buscado/creado por email)
- Descripción con resumen de selecciones
- Asignado a usuario Administrador

---

## 6. Pendientes / Mejoras Futuras

### 6.1 Por hacer

1. **Precios por variante:** Los precios se usan del `list_price` del template (precio base). Los precios específicos por variante (color, medida) no están implementados.

2. **Imágenes reales:** Se usa placeholder `https://placehold.co/600x400?text=Producto`. Las imágenes de productos están en `static/src/img/` pero no se usan.

3. **Modelo de selections:** Por ahora las selections se guardan solo en localStorage. Opcionalmente podría crearse un modelo `selector.selection` para persistencia.

4. **Precios calculados por medida:** Los platos y mamparas tienen precios según medida (m²). Actualmente se usa precio base.

### 6.2 Mejoras opcionales

- Añadir más validaciones (ej: medida mínima/máxima)
- Notificaciones por email al usuario y al comercial
- Historial de selections
- Dashboard de leads generados

---

## 7. Pruebas Recomendadas

### 7.1 Pruebas de navegación

1. Acceder a `/reformas/packs` - Ver los 4 packs
2. Hacer clic en cada pack - Verificar que carga correctamente
3. Navegar adelante/atrás en el selector

### 7.2 Pruebas de variantes

1. Seleccionar pack BASIC - Verificar restricciones de color
2. Seleccionar pack PREMIUM - Ver que muestra todas las opciones
3. Validar que no permite avanzar sin seleccionar atributos requeridos

### 7.3 Pruebas de lead

1. Completar formulario de contacto
2. Verificar que se crea lead en CRM
3. Verificar que el partner se crea/busca correctamente

---

## 8. Glosario

| Término | Definición |
|---------|------------|
| `pack.products` | Modelo que conecta un pack con sus productos base |
| `product.template` | Producto base sin variantes |
| `product.product` | Variante específica de un producto |
| `crm.lead` | Oportunidad/cliente potencial en CRM |
| `step-by-step` | Proceso de selección por pasos |
| `attribute` | Característica configurable (color, medida) |
| `attribute.value` | Valor específico de un atributo |

---

## 9. Referencias

- Documento de objetivos: `docs/objectivo.md`
- Diseño: `DESIGN.md` (sistema MiniMax)
- Módulo selector_packs: `/home/jhonny/dev/work/addons/home-glass/selector_packs/`
- Módulo product_combo_pack: `/home/jhonny/dev/work/addons/home-glass/product_combo_pack/`

---

## 10. Histórico de Cambios

| Fecha | Cambio | Autor |
|-------|--------|-------|
| Mayo 2026 | Implementación inicial del selector web | GSATEK |

---

*Documento generado: Mayo 2026*
*Proyecto: Home Glass - Sistema de Selector de Packs de Reforma*
*Versión: 1.0*