# Matriz de Sistemas — AIRAC Impact Tool

**Documento de referência e validação da matriz de decisão da aplicação** (constante `SYSTEMS_DEF` do `index.html`, v3.5).

É esta matriz que decide, para cada alteração do AIRAC, **que sistemas são impactados, que ficheiros de dataset são tocados e que órgãos são notificados**. Toda a análise de impacto da aplicação assenta aqui.

> ⚠️ **Origem e estado:** esta matriz foi construída a partir de conhecimento operacional transmitido durante o desenvolvimento da aplicação — **não deriva de documentação oficial dos sistemas** (manuais de adaptação, ICDs, procedimentos ATOPLIS). Precisa de ser **validada pelo ATOPLIS** antes de ser considerada fiável. As questões em aberto estão assinaladas com ❓ e resumidas no fim, na [checklist de validação](#checklist-de-validação-para-o-atoplis).

---

## Como a aplicação usa esta matriz

Para cada alteração extraída do AIRAC, a aplicação verifica, sistema a sistema:

1. **Categoria** — a alteração tem alguma das categorias que afetam o sistema? (ex.: uma alteração NAV afeta o TOPSKY)
2. **Palavras-chave** (alguns sistemas) — a descrição **ou o texto das páginas da emenda** contém termos como "taxiway" ou "apron"? (usado para EFS, Runway Manager e ASMGCS)
3. **Parte do AIP** — o sistema só é considerado para alterações das partes indicadas (AD / ENR / GEN)
4. **Âmbito de aeródromo** — nos sistemas locais ("por AD"), só é notificado o órgão do aeródromo da alteração
5. **Restrição de aeródromo** — alguns sistemas só existem em certos aeródromos (ex.: EFS só no LPPT)

Se as condições se verificam, o sistema é marcado como impactado, com os **ficheiros** correspondentes à categoria (quando definidos). Na aplicação, passar o rato sobre um sistema atribuído mostra a regra que disparou.

A **validação por IA** (Fase 2) confirma as categorias contra o texto real da emenda, mas as regras categoria→sistema→ficheiros são sempre as desta matriz.

---

## Sistemas

### 1. TOPSKY-ATC (Thales)

Sistema ATC principal. **Dataset partilhado**: uma alteração em qualquer parte do AIP atualiza o dataset central.

| Propriedade | Valor |
|---|---|
| Órgãos associados | **Todos os 7** (TWR Lisboa, CC Lisboa, TWR Porto, TWR Cascais, TWR Faro, TWR Funchal, TWR Porto Santo) |
| Partes do AIP | AD, ENR e GEN |
| Âmbito | Global (não limitado ao aeródromo da alteração) |
| Categorias que o afetam | SID, STAR, IAP, HLDG, WPT, NAV, RWY, FREQ, AWY, MSA, HLP |

**Ficheiros de dataset por categoria:**

| Categoria | Ficheiros TOPSKY a atualizar |
|---|---|
| SID | ROUTES, SID_ALLOCATION, CHARACTERISTIC_POINTS |
| STAR | ROUTES, STAR_ALLOCATION, CHARACTERISTIC_POINTS |
| IAP | ROUTES, CHARACTERISTIC_POINTS |
| HLDG | ODS_HOLDING, CHARACTERISTIC_POINTS |
| WPT | CHARACTERISTIC_POINTS |
| NAV | CHARACTERISTIC_POINTS |
| RWY | AIRPORT_RUNWAY |
| FREQ | AIRPORT_RUNWAY ❓ |
| AWY | ROUTES, AIRWAY_CONNECTION, CHARACTERISTIC_POINTS |
| MSA | ROUTES |
| HLP | CHARACTERISTIC_POINTS, AIRPORT_RUNWAY |

❓ **A validar:** o mapeamento **FREQ → AIRPORT_RUNWAY** parece suspeito — uma alteração de frequência de comunicação ou de navegação atualiza-se mesmo no ficheiro AIRPORT_RUNWAY? Ou há outro ficheiro (ou nenhum)?

❓ **A validar:** sendo o dataset partilhado, a **notificação** deve mesmo ir aos 7 órgãos para qualquer alteração (ex.: um SID de Faro notifica TWR Porto Santo)? Ou deve ir apenas ao órgão do aeródromo + CC Lisboa, ficando a atualização do dataset como ação central única? (Decisão pendente desde a revisão de outubro 2026.)

---

### 2. GEC (NAV Portugal)

| Propriedade | Valor |
|---|---|
| Órgãos associados | CC Lisboa |
| Partes do AIP | AD e ENR (não GEN) |
| Âmbito | Global |
| Categorias que o afetam | STAR, HLDG, FREQ, SID |
| Ficheiros | "BD Estática (offline)" para todas as categorias |

❓ **A validar:** a lista de categorias está completa? O GEC não é afetado por WPT, NAV ou AWY? E a designação do destino ("BD Estática (offline)") é a correta para constar na nota técnica?

---

### 3. TWRATM (NAV Portugal)

| Propriedade | Valor |
|---|---|
| Órgãos associados | TWR Porto, TWR Cascais, TWR Faro, TWR Funchal, TWR Porto Santo (**não** TWR Lisboa nem CC Lisboa) |
| Partes do AIP | AD e ENR |
| Âmbito | **Por aeródromo** — só o órgão do AD da alteração é notificado (ex.: um SID do LPFR só marca TWR Faro) |
| Categorias que o afetam | SID, STAR, WPT, NAV, AWY |
| Ficheiros | (não definidos na matriz) ❓ |

❓ **A validar:** que ficheiros/parâmetros concretos se atualizam no TWRATM? A nota técnica ficaria mais útil com essa informação, como no TOPSKY.

---

### 4. EFS — Electronic Flight Strips (NAV Portugal)

| Propriedade | Valor |
|---|---|
| Órgãos associados | TWR Lisboa |
| Partes do AIP | Só AD |
| Âmbito | **Só LPPT** |
| Categorias que o afetam | SID |
| Palavras-chave adicionais | layout, taxiway, twy, stand, apron |
| Ficheiros | (não definidos) ❓ |

As palavras-chave são procuradas na descrição **e** no texto completo das páginas da emenda — uma alteração do LPPT classificada como GER mas cujas páginas falem de taxiways dispara o EFS na mesma.

❓ **A validar:** só SIDs e layout? Alterações de frequências ou designadores de pista do LPPT não afetam o EFS?

---

### 5. Runway Manager (NAV Portugal)

| Propriedade | Valor |
|---|---|
| Órgãos associados | TWR Lisboa, CC Lisboa |
| Partes do AIP | Só AD |
| Âmbito | Por aeródromo |
| Categorias que o afetam | RWY |
| Palavras-chave adicionais | designador, numeração de stand, stand number, threshold |
| Ficheiros | (não definidos) ❓ |

❓ **A validar:** o Runway Manager existe só no LPPT (como o EFS) ou noutros aeródromos? A matriz atual permite dispará-lo em qualquer AD, mas só notifica TWR Lisboa/CC Lisboa — é coerente?

---

### 6. ASMGCS (fornecedor externo)

Vigilância de movimentos no solo.

| Propriedade | Valor |
|---|---|
| Órgãos associados | TWR Lisboa, TWR Porto, TWR Faro |
| Partes do AIP | Só AD |
| Âmbito | Por aeródromo (LPPT → TWR Lisboa; LPPR → TWR Porto; LPFR → TWR Faro) |
| Categorias que o afetam | RWY |
| Palavras-chave adicionais | taxiway, twy, apron, aerodrome layout, layout aeródromo |
| Ficheiros | (não definidos) ❓ |

❓ **A validar:** a lista de aeródromos com ASMGCS está correta e atual?

---

## Órgãos e contactos

| ID | Órgão | Código | Email |
|---|---|---|---|
| TWRLIS | TWR Lisboa | LPPT | twrlis@nav.pt |
| CCLIS | CC Lisboa | LPPO | cclis@nav.pt |
| TWRPOR | TWR Porto | LPPR | twrpor@nav.pt |
| TWRCAS | TWR Cascais | LPCS | twrcas@nav.pt |
| TWRFAR | TWR Faro | LPFR | twrfar@nav.pt |
| TWRFUN | TWR Funchal | LPMA | twrfun@nav.pt |
| TWRSAN | TWR Porto Santo | LPPS | twrsan@nav.pt |

**Associação parte/aeródromo → órgãos de retaguarda** (usada quando nenhum sistema define órgãos):

| Parte / AD | Órgãos |
|---|---|
| LPPT | TWR Lisboa + CC Lisboa |
| LPPR / LPCS / LPFR / LPMA / LPPS | TWR do próprio aeródromo |
| ENR | CC Lisboa |
| GEN | CC Lisboa + TWR Lisboa ❓ |

❓ **A validar:** as alterações GEN (ex.: novo heliporto nos location indicators) devem notificar CC Lisboa + TWR Lisboa, ou outra combinação?

---

## Categorias (referência)

As categorias **NAV-DB** implicam atualização de datasets; as **Operacionais** não disparam sistemas.

| NAV-DB | Significado | | Operacional | Significado |
|---|---|---|---|---|
| SID | Partida instrumentos | | PROC | Procedimento ATC sem dados nav |
| STAR | Chegada standard | | FPL | Plano de voo / FF-ICE / AIDC / AFTN |
| IAP | Aproximação instrumentos | | SPACE | Classificação/limites espaço aéreo |
| HLDG | Espera publicada | | RESTRICT | Área restrita/proibida |
| WPT | Fixo / waypoint | | GER | Administrativo / formatação |
| NAV | Navaid (VOR/NDB/DME/ILS) | | | |
| RWY | Pista (designação/parâmetros) | | | |
| FREQ | Frequência COM/NAV | | | |
| AWY | Airway / rota ENR | | | |
| MSA | Altitude mínima de sector | | | |
| HLP | Heliporto / helicóptero | | | |

❓ **A validar:** uma alteração **PROC / SPACE / RESTRICT** nunca exige mudanças nos sistemas? (ex.: nova área restrita → video maps do TOPSKY?) Hoje a matriz não dispara nenhum sistema para estas categorias — se os video maps ou outros parâmetros forem afetados, falta aqui uma regra.

---

## Checklist de validação (para o ATOPLIS)

Sessão sugerida: percorrer esta lista com 2-3 AIRAC passados ao lado da análise manual.

1. ☐ TOPSKY: mapeamento **FREQ → AIRPORT_RUNWAY** está correto?
2. ☐ TOPSKY: notificar os **7 órgãos** sempre, ou órgão do AD + CC Lisboa?
3. ☐ GEC: categorias completas (WPT? NAV? AWY?) e nome correto do destino ("BD Estática")?
4. ☐ TWRATM: que parâmetros/ficheiros concretos se atualizam?
5. ☐ EFS: só SID+layout no LPPT? FREQ/RWY não contam?
6. ☐ Runway Manager: em que aeródromos existe?
7. ☐ ASMGCS: lista de aeródromos (LPPT, LPPR, LPFR) atual?
8. ☐ GEN → CC Lisboa + TWR Lisboa é a notificação certa?
9. ☐ Categorias operacionais (PROC/SPACE/RESTRICT): confirmam que nunca tocam nos sistemas (incl. video maps)?
10. ☐ Falta algum sistema na matriz? (ex.: sistemas MET, AMAN, simuladores…)

---

## Como alterar a matriz

As regras vivem no início do `<script>` do `index.html`, nas constantes `ORGANS`, `SYSTEMS_DEF` e `AD_ORG`. Cada sistema é um bloco legível; os campos são:

- `organs` — órgãos associados (IDs da tabela de órgãos)
- `cats` — categorias que disparam o sistema
- `kw` — palavras-chave adicionais (opcional)
- `secs` — partes do AIP onde o sistema conta (`AD`, `ENR`, `GEN`)
- `adScoped` — `true` = só notifica o órgão do aeródromo da alteração
- `onlyADs` — restringe a certos aeródromos (opcional)
- `files` — ficheiros por categoria, mostrados na app e na nota técnica (opcional)

Depois de editar, publicar o `index.html` no GitHub como habitualmente. **Qualquer correção validada pelo ATOPLIS deve ser refletida no código e neste documento ao mesmo tempo**, para os dois não divergirem.

---

*Documento gerado a partir do `index.html` v3.5 (novembro 2026). Em caso de dúvida, o código é a referência — este documento descreve-o.*
