const MAX_AGE=180000;
function normalizeArrivals(data,now=Date.now()){
 const result=[];const seen=new Set();
 for(const row of data.realtimeArrivalList||[]){
  if(String(row.subwayId)!=='1007'||row.statnNm!=='철산')continue;
  const raw=String(row.recptnDt||'');const observedAt=Date.parse(raw.includes('T')?raw:raw.replace(' ','T')+'+09:00');
  if(!Number.isFinite(observedAt)||now-observedAt>MAX_AGE||observedAt>now+30000)continue;
  const key=[row.btrainNo,row.updnLine,row.ordkey].join(':');if(seen.has(key))continue;seen.add(key);
  const seconds=Number(row.barvlDt);const state=String(row.arvlCd||'');
  const arrivalAt=Number.isFinite(seconds)&&seconds>0?new Date(observedAt+seconds*1000).toISOString():null;
  if(arrivalAt&&Date.parse(arrivalAt)<now-20000)continue;
  result.push({id:key,direction:row.updnLine,destination:row.bstatnNm||row.trainLineNm||'',message:row.arvlMsg2||'도착정보 확인 중',positionMessage:row.arvlMsg3||'',train:row.btrainNo||'',state,arrivalAt,observedAt:new Date(observedAt).toISOString()});
 }
 return result.sort((a,b)=>(a.arrivalAt?Date.parse(a.arrivalAt):now)-(b.arrivalAt?Date.parse(b.arrivalAt):now)).slice(0,8);
}
module.exports={normalizeArrivals,MAX_AGE};
