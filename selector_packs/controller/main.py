from odoo import http
from odoo.http import request


class PackController(http.Controller):
    @http.route('/reformas/packs', type='http', auth='public', website=True)
    def view_reformas_paks(self, pack, **kwargs):
        pass
