/**
 * OSA - OFFICIAL SHOP ADMINISTRATOR
 * Configuração Central
 * 
 * IMPORTANTE: Substitua pelos seus dados reais do Supabase
 */

const OSA_CONFIG = {
    // Supabase
    SUPABASE_URL: 'https://bhwudbpzoksqhrzcvnuh.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJod3VkYnB6b2tzcWhyemN2bnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNTQ3NDgsImV4cCI6MjEwMzgzMDc0OH0.2KmB3t8pjTPM_mCRVY4f5-7jS15dwk1qVJ8RA-qkmaA',
    
    // App
    APP_NAME: 'OSA',
    APP_FULL_NAME: 'OFFICIAL SHOP ADMINISTRATOR',
    VERSION: '1.0.0',
    
    // Moeda e Locale
    CURRENCY: 'MZN',
    LOCALE: 'pt-MZ',
    
    // Paginação
    DEFAULT_PAGE_SIZE: 20,
    
    // Storage keys (apenas para sessão/token temporário)
    STORAGE_KEYS: {
        SESSION: 'osa_session',
        CURRENT_STORE: 'osa_current_store',
        PREFERENCES: 'osa_preferences'
    }
};

// Exportar para uso global
window.OSA_CONFIG = OSA_CONFIG;
