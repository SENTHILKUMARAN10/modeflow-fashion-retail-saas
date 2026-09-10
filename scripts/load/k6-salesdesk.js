import http from 'k6/http';
import {check,sleep} from 'k6';
import {Rate,Trend} from 'k6/metrics';

// SalesDesk staged capacity test.
// Safe defaults refuse production-looking URLs unless deliberately enabled.
// Optional authenticated traffic needs dedicated TEST credentials only.
// Optional transaction writes need a staging business/product with high stock.
const BASE=(__ENV.BASE_URL||'http://127.0.0.1:3000').replace(/\/$/,'');
const SUPABASE=(__ENV.SUPABASE_URL||'').replace(/\/$/,'');
const ANON=__ENV.SUPABASE_ANON_KEY||'';
const TEST_EMAIL=__ENV.TEST_EMAIL||'';
const TEST_PASSWORD=__ENV.TEST_PASSWORD||'';
const TEST_BUSINESS_ID=__ENV.TEST_BUSINESS_ID||'';
const TEST_PRODUCT_ID=__ENV.TEST_PRODUCT_ID||'';
const isKnownProduction=/modeflow-fashion-retail-saas\.vercel\.app|salesdesk\./i.test(BASE);
if(isKnownProduction&&__ENV.ALLOW_PRODUCTION_LOAD!=='true'){
  throw new Error('Refusing to load-test a production-looking URL. Use staging, or set ALLOW_PRODUCTION_LOAD=true deliberately.');
}
const writeEnabled=__ENV.ALLOW_TRANSACTION_WRITES==='true';
if(writeEnabled&&isKnownProduction&&__ENV.ALLOW_PRODUCTION_WRITES!=='true'){
  throw new Error('Transaction writes are blocked on production unless ALLOW_PRODUCTION_WRITES=true is also explicitly set.');
}
if(writeEnabled&&(!SUPABASE||!ANON||!TEST_EMAIL||!TEST_PASSWORD||!TEST_BUSINESS_ID||!TEST_PRODUCT_ID)){
  throw new Error('Transaction writes require SUPABASE_URL, SUPABASE_ANON_KEY, TEST_EMAIL, TEST_PASSWORD, TEST_BUSINESS_ID and TEST_PRODUCT_ID.');
}

const errors=new Rate('salesdesk_errors');
const healthLatency=new Trend('salesdesk_health_latency',true);
const landingLatency=new Trend('salesdesk_landing_latency',true);
const authLatency=new Trend('salesdesk_auth_latency',true);
const dashboardLatency=new Trend('salesdesk_dashboard_latency',true);
const saleLatency=new Trend('salesdesk_sale_latency',true);

export const options={
  stages:[
    {duration:__ENV.RAMP_1||'1m',target:Number(__ENV.VUS_1||100)},
    {duration:__ENV.HOLD_1||'2m',target:Number(__ENV.VUS_1||100)},
    {duration:__ENV.RAMP_2||'1m',target:Number(__ENV.VUS_2||200)},
    {duration:__ENV.HOLD_2||'3m',target:Number(__ENV.VUS_2||200)},
    {duration:__ENV.RAMP_3||'1m',target:Number(__ENV.VUS_3||300)},
    {duration:__ENV.HOLD_3||'2m',target:Number(__ENV.VUS_3||300)},
    {duration:'1m',target:0}
  ],
  thresholds:{
    http_req_failed:['rate<0.01'],
    salesdesk_errors:['rate<0.01'],
    http_req_duration:['p(95)<1500','p(99)<3000'],
    salesdesk_health_latency:['p(95)<1000'],
    salesdesk_landing_latency:['p(95)<1200'],
    salesdesk_auth_latency:['p(95)<1800'],
    salesdesk_dashboard_latency:['p(95)<1500'],
    salesdesk_sale_latency:['p(95)<2200']
  },
  discardResponseBodies:false
};

function mark(response,name,trend,expected=r=>r.status>=200&&r.status<400){
  const ok=check(response,{[`${name} succeeds`]:expected});
  errors.add(!ok);if(trend)trend.add(response.timings.duration);return ok;
}
function uuid(){
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:(r&3|8);return v.toString(16);});
}
function signIn(){
  if(!SUPABASE||!ANON||!TEST_EMAIL||!TEST_PASSWORD)return null;
  const r=http.post(`${SUPABASE}/auth/v1/token?grant_type=password`,JSON.stringify({email:TEST_EMAIL,password:TEST_PASSWORD}),{headers:{apikey:ANON,'content-type':'application/json'},tags:{name:'auth-login'}});
  if(!mark(r,'auth login',authLatency,x=>x.status===200))return null;
  try{return r.json('access_token')||null;}catch{return null;}
}
function sbGet(path,token,name){
  return http.get(`${SUPABASE}/rest/v1/${path}`,{headers:{apikey:ANON,authorization:`Bearer ${token}`},tags:{name}});
}

export default function(){
  const landing=http.get(`${BASE}/`,{tags:{name:'landing'}});mark(landing,'landing',landingLatency);
  const health=http.get(`${BASE}/api/health`,{tags:{name:'health'}});mark(health,'health',healthLatency,x=>x.status===200);
  if(health.status===200)check(health,{'health identifies SalesDesk':r=>{try{return r.json('service')==='SalesDesk';}catch{return false;}}});

  const token=signIn();
  if(token){
    const membership=sbGet('business_members?select=business_id,role&order=created_at.asc&limit=1',token,'workspace-membership');
    mark(membership,'workspace membership',dashboardLatency,x=>x.status===200);
    let businessId=TEST_BUSINESS_ID;
    if(!businessId){try{businessId=membership.json('0.business_id')||'';}catch{}}
    if(businessId){
      const id=encodeURIComponent(businessId);
      mark(sbGet(`products?business_id=eq.${id}&is_active=eq.true&select=id,name,stock,reorder_level&limit=50`,token,'dashboard-products'),'dashboard products',dashboardLatency,x=>x.status===200);
      mark(sbGet(`invoices?business_id=eq.${id}&select=id,total,payment_status,created_at&order=created_at.desc&limit=50`,token,'dashboard-invoices'),'dashboard invoices',dashboardLatency,x=>x.status===200);
      mark(sbGet(`expenses?business_id=eq.${id}&select=id,amount,expense_date&order=expense_date.desc&limit=50`,token,'dashboard-expenses'),'dashboard expenses',dashboardLatency,x=>x.status===200);

      if(writeEnabled&&TEST_PRODUCT_ID){
        const sale=http.post(`${SUPABASE}/rest/v1/rpc/complete_sale`,JSON.stringify({
          p_business_id:businessId,
          p_product_id:TEST_PRODUCT_ID,
          p_customer_name:'SalesDesk Load Test',
          p_customer_phone:'',
          p_quantity:1,
          p_rate:Number(__ENV.TEST_RATE||1),
          p_discount:0,
          p_payment_method:'cash',
          p_payment_status:'paid',
          p_idempotency_key:uuid()
        }),{headers:{apikey:ANON,authorization:`Bearer ${token}`,'content-type':'application/json'},tags:{name:'complete-sale'}});
        mark(sale,'complete sale',saleLatency,x=>x.status>=200&&x.status<300);
      }
    }
  }
  sleep(Math.random()*2+1);
}

export function handleSummary(data){
  return {'stdout':JSON.stringify({
    baseUrl:BASE,
    authenticated:!!(SUPABASE&&ANON&&TEST_EMAIL&&TEST_PASSWORD),
    transactionWrites:writeEnabled,
    checks:data.metrics.checks?.values,
    requestDuration:data.metrics.http_req_duration?.values,
    failed:data.metrics.http_req_failed?.values,
    salesdeskErrors:data.metrics.salesdesk_errors?.values,
    authLatency:data.metrics.salesdesk_auth_latency?.values,
    dashboardLatency:data.metrics.salesdesk_dashboard_latency?.values,
    saleLatency:data.metrics.salesdesk_sale_latency?.values
  },null,2)};
}
