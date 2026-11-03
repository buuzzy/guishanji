import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { projectRoot } from './serve.mjs';

const directory = join(projectRoot, '.local', 'adventure-research');
await mkdir(directory, { recursive: true });
const sources = [
  ['michangsheng', 'https://store.steampowered.com/api/appdetails?appids=1189490&l=schinese', '修炼时间、瓶颈与机缘'],
  ['guigubahuang', 'https://store.steampowered.com/api/appdetails?appids=1468810&l=schinese', '活世界、宗门与异兽'],
  ['cultivation-simulator', 'https://store.steampowered.com/api/appdetails?appids=955900&l=schinese', '宗门生存、洞府与环境'],
  ['cultist-simulator', 'https://store.steampowered.com/api/appdetails?appids=718670&l=english', '卡牌叙事、危险与长期后果'],
  ['roadwarden', 'https://store.steampowered.com/api/appdetails?appids=1155970&l=english', '旅行、人物关系与有限时间的选择'],
  ['shanhaijing', 'https://ctext.org/shan-hai-jing/zh', '古典异兽、山海与异域意象'],
];
const digest = value => createHash('sha256').update(value).digest('hex');
const results = await Promise.allSettled(sources.map(async ([id, url, purpose]) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
  const raw = await response.text();
  if (!response.ok) throw new Error('HTTP ' + response.status);
  let title, text;
  if (url.includes('appdetails')) {
    const item = Object.values(JSON.parse(raw))[0];
    if (!item?.success) throw new Error('Steam 未返回产品资料');
    title = item.data.name;
    text = item.data.detailed_description.replace(/<[^>]+>/gu, ' ').replace(/\s+/gu, ' ').trim();
  } else {
    title = '山海经 · 中国哲学书电子化计划';
    text = raw.replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, '').replace(/<[^>]+>/gu, ' ').replace(/\s+/gu, ' ').trim();
  }
  await writeFile(join(directory, id + '.txt'), text, 'utf8');
  return { id, url, title, purpose, retrievedAt: new Date().toISOString(), responseSHA256: digest(raw), extractedTextSHA256: digest(text), characters: text.length, status: 'read' };
}));
const records = results.map((result, index) => result.status === 'fulfilled' ? result.value : { id: sources[index][0], url: sources[index][1], status: 'unavailable', reason: result.reason.message });
if (process.env.HTSC_LLM_API_KEY) {
  const queries = ['修仙小说 宗门覆灭 出逃 跨大陆 异界 归来 类型叙事', '互动叙事 游戏 meaningful choices pacing replayability'];
  for (let index = 0; index < queries.length; index++) {
    try {
      const response = await fetch('http://llm-gateway.htfh:8080/web_search/search', { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.HTSC_LLM_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: queries[index], numResults: 5, contents: { highlights: { maxCharacters: 1200 } } }), signal: AbortSignal.timeout(25000) });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const payload = await response.json();
      await writeFile(join(directory, 'search-' + index + '.json'), JSON.stringify(payload, null, 2));
      for (const record of payload.results || []) records.push({ title: record.title, url: record.url, status: 'search-highlight', purpose: queries[index] });
    } catch (error) { records.push({ purpose: queries[index], status: 'unavailable', reason: error.message }); }
  }
}
await writeFile(join(directory, 'manifest.json'), JSON.stringify({ method: 'Public publisher descriptions and research highlights; not competitor playtesting.', records }, null, 2) + '\n');
for (const record of records) console.log(JSON.stringify(record));
