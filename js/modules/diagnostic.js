/**
 * OSA - Diagnostic Module
 * Testa realmente a conexão, autenticação, CRUD e RLS
 */

const DiagnosticModule = {
    tests: [],

    init() {
        this.renderInitial();
        this.setupEventListeners();
    },

    setupEventListeners() {
        const btn = document.getElementById('btn-run-diagnostic');
        if (btn) btn.onclick = () => this.runAllTests();
    },

    renderInitial() {
        const container = document.getElementById('diagnostic-container');
        if (!container) return;

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔧</div>
                <p>Clique em "Executar Testes" para verificar o sistema</p>
                <p class="text-muted" style="font-size: 13px; margin-top: 8px;">
                    Os testes verificam: configuração, Supabase, Auth, READ, CREATE, UPDATE, DELETE e RLS
                </p>
            </div>
        `;
    },

    async runAllTests() {
        const container = document.getElementById('diagnostic-container');
        if (!container) return;

        this.tests = [];
        container.innerHTML = '<div class="empty-state"><div class="loading-spinner"></div><p>A executar testes...</p></div>';

        // Teste 1: Configuração
        await this.testConfig();

        // Teste 2: Conexão Supabase
        await this.testConnection();

        // Teste 3: Autenticação
        await this.testAuth();

        // Teste 4: READ
        await this.testRead();

        // Teste 5: CREATE
        await this.testCreate();

        // Teste 6: UPDATE
        await this.testUpdate();

        // Teste 7: DELETE
        await this.testDelete();

        // Teste 8: RLS
        await this.testRLS();

        this.renderResults();
    },

    addTest(name, status, message, details = '') {
        this.tests.push({ name, status, message, details });
    },

    async testConfig() {
        try {
            const hasUrl = OSA_CONFIG.SUPABASE_URL && !OSA_CONFIG.SUPABASE_URL.includes('seu-projeto');
            const hasKey = OSA_CONFIG.SUPABASE_ANON_KEY && !OSA_CONFIG.SUPABASE_ANON_KEY.includes('sua-chave');

            if (hasUrl && hasKey) {
                this.addTest('Configuração', 'ok', 'SUPABASE_URL e SUPABASE_ANON_KEY configurados');
            } else {
                this.addTest('Configuração', 'error', 'Configuração incompleta', 'Verifique js/config.js');
            }
        } catch (err) {
            this.addTest('Configuração', 'error', 'Erro: ' + err.message);
        }
    },

    async testConnection() {
        try {
            const result = await window.osaSupabase.checkConnection();
            if (result.ok) {
                this.addTest('Conexão Supabase', 'ok', result.message);
            } else {
                this.addTest('Conexão Supabase', 'error', result.message, `Status: ${result.status}`);
            }
        } catch (err) {
            this.addTest('Conexão Supabase', 'error', 'Erro: ' + err.message);
        }
    },

    async testAuth() {
        try {
            const user = window.osaAuth.currentUser;
            const profile = window.osaAuth.currentProfile;

            if (user && profile) {
                this.addTest('Autenticação', 'ok', `Utilizador: ${profile.email || user.email} | Perfil: ${profile.role}`);
            } else if (user) {
                this.addTest('Autenticação', 'warning', 'Utilizador autenticado mas perfil não carregado');
            } else {
                this.addTest('Autenticação', 'error', 'Nenhum utilizador autenticado');
            }
        } catch (err) {
            this.addTest('Autenticação', 'error', 'Erro: ' + err.message);
        }
    },

    async testRead() {
        try {
            const result = await window.osaData.read('stores', { limit: 1, useStoreFilter: false });
            if (result.ok && Array.isArray(result.data)) {
                this.addTest('READ (SELECT)', 'ok', `Lidas ${result.data.length} loja(s) do Supabase`);
            } else {
                this.addTest('READ (SELECT)', 'error', result.error?.message || 'Falha na leitura');
            }
        } catch (err) {
            this.addTest('READ (SELECT)', 'error', 'Erro: ' + err.message);
        }
    },

    async testCreate() {
        try {
            const testData = {
                name: 'DIAGNOSTIC_TEST_' + Date.now(),
                is_active: false
            };

            const result = await window.osaData.create('stores', testData, { useStoreFilter: false });

            if (result.ok && result.data && result.data.id) {
                this.testRecordId = result.data.id;
                this.addTest('CREATE (INSERT)', 'ok', `Registro criado com ID: ${result.data.id}`);
            } else {
                this.addTest('CREATE (INSERT)', 'error', result.error?.message || 'INSERT não confirmado pelo PostgreSQL');
            }
        } catch (err) {
            this.addTest('CREATE (INSERT)', 'error', 'Erro: ' + err.message);
        }
    },

    async testUpdate() {
        try {
            if (!this.testRecordId) {
                this.addTest('UPDATE (PATCH)', 'skipped', 'CREATE falhou, UPDATE não testado');
                return;
            }

            const result = await window.osaData.update('stores', this.testRecordId, {
                name: 'DIAGNOSTIC_UPDATED_' + Date.now()
            }, { useStoreFilter: false });

            if (result.ok && result.data && result.data.id === this.testRecordId) {
                this.addTest('UPDATE (PATCH)', 'ok', `Registro atualizado e confirmado (ID: ${result.data.id})`);
            } else {
                this.addTest('UPDATE (PATCH)', 'error', result.error?.message || 'UPDATE não confirmado');
            }
        } catch (err) {
            this.addTest('UPDATE (PATCH)', 'error', 'Erro: ' + err.message);
        }
    },

    async testDelete() {
        try {
            if (!this.testRecordId) {
                this.addTest('DELETE', 'skipped', 'CREATE falhou, DELETE não testado');
                return;
            }

            const result = await window.osaData.delete('stores', this.testRecordId, { useStoreFilter: false });

            if (result.ok) {
                // Verificar se realmente foi eliminado
                const checkResult = await window.osaData.readOne('stores', this.testRecordId, { useStoreFilter: false });
                if (!checkResult.ok) {
                    this.addTest('DELETE', 'ok', 'Registro eliminado e ausência confirmada');
                } else {
                    this.addTest('DELETE', 'error', 'Registro ainda existe após DELETE');
                }
            } else {
                this.addTest('DELETE', 'error', result.error?.message || 'DELETE não confirmado');
            }
        } catch (err) {
            this.addTest('DELETE', 'error', 'Erro: ' + err.message);
        }
    },

    async testRLS() {
        try {
            const user = window.osaAuth.currentUser;
            if (!user) {
                this.addTest('RLS (Segurança)', 'error', 'Sem utilizador para testar RLS');
                return;
            }

            // Tentar ler audit_logs (apenas admin/junior_admin)
            const auditResult = await window.osaData.read('audit_logs', { limit: 1 });

            if (window.osaAuth.hasRole('junior_admin')) {
                if (auditResult.ok) {
                    this.addTest('RLS (Segurança)', 'ok', 'Acesso a audit_logs permitido conforme role');
                } else {
                    this.addTest('RLS (Segurança)', 'warning', 'RLS pode estar bloqueando acesso esperado: ' + auditResult.error?.message);
                }
            } else {
                if (!auditResult.ok) {
                    this.addTest('RLS (Segurança)', 'ok', 'RLS bloqueando corretamente acesso não autorizado');
                } else {
                    this.addTest('RLS (Segurança)', 'error', 'RLS permitindo acesso não autorizado a audit_logs');
                }
            }
        } catch (err) {
            this.addTest('RLS (Segurança)', 'error', 'Erro: ' + err.message);
        }
    },

    renderResults() {
        const container = document.getElementById('diagnostic-container');
        if (!container) return;

        const okCount = this.tests.filter(t => t.status === 'ok').length;
        const errorCount = this.tests.filter(t => t.status === 'error').length;
        const warningCount = this.tests.filter(t => t.status === 'warning' || t.status === 'skipped').length;

        let html = `
            <div style="margin-bottom: 20px;">
                <h4>Resultados dos Testes</h4>
                <div style="display: flex; gap: 16px; margin-top: 12px;">
                    <span class="badge badge-success">✓ ${okCount} OK</span>
                    <span class="badge badge-warning">⚠ ${warningCount} Avisos</span>
                    <span class="badge badge-danger">✕ ${errorCount} Erros</span>
                </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
        `;

        this.tests.forEach(test => {
            const icon = test.status === 'ok' ? '✓' : test.status === 'error' ? '✕' : '⚠';
            const color = test.status === 'ok' ? 'var(--success)' : test.status === 'error' ? 'var(--danger)' : 'var(--warning)';
            const bg = test.status === 'ok' ? 'var(--success-light)' : test.status === 'error' ? 'var(--danger-light)' : 'var(--warning-light)';

            html += `
                <div style="padding: 12px 16px; border-radius: var(--border-radius); background: ${bg}; border-left: 4px solid ${color};">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 700; color: ${color};">${icon}</span>
                        <span style="font-weight: 600;">${test.name}</span>
                        <span style="margin-left: auto; font-size: 12px; text-transform: uppercase; color: ${color};">${test.status}</span>
                    </div>
                    <p style="margin-top: 4px; font-size: 13px; color: var(--gray-700);">${test.message}</p>
                    ${test.details ? `<p class="text-muted" style="font-size: 12px; margin-top: 4px;">${test.details}</p>` : ''}
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }
};

window.DiagnosticModule = DiagnosticModule;
