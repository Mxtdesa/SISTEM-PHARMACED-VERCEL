# Guía de despliegue — Farmacia San Miguel POS

## Prerrequisitos

- Cuenta en [Supabase](https://supabase.com) (gratis)
- Cuenta en [Vercel](https://vercel.com) (gratis)
- Git instalado

---

## Paso 1: Configurar Supabase

### 1.1 Crear proyecto
1. Ve a https://supabase.com/dashboard
2. Haz clic en **New project**
3. Nombra el proyecto: `farmacia-san-miguel`
4. Elige una región cercana (ej: São Paulo para Perú)
5. Crea una contraseña segura para la base de datos

### 1.2 Ejecutar migraciones SQL
En el **SQL Editor** de Supabase, ejecuta en orden:

```
1. supabase/migrations/001_schema.sql      → Tablas, vistas, triggers
2. supabase/migrations/002_functions.sql   → Funciones atómicas (process_sale, etc.)
3. supabase/migrations/003_rls_policies.sql → Políticas de seguridad RLS
4. supabase/migrations/004_seed_data.sql   → Datos iniciales (categorías, proveedores)
```

### 1.3 Crear usuario administrador inicial
En el SQL Editor de Supabase:

```sql
-- Primero, registra el usuario via Supabase Auth Dashboard
-- Luego asígnale el rol admin:
UPDATE profiles SET role = 'admin' WHERE email = 'tu_correo@farmacia.pe';
```

O desde el Dashboard de Supabase:
1. Ve a **Authentication > Users**
2. Crea el usuario con email + contraseña
3. En la tabla `profiles`, actualiza su rol a `admin`

### 1.4 Obtener credenciales
Ve a **Settings > API** y copia:
- **Project URL** → `VITE_SUPABASE_URL`
- **anon/public key** → `VITE_SUPABASE_ANON_KEY`

---

## Paso 2: Configurar el proyecto localmente

```bash
# 1. Instalar dependencias
pnpm install

# 2. Crear archivo de variables de entorno
cp .env.example .env.local

# 3. Editar .env.local con tus credenciales de Supabase
nano .env.local

# 4. Ejecutar en desarrollo
pnpm dev
```

---

## Paso 3: Desplegar en Vercel

### 3.1 Subir código a GitHub
```bash
git init
git add .
git commit -m "Sistema POS Farmacia - versión inicial"
git remote add origin https://github.com/TU_USUARIO/farmacia-pos.git
git push -u origin main
```

### 3.2 Conectar con Vercel
1. Ve a https://vercel.com/new
2. Importa el repositorio de GitHub
3. En **Configure Project**:
   - **Framework Preset**: Vite
   - **Build Command**: `pnpm build`
   - **Output Directory**: `dist`

### 3.3 Configurar variables de entorno en Vercel
En **Settings > Environment Variables** agrega:

| Variable                  | Valor                                    |
|---------------------------|------------------------------------------|
| `VITE_SUPABASE_URL`       | `https://TU_PROYECTO.supabase.co`        |
| `VITE_SUPABASE_ANON_KEY`  | `eyJhbGci...TU_ANON_KEY`                 |

### 3.4 Desplegar
Haz clic en **Deploy** — Vercel construirá y publicará automáticamente.

Cada `git push` a `main` desplegará una nueva versión automáticamente.

---

## Paso 4: Configuración inicial del sistema

Una vez desplegado:

1. **Inicia sesión** con el usuario administrador
2. Ve a **Configuración > Empresa** y completa los datos de la farmacia
3. Crea los usuarios del equipo desde **Usuarios**
4. Configura categorías adicionales si necesitas
5. Agrega proveedores desde **Proveedores**
6. Importa o crea productos desde **Productos**
7. Abre la caja desde **Caja > Abrir caja**
8. ¡El sistema está listo para operar!

---

## Estructura del proyecto

```
farmacia-pos/
├── src/
│   ├── App.tsx                 # Router principal
│   ├── index.css               # Tema + fuentes
│   ├── lib/
│   │   └── supabase.ts         # Cliente Supabase + API functions
│   ├── store/
│   │   └── useStore.ts         # Estado local (Zustand) para demo
│   ├── types/
│   │   └── index.ts            # TypeScript types
│   ├── data/
│   │   └── mockData.ts         # Datos de ejemplo para demo
│   ├── components/
│   │   ├── layout/             # Sidebar, Header, Layout
│   │   └── ui/                 # Badge, Button, Card, Modal, Input
│   └── pages/
│       ├── Login.tsx           # Autenticación
│       ├── Dashboard.tsx       # KPIs y gráficos
│       ├── POS.tsx             # Punto de venta
│       ├── Products.tsx        # Gestión de productos
│       ├── Inventory.tsx       # Control de inventario + FEFO
│       ├── Purchases.tsx       # Compras y recepciones
│       ├── Suppliers.tsx       # Proveedores
│       ├── Customers.tsx       # Clientes
│       ├── CashRegister.tsx    # Caja (apertura/cierre)
│       ├── Movements.tsx       # Historial de movimientos
│       ├── Reports.tsx         # Reportes y estadísticas
│       ├── Users.tsx           # Gestión de usuarios
│       └── Settings.tsx        # Configuración + auditoría
├── supabase/
│   └── migrations/
│       ├── 001_schema.sql      # Tablas, vistas, triggers
│       ├── 002_functions.sql   # process_sale(), process_purchase(), etc.
│       ├── 003_rls_policies.sql # Row Level Security
│       └── 004_seed_data.sql   # Datos iniciales
├── .env.example                # Template de variables de entorno
├── DEPLOY.md                   # Esta guía
└── vite.config.ts              # Configuración de Vite
```

---

## Seguridad implementada

| Mecanismo               | Descripción                                          |
|-------------------------|------------------------------------------------------|
| Supabase Auth           | JWT con refresh token automático                     |
| Row Level Security      | Cada tabla tiene políticas por rol                   |
| SECURITY DEFINER        | Funciones atómicas ejecutadas con privilegios controlados |
| Soft delete             | Productos/ventas nunca se eliminan físicamente       |
| Audit logs              | Registro inmutable de todas las operaciones críticas |
| FEFO                    | Stock descontado por vencimiento (primer vence, primero sale) |
| Sin stock negativo      | Validación en función PostgreSQL + frontend          |
| Sin vencidos en venta   | Función process_sale() valida expiry_date >= hoy     |

---

## Soporte y personalización

El sistema está diseñado para escalar:

- **Multi-sucursal**: agregar campo `branch_id` a productos, ventas y caja
- **Facturación electrónica**: la capa de ventas está desacoplada de emisión tributaria
- **Reportes avanzados**: las vistas SQL pueden conectarse con herramientas BI
- **App móvil**: la API de Supabase es compatible con React Native

---

*Sistema desarrollado con React 19 + Vite + Tailwind CSS v4 + Supabase PostgreSQL*
