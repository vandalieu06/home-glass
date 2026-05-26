# -*- coding: utf-8 -*-
###################################################################################
#
#    Cybrosys Technologies Pvt. Ltd.
#
#    Copyright (C) 2022-TODAY Cybrosys Technologies (<https://www.cybrosys.com>).
#    Author: Afras Habis (odoo@cybrosys.com)
#
#    This program is free software: you can modify
#    it under the terms of the GNU Affero General Public License (AGPL) as
#    published by the Free Software Foundation, either version 3 of the
#    License, or (at your option) any later version.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU Affero General Public License for more details.
#
#    You should have received a copy of the GNU Affero General Public License
#    along with this program.  If not, see <https://www.gnu.org/licenses/>.
#
###################################################################################

from odoo import api, fields, models, _
from odoo.exceptions import UserError, ValidationError


class PackProducts(models.Model):
    _name = 'pack.products'
    _rec_name = 'base_product_id'
    _description = 'Select Pack Products'

    is_labour = fields.Boolean(string='Mano de obra',
                                default=False,
                                help='If True, this product is labor and will be auto-added to the order (not shown on web)')
    product_id = fields.Many2one('product.product', string='Product (Variant)',
                                 domain=[('is_pack', '=', False)],
                                 help='Optional: Select specific variant for this pack line')
    product_tmpl_id = fields.Many2one('product.template', string='Pack Reference',
                                       help='Technical: Reference to the pack (inverse of One2many)')
    base_product_id = fields.Many2one('product.template', string='Base Product',
                                       domain=[('is_pack', '=', False)],
                                       required=True,
                                       help='The base product (template) included in this pack')
    price = fields.Float('Price', compute='compute_price', store=True)
    quantity = fields.Integer('Quantity', default=1)
    qty_available = fields.Float('Quantity Available', compute='compute_quantity_of_product', store=True,
                                 readonly=False)
    total_available_quantity = fields.Float('Total Quantity')

    @api.depends('product_id', 'base_product_id', 'total_available_quantity', 'quantity')
    def compute_quantity_of_product(self):
        for record in self:
            if not record.base_product_id:
                record.qty_available = False
                continue

            location_id = record.product_tmpl_id.pack_location_id if record.product_tmpl_id else False
            product_to_check = record.product_id or record.base_product_id.product_variant_ids[0] if record.base_product_id.product_variant_ids else False

            if not product_to_check:
                record.qty_available = False
                continue

            if location_id:
                stock_quant = self.env['stock.quant'].search(
                    [('product_id', '=', product_to_check.id), ('location_id', '=', location_id.id)])
                if stock_quant:
                    record.qty_available = stock_quant.quantity
                else:
                    record.qty_available = False
            else:
                record.qty_available = False

    @api.depends('product_id', 'base_product_id', 'quantity')
    def compute_price(self):
        for record in self:
            product_to_check = record.product_id or record.base_product_id.product_variant_ids[0] if record.base_product_id and record.base_product_id.product_variant_ids else False
            if product_to_check:
                record.price = product_to_check.lst_price * record.quantity
            else:
                record.price = 0

    @api.onchange('quantity')
    def set_price(self):
        product_to_check = self.product_id or self.base_product_id.product_variant_ids[0] if self.base_product_id and self.base_product_id.product_variant_ids else False
        if product_to_check:
            self.price = product_to_check.lst_price * self.quantity

    @api.constrains('quantity')
    def _check_positive_qty(self):
        if any([ml.quantity < 0 for ml in self]):
            raise ValidationError(_('You can not enter negative quantities.'))
