import {json,supabaseAdmin} from './billing/_lib.js';

export default async function handler(req,res){
  if(!['GET','HEAD'].includes(req.method||'')) return json(res,405,{error:'Method not allowed'});
  res.setHeader('cache-control','no-store, max-age=0');
  const started=Date.now();
  const env={
    database:!!(process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY),
    razorpay:!!(process.env.RAZORPAY_KEY_ID&&process.env.RAZORPAY_KEY_SECRET),
    razorpayWebhook:!!process.env.RAZORPAY_WEBHOOK_SECRET,
    inrPlans:!!(process.env.RAZORPAY_PLAN_INR_MONTHLY&&process.env.RAZORPAY_PLAN_INR_ANNUAL)
  };
  let database='unavailable';
  if(env.database){
    try{
      await supabaseAdmin('/rest/v1/businesses?select=id&limit=1');
      database='ok';
    }catch(error){
      console.error('health database check failed',error);
      database='error';
    }
  }
  const coreOk=database==='ok';
  const billingReady=env.razorpay&&env.razorpayWebhook&&env.inrPlans;
  const body={
    service:'Salesventory',
    status:coreOk?(billingReady?'ok':'degraded'):'error',
    checks:{database,billing:billingReady?'ready':'configuration_required'},
    latencyMs:Date.now()-started,
    timestamp:new Date().toISOString()
  };
  if(req.method==='HEAD'){res.statusCode=coreOk?200:503;return res.end();}
  return json(res,coreOk?200:503,body);
}
