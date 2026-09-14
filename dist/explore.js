export function setupExplore({catalog,neighborhood,focus,showBuses,toggleStops,closeTransit}){
 const $=s=>document.querySelector(s),panel=$('#explore-panel'),results=$('#search-results'),input=$('#map-search');
 let selected=null,timer=null,request=null,generation=0,vehicles=[],stopData=null;
 const places=[{name:'철산역',coord:[126.8675973,37.4760012],kind:'place',description:'7호선 · 철산동'}, {...neighborhood.church,kind:'place',description:'하안로 437 · 병원 남동쪽'}, {name:'광명성애병원',coord:[126.871875,37.4734763],kind:'place',description:'디지털로 36'},...neighborhood.complexes.map(p=>({...p,kind:'place',description:'하안동 · 실제 단지 경계'})),...catalog.stops.map(s=>({...s,kind:'stop',description:`정류소 ${s.ref||'번호 미등록'} · ${s.source==='GBIS'?'공식 좌표':'OSM 좌표'}`}))];
 const routeNames=new Map(catalog.routes.map(r=>[r.id,r.name]));
 const button=(name,action,cls='')=>{const b=document.createElement('button');b.type='button';b.textContent=name;b.className=cls;b.onclick=action;return b;};
 function close(){generation++;request?.abort();request=null;panel.hidden=true;clearInterval(timer);timer=null;selected=null;stopData=null;vehicles=[];showBuses([]);document.body.classList.remove('explore-focus');}
 function base(title,sub){closeTransit();panel.hidden=false;document.body.classList.add('explore-focus');$('#explore-title').textContent=title;$('#explore-subtitle').textContent=sub;$('#explore-content').replaceChildren();}
 function openPlace(p){close();base(p.name,p.address||p.description||'하안동 · 아파트 단지');focus(p.coord,'place');const a=document.createElement('a');a.textContent='지도에서 위치 확인 ↗';a.href=`https://map.naver.com/p/search/${encodeURIComponent(p.name+' 광명')}`;a.target='_blank';a.rel='noreferrer';$('#explore-content').append(a);if(p===neighborhood.church||p.name==='광명교회'){const note=document.createElement('p');note.textContent='교회 공식 약도 위치 · 건물 외관은 추정하여 표현했습니다.';$('#explore-content').append(note);}}
 function openStop(stop){close();selected={type:'stop',value:stop};base(stop.name,`버스정류소 ${stop.ref||''} · ${stop.source==='GBIS'?'경기버스정보':'OpenStreetMap'}`);focus(stop.coord,'stop');refresh();timer=setInterval(refresh,30000);}
 function openRoute(route){close();selected={type:'route',value:route};base(`${route.name}번 버스`,`${route.region||'철산 · 하안 · 가산'} · ${route.operator||'경기버스정보'}`);refresh();timer=setInterval(refresh,30000);}
 function renderStops(){close();base('버스 · 정류소',`${catalog.stops.length}곳 · 철산에서 하안까지`);const content=$('#explore-content');const note=document.createElement('p');note.textContent='노선을 선택하면 이 지도 범위에서 수신된 차량 위치를 보여줍니다.';content.append(note);const routes=document.createElement('div');routes.className='route-grid';catalog.routes.forEach(r=>routes.append(button(r.name,()=>openRoute(r),'route-chip')));content.append(routes);const n=document.createElement('p');n.className='data-note';n.textContent='정류소 전체 목록은 검색에서 찾을 수 있어요. GBIS와 OSM에 등록된 정류소를 표시하며, 신규·임시 정류소는 누락될 수 있습니다.';content.append(n);}
 async function refresh(){
  if(!selected||document.hidden||request)return;
  const token=generation,current=selected,content=$('#explore-content');
  if(current.type==='stop'&&current.value.source!=='GBIS'){content.replaceChildren();const p=document.createElement('p');p.textContent='이 정류소는 지도 좌표만 등록되어 있어 도착정보를 연결하지 못했어요.';const a=document.createElement('a');a.textContent='정류소 운행정보 찾기 ↗';a.href=`https://map.naver.com/p/search/${encodeURIComponent(current.value.name+' 버스정류장')}`;a.target='_blank';a.rel='noreferrer';content.append(p,a);return;}
  const status=document.createElement('p');status.className='feed-status';status.textContent='경기버스정보 확인 중…';content.replaceChildren(status);
  const controller=new AbortController();request=controller;const timeout=setTimeout(()=>controller.abort(),12000);
  try{
   const r=await fetch(`/api/buses?${current.type==='stop'?'station':'route'}=${encodeURIComponent(current.value.id)}`,{signal:controller.signal});const data=await r.json();if(token!==generation)return;if(!r.ok||data.status!=='ok')throw new Error('Unavailable');
   content.replaceChildren();const stamp=document.createElement('p');stamp.className='feed-status';stamp.textContent=`GBIS · ${new Date(data.receivedAt).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul',hour12:false})} 조회 · 30초 갱신`;content.append(stamp);
   if(current.type==='route'){
    vehicles=data.buses||[];showBuses(vehicles);const count=document.createElement('strong');count.className='bus-count';count.textContent=vehicles.length?`지도 안 운행 차량 ${vehicles.length}대`:'지도 안에서 수신된 차량이 없어요';content.append(count);
    vehicles.forEach((bus,i)=>content.append(button(`${current.value.name} · 차량 ${i+1} 위치 보기`,()=>focus(bus.coord,'bus'),'vehicle-row')));
    const n=document.createElement('p');n.className='data-note';n.textContent='수신된 좌표만 표시합니다. GPS 정밀도와 정보 지연에 따라 실제 위치와 차이가 날 수 있습니다.';content.append(n);
   }else{
    stopData=data;
    for(const route of data.routes||[]){const row=document.createElement('div');row.className='bus-arrival-row';const known=catalog.routes.find(r=>r.id===route.id);const name=known?button(`${route.name}번`,()=>openRoute(known),'route-chip'):document.createElement('strong');if(!known)name.textContent=`${route.name}번`;const detail=document.createElement('div');const destination=document.createElement('small');destination.textContent=`${route.destination||''} 방면`;const eta=document.createElement('b');const found=data.arrivals.find(a=>a.routeId===route.id);eta.textContent=found?.ended?'운행 종료':found?.minutes.length?found.minutes.map(m=>`약 ${m}분`).join(' · '):'도착정보 없음';detail.append(destination,eta);row.append(name,detail);content.append(row);}
    if(!data.routes?.length){const p=document.createElement('p');p.textContent='현재 제공되는 노선 정보가 없습니다.';content.append(p);}
   }
  }catch{if(token===generation){vehicles=[];showBuses([]);content.replaceChildren();const p=document.createElement('p');p.textContent='현재 버스 정보를 불러올 수 없어요. 잠시 후 다시 시도해 주세요.';const a=document.createElement('a');a.href='https://www.gbis.go.kr/gbis2014/schBus.action';a.target='_blank';a.rel='noreferrer';a.textContent='경기버스정보에서 확인 ↗';content.append(p,button('다시 확인',refresh,'route-chip'),a);}}
  finally{clearTimeout(timeout);if(request===controller)request=null;}
 }
 input.addEventListener('input',()=>{const q=input.value.trim().replaceAll(' ','');results.replaceChildren();results.hidden=!q;if(!q)return;const matches=places.filter(p=>(p.name+(p.ref||'')).replaceAll(' ','').includes(q)).slice(0,60);for(const p of matches){const b=button(p.name,()=>{input.value='';results.hidden=true;p.kind==='stop'?openStop(p):openPlace(p);});const s=document.createElement('small');s.textContent=p.description;b.append(s);results.append(b);}if(!matches.length)results.textContent='검색 결과가 없어요.';});
 input.addEventListener('keydown',e=>{if(e.key==='Escape')results.hidden=true;if(e.key==='Enter')results.querySelector('button')?.click();});
 document.addEventListener('pointerdown',e=>{if(!e.target.closest('.search-box'))results.hidden=true;});
 $('#close-explore').onclick=close;$('#focus-church').onclick=()=>openPlace(neighborhood.church);$('#focus-haan').onclick=()=>{close();focus([126.877,37.4635],'district');};$('#bus-layer').onclick=renderStops;
 $('#stops-toggle').onclick=()=>{const enabled=$('#stops-toggle').getAttribute('aria-pressed')!=='true';$('#stops-toggle').setAttribute('aria-pressed',String(enabled));toggleStops(enabled);};
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 addEventListener('pagehide',close,{once:true});
 return {close,openStop,openPlace,openRoute};
}
