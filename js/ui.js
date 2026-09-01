/**
 * OSA - OFFICIAL SHOP ADMINISTRATOR
 * Interface do Utilizador (UI)
 */

class UIManager {
    constructor() {
        this.sidebarOpen = window.innerWidth > 768;
        this.currentModule = 'dashboard';
        this.loadingCount = 0;
    }

    init() {
        this.setupEventListeners();
        this.setupResponsive();
    }

    setupEventListeners() {
        // Toggle sidebar
        const toggleBtn = document.getElementById('sidebar-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleSidebar());
        }

        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Store selector
        const storeSelector = document.getElementById('store-selector');
        if (storeSelector) {
            storeSelector.addEventListener('change', (e) => this.handleStoreChange(e));
        }

        // Navigation
        document.querySelectorAll('[data-module]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const module = e.currentTarget.dataset.module;
                this.navigateTo(module);
            });
        });
    }

    setupResponsive() {
        window.addEventListener('resize', () => {
            if (window.innerWidth <= 768) {
                this.sidebarOpen = false;
                this.updateSidebar();
            }
        });
    }

    toggleSidebar() {
        this.sidebarOpen = !this.sidebarOpen;
        this.updateSidebar();
    }

    updateSidebar() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('main-content');
        
        if (sidebar) {
            sidebar.classList.toggle('sidebar-closed', !this.sidebarOpen);
        }
        if (mainContent) {
            mainContent.classList.toggle('sidebar-closed', !this.sidebarOpen);
        }
    }

    async handleLogout() {
        if (confirm('Tem certeza que deseja sair?')) {
            const result = await window.osaAuth.logout();
            if (result.ok) {
                window.location.href = 'login.html';
            } else {
                this.showError('Erro ao sair: ' + result.error);
            }
        }
    }

    async handleStoreChange(e) {
        const storeId = e.target.value;
        if (storeId) {
            const result = await window.osaAuth.switchStore(storeId);
            if (result.ok) {
                this.showSuccess('Loja alterada com sucesso');
                window.location.reload();
            } else {
                this.showError('Erro ao alterar loja: ' + result.error);
            }
        }
    }

    navigateTo(module) {
        this.currentModule = module;
        
        // Atualizar menu ativo
        document.querySelectorAll('[data-module]').forEach(el => {
            el.classList.toggle('active', el.dataset.module === module);
        });
        
        // Esconder todos os módulos
        document.querySelectorAll('.module').forEach(el => {
            el.classList.add('hidden');
        });
        
        // Mostrar módulo atual
        const targetModule = document.getElementById(`module-${module}`);
        if (targetModule) {
            targetModule.classList.remove('hidden');
        }
        
        // Fechar sidebar em mobile
        if (window.innerWidth <= 768) {
            this.sidebarOpen = false;
            this.updateSidebar();
        }
        
        // Atualizar título
        const titles = {
            'dashboard': 'Dashboard',
            'products': 'Produtos',
            'categories': 'Categorias',
            'warehouse': 'Armazém',
            'store': 'Loja',
            'transfers': 'Transferências',
            'sales': 'Vendas',
            'cash': 'Caixa',
            'inventory': 'Inventário',
            'losses': 'Perdas',
            'thefts': 'Furtos',
            'stores': 'Lojas',
            'users': 'Utilizadores',
            'reports': 'Relatórios',
            'fuel': 'Combustível',
            'closing': 'Fechamento',
            'settings': 'Configurações',
            'diagnostic': 'Diagnóstico'
        };
        
        const pageTitle = document.getElementById('page-title');
        if (pageTitle) {
            pageTitle.textContent = titles[module] || module;
        }
        
        // Disparar evento para o módulo carregar dados
        window.dispatchEvent(new CustomEvent('osa:module:load', { detail: { module } }));
    }

    // ============================================================
    // NOTIFICAÇÕES
    // ============================================================

    showNotification(message, type = 'info', duration = 4000) {
        const container = document.getElementById('notification-container') || this.createNotificationContainer();
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span class="notification-icon">${this.getNotificationIcon(type)}</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">&times;</button>
        `;
        
        container.appendChild(notification);
        
        // Animação de entrada
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
        
        // Auto-remover
        if (duration > 0) {
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, duration);
        }
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error', 6000);
    }

    showWarning(message) {
        this.showNotification(message, 'warning', 5000);
    }

    showInfo(message) {
        this.showNotification(message, 'info');
    }

    getNotificationIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || 'ℹ';
    }

    createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'notification-container';
        document.body.appendChild(container);
        return container;
    }

    // ============================================================
    // LOADING
    // ============================================================

    showLoading(message = 'A carregar...') {
        this.loadingCount++;
        
        let overlay = document.getElementById('loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading-spinner"></div>
                <div class="loading-message">${message}</div>
            `;
            document.body.appendChild(overlay);
        } else {
            overlay.querySelector('.loading-message').textContent = message;
        }
        
        overlay.classList.add('show');
    }

    hideLoading() {
        this.loadingCount = Math.max(0, this.loadingCount - 1);
        
        if (this.loadingCount === 0) {
            const overlay = document.getElementById('loading-overlay');
            if (overlay) {
                overlay.classList.remove('show');
            }
        }
    }

    // ============================================================
    // MODAIS
    // ============================================================

    showModal(options) {
        const { title, content, onConfirm, onCancel, confirmText = 'Confirmar', cancelText = 'Cancelar', danger = false } = options;
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">${content}</div>
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-cancel">${cancelText}</button>
                    <button class="btn ${danger ? 'btn-danger' : 'btn-primary'} modal-confirm">${confirmText}</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Animação
        requestAnimationFrame(() => modal.classList.add('show'));
        
        // Eventos
        const closeModal = () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        };
        
        modal.querySelector('.modal-close').addEventListener('click', () => {
            closeModal();
            if (onCancel) onCancel();
        });
        
        modal.querySelector('.modal-cancel').addEventListener('click', () => {
            closeModal();
            if (onCancel) onCancel();
        });
        
        modal.querySelector('.modal-confirm').addEventListener('click', () => {
            closeModal();
            if (onConfirm) onConfirm();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
                if (onCancel) onCancel();
            }
        });
    }

    confirm(message, onConfirm, onCancel) {
        this.showModal({
            title: 'Confirmação',
            content: `<p>${message}</p>`,
            onConfirm,
            onCancel,
            confirmText: 'Sim',
            cancelText: 'Não'
        });
    }

    confirmDanger(message, onConfirm, onCancel) {
        this.showModal({
            title: 'Atenção',
            content: `<p class="text-danger">${message}</p>`,
            onConfirm,
            onCancel,
            confirmText: 'Eliminar',
            cancelText: 'Cancelar',
            danger: true
        });
    }

    // ============================================================
    // FORMULÁRIOS
    // ============================================================

    getFormData(formId) {
        const form = document.getElementById(formId);
        if (!form) return {};
        
        const data = {};
        const formData = new FormData(form);
        
        formData.forEach((value, key) => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) {
                if (input.type === 'checkbox') {
                    data[key] = input.checked;
                } else if (input.type === 'number') {
                    data[key] = value === '' ? null : parseFloat(value);
                } else {
                    data[key] = value === '' ? null : value;
                }
            }
        });
        
        return data;
    }

    setFormData(formId, data) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        Object.entries(data).forEach(([key, value]) => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = !!value;
                } else {
                    input.value = value !== null && value !== undefined ? value : '';
                }
            }
        });
    }

    resetForm(formId) {
        const form = document.getElementById(formId);
        if (form) form.reset();
    }

    validateForm(formId) {
        const form = document.getElementById(formId);
        if (!form) return false;
        
        let valid = true;
        
        form.querySelectorAll('[required]').forEach(field => {
            if (!field.value.trim()) {
                valid = false;
                field.classList.add('error');
                
                const errorMsg = field.parentElement.querySelector('.field-error');
                if (errorMsg) errorMsg.textContent = 'Campo obrigatório';
            } else {
                field.classList.remove('error');
                const errorMsg = field.parentElement.querySelector('.field-error');
                if (errorMsg) errorMsg.textContent = '';
            }
        });
        
        return valid;
    }

    // ============================================================
    // TABELAS
    // ============================================================

    renderTable(containerId, data, columns, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <p>${options.emptyMessage || 'Nenhum registro encontrado'}</p>
                </div>
            `;
            return;
        }
        
        let html = '<table class="data-table"><thead><tr>';
        
        columns.forEach(col => {
            html += `<th>${col.label}</th>`;
        });
        
        if (options.actions) {
            html += '<th>Ações</th>';
        }
        
        html += '</tr></thead><tbody>';
        
        data.forEach((row, index) => {
            html += '<tr>';
            columns.forEach(col => {
                const value = col.format ? col.format(row[col.key], row) : (row[col.key] || '-');
                html += `<td>${value}</td>`;
            });
            
            if (options.actions) {
                html += '<td class="actions">';
                options.actions.forEach(action => {
                    if (action.condition && !action.condition(row)) return;
                    html += `<button class="btn-action ${action.class || ''}" data-index="${index}" data-action="${action.name}" title="${action.title}">${action.icon}</button>`;
                });
                html += '</td>';
            }
            
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        
        // Paginação
        if (options.pagination) {
            html += this.renderPagination(options.pagination);
        }
        
        container.innerHTML = html;
        
        // Eventos de ação
        if (options.actions) {
            container.querySelectorAll('.btn-action').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = parseInt(e.currentTarget.dataset.index);
                    const actionName = e.currentTarget.dataset.action;
                    const action = options.actions.find(a => a.name === actionName);
                    if (action && action.handler) {
                        action.handler(data[index]);
                    }
                });
            });
        }
    }

    renderPagination(pagination) {
        const { currentPage, totalPages, onPageChange } = pagination;
        
        if (totalPages <= 1) return '';
        
        let html = '<div class="pagination">';
        
        html += `<button class="btn-page" ${currentPage === 0 ? 'disabled' : ''} data-page="${currentPage - 1}">‹</button>`;
        
        for (let i = 0; i < totalPages; i++) {
            html += `<button class="btn-page ${i === currentPage ? 'active' : ''}" data-page="${i}">${i + 1}</button>`;
        }
        
        html += `<button class="btn-page" ${currentPage === totalPages - 1 ? 'disabled' : ''} data-page="${currentPage + 1}">›</button>`;
        html += '</div>';
        
        // Adicionar eventos após renderizar
        setTimeout(() => {
            document.querySelectorAll('.btn-page').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const page = parseInt(e.currentTarget.dataset.page);
                    if (!isNaN(page) && onPageChange) {
                        onPageChange(page);
                    }
                });
            });
        }, 0);
        
        return html;
    }

    // ============================================================
    // FORMATAÇÃO
    // ============================================================

    formatCurrency(value) {
        if (value === null || value === undefined) return '-';
        const num = typeof value === 'string' ? parseFloat(value) : value;
        return new Intl.NumberFormat(OSA_CONFIG.LOCALE, {
            style: 'currency',
            currency: OSA_CONFIG.CURRENCY
        }).format(num);
    }

    formatNumber(value, decimals = 0) {
        if (value === null || value === undefined) return '-';
        const num = typeof value === 'string' ? parseFloat(value) : value;
        return new Intl.NumberFormat(OSA_CONFIG.LOCALE, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(num);
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString(OSA_CONFIG.LOCALE);
    }

    formatDateTime(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString(OSA_CONFIG.LOCALE);
    }

    // ============================================================
    // ATUALIZAR UI COM DADOS DO UTILIZADOR
    // ============================================================

    updateUserInterface() {
        const auth = window.osaAuth;
        
        // Nome do utilizador
        const userNameEl = document.getElementById('user-name');
        if (userNameEl && auth.currentProfile) {
            userNameEl.textContent = auth.currentProfile.full_name || auth.currentProfile.email;
        }
        
        // Role
        const userRoleEl = document.getElementById('user-role');
        if (userRoleEl && auth.currentProfile) {
            const roles = {
                'admin': 'Administrador',
                'junior_admin': 'Administrador Júnior',
                'cashier': 'Caixa'
            };
            userRoleEl.textContent = roles[auth.currentProfile.role] || auth.currentProfile.role;
        }
        
        // Loja atual
        const storeNameEl = document.getElementById('current-store-name');
        if (storeNameEl && auth.currentStore) {
            storeNameEl.textContent = auth.currentStore.name;
        }
        
        // Selector de lojas
        const storeSelector = document.getElementById('store-selector');
        if (storeSelector && auth.userStores.length > 1) {
            storeSelector.innerHTML = auth.userStores.map(s => 
                `<option value="${s.id}" ${s.id === auth.currentStore?.id ? 'selected' : ''}>${s.name}</option>`
            ).join('');
            storeSelector.parentElement.classList.remove('hidden');
        } else if (storeSelector) {
            storeSelector.parentElement.classList.add('hidden');
        }
        
        // Mostrar/esconder elementos por role
        this.applyRoleVisibility();
    }

    applyRoleVisibility() {
        const auth = window.osaAuth;
        
        document.querySelectorAll('[data-role]').forEach(el => {
            const requiredRole = el.dataset.role;
            const hasAccess = auth.hasRole(requiredRole);
            el.classList.toggle('hidden', !hasAccess);
        });
        
        // Esconder custos para cashier
        if (!auth.canViewCosts()) {
            document.querySelectorAll('.cost-field, .cost-column, .margin-field, .profit-field').forEach(el => {
                el.classList.add('hidden');
            });
        }
        
        // Esconder lucros para non-admin
        if (!auth.canViewProfits()) {
            document.querySelectorAll('.profit-field, .profit-column').forEach(el => {
                el.classList.add('hidden');
            });
        }
    }
}

// Instância global
window.osaUI = new UIManager();
