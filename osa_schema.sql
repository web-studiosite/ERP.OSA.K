-- ============================================================
-- OSA - OFFICIAL SHOP ADMINISTRATOR
-- SCHEMA COMPLETO - PostgreSQL/Supabase
-- ============================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. TABELA DE LOJAS (stores)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    cover_url TEXT,
    accent_color VARCHAR(7) DEFAULT '#2563eb',
    is_active BOOLEAN DEFAULT true,
    currency VARCHAR(3) DEFAULT 'MZN',
    locale VARCHAR(10) DEFAULT 'pt-MZ',
    default_margin DECIMAL(5,2) DEFAULT 25.00,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. TABELA DE PERFIS DE UTILIZADORES (users/profiles)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    role VARCHAR(50) DEFAULT 'cashier' CHECK (role IN ('admin', 'junior_admin', 'cashier')),
    is_active BOOLEAN DEFAULT true,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. TABELA DE ASSOCIAÇÃO UTILIZADOR-LOJA (store_users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.store_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, user_id)
);

-- ============================================================
-- 4. TABELA DE CATEGORIAS (categories)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, name)
);

-- ============================================================
-- 5. TABELA DE PRODUTOS (products)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit VARCHAR(50) DEFAULT 'un',
    cost_price DECIMAL(12,2) DEFAULT 0,
    pricing_method VARCHAR(20) DEFAULT 'margin' CHECK (pricing_method IN ('margin', 'direct')),
    margin_percent DECIMAL(5,2) DEFAULT 25.00,
    sale_price DECIMAL(12,2) DEFAULT 0,
    location VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, code)
);

-- ============================================================
-- 6. TABELA DE MOVIMENTAÇÕES DE ESTOQUE (stock_movements)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN (
        'entry', 'transfer_in', 'transfer_out', 'sale', 'return', 
        'loss', 'theft', 'inventory_adjustment', 'correction'
    )),
    origin VARCHAR(100),
    destination VARCHAR(100),
    quantity DECIMAL(12,3) NOT NULL,
    unit_cost DECIMAL(12,2) DEFAULT 0,
    total_cost DECIMAL(12,2) DEFAULT 0,
    reference_id UUID,
    reference_type VARCHAR(50),
    user_id UUID REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. TABELA DE TRANSFERÊNCIAS (transfers)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    origin VARCHAR(100) NOT NULL CHECK (origin IN ('warehouse', 'store')),
    destination VARCHAR(100) NOT NULL CHECK (destination IN ('warehouse', 'store')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    user_id UUID REFERENCES public.profiles(id),
    reference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (origin != destination)
);

-- ============================================================
-- 8. TABELA DE ITENS DE TRANSFERÊNCIA (transfer_items)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.transfer_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_id UUID NOT NULL REFERENCES public.transfers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity DECIMAL(12,3) NOT NULL CHECK (quantity > 0),
    unit_cost DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. TABELA DE VENDAS (sales)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    cash_register_id UUID,
    user_id UUID REFERENCES public.profiles(id),
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    final_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(50) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'mpesa', 'bank_transfer', 'other')),
    payment_status VARCHAR(50) DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'partial')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. TABELA DE ITENS DE VENDA (sale_items)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity DECIMAL(12,3) NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    cost_price DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. TABELA DE CAIXAS (cash_registers)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cash_registers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id),
    opening_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    expected_amount DECIMAL(12,2) DEFAULT 0,
    actual_amount DECIMAL(12,2) DEFAULT 0,
    difference_amount DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. TABELA DE MOVIMENTOS DE CAIXA (cash_movements)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cash_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    cash_register_id UUID NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
    movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN ('sale', 'entry', 'withdrawal', 'expense', 'adjustment')),
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    user_id UUID REFERENCES public.profiles(id),
    reference_id UUID,
    reference_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 13. TABELA DE INVENTÁRIOS (inventories)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.inventories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    location VARCHAR(100) NOT NULL CHECK (location IN ('warehouse', 'store', 'general')),
    status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
    user_id UUID REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- ============================================================
-- 14. TABELA DE ITENS DE INVENTÁRIO (inventory_items)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_id UUID NOT NULL REFERENCES public.inventories(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    expected_quantity DECIMAL(12,3) DEFAULT 0,
    counted_quantity DECIMAL(12,3) DEFAULT 0,
    difference DECIMAL(12,3) DEFAULT 0,
    unit_cost DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(inventory_id, product_id)
);

-- ============================================================
-- 15. TABELA DE PERDAS (losses)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.losses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity DECIMAL(12,3) NOT NULL CHECK (quantity > 0),
    location VARCHAR(100) NOT NULL CHECK (location IN ('warehouse', 'store')),
    reason TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 16. TABELA DE FURTOS (thefts)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.thefts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity DECIMAL(12,3) NOT NULL CHECK (quantity > 0),
    location VARCHAR(100) NOT NULL CHECK (location IN ('warehouse', 'store')),
    theft_date DATE NOT NULL DEFAULT CURRENT_DATE,
    user_id UUID REFERENCES public.profiles(id),
    reference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 17. TABELA DE REGISTOS DE COMBUSTÍVEL (fuel_records)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fuel_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    vehicle_plate VARCHAR(50),
    liters DECIMAL(8,2) NOT NULL,
    price_per_liter DECIMAL(8,2) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    mileage INTEGER,
    user_id UUID REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 18. TABELA DE FECHAMENTOS DIÁRIOS (daily_closings)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.daily_closings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    closing_date DATE NOT NULL,
    total_sales DECIMAL(12,2) DEFAULT 0,
    total_entries DECIMAL(12,2) DEFAULT 0,
    total_transfers DECIMAL(12,2) DEFAULT 0,
    total_losses DECIMAL(12,2) DEFAULT 0,
    total_thefts DECIMAL(12,2) DEFAULT 0,
    cash_opening DECIMAL(12,2) DEFAULT 0,
    cash_closing DECIMAL(12,2) DEFAULT 0,
    cash_difference DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'closed' CHECK (status IN ('closed', 'reopened')),
    user_id UUID REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, closing_date)
);

-- ============================================================
-- 19. TABELA DE LOGS DE AUDITORIA (audit_logs)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id),
    operation VARCHAR(50) NOT NULL CHECK (operation IN ('CREATE', 'READ', 'UPDATE', 'DELETE', 'TRANSFER', 'SALE', 'INVENTORY', 'ADJUSTMENT', 'LOSS', 'THEFT', 'CLOSING')),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 20. TABELA DE CONFIGURAÇÕES (configs)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    config_key VARCHAR(100) NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, config_key)
);

-- ============================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_stock_movements_store ON public.stock_movements(store_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON public.stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON public.stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_store ON public.sales(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_user ON public.sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_created ON public.sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON public.sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_transfers_store ON public.transfers(store_id);
CREATE INDEX IF NOT EXISTS idx_transfer_items_transfer ON public.transfer_items(transfer_id);
CREATE INDEX IF NOT EXISTS idx_cash_registers_store ON public.cash_registers(store_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_register ON public.cash_movements(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_inventory ON public.inventory_items(inventory_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_store ON public.audit_logs(store_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_products_store ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_code ON public.products(code);
CREATE INDEX IF NOT EXISTS idx_losses_store ON public.losses(store_id);
CREATE INDEX IF NOT EXISTS idx_thefts_store ON public.thefts(store_id);

-- ============================================================
-- FUNÇÕES AUXILIARES
-- ============================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_stores_updated_at ON public.stores;
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_transfers_updated_at ON public.transfers;
CREATE TRIGGER update_transfers_updated_at BEFORE UPDATE ON public.transfers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_configs_updated_at ON public.configs;
CREATE TRIGGER update_configs_updated_at BEFORE UPDATE ON public.configs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- FUNÇÃO: Calcular saldo de estoque por localização
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_stock_balance(
    p_store_id UUID,
    p_product_id UUID,
    p_location VARCHAR(100) DEFAULT NULL
)
RETURNS DECIMAL(12,3) AS $$
DECLARE
    v_balance DECIMAL(12,3);
BEGIN
    SELECT COALESCE(SUM(
        CASE 
            WHEN movement_type IN ('entry', 'transfer_in', 'return', 'inventory_adjustment') THEN quantity
            WHEN movement_type IN ('sale', 'transfer_out', 'loss', 'theft', 'correction') THEN -quantity
            ELSE 0
        END
    ), 0)
    INTO v_balance
    FROM public.stock_movements
    WHERE store_id = p_store_id
      AND product_id = p_product_id
      AND (p_location IS NULL OR destination = p_location OR origin = p_location);
    
    RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNÇÃO: Registrar log de auditoria
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_audit(
    p_store_id UUID,
    p_user_id UUID,
    p_operation VARCHAR(50),
    p_table_name VARCHAR(100),
    p_record_id UUID,
    p_old_data JSONB DEFAULT NULL,
    p_new_data JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.audit_logs (store_id, user_id, operation, table_name, record_id, old_data, new_data)
    VALUES (p_store_id, p_user_id, p_operation, p_table_name, p_record_id, p_old_data, p_new_data);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNÇÃO: Processar venda completa (transação)
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_sale(
    p_store_id UUID,
    p_user_id UUID,
    p_cash_register_id UUID,
    p_customer_name VARCHAR(255),
    p_customer_phone VARCHAR(50),
    p_payment_method VARCHAR(50),
    p_notes TEXT,
    p_items JSONB
)
RETURNS UUID AS $$
DECLARE
    v_sale_id UUID;
    v_item JSONB;
    v_product_id UUID;
    v_quantity DECIMAL(12,3);
    v_unit_price DECIMAL(12,2);
    v_unit_cost DECIMAL(12,2);
    v_total_amount DECIMAL(12,2) := 0;
    v_final_amount DECIMAL(12,2) := 0;
    v_stock_balance DECIMAL(12,3);
BEGIN
    -- Calcular total
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity')::DECIMAL;
        v_unit_price := (v_item->>'unit_price')::DECIMAL;
        
        -- Verificar estoque
        SELECT COALESCE(SUM(
            CASE WHEN movement_type IN ('entry', 'transfer_in', 'return') THEN quantity
                 WHEN movement_type IN ('sale', 'transfer_out', 'loss', 'theft') THEN -quantity
                 ELSE 0 END
        ), 0)
        INTO v_stock_balance
        FROM public.stock_movements
        WHERE store_id = p_store_id AND product_id = v_product_id AND destination = 'store';
        
        IF v_stock_balance < v_quantity THEN
            RAISE EXCEPTION 'Estoque insuficiente para o produto %', v_product_id;
        END IF;
        
        v_total_amount := v_total_amount + (v_quantity * v_unit_price);
    END LOOP;
    
    v_final_amount := v_total_amount;
    
    -- Criar venda
    INSERT INTO public.sales (store_id, cash_register_id, user_id, customer_name, customer_phone, 
                              total_amount, final_amount, payment_method, notes)
    VALUES (p_store_id, p_cash_register_id, p_user_id, p_customer_name, p_customer_phone,
            v_total_amount, v_final_amount, p_payment_method, p_notes)
    RETURNING id INTO v_sale_id;
    
    -- Criar itens e movimentações
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity')::DECIMAL;
        v_unit_price := (v_item->>'unit_price')::DECIMAL;
        
        SELECT cost_price INTO v_unit_cost
        FROM public.products WHERE id = v_product_id;
        
        -- Inserir item da venda
        INSERT INTO public.sale_items (sale_id, product_id, quantity, unit_price, total_price, cost_price)
        VALUES (v_sale_id, v_product_id, v_quantity, v_unit_price, v_quantity * v_unit_price, v_unit_cost);
        
        -- Registrar movimentação de saída
        INSERT INTO public.stock_movements (store_id, product_id, movement_type, origin, destination,
                                            quantity, unit_cost, total_cost, reference_id, reference_type, user_id)
        VALUES (p_store_id, v_product_id, 'sale', 'store', 'customer', v_quantity, v_unit_cost, 
                v_quantity * v_unit_cost, v_sale_id, 'sale', p_user_id);
    END LOOP;
    
    -- Registrar movimento de caixa
    IF p_cash_register_id IS NOT NULL THEN
        INSERT INTO public.cash_movements (store_id, cash_register_id, movement_type, amount, 
                                           description, user_id, reference_id, reference_type)
        VALUES (p_store_id, p_cash_register_id, 'sale', v_final_amount, 
                'Venda #' || v_sale_id::TEXT, p_user_id, v_sale_id, 'sale');
    END IF;
    
    -- Log de auditoria
    PERFORM public.log_audit(p_store_id, p_user_id, 'SALE', 'sales', v_sale_id, NULL, 
                             jsonb_build_object('total', v_total_amount, 'items', p_items));
    
    RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNÇÃO: Processar transferência
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_transfer(
    p_store_id UUID,
    p_user_id UUID,
    p_origin VARCHAR(100),
    p_destination VARCHAR(100),
    p_reference VARCHAR(100),
    p_notes TEXT,
    p_items JSONB
)
RETURNS UUID AS $$
DECLARE
    v_transfer_id UUID;
    v_item JSONB;
    v_product_id UUID;
    v_quantity DECIMAL(12,3);
    v_unit_cost DECIMAL(12,2);
    v_stock_balance DECIMAL(12,3);
BEGIN
    -- Criar transferência
    INSERT INTO public.transfers (store_id, origin, destination, status, user_id, reference, notes)
    VALUES (p_store_id, p_origin, p_destination, 'completed', p_user_id, p_reference, p_notes)
    RETURNING id INTO v_transfer_id;
    
    -- Processar itens
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity')::DECIMAL;
        
        SELECT cost_price INTO v_unit_cost
        FROM public.products WHERE id = v_product_id;
        
        -- Verificar estoque na origem
        SELECT COALESCE(SUM(
            CASE WHEN movement_type IN ('entry', 'transfer_in', 'return') THEN quantity
                 WHEN movement_type IN ('sale', 'transfer_out', 'loss', 'theft') THEN -quantity
                 ELSE 0 END
        ), 0)
        INTO v_stock_balance
        FROM public.stock_movements
        WHERE store_id = p_store_id AND product_id = v_product_id AND destination = p_origin;
        
        IF v_stock_balance < v_quantity THEN
            RAISE EXCEPTION 'Estoque insuficiente na origem para o produto %', v_product_id;
        END IF;
        
        -- Inserir item
        INSERT INTO public.transfer_items (transfer_id, product_id, quantity, unit_cost)
        VALUES (v_transfer_id, v_product_id, v_quantity, v_unit_cost);
        
        -- Movimentação de saída da origem
        INSERT INTO public.stock_movements (store_id, product_id, movement_type, origin, destination,
                                            quantity, unit_cost, total_cost, reference_id, reference_type, user_id)
        VALUES (p_store_id, v_product_id, 'transfer_out', p_origin, p_destination, v_quantity, v_unit_cost,
                v_quantity * v_unit_cost, v_transfer_id, 'transfer', p_user_id);
        
        -- Movimentação de entrada no destino
        INSERT INTO public.stock_movements (store_id, product_id, movement_type, origin, destination,
                                            quantity, unit_cost, total_cost, reference_id, reference_type, user_id)
        VALUES (p_store_id, v_product_id, 'transfer_in', p_origin, p_destination, v_quantity, v_unit_cost,
                v_quantity * v_unit_cost, v_transfer_id, 'transfer', p_user_id);
    END LOOP;
    
    PERFORM public.log_audit(p_store_id, p_user_id, 'TRANSFER', 'transfers', v_transfer_id, NULL,
                             jsonb_build_object('origin', p_origin, 'destination', p_destination, 'items', p_items));
    
    RETURN v_transfer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNÇÃO: Processar entrada de estoque
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_stock_entry(
    p_store_id UUID,
    p_user_id UUID,
    p_notes TEXT,
    p_items JSONB
)
RETURNS UUID AS $$
DECLARE
    v_entry_id UUID := uuid_generate_v4();
    v_item JSONB;
    v_product_id UUID;
    v_quantity DECIMAL(12,3);
    v_unit_cost DECIMAL(12,2);
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity')::DECIMAL;
        v_unit_cost := COALESCE((v_item->>'unit_cost')::DECIMAL, 0);
        
        -- Atualizar custo do produto se fornecido
        IF v_unit_cost > 0 THEN
            UPDATE public.products SET cost_price = v_unit_cost WHERE id = v_product_id;
        ELSE
            SELECT cost_price INTO v_unit_cost FROM public.products WHERE id = v_product_id;
        END IF;
        
        -- Registrar movimentação de entrada no armazém
        INSERT INTO public.stock_movements (store_id, product_id, movement_type, origin, destination,
                                            quantity, unit_cost, total_cost, reference_id, reference_type, user_id, notes)
        VALUES (p_store_id, v_product_id, 'entry', 'supplier', 'warehouse', v_quantity, v_unit_cost,
                v_quantity * v_unit_cost, v_entry_id, 'entry', p_user_id, p_notes);
    END LOOP;
    
    PERFORM public.log_audit(p_store_id, p_user_id, 'CREATE', 'stock_movements', v_entry_id, NULL,
                             jsonb_build_object('type', 'entry', 'items', p_items));
    
    RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNÇÃO: Processar perda
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_loss(
    p_store_id UUID,
    p_user_id UUID,
    p_product_id UUID,
    p_quantity DECIMAL,
    p_location VARCHAR(100),
    p_reason TEXT,
    p_notes TEXT
)
RETURNS UUID AS $$
DECLARE
    v_loss_id UUID;
    v_unit_cost DECIMAL(12,2);
    v_stock_balance DECIMAL(12,3);
BEGIN
    -- Verificar estoque
    SELECT COALESCE(SUM(
        CASE WHEN movement_type IN ('entry', 'transfer_in', 'return') THEN quantity
             WHEN movement_type IN ('sale', 'transfer_out', 'loss', 'theft') THEN -quantity
             ELSE 0 END
    ), 0)
    INTO v_stock_balance
    FROM public.stock_movements
    WHERE store_id = p_store_id AND product_id = p_product_id AND destination = p_location;
    
    IF v_stock_balance < p_quantity THEN
        RAISE EXCEPTION 'Estoque insuficiente para registrar perda';
    END IF;
    
    SELECT cost_price INTO v_unit_cost FROM public.products WHERE id = p_product_id;
    
    INSERT INTO public.losses (store_id, product_id, quantity, location, reason, user_id, notes)
    VALUES (p_store_id, p_product_id, p_quantity, p_location, p_reason, p_user_id, p_notes)
    RETURNING id INTO v_loss_id;
    
    INSERT INTO public.stock_movements (store_id, product_id, movement_type, origin, destination,
                                        quantity, unit_cost, total_cost, reference_id, reference_type, user_id, notes)
    VALUES (p_store_id, p_product_id, 'loss', p_location, 'loss', p_quantity, v_unit_cost,
            p_quantity * v_unit_cost, v_loss_id, 'loss', p_user_id, p_reason);
    
    PERFORM public.log_audit(p_store_id, p_user_id, 'LOSS', 'losses', v_loss_id, NULL,
                             jsonb_build_object('product_id', p_product_id, 'quantity', p_quantity, 'location', p_location));
    
    RETURN v_loss_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNÇÃO: Processar furto
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_theft(
    p_store_id UUID,
    p_user_id UUID,
    p_product_id UUID,
    p_quantity DECIMAL,
    p_location VARCHAR(100),
    p_theft_date DATE,
    p_reference VARCHAR(100),
    p_notes TEXT
)
RETURNS UUID AS $$
DECLARE
    v_theft_id UUID;
    v_unit_cost DECIMAL(12,2);
    v_stock_balance DECIMAL(12,3);
BEGIN
    -- Verificar estoque
    SELECT COALESCE(SUM(
        CASE WHEN movement_type IN ('entry', 'transfer_in', 'return') THEN quantity
             WHEN movement_type IN ('sale', 'transfer_out', 'loss', 'theft') THEN -quantity
             ELSE 0 END
    ), 0)
    INTO v_stock_balance
    FROM public.stock_movements
    WHERE store_id = p_store_id AND product_id = p_product_id AND destination = p_location;
    
    IF v_stock_balance < p_quantity THEN
        RAISE EXCEPTION 'Estoque insuficiente para registrar furto';
    END IF;
    
    SELECT cost_price INTO v_unit_cost FROM public.products WHERE id = p_product_id;
    
    INSERT INTO public.thefts (store_id, product_id, quantity, location, theft_date, user_id, reference, notes)
    VALUES (p_store_id, p_product_id, p_quantity, p_location, p_theft_date, p_user_id, p_reference, p_notes)
    RETURNING id INTO v_theft_id;
    
    INSERT INTO public.stock_movements (store_id, product_id, movement_type, origin, destination,
                                        quantity, unit_cost, total_cost, reference_id, reference_type, user_id, notes)
    VALUES (p_store_id, p_product_id, 'theft', p_location, 'theft', p_quantity, v_unit_cost,
            p_quantity * v_unit_cost, v_theft_id, 'theft', p_user_id, p_notes);
    
    PERFORM public.log_audit(p_store_id, p_user_id, 'THEFT', 'thefts', v_theft_id, NULL,
                             jsonb_build_object('product_id', p_product_id, 'quantity', p_quantity, 'location', p_location));
    
    RETURN v_theft_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNÇÃO: Completar inventário
-- ============================================================
CREATE OR REPLACE FUNCTION public.complete_inventory(
    p_inventory_id UUID,
    p_user_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_store_id UUID;
    v_item RECORD;
    v_unit_cost DECIMAL(12,2);
BEGIN
    SELECT store_id INTO v_store_id FROM public.inventories WHERE id = p_inventory_id;
    
    FOR v_item IN 
        SELECT ii.*, p.cost_price 
        FROM public.inventory_items ii
        JOIN public.products p ON p.id = ii.product_id
        WHERE ii.inventory_id = p_inventory_id
    LOOP
        IF v_item.counted_quantity != v_item.expected_quantity THEN
            INSERT INTO public.stock_movements (store_id, product_id, movement_type, origin, destination,
                                                quantity, unit_cost, total_cost, reference_id, reference_type, user_id, notes)
            VALUES (v_store_id, v_item.product_id, 'inventory_adjustment', 
                    CASE WHEN v_item.counted_quantity > v_item.expected_quantity THEN 'adjustment_positive' ELSE 'adjustment_negative' END,
                    'warehouse',
                    ABS(v_item.counted_quantity - v_item.expected_quantity),
                    v_item.cost_price,
                    ABS(v_item.counted_quantity - v_item.expected_quantity) * v_item.cost_price,
                    p_inventory_id, 'inventory', p_user_id,
                    'Ajuste de inventário: esperado ' || v_item.expected_quantity || ', contado ' || v_item.counted_quantity);
        END IF;
    END LOOP;
    
    UPDATE public.inventories 
    SET status = 'completed', completed_at = NOW(), user_id = p_user_id
    WHERE id = p_inventory_id;
    
    PERFORM public.log_audit(v_store_id, p_user_id, 'INVENTORY', 'inventories', p_inventory_id, NULL,
                             jsonb_build_object('status', 'completed'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RLS - ROW LEVEL SECURITY
-- ============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.losses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thefts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLICIES - STORES
-- ============================================================
DROP POLICY IF EXISTS "stores_select_all" ON public.stores;
CREATE POLICY "stores_select_all" ON public.stores
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "stores_insert_admin" ON public.stores;
CREATE POLICY "stores_insert_admin" ON public.stores
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

DROP POLICY IF EXISTS "stores_update_admin" ON public.stores;
CREATE POLICY "stores_update_admin" ON public.stores
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin')
    ));

-- ============================================================
-- POLICIES - PROFILES
-- ============================================================
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT USING (id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin')
    ));

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

DROP POLICY IF EXISTS "profiles_insert_admin" ON public.profiles;
CREATE POLICY "profiles_insert_admin" ON public.profiles
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- ============================================================
-- POLICIES - STORE_USERS
-- ============================================================
DROP POLICY IF EXISTS "store_users_select" ON public.store_users;
CREATE POLICY "store_users_select" ON public.store_users
    FOR SELECT USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin')
    ));

DROP POLICY IF EXISTS "store_users_insert_admin" ON public.store_users;
CREATE POLICY "store_users_insert_admin" ON public.store_users
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

DROP POLICY IF EXISTS "store_users_delete_admin" ON public.store_users;
CREATE POLICY "store_users_delete_admin" ON public.store_users
    FOR DELETE USING (EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- ============================================================
-- POLICIES - CATEGORIES
-- ============================================================
DROP POLICY IF EXISTS "categories_select" ON public.categories;
CREATE POLICY "categories_select" ON public.categories
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.store_users su 
        WHERE su.store_id = categories.store_id AND su.user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

DROP POLICY IF EXISTS "categories_insert" ON public.categories;
CREATE POLICY "categories_insert" ON public.categories
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM public.store_users su 
        WHERE su.store_id = categories.store_id AND su.user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin')
    ));

DROP POLICY IF EXISTS "categories_update" ON public.categories;
CREATE POLICY "categories_update" ON public.categories
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM public.store_users su 
        WHERE su.store_id = categories.store_id AND su.user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin')
    ));

DROP POLICY IF EXISTS "categories_delete" ON public.categories;
CREATE POLICY "categories_delete" ON public.categories
    FOR DELETE USING (EXISTS (
        SELECT 1 FROM public.store_users su 
        WHERE su.store_id = categories.store_id AND su.user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- ============================================================
-- POLICIES - PRODUCTS
-- ============================================================
DROP POLICY IF EXISTS "products_select" ON public.products;
CREATE POLICY "products_select" ON public.products
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.store_users su 
        WHERE su.store_id = products.store_id AND su.user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

DROP POLICY IF EXISTS "products_insert" ON public.products;
CREATE POLICY "products_insert" ON public.products
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM public.store_users su 
        WHERE su.store_id = products.store_id AND su.user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin')
    ));

DROP POLICY IF EXISTS "products_update" ON public.products;
CREATE POLICY "products_update" ON public.products
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM public.store_users su 
        WHERE su.store_id = products.store_id AND su.user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin')
    ));

DROP POLICY IF EXISTS "products_delete" ON public.products;
CREATE POLICY "products_delete" ON public.products
    FOR DELETE USING (EXISTS (
        SELECT 1 FROM public.store_users su 
        WHERE su.store_id = products.store_id AND su.user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- ============================================================
-- POLICIES - STOCK_MOVEMENTS
-- ============================================================
DROP POLICY IF EXISTS "stock_movements_select" ON public.stock_movements;
CREATE POLICY "stock_movements_select" ON public.stock_movements
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.store_users su 
        WHERE su.store_id = stock_movements.store_id AND su.user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

DROP POLICY IF EXISTS "stock_movements_insert" ON public.stock_movements;
CREATE POLICY "stock_movements_insert" ON public.stock_movements
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM public.store_users su 
        WHERE su.store_id = stock_movements.store_id AND su.user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin')
    ));

-- ============================================================
-- POLICIES - TRANSFERS
-- ============================================================
DROP POLICY IF EXISTS "transfers_select" ON public.transfers;
CREATE POLICY "transfers_select" ON public.transfers
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.store_users su 
        WHERE su.store_id = transfers.store_id AND su.user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

DROP POLICY IF EXISTS "transfers_insert" ON public.transfers;
CREATE POLICY "transfers_insert" ON public.transfers
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM public.store_users su 
        WHERE su.store_id = transfers.store_id AND su.user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin')
    ));

DROP POLICY IF EXISTS "transfers_update" ON public.transfers;
CREATE POLICY "transfers_update" ON public.transfers
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM public.store_users su 
        WHERE su.store_id = transfers.store_id AND su.user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin')
    ));

-- ============================================================
-- POLICIES - SALES
-- ============================================================
DROP POLICY IF EXISTS "sales_select" ON public.sales;
CREATE POLICY "sales_select" ON public.sales
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.store_users su 
        WHERE su.store_id = sales.store_id AND su.user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

DROP POLICY IF EXISTS "sales_insert" ON public.sales;
CREATE POLICY "sales_insert" ON public.sales
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM public.store_users su 
        WHERE su.store_id = sales.store_id AND su.user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin', 'cashier')
    ));

-- ============================================================
-- POLICIES - CASH_REGISTERS
-- ============================================================
DROP POLICY IF EXISTS "cash_registers_select" ON public.cash_registers;
CREATE POLICY "cash_registers_select" ON public.cash_registers
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.store_users su 
        WHERE su.store_id = cash_registers.store_id AND su.user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

DROP POLICY IF EXISTS "cash_registers_insert" ON public.cash_registers;
CREATE POLICY "cash_registers_insert" ON public.cash_registers
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM public.store_users su 
        WHERE su.store_id = cash_registers.store_id AND su.user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin', 'cashier')
    ));

DROP POLICY IF EXISTS "cash_registers_update" ON public.cash_registers;
CREATE POLICY "cash_registers_update" ON public.cash_registers
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM public.store_users su 
        WHERE su.store_id = cash_registers.store_id AND su.user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin')
    ));

-- ============================================================
-- POLICIES - INVENTORIES
-- ============================================================
DROP POLICY IF EXISTS "inventories_select" ON public.inventories;
CREATE POLICY "inventories_select" ON public.inventories
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.store_users su 
        WHERE su.store_id = inventories.store_id AND su.user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

DROP POLICY IF EXISTS "inventories_insert" ON public.inventories;
CREATE POLICY "inventories_insert" ON public.inventories
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM public.store_users su 
        WHERE su.store_id = inventories.store_id AND su.user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin')
    ));

-- ============================================================
-- POLICIES - LOSSES
-- ============================================================
DROP POLICY IF EXISTS "losses_select" ON public.losses;
CREATE POLICY "losses_select" ON public.losses
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.store_users su 
        WHERE su.store_id = losses.store_id AND su.user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

DROP POLICY IF EXISTS "losses_insert" ON public.losses;
CREATE POLICY "losses_insert" ON public.losses
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM public.store_users su 
        WHERE su.store_id = losses.store_id AND su.user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin')
    ));

-- ============================================================
-- POLICIES - THEFTS
-- ============================================================
DROP POLICY IF EXISTS "thefts_select" ON public.thefts;
CREATE POLICY "thefts_select" ON public.thefts
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.store_users su 
        WHERE su.store_id = thefts.store_id AND su.user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

DROP POLICY IF EXISTS "thefts_insert" ON public.thefts;
CREATE POLICY "thefts_insert" ON public.thefts
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM public.store_users su 
        WHERE su.store_id = thefts.store_id AND su.user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin')
    ));

-- ============================================================
-- POLICIES - AUDIT_LOGS (apenas admin)
-- ============================================================
DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_select_admin" ON public.audit_logs
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'junior_admin')
    ));

-- ============================================================
-- POLICIES - CONFIGS
-- ============================================================
DROP POLICY IF EXISTS "configs_select" ON public.configs;
CREATE POLICY "configs_select" ON public.configs
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.store_users su 
        WHERE su.store_id = configs.store_id AND su.user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

DROP POLICY IF EXISTS "configs_insert_admin" ON public.configs;
CREATE POLICY "configs_insert_admin" ON public.configs
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

DROP POLICY IF EXISTS "configs_update_admin" ON public.configs;
CREATE POLICY "configs_update_admin" ON public.configs
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- ============================================================
-- TRIGGER: Criar perfil automaticamente após signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 
            COALESCE(NEW.raw_user_meta_data->>'role', 'cashier'));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- DADOS INICIAIS (Opcional - para demonstração)
-- ============================================================
-- INSERT INTO public.stores (name, currency, locale) 
-- VALUES ('Loja Demo', 'MZN', 'pt-MZ');

-- ============================================================
-- FIM DO SCHEMA OSA
-- ============================================================
