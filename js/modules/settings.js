/**
 * OSA - Settings Module
 */

const SettingsModule = {
    currentStore: null,

    init() {
        this.currentStore = window.osaAuth.currentStore;
        this.renderSettings();
    },

    renderSettings() {
        const container = document.getElementById('settings-container');
        if (!container) return;

        if (!this.currentStore) {
            container.innerHTML = '<div class="empty-state"><p>Nenhuma loja selecionada</p></div>';
            return;
        }

        container.innerHTML = `
            <form id="settings-form">
                <h4 style="margin-bottom: 16px;">Identidade da Loja</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Nome da Loja <span class="required">*</span></label>
                        <input type="text" class="form-input" name="name" value="${this.currentStore.name || ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Cor de Destaque</label>
                        <input type="color" class="form-input" name="accent_color" value="${this.currentStore.accent_color || '#2563eb'}" style="height: 40px; padding: 4px;">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Endereço</label>
                    <input type="text" class="form-input" name="address" value="${this.currentStore.address || ''}">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Telefone</label>
                        <input type="text" class="form-input" name="phone" value="${this.currentStore.phone || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" class="form-input" name="email" value="${this.currentStore.email || ''}">
                    </div>
                </div>

                <h4 style="margin: 24px 0 16px;">Configurações Operacionais</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Moeda</label>
                        <select class="form-select" name="currency">
                            <option value="MZN" ${this.currentStore.currency === 'MZN' ? 'selected' : ''}>MZN (Metical Moçambicano)</option>
                            <option value="USD" ${this.currentStore.currency === 'USD' ? 'selected' : ''}>USD (Dólar Americano)</option>
                            <option value="EUR" ${this.currentStore.currency === 'EUR' ? 'selected' : ''}>EUR (Euro)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Margem Padrão (%)</label>
                        <input type="number" class="form-input" name="default_margin" step="0.01" min="0" value="${this.currentStore.default_margin || 25}">
                    </div>
                </div>

                <div style="margin-top: 24px;">
                    <button type="button" class="btn btn-primary" onclick="SettingsModule.saveSettings()">Guardar Configurações</button>
                </div>
            </form>
        `;
    },

    async saveSettings() {
        if (!window.osaUI.validateForm('settings-form')) return;

        const data = window.osaUI.getFormData('settings-form');
        data.default_margin = parseFloat(data.default_margin) || 25;

        window.osaUI.showLoading('Guardando configurações...');

        const result = await window.osaData.update('stores', this.currentStore.id, data, { useStoreFilter: false });

        window.osaUI.hideLoading();

        if (result.ok) {
            window.osaUI.showSuccess('Configurações guardadas com sucesso');
            // Atualizar store local
            Object.assign(this.currentStore, data);
            window.osaAuth.currentStore = this.currentStore;
            window.osaUI.updateUserInterface();
        } else {
            window.osaUI.showError('Erro: ' + result.error?.message);
        }
    }
};

window.SettingsModule = SettingsModule;
