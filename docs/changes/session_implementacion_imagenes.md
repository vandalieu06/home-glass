# Session Document: Implementación de Imágenes para Mamparas y Muebles de Baño

**Date:** 2026-05-12
**Project:** home-glass / selector_packs (Odoo Module)
**Objective:** Asignar imágenes (`image_1920`) a productos de mamparas y muebles de baño que carecían de ellas en los archivos XML de datos.

---

## Overview

Se identificó que los productos del módulo `selector_packs` no tenían imágenes asignadas en los archivos XML de datos (`02_mamparas.xml` y `04_muebles_bano_fase1.xml`), a pesar de que los archivos de imagen correspondientes existían en el directorio `selector_packs/static/src/img/`. Las imágenes se servían dinámicamente a través del controlador `/web/image/product.template/{id}/image_1024` de Odoo, pero al no estar definido el campo `image_1920` en los datos, no se mostraba ninguna imagen.

Se implementó una solución siguiendo el patrón existente en el archivo `product.template.xml` (archivo antiguo no cargado), que usaba `<field name="image_1920" type="base64" file="..."/>`.

---

## Tasks Completed

### 1. Exploración y Diagnóstico

- Se revisaron las imágenes en `selector_packs/static/src/img/`, identificando los subdirectorios `MAMPARAS/` y `MUEBLES_BANO/`.
- Se analizó la estructura del controlador de imágenes de Odoo (`/web/image/product.template/{id}/image_1024`) y se determinó que el campo `image_1920` debía poblarse en los datos XML para que las imágenes estuvieran disponibles.
- Se examinó el archivo `product.template.xml` como referencia del patrón existente para la asignación de imágenes.
- Se verificó que los archivos XML de datos (`02_mamparas.xml` y `04_muebles_bano_fase1.xml`) no contenían el campo `image_1920` en ningún producto.

### 2. Mapeo de Imágenes a Productos

Se creó un plan de mapeo detallado:

| Archivo XML | Tipo de Producto | Imágenes | Mapping |
|---|---|---|---|
| `02_mamparas.xml` | Mamparas (shower screens) | `MAMPARA_01.png` a `MAMPARA_28.png` | 1:1 directo — la imagen `MAMPARA_N.png` corresponde al producto `MAMPARA_N` en orden de aparición |
| `04_muebles_bano_fase1.xml` | Muebles de baño (bathroom furniture) | 31 imágenes en `MUEBLES_BANO/` | Mapping personalizado — cada producto tiene una imagen específica según su tipo y modelo |

### 3. Implementación con Script Python

Se desarrolló y ejecutó un script Python que:

1. **Procesó `02_mamparas.xml`:**
   - Agregó el campo `<field name="image_1920" type="base64" file="..."/>` a 28 productos de mamparas.
   - Usó mapping 1:1: `MAMPARA_01.png` → primer producto, `MAMPARA_02.png` → segundo producto, etc.
   - Ruta base: `selector_packs/static/src/img/MAMPARAS/MAMPARA_`.

2. **Procesó `04_muebles_bano_fase1.xml`:**
   - Agregó el campo `image_1920` a 31 productos de muebles de baño.
   - Usó un diccionario de mapping personalizado que asigna una imagen específica a cada producto según su referencia interna (`MUEBLE_BANO_*`).
   - Ruta base: `selector_packs/static/src/img/MUEBLES_BANO/`.

### 4. Verificación de Imágenes

Se confirmó que los 59 archivos de imagen referenciados (28 de mamparas + 31 de muebles de baño) existen en disco en las rutas especificadas.

---

## Files Modified

| File | Absolute Path | Changes |
|---|---|---|
| `02_mamparas.xml` | `/home/jhonny/dev/work/addons/home-glass/selector_packs/data/02_mamparas.xml` | Added `<field name="image_1920" type="base64" file="..."/>` to 28 products |
| `04_muebles_bano_fase1.xml` | `/home/jhonny/dev/work/addons/home-glass/selector_packs/data/04_muebles_bano_fase1.xml` | Added `<field name="image_1920" type="base64" file="..."/>` to 31 products |

---

## Image Inventory

### Mamparas (`selector_packs/static/src/img/MAMPARAS/`)
- **Total images referenced:** 28 (`MAMPARA_01.png` through `MAMPARA_28.png`)
- **Mapping:** Direct 1:1 by product order in XML

### Muebles de Baño (`selector_packs/static/src/img/MUEBLES_BANO/`)
- **Total images referenced:** 31
- **Mapping:** Custom per-product mapping based on product reference
- **Naming convention:** Mixed — includes references like `MUEBLE_BANO_01.png`, columna-related images, lavamanos images, and `MUEBLE_BAÑO_*.png`

---

## Decisions and Notes

- **Approach:** Used the `<field name="image_1920" type="base64" file="..."/>` pattern consistent with Odoo's data-based image assignment, following the precedent set in `product.template.xml`.
- **Mapping strategy:** Mamparas used a simple sequential 1:1 mapping since the product names and image filenames aligned naturally. Muebles de baño required a custom mapping dictionary because the relationship between product references and image filenames was not sequential.
- **No data migration needed:** Since no products existed in production with this module, updating the XML source files was sufficient — no SQL migration or Odoo upgrade script was necessary.
- **Image paths:** All paths are relative to the addon root (e.g., `selector_packs/static/src/img/MAMPARAS/MAMPARA_01.png`), which is Odoo's standard convention for `file=` fields.

---

## Commands Executed

- Python script execution for XML manipulation (custom inline script with `xml.etree.ElementTree`)
- File existence verification with `os.path.exists()` for all 59 referenced images
- `git status` and `git diff` to verify changes before committing

---

## Next Steps

1. **Test the images in Odoo:** Load the module in an Odoo instance and verify that product images render correctly on the `/web/image/product.template/{id}/image_1024` endpoint.
2. **Review remaining data files:** Check `01_ceramicas.xml`, `03_griferias.xml`, `05_platos_ducha.xml`, `06_muebles_bano_fase2.xml`, and others for similar missing images.
3. **Consider incremental load:** If products already exist in the database, create a data migration script to populate `image_1920` for existing records.
4. **Optimize image sizes:** Verify that images are appropriately sized for the `image_1920` field (Odoo recommends max 1920px on the longest side) to avoid performance issues.
5. **Standardize naming:** Consider standardizing image filenames across all categories for consistency (e.g., `CATEGORIA_NN.png`).
