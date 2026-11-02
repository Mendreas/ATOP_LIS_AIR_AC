// ═══════════════════════════════════════════════════════════════════════════
// AIRAC Impact Tool — Cloudflare Worker (v2.6)
// Proxy seguro entre a aplicação e (1) a API da Anthropic e (2) o eAIP da NAV.
//
// PROTECÇÕES INCLUÍDAS NESTA VERSÃO:
//  - Só aceita pedidos vindos da aplicação (allowlist de Origin) — bloqueia
//    outras páginas web e scripts casuais de usarem a tua chave/créditos.
//  - Só permite os modelos que a aplicação usa (ninguém gasta créditos em
//    modelos mais caros através do Worker).
//  - O download de PDFs (_fetchUrl) só funciona para ais.nav.pt — o Worker
//    não pode ser usado como proxy aberto para outros sites.
//  Nota honesta: um atacante determinado pode forjar o cabeçalho Origin fora
//  do browser. Estas protecções travam o abuso casual; a rede de segurança
//  final é o "spend limit" definido no Console da Anthropic.
//
// CONFIGURAÇÃO (uma vez):
//  1. dash.cloudflare.com → Workers & Pages → o teu Worker → Edit code →
//     substituir todo o código por este ficheiro → Deploy.
//  2. Settings → Variables and Secrets → Secret ANTHROPIC_API_KEY
//     (mantém-se o mesmo que já tens — não é preciso mexer).
//  3. CACHE PARTILHADA (opcional mas recomendado): no painel do Cloudflare →
//     Storage & Databases → KV → "Create a namespace" → nome ex. AIRAC_CACHE.
//     Depois, no Worker → Settings → Bindings → "Add binding" → KV namespace →
//     Variable name: AIRAC_CACHE (exactamente assim) → escolher o namespace →
//     Deploy. Sem este passo, tudo funciona na mesma — só não há cache.
// ═══════════════════════════════════════════════════════════════════════════

// Quem pode chamar este Worker:
//  - a aplicação publicada no GitHub Pages;
//  - 'null' = ficheiro index.html aberto localmente no computador (testes).
const ALLOWED_ORIGINS = ['https://mendreas.github.io', 'null'];

// Modelos que a aplicação usa (prefixos aceites):
const ALLOWED_MODELS = ['claude-sonnet-4', 'claude-haiku-4'];

// Único site permitido para o _fetchUrl (download de PDFs do eAIP):
const ALLOWED_FETCH_HOST = 'ais.nav.pt';

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

function jsonResponse(obj, status, origin) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    // Preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: { message: 'Método não permitido.' } }, 405, origin);
    }

    // ── Protecção 1: Origin allowlist ─────────────────────────────────────
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return jsonResponse(
        { error: { message: 'Origem não autorizada. Este Worker só serve a aplicação AIRAC Impact Tool.' } },
        403, origin
      );
    }

    let body;
    try { body = await request.json(); }
    catch (e) { return jsonResponse({ error: { message: 'Corpo do pedido inválido (JSON esperado).' } }, 400, origin); }

    // ── Ramo cache partilhada (Cloudflare KV, binding AIRAC_CACHE) ────────
    // A 1ª análise de cada AIRAC fica guardada; as seguintes vêm daqui, sem
    // gastar créditos. Se a KV não estiver ligada, responde "nocache" e a
    // aplicação prossegue normalmente (nada parte).
    if (body && body._cacheGet) {
      if (!env.AIRAC_CACHE) return jsonResponse({ cached: null, nocache: true }, 200, origin);
      const key = String(body._cacheGet);
      if (!/^airac_[a-f0-9]{16,64}$/.test(key)) return jsonResponse({ error: { message: 'Chave de cache inválida.' } }, 400, origin);
      const val = await env.AIRAC_CACHE.get(key);
      let parsed = null;
      try { parsed = val ? JSON.parse(val) : null; } catch (e) {}
      return jsonResponse({ cached: parsed }, 200, origin);
    }
    if (body && body._cachePut) {
      if (!env.AIRAC_CACHE) return jsonResponse({ ok: false, nocache: true }, 200, origin);
      const key = String(body._cachePut);
      if (!/^airac_[a-f0-9]{16,64}$/.test(key)) return jsonResponse({ error: { message: 'Chave de cache inválida.' } }, 400, origin);
      const data = JSON.stringify(body.data || {});
      if (data.length > 2000000) return jsonResponse({ error: { message: 'Conteúdo demasiado grande para a cache.' } }, 413, origin);
      await env.AIRAC_CACHE.put(key, data, { expirationTtl: 60 * 60 * 24 * 120 }); // 120 dias
      return jsonResponse({ ok: true }, 200, origin);
    }

    // ── Ramo A: download de PDF do eAIP (_fetchUrl) ───────────────────────
    if (body && body._fetchUrl) {
      let target;
      try { target = new URL(body._fetchUrl); }
      catch (e) { return jsonResponse({ error: { message: 'URL inválido.' } }, 400, origin); }

      // Protecção 3: só o site do eAIP da NAV
      if (target.hostname !== ALLOWED_FETCH_HOST) {
        return jsonResponse({ error: { message: 'Só é permitido descarregar de ' + ALLOWED_FETCH_HOST + '.' } }, 403, origin);
      }

      const r = await fetch(target.toString(), { headers: { 'User-Agent': 'AIRAC-Impact-Tool' } });
      if (!r.ok) {
        return jsonResponse({ error: { message: 'HTTP ' + r.status + ' ao carregar ' + target.toString() } }, 200, origin);
      }
      const buf = await r.arrayBuffer();
      // Converter para base64 em blocos (evita estoirar a pilha em PDFs grandes)
      const bytes = new Uint8Array(buf);
      let bin = '';
      const CHUNK = 32768;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
      }
      return jsonResponse({ base64: btoa(bin) }, 200, origin);
    }

    // ── Ramo B: chamada à API da Anthropic ────────────────────────────────
    if (!env.ANTHROPIC_API_KEY) {
      return jsonResponse({ error: { message: 'Secret ANTHROPIC_API_KEY não configurado no Worker.' } }, 500, origin);
    }

    // Protecção 2: só os modelos da aplicação
    const model = String(body.model || '');
    if (!ALLOWED_MODELS.some(m => model.startsWith(m))) {
      return jsonResponse({ error: { message: 'Modelo não permitido por este Worker: ' + model } }, 403, origin);
    }

    const api = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    const text = await api.text();
    return new Response(text, {
      status: api.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
    });
  }
};
