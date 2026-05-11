# Generación de PDF de Presupuesto

Para llevar a cabo este flujo completo (clic en un botón -> enviar datos a un controlador -> renderizar una plantilla XML QWeb personalizada -> descargar o mostrar el PDF del presupuesto), estás diseñando una integración excelente para flujos a medida (como portales web, e-commerce o integraciones externas).

A continuación, tienes los detalles de cómo estructurar los componentes, el código necesario y los aspectos clave que debes tener en cuenta.

---

### 1. El Flujo de Trabajo Técnico

El proceso se divide en tres partes: el botón (frontend/cliente), el controlador (backend en Python) y la plantilla (XML en QWeb).

#### A. El Controlador Python (`controllers/main.py`)

El controlador recibirá la petición HTTP, procesará los datos, llamará al motor de reportes de Odoo para renderizar el PDF y devolverá el archivo binario con las cabeceras HTTP correctas.

```python
from odoo import http
from odoo.http import request

class CustomQuotationController(http.Controller):

    @http.route('/print/custom_quotation', type='http', auth='user', methods=['POST', 'GET'])
    def print_custom_quotation(self, res_id, **post):
        # 1. Obtener el registro del presupuesto (sale.order) usando el ID recibido
        order = request.env['sale.order'].sudo().browse(int(res_id))
        if not order.exists():
            return request.not_found()

        # 2. Llamar a la acción de reporte por su ID externo
        # 'mi_modulo.action_report_custom_quotation' es el ID de la acción que definiremos en XML
        report = request.env.ref('mi_modulo.action_report_custom_quotation')

        # 3. Renderizar el PDF (render_qweb_pdf devuelve una tupla: (contenido_pdf, tipo_archivo))
        pdf_content, _ = report.sudo().render_qweb_pdf([order.id])

        # 4. Construir la respuesta HTTP para forzar la descarga o visualización del PDF
        pdfheaders = [
            ('Content-Type', 'application/pdf'),
            ('Content-Length', len(pdf_content)),
            ('Content-Disposition', f'inline; filename="Presupuesto_{order.name}.pdf"')
        ]
        return request.make_response(pdf_content, headers=pdfheaders)

```

#### B. La Acción del Reporte y la Plantilla XML (`views/report_views.xml`)

Debes declarar el reporte (`ir.actions.report`) que se encargará de vincular tu modelo con el diseño QWeb.

```xml
<?xml version="1.0" encoding="utf-8"?>
<odoo>
    <record id="action_report_custom_quotation" model="ir.actions.report">
        <field name="name">Presupuesto Personalizado</field>
        <field name="model">sale.order</field>
        <field name="report_type">qweb-pdf</field>
        <field name="report_name">mi_modulo.report_custom_quotation_template</field>
        <field name="report_file">mi_modulo.report_custom_quotation_template</field>
        <field name="binding_model_id" eval="False"/> </record>

    <template id="report_custom_quotation_template">
        <t t-call="web.html_container">
            <t t-foreach="docs" t-as="o">
                <t t-call="web.external_layout">
                    <div class="page">
                        <div class="row">
                            <div class="col-6">
                                <h2>Presupuesto #<span t-field="o.name"/></h2>
                            </div>
                            <div class="col-6 text-right">
                                <p><strong>Fecha:</strong> <span t-field="o.date_order" t-options='{"widget": "date"}'/></p>
                            </div>
                        </div>

                        <div class="row mt-4">
                            <div class="col-12">
                                <strong>Cliente:</strong>
                                <p t-field="o.partner_id.name"/><br/>
                                <span t-field="o.partner_id.street"/>
                            </div>
                        </div>

                        <table class="table table-sm o_main_table mt-4">
                            <thead>
                                <tr>
                                    <th>Descripción</th>
                                    <th class="text-right">Cantidad</th>
                                    <th class="text-right">Precio Unitario</th>
                                    <th class="text-right">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                <t t-foreach="o.order_line" t-as="line">
                                    <tr>
                                        <td><span t-field="line.name"/></td>
                                        <td class="text-right"><span t-field="line.product_uom_qty"/></td>
                                        <td class="text-right"><span t-field="line.price_unit"/></td>
                                        <td class="text-right"><span t-field="line.price_subtotal"/></td>
                                    </tr>
                                </t>
                            </tbody>
                        </table>

                        <div class="row justify-content-end">
                            <div class="col-4">
                                <table class="table table-sm">
                                    <tr>
                                        <td><strong>Total:</strong></td>
                                        <td class="text-right"><span t-field="o.amount_total"/></td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                    </div>
                </t>
            </t>
        </t>
    </template>
</odoo>

```

---

### 2. Qué Debes Tener en Cuenta en esta Generación Custom

Al construir un flujo de reportes en PDF utilizando un controlador y QWeb de cero, existen varios factores técnicos críticos:

* **Gestión de Permisos (Seguridad):** En el controlador definimos `auth='user'`. Esto garantiza que solo los usuarios logueados puedan llamar al controlador. Si necesitas que lo descargue un cliente desde un portal externo sin registrarse, deberás usar `auth='public'` y asegurar la url firmando el enlace con un token de acceso (como hace Odoo en su portal nativo) para evitar que cualquier usuario adivine el ID secuencial de la URL y acceda a presupuestos ajenos.
* **El entorno de ejecución (`sudo()`):**
Dado que el reporte puede requerir leer campos o modelos para los cuales el usuario actual no posee permisos completos (por ejemplo, costes o tarifas), es muy habitual utilizar `.sudo()` tanto al buscar el registro como al renderizar el reporte para evitar excepciones de acceso.
* **La herramienta de renderizado (wkhtmltopdf):**
Odoo utiliza la herramienta externa de sistema `wkhtmltopdf` para convertir el HTML generado por QWeb en un documento PDF.
* Diseña siempre pensando en Bootstrap 4.
* Evita propiedades modernas de CSS (como `flexbox` avanzado o CSS Grid), ya que el motor de renderizado de `wkhtmltopdf` es antiguo y suele romper el diseño de elementos que dependan de estas tecnologías. Utiliza en su lugar el sistema de rejilla tradicional (`row`, `col-*`) y tablas estándar de HTML.


* **Manejo de saltos de página (Page Breaks):**
Si tu presupuesto contiene demasiadas líneas, es vital controlar dónde corta el PDF. Puedes usar clases CSS nativas de Odoo como `page-break-inside: avoid;` en filas de tablas o divs de totales para evitar que queden huérfanos o partidos a la mitad entre dos páginas.
* **Estructura HTML obligatoria:**
Para que el encabezado, pie de página y estilos se carguen correctamente, la plantilla QWeb debe estar envuelta estrictamente bajo las etiquetas `<t t-call="web.html_container">` y, dentro de esta, envolver el contenido del registro en `<t t-call="web.external_layout">` (que añade cabeceras de compañía) o `<t t-call="web.basic_layout">` (si prefieres un lienzo completamente limpio sin cabeceras corporativas).

---

Para complementar tu aprendizaje sobre la creación de reportes QWeb y comprender cómo se estructuran las vistas y el motor de PDF en Odoo, te recomiendo ver el video [Modifica una vista Qweb para cambiar un reporte en PDF](https://www.youtube.com/watch?v=M8QsWQTbDp8). Este tutorial te ayudará a familiarizarte con las etiquetas del motor de plantillas y las herramientas de diseño necesarias para que tu PDF se visualice perfectamente.
