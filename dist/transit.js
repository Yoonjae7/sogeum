export function setupTransit({focusStation,focusHospital,setTransitVisible}){
 const $=s=>document.querySelector(s);const panel=$('#arrival-panel');let timer=null,data=null,request=null;
 const link='https://pts.map.naver.com/end-subway/ends/web/747/home';
 const open=()=>{panel.hidden=false;focusStation();setTransitVisible(true);$('#subway-view').setAttribute('aria-pressed','true');refresh();clearInterval(timer);timer=setInterval(refresh,120000);};
 const close=()=>{panel.hidden=true;document.body.classList.remove('subway-focus');clearInterval(timer);timer=null;};
 $('#focus-station').onclick=open;$('#focus-hospital').onclick=()=>{close();focusHospital();};$('#close-arrivals').onclick=close;
 $('#subway-view').onclick=()=>{setTransitVisible(true);$('#subway-view').setAttribute('aria-pressed','true');focusStation();};
 $('#refresh-arrivals').onclick=refresh;$('#station-external').href=link;
 async function refresh(){
  if(document.hidden||panel.hidden||request)return;
  $('#arrival-status').textContent='공식 도착정보를 확인하고 있어요.';$('#refresh-arrivals').disabled=true;
  request=new AbortController();
  const timeout=setTimeout(()=>request?.abort(),10000);
  try{const response=await fetch('/api/arrivals',{signal:request.signal});const next=await response.json();data=next;render();}
  catch{data={status:'unavailable',arrivals:[]};render();}
  finally{clearTimeout(timeout);request=null;$('#refresh-arrivals').disabled=false;}
 }
 function render(){
  const container=$('#arrival-list');container.replaceChildren();const status=$('#arrival-status');
  const now=Date.now(),rows=(data?.arrivals||[]).filter(row=>Number.isFinite(Date.parse(row.observedAt))&&now-Date.parse(row.observedAt)<180000);
  if(data?.status==='ok'&&rows.length){
   status.textContent='서울시 TOPIS · 도착정보 수신';
   for(const direction of ['상행','하행']){
    const group=document.createElement('section');group.className='arrival-direction';const title=document.createElement('h3');title.textContent=direction==='상행'?'가산디지털단지 · 장암 방면':'광명사거리 · 석남 방면';group.append(title);
    const selected=rows.filter(r=>r.direction===direction).slice(0,2);
    if(!selected.length){const p=document.createElement('p');p.textContent='제공된 도착정보 없음';group.append(p);}
    selected.forEach(row=>{const item=document.createElement('div');item.className='arrival-row';const destination=document.createElement('span');destination.textContent=`${row.destination}행`;const eta=document.createElement('strong');const seconds=row.arrivalAt?Math.ceil((Date.parse(row.arrivalAt)-now)/1000):null;
     eta.textContent=seconds!==null&&seconds>0?`${Math.floor(seconds/60)}분 ${String(seconds%60).padStart(2,'0')}초`:row.message;const message=document.createElement('small');message.textContent=row.message;item.append(destination,eta,message);group.append(item);});container.append(group);
   }
   $('#arrival-updated').textContent=`${new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(data.receivedAt))} 수신 · 2분마다 갱신`;
  }else{
   status.textContent=data?.status==='not_configured'?'공식 도착정보 연결 전입니다.':data?.status==='no_data'?'현재 제공되는 도착정보가 없습니다.':data?.status==='ok'?'도착정보가 오래되어 다시 확인이 필요해요.':'지금 도착정보를 불러올 수 없어요.';
   const empty=document.createElement('p');empty.className='arrival-empty';empty.textContent='아래 철산역 정보에서 실제 운행정보를 확인할 수 있어요.';container.append(empty);$('#arrival-updated').textContent='';
  }
 }
 const ticks=setInterval(()=>{if(!panel.hidden&&data?.status==='ok')render();},1000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!panel.hidden)refresh();});
 addEventListener('pagehide',()=>{clearInterval(timer);clearInterval(ticks);request?.abort();},{once:true});
 return{open,close};
}
