/**
 * OSA - OFFICIAL SHOP ADMINISTRATOR
 * Cliente Supabase Centralizado
 */

class SupabaseClient {
    constructor() {
        this.client = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return this.client;
        
        if (!window.supabase) {
            throw new Error('Biblioteca Supabase não carregada. Inclua o CDN do Supabase.');
        }
        
        if (!OSA_CONFIG.SUPABASE_URL || OSA_CONFIG.SUPABASE_URL.includes('seu-projeto')) {
            console.warn('⚠️ SUPABASE_URL não configurado. Configure em js/config.js');
        }
        
        this.client = window.supabase.createClient(
            OSA_CONFIG.SUPABASE_URL,
            OSA_CONFIG.SUPABASE_ANON_KEY,
            {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: true
                },
                db: {
                    schema: 'public'
                }
            }
        );
        
        this.initialized = true;
        return this.client;
    }

    getClient() {
        if (!this.initialized) {
            return this.init();
        }
        return this.client;
    }

    // Verificar conexão
    async checkConnection() {
        try {
            const { data, error } = await this.client.from('stores').select('count').limit(1);
            if (error) throw error;
            return { ok: true, message: 'Conexão estabelecida' };
        } catch (err) {
            return { ok: false, message: err.message, status: err.status };
        }
    }
}

// Instância global
window.osaSupabase = new SupabaseClient();
