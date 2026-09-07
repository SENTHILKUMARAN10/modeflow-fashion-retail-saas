import {json,verifyHmac,upsertSubscription} from './_lib.js';

export const config={api:{bodyParser:false}};
const rawBody=req=>new Promise((resolve,reject)=>{const chunks=[];req.on('data',c=>chunks.push(c));req.on('end',()=>resolve(Buffer.concat(chunks)));req.on('error',reject);});

export default async function handler(req,res){
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
  try{
    const raw=await rawBody(req),signature=req.headers['x-razorpay-signature'];
    if(!verifyHmac(raw,signature,process.env.RAZORPAY_WEBHOOK_SECRET)) return json(res,400,{error:'Invalid webhook signature'});
    const event=JSON.parse(raw.toString('utf8'));
    const sub=event?.payload?.subscription?.entity;
    if(!sub?.id) return json(res,200,{ok:true,ignored:true});
    const notes=sub.notes||{},businessId=notes.business_id;
    if(!businessId) return json(res,200,{ok:true,ignored:true});
    const map={created:'created',authenticated:'authenticated',active:'active',pending:'past_due',halted:'halted',cancelled:'cancelled',completed:'completed',expired:'expired'};
    await upsertSubscription({businessId,providerSubscriptionId:sub.id,interval:notes.plan_interval||'monthly',currency:notes.currency||'INR',amount:Number(notes.amount||0),status:map[sub.status]||'past_due',currentEnd:sub.current_end});
    return json(res,200,{ok:true});
  }catch(err){console.error(err);return json(res,500,{error:'Webhook processing failed'});}
}
