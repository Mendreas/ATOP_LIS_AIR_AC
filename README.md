# AIRAC Impact Tool — NAV Portugal / GOPLIS

Ferramenta de página única (`index.html`) para identificar, em cada emenda AIRAC do AIP Portugal, as alterações com impacto nos sistemas ATC da FIR de Lisboa e preparar a notificação aos órgãos e ao ATOPLIS.

Publicada em: https://mendreas.github.io/ATOP_LIS_AIR_AC/

## Fluxo de trabalho

1. **Upload AIRAC** — carregar o PDF do AIP Amendment (`LP_Amdt_A_YYYY_NNN_en.pdf`). A ferramenta lê o PDF no browser, extrai o sumário (secções 1 AIRAC e 2 NON-AIRAC) e as páginas de substituição das secções referidas, e pede à IA a lista de alterações.
2. **Alterações** — lista filtrável (parte GEN/ENR/AD, categoria, sistema, impacto). Itens fora da FIR de Lisboa (Açores) e sem sistema associado ficam desseleccionados. Em cada item, **Analisar** abre o detalhe: texto actualmente publicado (eAIP), texto novo (emenda), comparação por IA, órgãos e sistemas impactados, descrição para o ATOPLIS.
3. **Impacto** — revisão por aeródromo/parte; detecção de duplicados (cartas que só reflectem uma alteração já listada); geração em lote das descrições em falta.
4. **Exportação** — um email por órgão (TWR Lisboa, CC Lisboa, TWR Porto, Cascais, Faro, Funchal, Porto Santo) e a nota técnica para o ATOPLIS, editável antes de imprimir/guardar em PDF.

O trabalho é **guardado automaticamente** no browser por número de AIRAC; pode fechar o separador e retomar no passo 1. **Exportar sessão** gera um JSON para arquivo ou para continuar noutro computador.

## Quando usar

Entre a publicação da emenda e a sua data efectiva. Nessa janela o eAIP ainda mostra a versão anterior, pelo que a comparação "publicado agora vs novo texto" é real. Depois da data efectiva os dois textos coincidem.

## Pré-requisito: Cloudflare Worker

As chamadas à API Anthropic e a leitura do eAIP (`ais.nav.pt`) passam por um Cloudflare Worker (proxy), que guarda a chave da API e resolve o CORS. A URL do Worker está pré-definida no código e pode ser alterada na barra superior. O código do Worker está em `airac_worker.js` do histórico deste repositório; a chave é guardada como *Secret* `ANTHROPIC_API_KEY` nas definições do Worker.

## Ficheiros

- `index.html` — a aplicação (HTML + CSS + JS, sem dependências além do PDF.js carregado de CDN)
- `README.md` — este ficheiro

## Sistemas e categorias

Definidos no início do script (`SYSTEMS_DEF`): TOPSKY-ATC (com os ficheiros de dataset a actualizar por categoria), GEC, TWRATM, EFS, Runway Manager, ASMGCS. As categorias NAV-DB (SID, STAR, IAP, HLDG, WPT, NAV, RWY, FREQ, AWY, MSA, HLP) implicam actualização de bases de dados de navegação; as operacionais (PROC, FPL, SPACE, RESTRICT, GER) não. O painel **? Ajuda** na aplicação tem a legenda completa.
