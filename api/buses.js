const {normalizeBuses,normalizeStop}=require('../lib/buses.cjs');
const catalog=require('../dist/data/bus-stops.json');
const stopIds=new Set(catalog.stops.filter(s=>s.source==='GBIS').map(s=>s.id));
const routeIds=new Set(catalog.routes.map(r=>r.id));
const cache=new Map(),pending=new Map();
// Public GBIS website feed; no credentials, session cookies or unofficial key.
// Cache and restrict to this neighborhood; never present simulated positions as live.
async function request(cmd,id){
 const key=cmd+id,old=cache.get(key);if(old&&Date.now()-old.time<30000)return old.value;
 if(pending.has(key))return pending.get(key);
 const task=(async()=>{
  const body=new URLSearchParams({cmd,[cmd==='searchRouteJson'?'routeId':'stationId']:id});
  const response=await fetch('https://www.gbis.go.kr/gbis2014/schBusAPI.action',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body,signal:AbortSignal.timeout(9000)});
  if(!response.ok)throw new Error('Provider unavailable');
  const json=await response.json(),receivedAt=new Date().toISOString();
  const value=cmd==='searchRouteJson'?{buses:normalizeBuses(json,id,receivedAt),receivedAt}:normalizeStop(json,receivedAt);
  cache.set(key,{value,time:Date.now()});return value;
 })();pending.set(key,task);try{return await task;}finally{pending.delete(key);}
}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({status:'method_not_allowed'});}
 const {station,route}=req.query||{};
 if((station&&!stopIds.has(station))||(route&&!routeIds.has(route))||(!station&&!route)||(station&&route))return res.status(400).json({status:'invalid_selection'});
 try{const data=await request(station?'searchBusStationJson':'searchRouteJson',station||route);res.setHeader('Cache-Control','public, max-age=0, s-maxage=30');return res.status(200).json({status:'ok',source:'경기버스정보 GBIS',...data});}
 catch{return res.status(502).json({status:'unavailable',message:'경기버스정보 연결을 잠시 이용할 수 없어요.',buses:[],arrivals:[]});}
};
