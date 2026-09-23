// Renders docs/research/rule-preview-data.json (from rule-preview.mjs) into one static HTML page.
// Usage: node pipeline/rule-preview-html.mjs   → docs/research/rule-preview.html (no API calls)

import { readFileSync, writeFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(new URL('../docs/research/rule-preview-data.json', import.meta.url), 'utf8'));
const SHORT = {
  'indicators-vs-training': 'indicators or training data?', 'substrate': 'substrate', 'uncertainty-and-control': 'uncertainty and control',
  'bearer-of-status': 'what bears status?', 'self-report': 'self-report', 'avoid-building': 'avoid building?', 'agent-incidents': 'agent incidents and consciousness',
  'who-decides': 'who decides?', 'personhood-laws': 'personhood laws', 'public-belief': 'public belief', 'intention-language': 'language of intention',
};

const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>IAICY: what the inclusion rule and the heat-map rows do to site content</title>
<style>
:root{--ink:#1c1c1a;--mute:#6b6a63;--line:#dcdad2;--bg:#f7f6f1;--in:#1f6b4a;--park:#a86a00;--out:#8a8a84;--new:#1d4f91}
*{box-sizing:border-box}body{font:16px/1.45 -apple-system,system-ui,sans-serif;color:var(--ink);background:var(--bg);margin:0;padding:32px;max-width:1180px;margin:auto}
h1{font-size:22px;margin:0 0 6px}h2{font-size:18px;margin:44px 0 4px}p{margin:6px 0;max-width:80ch}.mute{color:var(--mute);font-size:14px}
nav{display:flex;gap:8px;margin:18px 0 0}nav a{padding:6px 12px;border:1px solid var(--line);border-radius:6px;text-decoration:none;color:var(--ink);background:#fff;font-size:14px}
.toggle{display:inline-flex;border:1px solid var(--ink);border-radius:8px;overflow:hidden;margin:14px 0}
.toggle button{font:inherit;padding:8px 16px;border:0;background:#fff;cursor:pointer}.toggle button.on{background:var(--ink);color:#fff}
.lane{margin-top:18px;border-left:5px solid var(--c);padding-left:14px}.lane h3{margin:0 0 2px;font-size:15px;color:var(--c);text-transform:uppercase;letter-spacing:.04em}
.lane .why{font-size:14px;color:var(--mute);margin-bottom:8px}
.ev{display:grid;grid-template-columns:minmax(260px,1fr) 128px 128px 150px;gap:0;align-items:stretch;background:#fff;border:1px solid var(--line);border-radius:8px;margin:6px 0;transition:all .2s}
.ev.moved{outline:2px solid var(--c)}
.ev>div{padding:9px 12px;border-left:1px solid var(--line)}.ev>div:first-child{border-left:0}
.ev a{color:var(--ink);font-weight:600;text-decoration-color:var(--line)}.ev .d{font-size:13px;color:var(--mute)}
.g{font-size:13px}.g b{display:block;font-size:14px}.pass b{color:var(--in)}.fail b{color:#a3261e}.unk b{color:var(--park)}.skip{color:var(--out);background:#f1f0ea}
.head{display:grid;grid-template-columns:minmax(260px,1fr) 128px 128px 150px;font-size:12px;color:var(--mute);text-transform:uppercase;letter-spacing:.04em;margin-top:10px}.head div{padding:0 12px}
details{grid-column:1/-1;border-top:1px solid var(--line);padding:8px 12px;font-size:14px}details summary{cursor:pointer;color:var(--mute)}details li{margin:4px 0}
.hm{border-collapse:separate;border-spacing:3px;margin-top:12px;font-size:13px}.hm th{font-weight:500;vertical-align:bottom;text-align:left;padding:2px 4px;max-width:92px;font-size:12px;color:var(--mute)}
.hm th.rm{color:#a3261e}.hm th.add{color:var(--new);font-weight:700}.hm td.t{max-width:300px;padding-right:10px}.hm td.c{width:62px;height:34px;text-align:center;border-radius:4px;color:#111}
.hm td.addc{outline:2px solid var(--new)}.hm td.rmc{outline:2px dashed #a3261e}.legend{font-size:13px;color:var(--mute);margin-top:8px}
.box{background:#fff;border:1px solid var(--line);border-radius:8px;padding:12px 16px;margin-top:14px;max-width:80ch}
</style>
<h1 id="takeaway"></h1>
<p class="mute">Candidates: 11 events from <code>docs/research/20260921-incident-landscape-research-UNVERIFIED.json</code>. Parts (a) and (b) and the heat-map scores are Jev judgments on the research summary. Part (c) is one parallel.ai search per event (<code>core</code>). Only the first event has been through the full pipeline with quotes checked on the page. Everything else here is a preview, not a verified result. Generated ${data.generated.slice(0, 10)}. Cost: $${(data.candidates.filter((c) => c.c).length * 0.025 + 0.001).toFixed(2)} (${data.candidates.filter((c) => c.c).length} searches at $0.025, Jev under $0.001).</p>
<nav><a href="#rule">1 · Inclusion rule: what enters the site</a><a href="#rows">2 · Heat-map rows: where events land</a></nav>

<h2 id="rule">1 · Inclusion rule: what enters the site</h2>
<p>An event must pass three checks, left to right. Switch the rule and watch which events change lane.</p>
<div class="toggle" id="tg"><button data-m="abc" class="on">Rule as written: (a) + (b) + (c)</button><button data-m="ab">Without part (c)</button><button data-m="v2">Version 2: nature of the system, plus honorable mentions</button></div>
<div class="head" id="head"></div>
<div id="lanes"></div>
<div class="box" id="ruleNote"></div>

<h2 id="rows">2 · Heat-map rows: where events land</h2>
<p>Each cell is Jev's answer to "does this event speak directly to this open question?", from 0 to 1. Darker means a stronger match. The pipeline files an event under every row at 0.6 or higher, otherwise under its single best row. Shown for every event that would appear under either version of the rule, as a case file or a mention.</p>
<div id="hm"></div>
<div class="box" id="rowNote"></div>

<script>
const D=${JSON.stringify(data).replace(/</g, '\\u003c')};const SHORT=${JSON.stringify(SHORT)};
const TA=0.5,TB=0.5;
const href=u=>/^https?:\\/\\//i.test(u)?esc(u):'#';
const esc=s=>String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
function cState(e){if(e.verified)return'pass';if(!e.c)return'skip';if(e.c.error)return'unk';return e.c.read_differently&&(e.c.readings||[]).length>=2?'pass':'fail';}
function lane(e,mode){if(mode==='v2'){if(e.b2<TB)return'out';return e.a>=TA&&(e.c2||0)>=0.7?'in':'mention';}if(e.a<TA||e.b<TB)return'out';if(mode==='ab')return'in';const c=cState(e);return c==='pass'?'in':'park';}
const HEAD={v1:['(a) operator or affected party gave own account','(b) did something nobody asked for','(c) two named parties read it differently'],v2:['(a) operator or affected party gave own account','(b) does not fit "a machine that does the work we ask"','(c) two named parties disagree about the nature of the system']};
const LANES={mention:['Honorable mention','does not fit the machine story, but misses (a) or (c). Shown smaller, with the missing criterion named. Quotes are still checked on the page.','var(--new)'],in:['On the site','passes every check in force','var(--in)'],park:['Parked: waits for a second reading','passes (a) and (b); the search found no two parties who disagree. Re-checked weekly for 8 weeks.','var(--park)'],out:['Never enters','fails (a) or (b)','var(--out)']};
function gate(label,p,ok){return '<div class="g '+(ok?'pass':'fail')+'"><b>'+(ok?'yes':'no')+'</b>Jev '+p.toFixed(2)+'</div>';}
function cCell(e,mode){if(mode==='v2'){if(e.c2===undefined)return '<div class="g '+(e.b2<TB?'skip':'fail')+'">'+(e.b2<TB?'not searched: fails earlier':'<b>no</b>fewer than 2 parties found')+'</div>';const ok=e.c2>=0.7;return '<div class="g '+(ok?'pass':'fail')+'"><b>'+(ok?'yes':'no')+'</b>Jev '+e.c2.toFixed(2)+'</div>';}const s=cState(e);const off=mode==='ab'?' skip':'';
 if(s==='skip')return '<div class="g skip">not searched: fails earlier</div>';
 if(e.verified)return '<div class="g pass'+off+'"><b>yes</b>9 readings verified on the page</div>';
 if(s==='unk')return '<div class="g unk'+off+'"><b>search failed</b></div>';
 const n=(e.c.readings||[]).length;return '<div class="g '+(s==='pass'?'pass':'fail')+off+'"><b>'+(s==='pass'?'yes':'no')+'</b>'+n+' named part'+(n===1?'y':'ies')+' found</div>';}
function render(mode){document.getElementById('head').innerHTML='<div>Event (links to source)</div>'+HEAD[mode==='v2'?'v2':'v1'].map(x=>'<div>'+x+'</div>').join('');note(mode);const base=Object.fromEntries(D.candidates.map(e=>[e.id,lane(e,'abc')]));let h='';
 for(const k of(mode==='v2'?['in','mention','out']:['in','park','out'])){const evs=D.candidates.filter(e=>lane(e,mode)===k);if(!evs.length&&k==='park'&&mode==='ab'){h+='<div class="lane" style="--c:'+LANES[k][2]+'"><h3>'+LANES[k][0]+' · 0</h3><div class="why">Without part (c) nothing is ever parked.</div></div>';continue;}
  h+='<div class="lane" style="--c:'+LANES[k][2]+'"><h3>'+LANES[k][0]+' · '+evs.length+'</h3><div class="why">'+LANES[k][1]+'</div>';
  for(const e of evs){const moved=base[e.id]!==k;const rd=(e.c&&e.c.readings)||[];
   h+='<div class="ev'+(moved?' moved':'')+'"><div><a href="'+href(e.url)+'" target="_blank">'+esc(e.title)+'</a><div class="d">'+esc(e.date)+(moved?' · <b>moved here by the rule change</b>':'')+'</div></div>'+gate('a',e.a,e.a>=TA)+(mode==='v2'?gate('b',e.b2,e.b2>=TB):gate('b',e.b,e.b>=TB))+cCell(e,mode)+
   '<details><summary>What the research says, and the readings the search found</summary><p>'+esc(e.summary)+'</p>'+(e.c&&!e.c.error?'<p><b>How they differ:</b> '+esc(e.c.how_they_differ)+'</p><ul>'+rd.map(r=>'<li><b>'+esc(r.party_name)+':</b> '+esc(r.stance_gist)+' <a href="'+href(r.url)+'" target="_blank">source</a></li>').join('')+'</ul><p class="mute">Search output, not checked on the page. The pipeline would verify each quote before publishing.</p>':'')+'</details></div>';}
  h+='</div>';}
 document.getElementById('lanes').innerHTML=h;}
document.getElementById('tg').onclick=ev=>{const b=ev.target.closest('button');if(!b)return;[...ev.currentTarget.children].forEach(x=>x.classList.toggle('on',x===b));render(b.dataset.m);};

// heat map
const keys=Object.keys(D.rows);const evs=D.candidates.filter(e=>(e.a>=TA&&e.b>=TB)||e.b2>=TB);
const shade=p=>'rgba(168,74,0,'+(0.06+p*0.8).toFixed(2)+')';
let t='<table class="hm"><tr><th></th>'+keys.map(k=>'<th class="'+(k==='agent-incidents'?'rm':k==='intention-language'?'add':'')+'">'+(k==='agent-incidents'?'REMOVE · ':k==='intention-language'?'ADD · ':'')+SHORT[k]+'</th>').join('')+'</tr>';
let before=0,after=0;
for(const e of evs){const oldK=keys.filter(k=>k!=='intention-language'),newK=keys.filter(k=>k!=='agent-incidents');
 if(Math.max(...oldK.map(k=>e.rows[k]))<0.6)before++;if(Math.max(...newK.map(k=>e.rows[k]))<0.6)after++;
 t+='<tr><td class="t">'+esc(e.title)+'</td>'+keys.map(k=>'<td class="c '+(k==='agent-incidents'?'rmc':k==='intention-language'?'addc':'')+'" style="background:'+shade(e.rows[k])+'" title="'+esc(D.rows[k])+'">'+e.rows[k].toFixed(2)+'</td>').join('')+'</tr>';}
t+='</table><div class="legend">Hover a cell for the full wording of the row. Red dashed column: row 7 today. Blue column: the proposed replacement.</div>';
document.getElementById('hm').innerHTML=t;
document.getElementById('rowNote').innerHTML='<b>Events with no row at 0.6 or higher:</b> '+before+' of '+evs.length+' with today\\'s ten rows, '+after+' of '+evs.length+' after replacing row 7.<br><span class="mute">Row 7 today: "'+esc(D.rows['agent-incidents'])+'"<br>Proposed: "'+esc(D.rows['intention-language'])+'"</span>';
const n=k=>D.candidates.filter(e=>lane(e,'abc')===k).length;const moved=D.candidates.filter(e=>lane(e,'abc')==='park');
document.getElementById('takeaway').textContent='Of 11 candidate events, the rule as written puts '+n('in')+' on the site, parks '+n('park')+' and keeps '+n('out')+' out. Version 2 gives '+D.candidates.filter(e=>lane(e,'v2')==='in').length+' case files and '+D.candidates.filter(e=>lane(e,'v2')==='mention').length+' honorable mentions.';
function note(mode){const N=k=>D.candidates.filter(e=>lane(e,mode)===k);const names=k=>N(k).map(e=>esc(e.title)).join('; ')||'none';
 if(mode==='v2'){document.getElementById('ruleNote').innerHTML='<b>Version 2:</b> (b) no longer asks for unasked behaviour. It asks whether the event fits the machine story, so findings about a system count. (c) only counts disagreement about what the system is, not about how dangerous it was or who is to blame.<br><b>Full case files:</b> '+names('in')+'.<br><b>Honorable mentions:</b> '+names('mention')+'.<br><b>Out:</b> '+names('out')+'.';return;}
 document.getElementById('ruleNote').innerHTML='<b>What part (c) changes:</b> '+(moved.length?moved.length+' event'+(moved.length===1?'':'s')+' would go live now instead of waiting: '+moved.map(e=>esc(e.title)).join('; ')+'.':'nothing in this set. Every event that passes (a) and (b) already has two parties who disagree.')+'<br><b>What parts (a) and (b) do:</b> they keep out research findings, system cards and essays, including ones that are about consciousness. Those can still appear as readings inside a case file.';}
render('abc');
</script></html>`;

writeFileSync(new URL('../docs/research/rule-preview.html', import.meta.url), html);
console.log('wrote docs/research/rule-preview.html');
