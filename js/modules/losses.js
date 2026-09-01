/**
 * OSA - Losses Module
 */

const LossesModule = {
    losses: [],
    products: [],

    init() {
        this.loadProducts();
        this.loadLosses();
        this.setupEventListeners();
    },

    setupEventListeners() {
        const btn = document.getElementById('btn-new-loss');
        if (btn) btn.onclick = () => this.showModal();
    },

    async loadProducts() {
        const result = await window.osaData.read('products', {
            filters: { is_active: true },
            orderBy: { column: 'name', ascending: true }
        });
        if (result.ok) this.products = result.data;
    },

    async loadLosses() {
        const container = document.getElementById('losses-container');
        if (!container) return;

        const result = await window.osaData.read('losses', {
            select: '*, products(name, code, unit)',
            orderBy: { column: 'created_at', ascending: false }
        });

        if (!result.ok) {
            container.innerHTML = `<p>Erro: ${result.error?.message}</p>`;
            return;
        }

        this.losses = result.data;

        window.osaUI.renderTable('losses-container', this.losses, [
            { key: 'created_at', label: 'Data', format: (v) => window.osaUI.formatDateTime(v) },
            { key: 'products', label: 'Produto', format: (v) => v?.name || '-' },
            { key: 'quantity', label: 'Qtd', format: (v, row) => `${v} ${row.products?.unit || ''}` },
            { key: 'location', label: 'Local', format: (v) => v === 'warehouse' ? 'Armazém' : 'Loja' },
            { key: 'reason', label: 'Motivo' },
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
            title: 'Registrar Perda',
            content: `
                <form id="loss-form">
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
                    <div class="form-group">
                        <label class="form-label">Motivo <span class="required">*</span></label>
                        <input type="text" class="form-input" name="reason" placeholder="Ex: Produto estragado, quebrado..." required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Observação</label>
                        <textarea class="form-textarea" name="notes"></textarea>
                    </div>
                </form>
            `,
            onConfirm: () => this.saveLoss()
        });
    },

    async saveLoss() {
        if (!window.osaUI.validateForm('loss-form')) return;

        const data = window.osaUI.getFormData('loss-form');

        window.osaUI.showLoading('Registrando perda...');

        const result = await window.osaData.rpc('process_loss', {
            p_store_id: window.osaAuth.currentStore.id,
            p_user_id: window.osaAuth.currentUser.id,
            p_product_id: data.product_id,
            p_quantity: parseFloat(data.quantity),
            p_location: data.location,
            p_reason: data.reason,
            p_notes: data.notes || ''
        });

        window.osaUI.hideLoading();

        if (result.ok) {
            window.osaUI.showSuccess('Perda registrada com sucesso');
            this.loadLosses();
        } else {
            window.osaUI.showError('Erro: ' + result.error?.message);
        }
    }
};

window.LossesModule = LossesModule;
