-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- MÓDULO SEGURIDAD (Sentinel)
-- =========================================================================

-- Limpieza total inicial (RESET)
DROP TABLE IF EXISTS public.detalle_ordenes CASCADE;
DROP TABLE IF EXISTS public.ordenes_compra CASCADE;
DROP TABLE IF EXISTS public.productos CASCADE;
DROP TABLE IF EXISTS public.categorias CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.sentinel_vault CASCADE;
DROP TABLE IF EXISTS public.usuarios CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;

CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    privilege_level INT NOT NULL DEFAULT 1,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    password_hash TEXT,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
    avatar_url TEXT,
    auth_type TEXT DEFAULT 'local',
    is_locked BOOLEAN DEFAULT FALSE,
    failed_attempts INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    username TEXT,
    action TEXT NOT NULL,
    status TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    details TEXT,
    location TEXT,
    country_code VARCHAR(10),
    firma_digital VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sentinel_vault (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    categoria VARCHAR(100) NOT NULL,
    nombre_clave VARCHAR(255) NOT NULL,
    valor_cifrado TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================================================
-- MÓDULO E-COMMERCE (JANE Artisans)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.productos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    categoria_id UUID NOT NULL REFERENCES public.categorias(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    stock_reservado INT NOT NULL DEFAULT 0,
    image_url TEXT,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ordenes_compra (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
    cliente_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    total DECIMAL(10, 2) NOT NULL DEFAULT 0.0,
    status VARCHAR(20) DEFAULT 'PENDING',
    firma_digital VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.detalle_ordenes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    orden_id UUID NOT NULL REFERENCES public.ordenes_compra(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE RESTRICT,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL
);

-- =========================================================================
-- SEMILLA DE DATOS (Seeder DDL)
-- =========================================================================

-- Inyectar roles base
INSERT INTO public.roles (key, name, privilege_level, description) VALUES
('superadmin', 'Super Administrador', 5, 'Control absoluto del sistema Sentinel y Reportes JANE'),
('manager', 'Gerente', 4, 'Gestión de Inventario, Órdenes y Usuarios'),
('seller', 'Vendedor POS', 3, 'Acceso exclusivo a terminal POS'),
('customer', 'Cliente', 1, 'Usuario base y cliente de e-commerce')
ON CONFLICT (key) DO UPDATE SET 
    name = EXCLUDED.name, 
    privilege_level = EXCLUDED.privilege_level, 
    description = EXCLUDED.description;

-- Inyectar categoría y producto de prueba
DO $$
DECLARE
    cat_id UUID := uuid_generate_v4();
BEGIN
    INSERT INTO public.categorias (id, name, description) 
    VALUES (cat_id, 'Artesanías Generales', 'Productos hechos a mano')
    ON CONFLICT (name) DO NOTHING;

    INSERT INTO public.productos (categoria_id, name, description, price, stock)
    VALUES (
        (SELECT id FROM public.categorias WHERE name = 'Artesanías Generales' LIMIT 1),
        'Jarrón de Arcilla Tradicional', 
        'Jarrón tallado a mano con técnicas milenarias.', 
        45.50, 
        10
    );
END $$;
