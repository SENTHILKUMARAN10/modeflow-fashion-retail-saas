const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const app=fs.readFileSync('app.js','utf8');

const start=app.indexOf('function inWords(n) {');
const nextFn=app.indexOf('function printInvoice(',start);

test('amount-in-words helper ships in app.js print path',()=>{
  assert.ok(start>0,'inWords not found');
  assert.ok(nextFn>start,'printInvoice not found after inWords');
  const fnText=app.slice(start,nextFn).replace(/\n  \}\n?$/,'\n}');
  const inWords=eval('('+fnText+')');
  const cases=[
    [0,'Zero rupees only'],
    [45,'Forty Five Rupees only'],
    [100,'One Hundred Rupees only'],
    [1457,'One Thousand Four Hundred Fifty Seven Rupees only'],
    [100000,'One Lakh Rupees only'],
    [10000000,'One Crore Rupees only'],
    [12345678,'One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight Rupees only'],
    [125.5,'One Hundred Twenty Five Rupees and Fifty Paise only'],
    [99.9,'Ninety Nine Rupees and Ninety Paise only']
  ];
  cases.forEach(([n,expected])=>assert.equal(inWords(n),expected,`inWords(${n})`));
});