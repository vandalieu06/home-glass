// Home Glass - Selector de Packs de Reforma
// Sistema Step-by-Step para selección de variantes

(function() {
    'use strict';

    // ============================================
    // CONSTANTES
    // ============================================
    const STORAGE_KEY = "hg_selector_state";
    const SESSION_KEY = "hg_selector_session";
    const API_TIMEOUT = 15000;
    const DEBUG = true;

    // Placeholder por defecto
    const DEFAULT_PLACEHOLDER = "https://placehold.co/600x400?text=Producto";

    // ============================================
    // ESTADO
    // ============================================
    let state = {
        pack_id: null,
        pack_name: '',
        current_step: 1,
        total_steps: 0,
        steps: [],
        products: [],
        selected_product: {},
        product_detail_mode: {},
        selections: {},
        contact: {
            name: '',
            email: '',
            phone: '',
            message: ''
        },
        errors: {},
        lead_id: null,
        sale_order_id: null,
        is_loading: false,
    };

    // Cache para atributos y variantes
    let attributesCache = {};
    let variantsCache = {};
    let productAttributesCache = {};

    // ============================================
    // UTILIDADES
    // ============================================
    function log(msg, data) {
        if (DEBUG) {
            console.log(`[HG Selector] ${msg}`, data || '');
        }
    }

    function escapeHtml(str) {
        if (str == null) return '';
        const s = String(str);
        return s.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function escapeAttr(str) {
        if (str == null) return '';
        return String(str).replace(/["'&<>`]/g, "");
    }

    function parseNumber(val, fallback = 0) {
        const n = parseFloat(val);
        return isNaN(n) ? fallback : n;
    }

    function showError(message) {
        alert(message);
    }

    function showLoading(container, message = 'Cargando...') {
        if (container) {
            container.innerHTML = `<div class="hg-loading"><i class="fa fa-spinner fa-spin"></i> ${escapeHtml(message)}</div>`;
        }
    }

    // ============================================
    // GESTIÓN DE ESTADO
    // ============================================
    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
            log('State saved', state);
        } catch (e) {
            log('Error saving state', e);
        }
    }

    function loadState() {
        let data = localStorage.getItem(STORAGE_KEY);
        if (!data) {
            data = sessionStorage.getItem(SESSION_KEY);
        }
        if (data) {
            try {
                const parsed = JSON.parse(data);
                state = { ...state, ...parsed };
                log('State loaded', state);
            } catch (e) {
                log('Error loading state', e);
            }
        }
    }

    function clearState() {
        state = {
            pack_id: null,
            pack_name: '',
            current_step: 1,
            total_steps: 0,
            steps: [],
            products: [],
            selected_product: {},
            product_detail_mode: {},
            selections: {},
            contact: { name: '', email: '', phone: '', message: '' },
            errors: {},
            lead_id: null,
            sale_order_id: null,
            is_loading: false,
        };
        productAttributesCache = {};
        localStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(SESSION_KEY);
        log('State cleared');
    }

    // ============================================
    // HELPERS DE ESTADO (Fase 3)
    // ============================================

    function getCurrentCategoryStep() {
        if (state.current_step <= state.steps.length) {
            return state.steps[state.current_step - 1];
        }
        return null;
    }

    function getSelectedProductInCategory(categoryKey) {
        const productId = state.selected_product[categoryKey];
        if (!productId) return null;
        const step = state.steps.find(s => s.key === categoryKey);
        if (!step) return null;
        return step.products.find(p => p.base_product_id === productId) || null;
    }

    function getCategoryByProductId(productId) {
        for (const step of state.steps) {
            const found = step.products.find(p => p.base_product_id === productId);
            if (found) return step;
        }
        return null;
    }

    function loadCategoryProductsFromApi(categoryKey) {
        if (productAttributesCache[categoryKey]) {
            return Promise.resolve(productAttributesCache[categoryKey]);
        }
        return api('get_category_products', {
            pack_id: state.pack_id,
            category_key: categoryKey,
        }).then(data => {
            if (data && !data.error) {
                productAttributesCache[categoryKey] = data;
                return data;
            }
            return [];
        }).catch(err => {
            log(`Error loading category ${categoryKey}`, err);
            return [];
        });
    }

    // ============================================
    // API
    // ============================================
    function api(action, payload = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

        log(`API call: ${action}`, payload);

        const jsonrpcBody = {
            jsonrpc: '2.0',
            method: 'call',
            params: { action, ...payload },
            id: Math.floor(Math.random() * 1000000),
        };

        return fetch('/homeglass/selector/api', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify(jsonrpcBody),
            signal: controller.signal,
        })
        .then(r => r.json())
        .then(res => {
            logApi(action, payload, res);
            if (res.error) {
                throw new Error(res.error.message || res.error.data?.debug || 'Unknown error');
            }
            let result = res.result;
            if (result && result.result) {
                result = result.result;
            }
            return result;
        })
        .catch(err => {
            log(`API Error: ${action}`, err);
            if (err.name === 'AbortError') {
                showError('Tiempo de espera agotado. Intenta de nuevo.');
            } else {
                showError('Error de conexión. Intenta de nuevo.');
            }
            throw err;
        })
        .finally(() => clearTimeout(timeoutId));
    }

    function logApi(action, payload, response) {
        log(`API ${action}`, { payload, response });
    }

    // ============================================
    // RENDERIZADO PRINCIPAL
    // ============================================
    function render() {
        log('Rendering step', { step: state.current_step });
        renderStepper();
        renderContent();
    }

    function renderStepper() {
        const container = document.getElementById('hg-stepper-content');
        if (!container) return;

        const steps = [
            ...state.steps.map((s, i) => ({ index: i + 1, name: s.name })),
            { index: state.steps.length + 1, name: 'Resumen' },
            { index: state.steps.length + 2, name: 'Contacto' },
        ];

        container.innerHTML = `<div class="hg-stepper-content-inner">${steps.map((s) => {
            const stepNum = s.index;
            const isActive = state.current_step === stepNum;
            const isCompleted = state.current_step > stepNum;
            const isDisabled = !canGoToStep(stepNum);

            return `
                <div class="hg-stepper-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isDisabled ? 'disabled' : ''}"
                     data-step="${stepNum}"
                     onclick="goToStep(${stepNum})">
                    <div class="hg-stepper-number">
                        ${isCompleted ? '<i class="fa fa-check"></i>' : stepNum}
                    </div>
                    <div class="hg-stepper-name">${escapeHtml(s.name)}</div>
                </div>
            `;
        }).join('')}</div>`;

        log('Stepper rendered', { currentStep: state.current_step });
    }

    function renderContent() {
        const container = document.getElementById('hg-content');
        if (!container) return;

        if (state.current_step <= state.steps.length) {
            const step = getCurrentCategoryStep();
            if (step) {
                renderCategoryStep(step, container);
            }
        } else if (state.current_step === state.steps.length + 1) {
            renderSummary(container);
        } else if (state.current_step === state.steps.length + 2) {
            renderContactForm(container);
        } else if (state.current_step === state.steps.length + 3) {
            renderSuccess(container);
        }
    }

    // ============================================
    // RENDERIZADO DE PASOS (Fase 4 - Por Categoría)
    // ============================================

    function renderCategoryStep(step, container) {
        showLoading(container, 'Cargando opciones...');

        loadCategoryProductsFromApi(step.key).then(categoryProducts => {
            const selectedId = state.selected_product[step.key];

            if (step.single_product) {
                renderSingleProductInCategory(step, categoryProducts, selectedId, container);
            } else {
                renderProductGridInCategory(step, categoryProducts, selectedId, container);
            }
        }).catch(err => {
            showError('Error al cargar productos de la categoría');
            log('Error loading category', err);
        });
    }

    function renderSingleProductInCategory(step, categoryProducts, selectedId, container) {
        const product = categoryProducts[0];
        if (!product) {
            container.innerHTML = `<div class="hg-empty-category"><p>No hay productos disponibles en esta categoría.</p></div>`;
            return;
        }

        const productId = product.base_product_id;
        if (!selectedId) {
            state.selected_product[step.key] = productId;
        }

        const selection = state.selections[productId] || {};
        const attributes = product.attributes || [];
        const isPreselected = product.is_preselected || false;

        if (isPreselected && product.preselected_values && Object.keys(product.preselected_values).length > 0) {
            Object.entries(product.preselected_values).forEach(([attrName, valueId]) => {
                if (!selection[attrName]) {
                    selectAttribute(product.base_product_id, attrName, valueId);
                }
            });
        }

        container.innerHTML = `
            <div class="hg-category-step">
                <div class="hg-category-header">
                    <h2>${escapeHtml(step.name)}</h2>
                </div>

                <div class="hg-product-card">
                    <div class="hg-product-image">
                        <img src="${product.image || DEFAULT_PLACEHOLDER}"
                             alt="${escapeHtml(product.name)}"
                             onerror="this.src='${DEFAULT_PLACEHOLDER}'"/>
                    </div>
                    <div class="hg-product-info">
                        <h3>${escapeHtml(product.name)}</h3>
                        <p class="hg-product-price">${parseNumber(product.price).toFixed(2)}€</p>
                    </div>
                </div>

                ${isPreselected ? renderPreselectedInfo(product, product) : ''}

                <div class="hg-attributes">
                    ${attributes.length === 0 ?
                        '<div class="hg-no-variants"><p>Este producto no tiene variantes configuradas.</p></div>' :
                        renderAttributesCascade(productId, attributes, selection, step.key)
                    }
                </div>

                <div class="hg-actions">
                    <button class="hg-btn hg-btn-secondary" onclick="prevStep()">Atrás</button>
                    <button class="hg-btn hg-btn-primary" onclick="nextStep()">Siguiente</button>
                </div>
            </div>
        `;
    }

    function renderProductGridInCategory(step, categoryProducts, selectedId, container) {
        const inDetailMode = state.product_detail_mode && state.product_detail_mode[step.key];

        if (inDetailMode && selectedId) {
            const selectedProduct = categoryProducts.find(p => p.base_product_id === selectedId);
            if (!selectedProduct) {
                renderProductGridInCategory(step, categoryProducts, null, container);
                return;
            }

            const selection = state.selections[selectedId] || {};
            const attributes = selectedProduct.attributes || [];

            if (selectedProduct.is_preselected && selectedProduct.preselected_values && Object.keys(selectedProduct.preselected_values).length > 0) {
                Object.entries(selectedProduct.preselected_values).forEach(([attrName, valueId]) => {
                    if (!selection[attrName]) {
                        selectAttribute(selectedProduct.base_product_id, attrName, valueId);
                    }
                });
            }

            container.innerHTML = `
                <div class="hg-category-step">
                    <div class="hg-category-header">
                        <h2>${escapeHtml(step.name)}</h2>
                    </div>

                    <div class="hg-back-to-grid">
                        <a href="#" onclick="showProductGrid('${escapeAttr(step.key)}'); return false;">
                            ← Cambiar producto
                        </a>
                    </div>

                    <div class="hg-product-card">
                        <div class="hg-product-image">
                            <img src="${selectedProduct.image || DEFAULT_PLACEHOLDER}"
                                 alt="${escapeHtml(selectedProduct.name)}"
                                 onerror="this.src='${DEFAULT_PLACEHOLDER}'"/>
                        </div>
                        <div class="hg-product-info">
                            <h3>${escapeHtml(selectedProduct.name)}</h3>
                            <p class="hg-product-price">${parseNumber(selectedProduct.price).toFixed(2)}€</p>
                        </div>
                    </div>

                    ${selectedProduct.is_preselected ? renderPreselectedInfo(selectedProduct, selectedProduct) : ''}

                    <div class="hg-attributes">
                        ${attributes.length === 0 ?
                            '<div class="hg-no-variants"><p>Este producto no tiene variantes configuradas.</p></div>' :
                            renderAttributesCascade(selectedId, attributes, selection, step.key)
                        }
                    </div>

                    <div class="hg-actions">
                        <button class="hg-btn hg-btn-secondary" onclick="prevStep()">Atrás</button>
                        <button class="hg-btn hg-btn-primary" onclick="nextStep()">Siguiente</button>
                    </div>
                </div>
            `;
            return;
        }

        let html = `
            <div class="hg-category-step">
                <div class="hg-category-header">
                    <h2>${escapeHtml(step.name)}</h2>
                    <p class="text-muted">Elige el producto que prefieras</p>
                </div>
                <div class="hg-product-grid">
        `;

        categoryProducts.forEach(product => {
            const productId = product.base_product_id;
            const isSelected = selectedId === productId;
            html += `
                <div class="hg-product-grid-item ${isSelected ? 'selected' : ''}"
                     onclick="selectProductInCategory('${escapeAttr(step.key)}', ${productId})">
                    <div class="hg-grid-image">
                        <img src="${product.image || DEFAULT_PLACEHOLDER}"
                             alt="${escapeHtml(product.name)}"
                             onerror="this.src='${DEFAULT_PLACEHOLDER}'"/>
                    </div>
                    <div class="hg-grid-info">
                        <h4>${escapeHtml(product.name)}</h4>
                        <span class="hg-grid-price">${parseNumber(product.price).toFixed(2)}€</span>
                    </div>
                    ${isSelected ? '<div class="hg-grid-check"><i class="fa fa-check-circle"></i></div>' : ''}
                </div>
            `;
        });

        html += `
                </div>
                <div class="hg-actions">
                    <button class="hg-btn hg-btn-secondary" onclick="prevStep()">Atrás</button>
                    <button class="hg-btn hg-btn-primary" onclick="nextStep()">Siguiente</button>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    function renderPreselectedInfo(product, data) {
        const preselectedNames = [];
        if (data.preselected_values) {
            for (const [attrName, valueId] of Object.entries(data.preselected_values)) {
                const attr = data.attributes.find(a => a.name === attrName);
                if (attr) {
                    const value = attr.values.find(v => v.id === valueId);
                    if (value) {
                        preselectedNames.push(value.name);
                    }
                }
            }
        }

        if (preselectedNames.length === 0) return '';

        return `
            <div class="hg-preselected-info">
                <i class="fa fa-check-circle"></i>
                <span>Incluye: ${preselectedNames.join(' + ')}</span>
            </div>
        `;
    }

    function renderAttributesCascade(productId, attributes, selection, category) {
        if (category !== 'mueble') {
            return attributes.map(attr => renderAttributeSelector(productId, attr, selection)).join('');
        }

        const sortedAttrs = [...attributes].sort((a, b) => (a.order || 999) - (b.order || 999));

        const rendered = [];
        const selectionCopy = { ...selection };

        for (const attr of sortedAttrs) {
            const dependsOn = attr.depends_on;

            if (dependsOn && !selectionCopy[dependsOn]) {
                continue;
            }

            rendered.push(renderAttributeSelector(productId, attr, selectionCopy));

            const selectedValueId = selectionCopy[attr.name];
            if (selectedValueId) {
                const selectedValue = attr.values.find(v => v.id === selectedValueId);
                if (selectedValue) {
                    selectionCopy[attr.name] = selectedValueId;
                }
            }
        }

        return rendered.join('');
    }

    function renderAttributeSelector(productId, attribute, selection) {
        const selectedValue = selection[attribute.name] || attribute.default_value || null;
        const values = attribute.values || [];

        if (values.length === 0) return '';

        const isDisabled = attribute.depends_on && !selection[attribute.depends_on];

        return `
            <div class="hg-attribute ${isDisabled ? 'hg-attribute-disabled' : ''}">
                <label class="hg-attribute-label">${escapeHtml(attribute.name)}${isDisabled ? ' <span class="text-muted">(selecciona primero ${attribute.depends_on})</span>' : ''}</label>
                <select class="hg-attribute-select"
                        onchange="selectAttribute('${escapeAttr(productId)}', '${escapeAttr(attribute.name)}', this.value)"
                        ${isDisabled ? 'disabled' : ''}>
                    <option value="">Seleccionar...</option>
                    ${values.map(v => `
                        <option value="${v.id}" ${selectedValue == v.id ? 'selected' : ''}>
                            ${escapeHtml(v.name)}
                        </option>
                    `).join('')}
                </select>
            </div>
        `;
    }

    function renderSummary(container) {
        let totalPrice = 0;
        let categoryRows = '';

        state.steps.forEach(step => {
            const selectedProductId = state.selected_product[step.key];
            if (!selectedProductId) return;

            const product = step.products.find(p => p.base_product_id === selectedProductId);
            if (!product) return;

            const selection = state.selections[selectedProductId];

            let variants = 'Sin variantes';
            if (selection) {
                const cached = productAttributesCache[step.key];
                if (cached && Array.isArray(cached)) {
                    const prodAttrs = cached.find(p => p.base_product_id === selectedProductId);
                    if (prodAttrs && prodAttrs.attributes) {
                        const parts = [];
                        for (const attr of prodAttrs.attributes) {
                            const valueId = selection[attr.name];
                            if (valueId) {
                                const value = attr.values.find(v => v.id === valueId);
                                if (value) parts.push(value.name);
                            }
                        }
                        variants = parts.length ? parts.join(', ') : 'Seleccionado';
                    }
                }
            }

            totalPrice += parseNumber(product.price);

            categoryRows += `
                <tr>
                    <td>${escapeHtml(step.name)}</td>
                    <td>
                        <div class="d-flex align-items-center">
                            <img src="${product.image || DEFAULT_PLACEHOLDER}"
                                 alt="${escapeHtml(product.name)}"
                                 class="hg-summary-img"
                                 onerror="this.src='${DEFAULT_PLACEHOLDER}'"/>
                            <span>${escapeHtml(product.name)}</span>
                        </div>
                    </td>
                    <td>${variants}</td>
                    <td>${parseNumber(product.price).toFixed(2)}€</td>
                </tr>
            `;
        });

        container.innerHTML = `
            <div class="hg-summary">
                <h2>Resumen de tu selección</h2>
                <p class="text-muted">Revisa los productos seleccionados antes de continuar</p>

                <div class="hg-summary-table">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Categoría</th>
                                <th>Producto</th>
                                <th>Selección</th>
                                <th>Precio</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${categoryRows}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="3"><strong>Total estimado</strong></td>
                                <td><strong>${totalPrice.toFixed(2)}€</strong></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div class="hg-actions">
                    <button class="hg-btn hg-btn-secondary" onclick="prevStep()">Atrás</button>
                    <button class="hg-btn hg-btn-primary" onclick="nextStep()">Continuar</button>
                </div>
            </div>
        `;
    }

    function renderContactForm(container) {
        const c = state.contact;

        container.innerHTML = `
            <div class="hg-contact">
                <h2>Solicita tu presupuesto</h2>
                <p class="text-muted">Completa tus datos para recibir el presupuesto</p>

                <form class="hg-contact-form" onsubmit="submitContact(event)">
                    <div class="hg-form-group">
                        <label for="contact-name">Nombre completo *</label>
                        <input type="text" id="contact-name" name="name" required
                               value="${escapeAttr(c.name)}"
                               placeholder="Tu nombre"/>
                    </div>

                    <div class="hg-form-group">
                        <label for="contact-email">Email *</label>
                        <input type="email" id="contact-email" name="email" required
                               value="${escapeAttr(c.email)}"
                               placeholder="tu@email.com"/>
                    </div>

                    <div class="hg-form-group">
                        <label for="contact-phone">Teléfono *</label>
                        <input type="tel" id="contact-phone" name="phone" required
                               value="${escapeAttr(c.phone)}"
                               placeholder="612 345 678"/>
                    </div>

                    <div class="hg-form-group">
                        <label for="contact-message">Mensaje adicional</label>
                        <textarea id="contact-message" name="message" rows="4"
                                  placeholder="Comentarios adicionales...">${escapeAttr(c.message)}</textarea>
                    </div>

                    <div class="hg-actions">
                        <button type="button" class="hg-btn hg-btn-secondary" onclick="prevStep()">Atrás</button>
                        <button type="submit" class="hg-btn hg-btn-primary">Solicitar Presupuesto</button>
                    </div>
                </form>
            </div>
        `;
    }

    function renderSuccess(container) {
        container.innerHTML = `
            <div class="hg-success">
                <div class="hg-success-icon">
                    <i class="fa fa-check-circle"></i>
                </div>
                <h2>¡Solicitud enviada!</h2>
                <p class="text-muted">Tu solicitud de presupuesto ha sido enviada correctamente.</p>
                <p class="hg-lead-id">Referencia: <strong>#${state.lead_id}</strong></p>
                <p>Nos pondremos en contacto contigo en breve.</p>

                <div class="hg-success-actions">
                    <button class="hg-btn hg-btn-secondary" onclick="downloadPresupuesto()">
                        <i class="fa fa-file-pdf-o"></i> Descargar Presupuesto PDF
                    </button>
                    <button class="hg-btn hg-btn-primary" onclick="startNewSelection()">
                        Nueva selección
                    </button>
                </div>
            </div>
        `;
    }

    // ============================================
    // INTERACCIÓN
    // ============================================
    function selectAttribute(productId, attributeName, valueId) {
        const intProductId = parseInt(productId);
        if (!state.selections[intProductId]) {
            state.selections[intProductId] = {};
        }
        state.selections[intProductId][attributeName] = valueId ? parseInt(valueId) : null;
        log('Attribute selected', { productId: intProductId, attributeName, valueId });
        saveState();

        const container = document.getElementById('hg-content');
        if (!container) return;

        const step = getCurrentCategoryStep();
        if (step) {
            renderCategoryStep(step, container);
        }
    }

    function selectProductInCategory(categoryKey, productId) {
        const intProductId = parseInt(productId);
        state.selected_product[categoryKey] = intProductId;
        state.product_detail_mode[categoryKey] = true;

        loadCategoryProductsFromApi(categoryKey).then(categoryProducts => {
            const product = categoryProducts.find(p => p.base_product_id === intProductId);
            if (product && product.preselected_values && Object.keys(product.preselected_values).length > 0) {
                const selection = state.selections[intProductId] || {};
                Object.entries(product.preselected_values).forEach(([attrName, valueId]) => {
                    if (!selection[attrName]) {
                        selectAttribute(intProductId, attrName, valueId);
                    }
                });
            }
        });

        saveState();

        const container = document.getElementById('hg-content');
        if (container) {
            const step = getCurrentCategoryStep();
            if (step) {
                renderCategoryStep(step, container);
            }
        }
    }

    function showProductGrid(categoryKey) {
        if (state.product_detail_mode) {
            state.product_detail_mode[categoryKey] = false;
        }
        saveState();
        const container = document.getElementById('hg-content');
        if (container) {
            const step = getCurrentCategoryStep();
            if (step) {
                renderCategoryStep(step, container);
            }
        }
    }

    function nextStep() {
        if (!validateCurrentStep()) {
            showError('Por favor, completa todas las opciones requeridas');
            return;
        }

        const from = state.current_step;
        state.current_step++;
        logStepChange(from, state.current_step);
        saveState();
        render();
    }

    function prevStep() {
        if (state.current_step > 1) {
            const from = state.current_step;
            state.current_step--;
            logStepChange(from, state.current_step);
            saveState();
            render();
        }
    }

    function goToStep(stepNum) {
        if (!canGoToStep(stepNum)) {
            log(`Cannot go to step ${stepNum}`);
            return;
        }
        const from = state.current_step;
        state.current_step = stepNum;
        logStepChange(from, stepNum);
        saveState();
        render();
    }

    function logStepChange(from, to) {
        log(`Step: ${from} → ${to}`, { step: state.current_step });
    }

    function canGoToStep(step) {
        if (step <= 0) return false;
        if (step > state.current_step + 1) return false;
        return true;
    }

    function validateCurrentStep() {
        if (state.current_step <= state.steps.length) {
            const step = getCurrentCategoryStep();
            if (!step) return false;

            const selectedProductId = state.selected_product[step.key];
            if (!selectedProductId) return false;

            if (step.key === 'azulejo') return true;

            const cached = productAttributesCache[step.key];
            if (cached && Array.isArray(cached)) {
                const prodAttrs = cached.find(p => p.base_product_id === selectedProductId);
                if (prodAttrs && prodAttrs.attributes && prodAttrs.attributes.length > 0) {
                    const selection = state.selections[selectedProductId];
                    if (!selection) return false;
                    for (const attr of prodAttrs.attributes) {
                        if (attr.depends_on && !selection[attr.depends_on]) continue;
                        if (!selection[attr.name]) return false;
                    }
                }
            }
            return true;
        }
        return true;
    }

    function submitContact(event) {
        event.preventDefault();

        const form = event.target;
        state.contact = {
            name: form.name.value,
            email: form.email.value,
            phone: form.phone.value,
            message: form.message.value,
        };

        saveState();

        state.is_loading = true;
        render();

        api('create_lead', {
            pack_id: state.pack_id,
            selections: state.selections,
            selected_product: state.selected_product,
            contact: state.contact,
        })
        .then(data => {
            if (data && data.error) {
                showError(data.error);
                state.is_loading = false;
                render();
                return;
            }

            state.lead_id = data.lead_id;
            state.sale_order_id = data.sale_order_id;
            state.current_step = state.total_steps + 3;
            saveState();
            render();
        })
        .catch(err => {
            showError('Error al enviar la solicitud');
            state.is_loading = false;
            render();
            log('Error submitting contact', err);
        });
    }

    function startNewSelection() {
        clearState();
        window.location.href = '/reformas/packs';
    }

    function downloadPresupuesto() {
        if (state.sale_order_id) {
            window.open('/print/presupuesto/' + state.sale_order_id, '_blank');
        }
    }

    // ============================================
    // INICIALIZACIÓN
    // ============================================
    function initApp() {
        const root = document.getElementById('hg-selector');
        if (!root) {
            log('Root element not found, waiting...');
            setTimeout(initApp, 200);
            return;
        }

        log('App initializing');

        loadState();

        const packId = root.dataset.packId;
        const packName = root.dataset.packName;
        const totalSteps = parseInt(root.dataset.totalSteps) || 0;

        // Si entramos a un pack diferente al guardado, empezamos de cero
        if (packId && state.pack_id && state.pack_id !== parseInt(packId)) {
            log('Pack changed, resetting state');
            clearState();
        }

        if (packId && !state.pack_id) {
            log('Loading from server data', { packId, packName, totalSteps });
            state.pack_id = parseInt(packId);
            state.pack_name = packName || '';
            state.total_steps = totalSteps;
        }

        // Cargar productos planos (compatibilidad con renderizado antiguo)
        const productsContainer = document.getElementById('hg-products-data');
        if (productsContainer && (!state.products || state.products.length === 0)) {
            const productItems = productsContainer.querySelectorAll('.hg-product-item');
            const flatProducts = [];
            productItems.forEach(item => {
                flatProducts.push({
                    base_product_id: parseInt(item.dataset.id),
                    name: item.dataset.name,
                    price: parseFloat(item.dataset.price) || 0,
                    image: item.dataset.image || '',
                    category: item.dataset.category || '',
                    is_preselected: item.dataset.preselected === 'true',
                });
            });
            state.products = flatProducts;
        }

        // Construir steps desde categories_data del servidor
        const categoriesContainer = document.getElementById('hg-categories-data');
        if (categoriesContainer && (!state.steps || state.steps.length === 0)) {
            const categoryItems = categoriesContainer.querySelectorAll('.hg-category-item');
            state.steps = [];
            categoryItems.forEach(item => {
                const key = item.dataset.key;
                const name = item.dataset.name;
                const single = item.dataset.single === 'True';
                const catProducts = state.products.filter(p => p.category === key);
                state.steps.push({
                    key: key,
                    name: name,
                    single_product: single,
                    products: catProducts,
                });
            });
            state.total_steps = state.steps.length;
        }

        if (!state.pack_id || state.products.length === 0) {
            log('No pack selected, resetting');
            clearState();
            window.location.href = '/reformas/packs';
            return;
        }

        if (state.current_step < 1) {
            state.current_step = 1;
        }

        // Auto-seleccionar productos en categorías con un solo producto
        state.steps.forEach(step => {
            if (step.single_product && step.products.length === 1) {
                state.selected_product[step.key] = step.products[0].base_product_id;
            }
        });

        log('App ready', {
            step: state.current_step,
            steps: state.steps.length,
            products: state.products.length,
            categories: state.steps.map(s => s.key),
        });
        render();
    }

    // Exponer funciones al window para onclick handlers
    window.selectAttribute = selectAttribute;
    window.selectProductInCategory = selectProductInCategory;
    window.showProductGrid = showProductGrid;
    window.nextStep = nextStep;
    window.prevStep = prevStep;
    window.goToStep = goToStep;
    window.submitContact = submitContact;
    window.startNewSelection = startNewSelection;
    window.downloadPresupuesto = downloadPresupuesto;

    // Iniciar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }

})();