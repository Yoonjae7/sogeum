export function startBusFeed({update,focus}){
 const status=document.querySelector('#bus-feed-status'),hint=document.querySelector('#bus-feed-note');
 let request=null,rows=new Map(),lastSuccess=0,disposed=false;
 function display(message){const now=Date.now();for(const [id,row]of rows)if(now-Date.parse(row.receivedAt)>90000)rows.delete(id);const list=[...rows.values()];update(list);status.textContent=list.length?`▰ 버스 ${list.length}대 · 위치 보기`:message;status.disabled=!list.length;status.onclick=()=>focus(list[0].coord,'bus');}
 async function refresh(){
  if(disposed||document.hidden||request)return;
  request=new AbortController();const timeout=setTimeout(()=>request?.abort(),12000);
  try{
   const response=await fetch('/api/buses?all=1',{signal:request.signal});const data=await response.json();if(!response.ok||!['ok','partial'].includes(data.status))throw Error('Unavailable');
   const success=new Set(data.succeededRouteIds),incoming=new Set(data.buses.map(b=>b.id));
   for(const [id,row]of rows)if(success.has(row.routeId)&&!incoming.has(id))rows.delete(id);
   for(const row of data.buses)if(Date.now()-Date.parse(row.receivedAt)<90000)rows.set(row.id,row);
   lastSuccess=Date.now();hint.textContent=data.status==='partial'?'일부 노선 연결 지연 · 수신 위치 사이 이동 보간':'실제 위치 15초 갱신 · 수신 위치 사이 이동 보간';
   display('현재 철산에서 수신된 버스 없음');
  }catch{hint.textContent=rows.size?'연결 지연 · 마지막 수신 위치 표시':'버스 위치 연결 지연 · 자동 재시도 중';display('버스 위치를 불러올 수 없어요');}
  finally{clearTimeout(timeout);request=null;}
 }
 const timer=setInterval(refresh,15000),expiry=setInterval(()=>{if(lastSuccess&&Date.now()-lastSuccess>90000){display('새 버스 위치를 기다리는 중');hint.textContent='오래된 위치는 숨겼어요 · 자동 재시도 중';}},5000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 addEventListener('pagehide',()=>{disposed=true;clearInterval(timer);clearInterval(expiry);request?.abort();},{once:true});
 refresh();return{refresh};
}
