/**
 * OSA - Users Module
 */

const UsersModule = {
    users: [],
    stores: [],

    init() {
        this.loadStores();
        this.loadUsers();
    },

    async loadStores() {
        const result = await window.osaData.read('stores', {
            filters: { is_active: true },
            useStoreFilter: false
        });
        if (result.ok) this.stores = result.data;
    },

    async loadUsers() {
        const container = document.getElementById('users-container');
        if (!container) return;

        const result = await window.osaData.read('profiles', {
            orderBy: { column: 'created_at', ascending: false },
            useStoreFilter: false
        });

        if (!result.ok) {
            container.innerHTML = `<p>Erro: ${result.error?.message}</p>`;
            return;
        }

        this.users = result.data;

        const roles = {
            admin: 'Administrador',
            junior_admin: 'Administrador Júnior',
            cashier: 'Caixa'
        };

        window.osaUI.renderTable('users-container', this.users, [
            { key: 'full_name', label: 'Nome' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Telefone' },
            { key: 'role', label: 'Perfil', format: (v) => `<span class="badge badge-info">${roles[v] || v}</span>` },
            { key: 'is_active', label: 'Estado', format: (v) => v ? '<span class="badge badge-success">Ativo</span>' : '<span class="badge badge-gray">Inativo</span>' }
        ], {
            actions: [
                { name: 'stores', icon: '🏪', title: 'Gerenciar Lojas', handler: (row) => this.manageUserStores(row) }
            ]
        });
    },

    async manageUserStores(user) {
        // Carregar lojas do utilizador
        const userStoresResult = await window.osaData.read('store_users', {
            filters: { user_id: user.id },
            useStoreFilter: false
        });

        const userStoreIds = userStoresResult.ok ? userStoresResult.data.map(su => su.store_id) : [];

        const storeCheckboxes = this.stores.map(s => `
            <label style="display: flex; align-items: center; gap: 8px; padding: 8px; border: 1px solid var(--gray-200); border-radius: var(--border-radius); margin-bottom: 8px;">
                <input type="checkbox" name="store_${s.id}" ${userStoreIds.includes(s.id) ? 'checked' : ''}>
                <span>${s.name}</span>
            </label>
        `).join('');

        window.osaUI.showModal({
            title: `Lojas de ${user.full_name || user.email}`,
            content: `
                <form id="user-stores-form">
                    <p class="text-muted" style="margin-bottom: 12px;">Selecione as lojas às quais o utilizador tem acesso:</p>
                    ${storeCheckboxes}
                </form>
            `,
            onConfirm: async () => {
                window.osaUI.showLoading('Atualizando permissões...');

                // Remover todas as associações existentes
                for (const su of (userStoresResult.data || [])) {
                    await window.osaData.delete('store_users', su.id, { useStoreFilter: false });
                }

                // Criar novas associações
                const form = document.getElementById('user-stores-form');
                const checkboxes = form.querySelectorAll('input[type="checkbox"]:checked');

                for (const cb of checkboxes) {
                    const storeId = cb.name.replace('store_', '');
                    await window.osaData.create('store_users', {
                        store_id: storeId,
                        user_id: user.id
                    }, { useStoreFilter: false });
                }

                window.osaUI.hideLoading();
                window.osaUI.showSuccess('Permissões atualizadas');
            }
        });
    }
};

window.UsersModule = UsersModule;
