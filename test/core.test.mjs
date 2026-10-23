import test from 'node:test';
import assert from 'node:assert/strict';
import {MEZO,SEL,address,dataAddress,requireWords,decodeUint,decodeAddress,decimal,ratioPrice,decodePoolReserves,buildCall,rpcRead,getSnapshot} from '../src/core.mjs';
const musd=MEZO.musd, musdc=MEZO.musdc;
const word=x=>BigInt(x).toString(16).padStart(64,'0');
const v=x=>'0x'+word(x);
const av=x=>'0x'+dataAddress(x);
const res=(r0,r1)=>'0x'+word(r0)+word(r1)+word(1720000000);
const BLOCK='0x100';
const fixture={
 'eth_chainId':'0x7b7c',
 'eth_blockNumber':BLOCK,
 'eth_getCode':'0x60006001',
};
const responses=new Map([
 [musd.toLowerCase()+SEL.decimals,v(18)],
 [musdc.toLowerCase()+SEL.decimals,v(6)],
 [MEZO.pool.toLowerCase()+SEL.token0,av(musdc)],
 [MEZO.pool.toLowerCase()+SEL.token1,av(musd)],
 [MEZO.pool.toLowerCase()+SEL.getReserves,res(6_000_000_000n,7_000n*10n**18n)],
 [musd.toLowerCase()+SEL.totalSupply,v(101000n*10n**18n)]
]);
const account='0x'+'55'.repeat(20), spender='0x'+'66'.repeat(20);
responses.set(musd.toLowerCase()+buildCall(SEL.balanceOf,account),v(1200n*10n**18n));
responses.set(musd.toLowerCase()+buildCall(SEL.allowance,account,spender),v(550n*10n**18n));
function fakeFetcher(expectedAddress){
 return async(url,request)=>{
  assert.ok([MEZO.rpc,MEZO.rpcFallback].includes(url));
  assert.equal(request.method,'POST');
  const data=JSON.parse(request.body);
  let result;
  if(data.method==='eth_call'){
   assert.equal(data.params[1],BLOCK);
   const t=data.params[0];
   result=responses.get(t.to.toLowerCase()+t.data.toLowerCase());
  }else if(data.method==='eth_getCode'){
   result=fixture.eth_getCode;
  } else result=fixture[data.method];
  if(result===undefined)throw new Error('Unknown fixture '+data.method);
  return {ok:true,json:async()=>({jsonrpc:'2.0',id:1,result})};
 };
}
test('exact official chain, MUSD token, mUSDC and pool addresses pinned',()=>{
 assert.equal(MEZO.chainId,31612);
 assert.equal(MEZO.musd.toLowerCase(),'0xdd468a1ddc392dcdbef6db6e34e89aa338f9f186');
 assert.equal(MEZO.musdc.toLowerCase(),'0x04671c72aab5ac02a03c1098314b1bb6b560c197');
});
test('valid EVM address canonicalized, invalid refused',()=>{
 assert.equal(address(musd),musd.toLowerCase());
 for(const x of [null,{},'0xdead','1'.repeat(40),'0x'+'z'.repeat(40)])assert.throws(()=>address(x));
});
test('address ABI encoding zero-left pads',()=>{
 assert.equal(dataAddress(account).length,64);assert.equal(dataAddress(account).slice(-40),account.slice(2));
});
test('ABI words malformed rejected',()=>{
 for(const x of ['',0,'0x123','0x'+'z'.repeat(64),'0x'+'a'.repeat(65)])assert.throws(()=>requireWords(x));
});
test('ABI words decode uint exactly',()=>assert.equal(decodeUint(v(101000n*10n**18n)),101000n*10n**18n));
test('ABI address rejects higher nonzero padding',()=>assert.throws(()=>decodeAddress('0x'+'f'.repeat(64))));
test('decimal formatting preserves leading zeros',()=>{
 assert.equal(decimal(1000000000000000000n,18,6),'1.000000');
 assert.equal(decimal(50000000000000n,18,6),'0.000050');
 assert.equal(decimal(5500000n,6,2),'5.50');
});
test('decimal input cannot be float/negative/unreasonable',()=>{
 for(const x of [-1n,0,1])assert.throws(()=>decimal(x));
 assert.throws(()=>decimal(1n,37));
 assert.throws(()=>decimal(1n,18,19));
});
test('pool price ratio correct scaling across 6 and 18 decimals',()=>{
 const oneMUSD=1n*10n**18n,twoMUSDC=2n*10n**6n;
 assert.equal(ratioPrice(twoMUSDC,oneMUSD,6,18),'2.000000');
});
test('zero reserves report unknown not zero dollars',()=>{
 assert.equal(ratioPrice(0n,100n,6,18),null);
 assert.equal(ratioPrice(100n,0n,6,18),null);
});
test('reject invalid pool decimals',()=>assert.throws(()=>ratioPrice(1n,1n,-1,18)));
test('decode pool reserves by actual token order',()=>{
 const r=decodePoolReserves(res(6_000_000n,9n*10n**18n),musdc,musd);
 assert.equal(r.musdc,6_000_000n);
 assert.equal(r.musd,9n*10n**18n);
});
test('decode pool reserves swapped address order still consistent',()=>{
 const r=decodePoolReserves(res(9n*10n**18n,6_000_000n),musd,musdc);
 assert.equal(r.musdc,6_000_000n);
});
test('reject fraudulent pool token addresses',()=>{
 assert.throws(()=>decodePoolReserves(res(1,2),musd,account),/Pool token/);
});
test('reject same pool tokens',()=>{
 assert.throws(()=>decodePoolReserves(res(1,2),musd,musd));
});
test('preflight accepts only known function selectors',()=>{
 assert.equal(buildCall(SEL.balanceOf,account).length,74);
 assert.throws(()=>buildCall('0x12345678',account));
});
test('RPC restricts read-only methods',async()=>{
 await assert.rejects(rpcRead('eth_sendTransaction',[],{fetchFn:fakeFetcher()}),/not permitted/);
 await assert.rejects(rpcRead('eth_getLogs',[],{fetchFn:fakeFetcher()}),/not permitted/);
 await assert.rejects(rpcRead('eth_call',[{to:account,data:SEL.balanceOf},BLOCK],{fetchFn:fakeFetcher()}),/Unapproved/);
});
test('RPC restricts hostnames to Mezo public providers',async()=>{
 await assert.rejects(rpcRead('eth_chainId',[],{url:'https://evil.example',fetchFn:fakeFetcher()}),/not allowlisted/);
});
test('snapshot checks real token identity and yields pool balances',async()=>{
 const x=await getSnapshot({fetchFn:fakeFetcher()});
 assert.equal(x.chainId,31612);assert.equal(x.block,'256');
 assert.equal(x.observedTotalSupply,'101000.00');
 assert.equal(x.poolMUSD,'7000.00');
 assert.equal(x.poolMUSDC,'6000.00');
 assert.equal(x.poolReserveImpliedMusdcPerMusd,'0.857142');
});
test('optional public wallet balance is read-only',async()=>{
 const x=await getSnapshot({wallet:account,fetchFn:fakeFetcher()});
 assert.equal(x.musdBalance,'1200.000000');
 assert.equal(x.allowanceSpender,undefined);
});
test('optional spender allowance requires public wallet',async()=>{
 const x=await getSnapshot({wallet:account,spender,fetchFn:fakeFetcher()});
 assert.equal(x.musdAllowance,'550.000000');
 await assert.rejects(getSnapshot({spender,fetchFn:fakeFetcher()}),/wallet address/);
});
test('wrong network refused even with token contract correct',async()=>{
 const f=async(url,req)=>{
  const data=JSON.parse(req.body);
  if(data.method==='eth_chainId') return {ok:true,json:async()=>({result:'0x1'})};
  return fakeFetcher()(url,req);
 };
 await assert.rejects(getSnapshot({fetchFn:f}),/wrong Mezo/);
});
test('alternative official RPC allowed',async()=>{
 const x=await getSnapshot({rpcUrl:MEZO.rpcFallback,fetchFn:fakeFetcher()});
 assert.equal(x.chainId,MEZO.chainId);
});
test('RPC error propagates without inventing balance',async()=>{
 await assert.rejects(getSnapshot({fetchFn:async()=>({ok:true,json:async()=>({error:{code:-1}})})}),/no valid result/);
});
test('malformed bytecode refused',async()=>{
 const fake=async(url,request)=>{
  const data=JSON.parse(request.body);
  if(data.method==='eth_getCode')return {ok:true,json:async()=>({result:'0x'})};
  return fakeFetcher()(url,request);
 };
 await assert.rejects(getSnapshot({fetchFn:fake}),/bytecode absent/);
});
