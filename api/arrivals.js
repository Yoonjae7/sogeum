const {normalizeArrivals}=require('../lib/arrivals.cjs');
let cached=null,pending=null;
module.exports=async function handler(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({status:'method_not_allowed'});}
 const key=process.env.SEOUL_SUBWAY_API_KEY;
 if(!key){res.setHeader('Cache-Control','no-store');return res.status(503).json({status:'not_configured',message:'공식 도착정보 연결 전입니다.',arrivals:[]});}
 const now=Date.now();
 if(cached&&now-cached.time<120000){res.setHeader('Cache-Control','public, max-age=0, s-maxage=120');return res.status(200).json(cached.body);}
 try{
  if(!pending)pending=(async()=>{
   // TOPIS documents and serves this provider endpoint over HTTP; the client only uses our HTTPS API.
   const url=`http://swopenapi.seoul.go.kr/api/subway/${encodeURIComponent(key)}/json/realtimeStationArrival/0/20/${encodeURIComponent('철산')}`;
   const response=await fetch(url,{signal:AbortSignal.timeout(8000)});
   if(!response.ok)throw new Error('Provider unavailable');
   const data=await response.json();
   const code=data.errorMessage?.code||data.RESULT?.CODE||data.code;
   if(code&&code!=='INFO-000'&&code!=='INFO-200')throw new Error('Provider rejected request');
   const receivedAt=new Date().toISOString(),arrivals=normalizeArrivals(data);
   return {status:arrivals.length?'ok':'no_data',station:'철산',line:'7호선',receivedAt,source:'서울시 TOPIS',arrivals,message:arrivals.length?'':'현재 제공되는 철산역 도착정보가 없습니다.'};
  })().finally(()=>{pending=null;});
  const body=await pending;cached={time:Date.now(),body};res.setHeader('Cache-Control','public, max-age=0, s-maxage=120');return res.status(200).json(body);
 }catch{res.setHeader('Cache-Control','no-store');return res.status(502).json({status:'unavailable',message:'도착정보를 잠시 불러올 수 없습니다.',arrivals:[]});}
};
