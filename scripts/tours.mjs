import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {parseCsv,pick} from './lib/csv.mjs';
import {table} from './lib/format.mjs';
export const TABLES=['suppliers','products','rates','bookings','allotments','services','passengers','notes','import_rows'];
export const READS={
 suppliers:'select code,name,country,adventure_activity,registration_ref,registration_until from tours.suppliers order by code',
 products:'select p.code,p.name,p.kind,p.location,s.name supplier from tours.products p join tours.suppliers s on s.id=p.supplier_id order by p.code',
 rates:'select r.code,p.name product,r.valid_from,r.valid_to,r.currency,r.unit,r.buy_cents,r.sell_cents,r.release_days,r.cancellation_terms from tours.rates r join tours.products p on p.id=r.product_id order by r.code',
 bookings:'select code,name,agent,consultant,travel_date,end_date,pax,currency,status from tours.bookings order by travel_date,code',
 'departures':'select code,name,travel_date,pax,currency,awaiting_confirmation,service_count from tours.booking_margins where status=\'confirmed\' and travel_date between current_date and current_date+30 order by travel_date,code',
 services:'select code,booking,service_date,product,supplier,units,unit,status,confirmation_ref from tours.service_detail order by service_date,code',
 'supplier-chase':"select code,booking,supplier,service_date,confirm_by,cancellation_on from tours.service_detail where status='requested' order by confirm_by,code",
 'release-dates':"select code,product,service_date,release_on,units,allocated,unsold from tours.release_queue where status='held' and release_on<=current_date+14 order by release_on,code",
 'margin-watch':"select code,name,currency,revenue_cents,cost_cents,margin_cents,margin_pct,service_count from tours.booking_margins where status in ('quote','confirmed') order by margin_pct nulls first,code",
 'quote-followup':"select code,name,agent,quote_expires,last_contact,current_date-last_contact days_quiet from tours.bookings where status='quote' order by quote_expires nulls last,code",
 'deposits-due':"select code,name,deposit_due,currency,deposit_cents,received_cents,deposit_cents-received_cents outstanding_cents from tours.bookings where status='confirmed' and deposit_due<=current_date+14 and deposit_cents>received_cents order by deposit_due,code",
 'cancellation-watch':"select code,booking,product,supplier,cancellation_on,status from tours.service_detail where status<>'cancelled' and service_date>=current_date and cancellation_on<=current_date+7 order by cancellation_on,code",
 'rooming-list':"select b.code booking,b.pax expected_passengers,p.code,p.name,p.room from tours.passengers p join tours.bookings b on b.id=p.booking_id where b.status<>'cancelled' order by b.code,p.room,p.name",
 'manifest-gaps':"select b.code,b.name,b.pax,count(p.id)::integer named,b.pax-count(p.id)::integer missing from tours.bookings b left join tours.passengers p on p.booking_id=b.id where b.status='confirmed' group by b.id having count(p.id)<>b.pax order by b.code",
 'supplier-exposure':"select supplier,supplier_currency currency,sum(buy_cents*units)::bigint committed_cents,count(*)::integer services from tours.service_detail where status='confirmed' and service_date>=current_date group by supplier,supplier_currency order by supplier,supplier_currency",
 'agent-margin':"select agent,currency,count(*)::integer bookings,sum(revenue_cents)::bigint revenue_cents,sum(margin_cents)::bigint margin_cents from tours.booking_margins where status='confirmed' and service_count>0 group by agent,currency order by agent,currency",
 'unconfirmed-low-margin':"select code,name,currency,margin_pct,awaiting_confirmation from tours.booking_margins where status='confirmed' and margin_pct<20 and awaiting_confirmation>0 order by code",
 'imported-summaries':"select code,name,currency,source_status,summary_sell_cents,summary_cost_cents,summary_commission_cents,summary_invoiced_cents,summary_receipted_cents from tours.bookings where source_status is not null order by code",
 compliance:'select * from tours.record_checks order by rule,record',
 attention:"select code record,'supplier confirmation' issue,confirm_by due from tours.service_detail where status='requested' and confirm_by<=current_date union all select code,'allotment release',release_on from tours.release_queue where status='held' and release_on<=current_date and unsold>0 union all select code,'deposit overdue',deposit_due from tours.bookings where status='confirmed' and deposit_cents>received_cents and deposit_due<current_date union all select code,'quote expired',quote_expires from tours.bookings where status='quote' and quote_expires<current_date order by due,record"
};
const FIELDS={
 suppliers:'code name country email adventure_activity registration_ref registration_until registration_checked_on',
 products:'code supplier_id name kind location',
 rates:'code product_id valid_from valid_to currency unit buy_cents sell_cents release_days cancellation_terms',
 bookings:'code name agent consultant travel_date end_date pax currency status quote_expires deposit_due deposit_cents received_cents terms_ref last_contact',
 allotments:'code product_id service_date unit units release_on',
 services:'code booking_id rate_id allotment_id service_date units fx buy_cents sell_cents status confirm_by cancellation_on confirmation_ref',
 passengers:'code booking_id name room retention_review_on'
};
const REFS={supplier_id:'suppliers',product_id:'products',booking_id:'bookings',rate_id:'rates',allotment_id:'allotments'};
export function date(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||Number.isNaN(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw Error('Use a valid ISO date YYYY-MM-DD');return v;}
const required=(o,k)=>{if(o[k]===undefined||String(o[k]).trim()==='')throw Error('Required --'+k);return o[k];};
const integer=(v,name)=>{if(!/^\d+$/.test(String(v))||!Number.isSafeInteger(Number(v)))throw Error(name+' must be a nonnegative integer');return Number(v);};
export async function resolve(db,t,value){
 if(!FIELDS[t]||!value)throw Error('A record reference is required');
 const hasName=['suppliers','products','bookings','passengers'].includes(t);
 let rows=await db.query(`select * from tours.${t} where lower(code)=lower($1) or id::text=$1`,[value]);
 if(!rows.length)rows=await db.query(`select * from tours.${t} where starts_with(id::text,$1) ${hasName?'or position(lower($1) in lower(name))>0':''} order by code`,[value]);
 if(rows.length!==1)throw Error(rows.length?`Ambiguous ${t}:\n`+rows.map(r=>`${r.code} ${r.name||''} ${r.id}`).join('\n'):`No ${t} matching ${value}`);
 return rows[0];
}
async function transaction(db,fn,dry=false){await db.exec('BEGIN');try{const result=await fn();await db.exec(dry?'ROLLBACK':'COMMIT');return result;}catch(e){await db.exec('ROLLBACK');throw e;}}
async function add(db,t,data){
 if(!FIELDS[t])throw Error('Unknown record type '+t);
 const allowed=FIELDS[t].split(' ');const v={...data};
 if(!Object.keys(v).length)throw Error('Empty record');
 for(const k of Object.keys(v)){
  if(!allowed.includes(k))throw Error('Unsupported field '+k);
  if(v[k]===null)continue;
  if(k.endsWith('_date')||k.endsWith('_on')||['valid_from','valid_to','confirm_by','cancellation_on','quote_expires','deposit_due','last_contact','registration_until'].includes(k))date(v[k]);
  if(k.endsWith('_cents')||['units','pax','release_days'].includes(k))v[k]=integer(v[k],k);
  if(REFS[k])v[k]=(await resolve(db,REFS[k],String(v[k]))).id;
 }
 const keys=Object.keys(v);return (await db.query(`insert into tours.${t} (${keys.join(',')}) values (${keys.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,keys.map(k=>v[k])))[0];
}
function parseOptions(args){const pos=[],o={};for(const arg of args){if(arg.startsWith('--')){const eq=arg.indexOf('=');const key=arg.slice(2,eq<0?undefined:eq);if(key in o)throw Error('Duplicate option '+key);o[key]=eq<0?true:arg.slice(eq+1);}else pos.push(arg);}return {pos,o};}
const OPTIONS={booking:[],add:['data'],log:['author','text','date'],confirm:['reference'],'service-status':['status'],'booking-status':['status'],terms:['reference'],'record-receipt':['cents'], 'supplier-check':['reference','until','date'],release:[],import:['file','mapping','date-format','dry-run'],export:['out'],'draft-weekly':[]};
function amount(v){const s=String(v).trim().replaceAll(',','');if(!/^\d+(\.\d{1,2})?$/.test(s))throw Error('Invalid amount '+v);const [a,b='']=s.split('.');const n=Number(a)*100+Number(b.padEnd(2,'0'));if(!Number.isSafeInteger(n))throw Error('Amount too large');return n;}
function importDate(v,format){if(/^\d{4}-\d{2}-\d{2}$/.test(v))return date(v);if(format==='DMY'&&/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v)){const [d,m,y]=v.split('/');return date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`);}throw Error('Ambiguous report date: use ISO or --date-format=DMY');}
export async function importTourplan(db,file,{mapping={},dateFormat='ISO',dry=false}={}){
 const rows=parseCsv(fs.readFileSync(file,'utf8'));if(!rows.length)throw Error('Empty CSV');
 const aliases={code:['Reference','Booking Reference','Booking Ref','(Booking) Reference'],name:['Booking Name'],agent:['Agent','Agent Code','Agent (Code)'],consultant:['Consultant','(Booking) Consultant'],travel_date:['Travel Date'],pax:['Pax','Pax (Count)'],currency:['Currency'],source_status:['Status','(Booking) Status'],summary_cost_cents:['Cost','Cost (Amount)'],summary_sell_cents:['Agent (Amount)','Agent Amount','Sell'],summary_commission_cents:['Commission','Commission (Amount)'],summary_invoiced_cents:['Invoiced','Invoiced (Amount)'],summary_receipted_cents:['Receipted','Receipted (Amount)']};
 for(const k of Object.keys(mapping))if(!(k in aliases))throw Error('Unknown mapping key '+k);
 return transaction(db,async()=>{let inserted=0,skipped=0;for(const [i,row] of rows.entries()){
  const d={};for(const [k,names] of Object.entries(aliases)){const value=pick(row,...(mapping[k]?[mapping[k]]:names));if(value==='')throw Error(`CSV row ${i+2}: missing ${k}; provide the column mapping`);d[k]=value.trim();}
  d.travel_date=importDate(d.travel_date,dateFormat);d.pax=integer(d.pax,'pax');if(d.pax<1)throw Error('pax must be positive');if(!/^[A-Z]{3}$/.test(d.currency))throw Error('Currency must be an ISO code');
  for(const k of Object.keys(d).filter(k=>k.endsWith('_cents')))d[k]=amount(d[k]);
  const states={quotation:'quote',quote:'quote',confirmed:'confirmed',finalised:'completed',completed:'completed',cancelled:'cancelled','cancelled with cost':'cancelled','deposit invoice':'confirmed',invoiced:'confirmed'};
  d.status=states[d.source_status.toLowerCase()];if(!d.status)throw Error('Unmapped booking status '+d.source_status+'; check status meaning before mapping');
  const old=await db.query('select payload from tours.import_rows where source_key=$1',[d.code]);
  if(old.length){const same=Object.keys(d).every(k=>old[0].payload[k]===d[k])&&Object.keys(old[0].payload).length===Object.keys(d).length;if(!same)throw Error('Changed imported booking '+d.code+'; reconcile instead of overwriting');skipped++;continue;}
  if((await db.query('select id from tours.bookings where lower(code)=lower($1)',[d.code])).length)throw Error('Existing booking code conflict '+d.code);
  const keys=Object.keys(d);const b=(await db.query(`insert into tours.bookings (${keys.join(',')}) values (${keys.map((_,i)=>'$'+(i+1)).join(',')}) returning id`,Object.values(d)))[0];
  await db.query('insert into tours.import_rows(source_key,booking_id,payload) values($1,$2,$3)',[d.code,b.id,JSON.stringify(d)]);inserted++;
 }return {inserted,skipped,dry_run:dry,scope:'Booking summaries only; source financial figures remain separate from service costing.'};},dry);
}
export async function run(db,args){
 const {pos,o}=parseOptions(args);const [cmd='help',ref]=pos;
 if(cmd==='help'||cmd==='--help')return {reads:Object.keys(READS),writes:Object.keys(OPTIONS),usage:'npm run tours -- <command> [reference] [--key=value] [--json]'};
 if(!(cmd in READS)&&!(cmd in OPTIONS))throw Error('Unknown command '+cmd);
 for(const key of Object.keys(o))if(key!=='json'&&!(OPTIONS[cmd]||[]).includes(key))throw Error('Unknown option --'+key);
 for(const key of ['json','dry-run'])if(key in o&&o[key]!==true)throw Error('--'+key+' is a boolean flag');
 const max=cmd==='import'||cmd==='add'||cmd==='booking'||cmd==='log'||['confirm','service-status','booking-status','terms','record-receipt','supplier-check','release'].includes(cmd)?2:1;
 if(pos.length>max)throw Error('Unexpected positional argument');
 if(cmd in READS)return db.query(READS[cmd]);
 if(cmd==='booking'){const b=await resolve(db,'bookings',ref);return {booking:b,services:await db.query('select * from tours.service_detail where booking_id=$1 order by service_date,code',[b.id]),passengers:await db.query('select code,name,room from tours.passengers where booking_id=$1 order by code',[b.id]),notes:await db.query('select author,body,recorded_on from tours.notes where booking_id=$1 order by created_at,id',[b.id])};}
 if(cmd==='add')return transaction(db,()=>add(db,ref,JSON.parse(fs.readFileSync(required(o,'data'),'utf8'))));
 if(cmd==='log'){const b=await resolve(db,'bookings',ref);return (await db.query('insert into tours.notes(booking_id,author,body,recorded_on) values($1,$2,$3,$4) returning *',[b.id,required(o,'author'),required(o,'text'),date(o.date||new Date().toISOString().slice(0,10))]))[0];}
 if(cmd==='confirm'){const s=await resolve(db,'services',ref);if(s.status==='cancelled')throw Error('Cancelled service cannot be confirmed');return (await db.query("update tours.services set status='confirmed',confirmation_ref=$2 where id=$1 returning code,status,confirmation_ref",[s.id,required(o,'reference')]))[0];}
 if(cmd==='service-status'){const s=await resolve(db,'services',ref);const status=required(o,'status');if(!['requested','cancelled'].includes(status))throw Error('Use confirm with supplier evidence, or requested/cancelled');return (await db.query('update tours.services set status=$2,confirmation_ref=null where id=$1 returning code,status',[s.id,status]))[0];}
 if(cmd==='booking-status')return transaction(db,async()=>{const b=await resolve(db,'bookings',ref);const status=required(o,'status');if(!['quote','confirmed','completed','cancelled'].includes(status))throw Error('Invalid booking status');await db.query('select id from tours.bookings where id=$1 for update',[b.id]);if(status==='cancelled')await db.query("update tours.services set status='cancelled' where booking_id=$1",[b.id]);return (await db.query('update tours.bookings set status=$2 where id=$1 returning code,status',[b.id,status]))[0];});
 if(cmd==='supplier-check'){const s=await resolve(db,'suppliers',ref);return (await db.query('update tours.suppliers set registration_ref=$2,registration_until=$3,registration_checked_on=$4 where id=$1 returning code,registration_ref,registration_until,registration_checked_on',[s.id,required(o,'reference'),date(required(o,'until')),date(required(o,'date'))]))[0];}
 if(cmd==='terms'){const b=await resolve(db,'bookings',ref);return (await db.query('update tours.bookings set terms_ref=$2 where id=$1 returning code,terms_ref',[b.id,required(o,'reference')]))[0];}
 if(cmd==='record-receipt')return transaction(db,async()=>{const b=await resolve(db,'bookings',ref);await db.query('select id from tours.bookings where id=$1 for update',[b.id]);const cents=integer(required(o,'cents'),'cents');await db.query("insert into tours.notes(booking_id,author,body) values($1,'Receipt reconciliation',$2)",[b.id,`Set externally reconciled received total to ${cents} ${b.currency} minor units`]);return (await db.query('update tours.bookings set received_cents=$2 where id=$1 returning code,currency,received_cents',[b.id,cents]))[0];});
 if(cmd==='release')return transaction(db,async()=>{const a=await resolve(db,'allotments',ref);await db.query('select id from tours.allotments where id=$1 for update',[a.id]);const q=(await db.query('select * from tours.release_queue where id=$1',[a.id]))[0];return (await db.query("update tours.allotments set units=$2,status=case when $2=0 then 'released' else 'held' end where id=$1 returning code,units,status",[a.id,q.allocated]))[0];});
 if(cmd==='import'){if(ref!=='tourplan')throw Error('Supported import: tourplan');return importTourplan(db,required(o,'file'),{mapping:o.mapping?JSON.parse(fs.readFileSync(o.mapping,'utf8')):{},dateFormat:o['date-format']||'ISO',dry:!!o['dry-run']});}
 if(cmd==='export'){const out={format:'tour-operator-v1',exported_at:new Date().toISOString()};for(const t of TABLES)out[t]=await db.query(`select * from tours.${t} order by id`);if(o.out){fs.writeFileSync(o.out,JSON.stringify(out,null,2)+'\n',{flag:'wx',mode:0o600});return {file:path.resolve(o.out),records:TABLES.reduce((n,t)=>n+out[t].length,0)};}return out;}
 if(cmd==='draft-weekly'){let body='# Draft tour operations review\n\n';for(const c of ['attention','margin-watch','compliance'])body+='## '+c+'\n\n'+format(await run(db,[c]))+'\n\n';const dir=path.join(process.env.OUTPUT_DIR||REPO_ROOT,'drafts');fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,`weekly-${Date.now()}.md`);fs.writeFileSync(file,body,{flag:'wx',mode:0o600});return {file,sent:false};}
}
export function format(rows){if(!Array.isArray(rows))return JSON.stringify(rows,null,2);if(!rows.length)return '(none)';return table(rows,Object.keys(rows[0]).map(key=>({key,label:key,format:key.endsWith('_cents')?(v,r)=>v===null?'':`${r.currency||''} ${(Number(v)/100).toFixed(2)}`.trim():undefined})));}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){let db;try{db=await getDb();const args=process.argv.slice(2);const result=await run(db,args);console.log(args.includes('--json')?JSON.stringify(result,null,2):format(result));}catch(e){console.error(e.message);process.exitCode=1;}finally{await db?.close();}}
