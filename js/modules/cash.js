/**
 * OSA - Cash Module
 */

const CashModule = {
    registers: [],
    currentRegister: null,

    init() {
        this.loadRegisters();
        this.setupEventListeners();
    },

    setupEventListeners() {
        const btn = document.getElementById('btn-open-cash');
        if (btn) btn.onclick = () => this.showOpenModal();
    },

    async loadRegisters() {
        const container = document.getElementById('cash-container');
        if (!container) return;

        const result = await window.osaData.read('cash_registers', {
            select: '*, profiles(full_name)',
            orderBy: { column: 'opened_at', ascending: false },
            limit: 20
        });

        if (!result.ok) {
            container.innerHTML = `<p>Erro: ${result.error?.message}</p>`;
            return;
        }

        this.registers = result.data;
        this.currentRegister = this.registers.find(r => r.status === 'open');

        let html = '';

        if (this.currentRegister) {
            html += `
                <div class="card" style="background: var(--success-light); border-color: var(--success); margin-bottom: 20px;">
                    <div style="padding: 20px;">
                        <h4 style="color: var(--success); margin-bottom: 8px;">✓ Caixa Aberto</h4>
                        <p>Abertura: ${window.osaUI.formatDateTime(this.currentRegister.opened_at)}</p>
                        <p>Valor inicial: ${window.osaUI.formatCurrency(this.currentRegister.opening_amount)}</p>
                        <button class="btn btn-danger btn-sm" style="margin-top: 12px;" onclick="CashModule.showCloseModal()">Fechar Caixa</button>
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="card" style="background: var(--warning-light); border-color: var(--warning); margin-bottom: 20px;">
                    <div style="padding: 20px;">
                        <h4 style="color: var(--warning); margin-bottom: 8px;">⚠ Caixa Fechado</h4>
                        <p>O caixa está fechado. Abra-o para registrar vendas.</p>
                    </div>
                </div>
            `;
        }

        html += '<h4 style="margin: 20px 0 12px;">Histórico</h4>';
        html += '<div id="cash-table-wrapper"></div>';
        container.innerHTML = html;

        window.osaUI.renderTable('cash-table-wrapper', this.registers, [
            { key: 'opened_at', label: 'Abertura', format: (v) => window.osaUI.formatDateTime(v) },
            { key: 'closed_at', label: 'Fechamento', format: (v) => v ? window.osaUI.formatDateTime(v) : '-' },
            { key: 'opening_amount', label: 'Abertura', format: (v) => window.osaUI.formatCurrency(v) },
            { key: 'actual_amount', label: 'Fechamento', format: (v) => window.osaUI.formatCurrency(v) },
            { key: 'difference_amount', label: 'Diferença', format: (v) => {
                const val = parseFloat(v) || 0;
                return `<span class="${val < 0 ? 'text-danger' : val > 0 ? 'text-success' : ''}">${window.osaUI.formatCurrency(val)}</span>`;
            }},
            { key: 'status', label: 'Estado', format: (v) => v === 'open' ? '<span class="badge badge-success">Aberto</span>' : '<span class="badge badge-gray">Fechado</span>' }
        ]);
    },

    showOpenModal() {
        window.osaUI.showModal({
            title: 'Abrir Caixa',
            content: `
                <form id="cash-open-form">
                    <div class="form-group">
                        <label class="form-label">Valor de Abertura (MZN) <span class="required">*</span></label>
                        <input type="number" class="form-input" name="opening_amount" step="0.01" min="0" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Observação</label>
                        <textarea class="form-textarea" name="notes"></textarea>
                    </div>
                </form>
            `,
            onConfirm: () => this.openRegister()
        });
    },

    async openRegister() {
        if (!window.osaUI.validateForm('cash-open-form')) return;

        const data = window.osaUI.getFormData('cash-open-form');
        data.user_id = window.osaAuth.currentUser.id;

        window.osaUI.showLoading('Abrindo caixa...');
        const result = await window.osaData.create('cash_registers', data);
        window.osaUI.hideLoading();

        if (result.ok) {
            window.osaUI.showSuccess('Caixa aberto com sucesso');
            this.loadRegisters();
        } else {
            window.osaUI.showError('Erro: ' + result.error?.message);
        }
    },

    showCloseModal() {
        window.osaUI.showModal({
            title: 'Fechar Caixa',
            content: `
                <form id="cash-close-form">
                    <div class="form-group">
                        <label class="form-label">Valor no Caixa (MZN) <span class="required">*</span></label>
                        <input type="number" class="form-input" name="actual_amount" step="0.01" min="0" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Observação / Justificação</label>
                        <textarea class="form-textarea" name="notes" placeholder="Justifique diferenças se houver..."></textarea>
                    </div>
                </form>
            `,
            onConfirm: () => this.closeRegister()
        });
    },

    async closeRegister() {
        if (!window.osaUI.validateForm('cash-close-form')) return;
        if (!this.currentRegister) return;

        const data = window.osaUI.getFormData('cash-close-form');
        const actual = parseFloat(data.actual_amount) || 0;
        const opening = parseFloat(this.currentRegister.opening_amount) || 0;
        const difference = actual - opening;

        window.osaUI.showLoading('Fechando caixa...');

        const result = await window.osaData.update('cash_registers', this.currentRegister.id, {
            actual_amount: actual,
            difference_amount: difference,
            status: 'closed',
            closed_at: new Date().toISOString(),
            notes: data.notes || ''
        });

        window.osaUI.hideLoading();

        if (result.ok) {
            window.osaUI.showSuccess('Caixa fechado com sucesso');
            this.loadRegisters();
        } else {
            window.osaUI.showError('Erro: ' + result.error?.message);
        }
    }
};

window.CashModule = CashModule;
