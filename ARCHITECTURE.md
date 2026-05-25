# BovControl — Relatório Técnico de Arquitetura

> **Snapshot:** 2026-05-25  
> **Status:** MVP em desenvolvimento — módulo Animals funcional, Milk parcial  
> **Stack:** Next.js 15 · TypeScript 5 · Prisma 5 · PostgreSQL · Auth.js v5 · Tailwind CSS · Shadcn/UI

---

## 1. Estrutura Atual de Pastas

```
BovControl/
├── prisma/
│   ├── schema.prisma          ✅ Schema completo (15 models, 14 enums)
│   └── seed.ts                ✅ Fazenda Saldanha + 4 animais de exemplo
│
├── src/
│   ├── app/
│   │   ├── layout.tsx         ✅ Root layout (Inter, dark, Toaster)
│   │   ├── globals.css        ✅ Tailwind + CSS vars dark theme
│   │   ├── (app)/             ✅ Grupo de rotas autenticadas
│   │   │   ├── layout.tsx     ✅ App shell (header + sidebar desktop + bottom nav mobile)
│   │   │   ├── page.tsx       ✅ Dashboard (KPIs + rebanho + quick links)
│   │   │   └── animals/
│   │   │       ├── page.tsx           ✅ Listagem de animais
│   │   │       ├── new/page.tsx       ✅ Cadastro de animal
│   │   │       └── [id]/
│   │   │           ├── page.tsx       ✅ Detalhe do animal (Server Component)
│   │   │           └── edit/page.tsx  ✅ Edição do animal
│   │   ├── (auth)/            ✅ Grupo de rotas de autenticação
│   │   │   ├── layout.tsx     ✅ Layout de auth (centralizado, sem nav)
│   │   │   └── login/page.tsx ✅ Página de login
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts  ✅ Handler Auth.js v5
│   │       └── upload/route.ts             ✅ Proxy Vercel Blob (requer @vercel/blob)
│   │
│   ├── lib/
│   │   ├── prisma.ts          ✅ Singleton PrismaClient (globalThis para hot-reload)
│   │   ├── auth.ts            ✅ Auth.js v5 (JWT + Credentials + bcryptjs)
│   │   ├── permissions.ts     ✅ requireFarmAccess / getUserFarmRole / canAccess
│   │   └── utils.ts           ✅ cn(), formatadores PT-BR, generateAnimalTag, re-exports
│   │
│   ├── modules/
│   │   ├── shared/
│   │   │   └── domain/
│   │   │       ├── animal-rules.ts       ✅ Barrel — ponto de entrada único do domínio
│   │   │       ├── animal-guards.ts      ✅ 7 funções puras (GuardResult)
│   │   │       ├── animal-transitions.ts ✅ 6 funções puras (HEIFER→COW)
│   │   │       └── animal-labels.ts      ✅ 13 constantes PT-BR + getCategoryLabel()
│   │   │
│   │   ├── animals/
│   │   │   ├── actions.ts     ✅ 6 server actions (CRUD + foto + peso + desativação)
│   │   │   ├── queries.ts     ✅ 5 queries Prisma (listagem + detalhe + stats + selects)
│   │   │   ├── schema.ts      ✅ 5 schemas Zod (create + update + transfer + photo + weight)
│   │   │   ├── types.ts       ✅ 7 tipos TypeScript (AnimalListItem, AnimalWithRelations, etc)
│   │   │   └── components/
│   │   │       ├── animal-card.tsx         ✅ Card mobile da listagem
│   │   │       ├── animal-filters.tsx      ✅ Filtros URL-based com debounce
│   │   │       ├── animal-list.tsx         ✅ Grid responsivo + EmptyState
│   │   │       ├── animal-form.tsx         ✅ Formulário create/edit (React Hook Form)
│   │   │       ├── animal-timeline.tsx     ✅ Timeline de fotos cronológica
│   │   │       └── animal-quick-actions.tsx ✅ Client Component com 4 Sheets + bottom bar
│   │   │
│   │   └── milk/
│   │       ├── actions.ts     ✅ registerMilkRecord + deleteMilkRecord
│   │       ├── queries.ts     ✅ getMilkRecordsByAnimal + getDailyMilkSummary + getMilkHistoryByFarm
│   │       ├── schema.ts      ✅ milkRecordSchema + milkFiltersSchema + dailySummarySchema
│   │       └── types.ts       ✅ MilkRecordWithAnimal + DailyMilkSummary + AnimalMilkSummary
│   │
│   ├── components/
│   │   ├── shared/
│   │   │   ├── status-badge.tsx       ✅ 8 badges temáticos (Sex, Category, Purpose, Status, etc)
│   │   │   ├── section-card.tsx       ✅ SectionCard + InfoRow + InfoRows
│   │   │   ├── loading-card.tsx       ✅ Skeletons (AnimalCard, AnimalList, SectionCard, Detail)
│   │   │   ├── mobile-bottom-actions.tsx  ✅ Barra fixa rodapé (primary + secondary)
│   │   │   ├── quick-action-bar.tsx   ✅ Barra horizontal scroll de ações rápidas
│   │   │   ├── page-header.tsx        ✅ Header de página com back + title + description
│   │   │   ├── form-field.tsx         ✅ Wrapper de campo (label + hint + error)
│   │   │   ├── empty-state.tsx        ✅ Estado vazio genérico
│   │   │   └── confirm-dialog.tsx     ✅ Dialog de confirmação (AlertDialog)
│   │   └── ui/                ✅ Shadcn components (button, input, label, badge, separator,
│   │                              select, textarea, sheet, toast, toaster, alert-dialog)
│   │
│   ├── hooks/
│   │   ├── use-debounce.ts    ✅ Hook de debounce genérico (400ms default nos filtros)
│   │   └── use-toast.ts       ✅ Toast global (estado em memória fora do React)
│   │
│   └── types/
│       └── next-auth.d.ts     ✅ Augmentação de tipos (session.user.id)
│
├── .env.local                 ✅ DATABASE_URL + NEXTAUTH_SECRET + BLOB_READ_WRITE_TOKEN
├── package.json               ✅ Dependências ajustadas (sem radix/badge, sem radix/sheet)
├── tailwind.config.ts         ✅ Dark mode class, CSS vars, sem plugins extras
├── postcss.config.mjs         ✅ tailwindcss + autoprefixer
└── tsconfig.json              ✅ strict + noUncheckedIndexedAccess + paths @/*
```

**Módulos concluídos:** Animals (completo), Milk (lógica back-end, sem UI de página)  
**Módulos pendentes:** Lots, Pastures, Reproduction, Health, Alerts, Settings, Reports

---

## 2. Dependências Instaladas

### Dependências de Produção

| Pacote | Versão | Função |
|--------|--------|--------|
| `next` | 15.3.2 | Framework (App Router, Server Actions, Turbopack) |
| `react` / `react-dom` | ^19.0.0 | UI library |
| `typescript` | ^5.7.2 | Type checking |
| `@prisma/client` | ^5.22.0 | ORM PostgreSQL |
| `next-auth` | ^5.0.0-beta.25 | Autenticação (Auth.js v5) |
| `@auth/prisma-adapter` | ^2.7.4 | Adapter Prisma para Auth.js |
| `bcryptjs` | ^2.4.3 | Hash de senhas |
| `zod` | ^3.23.8 | Validação de schemas |
| `react-hook-form` | ^7.53.2 | Formulários performáticos |
| `@hookform/resolvers` | ^3.9.0 | Integração Zod ↔ React Hook Form |
| `zustand` | ^5.0.1 | Estado global (offline queue — planejado) |
| `date-fns` | ^4.1.0 | Formatação de datas PT-BR |
| `tailwind-merge` | ^2.5.4 | Merge de classes Tailwind sem conflito |
| `clsx` | ^2.1.1 | Conditional classes |
| `class-variance-authority` | ^0.7.0 | Variantes de componentes Shadcn |
| `tailwindcss-animate` | ^1.0.7 | Animações Tailwind (Shadcn) |
| `lucide-react` | ^0.453.0 | Ícones SVG |
| `@radix-ui/react-*` | vários | Primitivas UI (Shadcn) — alert-dialog, avatar, dialog, label, select, separator, slot, tabs, toast |

### Dependências de Desenvolvimento

| Pacote | Versão | Função |
|--------|--------|--------|
| `prisma` | ^5.22.0 | CLI Prisma (migrate, generate, studio) |
| `tsx` | ^4.19.2 | Executar TypeScript diretamente (seed.ts) |
| `autoprefixer` | ^10.4.20 | PostCSS prefixação CSS |
| `postcss` | ^8.4.49 | Pipeline CSS |

### Integrações Configuradas

- **PostgreSQL 18.3** em `localhost:5432` sem senha (usuário `postgres`)
- **Vercel Blob** — rota `/api/upload` criada, mas `@vercel/blob` **não está instalado** (necessário `npm install @vercel/blob`)
- **PWA** — `manifest.json` configurado (ícone, cor de tema #16a34a, standalone)

### Pacotes AUSENTES que serão necessários

```bash
@vercel/blob        # Upload de fotos — route /api/upload já criada mas importa esse pacote
```

---

## 3. Schema Prisma Atual

### Models e seus propósitos

```
User            → Conta de usuário (Auth.js + credentials)
Account         → OAuth accounts (Auth.js adapter)
Session         → Sessions (Auth.js adapter — não usado com JWT, mas mantido)
VerificationToken → Email verification (Auth.js adapter)

Farm            → Fazenda (entidade raiz de multitenant)
FarmUser        → Join table User ↔ Farm com role RBAC

Animal          → Animal do rebanho (entidade central do sistema)
AnimalPhoto     → Fotos com isPrimary, takenAt, caption
WeightRecord    → Histórico de pesagens
HealthEvent     → Eventos sanitários (vacina, doença, vermifugação, exame)
Reproduction    → Registros reprodutivos (IA, monta natural, diagnóstico)
MilkRecord      → Produção de leite por turno

Lot             → Lote/curral de manejo
Pasture         → Pasto com área e tipo de capim

Alert           → Alertas automáticos (cio, parto, secagem, vacinação)
```

### Enums

| Enum | Valores | Uso |
|------|---------|-----|
| `UserRole` | OWNER, MANAGER, WORKER, VIEWER | RBAC hierárquico |
| `Sex` | MALE, FEMALE | Sexo biológico do animal |
| `Purpose` | DAIRY, BEEF, BOTH | Finalidade zootécnica |
| `AnimalStatus` | ACTIVE, SOLD, DEAD, TRANSFERRED | Ciclo de vida |
| `Category` | CALF, HEIFER, COW, BULL, STEER | Categoria etária/sexual |
| `BirthType` | NATURAL, INSEMINATION, EMBRYO_TRANSFER | Origem do animal |
| `LotType` | LACTATING, DRY, HEIFER, CALF, FATTENING, MIXED | Tipo de manejo do lote |
| `HealthEventType` | VACCINATION, DISEASE, DEWORMING, EXAM, OTHER | Tipo de evento sanitário |
| `ReproductionType` | INSEMINATION, NATURAL_MATING, PREGNANCY_CHECK | Tipo de evento reprodutivo |
| `ReproductionStatus` | PENDING, CONFIRMED, FAILED | Status do evento reprodutivo |
| `MilkShift` | MORNING, AFTERNOON, EVENING | Turno de ordenha |
| `AlertType` | HEAT, PREGNANCY_CHECK, DRY_OFF, CALVING, VACCINATION, WEIGHT_CHECK | Tipo de alerta |
| `AlertStatus` | PENDING, RESOLVED, DISMISSED | Status do alerta |
| `Priority` | HIGH, MEDIUM, LOW | Prioridade do alerta |

### Relações Críticas

**Animal** é a entidade mais complexa:

```prisma
Animal → Farm        (farmId: obrigatório — multitenant)
Animal → Lot         (lotId: opcional — pode estar solto)
Animal → Animal      (motherId + fatherId: auto-referência bidirecional)
  └── mother → maternalChildren (FEMALE → filhos por mãe)
  └── father → paternalChildren (MALE  → filhos por pai)
Animal → AnimalPhoto[]
Animal → WeightRecord[]
Animal → HealthEvent[]
Animal → MilkRecord[]
Animal → Reproduction[]
Animal → Alert[]
```

**Índices do modelo Animal:**
```prisma
@@unique([farmId, tag])      -- tag única por fazenda (BOV-0001 pode existir em fazendas diferentes)
@@index([farmId, status])    -- filtragem primária (ACTIVE/SOLD/DEAD)
@@index([farmId, lotId])     -- listagem por lote
@@index([motherId])          -- busca de filhos por mãe
@@index([fatherId])          -- busca de filhos por pai
```

**MilkRecord** tem duplo índice:
```prisma
@@index([farmId, recordedAt])   -- dashboard diário (aggregação por fazenda/data)
@@index([animalId, recordedAt]) -- histórico individual cronológico
```

### Regras Refletidas no Schema

1. **`BirthType` no Animal** — campo opcional rastreia origem para aplicar a regra de proteção de fêmeas IA antes do abate
2. **`tag` único por `farmId`** — impede colisão de brincos entre fazendas (multitenant seguro)
3. **`onDelete: Cascade`** em todos os filhos de `Animal` — ao deletar animal, limpa fotos/pesagens/etc
4. **`FarmUser.@@unique([farmId, userId])`** — garante que um usuário só tem um role por fazenda
5. **`MilkRecord.farmId`** desnormalizado — permite queries de dashboard sem join com Animal

---

## 4. Regras de Negócio Implementadas

### 4.1 HEIFER → COW (Promoção Automática de Categoria)

**Localização:** [`src/modules/shared/domain/animal-transitions.ts`](src/modules/shared/domain/animal-transitions.ts)

**Regra:** Uma novilha (HEIFER) é promovida automaticamente para vaca (COW) em dois cenários:

```
Cenário A: Transferência para lote LACTATING
  HEIFER (sex=FEMALE) + transferência/criação → lote (type=LACTATING) → COW

Cenário B: Primeiro registro de leite
  HEIFER (sex=FEMALE) + qualquer MilkRecord inserido → COW
```

**Implementação:**

```typescript
// Função pura — sem Prisma, sem side effects
canBecomeCow(animal)                        // sex=FEMALE && category=HEIFER
isLactatingLot(lot)                         // lot.type === 'LACTATING'
shouldUpgradeToCowByLot(animal, targetLot)  // canBecomeCow && isLactatingLot
shouldUpgradeToCowByMilkRecord(animal)      // canBecomeCow (mesma verificação)
resolveAnimalCategory(animal, context)      // combina os dois cenários, retorna nova categoria
```

**Onde é executado:**
- `animals/actions.ts → createAnimal()` — verifica o lotId antes de inserir
- `animals/actions.ts → transferAnimalToLot()` — verifica o lote de destino
- `milk/actions.ts → registerMilkRecord()` — após salvar o MilkRecord, faz `animal.update({ category: 'COW' })`

**Por que essa abordagem:**  
A regra é pura e testável sem banco. Os side effects (writes Prisma) ficam nos actions. Se amanhã a regra mudar (ex: exigir 3 registros de leite), só muda `animal-transitions.ts` — os actions não precisam ser alterados.

### 4.2 Regra de Proteção de Fêmeas IA no Abate

**Localização:** [`src/modules/shared/domain/animal-guards.ts → canSendToSlaughter()`](src/modules/shared/domain/animal-guards.ts)

```typescript
// Bloqueia se:
animal.sex === 'FEMALE'        // fêmea
&& animal.category !== 'COW'  // ainda não virou vaca
&& animal.birthType === 'INSEMINATION'  // veio de inseminação artificial
```

**Razão de negócio:** Fêmeas nascidas de IA representam investimento genético. Não devem ir ao abate antes de ter filhos. Uma vez vaca (COW), a regra não se aplica mais.

**Onde é aplicada:**
- `animals/actions.ts → deactivateAnimal()` — bloqueia status SOLD se guard falhar
- `AnimalQuickActions` — botão "Vendido" fica disabled com mensagem da razão exibida na UI

### 4.3 Guards de Operações

**Localização:** [`src/modules/shared/domain/animal-guards.ts`](src/modules/shared/domain/animal-guards.ts)

```typescript
canSendToSlaughter(animal)      // FEMALE IA não-vaca bloqueada; já inativo bloqueado
canRegisterMilk(animal)         // macho, inativo, CALF bloqueados
canMoveToLot(animal)            // somente ACTIVE
canRegisterReproduction(animal) // macho, inativo, CALF bloqueados
canRegisterHealthEvent(animal)  // somente ACTIVE
canRegisterWeight(animal)       // somente ACTIVE
canUploadPhoto(animal)          // sempre permitido

getAnimalOperationGuards(animal) // retorna todos os 7 guards de uma vez
```

**Retorno padronizado:**
```typescript
type GuardResult =
  | { allowed: true }
  | { allowed: false; reason: string }  // reason é exibido direto na UI
```

**Uso no Client Component** (`AnimalQuickActions`):
```typescript
const guards = getAnimalOperationGuards(animal)  // 1 chamada, avalia tudo
// Cada ação usa guards.milk.allowed, guards.weight.allowed, etc.
```

### 4.4 Validação de Categoria por Sexo

**Localização:** `animal-transitions.ts + animals/schema.ts`

```typescript
// Mapeamento biológico:
FEMALE: ['CALF', 'HEIFER', 'COW']   // fêmeas
MALE:   ['CALF', 'BULL', 'STEER']   // machos

// Validação Zod (createAnimalSchema.superRefine):
// FEMALE + BULL/STEER → erro
// MALE + HEIFER/COW   → erro
```

**No formulário:** as opções de categoria mudam dinamicamente ao selecionar o sexo.  
**No schema:** `superRefine` bloqueia combinações impossíveis mesmo se enviadas via API diretamente.

### 4.5 Regras de Leite

```typescript
// canRegisterMilk():
status !== 'ACTIVE'   → "Somente animais ativos..."
sex === 'MALE'        → "Machos não registram produção..."
category === 'CALF'   → "Bezerras não registram produção comercial..."

// milkRecordSchema (Zod):
liters: z.number().positive().max(100).multipleOf(0.1)
// max 100L por registro — protege contra input errado
```

### 4.6 Regras de Reprodução

```typescript
// canRegisterReproduction():
status !== 'ACTIVE'   → "Somente animais ativos..."
sex === 'MALE'        → "Machos são registrados como reprodutores na fêmea, não como sujeito"
category === 'CALF'   → "Bezerras ainda não entram em programa reprodutivo"
```

**Nota arquitetural:** Machos participam de reprodução como `bullName` (campo texto) no registro da fêmea, não como sujeito de um `Reproduction` record. Isso simplifica o modelo.

### 4.7 BirthType — Rastreabilidade de Origem

O campo `Animal.birthType` (NATURAL | INSEMINATION | EMBRYO_TRANSFER) é opcional no cadastro mas habilita a regra de proteção de IA. Fluxo:

```
Cadastro: birthType = 'INSEMINATION'
  ↓
canSendToSlaughter() verifica birthType
  ↓
Se tentativa de SOLD antes de virar COW → bloqueado com mensagem clara
```

### 4.8 Multifazenda (Multi-tenant)

**Isolamento:** Todo modelo de dados inclui `farmId` como chave de escopo.

```typescript
// Todas as queries incluem farmId como filtro primário:
prisma.animal.findMany({ where: { farmId, status: 'ACTIVE' } })

// Toda action verifica permissão antes de operar:
await requireFarmAccess(session.user.id, farmId, 'WORKER')
// Lança Error('Acesso negado') se usuário não tem acesso
```

**O usuário pode pertencer a múltiplas fazendas** com roles diferentes em cada uma.  
**Limitação MVP:** A UI resolve `farmId` pelo primeiro `FarmUser` do usuário. Não há seletor de fazenda ativo — será necessário quando houver usuários com acesso a mais de uma fazenda.

### 4.9 Sistema de Permissões RBAC

**Localização:** [`src/lib/permissions.ts`](src/lib/permissions.ts)

```typescript
ROLE_HIERARCHY = { OWNER: 4, MANAGER: 3, WORKER: 2, VIEWER: 1 }

requireFarmAccess(userId, farmId, minimumRole)
// WORKER pode: criar animal, registrar peso, leite, foto, transferir lote
// MANAGER pode: tudo acima + deletar registros + desativar animais
// OWNER pode: tudo
// VIEWER pode: ler (nenhuma action ainda requer VIEWER explicitamente)
```

**Actions e roles mínimos:**

| Action | Role mínimo |
|--------|------------|
| createAnimal | WORKER |
| updateAnimal | WORKER |
| transferAnimalToLot | WORKER |
| addAnimalPhoto | WORKER |
| addWeightRecord | WORKER |
| registerMilkRecord | WORKER |
| deactivateAnimal | MANAGER |
| deleteMilkRecord | MANAGER |

### 4.10 Curral LACTATING como Gatilho de Upgrade

O tipo de lote `LACTATING` não é apenas uma label — é um gatilho operacional. Quando qualquer HEIFER entra em um lote com `type=LACTATING`, ela é promovida automaticamente para COW. Essa promoção é:

- **Irreversível** — não há downgrade de COW para HEIFER
- **Automática** — sem confirmação do usuário (mas comunicada no SheetDescription)
- **Consistente** — ocorre em `createAnimal`, `transferAnimalToLot` e ao tentar mover via lotId no `updateAnimal`

---

## 5. Server Actions Existentes

### Módulo Animals (`src/modules/animals/actions.ts`)

#### `createAnimal(farmId, rawData) → ActionResult<{ id: string }>`
- **Role mínimo:** WORKER
- **Validação:** `createAnimalSchema.safeParse()`
- **Lógica:** gera tag `BOV-XXXX` → resolve categoria (HEIFER→COW se lote LACTATING) → insere
- **Dependência cruzada:** `shouldUpgradeToCowByLot` de `shared/domain`
- **Revalidação:** `/animals`

#### `updateAnimal(animalId, farmId, rawData) → ActionResult<void>`
- **Role mínimo:** WORKER
- **Validação:** `updateAnimalSchema.safeParse()`
- **Lógica:** verifica existência → update simples (sem resolução de categoria)
- **Gap atual:** não aplica HEIFER→COW se `lotId` for alterado na edição direta
- **Revalidação:** `/animals`, `/animals/${animalId}`

#### `transferAnimalToLot(farmId, rawData) → ActionResult<void>`
- **Role mínimo:** WORKER
- **Validação:** `transferLotSchema.safeParse()`
- **Lógica:** guard `canMoveToLot` → busca lote destino → `shouldUpgradeToCowByLot` → update
- **Dependência cruzada:** `canMoveToLot`, `shouldUpgradeToCowByLot` de `shared/domain`
- **Revalidação:** `/animals`, `/animals/${animalId}`

#### `addAnimalPhoto(farmId, rawData) → ActionResult<{ id: string }>`
- **Role mínimo:** WORKER
- **Validação:** `addPhotoSchema.safeParse()`
- **Lógica:** guard `canUploadPhoto` → se isPrimary: desmarca outras → se primeira: auto-primary → insert
- **Dependência cruzada:** `canUploadPhoto` de `shared/domain`
- **Revalidação:** `/animals/${animalId}`

#### `addWeightRecord(farmId, rawData) → ActionResult<void>`
- **Role mínimo:** WORKER
- **Validação:** `addWeightSchema.safeParse()`
- **Lógica:** guard `canRegisterWeight` → insert WeightRecord
- **Dependência cruzada:** `canRegisterWeight` de `shared/domain`
- **Revalidação:** `/animals/${animalId}`

#### `deactivateAnimal(animalId, farmId, status, reason?) → ActionResult<void>`
- **Role mínimo:** MANAGER
- **Status aceitos:** `'SOLD' | 'DEAD' | 'TRANSFERRED'`
- **Lógica:** se SOLD → guard `canSendToSlaughter` → update status + exitDate + null lotId
- **Dependência cruzada:** `canSendToSlaughter` de `shared/domain`
- **Efeito colateral:** remove o animal do lote (lotId → null) ao desativar
- **Revalidação:** `/animals`, `/animals/${animalId}`

### Módulo Milk (`src/modules/milk/actions.ts`)

#### `registerMilkRecord(farmId, rawData) → ActionResult<{ id: string }>`
- **Role mínimo:** WORKER
- **Validação:** `milkRecordSchema.safeParse()`
- **Lógica:** guard `canRegisterMilk` → insert MilkRecord → se animal é HEIFER: `animal.update({ category: 'COW' })`
- **Dependência cruzada:** `canRegisterMilk`, `shouldUpgradeToCowByMilkRecord` de `shared/domain`
- **Revalidação:** `/animals/${animalId}`, `/milk`

#### `deleteMilkRecord(recordId, farmId) → ActionResult<void>`
- **Role mínimo:** MANAGER
- **Lógica:** verifica existência → delete
- **Revalidação:** `/animals/${record.animalId}`, `/milk`

---

## 6. Queries Existentes

### Módulo Animals (`src/modules/animals/queries.ts`)

#### `getAnimalsByFarm(farmId, filters) → AnimalListItem[]`
- **Otimização:** `select` projetado (não retorna campos pesados como `observations`, `exitReason`)
- **Filtros:** search (OR tag/name insensitive), sex, category, status (default ACTIVE), purpose, lotId
- **Sub-select eficiente:** `photos: { where: { isPrimary: true }, take: 1 }` — evita carregar todas as fotos
- **Ordenação:** category asc, tag asc (agrupa categorias na listagem)
- **Gargalo futuro:** search usa `contains + mode: insensitive` = ILIKE no Postgres. Com >10k animais por fazenda, índice GIN ou trigram recomendado

#### `getAnimalById(id, farmId) → AnimalWithRelations | null`
- **Otimização:** weightRecords com `take: 10`, reproductions com `take: 5` — evita carregar histórico completo
- **`include` completo** justificado: página de detalhe precisa de tudo para evitar múltiplos round-trips
- **Gargalo futuro:** fotos sem paginação — com muitas fotos, usar cursor-based pagination

#### `getAnimalsForParentSelect(farmId, sex, search?) → AnimalSelectOption[]`
- **Otimização:** `take: 50` — limita resultados do combobox
- **Filtro:** status: 'ACTIVE' — pais devem estar vivos
- **Uso:** formulário de cadastro/edição para campos motherId e fatherId

#### `getLotsForSelect(farmId) → LotSelectOption[]`
- **Otimização:** `select` mínimo + `_count.animals` para exibir ocupação (5/40)
- **Filtro:** isActive: true
- **Uso:** formulário de animal + sheet de transferência

#### `getAnimalStats(farmId) → AnimalStats`
- **Otimização:** `groupBy(['category'])` — uma query, sem N+1
- **Limitação:** conta apenas ACTIVE. Para dashboard completo, precisará de segunda query ou `_count` adicional

### Módulo Milk (`src/modules/milk/queries.ts`)

#### `getMilkRecordsByAnimal(animalId, farmId, limit?) → MilkRecordWithAnimal[]`
- **Otimização:** `limit` opcional, ordenação desc (últimos primeiro)
- **Uso atual:** histórico individual do animal

#### `getDailyMilkSummary(farmId, date) → DailyMilkSummary`
- **Limitação arquitetural:** carrega TODOS os registros do dia em memória, depois agrupa em JavaScript
- **Problema:** com 100+ vacas × 3 turnos = 300 records/dia. Ainda ok, mas com crescimento usar `groupBy` no Prisma
- **Retorno:** totalLiters, animalCount, byShift (3 turnos), topAnimals (top 10)

#### `getMilkHistoryByFarm(farmId, days) → { date: string; liters: number }[]`
- **Otimização:** filtra por `recordedAt >= since`
- **Limitação:** agrupa por dia em JavaScript (`Map<string, number>`)
- **Gargalo:** com anos de dados, usar `DATE_TRUNC` via Prisma `$queryRaw` ou `groupBy`

---

## 7. Estado do Offline

### O que existe

- **Zustand** instalado (`^5.0.1`) mas sem store implementada ainda
- Arquitetura planejada mas não codificada

### O que ainda é placeholder

- Não há nenhum `useOfflineQueue`, `useLocalStorage`, `useIndexedDB` ou service worker
- O `manifest.json` habilita PWA (installable) mas sem estratégia de cache de dados
- O `BLOB_READ_WRITE_TOKEN` no `.env.local` é um placeholder (`dev_placeholder`)

### Fluxo Planejado (arquitetural)

```
Modo offline (sem rede):
  Usuário registra pesagem/leite
    → Zustand store enfileira { action, payload, timestamp, tempId }
    → UI otimista (exibe imediatamente)
    → Background sync quando rede retornar:
       → Processa fila em ordem
       → Reconcilia tempIds com IDs reais do servidor
       → Revalida paths afetados

Conflito (mesmo animal editado offline e online):
  → Last-write-wins com timestamp (estratégia mais simples para MVP)
```

### Por que Zustand para offline

Zustand com `persist` middleware + `localStorage` é adequado para MVP. Alternativas mais robustas (IndexedDB + Background Sync API) são necessárias para produção real, mas adicionam complexidade significativa.

---

## 8. Estado do Mobile-First

### Padrões Adotados

#### Tamanhos de toque
- Bottom nav links: `min-w-[44px] min-h-[44px]` — mínimo Apple HIG
- QuickActionBar botões: ícone em container `size-12` (48×48px) — acima do mínimo
- Botões de formulário: `h-12` (48px) ou `h-14` (56px) para CTA principal
- Ações primárias do rodapé: `h-12 flex-1` — ocupa largura disponível

#### Inputs numéricos no mobile
```tsx
// Evita zoom automático no iOS (fontSize < 16px dispara zoom)
<Input
  type="number"
  inputMode="decimal"  // teclado numérico com vírgula/ponto
  style={{ fontSize: '16px' }}  // nunca abaixo de 16px
/>
```

#### Formulários
- `AnimalForm`: seção obrigatória sempre visível, seção opcional colapsável (`showOptional` state)
- Botão de submit fixo no rodapé: `fixed bottom-0 ... bg-background/95 backdrop-blur`
- Evita scroll para chegar no botão em telas pequenas

#### Câmera no mobile
```tsx
<input type="file" accept="image/*" capture="environment" />
// capture="environment" → abre câmera traseira diretamente no iOS/Android
```

#### Navegação em camadas
- **Desktop:** sidebar lateral fixa (256px), conteúdo com `max-w-2xl mx-auto`
- **Mobile:** header 56px sticky + bottom nav 5 ítens + conteúdo com `pb-24` (espaço para nav)
- **Detalhe do animal:** `MobileBottomActions` (z-20) + bottom nav (z-30) — ações fixas sobrepostas

#### Sheets (modais mobile)
```tsx
<SheetContent side="bottom" className="rounded-t-2xl pb-8 max-h-[85vh]">
// side="bottom" → sobe de baixo (natural no mobile)
// rounded-t-2xl → estética de drawer
// max-h-[85vh] → não toma a tela toda
```

### Componentes Mobile-Centric

| Componente | Propósito mobile |
|------------|-----------------|
| `MobileBottomActions` | Barra fixa com primárias h-12 + secundárias h-10 |
| `QuickActionBar` | Scroll horizontal de ações (não quebra em múltiplas linhas) |
| `AnimalQuickActions` | Client Component que centraliza todos os Sheets do detalhe |
| `SexToggle` (dentro de AnimalForm) | Botões grandes (py-4) para seleção de sexo |
| Categoria grid | 3 colunas com `py-3` — área de toque confortável |

---

## 9. Componentes Compartilhados

### Layout (`src/app/(app)/layout.tsx`)
- Server Component — verifica sessão, redireciona para `/login` se não autenticado
- Header sticky com backdrop blur, logo, nome do usuário, botão de logout
- Sidebar desktop (`hidden md:flex`) com `NAV_ITEMS`
- Bottom nav mobile (`md:hidden fixed bottom-0`) com 5 primeiros itens da nav
- `max-w-2xl mx-auto px-4 pt-5 pb-24 md:pb-6` no conteúdo

### Shared Components (`src/components/shared/`)

#### `status-badge.tsx` — 8 exports
```typescript
SexBadge(sex, size?, showIcon?)          // pink(♀) / sky(♂)
CategoryBadge(category, size?)           // purple/blue/green/red/amber
PurposeBadge(purpose, size?)             // cyan/orange/violet
AnimalStatusBadge(status, size?)         // retorna null se ACTIVE (ativo não precisa de badge)
LotTypeBadge(type, size?)                // purple/slate/blue/green/orange/muted
PriorityBadge(priority, size?)           // red/amber/green
InseminationBadge(size?)                 // teal — badge especial "IA"
```
Todos importam labels de `shared/domain/animal-labels` — sem strings inline.

#### `section-card.tsx`
```typescript
SectionCard({ title, subtitle?, action?, noPadding?, children })
// Header com título + subtitle opcional + action (ex: link "Ver todos")
// Divisor automático
// Conteúdo com padding (ou noPadding para componentes que gerenciam próprio padding)

InfoRow({ label, value, highlight? })   // linha label/valor com divisores automáticos
InfoRows({ children })                  // wrapper com divide-y
```

#### `loading-card.tsx` — Skeletons
```typescript
AnimalCardSkeleton()    // simula um card da listagem
AnimalListSkeleton()    // 6 cards em grid
SectionCardSkeleton()   // simula SectionCard com 3 InfoRows
AnimalDetailSkeleton()  // composição completa da página de detalhe
```

#### `mobile-bottom-actions.tsx`
```typescript
MobileBottomActions({ primary: BottomAction[], secondary?: BottomAction[] })
// fixed bottom-0, z-20, backdrop-blur
// primary: h-12 flex-1 (ação principal)
// secondary: h-10 flex-1 (ação destrutiva/secundária)
// disabled + disabledReason: exibe texto abaixo do botão
// Suporta href (Link) ou onClick
```

#### `quick-action-bar.tsx`
```typescript
QuickActionBar({ actions: QuickAction[] })
// overflow-x-auto scrollbar-none
// Sangra nas bordas: -mx-4 px-4 (usa padding negativo para chegar nas bordas da tela)
// Cada botão: container 48px, ícone 20px, label 11px
// highlight: cor primária no container
// badge: contador badge vermelho
// disabled: opacity-40 + title com reason
```

#### `page-header.tsx`
```typescript
PageHeader({ backHref?, title, description? })
// Opcional: botão de voltar (ChevronLeft)
// h1 com título, p com descrição
```

#### `form-field.tsx`
```typescript
FormField({ label, required?, hint?, error?, children })
// Label com required asterisk, hint em muted, error em destructive
```

#### `confirm-dialog.tsx`
```typescript
ConfirmDialog({ open, onConfirm, onCancel, title, description, variant? })
// AlertDialog do Radix — não pode ser fechado clicando fora (confirmação explícita)
// variant: 'destructive' muda cor do botão confirm
```

### UI Components (`src/components/ui/`)

Componentes Shadcn instalados:
- `button.tsx` — Button com variants (default, outline, ghost, destructive, secondary)
- `input.tsx` — Input base
- `label.tsx` — Label
- `badge.tsx` — Badge com variant outline
- `separator.tsx` — Separador visual
- `select.tsx` — Select com Radix (SelectTrigger, SelectContent, SelectItem)
- `textarea.tsx` — Textarea base
- `sheet.tsx` — Sheet/Drawer com Radix Dialog (SheetContent side=bottom)
- `toast.tsx` + `toaster.tsx` — Sistema de toasts global
- `alert-dialog.tsx` — Dialog de confirmação destrutiva

### Hooks (`src/hooks/`)

#### `use-debounce.ts`
```typescript
useDebounce<T extends Function>(fn: T, delay: number): T
// useCallback + useRef para timeout
// Uso: filtros de busca — 400ms delay antes de atualizar URL
```

#### `use-toast.ts`
```typescript
toast({ title, description?, variant? })
useToast() → { toast, toasts, dismiss }
// Estado global em memória (fora do React — funciona em Server/Client)
// TOAST_LIMIT = 1 (somente 1 toast visível por vez)
// TOAST_REMOVE_DELAY = 1.000.000ms (basicamente não remove — usuário fecha)
```

### Stores (`src/lib/` + ausências)

Zustand instalado mas **sem stores criadas** ainda. Arquitetura planejada:
```typescript
// Futuro: src/stores/offline-queue.ts
useOfflineQueueStore = create(persist({
  queue: [],
  addToQueue: (action) => ...,
  processQueue: async () => ...,
}))
```

---

## 10. Fluxos Completos Funcionais

### 10.1 Cadastro de Animal

```
1. Usuário acessa /animals/new
   → page.tsx (Server Component) busca farmId da sessão + lots + mothers + fathers em paralelo

2. AnimalForm renderizado com mode="create"
   → React Hook Form + zodResolver(createAnimalSchema)
   → Seção obrigatória: SexToggle + CategoryGrid + PurposeGrid
   → Seção opcional (collapsed): nome, raça, nascimento, origem, lote, mãe, pai, observações

3. Submit → createAnimal(farmId, formData)
   → Zod parse (inclui superRefine de categoria por sexo)
   → requireFarmAccess(userId, farmId, 'WORKER')
   → generateAnimalTag(farmId) → BOV-XXXX (busca max e incrementa)
   → Se lotId + FEMALE + HEIFER: busca lote, aplica shouldUpgradeToCowByLot
   → prisma.animal.create({ ...data, tag, category (resolvida) })
   → revalidatePath('/animals')
   → return { success: true, data: { id } }

4. Client redirect → /animals/[id]
5. Toast "Animal cadastrado!"
```

### 10.2 Edição de Animal

```
1. /animals/[id]/edit → Server Component busca animal + lots + parents
2. AnimalForm com mode="edit" e defaultValues preenchidos
3. Submit → updateAnimal(animalId, farmId, formData)
   → ⚠️ NÃO aplica HEIFER→COW (gap técnico — ver débitos)
4. revalidatePath('/animals') + revalidatePath('/animals/[id]')
5. Redirect → /animals/[id]
```

### 10.3 Transferência de Lote

```
1. Usuário clica "Trocar Lote" no detalhe do animal
   → QuickActionBar botão "Lote" OR MobileBottomActions "Trocar Lote"

2. TransferLotSheet abre (side="bottom")
   → Select com todos os lotes + ocupação atual
   → SheetDescription avisa sobre promoção automática de novilhas

3. Confirmar → transferAnimalToLot(farmId, { animalId, lotId })
   → canMoveToLot(animal) — bloqueia se inativo
   → Busca lote de destino
   → shouldUpgradeToCowByLot(animal, targetLot) — resolve nova categoria
   → prisma.animal.update({ lotId, category: newCategory })
   → revalidatePath x2

4. Toast "Transferência realizada!"
   → Sheet fecha
   → Next.js revalida a página — Server Component re-executa, dados atualizados
```

### 10.4 Upgrade Automático HEIFER → COW via Leite

```
1. Usuário clica "Leite" na QuickActionBar (guards.milk.allowed = true para fêmea HEIFER ativa)

2. MilkSheet abre
   → Seleção de turno (3 botões visuais)
   → Input de litros (teclado decimal, font-size 28px)

3. Confirmar → registerMilkRecord(farmId, { animalId, liters, shift })
   → canRegisterMilk(animal) — HEIFER feminina está permitida
   → prisma.milkRecord.create(...)
   → shouldUpgradeToCowByMilkRecord(animal) → true (é HEIFER)
   → prisma.animal.update({ category: 'COW' })  ← upgrade automático!
   → revalidatePath('/animals/[id]'), revalidatePath('/milk')

4. Na próxima visita ao detalhe do animal: CategoryBadge mostra "Vaca"
   → QuickActionBar: leite/reprodução continuam habilitados para COW
```

### 10.5 Tentativa de Venda de Fêmea IA (Bloqueado)

```
1. AnimalQuickActions renderiza:
   guards = getAnimalOperationGuards({ sex:'FEMALE', category:'HEIFER', status:'ACTIVE', birthType:'INSEMINATION' })
   → guards.slaughter = { allowed: false, reason: 'Fêmeas provenientes de inseminação...' }

2. MobileBottomActions botão "Vendido":
   → disabled={!guards.slaughter.allowed}  → disabled=true
   → disabledReason exibido abaixo do botão em texto 10px muted

3. Mesmo se chamado via API diretamente:
   deactivateAnimal(id, farmId, 'SOLD')
   → canSendToSlaughter(animal) → { allowed: false, reason: '...' }
   → return { success: false, error: '...' }
   → Nenhuma alteração no banco
```

---

## 11. Débitos Técnicos

### 11.1 updateAnimal não aplica HEIFER→COW

**Problema:** `updateAnimal` (edição direta via formulário) aceita mudança de `lotId` mas não chama `shouldUpgradeToCowByLot`. Se um usuário editar o animal e mudar o lote para LACTATING pelo formulário de edição, a categoria não será promovida.

**Solução:** Adicionar a mesma lógica de resolução de categoria que existe em `createAnimal` e `transferAnimalToLot`:
```typescript
// Em updateAnimal, após parse:
if (parsed.data.lotId && currentAnimal.sex === 'FEMALE' && currentAnimal.category === 'HEIFER') {
  const targetLot = await prisma.lot.findFirst({ where: { id: parsed.data.lotId } })
  if (shouldUpgradeToCowByLot(currentAnimal, targetLot)) {
    parsed.data.category = 'COW'
  }
}
```

### 11.2 generateAnimalTag sem proteção de concorrência

**Problema:** `generateAnimalTag` faz `findMany` + incrementa max. Em criações simultâneas (dois usuários cadastrando ao mesmo tempo), pode gerar a mesma tag.

```typescript
// Atual: race condition possível
const maxNum = animals.reduce((max, a) => Math.max(max, parseInt(a.tag.match(/(\d+)$/)?.[1] ?? '0')), 0)
return `BOV-${String(maxNum + 1).padStart(4, '0')}`
```

**Solução para produção:** Usar `SEQUENCE` do PostgreSQL via `$queryRaw`:
```sql
CREATE SEQUENCE IF NOT EXISTS animal_tag_seq;
SELECT nextval('animal_tag_seq');
```

**Ou:** Adicionar `tag` com `@default(cuid())` como fallback e formatar depois.

### 11.3 Resolução de farmId frágil no Server Component

**Problema:** Pages pegam farmId assim:
```typescript
const farmUser = await prisma.farmUser.findFirst({ where: { userId: session.user.id } })
if (!farmUser) redirect('/onboarding')
```
`findFirst` retorna a primeira fazenda — comportamento não-determinístico se o usuário tiver múltiplas.

**Solução:** Criar página de seleção de fazenda ativa + cookie/sessão com `activeFarmId`.

### 11.4 MilkRecord.farmId desnormalizado sem sync

**Problema:** `MilkRecord.farmId` é inserido na criação mas deriva de `Animal.farmId`. Se um animal fosse transferido de fazenda (TRANSFERRED), os registros de leite manteriam o `farmId` antigo.

**Na prática:** Transferência entre fazendas não está implementada. Risco futuro ao adicionar.

### 11.5 getDailyMilkSummary agrupa em memória

**Problema:** Carrega todos os records do dia em array JavaScript, depois agrupa. Com 100 vacas × 3 turnos = 300 records — ainda ok. Com 500+ animais, isso escala mal.

**Solução:** Usar Prisma `groupBy`:
```typescript
const byAnimal = await prisma.milkRecord.groupBy({
  by: ['animalId', 'shift'],
  where: { farmId, recordedAt: { gte: startOfDay(date), lte: endOfDay(date) } },
  _sum: { liters: true },
})
```

### 11.6 @vercel/blob não instalado

**Problema:** `src/app/api/upload/route.ts` importa `@vercel/blob/next` que não está no `package.json`. A rota vai falhar no runtime se acessada.

```bash
npm install @vercel/blob
```

**E configurar token real** no `.env.local` (não `dev_placeholder`).

### 11.7 Módulo Animals sem página de listagem paginada

**Problema:** `getAnimalsByFarm` retorna TODOS os animais ativos de uma fazenda em uma query. Com rebanho grande (500+), isso é problemático.

**Solução:** Adicionar `skip/take` (offset pagination) ou cursor-based pagination. A UI de filtros já suporta URL params — só falta adicionar `page` ou `cursor`.

### 11.8 Falta de loading.tsx para Server Components

**Problema:** As páginas são Server Components mas não têm `loading.tsx` (Suspense boundary). Sem isso, o usuário vê tela em branco durante fetch.

**Solução:** Criar `src/app/(app)/animals/loading.tsx` usando `AnimalListSkeleton` (já existe em `loading-card.tsx`).

### 11.9 Ausência de error.tsx

**Problema:** Não há `error.tsx` para nenhuma rota. Erros de Server Component causam tela de erro genérica do Next.js.

### 11.10 Link "Reprodução" vai para rota não existente

**Problema:** Em `AnimalQuickActions`, o botão "Reprodução" tem `href: /animals/${animalId}/reproduction` — essa rota não existe ainda.

---

## 12. Próxima Ordem de Implementação

### Prioridade 1: Lot Module (Lotes)

**Justificativa:** O módulo de Lotes é pré-requisito para vários fluxos do Animal que estão incompletos. A UI já referencia `/lots` na nav e no dashboard. Usuários precisam criar e gerenciar lotes para que a transferência e o upgrade HEIFER→COW façam sentido operacional.

**Escopo mínimo:**
```
src/modules/lots/
  actions.ts   → createLot, updateLot, deactivateLot, moveAnimalToLot
  queries.ts   → getLotsByFarm, getLotById (com animais + stats)
  schema.ts    → createLotSchema, updateLotSchema
  types.ts     → LotWithAnimals, LotStats

src/app/(app)/lots/
  page.tsx         → Listagem de lotes
  new/page.tsx     → Criar lote
  [id]/page.tsx    → Detalhe do lote (animais no lote, capacidade)
```

**Regras a implementar:**
- `moveAnimalToLot` deve usar `canMoveToLot` + `shouldUpgradeToCowByLot` (mesma lógica da transferência)
- Capacidade máxima: aviso (não bloqueio) quando `count >= maxCapacity`

### Prioridade 2: loading.tsx + error.tsx + Paginação

**Justificativa:** UX básica que precisa existir antes de qualquer nova feature. Sem loading states, a percepção de performance no mobile é péssima.

```
src/app/(app)/animals/loading.tsx     → <AnimalListSkeleton />
src/app/(app)/animals/[id]/loading.tsx → <AnimalDetailSkeleton />
src/app/(app)/animals/error.tsx       → boundary genérico
```

### Prioridade 3: Milk Page (UI)

**Justificativa:** O back-end do leite já existe completo (actions + queries). Falta apenas a UI. É o módulo mais usado no dia-a-dia de uma fazenda de leite.

```
src/app/(app)/milk/
  page.tsx     → Resumo do dia (getDailyMilkSummary) + botão de registro por animal
  loading.tsx
```

**Regras adicionais no registro:**
- Não permitir dois registros do mesmo turno para o mesmo animal no mesmo dia (unique constraint ou validação na action)

### Prioridade 4: Health Events

**Justificativa:** Vacinações e vermifugações têm calendários obrigatórios no Brasil (MAPA). É o segundo módulo mais usado depois de leite.

```
src/modules/health/
  actions.ts  → createHealthEvent, resolveHealthEvent
  queries.ts  → getHealthEventsByAnimal, getUpcomingVaccinations
  schema.ts   → healthEventSchema
  types.ts    → HealthEventWithAnimal
```

**Alerta gerado:** ao registrar vacinação com validade conhecida (ex: Brucelose = anual), criar `Alert` de re-vacinação automaticamente.

### Prioridade 5: Reproduction

**Justificativa:** Agenda reprodutiva é core para fazendas leiteiras. A rota `/animals/[id]/reproduction` já é referenciada em `AnimalQuickActions`.

```
src/modules/reproduction/
  actions.ts  → registerReproduction, updateReproductionStatus
  queries.ts  → getReproductionsByAnimal, getPendingPregnancyChecks
  schema.ts   → reproductionSchema
  types.ts    → ReproductionWithAnimal

src/app/(app)/animals/[id]/reproduction/page.tsx
```

**Regra:** `canRegisterReproduction` já existe no shared domain — só implementar a UI.

### Prioridade 6: Alertas

**Justificativa:** Sem alertas automáticos, o sistema é passivo. Alertas transformam o BovControl em uma ferramenta proativa.

**Alertas a gerar automaticamente:**
- Após `Reproduction(status=CONFIRMED, date=X)` → criar `Alert(type=PREGNANCY_CHECK, dueDate=X+90)`
- Após `Reproduction(PREGNANCY_CHECK, confirmed)` → criar `Alert(type=CALVING, dueDate=X+280)`
- Após `HealthEvent(VACCINATION, type=Aftosa)` → criar `Alert(type=VACCINATION, dueDate=+6meses)`

### Prioridade 7: Offline Queue (Zustand)

**Justificativa:** Necessária para uso real no campo, onde sinal é precário. Mas requer tempo de implementação cuidadoso — deixar para quando os módulos principais estiverem funcionando.

---

## Apêndice: Decisões Arquiteturais Documentadas

### Por que Server Components (não `"use client"` em tudo)?

Server Components fazem fetch direto no servidor — sem API Route, sem loading spinner, sem hydration overhead. Para mobile com sinal ruim, renderização no servidor e envio de HTML pronto é mais rápido do que enviar JS + esperar fetch do cliente.

### Por que `ActionResult<T>` em vez de throw/catch?

Errors como `throw new Error()` em Server Actions não chegam ao cliente de forma estruturada — Next.js os captura e retorna erro genérico. O padrão `{ success: true, data } | { success: false, error }` garante que mensagens amigáveis chegam ao toast, em PT-BR.

### Por que domínio em funções puras separadas?

- **Testabilidade:** `canSendToSlaughter({ sex: 'FEMALE', category: 'HEIFER', birthType: 'INSEMINATION', status: 'ACTIVE' })` é testável sem banco
- **Reutilização:** mesma função usada em actions.ts, na UI (disable button), e futuramente em testes
- **Evolução:** mudar a regra em um lugar propaga para todos os módulos

### Por que não usar repository pattern?

Para um MVP com time solo, o repository pattern adiciona 2-3 arquivos por módulo sem benefício real. Prisma já é um ORM com API de domínio expressiva. As queries estão em `queries.ts` por módulo — o suficiente para centralização.

### Por que Shadcn em vez de Radix puro?

Shadcn gera código na pasta do projeto (não é dependência node_modules). Permite customização total de cada componente. Para o dark theme mobile-first do BovControl, isso é fundamental — cada componente Shadcn pode ser ajustado sem override CSS.

### Por que dark mode forçado (sem toggle)?

Fazendeiros usam o sistema de madrugada (ordenha às 4h) e sob sol forte. Dark mode reduz ofuscamento noturno e tem melhor legibilidade com brilho baixo. Toggle desnecessário para o perfil do usuário.

### Por que `inputMode="decimal"` + `style={{ fontSize: '16px' }}`?

- `inputMode="decimal"` abre teclado numérico com separador decimal no iOS/Android
- `fontSize: 16px` mínimo impede o iOS Safari de fazer zoom automático ao focar input — comportamento que desestabiliza o layout móvel

### Por que `generateAnimalTag` em vez de UUIDs visíveis?

Fazendeiros precisam identificar animais verbalmente ("o BOV-0042"). UUIDs não servem para comunicação humana. BOV-XXXX é curto, sequencial, memorizável e único por fazenda.
