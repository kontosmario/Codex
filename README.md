# family-budget-cats

Monorepo para controlar gastos del hogar entre 2 personas, con modo Personal/Family, UI Ionic iOS, PWA instalable y soporte offline-first.

## Stack
- `apps/api`: Node.js + Express + Prisma + SQLite + JWT + Zod + bcrypt
- `apps/web`: Vite + React + Ionic React (modo iOS) + React Router + React Query + Zustand + Axios
- Workspaces con npm

## Estructura
- `apps/api`: backend y base SQLite
- `apps/web`: frontend PWA
- `.github/workflows/deploy-pages.yml`: deploy de frontend a GitHub Pages

## Variables de entorno

### API (`apps/api/.env`)
Copiar desde `apps/api/.env.example`:

```bash
PORT=4000
DATABASE_URL="file:./dev.db"
JWT_SECRET="replace-with-a-long-secret"
CORS_ORIGIN="http://localhost:5173"
```

### Web (`apps/web/.env`)
Copiar desde `apps/web/.env.example`:

```bash
VITE_API_URL="http://localhost:4000"
```

## Instalación
```bash
npm install
```

## Migrar y seed
```bash
npm run db:migrate -w apps/api
npm run db:seed -w apps/api
```

Usuarios seed:
- `mario@home.local` / `Mario1234!` (Mario, 🐱)
- `aye@home.local` / `Aye1234!` (Ayelén, 🐈‍⬛)

Household seed:
- `householdSavingsGoalMonthly = 0`
- `currency = USD`

## Ejecutar local
```bash
npm run dev
```

- API: `http://localhost:4000`
- Web: `http://localhost:5173`

## Vistas Personal vs Family
- `Personal`: usa salario, objetivos y transacciones del usuario autenticado.
- `Family`: combina ambos usuarios:
  - ingresos = suma de salarios
  - gastos por tipo = suma de ambos
  - ahorro = suma de ambos
  - progreso = ahorro familiar vs meta compartida

## PWA en iOS (Add to Home Screen)
1. Abrir la app desde Safari.
2. Compartir → `Add to Home Screen`.
3. Abrir desde el icono agregado para una experiencia fullscreen-like.

## Offline behavior
- App shell cacheado (abre sin internet).
- `GET /summary` y `GET /transactions` cacheados con `stale-while-revalidate`.
- Si no hay red al crear movimiento:
  - se guarda en IndexedDB,
  - aparece instantáneamente como `Pendiente 🐾`,
  - se sincroniza al volver la conexión.
- Botón `Sync 🐾` en `Settings` para forzar reintento.
- El backend soporta `X-Idempotency-Key` para evitar duplicados al reintentar.

## Scripts raíz
```bash
npm run dev
npm run build
npm run test
```

## Deploy frontend a GitHub Pages
El workflow `deploy-pages.yml` construye `apps/web` y publica `apps/web/dist`.

La base de Vite se define automáticamente desde `GITHUB_REPOSITORY` cuando corre en Actions.
Si querés forzar otra base, usar variable:

```bash
VITE_BASE_PATH="/tu-repo/"
```

## Backend hosting (Render/Railway)
- Desplegar `apps/api` como servicio Node.
- Configurar en backend:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `CORS_ORIGIN` apuntando al dominio del frontend publicado
- Configurar en frontend:
  - `VITE_API_URL` apuntando al backend público
