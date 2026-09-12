// Temporary database-RPC compatibility bridge for the Salesventory rename.
(function(){
  'use strict';
  const client=window.tkCloud?.client;
  if(!client?.rpc||client.__salesventoryRpcBridge)return;
  const original=client.rpc.bind(client);
  const renamed={
    update_salesdesk_business_profile:'update_salesventory_business_profile',
    has_salesdesk_access:'has_salesventory_access'
  };
  client.rpc=function(name,args,options){return original(renamed[name]||name,args,options)};
  client.__salesventoryRpcBridge=true;
})();
