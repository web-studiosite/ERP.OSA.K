/**
 * OSA - Reports Module
 */

const ReportsModule = {
    init() {
        this.renderReportsMenu();
    },

    renderReportsMenu() {
        const container = document.getElementById('reports-container');
        if (!container) return;

        const reports = [
            { id: 'sales', name: 'Relatório de Vendas', icon: '🛒', description: 'Vendas por período, produtos mais vendidos, faturamento' },
            { id: 'stock', name: 'Relatório de Estoque', icon: '📦', description: 'Saldos, movimentações, valor do estoque' },
            { id: 'movements', name: 'Relatório de Movimentações', icon: '📊', description: 'Entradas, saídas, transferências' },
            { id: 'cash', name: 'Relatório de Caixa', icon: '💰', description: 'Aberturas, fechamentos, diferenças' },
            { id: 'losses', name: 'Relatório de Perdas', icon: '⚠️', description: 'Perdas por período e produto' },
            { id: 'thefts', name: 'Relatório de Furtos', icon: '🚨', description: 'Furtos registrados' }
        ];

        let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">';

        reports.forEach(report => {
            html += `
                <div class="card" style="padding: 20px; cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'" onclick="ReportsModule.loadReport('${report.id}')">
                    <div style="font-size: 32px; margin-bottom: 12px;">${report.icon}</div>
                    <h4 style="font-weight: 600; margin-bottom: 8px;">${report.name}</h4>
                    <p class="text-muted" style="font-size: 13px;">${report.description}</p>
                </div>
            `;
        });

        html += '</div>';
        html += '<div id="report-content" style="margin-top: 24px;"></div>';

        container.innerHTML = html;
    },

    async loadReport(type) {
        const content = document.getElementById('report-content');
        if (!content) return;

        content.innerHTML = '<div class="empty-state"><div class="loading-spinner"></div><p>A gerar relatório...</p></div>';

        const filtersHtml = `
            <div class="filters-bar">
                <div class="filter-group">
                    <label>De</label>
                    <input type="date" id="report-date-from" value="${new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]}">
                </div>
                <div class="filter-group">
                    <label>Até</label>
                    <input type="date" id="report-date-to" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <button class="btn btn-primary btn-sm" onclick="ReportsModule.refreshReport('${type}')">Atualizar</button>
                <button class="btn btn-secondary btn-sm" onclick="ReportsModule.exportReport('${type}')">📥 Exportar CSV</button>
            </div>
        `;

        switch (type) {
            case 'sales':
                await this.loadSalesReport(content, filtersHtml);
                break;
            case 'stock':
                await this.loadStockReport(content, filtersHtml);
                break;
            case 'movements':
                await this.loadMovementsReport(content, filtersHtml);
                break;
            case 'cash':
                await this.loadCashReport(content, filtersHtml);
                break;
            case 'losses':
                await this.loadLossesReport(content, filtersHtml);
                break;
            case 'thefts':
                await this.loadTheftsReport(content, filtersHtml);
                break;
        }
    },

    async loadSalesReport(container, filters) {
        const from = document.getElementById('report-date-from')?.value;
        const to = document.getElementById('report-date-to')?.value;

        const result = await window.osaData.read('sales', {
            filters: {
                created_at: { gte: from ? new Date(from).toISOString() : undefined, lte: to ? new Date(to + 'T23:59:59').toISOString() : undefined }
            },
            select: '*, sale_items(*, products(name))'
        });

        if (!result.ok) {
            container.innerHTML = filters + `<p>Erro: ${result.error?.message}</p>`;
            return;
        }

        const sales = result.data;
        const total = sales.reduce((sum, s) => sum + parseFloat(s.final_amount || 0), 0);

        let html = filters;
        html += `
            <div class="stats-grid" style="margin-bottom: 20px;">
                <div class="stat-card">
                    <div class="stat-icon blue">💰</div>
                    <div class="stat-content">
                        <div class="stat-label">Total Vendas</div>
                        <div class="stat-value">${window.osaUI.formatCurrency(total)}</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon green">🛒</div>
                    <div class="stat-content">
                        <div class="stat-label">Nº de Vendas</div>
                        <div class="stat-value">${sales.length}</div>
                    </div>
                </div>
            </div>
        `;

        html += '<div id="report-table"></div>';
        container.innerHTML = html;

        window.osaUI.renderTable('report-table', sales, [
            { key: 'created_at', label: 'Data', format: (v) => window.osaUI.formatDateTime(v) },
            { key: 'customer_name', label: 'Cliente', format: (v) => v || '-' },
            { key: 'final_amount', label: 'Total', format: (v) => window.osaUI.formatCurrency(v) },
            { key: 'payment_method', label: 'Pagamento' }
        ]);
    },

    async loadStockReport(container, filters) {
        const result = await window.osaData.read('products', {
            filters: { is_active: true },
            select: '*, categories(name)'
        });

        if (!result.ok) {
            container.innerHTML = filters + `<p>Erro: ${result.error?.message}</p>`;
            return;
        }

        const products = result.data;

        // Calcular saldos
        const stockData = [];
        for (const product of products) {
            const warehouseResult = await window.osaData.getStockBalance(product.id, 'warehouse');
            const storeResult = await window.osaData.getStockBalance(product.id, 'store');

            stockData.push({
                ...product,
                warehouse_qty: warehouseResult.ok ? parseFloat(warehouseResult.data) : 0,
                store_qty: storeResult.ok ? parseFloat(storeResult.data) : 0
            });
        }

        let html = filters;
        html += '<div id="report-table"></div>';
        container.innerHTML = html;

        window.osaUI.renderTable('report-table', stockData, [
            { key: 'code', label: 'Código' },
            { key: 'name', label: 'Produto' },
            { key: 'categories', label: 'Categoria', format: (v) => v?.name || '-' },
            { key: 'warehouse_qty', label: 'Armazém', format: (v) => window.osaUI.formatNumber(v, 3) },
            { key: 'store_qty', label: 'Loja', format: (v) => window.osaUI.formatNumber(v, 3) },
            { key: 'cost_price', label: 'Custo', format: (v) => window.osaUI.formatCurrency(v) },
            { key: 'sale_price', label: 'Venda', format: (v) => window.osaUI.formatCurrency(v) }
        ]);
    },

    async loadMovementsReport(container, filters) {
        const from = document.getElementById('report-date-from')?.value;
        const to = document.getElementById('report-date-to')?.value;

        const result = await window.osaData.read('stock_movements', {
            filters: {
                created_at: { gte: from ? new Date(from).toISOString() : undefined, lte: to ? new Date(to + 'T23:59:59').toISOString() : undefined }
            },
            select: '*, products(name, code)',
            orderBy: { column: 'created_at', ascending: false }
        });

        if (!result.ok) {
            container.innerHTML = filters + `<p>Erro: ${result.error?.message}</p>`;
            return;
        }

        let html = filters;
        html += '<div id="report-table"></div>';
        container.innerHTML = html;

        window.osaUI.renderTable('report-table', result.data, [
            { key: 'created_at', label: 'Data', format: (v) => window.osaUI.formatDateTime(v) },
            { key: 'movement_type', label: 'Tipo', format: (v) => ({
                entry: 'Entrada', transfer_in: 'Transferência Entrada', transfer_out: 'Transferência Saída',
                sale: 'Venda', return: 'Devolução', loss: 'Perda', theft: 'Furto', inventory_adjustment: 'Ajuste'
            }[v] || v) },
            { key: 'products', label: 'Produto', format: (v) => v?.name || '-' },
            { key: 'quantity', label: 'Qtd' },
            { key: 'origin', label: 'Origem' },
            { key: 'destination', label: 'Destino' }
        ]);
    },

    async loadCashReport(container, filters) {
        const result = await window.osaData.read('cash_registers', {
            select: '*, profiles(full_name)',
            orderBy: { column: 'opened_at', ascending: false }
        });

        if (!result.ok) {
            container.innerHTML = filters + `<p>Erro: ${result.error?.message}</p>`;
            return;
        }

        let html = filters;
        html += '<div id="report-table"></div>';
        container.innerHTML = html;

        window.osaUI.renderTable('report-table', result.data, [
            { key: 'opened_at', label: 'Abertura', format: (v) => window.osaUI.formatDateTime(v) },
            { key: 'closed_at', label: 'Fechamento', format: (v) => v ? window.osaUI.formatDateTime(v) : '-' },
            { key: 'opening_amount', label: 'Abertura', format: (v) => window.osaUI.formatCurrency(v) },
            { key: 'actual_amount', label: 'Fechamento', format: (v) => window.osaUI.formatCurrency(v) },
            { key: 'difference_amount', label: 'Diferença', format: (v) => window.osaUI.formatCurrency(v) },
            { key: 'status', label: 'Estado', format: (v) => v === 'open' ? 'Aberto' : 'Fechado' }
        ]);
    },

    async loadLossesReport(container, filters) {
        const from = document.getElementById('report-date-from')?.value;
        const to = document.getElementById('report-date-to')?.value;

        const result = await window.osaData.read('losses', {
            filters: {
                created_at: { gte: from ? new Date(from).toISOString() : undefined, lte: to ? new Date(to + 'T23:59:59').toISOString() : undefined }
            },
            select: '*, products(name, code)'
        });

        if (!result.ok) {
            container.innerHTML = filters + `<p>Erro: ${result.error?.message}</p>`;
            return;
        }

        let html = filters;
        html += '<div id="report-table"></div>';
        container.innerHTML = html;

        window.osaUI.renderTable('report-table', result.data, [
            { key: 'created_at', label: 'Data', format: (v) => window.osaUI.formatDateTime(v) },
            { key: 'products', label: 'Produto', format: (v) => v?.name || '-' },
            { key: 'quantity', label: 'Qtd' },
            { key: 'location', label: 'Local', format: (v) => v === 'warehouse' ? 'Armazém' : 'Loja' },
            { key: 'reason', label: 'Motivo' }
        ]);
    },

    async loadTheftsReport(container, filters) {
        const from = document.getElementById('report-date-from')?.value;
        const to = document.getElementById('report-date-to')?.value;

        const result = await window.osaData.read('thefts', {
            filters: {
                created_at: { gte: from ? new Date(from).toISOString() : undefined, lte: to ? new Date(to + 'T23:59:59').toISOString() : undefined }
            },
            select: '*, products(name, code)'
        });

        if (!result.ok) {
            container.innerHTML = filters + `<p>Erro: ${result.error?.message}</p>`;
            return;
        }

        let html = filters;
        html += '<div id="report-table"></div>';
        container.innerHTML = html;

        window.osaUI.renderTable('report-table', result.data, [
            { key: 'theft_date', label: 'Data', format: (v) => window.osaUI.formatDate(v) },
            { key: 'products', label: 'Produto', format: (v) => v?.name || '-' },
            { key: 'quantity', label: 'Qtd' },
            { key: 'location', label: 'Local', format: (v) => v === 'warehouse' ? 'Armazém' : 'Loja' },
            { key: 'reference', label: 'Referência' }
        ]);
    },

    refreshReport(type) {
        this.loadReport(type);
    },

    exportReport(type) {
        const table = document.querySelector('.data-table');
        if (!table) {
            window.osaUI.showWarning('Nenhum dado para exportar');
            return;
        }

        let csv = '';
        const rows = table.querySelectorAll('tr');

        rows.forEach(row => {
            const cells = row.querySelectorAll('th, td');
            const rowData = Array.from(cells).map(cell => `"${cell.textContent.trim().replace(/"/g, '""')}"`).join(';');
            csv += rowData + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `relatorio_${type}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        window.osaUI.showSuccess('Relatório exportado');
    }
};

window.ReportsModule = ReportsModule;
