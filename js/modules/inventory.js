/**
 * OSA - Inventory Module
 */

const InventoryModule = {
    inventories: [],
    products: [],
    currentInventory: null,

    init() {
        this.loadInventories();
        this.loadProducts();
        this.setupEventListeners();
    },

    setupEventListeners() {
        const btn = document.getElementById('btn-new-inventory');
        if (btn) btn.onclick = () => this.showCreateModal();
    },

    async loadProducts() {
        const result = await window.osaData.read('products', {
            filters: { is_active: true },
            orderBy: { column: 'name', ascending: true }
        });
        if (result.ok) this.products = result.data;
    },

    async loadInventories() {
        const container = document.getElementById('inventory-container');
        if (!container) return;

        const result = await window.osaData.read('inventories', {
            select: '*, profiles(full_name)',
            orderBy: { column: 'created_at', ascending: false }
        });

        if (!result.ok) {
            container.innerHTML = `<p>Erro: ${result.error?.message}</p>`;
            return;
        }

        this.inventories = result.data;

        window.osaUI.renderTable('inventory-container', this.inventories, [
            { key: 'created_at', label: 'Data', format: (v) => window.osaUI.formatDateTime(v) },
            { key: 'location', label: 'Local', format: (v) => ({ warehouse: 'Armazém', store: 'Loja', general: 'Geral' }[v] || v) },
            { key: 'status', label: 'Estado', format: (v) => {
                const badges = { in_progress: '<span class="badge badge-warning">Em Progresso</span>', completed: '<span class="badge badge-success">Concluído</span>', cancelled: '<span class="badge badge-gray">Cancelado</span>' };
                return badges[v] || v;
            }},
            { key: 'profiles', label: 'Responsável', format: (v) => v?.full_name || '-' }
        ], {
            actions: [
                { name: 'count', icon: '📋', title: 'Contar', condition: (row) => row.status === 'in_progress', handler: (row) => this.showCountModal(row) },
                { name: 'complete', icon: '✓', title: 'Completar', condition: (row) => row.status === 'in_progress', handler: (row) => this.completeInventory(row) }
            ]
        });
    },

    showCreateModal() {
        window.osaUI.showModal({
            title: 'Novo Inventário',
            content: `
                <form id="inventory-form">
                    <div class="form-group">
                        <label class="form-label">Localização <span class="required">*</span></label>
                        <select class="form-select" name="location" required>
                            <option value="warehouse">Armazém</option>
                            <option value="store">Loja</option>
                            <option value="general">Geral</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Observação</label>
                        <textarea class="form-textarea" name="notes"></textarea>
                    </div>
                </form>
            `,
            onConfirm: () => this.createInventory()
        });
    },

    async createInventory() {
        if (!window.osaUI.validateForm('inventory-form')) return;

        const data = window.osaUI.getFormData('inventory-form');
        data.user_id = window.osaAuth.currentUser.id;

        window.osaUI.showLoading('Criando inventário...');
        const result = await window.osaData.create('inventories', data);
        window.osaUI.hideLoading();

        if (result.ok) {
            window.osaUI.showSuccess('Inventário criado');
            this.loadInventories();
        } else {
            window.osaUI.showError('Erro: ' + result.error?.message);
        }
    },

    async showCountModal(inventory) {
        this.currentInventory = inventory;

        // Carregar itens existentes do inventário
        const itemsResult = await window.osaData.read('inventory_items', {
            filters: { inventory_id: inventory.id },
            select: '*, products(name, code, unit)'
        });

        const existingItems = itemsResult.ok ? itemsResult.data : [];

        // Se não houver itens, criar a partir dos produtos
        if (existingItems.length === 0) {
            for (const product of this.products) {
                // Obter saldo esperado
                const stockResult = await window.osaData.getStockBalance(product.id, inventory.location);
                const expectedQty = stockResult.ok ? parseFloat(stockResult.data) : 0;

                await window.osaData.create('inventory_items', {
                    inventory_id: inventory.id,
                    product_id: product.id,
                    expected_quantity: expectedQty,
                    counted_quantity: 0,
                    unit_cost: product.cost_price || 0
                });
            }
            // Recarregar
            return this.showCountModal(inventory);
        }

        const rows = existingItems.map((item, i) => `
            <tr>
                <td>${item.products?.code || '-'}</td>
                <td>${item.products?.name || '-'}</td>
                <td>${item.expected_quantity} ${item.products?.unit || ''}</td>
                <td><input type="number" class="form-input" style="width: 100px;" id="count-${item.id}" value="${item.counted_quantity}" step="0.001" min="0"></td>
                <td><input type="text" class="form-input" style="width: 150px;" id="note-${item.id}" value="${item.notes || ''}"></td>
            </tr>
        `).join('');

        window.osaUI.showModal({
            title: 'Contagem de Inventário',
            content: `
                <div style="max-height: 400px; overflow-y: auto;">
                    <table class="data-table">
                        <thead>
                            <tr><th>Código</th><th>Produto</th><th>Esperado</th><th>Contado</th><th>Obs</th></tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            `,
            onConfirm: () => this.saveCounts(existingItems)
        });
    },

    async saveCounts(items) {
        window.osaUI.showLoading('Guardando contagens...');

        for (const item of items) {
            const counted = parseFloat(document.getElementById(`count-${item.id}`)?.value) || 0;
            const note = document.getElementById(`note-${item.id}`)?.value || '';

            await window.osaData.update('inventory_items', item.id, {
                counted_quantity: counted,
                difference: counted - item.expected_quantity,
                notes: note
            });
        }

        window.osaUI.hideLoading();
        window.osaUI.showSuccess('Contagens guardadas');
        this.loadInventories();
    },

    completeInventory(inventory) {
        window.osaUI.confirm(
            'Completar inventário? Serão gerados ajustes de estoque para as diferenças encontradas.',
            async () => {
                window.osaUI.showLoading('Completando inventário...');

                const result = await window.osaData.rpc('complete_inventory', {
                    p_inventory_id: inventory.id,
                    p_user_id: window.osaAuth.currentUser.id
                });

                window.osaUI.hideLoading();

                if (result.ok) {
                    window.osaUI.showSuccess('Inventário completado');
                    this.loadInventories();
                } else {
                    window.osaUI.showError('Erro: ' + result.error?.message);
                }
            }
        );
    }
};

window.InventoryModule = InventoryModule;
