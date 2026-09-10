import http from 'k6/http';
import {check,sleep} from 'k6';
import {Rate,Trend} from 'k6/metrics';

// Run against a staging deployment by default:
//   BASE_URL=https://your-staging-domain k6 run scripts/load/k6-salesdesk.js
// Production runs must be deliberate. Set ALLOW_PRODUCTION_LOAD=true only after
// confirming quotas and choosing a quiet maintenance/testing window.
const BASE=(__ENV.BASE_URL||'http://127.0.0.1:3000').replace(/\/$/,'');
const isKnownProduction=/modeflow-fashion-retail-saas\.vercel\.app|salesdesk\./i.test(BASE);
if(isKnownProduction&&__ENV.ALLOW_PRODUCTION_LOAD!=='true'){
  throw new Error('Refusing to load-test a production-looking URL. Use staging, or set ALLOW_PRODUCTION_LOAD=true deliberately.');
}

const errors=new Rate('salesdesk_errors');
const healthLatency=new Trend('salesdesk_health_latency',true);
const landingLatency=new Trend('salesdesk_landing_latency',true);

export const options={
  stages:[
    {duration:__ENV.RAMP_1||'1m',target:Number(__ENV.VUS_1||50)},
    {duration:__ENV.HOLD_1||'2m',target:Number(__ENV.VUS_1||50)},
    {duration:__ENV.RAMP_2||'1m',target:Number(__ENV.VUS_2||100)},
    {duration:__ENV.HOLD_2||'3m',target:Number(__ENV.VUS_2||100)},
    {duration:__ENV.RAMP_3||'1m',target:Number(__ENV.VUS_3||300)},
    {duration:__ENV.HOLD_3||'2m',target:Number(__ENV.VUS_3||300)},
    {duration:'1m',target:0}
  ],
  thresholds:{
    http_req_failed:['rate<0.01'],
    salesdesk_errors:['rate<0.01'],
    http_req_duration:['p(95)<1200','p(99)<2500'],
    salesdesk_health_latency:['p(95)<1000'],
    salesdesk_landing_latency:['p(95)<1200']
  },
  discardResponseBodies:false
};

function record(response,type){
  const ok=check(response,{[`${type} returns expected status`]:r=>r.status>=200&&r.status<400});
  errors.add(!ok);
  if(type==='health')healthLatency.add(response.timings.duration);
  else landingLatency.add(response.timings.duration);
}

export default function(){
  const landing=http.get(`${BASE}/`,{tags:{name:'landing'}});record(landing,'landing');
  const health=http.get(`${BASE}/api/health`,{tags:{name:'health'}});record(health,'health');
  if(health.status===200){
    check(health,{'health JSON identifies service':r=>{try{return r.json('service')==='SalesDesk';}catch{return false;}}});
  }
  sleep(Math.random()*2+1);
}

export function handleSummary(data){
  return {'stdout':JSON.stringify({
    baseUrl:BASE,
    checks:data.metrics.checks?.values,
    requestDuration:data.metrics.http_req_duration?.values,
    failed:data.metrics.http_req_failed?.values,
    salesdeskErrors:data.metrics.salesdesk_errors?.values
  },null,2)};
}
