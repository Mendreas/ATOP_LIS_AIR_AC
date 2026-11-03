# Matriz de Sistemas — AIRAC Impact Tool

**Documento de referência e validação da matriz de decisão da aplicação** (constante `SYSTEMS_DEF` do `index.html`, v3.6).

É esta matriz que decide, para cada alteração do AIRAC, **que sistemas são impactados, que ficheiros de dataset são tocados e que órgãos são notificados**. Toda a análise de impacto da aplicação assenta aqui.

> ⚠️ **Origem e estado:** esta matriz foi construída a partir de conhecimento operacional transmitido durante o desenvolvimento da aplicação — **não deriva de documentação oficial dos sistemas**. Em **novembro de 2026** foi feita uma **primeira ronda de validação** (notificação TOPSKY por órgão impactado, EFS, Runway Manager, ASMGCS, órgãos do GEN — assinaladas com ✅). As questões ainda em aberto estão assinaladas com ❓ e resumidas na [checklist de validação](#checklist-de-validação-para-o-atoplis).

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
| Órgãos **notificados** | **Só os impactados** ✅ (validado 11/2026): o órgão do aeródromo da alteração, **mais o CC Lisboa** nas categorias de procedimentos/navegação (SID, STAR, IAP, HLDG, WPT, NAV, AWY, MSA, HLP). Ex.: SID de LPFR → TWR Faro + CC Lisboa; FREQ GND do LPPT → só TWR Lisboa. Alterações ENR → CC Lisboa; GEN → CC Lisboa + TWR Lisboa. |
| Partes do AIP | AD, ENR e GEN |
| Âmbito do dataset | Partilhado — a actualização é central e serve todos os órgãos |
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

✅ **Validado (11/2026):** a notificação vai **só aos órgãos impactados** — implementado como descrito na ficha acima.

❓ **A validar (nota da implementação):** nas categorias **FREQ e RWY**, o CC Lisboa não é incluído (seguindo o exemplo "FREQ GND → só TWR"). Confirmar que também nas alterações de **pista (RWY)** o CC Lisboa não precisa de notificação.

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
| Categorias que o afetam | SID, RWY ✅ (validado 11/2026: frequências **não** afetam o EFS; nomes de TWY e RWY **sim**) |
| Palavras-chave adicionais | layout, taxiway, twy, stand, apron |
| Ficheiros | (não definidos) ❓ |

As palavras-chave são procuradas na descrição **e** no texto completo das páginas da emenda — uma alteração do LPPT classificada como GER mas cujas páginas falem de taxiways dispara o EFS na mesma.

✅ **Validado (11/2026):** frequências não afetam o EFS; nomes de TWY e RWY sim — a categoria RWY foi acrescentada.

---

### 5. Runway Manager (NAV Portugal)

| Propriedade | Valor |
|---|---|
| Órgãos associados | TWR Lisboa, CC Lisboa (supervisão) |
| Partes do AIP | Só AD |
| Âmbito | **Só LPPT** ✅ (validado 11/2026) |
| Categorias que o afetam | RWY |
| Palavras-chave adicionais | designador, numeração de stand, stand number, threshold |
| Ficheiros | (não definidos) ❓ |

✅ **Validado (11/2026):** só existe no LPPT, com o CC Lisboa em supervisão — restrição implementada. ❓ Resta confirmar que não existe no Porto (crê-se que não).

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

✅ **Validado (11/2026):** a lista de aeródromos (LPPT, LPPR, LPFR) está correta.

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
| GEN | CC Lisboa + TWR Lisboa ✅ (validado 11/2026) |

✅ **Validado (11/2026):** mantém-se CC Lisboa + TWR Lisboa.

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
2. ☑ ~~TOPSKY: notificação~~ — **validado 11/2026**: só órgãos impactados (AD + CC Lisboa nas categorias de procedimentos/navegação)
3. ☐ TOPSKY: nas alterações de **pista (RWY)**, o CC Lisboa também fica de fora da notificação?
4. ☐ GEC: categorias completas (WPT? NAV? AWY?) e nome correto do destino ("BD Estática")?
5. ☐ TWRATM: que parâmetros/ficheiros concretos se atualizam?
6. ☑ ~~EFS~~ — **validado 11/2026**: FREQ não conta; nomes de TWY/RWY sim (categoria RWY acrescentada)
7. ☑ ~~Runway Manager~~ — **validado 11/2026**: só LPPT (❓ confirmar que não existe no Porto)
8. ☑ ~~ASMGCS~~ — **validado 11/2026**: lista correta
9. ☑ ~~GEN → órgãos~~ — **validado 11/2026**: mantém CC Lisboa + TWR Lisboa
10. ☐ Categorias operacionais (PROC/SPACE/RESTRICT): confirmam que nunca tocam nos sistemas (incl. video maps)?
11. ☐ Falta algum sistema na matriz? (ex.: sistemas MET, AMAN, simuladores…)

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

*Documento gerado a partir do `index.html` v3.6 (novembro 2026). Primeira ronda de validação ATOPLIS incorporada em 03-11-2026. Em caso de dúvida, o código é a referência — este documento descreve-o.*
