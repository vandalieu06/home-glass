from odoo import http
from odoo.http import request
from odoo.exceptions import UserError
from odoo.tools import html_escape, plaintext2html
import json


class SelectorPacksController(http.Controller):

    # ============================================
    # RUTAS HTTP PRINCIPALES
    # ============================================

    @http.route('/reformas/packs', type='http', auth='public', website=True)
    def list_packs(self, **kwargs):
        packs = request.env['product.template'].sudo().search([
            ('is_pack', '=', True),
            ('type', '=', 'service'),
        ])

        values = {
            'packs': packs,
        }
        return request.render('selector_packs.packs_home', values)

    @http.route('/reformas/packs/<int:pack_id>', type='http', auth='public', website=True)
    def pack_selector(self, pack_id, **kwargs):
        pack = request.env['product.template'].sudo().browse(pack_id)

        if not pack.exists() or not pack.is_pack:
            return request.redirect('/reformas/packs')

        products = self._get_pack_products(pack_id)
        categories = self._get_categories_mapping()
        categories_data = self._get_pack_categories(pack_id)

        labour_products = [
            {
                'name': line['name'],
                'base_product_id': line['base_product_id'],
                'price': line['subtotal'],
            }
            for line in self._get_labour_lines(pack_id)
        ]

        values = {
            'pack': pack,
            'products': products,
            'labour_products': labour_products,
            'categories': categories,
            'categories_data': categories_data,
            'total_steps': len(categories_data),
        }
        return request.render('selector_packs.pack_selector', values)

    # ============================================
    # IMÁGENES PÚBLICAS DEL SELECTOR
    # ============================================

    PUBLIC_IMAGE_FIELDS = ('image_128', 'image_256', 'image_512', 'image_1024', 'image_1920')

    @http.route('/homeglass/image/<int:product_tmpl_id>/<string:field>', type='http', auth='public')
    def selector_image(self, product_tmpl_id, field, **kwargs):
        """Imagen de un pack o de un producto de pack, visible sin login.
        Sin website_sale el usuario público no puede leer product.template y /web/image
        devuelve el placeholder; aquí se sirve con sudo, solo para productos del selector."""
        if field not in self.PUBLIC_IMAGE_FIELDS:
            return request.not_found()

        template = request.env['product.template'].sudo().browse(product_tmpl_id).exists()
        if not template:
            return request.not_found()
        in_pack = template.is_pack or request.env['pack.products'].sudo().search_count([
            ('base_product_id', '=', template.id)
        ])
        if not in_pack:
            return request.not_found()

        return request.env['ir.http'].sudo()._content_image(
            model='product.template', res_id=template.id, field=field,
            unique=kwargs.get('unique'),
        )

    # ============================================
    # API JSON CENTRALIZADA
    # ============================================

    @http.route('/homeglass/selector/api', type='json', auth='public', methods=['POST'], csrf=False)
    def selector_api(self, **kw):
        json_body = request.jsonrequest
        params = json_body.get('params', {}) if isinstance(json_body, dict) else json_body
        action = params.get('action')

        if not action:
            return {'error': 'Missing action'}

        result = None
        if action == 'get_packs':
            result = self._get_packs(params)
        elif action == 'get_pack_products':
            result = self._get_pack_products_api(params)
        elif action == 'get_product_attributes':
            result = self._get_product_attributes(params)
        elif action == 'get_pack_categories':
            result = self._get_pack_categories(params.get('pack_id'))
        elif action == 'get_category_products':
            result = self._get_category_products_with_attributes(
                params.get('pack_id'), params.get('category_key')
            )
        elif action == 'validate_selections':
            result = self._validate_selections(params)
        elif action == 'create_lead':
            result = self._create_lead(params)
        else:
            return {'error': f'Invalid action: {action}'}

        if isinstance(result, dict) and result.get('error'):
            return {'error': result.get('error')}

        return result

    # ============================================
    # ACCIONES API
    # ============================================

    def _get_packs(self, payload):
        packs = request.env['product.template'].sudo().search([
            ('is_pack', '=', True),
            ('type', '=', 'service'),
        ])

        return {
            'packs': [
                {
                    'id': p.id,
                    'name': p.name,
                    'description': p.description_sale or '',
                    'price': p.list_price,
                    'image': f'/homeglass/image/{p.id}/image_1024',
                }
                for p in packs
            ]
        }

    def _get_pack_products_api(self, payload):
        pack_id = payload.get('pack_id')
        if not pack_id:
            return {'error': 'Missing pack_id'}

        products = self._get_pack_products(pack_id)

        return {
            'products': products,
            'total_steps': len(products),
        }

    def _get_product_attributes(self, payload):
        product_tmpl_id = payload.get('product_tmpl_id')
        pack_id = payload.get('pack_id')

        if not product_tmpl_id:
            return {'error': 'Missing product_tmpl_id'}

        return self._get_product_attributes_data(product_tmpl_id, pack_id)

    def _get_product_attributes_data(self, product_tmpl_id, pack_id):
        product = request.env['product.template'].sudo().browse(product_tmpl_id)

        if not product.exists():
            return {'error': 'Product not found'}

        category = self._get_product_category(product)
        is_preselected = self._is_product_preselected(pack_id, product_tmpl_id)
        preselected_values = self._get_preselected_values(pack_id, product_tmpl_id, product)

        attributes = []
        for line in product.attribute_line_ids:
            attr = line.attribute_id
            values = line.value_ids

            allowed_values = values
            if pack_id:
                allowed_values = self._filter_attributes_by_pack(pack_id, product_tmpl_id, attr, values)

            if allowed_values:
                attr_info = {
                    'id': attr.id,
                    'name': attr.name,
                    'values': [
                        {'id': v.id, 'name': v.name}
                        for v in allowed_values
                    ]
                }

                if category == 'mueble':
                    attr_info['depends_on'] = self._get_attribute_dependency(attr.name)
                    attr_info['order'] = self._get_attribute_order(attr.name)
                    attr_info['preselected'] = preselected_values.get(attr.name)

                if is_preselected:
                    attr_info['is_preselected'] = True
                    if preselected_values.get(attr.name):
                        attr_info['default_value'] = preselected_values[attr.name]

                attributes.append(attr_info)

        attributes.sort(key=lambda a: a.get('order', 999))

        return {
            'product_tmpl_id': product.id,
            'product_name': product.name,
            'price': product.list_price,
            'image': f'/homeglass/image/{product.id}/image_1024',
            'category': category,
            'is_preselected': is_preselected,
            'preselected_values': preselected_values,
            'attributes': attributes,
        }

    def _get_category_products_with_attributes(self, pack_id, category_key):
        products = self._get_pack_products(pack_id)
        category_products = [p for p in products if p['category'] == category_key]

        for p in category_products:
            attrs_data = self._get_product_attributes_data(p['base_product_id'], pack_id)
            p['attributes'] = attrs_data.get('attributes', [])
            p['is_preselected'] = attrs_data.get('is_preselected', False)
            p['preselected_values'] = attrs_data.get('preselected_values', {})

        return category_products

    def _validate_selections(self, payload):
        pack_id = payload.get('pack_id')
        selections = payload.get('selections', [])

        total_price = 0.0
        for sel in selections:
            product_tmpl_id = sel.get('product_tmpl_id')
            if product_tmpl_id:
                product = request.env['product.template'].sudo().browse(product_tmpl_id)
                if product.exists():
                    total_price += product.list_price or 0.0

        return {
            'valid': True,
            'total_price': total_price,
        }

    def _create_lead(self, payload):
        pack_id = payload.get('pack_id')
        selections = payload.get('selections', {})
        selected_product = payload.get('selected_product', {})
        contact = payload.get('contact', {})

        if not contact.get('name') or not contact.get('email'):
            return {'error': 'Nombre y email son requeridos'}

        pack = request.env['product.template'].sudo().browse(pack_id)

        partner = self._create_or_get_partner(
            contact.get('email'),
            contact.get('name'),
            contact.get('phone')
        )

        contact_msg = (contact.get('message') or '').strip()
        description = self._build_description(pack, selections, selected_product, contact_msg)

        lead = request.env['crm.lead'].sudo().create({
            'name': f'Presupuesto {pack.name if pack.exists() else "Pack"} - {contact.get("name")}',
            'partner_id': partner.id,
            'email_from': contact.get('email'),
            'phone': contact.get('phone'),
            'description': description,
            'team_id': self._get_sales_team(),
            'user_id': request.env.ref('base.user_admin').id,
        })

        sale_order = request.env['sale.order'].sudo().create({
            'partner_id': partner.id,
            'opportunity_id': lead.id,
            'origin': lead.name,
        })

        for line in self._get_labour_lines(pack_id):
            request.env['sale.order.line'].sudo().create({
                'order_id': sale_order.id,
                'product_id': line['variant'].id,
                'product_uom_qty': line['quantity'],
                'price_unit': line['unit_price'],
                'name': line['name'],
            })

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

        return {
            'lead_id': lead.id,
            'sale_order_id': sale_order.id,
            'status': 'created',
        }

    # ============================================
    # MÉTODOS AUXILIARES
    # ============================================

    def _get_xml_name(self, record):
        """Nombre del XML ID sin prefijo de módulo ('selector_packs.plato_nature' -> 'plato_nature')"""
        return (record.get_external_id().get(record.id) or '').split('.')[-1]

    def _get_labour_lines(self, pack_id):
        """Líneas de mano de obra del pack con precio unitario y subtotal (precio * cantidad)"""
        lines = []
        labour_items = request.env['pack.products'].sudo().search([
            ('product_tmpl_id', '=', pack_id),
            ('is_labour', '=', True)
        ])
        for lp in labour_items:
            template = lp.base_product_id
            variant = template.product_variant_ids[:1]
            if not variant:
                continue
            quantity = lp.quantity or 1
            unit_price = variant.lst_price or 0.0
            lines.append({
                'name': template.name,
                'base_product_id': template.id,
                'variant': variant,
                'quantity': quantity,
                'unit_price': unit_price,
                'subtotal': unit_price * quantity,
            })
        return lines

    def _get_pack_products(self, pack_id):
        pack = request.env['product.template'].sudo().browse(pack_id)

        if not pack.exists():
            return []

        pack_products = request.env['pack.products'].sudo().search([
            ('product_tmpl_id', '=', pack_id),
            ('is_labour', '=', False)
        ])

        pack_key = self._get_xml_name(pack)

        preselected_products = {
            'pack_reforma_basic_plus': ['grifo_star', 'azulejo_30x60_brillo'],
            'pack_reforma_integral_basic': ['grifo_kappa', 'mueble_sansa', 'azulejo_30x60_brillo'],
        }
        pack_preselected = preselected_products.get(pack_key, [])

        products = []
        for pp in pack_products:
            base_product = pp.base_product_id

            image_url = False
            if base_product.image_1024:
                image_url = f'/homeglass/image/{base_product.id}/image_1024'

            category = self._get_product_category(base_product)

            product_key = self._get_xml_name(base_product)
            is_preselected = product_key in pack_preselected

            products.append({
                'id': pp.id,
                'name': base_product.name,
                'base_product_id': base_product.id,
                'category': category,
                'price': base_product.list_price or 0.0,
                'image': image_url,
                'is_preselected': is_preselected,
            })

        return products

    def _get_product_category(self, product):
        product_name_lower = product.name.lower()

        if 'plato' in product_name_lower:
            return 'plato'
        elif 'mampara' in product_name_lower:
            return 'mampara'
        elif 'grifo' in product_name_lower or 'columna' in product_name_lower:
            return 'grifo'
        elif 'azulejo' in product_name_lower or 'revestimiento' in product_name_lower:
            return 'azulejo'
        elif 'mueble' in product_name_lower:
            return 'mueble'
        elif 'inodoro' in product_name_lower or 'sanitario' in product_name_lower:
            return 'sanitario'
        else:
            return 'otro'

    def _get_categories_mapping(self):
        return {
            'plato': 'Plato de Ducha',
            'mampara': 'Mampara',
            'grifo': 'Grifo',
            'azulejo': 'Azulejos',
            'mueble': 'Mueble de Baño',
            'sanitario': 'Sanitario',
        }

    def _get_pack_categories(self, pack_id):
        products = self._get_pack_products(pack_id)
        if not products:
            return []

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
                    'name': self._get_categories_mapping().get(cat_key, cat_key),
                    'products': grouped[cat_key],
                    'single_product': len(grouped[cat_key]) == 1,
                })

        return steps

    def _filter_attributes_by_pack(self, pack_id, product_tmpl_id, attribute, values):
        pack = request.env['product.template'].sudo().browse(pack_id)
        if not pack.exists():
            return values

        pack_key = self._get_xml_name(pack)

        product = request.env['product.template'].sudo().browse(product_tmpl_id)
        product_key = self._get_xml_name(product)

        color_restrictions = {
            'pack_reforma_basic': {
                'plato_nature': ['Blanco'],
                'mampara_a20': ['Blanco'],
            },
            'pack_reforma_basic_plus': {
                'plato_nature': ['Blanco', 'Gris Cemento', 'Gris Antracita'],
                'mampara_a20': ['Blanco', 'Negro', 'Aluminio Brillo'],
            },
            'pack_reforma_integral_basic': {
                'plato_nature': ['Blanco', 'Gris Cemento', 'Gris Antracita'],
                'mampara_a40': ['Blanco', 'Negro', 'Aluminio Brillo'],
            },
            'pack_reforma_integral_premium': {},
        }

        vidrio_restrictions = {
            'pack_reforma_basic': {
                'mampara_a20': ['Transparente'],
            },
            'pack_reforma_basic_plus': {
                'mampara_a20': ['Transparente'],
            },
            'pack_reforma_integral_basic': {
                'mampara_a40': ['Transparente'],
            },
            'pack_reforma_integral_premium': {},
        }

        azulejo_restrictions = {
            'pack_reforma_basic': {
                'all': ['Blanco Brillo', 'Blanco Mate'],
            },
            'pack_reforma_basic_plus': {
                'all': ['Blanco Brillo', 'Blanco Mate'],
            },
            'pack_reforma_integral_basic': {
                'all': ['Blanco Brillo', 'Blanco Mate'],
            },
            'pack_reforma_integral_premium': {},
        }

        attr_name_lower = attribute.name.lower()

        if 'color' in attr_name_lower:
            restrictions = color_restrictions.get(pack_key, {})
            allowed_colors = restrictions.get(product_key, None)
            if allowed_colors is not None:
                return values.filtered(lambda v: v.name in allowed_colors)

        if 'vidrio' in attr_name_lower:
            restrictions = vidrio_restrictions.get(pack_key, {})
            allowed_vidrio = restrictions.get(product_key, None)
            if allowed_vidrio is not None:
                return values.filtered(lambda v: v.name in allowed_vidrio)

        if 'acabado' in attr_name_lower:
            category = self._get_product_category(product)
            if category == 'azulejo':
                restrictions = azulejo_restrictions.get(pack_key, {})
                allowed_azulejos = restrictions.get('all', None)
                if allowed_azulejos is not None:
                    return values.filtered(lambda v: v.name in allowed_azulejos)

        return values

    def _is_product_preselected(self, pack_id, product_tmpl_id):
        pack = request.env['product.template'].sudo().browse(pack_id)
        if not pack.exists():
            return False

        pack_key = self._get_xml_name(pack)

        product = request.env['product.template'].sudo().browse(product_tmpl_id)
        product_key = self._get_xml_name(product)

        preselected_products = {
            'pack_reforma_basic_plus': {
                'grifo_star': True,
                'azulejo_30x60_brillo': True,
            },
            'pack_reforma_integral_basic': {
                'grifo_kappa': True,
                'mueble_sansa': True,
                'azulejo_30x60_brillo': True,
            },
        }

        pack_preselected = preselected_products.get(pack_key, {})
        return pack_preselected.get(product_key, False)

    def _get_preselected_values(self, pack_id, product_tmpl_id, product):
        pack = request.env['product.template'].sudo().browse(pack_id)
        if not pack.exists():
            return {}

        pack_key = self._get_xml_name(pack)
        product_key = self._get_xml_name(product)

        preselected_values = {}

        if pack_key == 'pack_reforma_integral_basic':
            if product_key == 'mueble_sansa':
                modelo_attr = request.env['product.attribute'].sudo().search([
                    ('name', '=', 'Modelo')
                ], limit=1)
                if modelo_attr:
                    modelo_value = request.env['product.attribute.value'].sudo().search([
                        ('attribute_id', '=', modelo_attr.id),
                        ('name', '=', 'Set 80 1C')
                    ], limit=1)
                    if modelo_value:
                        preselected_values['Modelo'] = modelo_value.id

                tipo_attr = request.env['product.attribute'].sudo().search([
                    ('name', '=', 'Tipo')
                ], limit=1)
                if tipo_attr:
                    tipo_value = request.env['product.attribute.value'].sudo().search([
                        ('attribute_id', '=', tipo_attr.id),
                        ('name', 'ilike', 'Integrado')
                    ], limit=1)
                    if tipo_value:
                        preselected_values['Tipo'] = tipo_value.id

        # Solo valores que el producto tiene de verdad: una preselección que no existe
        # en el producto se ignora en vez de dejar una selección inválida
        product_value_ids = set(product.attribute_line_ids.mapped('value_ids').ids)
        return {
            attr_name: value_id
            for attr_name, value_id in preselected_values.items()
            if value_id in product_value_ids
        }

    def _get_attribute_dependency(self, attr_name):
        if attr_name == 'Modelo':
            return None
        elif attr_name == 'Acabado':
            return 'Modelo'
        elif attr_name == 'Tipo':
            return 'Acabado'
        return None

    def _get_attribute_order(self, attr_name):
        order_map = {
            'Modelo': 1,
            'Acabado': 2,
            'Tipo': 3,
            'Color': 1,
            'Ancho': 2,
            'Largo': 3,
            'Vidrio': 2,
            'Medida': 3,
        }
        return order_map.get(attr_name, 999)

    def _create_or_get_partner(self, email, name, phone):
        existing_partner = request.env['res.partner'].sudo().search([
            ('email', '=', email)
        ], limit=1)

        if existing_partner:
            existing_partner.write({
                'name': name,
                'phone': phone,
            })
            return existing_partner

        partner = request.env['res.partner'].sudo().create({
            'name': name,
            'email': email,
            'phone': phone,
        })

        return partner

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

    def _get_sales_team(self):
        team = request.env['crm.team'].sudo().search([], limit=1)
        return team.id if team else False

    # ============================================
    # RUTA PARA GENERAR PDF DEL PRESUPUESTO
    # ============================================

    @http.route('/print/presupuesto/<int:sale_order_id>', type='http', auth='public', methods=['GET'])
    def print_presupuesto(self, sale_order_id):
        order = request.env['sale.order'].sudo().browse(sale_order_id)
        if not order.exists():
            return request.not_found()

        report = request.env.ref('selector_packs.action_report_presupuesto').sudo()
        pdf_content, _ = report.sudo()._render_qweb_pdf(order.ids)

        pdfheaders = [
            ('Content-Type', 'application/pdf'),
            ('Content-Length', len(pdf_content)),
            ('Content-Disposition', f'attachment; filename="Presupuesto_{order.name}.pdf"'),
        ]
        return request.make_response(pdf_content, headers=pdfheaders)

    def _build_description(self, pack, selections, selected_product, contact_msg=''):
        description = f"<b>PRESUPUESTO - {html_escape(pack.name or '')}</b><br/><br/>"
        description += "<b>SELECCIONES:</b><br/>"
        description += "<ul>"

        for product_tmpl_id in selected_product.values():
            product_tmpl_id = int(product_tmpl_id)
            product = request.env['product.template'].sudo().browse(product_tmpl_id)
            if not product.exists():
                continue

            selection_data = selections.get(str(product_tmpl_id), {})
            line = f"<li><b>{html_escape(product.name)}</b>: "

            if isinstance(selection_data, dict):
                attrs = []
                for attr_name, attr_value in selection_data.items():
                    if attr_value:
                        attr_val = request.env['product.attribute.value'].sudo().browse(attr_value)
                        if attr_val.exists():
                            attrs.append(attr_val.name)
                line += f"{html_escape(', '.join(attrs))}" if attrs else 'Sin seleccionar'
            else:
                line += 'Sin variantes'

            variant = self._resolve_variant(product, selection_data)
            price = variant.lst_price if variant else product.list_price
            line += f" - {price or 0:.2f}€</li>"
            description += line

        description += "</ul>"

        total_price = sum(
            self._resolve_variant(
                request.env['product.template'].sudo().browse(int(pid)),
                selections.get(str(pid), {})
            ).lst_price or 0
            for pid in selected_product.values()
            if request.env['product.template'].sudo().browse(int(pid)).exists()
        )

        total_price += sum(line['subtotal'] for line in self._get_labour_lines(pack.id))

        description += f"<b>PRECIO ESTIMADO: {total_price:.2f}€ (sin IVA)</b>"

        if contact_msg:
            description += f"<br/><br/><b>MENSAJE CLIENTE:</b><br/>{plaintext2html(contact_msg)}"

        return description