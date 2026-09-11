export default function handler(req,res){
  if(req.method!=='GET'){
    res.statusCode=405;
    res.setHeader('content-type','application/json');
    return res.end(JSON.stringify({error:'Method not allowed'}));
  }
  const upiId=(process.env.SALES_DESK_UPI_ID||process.env.MODEFLOW_UPI_ID||'').trim();
  const payeeName=(process.env.SALES_DESK_UPI_PAYEE_NAME||process.env.MODEFLOW_UPI_PAYEE_NAME||'SalesDesk').trim();
  if(!upiId){
    res.statusCode=503;
    res.setHeader('content-type','application/json');
    return res.end(JSON.stringify({error:'UPI payment is not configured yet'}));
  }
  res.statusCode=200;
  res.setHeader('cache-control','no-store');
  res.setHeader('content-type','application/json');
  return res.end(JSON.stringify({upiId,payeeName}));
}
