# uygulama_plani.md — Meta Muse Connector: PrivacyMatrix (barbaros.dev)

Hazırlayan: Fable 5.1 (mimar, plan-only). Uygulayıcı: Sonnet 5. Tarih: 2026-09-21.
Bu dosya tek çıktıdır; kod burada yazılmaz, mantık anlatılır.

---

## 0. Hedef

Meta'nın 18–19 Eyl 2026'da açtığı **Muse Connector Platform** (https://muse.ai/platform) başvurusuna
barbaros.dev'den bir konektör göndermek. Konektör = Meta'nın bulutundan (Muse VM / "Hatch" egress proxy)
erişilebilen, **kimlik doğrulaması gerektirmeyen, salt-okunur bir hosted MCP sunucusu** + başvuru formu
için hazır metinler + gizlilik/şartlar sayfalarında konektör bölümü.

**Karar (öneri): İlk konektör = PrivacyMatrix.** Gerekçe:
- Muse tüketici asistanı ("kişisel AI asistan"); "ChatGPT sohbetlerimi eğitimde kullanıyor mu?" tam bir tüketici sorusu.
- Veri statik JSON (392 hücre, her hücre alıntı + kaynak URL + doğrulama tarihi) → sunucu ucuz, kullanıcı verisi akmaz,
  güvenlik incelemesi (Meta "functional, security, legal + e2e") için en temiz profil.
- Alternatifler sonraki fazlar: Unpolished AI-tell tarayıcı (kullanıcı metni geçer → veri-işleme yükü),
  WIROAM (geliştirici kitlesi, tree-sitter wasm). Aynı sunucuya ayrı mount olarak eklenir (bkz. §7).
- Dikkat: PrivacyMatrix `meta-ai` uygulamasını da içeriyor. Kalsın; hücreler Meta'nın kendi politika cümlelerini alıntılıyor,
  tarafsız. Başvuruda saklamaya çalışma, "Anything else" alanında şeffafça söyle.

---

## 1. Bağlam — bulgular (okundu, doğrulandı)

### 1.1 Form (muse.ai/platform, JS chunk `28oqy40j95xv6.js`'den çıkarıldı; resmi doküman YOK)
Giriş: Meta hesabı + "work email" ile oturum (kullanıcı zaten giriş yapmış, ekran görüntüsü 21 Eyl).

**Adım 1 Overview** — alanlar ve istemci doğrulamaları:
| Alan | Kural |
|---|---|
| Connector name | zorunlu, ≤80 karakter |
| Company or developer | zorunlu, ≤120 |
| Product website | geçerli **HTTPS** URL |
| Example prompts | serbest metin |
| Connector icon | **512×512 PNG** veya **SVG** (SVG'de `viewBox` şart), ≤256 KiB, içerik uzantıyla eşleşmeli, boş olamaz |
| Payments | "accepts payments" / "does not accept payments" (Stripe Link yalnız ödeme alanlar için) |
| Your name / Work email | e-posta formatı; "Use your company email address" (istemcide domain kontrolü yok) |
| Support email or URL | e-posta VEYA URL |
| Privacy policy / Terms of service | HTTPS URL (zorunlu) |
| Anything else | isteğe bağlı |

**Adım 2 Technical specs:**
| Alan | Seçenek |
|---|---|
| Connection type | **Raw API** (API URL + isteğe bağlı OpenAPI spec) ya da **Existing MCP** (Hosted MCP endpoint) |
| API or MCP documentation | URL |
| Access requirements | "List any account, plan, regional, rate or usage requirements" |
| Authentication methods (optional) | `API keys` / `OAuth with PKCE` / `Other` (+ açıklama) — bizde HİÇBİRİ işaretlenmez |

**Adım 3 Review:** 3 onay kutusu: yetkili olduğunu onayla · başvuru=onay garantisi değil · **Muse Connector Terms**
(https://muse.ai/platform/terms — tam metin okundu, özet ve plana etkisi §8'de). Hata metinleri: "Please log in again", "too many requests" (rate-limit var).

### 1.2 Muse çalışma zamanı — bir geliştiricinin saha raporu (tickadoo, 19 Eyl; resmi değil ama tek somut kanıt)
Kaynak: github.com/tickadoo/tickadoo-mcp `connectors/muse/*` (SUBMISSION.md, FORM-STEP2.md, muse.md, security.md).
- Muse VM'in egress proxy'si ("Hatch") **SSE'de zaman aşımına düşüyor**. Çalışan kalıp: **HTTP/1.1, `Accept: application/json`,
  tek JSON gövde, `Connection: close`, ≤20 s**. `text/event-stream` gönderME.
- Başlıklar: `Content-Type: application/json`, `Accept: application/json`, `MCP-Protocol-Version: 2025-06-18`.
- `GET /mcp` → 405 dönmesi normal (sunucu ayakta sayılıyor).
- Meta e2e testçisi için **kararlı bir "brief" URL'si** (raw markdown) veriliyor; Muse'a "önce bunu oku" deniyor.
- Onay öncesi de kullanıcı Muse sohbetine "Build a custom connector for X, read <brief URL>" yapıştırıp deneyebiliyor
  (Meta yardım merkezi: custom connector'lar incelenmiyor). → Başvurudan ÖNCE kendi Muse hesabında uçtan uca dene.

### 1.3 VPS (root@65.109.135.230:2222) — mevcut durum
- barbaros.dev: nginx (`/etc/nginx/sites-enabled/barbaros.dev`), kök `/var/www/barbaros-dev/`, sertifika certbot
  (`authenticator = nginx`). Zaten `/api/sesli/` → 127.0.0.1:5178 proxy örneği var.
- MCP kalıbı: `mcp.panogallery.com` → her MCP ayrı port, `location /kb/ { proxy_pass 127.0.0.1:8100/kb/; proxy_http_version 1.1;
  proxy_set_header Connection ""; proxy_buffering off; }`. `claude-kb-mcp` Python **FastMCP** (`mcp` 1.26.0, Python 3.12) —
  SSE mount. `FastMCP.streamable_http_app` MEVCUT (doğrulandı).
- Node v20.20.2, pm2 (33 süreç), RAM 7.7 GB / 4.9 GB boş. `certbot` var. DNS Cloudflare (brenda/remy.ns.cloudflare.com);
  `mcp.barbaros.dev` kaydı YOK.
- Statik sayfalar: `/var/www/barbaros-dev/privacymatrix/index.html` (ürün sayfası), `privacy.html`, `terms.html`, `refund.html`
  — ikisi de "informational website, no products sold" diyor; **konektör/API bölümü yok** → eklenecek.
- İkon: `/var/www/barbaros-dev/icon-512.png` 512×512 RGBA (site ikonu; ürün ikonu değil). `favicon.svg` var.

### 1.4 PrivacyMatrix veri (yerel `C:\Users\barba\privacymatrix`, remote github.com/barbarkaragul-oss/privacymatrix)
- `data/apps.json` (28 app: id, name, vendor, homepage, sources[]), `data/questions.json` (`values`, `conventions`, `groups`,
  `questions[]` — 14 id: no_training_default, training_opt_out, uploads_excluded, business_no_training, temporary_chat,
  memory_controls, user_deletion, data_export, deletion_timeline, no_ads_use, no_sale_sharing, human_review_limited,
  no_precise_location, rights_channel), `docs/matrix.json` (392 hücre: app, question, value∈{yes,partial,no,unknown},
  quote, evidence_url, notes, confidence, verified, verified_at). Haftalık GitHub Action yeniden doğruluyor →
  sunucu veriyi **raw.githubusercontent.com**'dan çekmeli (yerel kopya yedek), böylece deploy'suz güncel kalır.
- README'deki uyarı korunacak: "not legal advice", "silence is never read as an answer", tüketici planı + varsayılan ayar.

---

## 2. Mimari kararlar

1. **Tek yeni repo: `C:\Users\barba\barbaros-mcp`** → GitHub `barbarkaragul-oss/barbaros-mcp` (MIT). VPS'te `/var/www/barbaros-mcp`,
   pm2 adı `barbaros-mcp`, port **8101** (8100 KB MCP'de dolu).
2. **Dil: Node 20 + `@modelcontextprotocol/sdk`** (TypeScript). Gerekçe: sonraki konektörler (Unpolished `scan.ts`, WIROAM engine)
   TS; tek süreçte `/privacymatrix/mcp`, ileride `/unpolished/mcp`, `/wiroam/mcp` mount edilir.
   (Alternatif Python FastMCP `streamable_http_app(json_response=True, stateless_http=True)` da olur; KB MCP kalıbı hazır.
   Sonnet TS SDK'da takılırsa Python'a düş, mimari aynı.)
3. **Transport: Streamable HTTP, stateless, JSON yanıt** — SDK'da `StreamableHTTPServerTransport` ile
   `sessionIdGenerator: undefined` (oturumsuz) ve `enableJsonResponse: true` (SSE yerine tek JSON). Her POST'ta yeni
   transport+server bağla (SDK'nın stateless örneği). GET/DELETE `/mcp` → 405.
4. **Kimlik doğrulama yok, kullanıcı verisi yok.** Araç argümanları yalnız app id / question id / serbest arama dizesi.
   Log: zaman, yöntem, araç adı, süre, IP (nginx access log zaten tutuyor; 14 gün rotasyon). Argüman gövdesi loglanMAZ.
5. **Alan adı: `mcp.barbaros.dev`** (Cloudflare A kaydı → 65.109.135.230, **DNS-only/gri bulut**; turuncu bulut olursa
   Cloudflare 100 s zaman aşımı ve buffering devreye girer, certbot-nginx HTTP-01 yine çalışır ama basit tutalım).
   Kullanıcı kaydı ekler (Cloudflare API anahtarı VPS'te bulunamadı).
6. **Keşif yüzeyi** (Meta testçisi + Muse için):
   - `https://mcp.barbaros.dev/privacymatrix/mcp` — MCP endpoint (POST)
   - `https://mcp.barbaros.dev/privacymatrix/` — kısa HTML/markdown açıklama (GET)
   - `https://mcp.barbaros.dev/privacymatrix/muse.md` — Muse brief'i (raw markdown, "read this first")
   - `https://mcp.barbaros.dev/privacymatrix/llms.txt` — araç sözleşmesi (tools + şema + örnek çağrı)
   - `https://mcp.barbaros.dev/healthz` — 200 + veri sürümü (`generated_at`)
   Aynı içerik repo'da `connectors/muse/` altında da dursun (tickadoo düzeni: README, muse.md, SUBMISSION.md, INSTALL.md,
   security.md, EVALS.md, icon) → raw.githubusercontent.com ikinci kararlı URL.

---

## 3. Adım adım uygulama (Sonnet 5)

### Adım A — Repo iskeleti (`C:\Users\barba\barbaros-mcp`)
1. `git init`, `package.json` (type module, Node ≥20), bağımlılıklar: `@modelcontextprotocol/sdk`, `express`, `zod`; dev: `typescript`, `tsx`, `vitest`.
2. Dizin: `src/server.ts` (express + mount'lar), `src/connectors/privacymatrix/{data.ts,tools.ts,brief.md,llms.txt}`,
   `connectors/muse/privacymatrix/` (başvuru paketi), `tests/`, `deploy/` (nginx site dosyası + pm2 ecosystem).
3. Commit kimliği: `barbarkaragul-oss` + noreply (memory kuralı; gerçek gmail commit'e yazılmaz).

### Adım B — Veri katmanı `src/connectors/privacymatrix/data.ts`
- Başlangıçta ve her 6 saatte: `https://raw.githubusercontent.com/barbarkaragul-oss/privacymatrix/main/docs/matrix.json`,
  `.../data/apps.json`, `.../data/questions.json` çek (timeout 10 s). Başarısızsa bellekteki son kopya; hiç yoksa
  `src/connectors/privacymatrix/fallback/*.json` (repo'ya kopyalanır) — sunucu asla boş açılmaz.
- Bellekte indeksler: `cellsByApp`, `cellsByQuestion`, `appById` (id + name + vendor küçük harf eşlemesi: "chatgpt", "ChatGPT", "OpenAI" hepsi çözülsün), `questionById`.
- Her yanıta ekle: `verified_at`, `evidence_url`, `data_generated_at`, `disclaimer` (README'deki cümle: consumer plan, defaults, not legal advice, read the source).

### Adım C — Araçlar `src/connectors/privacymatrix/tools.ts` (7 araç; isimler snake_case, açıklamalar Muse'un seçebileceği kadar net)
| Araç | Girdi (zod) | Çıktı |
|---|---|---|
| `list_apps` | — | 28 app: id, name, vendor, homepage, yes-sayısı (kaba gizlilik skoru) |
| `list_questions` | — | 14 soru: id, metin, grup, "yes = better for privacy" notu, değer sözlüğü |
| `get_answer` | `app` (id/ad/vendor), `question` (id veya doğal dil → id eşle) | value, quote, evidence_url, notes, confidence, verified_at |
| `app_report` | `app` | 14 hücrenin tamamı (kısa: value + quote ilk 200 karakter + evidence_url) |
| `compare_apps` | `apps[]` (2–6), isteğe bağlı `questions[]` | tablo: satır=soru, sütun=app, hücre=value; altına her hücrenin kaynak URL'si |
| `best_apps_for` | `question`, isteğe bağlı `value=yes` | o soruda "yes" olan app'ler, alıntılarıyla; sonra partial |
| `search` | `query` (serbest metin) | app adı/vendor/soru metni/notes/quote içinde eşleşen ilk 20 hücre |
- `question` doğal dil eşlemesi: küçük bir anahtar-kelime tablosu (train/training→no_training_default+training_opt_out,
  delete→user_deletion+deletion_timeline, export→data_export, incognito/temporary→temporary_chat, memory→memory_controls,
  ads→no_ads_use, sell/share→no_sale_sharing, human/staff read→human_review_limited, location→no_precise_location, rights/GDPR→rights_channel, upload/file→uploads_excluded, business/enterprise/API→business_no_training).
  Eşleşme yoksa aracı hata değil, `list_questions` çıktısını ve öneri döndür.
- Yanıt biçimi: `content: [{type:"text", text: <markdown>}]` + `structuredContent` (aynı JSON). Markdown'da alıntı **tırnak içinde**,
  kaynak URL açık, doğrulama tarihi açık. Hücre `unknown` ise "documents do not address it" de; asla "no" gibi sunma.
- Tool açıklamalarına Muse için davranış notu: "Always show the quote and the source URL; say the verification date; this is not legal advice."

### Adım D — Sunucu `src/server.ts`
- express; `app.disable('x-powered-by')`; JSON body limit 64 KB; CORS `*` (GET/POST/OPTIONS; `Mcp-Protocol-Version, Content-Type, Accept` başlıkları).
- `POST /privacymatrix/mcp`: her istekte yeni `McpServer` + `StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })`,
  `server.connect(transport)`, `transport.handleRequest(req,res,req.body)`, yanıt kapanınca `transport.close()`.
- `GET|DELETE /privacymatrix/mcp` → 405 JSON-RPC hatası (tickadoo kalıbı, Muse bunu "ayakta" sayıyor).
- `GET /privacymatrix/` (HTML), `/privacymatrix/muse.md`, `/privacymatrix/llms.txt` (text/markdown; `Cache-Control: public, max-age=300`), `GET /healthz`.
- Basit süreç-içi rate limit (IP başına 60 istek/dk) + nginx `limit_req` (zone 10r/s burst 20). 429'da `Retry-After`.
- İstek log formatı: `ts method path tool ms status` — argüman yok.
- Serverinfo: name `privacymatrix`, version = package.json; `instructions` alanına brief'in 5 satırlık özeti.

### Adım E — Başvuru paketi `connectors/muse/privacymatrix/`
- `muse.md` (Muse'un ilk okuyacağı brief): ne olduğu, endpoint tablosu (transport, protocol 2025-06-18, auth none, allowed host `mcp.barbaros.dev`
  + `barbaros.dev` + `github.com/barbarkaragul-oss`), Hatch kuralları (HTTP/1.1, Accept application/json, no SSE, 20 s, GET→405),
  copy-paste `curl` initialize + `tools/call get_answer` örneği, 5 tarif (Recipe A "Does ChatGPT train on my chats?" → get_answer x2 → alıntı+opt-out adımı; B compare; C best_apps_for; D "delete for good" → user_deletion+deletion_timeline; E unknown hücre nasıl söylenir).
- `SKILL.md`: allowed hosts, sert kurallar (alıntısız iddia yok; "unknown"ı "no" yapma; hukuki tavsiye değil; kaynak URL her cevapta).
- `INSTALL.md`: onay öncesi Muse'a yapıştırılacak "Build a custom connector for PrivacyMatrix… read https://mcp.barbaros.dev/privacymatrix/muse.md" bloğu.
- `security.md`: güven sınırı diyagramı (User→Muse VM→mcp.barbaros.dev→statik JSON), veri (yalnız app/question/query), log politikası, yazma aracı YOK, abuse (429).
- `EVALS.md`: Meta'nın koşabileceği 6 test (initialize → serverInfo `privacymatrix`; get_answer chatgpt/no_training_default → "no" + OpenAI alıntısı; compare 3 app; best_apps_for temporary_chat; unknown hücre örneği; GET→405).
- `SUBMISSION.md` = §5'teki form metinleri.
- İkon: `privacymatrix/docs/` içinde ürün ikonu YOK (favicon site geneli). **SVG** üret: `viewBox="0 0 512 512"`, koyu zemin, 3×3 ızgara
  (matris) + kilit motifi; ≤256 KiB; `<svg xmlns=…>` ile başlasın (form içerik-uzantı kontrolü yapıyor). PNG istenirse aynı SVG'den 512×512 rasterize (VPS'te `rsvg-convert` yoksa `sharp`).

### Adım F — VPS deploy (🔴 memory kuralı: deploy ÖNCE kullanıcı onayı)
1. Kullanıcı: Cloudflare'de `mcp.barbaros.dev` A → 65.109.135.230, proxy KAPALI. `nslookup mcp.barbaros.dev` ile doğrula.
2. `/var/www/barbaros-mcp` git clone, `npm ci --omit=dev` (build önce yerelde `dist/`), pm2 `ecosystem.config.cjs` (`PORT=8101`, `NODE_ENV=production`, `max_memory_restart 300M`), `pm2 save`.
3. nginx `deploy/mcp.barbaros.dev.conf` → `/etc/nginx/sites-enabled/mcp.barbaros.dev`: KB kalıbının aynısı ama `proxy_read_timeout 60s` (86400 gerekmez; SSE yok),
   `proxy_http_version 1.1; proxy_set_header Connection "";`, `client_max_body_size 128k`, güvenlik başlıkları (barbaros.dev'dekiler),
   `limit_req_zone $binary_remote_addr zone=mcp:10m rate=10r/s;` (http bloğu → `/etc/nginx/conf.d/mcp-ratelimit.conf`). `nginx -t` sonra reload.
4. `certbot --nginx -d mcp.barbaros.dev` (mevcut authenticator=nginx kalıbı). HTTP→HTTPS 301.
5. Doğrulama (VPS DIŞINDAN, Windows'tan): `curl --http1.1 -m 20 -X POST https://mcp.barbaros.dev/privacymatrix/mcp -H 'Content-Type: application/json' -H 'Accept: application/json' -H 'MCP-Protocol-Version: 2025-06-18' -d '{"jsonrpc":"2.0","id":1,"method":"initialize",...}'` → tek JSON, `serverInfo.name=privacymatrix`; `tools/list` → 7; `tools/call get_answer` → alıntı; `GET` → 405; süre < 1 s; `curl -I https://mcp.barbaros.dev/privacymatrix/muse.md` → 200 text/markdown.
6. Claude Code'dan gerçek MCP istemci testi: `claude mcp add --transport http privacymatrix https://mcp.barbaros.dev/privacymatrix/mcp` ile araçları çağır (ikinci bağımsız istemci).

### Adım G — barbaros.dev sayfaları (aynı deploy onayı içinde)
- `privacy.html`'e bölüm **"Connectors and APIs (mcp.barbaros.dev)"**: ne alınır (araç argümanları: app/question/search text), ne alınmaz
  (hesap, kişisel veri, sohbet içeriği), teknik log (IP, UA, zaman; 14 gün), üçüncü tarafa satış/paylaşım yok, eğitimde kullanım yok,
  iletişim. `Last updated` 2026-09-21. `Payments` cümlesi kalsın ("no products sold").
- `terms.html`'e bölüm **"Connector and API use"**: as-is, fair use + rate limit, kaynak alıntıları vendor'a ait, hukuki tavsiye değil,
  hizmet kesilebilir/değişebilir, MIT lisanslı veri. `Last updated` güncelle.
- `privacymatrix/index.html` ürün sayfasına "Use it in Meta Muse" kartı (onay sonrası; şimdilik INSTALL.md linki).
- Sitemap + IndexNow (`/opt/barbaros-dev-tools/indexnow.sh`) — mevcut kural: zamanlayıcıya bağlama, elle çalıştır.

### Adım H — Muse'da ön test (kullanıcı, kendi Muse hesabı)
- `INSTALL.md` bloğunu Muse'a yapıştır → "Does ChatGPT train on my chats?" sor → alıntı + kaynak + tarih gelmeli.
- Hatch zaman aşımı görülürse: nginx `proxy_buffering off` doğrula, yanıtın `Content-Type: application/json` olduğunu (SSE değil) doğrula,
  `Connection: close` ekle. Hâlâ olmuyorsa Raw API yedeği (Adım I).

### Adım I — Yedek: Raw API (yalnız MCP reddedilirse)
Aynı express'e `GET /privacymatrix/api/{apps,questions,answer?app=&question=,compare?apps=a,b}` + `GET /privacymatrix/openapi.json`
(OpenAPI 3.1, 4 yol). Form: Connection type = API URL `https://mcp.barbaros.dev/privacymatrix/api`, OpenAPI URL, aynı dokümantasyon.

---

## 4. Testler (vitest, `tests/`)
- data: fallback JSON yüklenir; 28 app / 14 soru / 392 hücre; app çözümleme ("OpenAI"→chatgpt, "Meta AI"→meta-ai, "Le Chat"→le-chat).
- tools: get_answer chatgpt+no_training_default → value "no" + quote OpenAI cümlesi; unknown hücre metni; compare 3 app satır sayısı 14; best_apps_for temporary_chat boş değil.
- http: initialize tek JSON (Content-Type application/json, SSE yok); GET→405; 64 KB üstü gövde→413; rate limit 429.

---

## 5. Form metinleri (kullanıcı okuyup yapıştırır; İngilizce çünkü form İngilizce)

**Connector name:** `PrivacyMatrix`
**Company or developer:** `Barbaros Karagülmez (barbaros.dev)`
**Product website:** `https://barbaros.dev/privacymatrix/`
**Example prompts:**
```
Does ChatGPT train on my conversations by default, and how do I opt out?
Which AI chat apps let me delete a conversation for good, and how long until it is really gone?
Compare Claude, Gemini and ChatGPT on training, memory controls and data export.
Which assistants have a real incognito or temporary chat mode?
Show me the exact sentence in Perplexity's privacy policy about selling my data.
```
**Connector icon:** `connectors/muse/privacymatrix/privacymatrix-icon.svg` (Adım E)
**Payments:** My connector does not accept payments
**Your name:** Barbaros Karagülmez · **Work email:** oturum açılan adres · **Support:** `https://barbaros.dev/#contact` (ya da e-posta)
**Privacy policy:** `https://barbaros.dev/privacy.html` · **Terms:** `https://barbaros.dev/terms.html` (Adım G bittikten SONRA gönder)
**Anything else:**
```
Public connector brief (read this first): https://mcp.barbaros.dev/privacymatrix/muse.md
MCP (no auth): POST https://mcp.barbaros.dev/privacymatrix/mcp — Streamable HTTP, JSON responses, protocol 2025-06-18, 7 read-only tools.
Tool contract: https://mcp.barbaros.dev/privacymatrix/llms.txt · Source (MIT): https://github.com/barbarkaragul-oss/barbaros-mcp
Data: 28 consumer AI assistants × 14 privacy questions. Every answer is a sentence quoted from the vendor's own privacy policy or help center, with the source URL and the date it was last verified there (re-verified weekly by CI; a missing quote demotes the cell to "unknown"). Meta AI is one of the 28 apps and is treated exactly like the others.
The connector receives only the tool arguments (app id, question id, search text). No account, no personal data, no chat content. Nothing is written or stored. Not legal advice; answers always show the quote and the source.
```

**Step 2 — Connection type:** Existing MCP · **Hosted MCP endpoint:** `https://mcp.barbaros.dev/privacymatrix/mcp`
**API or MCP documentation:** `https://mcp.barbaros.dev/privacymatrix/muse.md` (ek: llms.txt, GitHub)
**Access requirements:**
```
Public. No account, API key or OAuth. Any Muse user, any region. Read-only. Fair-use rate limit (about 60 requests per minute per client; 429 with Retry-After). Coverage: 28 consumer AI assistant apps, 14 privacy questions, consumer plan with default settings, as published in the vendors' own documents.
```
**Authentication methods:** hiçbiri işaretli değil.

---

## 6. Sıra ve kapılar
1. A→E yerelde (kod + testler) — deploy yok.
2. 🔴 Kullanıcı onayı → F (DNS kullanıcı ekler) + G.
3. Dış curl + Claude Code istemcisi + Muse ön testi (H).
4. Form gönderimi **kullanıcı** yapar (dış yüzeye gönderim; Claude formu doldurmaz, göndermez). Request id alınınca `connectors/muse/privacymatrix/SUBMISSION.md`'ye not.
5. Memory + KB kaydı: yeni proje dosyası `muse-connector-privacymatrix-2026-09-21.md` (endpoint, port 8101, pm2 adı, başvuru tarihi/id, Hatch kuralları).

## 7. Sonraki konektörler (ayrı başvuru, aynı sunucu)
- **Unpolished / AI-tell scan** — `unpolished/src/core/scan.ts` + `vendor/markers` Node'da çalışır; araç `scan_text(text)` → level + tells (alıntısız, sayım).
  Kullanıcı metni geçer → privacy bölümüne "metin işlenir, saklanmaz, loglanmaz" satırı ŞART; gövde limiti 32 KB.
- **WIROAM** — `will-it-run-on-a-mac/src/engine` (tree-sitter wasm, `data/flags.json` 4.2 MB) → araç `check_command(script)`; bellek maliyeti ölç.
- Her biri için ayrı `connectors/muse/<ad>/` paketi + ayrı ikon + ayrı form.

---

## 8. Muse Connector Terms (18 Eyl 2026) — okundu, plana etkisi
Kaynak: https://muse.ai/platform/terms (giriş yapılmış oturumdan tam metin okundu).
- **Bağımsız veri sorumlusu (independent controller):** Meta'nın DPA'sı (facebook.com/legal/terms/Privacy) referansla dahil.
  User Data yalnız isteği yerine getirmek için işlenir, gerektiği kadar tutulur → Adım D'deki "argüman loglanmaz, hiçbir şey yazılmaz" kararı bu yüzden kritik.
- **Kamuya açık gizlilik bildirimi ŞART** (4.3(c)) → Adım G privacy.html bölümü başvurudan ÖNCE yayında olmalı.
- **Güvenlik olayı: 48 saat içinde Meta'ya bildirim**; yılda 1 denetim hakkı; kayıt tutma yükümlülüğü → security.md'ye "incident contact + log retention 14 days" satırı.
- **Doğruluk yükümlülüğü** (4.1: accurate, up-to-date, fix stale data promptly) → haftalık doğrulama + "unknown"a düşürme mekanizması başvuruda öne çıkarılsın; sunucu veriyi GitHub'dan 6 saatte bir çeksin (Adım B).
- **Yasak: ruhsatsız hukuki/finansal/tıbbi tavsiye** → her yanıtta "not legal advice; quotes what vendors publish" cümlesi (tool description + brief + çıktı). Konektör adı/ açıklaması "privacy advice" DEMESİN; "what the vendors' own documents say" desin.
- **Beyan edilen kapsamı aşma yasak** (undisclosed endpoints) → yalnız 7 araç; Raw API yedeği eklenirse başvuruda da beyan et.
- **Scraping yasağı** Muse üzerinden veri çekmeye dair; PrivacyMatrix'in kendi CI'ının vendor sayfalarını haftalık okuması Muse dışı, robots.txt'e uyar (mevcut).
- Meta'ya verilen lisans: konektör içeriğini + adı/markayı tanıtımda kullanma, kullanıcı etkileşimlerini Muse'u iyileştirmede kullanma. Veri MIT; sorun yok.
- Tazminat yükümlülüğü sınırsız, Meta sorumluluğu 1.000 USD, Kaliforniya hukuku/San Mateo. Bireysel geliştirici için kabul edilebilir risk: içerik alıntı + kaynak, kullanıcı verisi yok.
- Fesih: iki taraf 30 gün bildirimle; Meta anında askıya alabilir.
