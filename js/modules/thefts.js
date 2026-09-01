/**
 * OSA - Thefts Module
 */

const TheftsModule = {
    thefts: [],
    products: [],

    init() {
        this.loadProducts();
        this.loadThefts();
        this.setupEventListeners();
    },

    setupEventListeners() {
        const btn = document.getElementById('btn-new-theft');
        if (btn) btn.onclick = () => this.showModal();
    },

    async loadProducts() {
        const result = await window.osaData.read('products', {
            filters: { is_active: true },
            orderBy: { column: 'name', ascending: true }
        });
        if (result.ok) this.products = result.data;
    },

    async loadThefts() {
        const container = document.getElementById('thefts-container');
        if (!container) return;

        const result = await window.osaData.read('thefts', {
            select: '*, products(name, code, unit)',
            orderBy: { column: 'created_at', ascending: false }
        });

        if (!result.ok) {
            container.innerHTML = `<p>Erro: ${result.error?.message}</p>`;
            return;
        }

        this.thefts = result.data;

        window.osaUI.renderTable('thefts-container', this.thefts, [
            { key: 'created_at', label: 'Registro', format: (v) => window.osaUI.formatDateTime(v) },
            { key: 'theft_date', label: 'Data Furto', format: (v) => window.osaUI.formatDate(v) },
            { key: 'products', label: 'Produto', format: (v) => v?.name || '-' },
            { key: 'quantity', label: 'Qtd', format: (v, row) => `${v} ${row.products?.unit || ''}` },
            { key: 'location', label: 'Local', format: (v) => v === 'warehouse' ? 'Armazém' : 'Loja' },
            { key: 'reference', label: 'Referência' },
            { key: 'notes', label: 'Observação' }
        ]);
    },

    showModal() {
        if (this.products.length === 0) {
            window.osaUI.showWarning('Cadastre produtos primeiro');
            return;
        }

        const productOptions = this.products.map(p =>
            `<option value="${p.id}">${p.code} - ${p.name}</option>`
        ).join('');

        window.osaUI.showModal({
            title: 'Registrar Furto',
            content: `
                <form id="theft-form">
                    <div class="form-group">
                        <label class="form-label">Produto <span class="required">*</span></label>
                        <select class="form-select" name="product_id" required>
                            <option value="">Selecionar...</option>
                            ${productOptions}
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Quantidade <span class="required">*</span></label>
                            <input type="number" class="form-input" name="quantity" step="0.001" min="0.001" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Localização <span class="required">*</span></label>
                            <select class="form-select" name="location" required>
                                <option value="warehouse">Armazém</option>
                                <option value="store">Loja</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Data do Furto <span class="required">*</span></label>
                            <input type="date" class="form-input" name="theft_date" value="${new Date().toISOString().split('T')[0]}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Referência</label>
                            <input type="text" class="form-input" name="reference" placeholder="Nº de ocorrência, etc.">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Observação</label>
                        <textarea class="form-textarea" name="notes"></textarea>
                    </div>
                </form>
            `,
            onConfirm: () => this.saveTheft()
        });
    },

    async saveTheft() {
        if (!window.osaUI.validateForm('theft-form')) return;

        const data = window.osaUI.getFormData('theft-form');

        window.osaUI.showLoading('Registrando furto...');

        const result = await window.osaData.rpc('process_theft', {
            p_store_id: window.osaAuth.currentStore.id,
            p_user_id: window.osaAuth.currentUser.id,
            p_product_id: data.product_id,
            p_quantity: parseFloat(data.quantity),
            p_location: data.location,
            p_theft_date: data.theft_date,
            p_reference: data.reference || '',
            p_notes: data.notes || ''
        });

        window.osaUI.hideLoading();

        if (result.ok) {
            window.osaUI.showSuccess('Furto registrado com sucesso');
            this.loadThefts();
        } else {
            window.osaUI.showError('Erro: ' + result.error?.message);
        }
    }
};

window.TheftsModule = TheftsModule;
