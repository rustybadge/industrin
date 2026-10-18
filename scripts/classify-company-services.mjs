#!/usr/bin/env node
/**
 * classify-company-services.mjs
 *
 * Maps companies onto the existing `service_categories` taxonomy by matching
 * Swedish/English keywords against their descriptions, and populates the
 * (currently empty) `company_services` join table.
 *
 * DRY RUN BY DEFAULT. Writes nothing unless --apply is passed.
 *
 *   node scripts/classify-company-services.mjs            # dry run + report
 *   node scripts/classify-company-services.mjs --apply    # write to DB
 *   node scripts/classify-company-services.mjs --min=2    # confidence floor
 */
import 'dotenv/config';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { writeFileSync } from 'fs';
neonConfig.webSocketConstructor = ws;

const APPLY = process.argv.includes('--apply');
const MIN_SCORE = Number((process.argv.find(a => a.startsWith('--min=')) || '--min=2').split('=')[1]);

/**
 * Keyword rules per taxonomy leaf id.
 * `strong` = highly specific terms (weight 3) — near-certain signal.
 * `weak`   = supporting terms (weight 1) — need corroboration.
 * Matching is accent-aware, case-insensitive, on word boundaries.
 */
const RULES = {
  // --- Maskinbearbetning ---
  'cnc-bearbetning':        { strong: ['cnc-bearbetning', 'cnc bearbetning', 'cnc-maskin'], weak: ['cnc', 'skärande bearbetning', 'precisionsbearbetning'] },
  'cnc-frasning':           { strong: ['cnc-fräsning', 'cnc fräsning'], weak: ['fräsning', 'fräs'] },
  'cnc-svarvning':          { strong: ['cnc-svarvning', 'cnc svarvning'], weak: ['svarvning', 'svarv'] },
  'automatsvarvning':       { strong: ['automatsvarvning', 'automatsvarv'], weak: [] },
  'hardsvarvning':          { strong: ['hårdsvarvning'], weak: [] },
  'fleroperationsfrasning': { strong: ['fleroperationsfräsning', 'fleroperationsfräs'], weak: [] },
  'fleroperationssvarvning':{ strong: ['fleroperationssvarvning', 'fleroperationssvarv'], weak: [] },
  'arborrning':             { strong: ['arborrning', 'arborr'], weak: [] },
  'baddfrasning':           { strong: ['bäddfräsning'], weak: [] },
  'cnc-karusellsvarvning':  { strong: ['karusellsvarvning', 'karusellsvarv'], weak: [] },

  // --- Generic fallbacks (leaf 'Annat ...'): broad vocabulary, only fires with corroboration ---
  'annat-maskinbearbetning': { strong: ['laserskärning', 'plåtbearbetning', 'mekanisk bearbetning', 'bearbetning av metall', 'metallbearbetning'], weak: ['bearbetning', 'mekanisk verkstad', 'bockning', 'tillverkning av komponenter', 'precisionskomponenter', 'verkstad'] },
  'annat-svetsning-montage': { strong: ['svetsning', 'svetsarbeten', 'svetstjänster'], weak: ['montage', 'montering', 'svets'] },
  'annat-ytbehandling':      { strong: ['blästring', 'lackering', 'målning'], weak: ['ytskydd', 'korrosionsskydd'] },
  'annat-elektrisk-service': { strong: ['elservice', 'elinstallation', 'el-installation', 'elektrisk service'], weak: ['elektriker', 'elarbeten'] },
  'annat-industriservice':   { strong: ['tekniska tjänster', 'serviceföretag', 'service och underhåll'], weak: ['industriföretag', 'tekniska lösningar'] },
  'annat-mekanisk-underhall':{ strong: ['reparation och underhåll', 'service och reparation', 'service och reparationer'], weak: [] },

  // --- Industriservice & Felsökning ---
  'industriservice-general':{ strong: ['industriservice'], weak: ['industriella tjänster', 'service för industrin'] },
  'felsokning':             { strong: ['felsökning', 'felsöka'], weak: ['diagnostik', 'troubleshooting'] },
  'maskininstallation':     { strong: ['maskininstallation', 'installation av maskiner'], weak: ['nyinstallation', 'idrifttagning'] },
  'maskinflytt':            { strong: ['maskinflytt', 'maskinflyttning', 'flytt av maskiner'], weak: [] },
  'industriell-konsultation':{ strong: ['industriell konsultation', 'industrikonsult'], weak: ['konsultation', 'rådgivning'] },
  'driftoptimering':        { strong: ['driftoptimering', 'driftsoptimering'], weak: ['optimering', 'effektivisering'] },
  'preventivt-underhall':   { strong: ['preventivt underhåll', 'förebyggande underhåll'], weak: ['planerat underhåll'] },

  // --- Mekanisk Underhåll & Reparation ---
  'maskinreparation':       { strong: ['maskinreparation', 'reparation av maskiner', 'maskinservice', 'service och reparation av', 'reparation av industri'], weak: ['reparation', 'renovering av maskiner'] },
  'hydraulikservice':       { strong: ['hydraulikservice', 'hydraulsystem', 'hydraulik', 'hydrauliska system'], weak: ['hydrauliska'] },
  'pneumatikservice':       { strong: ['pneumatikservice', 'pneumatiklösningar', 'pneumatik'], weak: ['tryckluft', 'pneumatiska'] },
  'mekaniskt-underhall':    { strong: ['mekaniskt underhåll', 'mekanisk service', 'mekaniska reparationer'], weak: ['underhåll'] },
  'komponentbyten':         { strong: ['komponentbyte', 'komponentbyten', 'byte av komponenter'], weak: [] },
  'reservdelar':            { strong: ['reservdelar', 'reservdel'], weak: ['spare parts'] },
  'underhallsavtal':        { strong: ['underhållsavtal', 'serviceavtal'], weak: [] },

  // --- Elektrisk Service & Automation ---
  'elektrisk-reparation':   { strong: ['elektrisk reparation', 'elmotor', 'elmotorer', 'elektromekanisk'], weak: ['elservice', 'generator', 'generatorer'] },
  'automation':             { strong: ['automation', 'automatisering'], weak: ['automatiserade', 'automatiska system'] },
  'robotikservice':         { strong: ['robotikservice', 'robotservice', 'industrirobot'], weak: ['robot', 'robotar', 'robotceller'] },
  'elkonstruktion':         { strong: ['elkonstruktion', 'eldesign'], weak: ['elsystem', 'elprojektering'] },
  'automationsinstallation':{ strong: ['automationsinstallation'], weak: [] },
  'plc-programmering':      { strong: ['plc-programmering', 'plc programmering', 'plc'], weak: ['styrsystem', 'hmi'] },
  'frequensomriktare':      { strong: ['frekvensomriktare'], weak: [] },

  // --- Svetsning & Montering ---
  'mig-svetsning':          { strong: ['mig-svetsning', 'mig svetsning'], weak: [] },
  'mag-svetsning':          { strong: ['mag-svetsning', 'mag svetsning'], weak: [] },
  'tig-svetsning':          { strong: ['tig-svetsning', 'tig svetsning'], weak: [] },
  'licenssvetsning':        { strong: ['licenssvetsning', 'licenssvetsare', 'certifierad svetsning'], weak: [] },
  'rorsvetsning':           { strong: ['rörsvetsning'], weak: [] },
  'konstruktionssvetsning': { strong: ['konstruktionssvetsning'], weak: [] },
  'maskinmontage':          { strong: ['maskinmontage', 'maskinmontering'], weak: [] },
  'rormontage':             { strong: ['rörmontage', 'rörmontering', 'rörinstallation'], weak: ['rörarbeten'] },
  'stalmontage':            { strong: ['stålmontage', 'stålmontering', 'stålkonstruktion', 'stålbyggnad'], weak: ['smide'] },

  // --- Specialiserad Utrustning ---
  'kompressor-tryckluftservice':{ strong: ['kompressorservice', 'tryckluftservice', 'kompressorer'], weak: ['kompressor', 'tryckluftsystem'] },
  'avlopps-pumpservice':    { strong: ['pumpservice', 'avloppsservice', 'pumpreparation'], weak: ['pumpar', 'pump', 'avloppspump'] },
  'travers-lyftutrustning': { strong: ['traversservice', 'lyftutrustning', 'lyftbord'], weak: ['travers', 'traverser', 'lyft'] },
  'entreprenadmaskiner-service':{ strong: ['entreprenadmaskin', 'entreprenadmaskiner'], weak: ['grävmaskin', 'anläggningsmaskiner'] },
  'kranreparation':         { strong: ['kranreparation', 'kranservice'], weak: ['kranar', 'kran'] },
  'lyftanordningar':        { strong: ['lyftanordning', 'lyftanordningar', 'lyftdon'], weak: ['lyftredskap', 'telfer'] },

  // --- Ytbehandling & Måleri ---
  'industrimalare':         { strong: ['industrimåleri', 'industrimålning', 'industrimålare'], weak: ['målning', 'lackering'] },
  'ytbehandling-general':   { strong: ['ytbehandling'], weak: ['ytskikt', 'blästring'] },
  'galvanisering':          { strong: ['galvanisering', 'varmförzinkning', 'förzinkning'], weak: ['galvanisk'] },
  'pulverlackerad':         { strong: ['pulverlackering', 'pulverlack'], weak: [] },
  'fosfatbehandling':       { strong: ['fosfatbehandling', 'fosfatering'], weak: [] },
  'anodisering':            { strong: ['anodisering', 'eloxering'], weak: [] },

  // --- Fastighetsdrift & Underhåll ---
  'fastighetsunderhall-general':{ strong: ['fastighetsunderhåll', 'fastighetsservice', 'fastighetsskötsel', 'fastighetsdrift'], weak: ['fastighet'] },
  'byggnadsservice':        { strong: ['byggnadsservice', 'byggservice'], weak: ['byggnadsarbeten', 'byggnation'] },
  'hvac-service':           { strong: ['hvac', 'ventilationsservice', 'ventilationsinstallation'], weak: ['ventilation', 'klimatsystem', 'luftbehandling'] },
  'vvs-service':            { strong: ['vvs-service', 'vvs'], weak: ['rörmokeri', 'sanitet'] },
  'elinstalleringar':       { strong: ['elinstallation', 'elinstallationer', 'el-installation'], weak: ['elarbeten'] },
  'sakerhetssystem':        { strong: ['säkerhetssystem', 'larmsystem'], weak: ['larm', 'bevakning'] },
};

const norm = (s) => (s || '').toLowerCase()
  .replace(/[\u2010-\u2015]/g, '-')
  .replace(/\s+/g, ' ');

const SV_WORD = 'a-zà-öø-ÿ0-9';

/**
 * Count occurrences of `term` in `haystack`.
 *
 * Swedish forms compounds aggressively (hydraulik -> hydraulikservice), so for
 * longer terms we deliberately allow substring matches. But SHORT terms must be
 * word-anchored, otherwise 'tig' matches "viktig"/"riktig", 'mag' matches
 * "magasin", 'kran' matches "kranskärl" etc. — all observed false positives.
 *
 * Rule: terms <= 5 chars require a word boundary on both sides; longer terms
 * require a boundary only at the START (so suffixed compounds still match).
 */
const countHits = (haystack, term) => {
  const t = norm(term);
  if (!t) return 0;
  const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = t.length <= 5
    ? `(?<![${SV_WORD}])${esc}(?![${SV_WORD}])`
    : `(?<![${SV_WORD}])${esc}`;
  const re = new RegExp(pattern, 'gi');
  return (haystack.match(re) || []).length;
};

/** Descriptions that are scraper placeholders, not real content. */
const PLACEHOLDER = /kunde inte hittas|information om de specifika tjänster/i;

function classify(text) {
  const h = norm(text);
  const scores = [];
  for (const [catId, rule] of Object.entries(RULES)) {
    // Collect hits, then drop any term that is a substring of a longer matched term
    // in the same rule (e.g. 'kompressor' inside 'kompressorer') so one word isn't counted twice.
    const hits = [
      ...rule.strong.map(kw => ({ kw: norm(kw), w: 3, n: countHits(h, kw) })),
      ...rule.weak.map(kw => ({ kw: norm(kw), w: 1, n: countHits(h, kw) })),
    ].filter(x => x.n > 0);
    const kept = hits.filter(x => !hits.some(y => y !== x && y.kw.length > x.kw.length && y.kw.includes(x.kw)));
    const strong = kept.filter(x => x.w === 3), weak = kept.filter(x => x.w === 1);
    const score = strong.reduce((a, x) => a + 3 * Math.min(x.n, 2), 0) + weak.length;
    // A lone weak term is never enough: need a strong term OR >=2 distinct weak terms.
    if (score > 0 && (strong.length > 0 || weak.length >= 2)) {
      scores.push({ catId, score, matched: kept.map(x => x.kw) });
    }
  }
  return scores.sort((a, b) => b.score - a.score);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const cats = (await pool.query(`SELECT id, name, parent_id FROM service_categories`)).rows;
const catById = Object.fromEntries(cats.map(c => [c.id, c]));
const parentOf = (id) => catById[id]?.parent_id || null;

// Validate every rule id actually exists in the live taxonomy.
const badIds = Object.keys(RULES).filter(id => !catById[id]);
if (badIds.length) {
  console.error('FATAL: rule ids not present in service_categories:', badIds);
  process.exit(1);
}

const comps = (await pool.query(
  `SELECT id, name, slug, city, coalesce(description_sv,'') sv, coalesce(description,'') en
   FROM companies ORDER BY name`
)).rows;

const existing = (await pool.query(`SELECT company_id, service_category_id FROM company_services`)).rows;
const existingKeys = new Set(existing.map(r => `${r.company_id}|${r.service_category_id}`));

const results = [];
let noText = 0, noMatch = 0, placeholder = 0;

for (const c of comps) {
  const text = `${c.sv} ${c.en}`; // description only: company names like 'Mekaniska Verkstad' caused false hits
  const body = (c.sv + c.en).trim();
  if (body.length < 30) { noText++; results.push({ ...c, status: 'NO_TEXT', picks: [] }); continue; }
  if (PLACEHOLDER.test(body)) { placeholder++; results.push({ ...c, status: 'PLACEHOLDER', picks: [] }); continue; }
  const scored = classify(text);
  const picks = scored.filter(s => s.score >= MIN_SCORE).slice(0, 5);
  if (!picks.length) { noMatch++; results.push({ ...c, status: 'NO_MATCH', picks: [], best: scored[0] || null }); continue; }
  results.push({ ...c, status: 'OK', picks });
}

// Expand leaves -> also attach their parent root category.
const assignments = [];
for (const r of results) {
  if (r.status !== 'OK') continue;
  const ids = new Set();
  for (const p of r.picks) {
    ids.add(p.catId);
    const par = parentOf(p.catId);
    if (par) ids.add(par);
  }
  for (const id of ids) {
    if (!existingKeys.has(`${r.id}|${id}`)) {
      assignments.push({ companyId: r.id, companyName: r.name, categoryId: id, categoryName: catById[id].name });
    }
  }
}

// ---- Report ----
const dist = {};
for (const a of assignments) dist[a.categoryName] = (dist[a.categoryName] || 0) + 1;

console.log('='.repeat(64));
console.log(APPLY ? 'APPLY MODE — WILL WRITE TO DATABASE' : 'DRY RUN — no database writes');
console.log(`min score threshold: ${MIN_SCORE}`);
console.log('='.repeat(64));
console.log(`companies total............ ${comps.length}`);
console.log(`  classified (>=1 match)... ${results.filter(r => r.status === 'OK').length}`);
console.log(`  no usable description.... ${noText}`);
console.log(`  placeholder description.. ${placeholder}`);
console.log(`  text but no match........ ${noMatch}`);
console.log(`company_services rows now.. ${existing.length}`);
console.log(`rows to insert............. ${assignments.length}`);
console.log(`avg categories/company..... ${(assignments.length / Math.max(1, results.filter(r => r.status === 'OK').length)).toFixed(1)}`);

console.log('\n--- category distribution (top 30) ---');
for (const [n, c] of Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, 30)) {
  console.log(`  ${String(c).padStart(5)}  ${n}`);
}

const unused = cats.filter(c => !Object.values(dist).length || !assignments.some(a => a.categoryId === c.id));
console.log(`\n--- taxonomy nodes receiving ZERO companies (${unused.length}/${cats.length}) ---`);
console.log('  ' + unused.map(c => c.name).join(', '));

console.log('\n--- sample classifications (12) ---');
for (const r of results.filter(x => x.status === 'OK').slice(0, 12)) {
  console.log(`\n  ${r.name}`);
  for (const p of r.picks) console.log(`      ${String(p.score).padStart(2)}  ${catById[p.catId].name}  [${p.matched.slice(0, 4).join(', ')}]`);
}

console.log('\n--- UNMATCHED companies with text (first 15, needs rule tuning) ---');
for (const r of results.filter(x => x.status === 'NO_MATCH').slice(0, 15)) {
  console.log(`  ${r.name}: ${(r.sv || r.en).slice(0, 110).replace(/\n/g, ' ')}`);
}

writeFileSync('/tmp/classification-report.json', JSON.stringify({ assignments, results }, null, 1));
console.log('\nFull report: /tmp/classification-report.json');

if (APPLY) {
  console.log('\nInserting...');
  let n = 0;
  for (const a of assignments) {
    await pool.query(
      `INSERT INTO company_services (company_id, service_category_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [a.companyId, a.categoryId]
    );
    n++;
    if (n % 500 === 0) console.log(`  ${n}/${assignments.length}`);
  }
  const after = (await pool.query(`SELECT count(*) c FROM company_services`)).rows[0].c;
  console.log(`Done. company_services now has ${after} rows.`);
} else {
  console.log('\nNo writes performed. Re-run with --apply to commit.');
}

await pool.end();
