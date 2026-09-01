/**
 * OSA - Stores Module
 */

const StoresModule = {
    stores: [],
    editingId: null,

    init() {
        this.loadStores();
        this.setupEventListeners();
    },

    setupEventListeners() {
        const btn = document.getElementById('btn-new-store');
        if (btn) btn.onclick = () => this.showModal();
    },

    async loadStores() {
        const container = document.getElementById('stores-container');
        if (!container) return;

        const result = await window.osaData.read('stores', {
            orderBy: { column: 'created_at', ascending: false }
        });

        if (!result.ok) {
            container.innerHTML = `<p>Erro: ${result.error?.message}</p>`;
            return;
        }

        this.stores = result.data;

        if (this.stores.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏪</div><p>Nenhuma loja encontrada</p></div>';
            return;
        }

        let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px;">';

        this.stores.forEach(store => {
            html += `
                <div class="card" style="overflow: hidden;">
                    <div style="height: 120px; background: linear-gradient(135deg, ${store.accent_color || '#2563eb'}, ${store.accent_color || '#1e3a5f'}); display: flex; align-items: center; justify-content: center; color: white; font-size: 48px;">
                        🏪
                    </div>
                    <div style="padding: 16px;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div>
                                <h4 style="font-weight: 600; margin-bottom: 4px;">${store.name}</h4>
                                <p class="text-muted" style="font-size: 13px;">${store.address || 'Sem endereço'}</p>
                            </div>
                            <span class="badge ${store.is_active ? 'badge-success' : 'badge-gray'}">${store.is_active ? 'Ativa' : 'Inativa'}</span>
                        </div>
                        <div style="margin-top: 12px; font-size: 13px; color: var(--gray-500);">
                            <p>📞 ${store.phone || '-'}</p>
                            <p>✉️ ${store.email || '-'}</p>
                            <p>💱 ${store.currency || 'MZN'}</p>
                        </div>
                        <div style="display: flex; gap: 8px; margin-top: 12px;">
                            <button class="btn btn-secondary btn-sm" onclick="StoresModule.showModal(StoresModule.stores.find(s => s.id === '${store.id}'))">Editar</button>
                            <button class="btn btn-danger btn-sm" onclick="StoresModule.deleteStore('${store.id}')">Eliminar</button>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    },

    showModal(store = null) {
        this.editingId = store?.id || null;
        const title = store ? 'Editar Loja' : 'Nova Loja';

        window.osaUI.showModal({
            title,
            content: `
                <form id="store-form">
                    <div class="form-group">
                        <label class="form-label">Nome <span class="required">*</span></label>
                        <input type="text" class="form-input" name="name" value="${store?.name || ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Endereço</label>
                        <input type="text" class="form-input" name="address" value="${store?.address || ''}">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Telefone</label>
                            <input type="text" class="form-input" name="phone" value="${store?.phone || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Email</label>
                            <input type="email" class="form-input" name="email" value="${store?.email || ''}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Cor de Destaque</label>
                            <input type="color" class="form-input" name="accent_color" value="${store?.accent_color || '#2563eb'}" style="height: 40px; padding: 4px;">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Moeda</label>
                            <select class="form-select" name="currency">
                                <option value="MZN" ${store?.currency === 'MZN' ? 'selected' : ''}>MZN (Metical)</option>
                                <option value="USD" ${store?.currency === 'USD' ? 'selected' : ''}>USD (Dólar)</option>
                                <option value="EUR" ${store?.currency === 'EUR' ? 'selected' : ''}>EUR (Euro)</option>
                                <option value="ZAR" ${store?.currency === 'ZAR' ? 'selected' : ''}>ZAR (Rand)</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" name="is_active" ${store?.is_active !== false ? 'checked' : ''}>
                            Loja Ativa
                        </label>
                    </div>
                </form>
            `,
            onConfirm: () => this.saveStore()
        });
    },

    async saveStore() {
        if (!window.osaUI.validateForm('store-form')) return;

        const data = window.osaUI.getFormData('store-form');
        data.is_active = !!data.is_active;

        let result;
        if (this.editingId) {
            result = await window.osaData.update('stores', this.editingId, data, { useStoreFilter: false });
        } else {
            result = await window.osaData.create('stores', data, { useStoreFilter: false });
        }

        if (result.ok) {
            window.osaUI.showSuccess(this.editingId ? 'Loja atualizada' : 'Loja criada');
            this.editingId = null;
            this.loadStores();
        } else {
            window.osaUI.showError('Erro: ' + result.error?.message);
        }
    },

    deleteStore(id) {
        const store = this.stores.find(s => s.id === id);
        window.osaUI.confirmDanger(
            `Eliminar loja "${store?.name}"? Esta ação não pode ser desfeita.`,
            async () => {
                const result = await window.osaData.delete('stores', id, { useStoreFilter: false });
                if (result.ok) {
                    window.osaUI.showSuccess('Loja eliminada');
                    this.loadStores();
                } else {
                    window.osaUI.showError('Erro: ' + result.error?.message);
                }
            }
        );
    }
};

window.StoresModule = StoresModule;
