/**
 * OSA - OFFICIAL SHOP ADMINISTRATOR
 * Camada de Dados Centralizada (CRUD Real)
 * 
 * REGRA: Todas as operações DEVEM ser confirmadas pelo Supabase
 * antes de retornar sucesso.
 */

class DataLayer {
    constructor() {
        this.supabase = null;
    }

    init() {
        this.supabase = window.osaSupabase.getClient();
    }

    // ============================================================
    // MÉTODOS AUXILIARES
    // ============================================================

    _getCurrentStoreId() {
        return window.osaAuth?.currentStore?.id || null;
    }

    _getCurrentUserId() {
        return window.osaAuth?.currentUser?.id || null;
    }

    _handleError(operation, table, error) {
        const errorInfo = {
            operation,
            table,
            message: error?.message || 'Erro desconhecido',
            code: error?.code,
            details: error?.details,
            hint: error?.hint
        };
        console.error(`[OSA DataLayer] ${operation} em ${table}:`, errorInfo);
        return errorInfo;
    }

    // ============================================================
    // CREATE - Só retorna ok:true quando o registro é confirmado
    // ============================================================

    async create(table, data, options = {}) {
        try {
            if (!this.supabase) this.init();
            
            const storeId = options.store_id || this._getCurrentStoreId();
            if (storeId && !data.store_id) {
                data.store_id = storeId;
            }
            
            const { data: result, error } = await this.supabase
                .from(table)
                .insert(data)
                .select()
                .single();
            
            if (error) throw error;
            
            // CONFIRMAÇÃO REAL: verificar se retornou ID válido
            if (!result || !result.id) {
                return { 
                    ok: false, 
                    error: 'Operação aceita mas nenhum registro foi devolvido pelo PostgreSQL',
                    operation: 'CREATE',
                    table
                };
            }
            
            return { ok: true, data: result };
        } catch (err) {
            return { ok: false, error: this._handleError('CREATE', table, err) };
        }
    }

    // ============================================================
    // READ - Apenas dados reais do Supabase
    // ============================================================

    async read(table, options = {}) {
        try {
            if (!this.supabase) this.init();
            
            let query = this.supabase.from(table).select(options.select || '*');
            
            // Filtro por loja
            const storeId = options.store_id || this._getCurrentStoreId();
            if (storeId && options.useStoreFilter !== false) {
                query = query.eq('store_id', storeId);
            }
            
            // Filtros adicionais
            if (options.filters) {
                for (const [key, value] of Object.entries(options.filters)) {
                    if (Array.isArray(value)) {
                        query = query.in(key, value);
                    } else if (typeof value === 'object' && value !== null) {
                        if (value.gte) query = query.gte(key, value.gte);
                        if (value.lte) query = query.lte(key, value.lte);
                        if (value.gt) query = query.gt(key, value.gt);
                        if (value.lt) query = query.lt(key, value.lt);
                        if (value.like) query = query.ilike(key, `%${value.like}%`);
                        if (value.neq) query = query.neq(key, value.neq);
                    } else {
                        query = query.eq(key, value);
                    }
                }
            }
            
            // Ordenação
            if (options.orderBy) {
                const { column, ascending = false } = options.orderBy;
                query = query.order(column, { ascending });
            } else {
                query = query.order('created_at', { ascending: false });
            }
            
            // Paginação
            if (options.page !== undefined && options.pageSize) {
                const from = options.page * options.pageSize;
                const to = from + options.pageSize - 1;
                query = query.range(from, to);
            }
            
            // Limite
            if (options.limit) {
                query = query.limit(options.limit);
            }
            
            const { data, error, count } = await query;
            
            if (error) throw error;
            
            return { ok: true, data: data || [], count };
        } catch (err) {
            return { ok: false, error: this._handleError('READ', table, err), data: [] };
        }
    }

    // Ler um único registro
    async readOne(table, id, options = {}) {
        try {
            if (!this.supabase) this.init();
            
            let query = this.supabase.from(table).select(options.select || '*').eq('id', id);
            
            const storeId = options.store_id || this._getCurrentStoreId();
            if (storeId && options.useStoreFilter !== false) {
                query = query.eq('store_id', storeId);
            }
            
            const { data, error } = await query.single();
            
            if (error) throw error;
            
            return { ok: true, data };
        } catch (err) {
            return { ok: false, error: this._handleError('READ_ONE', table, err) };
        }
    }

    // ============================================================
    // UPDATE - Só retorna sucesso com registro atualizado confirmado
    // ============================================================

    async update(table, id, data, options = {}) {
        try {
            if (!this.supabase) this.init();
            
            const storeId = options.store_id || this._getCurrentStoreId();
            
            let query = this.supabase.from(table).update(data).eq('id', id);
            
            if (storeId && options.useStoreFilter !== false) {
                query = query.eq('store_id', storeId);
            }
            
            const { data: result, error } = await query.select().single();
            
            if (error) throw error;
            
            // CONFIRMAÇÃO REAL: verificar se retornou o registro
            if (!result || result.id !== id) {
                return {
                    ok: false,
                    error: 'UPDATE aceito mas registro não foi confirmado ou ID não corresponde',
                    operation: 'UPDATE',
                    table
                };
            }
            
            return { ok: true, data: result };
        } catch (err) {
            return { ok: false, error: this._handleError('UPDATE', table, err) };
        }
    }

    // ============================================================
    // DELETE - Confirma eliminação real
    // ============================================================

    async delete(table, id, options = {}) {
        try {
            if (!this.supabase) this.init();
            
            const storeId = options.store_id || this._getCurrentStoreId();
            
            let query = this.supabase.from(table).delete().eq('id', id);
            
            if (storeId && options.useStoreFilter !== false) {
                query = query.eq('store_id', storeId);
            }
            
            const { data: deleted, error } = await query.select();
            
            if (error) throw error;
            
            // CONFIRMAÇÃO REAL: verificar se algo foi eliminado
            if (!deleted || deleted.length === 0) {
                return {
                    ok: false,
                    error: 'DELETE aceito mas nenhum registro foi eliminado',
                    operation: 'DELETE',
                    table
                };
            }
            
            // Verificação adicional: tentar ler o registro (deve falhar)
            const { data: checkData, error: checkError } = await this.supabase
                .from(table)
                .select('id')
                .eq('id', id)
                .single();
            
            if (checkData) {
                return {
                    ok: false,
                    error: 'Registro ainda existe após DELETE',
                    operation: 'DELETE',
                    table
                };
            }
            
            return { ok: true, data: deleted[0] };
        } catch (err) {
            return { ok: false, error: this._handleError('DELETE', table, err) };
        }
    }

    // ============================================================
    // COUNT
    // ============================================================

    async count(table, options = {}) {
        try {
            if (!this.supabase) this.init();
            
            let query = this.supabase.from(table).select('*', { count: 'exact', head: true });
            
            const storeId = options.store_id || this._getCurrentStoreId();
            if (storeId && options.useStoreFilter !== false) {
                query = query.eq('store_id', storeId);
            }
            
            if (options.filters) {
                for (const [key, value] of Object.entries(options.filters)) {
                    if (Array.isArray(value)) {
                        query = query.in(key, value);
                    } else {
                        query = query.eq(key, value);
                    }
                }
            }
            
            const { count, error } = await query;
            
            if (error) throw error;
            
            return { ok: true, count: count || 0 };
        } catch (err) {
            return { ok: false, error: this._handleError('COUNT', table, err), count: 0 };
        }
    }

    // ============================================================
    // OPERAÇÕES ESPECIALIZADAS
    // ============================================================

    // Executar função RPC
    async rpc(functionName, params = {}) {
        try {
            if (!this.supabase) this.init();
            
            const { data, error } = await this.supabase.rpc(functionName, params);
            
            if (error) throw error;
            
            return { ok: true, data };
        } catch (err) {
            return { ok: false, error: this._handleError('RPC', functionName, err) };
        }
    }

    // Upload de arquivo
    async uploadFile(bucket, path, file) {
        try {
            if (!this.supabase) this.init();
            
            const { data, error } = await this.supabase.storage
                .from(bucket)
                .upload(path, file, {
                    cacheControl: '3600',
                    upsert: true
                });
            
            if (error) throw error;
            
            const { data: { publicUrl } } = this.supabase.storage
                .from(bucket)
                .getPublicUrl(data.path);
            
            return { ok: true, url: publicUrl, path: data.path };
        } catch (err) {
            return { ok: false, error: this._handleError('UPLOAD', bucket, err) };
        }
    }

    // ============================================================
    // CONSULTAS ESPECÍFICAS DO OSA
    // ============================================================

    // Obter saldo de estoque
    async getStockBalance(productId, location = 'warehouse') {
        return this.rpc('get_stock_balance', {
            p_store_id: this._getCurrentStoreId(),
            p_product_id: productId,
            p_location: location
        });
    }

    // Dashboard stats
    async getDashboardStats(period = 'today') {
        const storeId = this._getCurrentStoreId();
        if (!storeId) return { ok: false, error: 'Nenhuma loja selecionada' };
        
        let dateFilter = {};
        const now = new Date();
        
        switch (period) {
            case 'today':
                dateFilter = { gte: now.toISOString().split('T')[0] };
                break;
            case 'yesterday':
                const yesterday = new Date(now);
                yesterday.setDate(yesterday.getDate() - 1);
                dateFilter = { 
                    gte: yesterday.toISOString().split('T')[0],
                    lt: now.toISOString().split('T')[0]
                };
                break;
            case 'week':
                const weekAgo = new Date(now);
                weekAgo.setDate(weekAgo.getDate() - 7);
                dateFilter = { gte: weekAgo.toISOString() };
                break;
            case 'month':
                const monthAgo = new Date(now);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                dateFilter = { gte: monthAgo.toISOString() };
                break;
        }
        
        try {
            // Vendas do período
            let salesQuery = this.supabase.from('sales').select('total_amount, final_amount').eq('store_id', storeId);
            if (dateFilter.gte) salesQuery = salesQuery.gte('created_at', dateFilter.gte);
            if (dateFilter.lt) salesQuery = salesQuery.lt('created_at', dateFilter.lt);
            
            const { data: sales, error: salesError } = await salesQuery;
            if (salesError) throw salesError;
            
            // Total de produtos
            const { count: productsCount, error: productsError } = await this.supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('store_id', storeId)
                .eq('is_active', true);
            if (productsError) throw productsError;
            
            // Movimentações
            let movementsQuery = this.supabase.from('stock_movements').select('movement_type, quantity, total_cost').eq('store_id', storeId);
            if (dateFilter.gte) movementsQuery = movementsQuery.gte('created_at', dateFilter.gte);
            if (dateFilter.lt) movementsQuery = movementsQuery.lt('created_at', dateFilter.lt);
            
            const { data: movements, error: movementsError } = await movementsQuery;
            if (movementsError) throw movementsError;
            
            // Caixa aberto
            const { data: cashRegister, error: cashError } = await this.supabase
                .from('cash_registers')
                .select('*')
                .eq('store_id', storeId)
                .eq('status', 'open')
                .order('opened_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            
            const totalSales = sales?.reduce((sum, s) => sum + (parseFloat(s.final_amount) || 0), 0) || 0;
            const totalEntries = movements?.filter(m => m.movement_type === 'entry').reduce((sum, m) => sum + (parseFloat(m.total_cost) || 0), 0) || 0;
            const totalTransfers = movements?.filter(m => m.movement_type === 'transfer_out').reduce((sum, m) => sum + (parseFloat(m.total_cost) || 0), 0) || 0;
            
            return {
                ok: true,
                data: {
                    totalSales,
                    salesCount: sales?.length || 0,
                    totalEntries,
                    totalTransfers,
                    productsCount: productsCount || 0,
                    movementsCount: movements?.length || 0,
                    cashRegister: cashRegister || null
                }
            };
        } catch (err) {
            return { ok: false, error: this._handleError('DASHBOARD', 'stats', err) };
        }
    }

    // Vendas por dia (para gráficos)
    async getSalesByDays(days = 7) {
        const storeId = this._getCurrentStoreId();
        if (!storeId) return { ok: false, error: 'Nenhuma loja selecionada' };
        
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            
            const { data, error } = await this.supabase
                .from('sales')
                .select('created_at, final_amount')
                .eq('store_id', storeId)
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: true });
            
            if (error) throw error;
            
            // Agrupar por dia
            const grouped = {};
            data?.forEach(sale => {
                const date = sale.created_at.split('T')[0];
                if (!grouped[date]) grouped[date] = { date, amount: 0, count: 0 };
                grouped[date].amount += parseFloat(sale.final_amount) || 0;
                grouped[date].count += 1;
            });
            
            return { ok: true, data: Object.values(grouped) };
        } catch (err) {
            return { ok: false, error: this._handleError('CHART', 'sales_by_day', err) };
        }
    }

    // Produtos mais vendidos
    async getTopProducts(limit = 5) {
        const storeId = this._getCurrentStoreId();
        if (!storeId) return { ok: false, error: 'Nenhuma loja selecionada' };
        
        try {
            const { data, error } = await this.supabase
                .from('sale_items')
                .select(`
                    product_id,
                    quantity,
                    products:product_id (name, code)
                `)
                .eq('store_id', storeId)
                .order('quantity', { ascending: false })
                .limit(limit);
            
            if (error) throw error;
            
            return { ok: true, data: data || [] };
        } catch (err) {
            return { ok: false, error: this._handleError('CHART', 'top_products', err) };
        }
    }
}

// Instância global
window.osaData = new DataLayer();
