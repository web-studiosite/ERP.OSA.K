/**
 * OSA - OFFICIAL SHOP ADMINISTRATOR
 * Sistema de Autenticação
 */

class AuthManager {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.currentProfile = null;
        this.userStores = [];
        this.currentStore = null;
    }

    async init() {
        this.supabase = window.osaSupabase.getClient();
        
        // Verificar sessão existente
        const { data: { session } } = await this.supabase.auth.getSession();
        if (session) {
            await this.loadUserData(session.user);
        }
        
        // Escutar mudanças de auth
        this.supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                await this.loadUserData(session.user);
            } else if (event === 'SIGNED_OUT') {
                this.clearUserData();
            }
        });
    }

    async loadUserData(user) {
        this.currentUser = user;
        
        // Carregar perfil
        const { data: profile, error: profileError } = await this.supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        
        if (profileError) {
            console.error('Erro ao carregar perfil:', profileError);
            return;
        }
        
        this.currentProfile = profile;
        
        // Carregar lojas do utilizador
        const { data: stores, error: storesError } = await this.supabase
            .from('store_users')
            .select(`
                store_id,
                is_default,
                stores:store_id (*)
            `)
            .eq('user_id', user.id);
        
        if (storesError) {
            console.error('Erro ao carregar lojas:', storesError);
            return;
        }
        
        this.userStores = stores.map(s => ({
            ...s.stores,
            is_default: s.is_default
        }));
        
        // Definir loja atual
        const savedStoreId = localStorage.getItem(OSA_CONFIG.STORAGE_KEYS.CURRENT_STORE);
        if (savedStoreId && this.userStores.find(s => s.id === savedStoreId)) {
            this.currentStore = this.userStores.find(s => s.id === savedStoreId);
        } else if (this.userStores.length > 0) {
            const defaultStore = this.userStores.find(s => s.is_default) || this.userStores[0];
            this.currentStore = defaultStore;
            localStorage.setItem(OSA_CONFIG.STORAGE_KEYS.CURRENT_STORE, defaultStore.id);
        }
        
        // Disparar evento
        window.dispatchEvent(new CustomEvent('osa:auth:ready', { 
            detail: { user: this.currentUser, profile: this.currentProfile, stores: this.userStores }
        }));
    }

    clearUserData() {
        this.currentUser = null;
        this.currentProfile = null;
        this.userStores = [];
        this.currentStore = null;
        localStorage.removeItem(OSA_CONFIG.STORAGE_KEYS.CURRENT_STORE);
        window.dispatchEvent(new CustomEvent('osa:auth:signedout'));
    }

    async login(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) throw error;
            
            return { ok: true, user: data.user };
        } catch (err) {
            return { ok: false, error: err.message, status: err.status };
        }
    }

    async register(email, password, fullName, role = 'cashier') {
        try {
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        role: role
                    }
                }
            });
            
            if (error) throw error;
            
            return { ok: true, user: data.user };
        } catch (err) {
            return { ok: false, error: err.message, status: err.status };
        }
    }

    async logout() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
            this.clearUserData();
            return { ok: true };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    }

    async resetPassword(email) {
        try {
            const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/reset-password.html'
            });
            if (error) throw error;
            return { ok: true };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    }

    async updatePassword(newPassword) {
        try {
            const { error } = await this.supabase.auth.updateUser({
                password: newPassword
            });
            if (error) throw error;
            return { ok: true };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    }

    // Verificar role
    hasRole(role) {
        if (!this.currentProfile) return false;
        if (role === 'any') return true;
        if (role === 'admin') return this.currentProfile.role === 'admin';
        if (role === 'junior_admin') return ['admin', 'junior_admin'].includes(this.currentProfile.role);
        if (role === 'cashier') return ['admin', 'junior_admin', 'cashier'].includes(this.currentProfile.role);
        return this.currentProfile.role === role;
    }

    // Trocar loja atual
    async switchStore(storeId) {
        const store = this.userStores.find(s => s.id === storeId);
        if (store) {
            this.currentStore = store;
            localStorage.setItem(OSA_CONFIG.STORAGE_KEYS.CURRENT_STORE, storeId);
            window.dispatchEvent(new CustomEvent('osa:store:changed', { detail: { store } }));
            return { ok: true };
        }
        return { ok: false, error: 'Loja não encontrada' };
    }

    // Verificar se está autenticado
    isAuthenticated() {
        return !!this.currentUser;
    }

    // Verificar se pode ver custos
    canViewCosts() {
        return this.hasRole('junior_admin');
    }

    // Verificar se pode ver lucros
    canViewProfits() {
        return this.hasRole('admin');
    }
}

// Instância global
window.osaAuth = new AuthManager();
