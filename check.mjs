import { readFile, writeFile } from 'node:fs/promises';

const URL = 'https://www.roe.vsei.ua/disconnections/';
const SUBGROUP = '6.2';
const STATE_FILE = 'state.json';
const { TG_TOKEN, TG_CHAT_ID, FORCE_SEND } = process.env;

function cells(rowHtml) {
  const out = [];
  for (const m of rowHtml.matchAll(/<t[dh]([^>]*)>([\s\S]*?)<\/t[dh]>/gi)) {
    const span = +(m[1].match(/colspan="?(\d+)/i)?.[1] ?? 1); // щоб індекс колонки не з'їхав
    const text = m[2].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    for (let i = 0; i < span; i++) out.push(text);
  }
  return out;
}

function extract(html) {
  const table = [...html.matchAll(/<table[\s\S]*?<\/table>/gi)].map(m => m[0]).find(t => t.includes('Підчерга'));
  if (!table) return null;
  const rows = [...table.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map(r => cells(r[0]));
  const header = rows.find(r => r[0] === 'Підчерга');
  const idx = header?.indexOf(SUBGROUP) ?? -1;
  if (idx < 0) return null;

  const schedule = Object.fromEntries(
    rows.filter(r => /^\d{2}\.\d{2}\.\d{4}$/.test(r[0])).map(r => [r[0], r[idx] || 'без відключень'])
  );
  const updated = html.match(/Оновлено:\s*([\d.]+\s+[\d:]+)/)?.[1] ?? '';
  return { schedule, updated };
}

function formatDiff(prev, cur) {
  return Object.entries(cur)
    .map(([d, h]) => prev?.[d] && prev[d] !== h ? `${d}: ${h}   (було: ${prev[d]})` : `${d}: ${h}`)
    .join('\n');
}

async function tgSend(text) {
  const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT_ID, text, disable_web_page_preview: true }),
  });
  if (!res.ok) throw new Error(`Telegram ${res.status}: ${await res.text()}`);
}

const html = await (await fetch(URL, { headers: { 'User-Agent': 'Mozilla/5.0' } })).text();
const data = extract(html);
if (!data) { console.log('parse failed, state untouched'); process.exit(0); }

const prev = JSON.parse(await readFile(STATE_FILE, 'utf8').catch(() => 'null'));
const changed = JSON.stringify(prev) !== JSON.stringify(data.schedule);

if ((changed && prev) || FORCE_SEND === 'true') {
  await tgSend(
    `Queue ${SUBGROUP} — schedule changed\nUpdated on site: ${data.updated}\n\n` +
    `${formatDiff(prev, data.schedule)}\n\n${URL}`
  );
}
if (changed) await writeFile(STATE_FILE, JSON.stringify(data.schedule, null, 2) + '\n');
console.log(changed ? 'changed' : 'no change', data.schedule);
