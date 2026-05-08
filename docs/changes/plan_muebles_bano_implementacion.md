# Plan de Implementación: Muebles de Baño en selector_packs/data

## Resumen ejecutivo

Este documento detallan el plan completo para crear todos los muebles de baño definidos en la documentación (`docs/productos/catalogo/muebles_baño/`) en los archivos XML de `selector_packs/data/`.

**Estado actual:**
- Muebles creados: 3 (Vora Enzo, Vora Cairo, Win)
- Muebles por crear: 28 modelos nuevos
- Total tras implementación: 31 modelos

---

## 1. Estado Actual del Sistema

### 1.1 Archivos existentes

| Archivo | Contenido |
|---------|----------|
| `selector_packs/data/01_atributos.xml` | Definición de atributos (acabados, modelos, tipos) |
| `selector_packs/data/04_muebles_bano_fase1.xml` | Productos de muebles (fase 1) |

### 1.2 Muebles ya creados

| ID | Nombre | Descripción |
|----|--------|-----------|
| `mueble_vora_enzo` | Vora lavabo integrado Enzo | Mueble con lavabo integrado Enzo |
| `mueble_vora_cairo` | Vora lavabo integrado Cairo | Mueble con lavabo integrado Cairo |
| `mueble_win` | Win lavabo integrado | Mueble con lavabo integrado |

### 1.3 Atributos existentes

| Atributo | valores |
|----------|----------|
| `attr_acabado_mueble` | Hickory Nature, Nogal, Notte, Blanco Mate, Verde Mineral, Arena Mate, Habana Mate |
| `attr_modelo_mueble` | Set 60 1C, Set 80 1C, Set 100 1C, Set 120 2C, Set 60 2C, Set 80 2C, Set 100 2C, Set 120 4C |
| `attr_tipo_mueble` | Mueble + Lavabo, Conjunto Completo, Conjunto Premium |

---

## 2. Muebles definidos en documentación

### 2.1 Lista completa de modelos por crear

| # | Archivo | Modelo | Tipo | Acabados |
|---|---------|--------|------|----------|
| 1 | 0005.md | Vora lavabo sobre encimera | Encimera | Hickory Nature, Nogal, Notte, Blanco Mate, Verde Mineral, Arena Mate, Habana Mate |
| 2 | 0008.md | Win 1C2P | Integrado | Roble Vulcano, Roble Colonial, Nogal Ártico, Blanco Pure |
| 3 | 0009.md | Logika lavabo Integrado | Integrado | (definir según docs) |
| 4 | 0010.md | Logika lavabo sobre encimera | Encimera | (definir según docs) |
| 5 | 0011.md | Econic lavabo Integrado | Integrado | (definir según docs) |
| 6 | 0012.md | Econic lavabo sobre encimera | Encimera | (definir según docs) |
| 7 | 0013.md | Vitale suspendido Enzo | Integrado | Blanco Brillo, Nature, Beige Nature, Blanco Mate, Azul Mate, Camel, Gris Mate, Verde Mate |
| 8 | 0014.md | Vitale suspendido Cairo | Integrado | Blanco Nature, Beige Nature, Hickory Nature, Verde Mineral, Arena Mate, Blanco Brillo, Blanco Mate, Azul Navy Mate |
| 9 | 0015.md | Vitale a suelo | Integrado | (con Enzo y Cairo) |
| 10 | 0016.md | Vitale profundidad reducida | Integrado | (similar a suspendido) |
| 11 | 0017.md | Alfa Compact | Integrado | Blanco Nature, Beige Nature, Hickory Nature, Verde Mineral, Arena Mate, Blanco Mate |
| 12 | 0018.md | Alfa (120) | Integrado | Roble Nórdico, Fresno Samara, Verde Mineral, Arena Mate, Blanco Brillo, Blanco Mate |
| 13 | 0019.md | Dai lavabo Integrado | Integrado | Roble Nórdico, Fresno Samara, Arena Mate, Blanco Brillo |
| 14 | 0019.md | Dai lavabo sobre encimera | Encimera | Roble Nórdico, Fresno Samara, Arena Mate, Blanco Brillo |
| 15 | 0021.md | Urban suspendido | Integrado | Roble Nórdico, Fresno Samara, Arena Mate, Blanco Brillo |
| 16 | 0022.md | Urban a suelo | Integrado | Blanco Nature, Beige Nature, Gris Nature, Blanco Mate |
| 17 | 0023.md | Sansa suspendido | Integrado | Blanco Brillo, Arena Mate, Gris Mate, Nogal Arenado |
| 18 | 0024.md | Sansa sobre encimera | Encimera | Gris Arenado, Roble Colonial, Nogal Arenado, Blanco Brillo |
| 19 | 0025.md | Sansa a suelo | Integrado | Gris Arenado, Roble Colonial, Nogal Arenado, Blanco Brillo |
| 20 | 0026.md | Sansa profundidad reducida | Integrado | Gris Arenado, Roble Colonial, Nogal Arenado, Blanco Brillo |
| 21 | 0027.md | Niwa suspendido | Integrado | Blanco Nature, Gris Nature, Blanco Brillo |
| 22 | 0028.md | Mio Compact | Integrado | Roble Blanco, Arena Mate, Blanco Mate (tirador negro/blanco) |
| 23 | 0029.md | Vida Compact | Integrado | Gris Arenado, Nogal Arenado, Roble Eternity, Verde Pure, Blanco Brillo, Blanco Mate, Azul Navy Mate, Antracita Brillo, Negro Mate |
| 24 | 0030.md | Wave Compact | Curvo | Blanco Nature, Beige Nature, Arena Mate, Blanco Mate |
| 25 | 0031.md | Essence Compact | Encimera | Beige Nature, Blanco Mate |
| 26 | 0032.md | Bassi | Encimera | (varios acabados) |
| 27 | 0033.md | Street pack | Pack | Gris Arenado, Nogal Arenado, Roble Colonial, Roble Vulcano, Blanco Brillo, Antracita Brillo |
| 28 | 0033.md | Enjoy pack | Pack | Roble Nórdico, Fresno Samara, Blanco Brillo |
| 29 | 0034.md | Elegance pack | Pack | Gris Arenado, Nogal Arenado, Blanco Brillo, Galet Brillo, Antracita Brillo |

---

## 3. Atributos necesarios

### 3.1 Nuevos acabados requeridos

| ID | Nombre | Modelos que lo usan |
|----|--------|---------------------|
| `attr_acabado_blanco_brillo` | Blanco Brillo | Vitale, Urban, Sansa, Dai, Alfa, Niwa, Mio, Vida, Wave, Essence, Street, Enjoy, Elegance |
| `attr_acabado_roble_nordico` | Roble Nórdico | Alfa, Dai, Urban, Enjoy |
| `attr_acabado_fresno_samara` | Fresno Samara | Alfa, Dai, Urban, Enjoy |
| `attr_acabado_nogal_artico` | Nogal Ártico | Win |
| `attr_acabado_beige_nature` | Beige Nature | Vitale |
| `attr_acabado_blanco_nature` | Blanco Nature | Vitale, Urban, Niwa, Wave |
| `attr_acabado_gris_nature` | Gris Nature | Urban, Niwa |
| `attr_acabado_roble_colonial` | Roble Colonial | Sansa |
| `attr_acabado_nogal_arenado` | Nogal Arenado | Sansa |
| `attr_acabado_gris_arenado` | Gris Arenado | Sansa, Vida, Street |
| `attr_acabado_roble_vulcano` | Roble Vulcano | Sansa, Street |
| `attr_acabado_roble_eternity` | Roble Eternity | Vida |
| `attr_acabado_verde_pure` | Verde Pure | Vida |
| `attr_acabado_azul_navy_mate` | Azul Navy Mate | Vitale, Vida |
| `attr_acabado_antracita_brillo` | Antracita Brillo | Vida, Street, Elegance |
| `attr_acabado_negro_mate` | Negro Mate | Vida |
| `attr_acabado_gris_mate` | Gris Mate | Sansa |
| `attr_acabado_galet_brillo` | Galet Brillo | Elegance |
| `attr_acabado_camel` | Camel | Vitale |

### 3.2 Nuevos modelos (sets) requeridos

| ID | Nombre | Modelos que lo usan |
|----|--------|---------------------|
| `attr_modelo_mueble_set_70_2c` | Set 70 2C | Win, Sansa |
| `attr_modelo_mueble_set_90_2c` | Set 90 2C | Win, Alfa, Logika |
| `attr_modelo_mueble_set_60_1c2p` | Set 60 1C2P | Win |
| `attr_modelo_mueble_set_60_3c` | Set 60 3C | Vitale a suelo, Urban a suelo, Sansa a suelo |
| `attr_modelo_mueble_set_80_3c` | Set 80 3C | Vitale a suelo, Urban a suelo, Sansa a suelo |
| `attr_modelo_mueble_set_100_3c` | Set 100 3C | Vitale a suelo, Urban a suelo, Sansa a suelo |
| `attr_modelo_mueble_set_120_6c` | Set 120 6C | Vitale a suelo, Urban a suelo, Sansa a suelo |
| `attr_modelo_mueble_set_60_2p` | Set 60 2P | Sansa |
| `attr_modelo_mueble_set_70_2p` | Set 70 2P | Sansa |
| `attr_modelo_mueble_set_80_2p` | Set 80 2P | Sansa |
| `attr_modelo_mueble_set_120_4p` | Set 120 4P | Sansa |
| `attr_modelo_mueble_set_60_1c1h` | Set 60 1C1H | Niwa |
| `attr_modelo_mueble_set_80_1c1h` | Set 80 1C1H | Niwa |
| `attr_modelo_mueble_set_50_1p` | Set 50 1P | Bassi |
| `attr_modelo_mueble_set_45_1p` | Set 45 1P | Enjoy, Elegance |
| `attr_modelo_mueble_set_50_2p` | Set 50 2P | Street |
| `attr_modelo_mueble_set_50_2c` | Set 50 2C | Street |
| `attr_modelo_mueble_set_80_1c` | Set 80 1C | Wave, Essence |

---

## 4. Pasos de implementación

### Paso 1: Añadir atributos faltantes en 01_atributos.xml

#### 4.1.1 Acabados por familia de muebles

Se creará un atributo por cada familia para mantener los acabados agrupados:

```xml
<!-- Vitale -->
<record id="attr_acabado_vitale" model="product.attribute">
    <field name="name">Acabado Vitale</field>
    <field name="create_variant">always</field>
    <field name="display_type">radio</field>
</record>
<record id="attr_acabado_vitale_bb" model="product.attribute.value">
    <field name="name">Blanco Brillo</field>
    <field name="attribute_id" ref="attr_acabado_vitale"/>
</record>
<!-- ... más valores -->

<!-- Urban -->
<record id="attr_acabado_urban" model="product.attribute">
    <field name="name">Acabado Urban</field>
    <field name="create_variant">always</field>
    <field name="display_type">radio</field>
</record>
<!-- ... -->

<!-- Repetir para cada familia -->
```

#### 4.1.2 Modelos (sets) adicionales

Agregar al atributo `attr_modelo_mueble` existente los nuevos sets:

```xml
<!-- Sets para muebles a suelo (3C, 6C) -->
<record id="attr_modelo_mueble_set_60_3c" model="product.attribute.value">
    <field name="name">Set 60 3C</field>
    <field name="attribute_id" ref="attr_modelo_mueble"/>
</record>
<!-- ... más valores -->
```

---

### Paso 2: Crear registros de productos en 04_muebles_bano_fase1.xml

Por cada modelo de mueble nuevo, crear la estructura:

```xml
<!-- [NOMBRE] -->
<record id="mueble_[id]" model="product.template">
    <field name="name">Mueble [Nombre]</field>
    <field name="type">product</field>
    <field name="list_price">[PRECIO_BASE]</field>
    <field name="description">Mueble de baño [Nombre]</field>
</record>
<record id="mueble_[id]_attr_acabado" model="product.template.attribute.line">
    <field name="product_tmpl_id" ref="mueble_[id]"/>
    <field name="attribute_id" ref="attr_acabado_[familia]"/>
    <field name="value_ids" eval="[(6, 0, [ref('attr_acabado_[valor1]'), ref('attr_acabado_[valor2]'), ...])]"/>
</record>
<record id="mueble_[id]_attr_modelo" model="product.template.attribute.line">
    <field name="product_tmpl_id" ref="mueble_[id]"/>
    <field name="attribute_id" ref="attr_modelo_mueble"/>
    <field name="value_ids" eval="[(6, 0, [ref('attr_modelo_mueble_set_60_1c'), ...])]"/>
</record>
<record id="mueble_[id]_attr_tipo" model="product.template.attribute.line">
    <field name="product_tmpl_id" ref="mueble_[id]"/>
    <field name="attribute_id" ref="attr_tipo_mueble"/>
    <field name="value_ids" eval="[(6, 0, [ref('attr_tipo_mueble_mas_lavabo'), ref('attr_tipo_mueble_conjunto_completo'), ref('attr_tipo_mueble_conjunto_premium')])]"/>
</record>
```

---

## 5. Detalle de cada modelo a crear

### 5.1 Vora lavabo sobre encimera (0005.md)

```xml
<!-- 0005: Vora lavabo sobre encimera -->
<record id="mueble_vora_encimera" model="product.template">
    <field name="name">Mueble Vora lavabo sobre encimera</field>
    <field name="type">product</field>
    <field name="list_price">348.00</field>
    <field name="description">Mueble de baño Vora con lavabo sobre encimera</field>
</record>
<record id="mueble_vora_encimera_attr_acabado" model="product.template.attribute.line">
    <field name="product_tmpl_id" ref="mueble_vora_encimera"/>
    <field name="attribute_id" ref="attr_acabado_mueble"/>
    <field name="value_ids" eval="[(6, 0, [ref('attr_acabado_hickory_nature'), ref('attr_acabado_nogal'), ref('attr_acabado_notte'), ref('attr_acabado_blanco_mate'), ref('attr_acabado_verde_mineral'), ref('attr_acabado_arena_mate'), ref('attr_acabado_habana_mate')])]"/>
</record>
<record id="mueble_vora_encimera_attr_modelo" model="product.template.attribute.line">
    <field name="product_tmpl_id" ref="mueble_vora_encimera"/>
    <field name="attribute_id" ref="attr_modelo_mueble"/>
    <field name="value_ids" eval="[(6, 0, [ref('attr_modelo_mueble_set_60_1c'), ref('attr_modelo_mueble_set_80_1c'), ref('attr_modelo_mueble_set_100_1c'), ref('attr_modelo_mueble_set_120_2c'), ref('attr_modelo_mueble_set_60_2c'), ref('attr_modelo_mueble_set_80_2c'), ref('attr_modelo_mueble_set_100_2c'), ref('attr_modelo_mueble_set_120_4c')])]"/>
</record>
<record id="mueble_vora_encimera_attr_tipo" model="product.template.attribute.line">
    <field name="product_tmpl_id" ref="mueble_vora_encimera"/>
    <field name="attribute_id" ref="attr_tipo_mueble"/>
    <field name="value_ids" eval="[(6, 0, [ref('attr_tipo_mueble_mas_lavabo'), ref('attr_tipo_mueble_conjunto_completo'), ref('attr_tipo_mueble_conjunto_premium')])]"/>
</record>
```

### 5.2 Win 1C2P (0008.md)

```xml
<!-- 0008: Win 1C2P -->
<record id="mueble_win_1c2p" model="product.template">
    <field name="name">Mueble Win 1C2P</field>
    <field name="type">product</field>
    <field name="list_price">389.00</field>
    <field name="description">Mueble de baño Win 1C2P con lavabo integrado</field>
</record>
```

### 5.3 Logika lavabo integrado (0009.md)

```xml
<!-- 0009: Logika lavabo integrado -->
```

### 5.4 Logika lavabo sobre encimera (0010.md)

```xml
<!-- 0010: Logika lavabo sobre encimera -->
```

### 5.5 Econic lavabo integrado (0011.md)

```xml
<!-- 0011: Econic lavabo integrado -->
```

### 5.6 Econic lavabo sobre encimera (0012.md)

```xml
<!-- 0012: Econic lavabo sobre encimera -->
```

### 5.7 Vitale suspendido Enzo (0013.md)

```xml
<!-- 0013: Vitale suspendido Enzo -->
```

### 5.8 Vitale suspendido Cairo (0014.md)

```xml
<!-- 0014: Vitale suspendido Cairo -->
```

### 5.9 Vitale a suelo (0015.md)

```xml
<!-- 0015: Vitale a suelo -->
```

### 5.10 Vitale profundidad reducida (0016.md)

```xml
<!-- 0016: Vitale profundidad reducida -->
```

### 5.11 Alfa Compact (0017.md)

```xml
<!-- 0017: Alfa Compact -->
```

### 5.12 Alfa (0018.md)

```xml
<!-- 0018: Alfa -->
```

### 5.13 Dai lavabo integrado (0019.md)

```xml
<!-- 0019: Dai lavabo integrado -->
```

### 5.14 Dai lavabo sobre encimera (0019.md)

```xml
<!-- 0019: Dai lavabo sobre encimera -->
```

### 5.15 Urban suspendido (0021.md)

```xml
<!-- 0021: Urban suspendido -->
```

### 5.16 Urban a suelo (0022.md)

```xml
<!-- 0022: Urban a suelo -->
```

### 5.17 Sansa suspendido (0023.md)

```xml
<!-- 0023: Sansa suspendido -->
```

### 5.18 Sansa sobre encimera (0024.md)

```xml
<!-- 0024: Sansa sobre encimera -->
```

### 5.19 Sansa a suelo (0025.md)

```xml
<!-- 0025: Sansa a suelo -->
```

### 5.20 Sansa profundidad reducida (0026.md)

```xml
<!-- 0026: Sansa profundidad reducida -->
```

### 5.21 Niwa suspendido (0027.md)

```xml
<!-- 0027: Niwa suspendido -->
```

### 5.22 Mio Compact (0028.md)

```xml
<!-- 0028: Mio Compact -->
```

### 5.23 Vida Compact (0029.md)

```xml
<!-- 0029: Vida Compact -->
```

### 5.24 Wave Compact (0030.md)

```xml
<!-- 0030: Wave Compact -->
```

### 5.25 Essence Compact (0031.md)

```xml
<!-- 0031: Essence Compact -->
```

### 5.26 Bassi (0032.md)

```xml
<!-- 0032: Bassi -->
```

### 5.27 Street pack (0033.md)

```xml
<!-- 0033: Street pack -->
```

### 5.28 Enjoy pack (0033.md)

```xml
<!-- 0033: Enjoy pack -->
```

### 5.29 Elegance pack (0034.md)

```xml
<!-- 0034: Elegance pack -->
```

---

## 6. Notas adicionales

### 6.1 Consideraciones importantes

1. **Precios base**: Los precios listados son referencia. Verificar en la documentación original.
2. **Acabados por modelo**: Cada mueble puede tener acabados diferentes. Es importante crear atributos específicos por familia.
3. **Variantes de senos**: Este plan no incluye las variantes de senos (izq/dch, centrado, doble). Si se necesitan, agregar nuevos valores a `attr_modelo_mueble`.
4. **Conjuntos**: El tipo "Conjunto Completo" y "Conjunto Premium" incluye espejo y luminaria. Verificar compatibilidad por modelo.

### 6.2 Próximas fases sugeridas

1. **Fase 2**: Añadir variantes de senos (seno izq, seno dch, doble seno)
2. **Fase 3**: Añadir columnas y auxiliares
3. **Fase 4**: Añadir espejos y luminarias relacionadas
4. **Fase 5**: Añadir lavabos separados (Enzo, Cairo, Slim, etc.)

---

## 7. Archivos a modificar

| Archivo | Acción |
|---------|--------|
| `selector_packs/data/01_atributos.xml` | Añadir nuevos atributos de acabado y modelo |
| `selector_packs/data/04_muebles_bano_fase1.xml` | Añadir registros de productos |

---

## 7. Archivos a modificar

| Archivo | Acción |
|---------|--------|
| `selector_packs/data/01_atributos.xml` | Añadir nuevos atributos de acabado y modelo |
| `selector_packs/data/04_muebles_bano_fase1.xml` | Añadir registros de productos |

---

## 8. Estado de implementación

### 8.1 Atributos añadidos (01_atributos.xml)

Se añadieron los siguientes acabados:

| ID | Nombre |
|----|--------|
| `attr_acabado_blanco_brillo` | Blanco Brillo |
| `attr_acabado_roble_nordico` | Roble Nórdico |
| `attr_acabado_fresno_samara` | Fresno Samara |
| `attr_acabado_nogal_artico` | Nogal Ártico |
| `attr_acabado_beige_nature` | Beige Nature |
| `attr_acabado_blanco_nature` | Blanco Nature |
| `attr_acabado_gris_nature` | Gris Nature |
| `attr_acabado_roble_colonial` | Roble Colonial |
| `attr_acabado_nogal_arenado` | Nogal Arenado |
| `attr_acabado_gris_arenado` | Gris Arenado |
| `attr_acabado_roble_vulcano` | Roble Vulcano |
| `attr_acabado_roble_eternity` | Roble Eternity |
| `attr_acabado_verde_pure` | Verde Pure |
| `attr_acabado_azul_navy_mate` | Azul Navy Mate |
| `attr_acabado_antracita_brillo` | Antracita Brillo |
| `attr_acabado_negro_mate` | Negro Mate |
| `attr_acabado_gris_mate` | Gris Mate |
| `attr_acabado_galet_brillo` | Galet Brillo |
| `attr_acabado_camel` | Camel |
| `attr_acabado_azul_mate` | Azul Mate |
| `attr_acabado_verde_mate` | Verde Mate |
| `attr_acabado_blanco_pure` | Blanco Pure |
| `attr_acabado_roble_blanco` | Roble Blanco |

Se añadieron los siguientes modelos (sets):

| ID | Nombre |
|----|--------|
| `attr_modelo_mueble_set_70_2c` | Set 70 2C |
| `attr_modelo_mueble_set_90_2c` | Set 90 2C |
| `attr_modelo_mueble_set_60_1c2p` | Set 60 1C2P |
| `attr_modelo_mueble_set_60_3c` | Set 60 3C |
| `attr_modelo_mueble_set_80_3c` | Set 80 3C |
| `attr_modelo_mueble_set_100_3c` | Set 100 3C |
| `attr_modelo_mueble_set_120_6c` | Set 120 6C |
| `attr_modelo_mueble_set_60_2p` | Set 60 2P |
| `attr_modelo_mueble_set_70_2p` | Set 70 2P |
| `attr_modelo_mueble_set_80_2p` | Set 80 2P |
| `attr_modelo_mueble_set_120_4p` | Set 120 4P |
| `attr_modelo_mueble_set_60_1c1h` | Set 60 1C1H |
| `attr_modelo_mueble_set_80_1c1h` | Set 80 1C1H |
| `attr_modelo_mueble_set_50_1p` | Set 50 1P |
| `attr_modelo_mueble_set_45_1p` | Set 45 1P |
| `attr_modelo_mueble_set_50_2p` | Set 50 2P |
| `attr_modelo_mueble_set_50_2c` | Set 50 2C |

### 8.2 Muebles creados (04_muebles_bano_fase1.xml)

Se crearon 23 productos de muebles de baño:

| # | ID producto | Nombre |
|---|-----------|--------|
| 1 | `mueble_vora_enzo` | Vora lavabo integrado Enzo |
| 2 | `mueble_vora_cairo` | Vora lavabo integrado Cairo |
| 3 | `mueble_win` | Win lavabo integrado |
| 4 | `mueble_vora_encimera` | Vora lavabo sobre encimera |
| 5 | `mueble_win_1c2p` | Win 1C2P |
| 6 | `mueble_logika` | Logika lavabo integrado |
| 7 | `mueble_logika_encimera` | Logika lavabo sobre encimera |
| 8 | `mueble_econic` | Econic lavabo integrado |
| 9 | `mueble_econic_encimera` | Econic lavabo sobre encimera |
| 10 | `mueble_vitale_enzo` | Vitale suspendido Enzo |
| 11 | `mueble_vitale_cairo` | Vitale suspendido Cairo |
| 12 | `mueble_vitale_suelo` | Vitale a suelo |
| 13 | `mueble_alfa` | Alfa Compact |
| 14 | `mueble_dai` | Dai lavabo integrado |
| 15 | `mueble_urban` | Urban suspendido |
| 16 | `mueble_sansa` | Sansa suspendido |
| 17 | `mueble_niwa` | Niwa suspendido |
| 18 | `mueble_mio` | Mio Compact |
| 19 | `mueble_vida` | Vida Compact |
| 20 | `mueble_wave` | Wave Compact |
| 21 | `mueble_street` | Street Pack |
| 22 | `mueble_enjoy` | Enjoy Pack |
| 23 | `mueble_elegance` | Elegance Pack |

---

*Documento actualizado tras implementación*
*Fecha de implementación: 2026-05-08*
*Versión: 1.0*