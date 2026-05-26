{
    'name': 'Home Glass Selector Packs',
    'version': '1.0',
    'depends': ['base', 'web', 'website', 'product', 'product_combo_pack', 'crm'],
    'author': 'GSATEK',
    'category': 'Customizations',
    'description': """
        Modulo personalizado para la gestion de packs de reformas
    """,
    'license': 'GPL-3',
    'data': [
        'data/01_atributos.xml',
        'data/02_mamparas.xml',
        'data/03_platos_ducha.xml',
        'data/04_muebles_bano_fase1.xml',
        'data/05_productos_simples.xml',
        'data/06_pack_reforma.xml',
        'views/templates.xml',
        'views/website_pages.xml',
        'views/report_views.xml',
    ],
    'assets': {
        'web.assets_frontend': [
            'selector_packs/static/src/css/selector.css',
            'selector_packs/static/src/js/selector.js',
        ],
    },
}
