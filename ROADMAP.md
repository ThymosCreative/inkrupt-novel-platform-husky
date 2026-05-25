# 🗺️ Inkrupt — Roadmap de Desenvolvimento

> **Objetivo:** Replicar a experiência da Webnovel.com, focando exclusivamente em obras autorais originais.
> 
> **Tipos de obra:** `Inkrupt Original` (obras curadas/contratadas) e `Independente` (autores aprovados)
>
> **Regra:** Marcar cada item como `[x]` ao concluir antes de passar para o próximo.

---

## 🔴 FASE 0 — Hotfixes Críticos
> Bugs que quebram funcionalidade ou segurança. **Resolver antes de qualquer nova feature.**

- [x] **[F0-1]** `Novel.tsx` — `unlockChapter` chamado sem `await` → usuário lê capítulo premium de graça sem pagar
- [x] **[F0-2]** `Profile.tsx` — `getAuthorApplication` e `createAuthorApplication` não importados → crash ao abrir qualquer perfil de usuário não-autor
- [x] **[F0-3]** `Header.tsx` — Botão "Tornar-se Autor" no dropdown bypassa o sistema de aplicações e concede `is_author: true` sem aprovação
- [x] **[F0-4]** `Search.tsx` — `minRating` e `chapterRange` fora do array de dependências do `useEffect` → mudar esses filtros não dispara nova busca
- [x] **[F0-5]** `Studio/Novel.tsx` — Número do próximo capítulo calculado com `chapters[0].chapter_number + 1` → pode gerar duplicata se um capítulo intermediário foi deletado
- [x] **[F0-6]** `NotFound.tsx` — Página 404 genérica, fora do design system, texto em inglês

---

## 🟡 FASE 1 — Alinhamento Conceitual
> O projeto deve refletir a proposta: **somente obras autorais**. Sem traduções.

### 1.1 Nomenclatura e tipos de obra
- [ ] **[F1-1]** Remover tipo `"Tradução"` de `Search.tsx` (filtro), `Studio/Novel.tsx` (select) e `api.ts`
- [ ] **[F1-2]** Renomear tipo `"Original"` para `"Inkrupt Original"` no banco e em todo o código
- [ ] **[F1-3]** Adicionar tipo `"Independente"` para obras de autores aprovados não-curados
- [ ] **[F1-4]** Atualizar badge no `NovelCard.tsx`: "INKRUPT" para obras curadas, sem badge para Independente

### 1.2 Limpeza de código
- [ ] **[F1-5]** Corrigir ~10 strings em inglês para PT-BR (`Novel.tsx`, `ChapterComments.tsx`, `Reader.tsx`)
- [ ] **[F1-6]** Extrair lógica de level-up duplicada (4x em `use-wallet.tsx`) para função `applyLevelUp()` reutilizável
- [ ] **[F1-7]** Mover histórico de `transactions` do `localStorage` para coleção no PocketBase
- [ ] **[F1-8]** Corrigir `markAllAsRead` no `Header.tsx` para usar `Promise.all` em vez de loop sequencial
- [ ] **[F1-9]** Corrigir links quebrados no `Footer.tsx` (rota `/write` não existe)

---

## 🟠 FASE 2 — Monetização Real
> O coração do modelo de negócio. **Sem isso não existe plataforma sustentável.**

### 2.1 Tipos de capítulo bem definidos
- [ ] **[F2-1]** Padronizar os 3 tipos de capítulo em todo o código:
  - `free` → Grátis para todos
  - `premium` → Desbloqueio por Coins ou Fast Pass
  - `privilege` → Acesso antecipado via assinatura (capítulos futuros)
- [ ] **[F2-2]** Corrigir `Reader.tsx` para tratar os 3 tipos corretamente (atualmente só checa `is_premium` boolean)
- [ ] **[F2-3]** UI na listagem de capítulos mostrando claramente o tipo de cada capítulo

### 2.2 Integração de pagamento (Gateway)
> Gateway a definir futuramente. Criar a estrutura para plug-in fácil.
- [ ] **[F2-4]** Criar endpoint seguro no PocketBase para processar compra de Coins (nunca direto do frontend)
- [ ] **[F2-5]** Substituir `buyCoins` atual (que adiciona sem pagamento) por chamada ao endpoint
- [ ] **[F2-6]** Definir pacotes de Coins: 60 / 300 / 680 / 1280 / 3280 / 6480
- [ ] **[F2-7]** Integrar Mercado Pago (PIX + cartão BR) ou Stripe

### 2.3 Sistema de Assinatura — Privilege Pass
- [ ] **[F2-8]** Criar coleção `subscriptions` no PocketBase
- [ ] **[F2-9]** Lógica de acesso a capítulos `privilege` para assinantes
- [ ] **[F2-10]** UI de assinatura na Store e na página da obra

---

## 🎁 FASE 3 — Sistema de Presentes (Gifts)
> Leitores enviam presentes virtuais ao autor. Feature presente na Webnovel como fonte de engajamento e receita do autor.

- [ ] **[F3-1]** Criar coleção `gifts` no PocketBase (`sender`, `author`, `novel`, `gift_type`, `coins_value`, `message`)
- [ ] **[F3-2]** Catálogo de presentes: ☕ Café (5), 🌸 Flor (10), 🏆 Troféu (50), 💎 Diamante (100), 👑 Coroa (500)
- [ ] **[F3-3]** UI no Reader: painel de presentes ao terminar um capítulo
- [ ] **[F3-4]** Exibir presentes recebidos no perfil do autor
- [ ] **[F3-5]** Notificação ao autor quando recebe presente

---

## 📊 FASE 4 — Rankings & Descoberta
> O que mantém leitores voltando toda semana e ajuda novos leitores a descobrir obras.

### 4.1 Sistema de Rankings
- [ ] **[F4-1]** Página `/ranking` com abas: Power Stones (semanal) | Mais Lidas | Melhor Avaliadas | Novidades
- [ ] **[F4-2]** Reset semanal dos Power Stones (todo domingo à meia-noite) via cron job
- [ ] **[F4-3]** Notificação ao autor quando obra entra no top 10
- [ ] **[F4-4]** Badge de posição no ranking exibido no `NovelCard`

### 4.2 Página Explorar melhorada
- [ ] **[F4-5]** Seção "Novidades desta semana" na `/explore`
- [ ] **[F4-6]** Seção "Obras completas recentemente"
- [ ] **[F4-7]** Grid de gêneros visual (não só dropdown) com ícones e contagem de obras
- [ ] **[F4-8]** Filtro de tipo: Inkrupt Original | Independente

---

## ✍️ FASE 5 — Studio do Autor
> Autores são o produto. Precisam de ferramentas profissionais.

### 5.1 Analytics
- [ ] **[F5-1]** Dashboard com gráfico de visualizações por capítulo (últimos 30 dias)
- [ ] **[F5-2]** Contador de novos leitores por semana
- [ ] **[F5-3]** Total de Coins recebidos (presentes + desbloqueios) com histórico

### 5.2 Funcionalidades de publicação
- [ ] **[F5-4]** Agendamento de capítulos (campo `scheduled_at` + cron job)
- [ ] **[F5-5]** Reordenar capítulos via drag-and-drop
- [ ] **[F5-6]** Bulk actions: publicar/despublicar múltiplos capítulos

### 5.3 Programa de Autores
- [ ] **[F5-7]** Processo de aplicação para autor com formulário expandido
- [ ] **[F5-8]** Badge "Inkrupt Original" para obras curadas pela plataforma
- [ ] **[F5-9]** Aceite de termos de uso e contrato digital ao submeter aplicação

---

## 👑 FASE 6 — Gamificação Avançada
> O que cria hábito e retenção de longo prazo.

### 6.1 Sistema de Conquistas
- [ ] **[F6-1]** Criar coleção `achievements` e `user_achievements` no PocketBase
- [ ] **[F6-2]** Implementar conquistas: Leitor Ávido (100 caps), Crítico (10 reviews), Apoiador (50 presentes), Fã Dedicado (30 dias check-in), Descobridor
- [ ] **[F6-3]** Exibir conquistas no perfil do usuário com ícones
- [ ] **[F6-4]** Notificação ao desbloquear conquista

### 6.2 Sistema de Níveis expandido
- [ ] **[F6-5]** Expandir de 5 para 20 níveis com nomes únicos
- [ ] **[F6-6]** Títulos exibidos nos comentários e no perfil
- [ ] **[F6-7]** Recompensas escalonadas por nível (mais Fast Passes, Power Stones bônus)

---

## 📖 FASE 7 — Experiência de Leitura Avançada
> Paridade com a Webnovel no Reader.

- [ ] **[F7-1]** Comentários de Parágrafo — implementar a feature (toggle já existe nas configs mas não funciona)
- [ ] **[F7-2]** Swipe horizontal para trocar capítulo no mobile
- [ ] **[F7-3]** Atalhos de teclado no Reader (← → navegar, F fullscreen)
- [ ] **[F7-4]** Barra de progresso mostrando % de capítulos lidos da obra (não só da sessão)
- [ ] **[F7-5]** "Modo Imersivo" sem sidebar e header

---

## 🛡️ FASE 8 — Admin & Moderação
> Necessário antes de abrir para o público.

- [ ] **[F8-1]** Painel admin em `/admin` (protegido por role `is_admin`)
- [ ] **[F8-2]** Aprovação/rejeição de aplicações de autor
- [ ] **[F8-3]** Moderação de comentários e reviews reportadas
- [ ] **[F8-4]** Gerenciar obras: destacar, remover, marcar como "Inkrupt Original"
- [ ] **[F8-5]** Dashboard de receita: Coins vendidos, presentes, assinaturas ativas

---

## 📅 Ordem de Execução Sugerida

```
Agora:       Fase 0 — Hotfixes críticos
Em seguida:  Fase 1 — Alinhamento conceitual
Semana 1-2:  Fase 2 — Monetização (estrutura, sem gateway ainda)
Semana 2-3:  Fase 3 — Sistema de Presentes
Semana 3-4:  Fase 4 — Rankings & Descoberta
Semana 4-5:  Fase 5 — Studio melhorado
Mês 2:       Fases 6, 7, 8
```

---

*Última atualização: 2026-05-25*
