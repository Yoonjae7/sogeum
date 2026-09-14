const {bounds,boundary}=require('../dist/data/cheolsan-buses.json').metadata;
function inArea(p){let inside=false;for(let i=0,j=boundary.length-1;i<boundary.length;j=i++){const a=boundary[i],b=boundary[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
function unproject(x,y){return [Number(x)/6378137*180/Math.PI,(2*Math.atan(Math.exp(Number(y)/6378137))-Math.PI/2)*180/Math.PI];}
function normalizeBuses(data,routeId,receivedAt){
 if(data?.success!==true||!data.result?.realTime)throw new Error('Invalid provider response');
 return (data.result.realTime.list||[]).flatMap(row=>{
  const xs=row.busXList||[],ys=row.busYList||[];
  return xs.flatMap((x,i)=>{const coord=unproject(x,ys[i]);if(!coord.every(Number.isFinite)||coord[0]<bounds[0]||coord[0]>bounds[2]||coord[1]<bounds[1]||coord[1]>bounds[3]||!inArea(coord))return[];
   return [{id:`${routeId}:${row.vehId||row.busNo?.[i]||i}`,routeId,name:String(row.routeNm||''),coord,fromStationId:row.fromStationId,toStationId:row.toStationId,lowFloor:row.lowPlate==='1',receivedAt}];});
 });
}
function normalizeStop(data,receivedAt){
 if(data?.success!==true||!data.result?.stationId)throw new Error('Invalid provider response');
 const r=data.result;
 return {stationId:String(r.stationId),name:r.stationNm,receivedAt,routes:(r.busStationInfo||[]).map(row=>({id:String(row.routeId),name:String(row.routeName),destination:row.routeDestName})),arrivals:(r.busArrivalInfo||[]).map(row=>({routeId:String(row.routeId),name:String(row.routeName),destination:row.routeDestName,minutes:[1,2].map(i=>Number(row[`predictTime${i}`])).filter(v=>Number.isFinite(v)&&v>0&&v<180),stopsAway:Number(row.locationNo1)||null,ended:row.drvEnd==='Y'}))};
}
module.exports={inArea,unproject,normalizeBuses,normalizeStop};
