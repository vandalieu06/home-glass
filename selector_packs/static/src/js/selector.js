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
        products: [],
        selections: {},
        contact: {
            name: '',
            email: '',
            phone: '',
            message: ''
        },
        errors: {},
        lead_id: null,
        is_loading: false,
    };

    // Cache para atributos y variantes
    let attributesCache = {};
    let variantsCache = {};

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
            products: [],
            selections: {},
            contact: { name: '', email: '', phone: '', message: '' },
            errors: {},
            lead_id: null,
            is_loading: false,
        };
        localStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(SESSION_KEY);
        log('State cleared');
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

        const steps = [];
        for (let i = 1; i <= state.total_steps; i++) {
            const product = state.products[i - 1];
            const stepName = product ? product.name : `Paso ${i}`;
            steps.push({ index: i, name: stepName });
        }

        steps.push({ index: state.total_steps + 1, name: 'Resumen' });
        steps.push({ index: state.total_steps + 2, name: 'Contacto' });

        container.innerHTML = steps.map((s, i) => {
            const stepNum = i + 1;
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
        }).join('');

        log('Stepper rendered', { currentStep: state.current_step });
    }

    function renderContent() {
        const container = document.getElementById('hg-content');
        if (!container) return;

        if (state.current_step <= state.total_steps) {
            const productIndex = state.current_step - 1;
            const product = state.products[productIndex];
            renderProductStep(product, productIndex, container);
        } else if (state.current_step === state.total_steps + 1) {
            renderSummary(container);
        } else if (state.current_step === state.total_steps + 2) {
            renderContactForm(container);
        } else if (state.current_step === state.total_steps + 3) {
            renderSuccess(container);
        }
    }

    // ============================================
    // RENDERIZADO DE PASOS
    // ============================================
    function renderProductStep(product, index, container) {
        if (!product) return;

        showLoading(container, 'Cargando opciones...');

        api('get_product_attributes', { product_tmpl_id: product.base_product_id })
            .then(data => {
                if (data && data.error) {
                    showError(data.error);
                    return;
                }

                const selection = state.selections[product.base_product_id] || {};
                const attributes = data.attributes || [];

                container.innerHTML = `
                    <div class="hg-product-step">
                        <div class="hg-product-header">
                            <h2>${escapeHtml(product.name)}</h2>
                            <p class="text-muted">Selecciona las opciones disponibles</p>
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

                        <div class="hg-attributes">
                            ${attributes.length === 0 ?
                                '<div class="hg-no-variants"><p>Este producto no tiene variantes configuradas.</p></div>' :
                                attributes.map(attr => renderAttributeSelector(product.base_product_id, attr, selection)).join('')
                            }
                        </div>

                        <div class="hg-actions">
                            <button class="hg-btn hg-btn-secondary" onclick="prevStep()">Atrás</button>
                            <button class="hg-btn hg-btn-primary" onclick="nextStep()">Siguiente</button>
                        </div>
                    </div>
                `;
            })
            .catch(err => {
                showError('Error al cargar atributos');
                log('Error loading attributes', err);
            });
    }

    function renderAttributeSelector(productId, attribute, selection) {
        const selectedValue = selection[attribute.name] || null;
        const values = attribute.values || [];

        if (values.length === 0) return '';

        return `
            <div class="hg-attribute">
                <label class="hg-attribute-label">${escapeHtml(attribute.name)}</label>
                <select class="hg-attribute-select"
                        onchange="selectAttribute('${escapeAttr(productId)}', '${escapeAttr(attribute.name)}', this.value)">
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
        const selectionsList = [];

        state.products.forEach(product => {
            const selection = state.selections[product.base_product_id];
            if (selection) {
                selectionsList.push({
                    product: product,
                    selection: selection,
                });
            }
        });

        let totalPrice = 0;
        state.products.forEach(p => {
            totalPrice += parseNumber(p.price);
        });

        container.innerHTML = `
            <div class="hg-summary">
                <h2>Resumen de tu selección</h2>
                <p class="text-muted">Revisa los productos seleccionados antes de continuar</p>

                <div class="hg-summary-table">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Selección</th>
                                <th>Precio</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${state.products.map(p => {
                                const sel = state.selections[p.base_product_id];
                                const variants = sel ? Object.entries(sel).map(([k, v]) => v).join(', ') : 'Sin seleccionar';
                                return `
                                    <tr>
                                        <td>
                                            <div class="d-flex align-items-center">
                                                <img src="${p.image || DEFAULT_PLACEHOLDER}"
                                                     alt="${escapeHtml(p.name)}"
                                                     class="hg-summary-img"
                                                     onerror="this.src='${DEFAULT_PLACEHOLDER}'"/>
                                                <span>${escapeHtml(p.name)}</span>
                                            </div>
                                        </td>
                                        <td>${variants}</td>
                                        <td>${parseNumber(p.price).toFixed(2)}€</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="2"><strong>Total estimado</strong></td>
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

                <button class="hg-btn hg-btn-primary" onclick="startNewSelection()">
                    Nueva selección
                </button>
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
        if (state.current_step <= state.total_steps) {
            const productIndex = state.current_step - 1;
            const product = state.products[productIndex];
            const selection = state.selections[product.base_product_id];
            const productCategory = product.category || '';

            if (productCategory === 'azulejo') {
                return true;
            }

            if (!selection || Object.keys(selection).length === 0) {
                return false;
            }
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

        if (packId && !state.pack_id) {
            log('Loading from server data', { packId, packName, totalSteps });
            state.pack_id = parseInt(packId);
            state.pack_name = packName || '';
            state.total_steps = totalSteps;
        }

        const productsContainer = document.getElementById('hg-products-data');
        if (productsContainer && (!state.products || state.products.length === 0)) {
            const productItems = productsContainer.querySelectorAll('.hg-product-item');
            state.products = [];
            productItems.forEach(item => {
                state.products.push({
                    base_product_id: parseInt(item.dataset.id),
                    name: item.dataset.name,
                    price: parseFloat(item.dataset.price) || 0,
                    image: item.dataset.image || '',
                });
            });
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

        if (state.total_steps < state.products.length) {
            state.total_steps = state.products.length;
        }

        log('App ready', { step: state.current_step, products: state.products.length });
        render();
    }

    // Exponer funciones al window para onclick handlers
    window.selectAttribute = selectAttribute;
    window.nextStep = nextStep;
    window.prevStep = prevStep;
    window.goToStep = goToStep;
    window.submitContact = submitContact;
    window.startNewSelection = startNewSelection;

    // Iniciar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }

})();