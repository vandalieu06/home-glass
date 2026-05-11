# Informe de Sesión: Selección de producto con detalle expandido

**Fecha:** 11 Mayo 2026

---

## Cambios Realizados

### 1. Vista de detalle al seleccionar producto en grid (`selector.js`)

**Problema:** En categorías con múltiples productos (30+), al seleccionar uno los selectores de variante aparecían al final del grid, obligando a scrollear y sin confirmación visual clara del producto elegido.

**Solución:** Se implementó un sistema de dos fases:
- **Fase 1 (Grid):** Muestra todos los productos. Sin atributos visibles.
- **Fase 2 (Detalle):** Al pulsar un producto, se oculta el grid y se muestra el producto en grande (`.hg-product-card` con imagen 180px + nombre + precio) seguido de los selectores de variante. Incluye un link "← Cambiar producto" para volver al grid.

### 2. Nuevo estado `product_detail_mode` (`selector.js`)

Añadido al estado global y a `clearState()` para controlar qué vista mostrar por categoría. Se persiste automáticamente en localStorage.

### 3. Nueva función `showProductGrid()` (`selector.js`)

Permite volver del detalle al grid manteniendo la selección actual. Expuesta al `window` para uso desde `onclick`.

### 4. CSS: reemplazo de `.hg-category-attributes` (`selector.css`)

Eliminado el panel `.hg-category-attributes` (ya no se usa). Añadido `.hg-back-to-grid` para el link de retorno al grid.

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `selector_packs/static/src/js/selector.js` | Estado, renderizado en dos fases, navegación grid/detalle |
| `selector_packs/static/src/css/selector.css` | Eliminado `.hg-category-attributes`, añadido `.hg-back-to-grid` |
| `selector_packs/controller/main.py` | (Sin cambios) |
| `selector_packs/views/templates.xml` | (Sin cambios) |

---

## Estado Actual

- Categorías con 1 producto: vista directa con card + variantes (sin cambios)
- Categorías con múltiples productos: grid → clic → detalle con imagen grande + variantes
- Link "← Cambiar producto" desde el detalle para volver al grid
- La selección actual se mantiene al volver al grid
- Single-product y multi-product comparten el mismo `.hg-product-card` para consistencia visual
