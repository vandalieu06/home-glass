from odoo import http
from odoo.http import request
from odoo.exceptions import UserError
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

        values = {
            'pack': pack,
            'products': products,
            'categories': categories,
            'categories_data': categories_data,
            'total_steps': len(categories_data),
        }
        return request.render('selector_packs.pack_selector', values)

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
                    'image': f'/web/image/product.template/{p.id}/image_1024',
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
            'image': f'/web/image/product.template/{product.id}/image_1024',
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
        contact = payload.get('contact', {})

        if not contact.get('name') or not contact.get('email'):
            return {'error': 'Nombre y email son requeridos'}

        pack = request.env['product.template'].sudo().browse(pack_id)

        partner = self._create_or_get_partner(
            contact.get('email'),
            contact.get('name'),
            contact.get('phone')
        )

        description = self._build_description(pack, selections)

        lead = request.env['crm.lead'].sudo().create({
            'name': f'Presupuesto {pack.name if pack.exists() else "Pack"} - {contact.get("name")}',
            'partner_id': partner.id,
            'email_from': contact.get('email'),
            'phone': contact.get('phone'),
            'description': description,
            'team_id': self._get_sales_team(),
            'user_id': request.env.ref('base.user_admin').id,
        })

        return {
            'lead_id': lead.id,
            'status': 'created',
        }

    # ============================================
    # MÉTODOS AUXILIARES
    # ============================================

    def _get_pack_products(self, pack_id):
        pack = request.env['product.template'].sudo().browse(pack_id)

        if not pack.exists():
            return []

        pack_products = request.env['pack.products'].sudo().search([
            ('product_tmpl_id', '=', pack_id)
        ])

        pack_ext_id = pack.get_external_id()
        pack_key = pack_ext_id.get(pack_id, '')

        preselected_products = {
            'pack_reforma_basic_plus': ['grifo_star', 'azulejo_30x60'],
            'pack_reforma_integral_basic': ['grifo_kappa', 'mueble_sansa', 'azulejo_30x60'],
        }
        pack_preselected = preselected_products.get(pack_key, [])

        products = []
        for pp in pack_products:
            base_product = pp.base_product_id

            image_url = False
            if base_product.image_1024:
                image_url = f'/web/image/product.template/{base_product.id}/image_1024'

            category = self._get_product_category(base_product)

            product_ext_id = base_product.get_external_id()
            product_key = product_ext_id.get(base_product.id, '')
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

        pack_ext_id = pack.get_external_id()
        pack_key = pack_ext_id.get(pack_id, '')

        product = request.env['product.template'].sudo().browse(product_tmpl_id)
        product_ext_id = product.get_external_id()
        product_key = product_ext_id.get(product_tmpl_id, '')

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

        pack_ext_id = pack.get_external_id()
        pack_key = pack_ext_id.get(pack_id, '')

        product = request.env['product.template'].sudo().browse(product_tmpl_id)
        product_ext_id = product.get_external_id()
        product_key = product_ext_id.get(product_tmpl_id, '')

        preselected_products = {
            'pack_reforma_basic_plus': {
                'grifo_star': True,
                'azulejo_30x60': True,
            },
            'pack_reforma_integral_basic': {
                'grifo_kappa': True,
                'mueble_sansa': True,
                'azulejo_30x60': True,
            },
        }

        pack_preselected = preselected_products.get(pack_key, {})
        return pack_preselected.get(product_key, False)

    def _get_preselected_values(self, pack_id, product_tmpl_id, product):
        pack = request.env['product.template'].sudo().browse(pack_id)
        if not pack.exists():
            return {}

        pack_ext_id = pack.get_external_id()
        pack_key = pack_ext_id.get(pack_id, '')

        product_ext_id = product.get_external_id()
        product_key = product_ext_id.get(product_tmpl_id, '')

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

        return preselected_values

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

    def _get_sales_team(self):
        team = request.env['crm.team'].sudo().search([], limit=1)
        return team.id if team else False

    def _build_description(self, pack, selections):
        description = f"PRESUPUESTO - {pack.name}\n\n"

        description += "SELECCIONES:\n"

        for product_id, selection_data in selections.items():
            if not selection_data:
                continue

            product = request.env['product.template'].sudo().browse(product_id)
            if not product.exists():
                continue

            description += f"\n- {product.name}: "

            if isinstance(selection_data, dict):
                attrs = []
                for attr_name, attr_value in selection_data.items():
                    if attr_value:
                        attr_val = request.env['product.attribute.value'].sudo().browse(attr_value)
                        if attr_val.exists():
                            attrs.append(attr_val.name)
                description += ', '.join(attrs) if attrs else 'Sin seleccionar'
            else:
                description += 'Sin variantes'

            description += f" - {product.list_price or 0:.2f}€"

        total_price = sum(
            request.env['product.template'].sudo().browse(pid).list_price or 0
            for pid in selections.keys()
            if request.env['product.template'].sudo().browse(pid).exists()
        )

        description += f"\n\nPRECIO ESTIMADO: {total_price:.2f}€ (sin IVA)"

        return description