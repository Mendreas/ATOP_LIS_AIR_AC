# AIRAC Impact Tool — NAV Portugal / GOPLIS

**Aplicação web de página única que analisa as emendas AIRAC do AIP Portugal e identifica, com ajuda de Inteligência Artificial, as alterações com impacto nos sistemas ATC da FIR de Lisboa — preparando automaticamente a notificação aos órgãos e a nota técnica para o ATOPLIS.**

📍 **Aplicação publicada em:** https://mendreas.github.io/ATOP_LIS_AIR_AC/
📦 **Versão actual:** v2.6

---

## Índice

1. [O que é esta ferramenta e que problema resolve](#1-o-que-é-esta-ferramenta-e-que-problema-resolve)
2. [Conceitos básicos (glossário para quem não é da área)](#2-conceitos-básicos-glossário-para-quem-não-é-da-área)
3. [O que precisa para usar](#3-o-que-precisa-para-usar)
4. [Guia de utilização passo a passo](#4-guia-de-utilização-passo-a-passo)
5. [Funções transversais (disponíveis em qualquer passo)](#5-funções-transversais-disponíveis-em-qualquer-passo)
6. [Cache partilhada — cada AIRAC paga-se uma vez](#6-cache-partilhada--cada-airac-paga-se-uma-vez)
7. [Níveis de impacto, Acção e categorias](#7-níveis-de-impacto-acção-e-categorias)
8. [Sistemas analisados](#8-sistemas-analisados)
9. [Órgãos notificados](#9-órgãos-notificados)
10. [Como funciona por dentro](#10-como-funciona-por-dentro)
11. [Custos e créditos da API](#11-custos-e-créditos-da-api)
12. [Instalação e publicação](#12-instalação-e-publicação)
13. [Configuração do Cloudflare Worker](#13-configuração-do-cloudflare-worker)
14. [Resolução de problemas](#14-resolução-de-problemas)
15. [Privacidade e limitações](#15-privacidade-e-limitações)
16. [Ficheiros do repositório](#16-ficheiros-do-repositório)
17. [Histórico de versões](#17-histórico-de-versões)

---

## 1. O que é esta ferramenta e que problema resolve

De 28 em 28 dias, a NAV Portugal publica uma **emenda AIRAC** ao AIP — um documento PDF que pode ter centenas de páginas e que descreve tudo o que muda na informação aeronáutica de Portugal: novas rotas, ajudas rádio retiradas, coordenadas corrigidas, cartas actualizadas, novos heliportos, etc.

Nem todas essas alterações interessam ao **ATOPLIS**. O que o ATOPLIS precisa de saber é: **que alterações obrigam a mudar parâmetros nos sistemas operacionais da NAV** (TOPSKY-ATC, GEC, TWRATM, EFS, ASMGCS)? Encontrar essas alterações à mão, no meio de centenas de páginas, é demorado e sujeito a esquecimentos.

Esta ferramenta automatiza esse trabalho:

1. Lê o PDF da emenda **no próprio browser** (o ficheiro não é enviado para lado nenhum na íntegra);
2. Usa IA (modelo Claude, da Anthropic) para extrair a **lista completa de alterações** e, numa segunda fase, refinar cada descrição com o texto real das páginas da emenda;
3. Classifica cada alteração por **categoria**, **Acção sobre os registos** (inserir/modificar/eliminar), nível de impacto, **órgãos** e **sistemas** afectados;
4. Filtra automaticamente o que não é relevante (FIR dos Açores, itens sem sistema associado);
5. Detecta **duplicados** (ex.: cartas que apenas reflectem uma alteração já listada);
6. Guarda a análise numa **cache partilhada**: a primeira pessoa que analisa um AIRAC paga a análise; todas as seguintes recebem o mesmo resultado em segundos, sem custos — e com total consistência entre analistas;
7. Gera os **emails de notificação** por órgão e a **nota técnica** para o ATOPLIS.

O resultado final continua a ser **revisto e decidido por uma pessoa** — a ferramenta prepara o trabalho, não o substitui.

---

## 2. Conceitos básicos (glossário para quem não é da área)

| Termo | O que significa |
|---|---|
| **AIP** | *Aeronautical Information Publication* — a "enciclopédia" oficial da informação aeronáutica de um país: aeródromos, rotas, ajudas rádio, procedimentos, frequências. |
| **eAIP** | A versão electrónica do AIP, publicada pela NAV em `ais.nav.pt`. É o "estado actual" da informação publicada. |
| **AIRAC** | *Aeronautical Information Regulation And Control* — o calendário mundial, de ciclos de 28 dias, em que as alterações à informação aeronáutica entram em vigor, para todos os países ao mesmo tempo. |
| **Emenda AIRAC (AIP Amendment)** | O documento PDF publicado em cada ciclo (ex.: `LP_Amdt_A_2026_006_en.pdf`) com tudo o que muda. Tem um **sumário** nas primeiras páginas (a lista das secções alteradas) e depois as **páginas de substituição** (as páginas novas do AIP). |
| **Data efectiva** | A data em que a emenda entra em vigor. Entre a publicação e essa data, o eAIP ainda mostra a versão antiga — é a janela ideal para usar esta ferramenta. |
| **FIR de Lisboa** | *Flight Information Region* — a região de informação de voo do continente e Madeira, gerida pelos órgãos de Lisboa. A ferramenta exclui automaticamente os aeródromos dos Açores (FIR de Santa Maria). |
| **ATOPLIS** | O serviço destinatário final da análise: precisa de saber que parâmetros mudar nos sistemas da NAV. |
| **GEN / ENR / AD** | As três partes do AIP: **GEN** (informação geral), **ENR** (em rota — espaço aéreo, rotas, ajudas rádio) e **AD** (aeródromos, identificados pelo código ICAO: LPPT = Lisboa, LPPR = Porto, LPFR = Faro, LPMA = Madeira, LPCS = Cascais, LPPS = Porto Santo). |
| **Navaid** | Ajuda rádio à navegação (VOR, DME, NDB, ILS…). |
| **Worker (Cloudflare)** | Um pequeno programa intermediário na internet que guarda a chave da API de IA em segurança, faz a ponte entre a aplicação e os serviços externos, e aloja a cache partilhada. Ver [secção 13](#13-configuração-do-cloudflare-worker). |
| **KV (Cloudflare)** | A pequena base de dados gratuita do Cloudflare onde o Worker guarda a cache partilhada das análises. |

---

## 3. O que precisa para usar

- **Um browser moderno** (Chrome, Edge, Firefox, Safari) — não é preciso instalar nada;
- **O PDF da emenda AIRAC** (descarregado do site AIS da NAV);
- **O Cloudflare Worker configurado** com uma chave da API Anthropic, **créditos disponíveis** e (recomendado) a **KV da cache** ligada — ver [secções 11](#11-custos-e-créditos-da-api) e [13](#13-configuração-do-cloudflare-worker). A URL do Worker já vem pré-definida no código e pode ser alterada na barra no topo da página (botão **Testar ligação** confirma que está tudo bem).

---

## 4. Guia de utilização passo a passo

A aplicação está organizada em 4 passos, visíveis na barra de progresso no topo: **1 Upload AIRAC → 2 Alterações → 3 Impacto → 4 Exportação**.

### Passo 1 — Upload AIRAC

Arraste o PDF da emenda para a zona indicada (ou clique para escolher o ficheiro).

O que acontece, pela ordem mostrada no registo de progresso:

1. **Leitura do PDF no browser** — a aplicação extrai o texto de todas as páginas, página a página (verá "página X de Y...");
2. **Identificação do sumário** — as primeiras páginas, até à lista "*Insert the following pages*", que contêm a lista oficial de secções alteradas (secção 1 AIRAC + secção 2 NON-AIRAC);
3. **Indexação das páginas de substituição** — cada página nova é associada à secção do AIP a que pertence;
4. **Verificação da cache partilhada** — se alguém já analisou este AIRAC, a análise completa chega da cache em segundos, **sem custos de IA**, e salta-se directamente para o passo 2 (ver [secção 6](#6-cache-partilhada--cada-airac-paga-se-uma-vez));
5. **Fase 1 (IA)** — só o **sumário** (poucos milhares de caracteres) é enviado à IA, que devolve a lista de alterações. É uma chamada curta e barata;
6. **Fase 2 (IA, em segundo plano)** — depois de a lista aparecer, a aplicação, em pequenos lotes: **refina a descrição** de cada item com o texto das páginas de substituição; **valida/corrige as categorias** contra esse texto; atribui a **Acção** sobre os registos (inserir/modificar/eliminar/sem registo); e **revalida os sistemas e órgãos** dos itens cujas categorias mudaram (as edições manuais do utilizador são sempre respeitadas). Os itens refinados ficam marcados com "**descrição refinada pela IA**";
7. **Partilha na cache** — no fim do refinamento, a análise é guardada na cache para as próximas pessoas.

Durante a espera pela API, o registo mostra "*... a aguardar resposta da API (X s)*" a cada 15 segundos. Se a API demorar demasiado, a aplicação **tenta de novo automaticamente** uma vez antes de mostrar erro.

> ℹ️ Se já tiver analisado este AIRAC antes neste browser, o trabalho anterior (selecções, descrições, remoções) está na lista **Sessões guardadas** e pode ser retomado com **▶ Retomar** — sem repetir nada.

### Passo 2 — Alterações

Mostra a **lista completa de alterações identificadas**, com o número da emenda, a data efectiva e o total encontrado.

**O que vê em cada linha:** a parte (GEN/ENR/AD), o aeródromo (nos itens AD), a secção do AIP, a descrição, as categorias (etiquetas) e o nível de impacto (ALTO/MÉDIO/BAIXO).

**O que pode fazer:**

- **Pesquisar e filtrar** — caixa de pesquisa livre + filtros por secção, categoria, sistema, impacto e aeródromo;
- **Seleccionar** os itens a levar para análise de impacto, com as caixas de verificação. A aplicação **pré-selecciona** automaticamente os itens relevantes (impacto nos sistemas, dentro da FIR de Lisboa); os restantes ficam desseleccionados mas visíveis;
- **Sel. todos / Limpar sel.** — selecção em massa;
- **↺ Selecção inicial** — repõe exactamente a selecção que a aplicação propôs após a primeira análise (útil se se perdeu nas alterações manuais);
- **Expandir um item** (clique na linha) — abre o painel "**📄 Texto novo da emenda**" com o texto das páginas de substituição dessa secção e os botões:
  - **⇄ Comparar com eAIP** — mostra lado a lado o texto **actualmente publicado** (eAIP, descarregado em directo) e o **texto novo** da emenda, com as diferenças realçadas;
  - **Analisar** — abre o detalhe completo do item (ver caixa abaixo);
- **Analisar impacto (N) →** — avança para o passo 3 com os itens seleccionados.

> **O modal "Analisar"** (disponível nos passos 2 e 3) mostra, para um item:
> - A descrição da alteração, a secção e a etiqueta de **Acção** (INSERIR/MODIFICAR/ELIMINAR/SEM REGISTO);
> - **eAIP actual** — o texto publicado neste momento (com link "↗ PDF eAIP" para o original) e a aba "**O que mudou (IA)**", onde a IA compara o publicado com o novo e resume: o que está publicado / o que muda / impacto nos sistemas;
> - **Órgãos impactados** — clicar activa/desactiva cada órgão;
> - **Sistemas impactados** — os sistemas afectados e, no TOPSKY-ATC, os **ficheiros de dataset** concretos a actualizar (ex.: `CHARACTERISTIC_POINTS`). **Passe o rato sobre um sistema para ver porque foi atribuído** (a categoria ou o termo encontrado no texto da emenda);
> - **Descrição para ATOPLIS** — o texto que irá para a nota técnica; pode escrevê-lo à mão ou usar **✨ Gerar com IA**.

### Passo 3 — Impacto

Revisão final dos itens seleccionados, agrupados por parte (ENR, GEN, e um bloco por aeródromo). Cada item mostra a etiqueta de **Acção** junto à descrição, e os sistemas com o tooltip "porquê".

**A faixa de informação no topo mostra:**

- O número de alterações que seguem para exportação;
- "**✓ N actualização(ões) de carta removida(s)**" — cartas que apenas reflectem uma alteração já listada (ex.: a carta ENR 6.01-5 que só mostra a retirada do VOR SGR, já listada como item próprio) são **removidas automaticamente**. Nada se perde: estão na secção **Removidos**, em baixo;
- "**✕ Remover N duplicado(s)**" — remove de uma vez os itens marcados com a etiqueta "⚠️ duplicado provável";
- "**✨ Gerar N descrição(ões)**" — gera com IA, em lote, as descrições para ATOPLIS de todos os itens que ainda não a têm;
- "**↺ Repor análise inicial**" — desfaz **todas** as remoções e alterações de selecção, voltando ao estado da primeira análise.

**Como funciona a detecção de duplicados:** a aplicação agrupa itens que partilham o mesmo identificador específico (ex.: o navaid **SGR**, o indicador **LPLR**) ou vários nomes próprios (ex.: *Loures*, *Beatriz*, *Angelo*). Dentro de cada grupo, o item principal é sempre a **entrada de substância** (não-carta) com maior impacto; as cartas que repetem o tema são removidas automaticamente e os restantes duplicados ficam apenas **marcados**, para o utilizador decidir.

**Em cada item pode:** expandir para ver o texto da emenda, **Editar** (abre o modal "Analisar"), ou **✕ Remover**.

**Secção "🗑 Removidos"** (no fundo da página): lista tudo o que foi removido — automaticamente, como duplicado, ou manualmente — com o motivo, a indicação do tema mantido, e um botão **↩ Repor** por item. **Nenhuma remoção é definitiva.**

### Passo 4 — Exportação

Gera os documentos finais, **todos editáveis antes de usar**:

- **Um email por órgão impactado** (TWR Lisboa, CC Lisboa, TWR Porto, TWR Cascais, TWR Faro, TWR Funchal, TWR Porto Santo) — cada um só com as alterações que afectam esse órgão, com a Acção, os sistemas e a análise de impacto;
- **A nota técnica para o ATOPLIS** — agrupada por parte (GEN → ENR → aeródromos por ordem alfabética), com secção, categorias, **Acção no(s) registo(s)**, sistemas, ficheiros TOPSKY e a análise de impacto de cada item. No fim, a secção "**Itens revistos sem acção nos sistemas**" documenta tudo o que foi analisado e conscientemente excluído, com o motivo — para que fique registado que o item foi visto, mesmo sem acção. A nota pode ser impressa ou guardada em PDF a partir do browser.

> Nota: os níveis de impacto (ALTO/MÉDIO/BAIXO) são apenas uma ajuda de priorização **dentro** da aplicação — **não aparecem** nos emails nem na nota técnica.

---

## 5. Funções transversais (disponíveis em qualquer passo)

| Botão (barra do topo) | O que faz |
|---|---|
| **? Ajuda** | Abre o painel de ajuda com a legenda completa: níveis de impacto, Acção, categorias, sistemas analisados, cache partilhada, e o funcionamento dos duplicados e das reposições. |
| **⇄ Comparação de alterações** | Vista global lado a lado: eAIP em vigor à esquerda, emenda à direita, com as diferenças realçadas. |
| **⬇ Exportar sessão** | Descarrega toda a sessão (selecções, órgãos, sistemas, descrições, remoções) como ficheiro JSON — para arquivo ou para continuar noutro computador (**⬆ Importar JSON** no passo 1). |
| **✕ Limpar** | Apaga a análise do ecrã e volta ao passo 1 (a sessão guardada mantém-se na lista e pode ser retomada). |
| **Barra do Worker** | Mostra/edita a URL do Cloudflare Worker e testa a ligação à API. |

**Gravação automática:** o trabalho é guardado automaticamente no browser, **por número de AIRAC**. Pode fechar o separador a meio e retomar mais tarde na lista "Sessões guardadas" do passo 1. A gravação é local ao browser/computador; para mudar de máquina, use Exportar/Importar sessão.

---

## 6. Cache partilhada — cada AIRAC paga-se uma vez

Sem cache, cada pessoa que carregasse o mesmo PDF pagava a análise outra vez (e com vários analistas — GOPLIS, ATOPLIS, ICALIS — o mesmo ciclo podia custar vários euros). A partir da v2.6:

- **A primeira análise de um AIRAC** corre normalmente e, no fim do refinamento, o resultado é guardado automaticamente na KV do Worker ("Análise partilhada na cache...");
- **Todas as análises seguintes do mesmo PDF** — por qualquer pessoa, em qualquer computador — encontram a análise na cache e recebem-na em segundos: "✓ Este AIRAC já foi analisado por alguém em [data] — a usar a análise da cache, sem custos de IA";
- O que vai para a cache é a **análise neutra**: lista de alterações, descrições refinadas, categorias validadas e Acções. As edições pessoais (selecções, órgãos ajustados, descrições ATOPLIS escritas) ficam na sessão local de cada um e **não** contaminam a cache;
- Bónus importante: **todos os analistas partem exactamente da mesma lista** — consistência total entre quem analisa;
- A identificação é feita pela impressão digital (SHA-256) do sumário do PDF — o mesmo ficheiro dá sempre a mesma chave;
- As entradas expiram ao fim de **120 dias** (um AIRAC deixa de ser relevante muito antes);
- As operações individuais ("O que mudou (IA)" num item, "✨ Gerar com IA" numa descrição) continuam a pagar-se à peça, porque dependem do que cada pessoa pede;
- Se a KV não estiver configurada no Worker, **nada parte**: a aplicação avisa "(cache não configurada no Worker — análise normal)" e funciona como antes.

---

## 7. Níveis de impacto, Acção e categorias

### Níveis de impacto

Atribuídos automaticamente pela IA na extracção; servem para priorizar a revisão. **Não aparecem no relatório final.**

| Nível | Significado |
|---|---|
| 🔴 **ALTO** | Novo navaid, procedimento ou fixo (SID/STAR/IAP/WPT/NAV/RWY/HLP) — exige actualização da base de dados de navegação dos sistemas. |
| 🟡 **MÉDIO** | Modificação de dados de navegação existentes (HLDG/FREQ/AWY/MSA). |
| 🟢 **BAIXO** | Alteração operacional ou administrativa sem impacto na base de dados de navegação (PROC/FPL/SPACE/RESTRICT/GER). |

### Acção sobre os registos (novo na v2.5)

Atribuída pela IA na Fase 2, a partir do texto real das páginas da emenda. É a linguagem de quem edita os ficheiros dos sistemas, e **aparece nos emails e na nota técnica**:

| Etiqueta | Significado |
|---|---|
| 🟩 **INSERIR** | Registo novo nos sistemas (ex.: novo heliporto, novo waypoint). |
| 🟨 **MODIFICAR** | Registo existente alterado — inclui **retiradas parciais** (ex.: VOR do SGR retirado mas DME mantido → o registo passa a DME-only, não se elimina) e correcções de valores (coordenadas, frequências). |
| 🟥 **ELIMINAR** | Registo completamente removido (ex.: NDB LAR retirado). |
| ⬜ **SEM REGISTO** | Alteração editorial ou só de carta, sem registo de dados afectado. |

### Categorias

As categorias **NAV-DB** implicam actualização dos datasets dos sistemas; as **Operacionais** não. Na Fase 2, as categorias atribuídas no sumário são **verificadas e corrigidas** contra o texto real da emenda, com revalidação automática dos sistemas.

| Categoria | Significado | Tipo |
|---|---|---|
| SID | Procedimento de partida (*Standard Instrument Departure*) | NAV-DB |
| STAR | Procedimento de chegada (*Standard Arrival*) | NAV-DB |
| IAP | Aproximação por instrumentos | NAV-DB |
| HLDG | Espera publicada (*holding*) | NAV-DB |
| WPT | Fixo / waypoint | NAV-DB |
| NAV | Ajuda rádio à navegação (VOR/NDB/DME/ILS) | NAV-DB |
| RWY | Designação ou parâmetros de pista | NAV-DB |
| FREQ | Frequência de comunicação ou navegação | NAV-DB |
| AWY | Airway / rota ENR | NAV-DB |
| MSA | Altitude mínima de sector | NAV-DB |
| HLP | Helicóptero / heliporto | NAV-DB |
| PROC | Procedimento ATC operacional (sem dados de navegação) | Operacional |
| FPL | Plano de voo / FF-ICE / AIDC / AFTN | Operacional |
| SPACE | Classificação ou limites de espaço aéreo | Operacional |
| RESTRICT | Área restrita / proibida | Operacional |
| GER | Administrativo / formatação | Operacional |

---

## 8. Sistemas analisados

Definidos no início do código (`SYSTEMS_DEF`), por isso fáceis de ajustar no futuro. A atribuição faz-se por categoria **e** por palavras-chave — que desde a v2.5 são procuradas **também no texto completo das páginas da emenda**, não só na descrição curta. Cada sistema atribuído mostra, ao passar o rato, **a regra que o atribuiu**. A legenda completa está no painel **? Ajuda** da aplicação.

| Sistema | Fornecedor | Órgãos | Nota |
|---|---|---|---|
| **TOPSKY-ATC** | Thales | Todos | Sistema ATC principal; a aplicação indica os **ficheiros de dataset** concretos a actualizar (ex.: `CHARACTERISTIC_POINTS`) consoante a categoria da alteração. |
| **GEC** | NAV Portugal | CC Lisboa | BD estática (offline). |
| **TWRATM** | NAV Portugal | Torres (excepto Lisboa) | Filtrado automaticamente para o órgão do aeródromo da alteração. |
| **EFS** | NAV Portugal | TWR Lisboa | *Electronic Flight Strips*; sensível a layout (taxiways, aprons, stands) — só LPPT. |
| **Runway Manager** | NAV Portugal | TWR Lisboa, CC Lisboa | Sensível a designadores de pista, numeração de stands, thresholds. |
| **ASMGCS** | Externo | TWR Lisboa, Porto, Faro | Vigilância de movimentos no solo; sensível a alterações de layout do aeródromo. |

---

## 9. Órgãos notificados

| Órgão | Código | Email |
|---|---|---|
| TWR Lisboa | LPPT | twrlis@nav.pt |
| CC Lisboa | LPPO | cclis@nav.pt |
| TWR Porto | LPPR | twrpor@nav.pt |
| TWR Cascais | LPCS | twrcas@nav.pt |
| TWR Faro | LPFR | twrfar@nav.pt |
| TWR Funchal | LPMA | twrfun@nav.pt |
| TWR Porto Santo | LPPS | twrsan@nav.pt |

---

## 10. Como funciona por dentro

Explicação simples da arquitectura, sem jargão:

- **Tudo acontece no browser.** A aplicação é um único ficheiro `index.html` (HTML + CSS + JavaScript). Não há servidor próprio nem instalação. A única biblioteca externa é o **PDF.js** (da Mozilla, carregado de um CDN), que lê o texto dos PDFs localmente.
- **A IA é o modelo Claude, da Anthropic.** A aplicação usa dois modelos: **Claude Sonnet** para a extracção da lista, a Fase 2 (refinar + validar + Acção) e as descrições oficiais (tarefas onde a qualidade importa), e **Claude Haiku** (mais barato) para a comparação "O que mudou (IA)" no modal.
- **As chamadas à IA passam por um Cloudflare Worker.** Porque a chave da API nunca pode estar no código público da página, e porque o browser não pode chamar directamente certos sites (restrição CORS). O Worker faz três coisas: reencaminha os pedidos para a API da Anthropic (acrescentando a chave, guardada em segurança), descarrega os PDFs do eAIP de `ais.nav.pt`, e aloja a **cache partilhada** das análises (Cloudflare KV).
- **Consistência dos resultados:** a extracção usa `temperature: 0` (a IA dá sempre a resposta mais provável) e regras de granularidade explícitas (um item por assunto por secção; nunca juntar dois navaids; cada carta é um item próprio; retiradas **parciais** de navaids têm de o dizer explicitamente). E com a cache partilhada, o mesmo AIRAC dá **exactamente** o mesmo resultado a toda a gente.
- **Análise em 2 fases** para evitar chamadas longas (o Cloudflare corta ligações acima de 100 segundos — erro 524): a Fase 1 envia só o sumário; a Fase 2 trabalha em pequenos lotes, em segundo plano.
- **Robustez:** cada chamada à API tem feedback de espera a cada 15 s, timeout de segurança de 115 s e uma nova tentativa automática antes de reportar erro.

---

## 11. Custos e créditos da API

A API da Anthropic é **pré-paga**: compram-se créditos no **Console** (https://console.anthropic.com → secção *Billing* / *Plans & Billing*) e cada chamada desconta uns cêntimos. Atenção: a subscrição Claude Pro/Max é **separada** dos créditos da API — não se comunicam.

Ordem de grandeza com a v2.6 (ciclo típico de ~32 itens):

| Operação | Modelo | Custo aproximado |
|---|---|---|
| **1ª análise do ciclo** (Fase 1 + Fase 2) | Sonnet | ~$0.15–0.20 |
| **Análises seguintes do mesmo ciclo** (qualquer pessoa) | cache | **$0.00** |
| ✨ Gerar descrições ATOPLIS (todas) | Sonnet | ~$0.20–0.35 |
| "O que mudou (IA)" por item | Haiku | < $0.01 cada |
| **Total típico por ciclo (equipa inteira)** | | **~$0.40–0.55** |

Graças à cache, o custo é **por ciclo**, não por análise — analise-o uma pessoa ou cinco.

Recomendações no Console: definir um **spend limit** mensal no workspace e um **alerta** de saldo; opcionalmente activar o *auto-reload*. Se houver mais do que um *workspace*, os créditos têm de estar no **mesmo workspace** onde foi criada a chave usada pelo Worker.

---

## 12. Instalação e publicação

A aplicação está publicada com **GitHub Pages** — o GitHub serve o `index.html` como página web pública.

**Para actualizar a aplicação:**

1. Substituir o `index.html` na pasta local de trabalho;
2. No GitHub, abrir o repositório `ATOP_LIS_AIR_AC` → clicar em `index.html` → ícone do lápis (*Edit*) → colar o conteúdo novo → **Commit changes**;
3. Aguardar 1–2 minutos e recarregar https://mendreas.github.io/ATOP_LIS_AIR_AC/ (se necessário, forçar com Ctrl+F5).

**Para instalar de raiz noutro repositório:** criar um repositório público, adicionar o `index.html`, e em *Settings → Pages* escolher *Deploy from a branch* → `main` → `/ (root)`.

---

## 13. Configuração do Cloudflare Worker

O Worker é o intermediário entre a aplicação e os serviços externos. Comporta-se assim:

- **Pedido com `messages`** → reencaminha para a API da Anthropic (`api.anthropic.com`), acrescentando a chave guardada no *Secret* `ANTHROPIC_API_KEY`, e devolve a resposta;
- **Pedido com `_fetchUrl`** → descarrega o PDF do eAIP indicado e devolve-o em base64;
- **Pedidos `_cacheGet` / `_cachePut`** → lê/guarda análises na cache partilhada (KV);
- Responde com os cabeçalhos CORS necessários para a página o poder chamar.

**Protecções incluídas (v2.6):**

- Só aceita pedidos vindos da aplicação (allowlist de *Origin*: `mendreas.github.io` + ficheiro local para testes) — outras páginas e scripts casuais não conseguem gastar os créditos;
- Só permite os **modelos** que a aplicação usa (Sonnet/Haiku) — ninguém usa a chave para modelos mais caros;
- O download de PDFs só funciona para `ais.nav.pt` — o Worker não serve de proxy aberto;
- As chaves da cache têm formato validado e as entradas têm limite de tamanho.

> Nota honesta: um atacante determinado pode forjar o cabeçalho Origin fora do browser. Estas protecções travam o abuso casual; a rede de segurança final é o **spend limit** no Console da Anthropic.

**Configuração (uma vez):**

1. Conta gratuita em https://dash.cloudflare.com → *Workers & Pages* → criar (ou abrir) o Worker;
2. *Edit code* → colar o conteúdo de `airac_worker.js` → **Deploy**;
3. *Settings → Variables and Secrets* → *Secret* `ANTHROPIC_API_KEY` com a chave criada em https://console.anthropic.com;
4. **Cache partilhada (recomendado):** menu do Cloudflare → *Storage & Databases → KV* → *Create a namespace* (nome livre, ex. `AIRAC_CACHE`). Depois, no Worker → *Settings → Bindings → Add binding* → tipo **KV namespace** → *Variable name*: `AIRAC_CACHE` (**exactamente assim**, maiúsculas — é o nome que o código usa; o nome do namespace em si é livre) → escolher o namespace → guardar/Deploy. Confirmação: em *Settings → Bindings* deve aparecer a linha `KV namespace | AIRAC_CACHE | ...`;
5. Copiar a URL do Worker (ex.: `https://xxxx.workers.dev`) para a barra no topo da aplicação e clicar **Testar ligação**.

---

## 14. Resolução de problemas

| Sintoma | Causa | Solução |
|---|---|---|
| Parado em "A contactar API..." sem mensagens | Versões antigas não tinham timeout nem feedback | Actualizar: desde a v2.5, mostra a espera a cada 15 s, corta aos 115 s e tenta de novo sozinha. |
| "Erro 524" / "O Cloudflare cortou a ligação" | A resposta da IA demorou mais de 100 s (limite do Cloudflare) | A aplicação tenta de novo automaticamente. Se falhar duas vezes, aguardar um momento e repetir. |
| "Your credit balance is too low to access the Anthropic API" | Créditos da API esgotados | Carregar créditos no Console da Anthropic (*Billing*), no **workspace** da chave usada pelo Worker. Ver [secção 11](#11-custos-e-créditos-da-api). |
| "(cache não configurada no Worker — análise normal)" | A KV não está ligada ao Worker | Seguir o passo 4 da [secção 13](#13-configuração-do-cloudflare-worker). Tudo funciona sem a KV — só não há cache. |
| "Origem não autorizada" | A app está a ser servida de um endereço fora da allowlist do Worker | Acrescentar esse endereço a `ALLOWED_ORIGINS` no `airac_worker.js` e fazer Deploy. (Também explica porque pedidos por curl/scripts são recusados — é propositado.) |
| "O site do eAIP da NAV (ais.nav.pt) está indisponível (em manutenção)" | O site AIS está offline | Não é problema da aplicação. A análise do AIRAC **não é afectada**; só a comparação com o eAIP fica indisponível até o site voltar. |
| "Não foi possível extrair alterações" | O PDF não é uma emenda AIRAC da NAV, ou o texto não foi legível | Confirmar que é o PDF oficial `LP_Amdt_A_..._en.pdf` (com texto, não digitalizado como imagem). |
| "⚠ Resposta da IA truncada" | A lista excedeu o limite de resposta | Comparar com o sumário do PDF e, se faltar algo, repetir o upload. |
| A cache não "apanha" um PDF que já foi analisado | O ficheiro não é exactamente o mesmo (ex.: versão re-descarregada com diferenças) | A chave é a impressão digital do sumário: ficheiros diferentes dão chaves diferentes. Usar o mesmo PDF partilhado pela equipa. |
| Um item do GEN aparece noutro grupo | A IA classificou pelo assunto em vez do local de publicação | Salvaguarda automática desde a v2.5 (força GEN/ENR pelo número de secção) — actualizar se usa versão anterior. |
| "Configure a URL do Worker primeiro" | A barra do topo está vazia | Colar a URL do Worker e clicar **Testar ligação**. |
| O trabalho desapareceu noutro computador | A gravação automática é local ao browser | Usar **⬇ Exportar sessão** num computador e **⬆ Importar JSON** no outro. (A cache partilha a *análise*, não as edições pessoais.) |

---

## 15. Privacidade e limitações

- **O PDF é lido localmente** no browser. O que é enviado para fora é: o **texto do sumário** e excertos das páginas de substituição (para a API da Anthropic, via Worker, para análise), os pedidos de download dos PDFs públicos do eAIP, e a **análise neutra** guardada na cache do Worker (lista, descrições, categorias, Acções — conteúdo derivado de documentos públicos do AIP). As edições pessoais ficam no browser de cada utilizador.
- **A IA pode errar ou omitir.** A extracção, as classificações e as descrições são propostas de partida — a **revisão humana é obrigatória** antes de qualquer notificação. A secção "Itens revistos sem acção nos sistemas" da nota técnica existe precisamente para documentar essa revisão.
- A ferramenta é um **apoio interno de preparação de trabalho**; não é um sistema certificado nem substitui os procedimentos oficiais de gestão da informação aeronáutica.
- Os emails gerados **não são enviados automaticamente** — são texto para copiar/colar, sempre com revisão prévia.

---

## 16. Ficheiros do repositório

| Ficheiro | Descrição |
|---|---|
| `index.html` | A aplicação completa (HTML + CSS + JavaScript num único ficheiro; única dependência externa: PDF.js, via CDN). |
| `airac_worker.js` | Código do Cloudflare Worker (proxy API + eAIP + cache partilhada, com as protecções descritas na secção 13). |
| `README.md` | Este documento. |

---

## 17. Histórico de versões

**v2.6 (Outubro 2026)**
- **Cache partilhada** (Cloudflare KV): a primeira análise de cada AIRAC fica guardada no Worker; todas as análises seguintes do mesmo PDF — por qualquer pessoa — são instantâneas e gratuitas, com resultados idênticos para todos. Expiração a 120 dias; funciona sem a KV (modo normal);
- Worker com validação de chaves de cache e limite de tamanho das entradas.

**v2.5 (Outubro 2026)**
- **Validação de categorias na Fase 2**: as categorias do sumário são confirmadas/corrigidas contra o texto real da emenda, com **revalidação automática dos sistemas e órgãos** (edições manuais sempre respeitadas);
- Campo **Acção** por item (INSERIR/MODIFICAR/ELIMINAR/SEM REGISTO), visível na app, nos emails e na nota técnica;
- Palavras-chave dos sistemas (EFS, Runway Manager, ASMGCS) aplicadas **também ao texto das páginas da emenda**;
- Tooltip "**porquê**" em cada sistema atribuído (a categoria ou termo que disparou a regra);
- **Worker protegido**: allowlist de Origin, allowlist de modelos, download restrito a `ais.nav.pt`.

**v2.4 (Outubro 2026)**
- Análise em **2 fases** (sumário primeiro; refinamento das descrições em lotes, em segundo plano) — chamadas mais rápidas, mais baratas e sem erros 524;
- Chamadas à API com **feedback de espera**, **timeout de 115 s** e **nova tentativa automática**;
- **Detecção de duplicados** por identificador específico e nomes próprios, com item principal preservado; remoções **reversíveis** na secção **Removidos**; botões **↺ Repor análise inicial** (passos 2 e 3);
- Distinção entre retirada **total** e **parcial** de navaids (ex.: VOR retirado, DME mantido);
- Nota técnica agrupada por parte (sem níveis de impacto) + secção "**Itens revistos sem acção nos sistemas**";
- Painel **? Ajuda**; salvaguarda de classificação GEN/ENR; extracção com `temperature: 0` e regras de granularidade; modelo Haiku na comparação eAIP; mensagens de erro claras (créditos, 524, eAIP em manutenção);
- Gravação automática por AIRAC, Exportar/Importar sessão, comparação global eAIP ⇄ emenda, geração de descrições em lote.

**v2.3 e anteriores** — versão base: fluxo de 4 passos, extracção por IA, mapeamento de órgãos/sistemas, exportação de emails e nota técnica.
