const test=require('node:test');
const assert=require('node:assert/strict');
const core=require('../supabase/modeflow-core.js');

test('calculateSale computes subtotal, discount and total',()=>{
  assert.deepEqual(core.calculateSale({quantity:2,rate:1299,discount:98}),{
    quantity:2,rate:1299,discount:98,subtotal:2598,total:2500
  });
});

test('calculateSale never returns a negative total',()=>{
  assert.equal(core.calculateSale({quantity:1,rate:100,discount:150}).total,0);
});

test('validateSale rejects invalid quantities',()=>{
  assert.equal(core.validateSale({quantity:0,rate:100,discount:0,stock:10}),'Enter a valid quantity');
  assert.equal(core.validateSale({quantity:'x',rate:100,discount:0,stock:10}),'Enter a valid quantity');
});

test('validateSale rejects insufficient stock',()=>{
  assert.equal(core.validateSale({quantity:11,rate:100,discount:0,stock:10}),'Not enough stock for this sale');
});

test('validateSale rejects bad price and discount values',()=>{
  assert.equal(core.validateSale({quantity:1,rate:-1,discount:0,stock:10}),'Enter a valid selling price');
  assert.equal(core.validateSale({quantity:1,rate:100,discount:-1,stock:10}),'Enter a valid discount');
  assert.equal(core.validateSale({quantity:1,rate:100,discount:101,stock:10}),'Discount cannot exceed subtotal');
});

test('validateSale accepts a valid sale',()=>{
  assert.equal(core.validateSale({quantity:2,rate:500,discount:100,stock:5}),null);
});

test('currentMonthSummary includes only invoices in current month',()=>{
  const now=new Date('2026-09-07T12:00:00+05:30');
  const invoices=[
    {total:1000,ts:new Date('2026-09-01T10:00:00+05:30').getTime()},
    {total:2500,ts:new Date('2026-09-07T11:00:00+05:30').getTime()},
    {total:9000,ts:new Date('2026-08-31T23:59:00+05:30').getTime()}
  ];
  assert.deepEqual(core.currentMonthSummary(invoices,now),{revenue:3500,orders:2});
});

test('topProduct ranks by quantity then revenue',()=>{
  const invoices=[
    {product:'Shirt',qty:2,total:2000},
    {product:'Trouser',qty:3,total:1800},
    {product:'Shirt',qty:1,total:1500}
  ];
  assert.deepEqual(core.topProduct(invoices),{name:'Shirt',quantity:3,revenue:3500});
});

test('initials generates business initials',()=>{
  assert.equal(core.initials('Atelier Vogue'),'AV');
  assert.equal(core.initials('ModeFlow'),'M');
  assert.equal(core.initials(''),'MF');
});

test('whatsappPhone normalizes Indian 10 digit numbers',()=>{
  assert.equal(core.whatsappPhone('98765 43210'),'919876543210');
  assert.equal(core.whatsappPhone('+91 98765 43210'),'919876543210');
  assert.equal(core.whatsappPhone(''),'');
});

test('friendlyError hides overly long internal messages',()=>{
  assert.equal(core.friendlyError(new Error('Invalid login credentials')),'Email or password is incorrect.');
  assert.equal(core.friendlyError(new Error('network request failed')),'Network unavailable. Check your connection and try again.');
  assert.equal(core.friendlyError(new Error('x'.repeat(200))),'The operation could not be completed. Please try again.');
});

test('role capabilities match owner manager and staff permissions',()=>{
  assert.deepEqual(core.capabilities('owner'),{manageProducts:true,deleteSales:true,deleteExpenses:true});
  assert.deepEqual(core.capabilities('manager'),{manageProducts:true,deleteSales:false,deleteExpenses:false});
  assert.deepEqual(core.capabilities('staff'),{manageProducts:false,deleteSales:false,deleteExpenses:false});
});
