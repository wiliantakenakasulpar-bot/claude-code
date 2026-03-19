# AutoVision Pro 🚗✨

**Sistema web completo para tratamento automatizado de imagens automotivas com IA**

Transforme fotos reais de veículos em imagens profissionais de catálogo automotivo, em escala.

---

## 🎯 Funcionalidades

- **Upload em massa** — Drag & drop de dezenas/centenas de fotos (JPG, PNG, HEIC)
- **Processamento automático com IA** — Remoção de fundo, substituição por ambiente profissional
- **OCR de placas** — Detecção automática da placa brasileira (formato antigo e Mercosul)
- **Nomeação automática** — `ABC1D23_01.jpg`, `ABC1D23_02.jpg`...
- **Download organizado** — Individual, por veículo (ZIP) ou lote completo
- **Dashboard em tempo real** — Status de cada imagem durante o processamento
- **Multi-usuário** — Cada usuário acessa apenas seus próprios arquivos
- **Configurável** — Tipo de fundo, qualidade e formato por usuário

---

## 🔧 Stack Técnica

| Camada       | Tecnologia |
|--------------|-----------|
| Frontend     | Next.js 15, React 19, Tailwind CSS |
| Backend      | Next.js API Routes |
| Worker       | Node.js + BullMQ (fila de jobs) |
| Banco        | PostgreSQL + Prisma ORM |
| Fila         | Redis + BullMQ |
| Storage      | Local (extendível para S3/Supabase) |
| IA — Fundo   | remove.bg API + Sharp (fallback) |
| IA — Enhance | OpenAI DALL-E / Sharp |
| OCR Placa    | Plate Recognizer API / Google Vision |

---

## 🚀 Início Rápido

### Pré-requisitos
- Node.js 20+
- Docker & Docker Compose
- (Opcional) Chaves de API para IA

### 1. Clone e configure

```bash
git clone <repo>
cd auto-image-processor
cp .env.example .env
# Edite .env com suas configurações
```

### 2. Suba com Docker Compose

```bash
docker-compose up -d
```

O sistema inicia em: http://localhost:3000

### 3. Desenvolvimento local

```bash
# Instalar dependências
npm install

# Subir banco e redis
docker-compose up -d postgres redis

# Configurar banco
npx prisma db push
npx prisma db seed

# Iniciar app
npm run dev

# Iniciar worker (em outro terminal)
npm run worker
```

---

## 🔌 Configuração das APIs de IA

Adicione no `.env`:

```env
# Remoção de fundo (remove.bg) — Recomendado
REMOVE_BG_API_KEY=your_key_here

# Melhoria com IA (OpenAI DALL-E) — Opcional
OPENAI_API_KEY=your_key_here

# OCR de placas — Escolha um:
PLATE_RECOGNIZER_API_KEY=your_key_here  # Especializado em placas
GOOGLE_CLOUD_API_KEY=your_key_here      # Alternativa
```

> **Sem API keys**: O sistema funciona em modo demo usando Sharp para processamento básico de imagem.

---

## 📁 Estrutura de Arquivos

```
auto-image-processor/
├── src/
│   ├── app/
│   │   ├── (auth)/          # Login e cadastro
│   │   ├── (dashboard)/     # Páginas autenticadas
│   │   └── api/             # API Routes
│   ├── components/          # Componentes React
│   ├── lib/
│   │   ├── ai/             # Integração com APIs de IA
│   │   ├── auth.ts         # JWT + bcrypt
│   │   ├── db.ts           # Prisma client
│   │   ├── queue.ts        # BullMQ
│   │   └── storage.ts      # Gerenciamento de arquivos
│   ├── types/              # TypeScript types
│   └── workers/
│       └── image-processor.ts  # Worker BullMQ
├── prisma/
│   └── schema.prisma       # Schema do banco
├── docker-compose.yml
└── .env.example
```

---

## 🔄 Fluxo de Processamento

```
Upload → Fila (BullMQ/Redis) → Worker → IA (remove.bg/OpenAI) → Sharp
  → OCR (Plate Recognizer) → Nomeação automática → Storage
    → Notificação → Download disponível
```

### Etapas do Worker

1. **Preparar imagem** — Normalizar orientação, converter HEIC
2. **Detectar placa** — OCR na imagem original
3. **Remover fundo** — remove.bg API ou modo demo
4. **Adicionar fundo profissional** — Branco/Estúdio/Externo (SVG vetorial)
5. **Adicionar sombra** — Sombra suave embaixo do carro
6. **Melhorar qualidade** — Sharp: nitidez, contraste, saturação
7. **Redimensionar** — 1920×1080 (Alta) ou 3840×2160 (Ultra)
8. **Gerar thumbnail** — 400×300 para preview
9. **Salvar e nomear** — `PLACA_01.jpg`

---

## 🎨 Interface

| Tela | Descrição |
|------|-----------|
| Login / Cadastro | Autenticação com validação |
| Dashboard | Stats gerais + lotes recentes |
| Upload | Drag & drop com preview e progresso |
| Biblioteca | Grid de imagens com filtros e seleção |
| Veículos | Agrupamento por placa com download ZIP |
| Configurações | Fundo, qualidade, formato, automação |

---

## 📊 API Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/register` | Cadastro |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Usuário atual |
| GET/POST | `/api/images` | Listar/Upload imagens |
| GET/PATCH/DELETE | `/api/images/[id]` | Imagem específica |
| POST | `/api/images/[id]/reprocess` | Reprocessar |
| GET/POST | `/api/download` | Download individual/ZIP |
| GET | `/api/batches` | Listar lotes |
| GET | `/api/vehicles` | Listar veículos |
| GET/PUT | `/api/settings` | Configurações |
| GET | `/api/dashboard` | Stats do dashboard |
| GET | `/api/files/[...path]` | Servir arquivos |

---

## 🔐 Segurança

- Senhas com bcrypt (salt 12)
- JWT httpOnly cookies
- Arquivos isolados por userId
- Validação de inputs com Zod
- CORS configurado
- Sem exposição de paths internos

---

## 📦 Deploy Produção

```bash
# Configurar variáveis de ambiente
cp .env.example .env.production
# Editar com valores de produção

# Build e subir
docker-compose -f docker-compose.yml up -d --build
```

**Variáveis obrigatórias em produção:**
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET` (mínimo 32 caracteres, aleatório)
- `NEXT_PUBLIC_APP_URL`

---

## 🤝 Integrações Futuras

- [ ] Webhooks para marketplaces (Webmotors, OLX, iCarros)
- [ ] Multi-tenant (multi-lojas)
- [ ] API pública para integração com sistemas de gestão
- [ ] Detecção automática de modelo/cor do veículo
- [ ] Comparação antes/depois interativa
- [ ] Relatórios e métricas avançadas

---

Desenvolvido com ❤️ para concessionárias e revendas que buscam escala e padronização visual.
