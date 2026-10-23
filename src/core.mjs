export const MEZO = Object.freeze({
  chainId:31612, chainIdHex:'0x7b7c', network:'eip155:31612',
  rpc:'https://mezo-mainnet.boar.network',
  rpcFallback:'https://mainnet.mezo.public.validationcloud.io',
  musd:'0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186',
  musdc:'0x04671c72aab5ac02a03c1098314b1bb6b560c197',
  pool:'0xEd812AEc0Fecc8fD882Ac3eccC43f3aA80A6c356',
  sources:{
   contracts:'https://mezo.org/docs/users/resources/contracts-reference',
   pools:'https://mezo.org/docs/developers/features/mezo-pools',
   rpc:'https://mezo.org/docs/users/getting-started/connect/'
  }
});
export const SEL = Object.freeze({
  decimals:'0x313ce567', symbol:'0x95d89b41', totalSupply:'0x18160ddd',
  balanceOf:'0x70a08231', allowance:'0xdd62ed3e', getReserves:'0x0902f1ac',
  token0:'0x0dfe1681',token1:'0xd21220a7'
});
export function address(input){
  if(typeof input!=='string'||!/^0x[0-9A-Fa-f]{40}$/.test(input))
    throw new Error('Use a public EVM 20-byte address (0x + 40 hexadecimal digits).');
  return input.toLowerCase();
}
export function dataAddress(a){return address(a).slice(2).padStart(64,'0');}
export function requireWords(hex, count=1){
 if(typeof hex!=='string'|| !/^0x(?:[0-9a-fA-F]{64})+$/.test(hex) ||
    hex.length<2+64*count) throw new Error('Unexpected ABI word format.');
 return hex.slice(2).match(/.{64}/g);
}
export function decodeUint(hex){
 return BigInt('0x'+requireWords(hex)[0]);
}
export function decodeAddress(hex){
 const word=requireWords(hex)[0];
 if(!/^0{24}/i.test(word))throw new Error('Noncanonical ABI address word.');
 return address('0x'+word.slice(-40));
}
export function decimal(value,decimals=18,places=6){
 if(typeof value!=='bigint'||value<0n||!Number.isInteger(decimals)||decimals<0||decimals>36||
    !Number.isInteger(places)||places<0||places>decimals)throw new Error('Invalid decimal formatting');
 const scale=10n**BigInt(decimals);
 const integral=value/scale;
 const digits=(value%scale).toString().padStart(decimals,'0');
 return integral+'.'+digits.slice(0,places);
}
export function ratioPrice(reserve0,reserve1,dec0,dec1, precision=6){
 if(typeof reserve0!=='bigint'||typeof reserve1!=='bigint'||reserve0<=0n||reserve1<=0n)
  return null;
 if(!Number.isInteger(dec0)||!Number.isInteger(dec1)||dec0<0||dec1<0||dec0>36||dec1>36)
  throw new Error('Invalid token decimals');
 const scale=10n**BigInt(precision);
 const numerator=reserve0*(10n**BigInt(dec1))*scale;
 const denominator=reserve1*(10n**BigInt(dec0));
 const n=numerator/denominator;
 return String(n/scale)+'.'+(n%scale).toString().padStart(precision,'0');
}
export function decodePoolReserves(raw, token0, token1, requestedMusd=MEZO.musd, requestedMusdc=MEZO.musdc){
 const words=requireWords(raw,3);
 const t0=address(token0),t1=address(token1);
 const usd=address(requestedMusd),usdc=address(requestedMusdc);
 if(t0===t1 || !([t0,t1].includes(usd) && [t0,t1].includes(usdc)))
  throw new Error('Pool token addresses do not match official MUSD/mUSDC references.');
 const r0=BigInt('0x'+words[0]),r1=BigInt('0x'+words[1]);
 const musd=t0===usd?r0:r1;
 const musdc=t0===usdc?r0:r1;
 const timestamp=Number(BigInt('0x'+words[2]));
 if(!Number.isSafeInteger(timestamp)||timestamp<0||timestamp>2**32-1)throw new Error('Invalid pool timestamp');
 return {musd,musdc,timestamp,raw0:r0,raw1:r1};
}
export function buildCall(selector,...addressParams){
 if(!Object.values(SEL).includes(selector) || typeof selector!=='string')throw new Error('Unapproved selector');
 return selector+addressParams.map(dataAddress).join('');
}
export async function rpcRead(method,params, {url=MEZO.rpc,fetchFn=fetch}={}){
 if(![MEZO.rpc,MEZO.rpcFallback].includes(url))throw new Error('RPC hostname not allowlisted');
 if(!['eth_chainId','eth_blockNumber','eth_call','eth_getCode'].includes(method))
   throw new Error('Writes and transaction methods are not permitted');
 if(!Array.isArray(params))throw new Error('RPC params must be an array');
 if(method==='eth_call'){
   if(params.length!==2||typeof params[0]!=='object'||
     ![MEZO.musd.toLowerCase(),MEZO.musdc.toLowerCase(),MEZO.pool.toLowerCase()].includes(address(params[0].to))||
     typeof params[0].data!=='string'||
     !Object.values(SEL).some(sel=>params[0].data.toLowerCase().startsWith(sel)) ||
     !/^0x[0-9a-fA-F]+$/.test(params[0].data))
       throw new Error('Unapproved eth_call contract or selector');
 }
 const response=await fetchFn(url,{method:'POST',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),
   signal:AbortSignal.timeout(10000)
 });
 if(!response.ok)throw new Error('RPC HTTP '+response.status);
 const result=await response.json();
 if(result.error||result.result===undefined||result.result===null)
   throw new Error('RPC returned no valid result');
 return result.result;
}
export async function getSnapshot({wallet,spender,rpcUrl=MEZO.rpc,fetchFn=fetch}={}){
 const rpc=(method,params)=>rpcRead(method,params,{url:rpcUrl,fetchFn});
 const [chainId,block]=await Promise.all([rpc('eth_chainId',[]),rpc('eth_blockNumber',[])]);
 if(BigInt(chainId)!==BigInt(MEZO.chainId))throw new Error('RPC reported wrong Mezo chain ID');
 if(!/^0x[0-9a-fA-F]+$/.test(block))throw new Error('Invalid block');
 const at=block;
 const call=async(to,data)=>rpc('eth_call',[{to,data},at]);
 const [musdDecimals,musdcDecimals,poolToken0,poolToken1,reserves,musdSupply,code]=await Promise.all([
   call(MEZO.musd,SEL.decimals),call(MEZO.musdc,SEL.decimals),
   call(MEZO.pool,SEL.token0),call(MEZO.pool,SEL.token1),
   call(MEZO.pool,SEL.getReserves),call(MEZO.musd,SEL.totalSupply),
   rpc('eth_getCode',[MEZO.musd,at])
 ]);
 const d0=Number(decodeUint(musdDecimals)),d1=Number(decodeUint(musdcDecimals));
 if(d0!==18 || d1!==6)throw new Error('Official MUSD/mUSDC decimals changed; refuse cached price');
 if(typeof code!=='string'||code.length<8)throw new Error('MUSD bytecode absent');
 const pair=decodePoolReserves(reserves,decodeAddress(poolToken0),decodeAddress(poolToken1));
 const result={
  chainId:MEZO.chainId,block:BigInt(block).toString(),musdAddress:address(MEZO.musd),
  musdcAddress:address(MEZO.musdc),poolAddress:address(MEZO.pool),
  observedTotalSupply:decimal(decodeUint(musdSupply),d0,2),
  poolMUSD:decimal(pair.musd,d0,2),poolMUSDC:decimal(pair.musdc,d1,2),
  poolReserveImpliedMusdcPerMusd:ratioPrice(pair.musdc,pair.musd,d1,d0,6),
  note:'Read-only public RPC snapshot. Pool reserve ratio excludes price impact, fees and routing; not an oracle, collateral safety assessment, trading signal, executable quote or guarantee.',
  source:rpcUrl
 };
 if(wallet){
   const owner=address(wallet);
   const bal=await call(MEZO.musd,buildCall(SEL.balanceOf,owner));
   result.wallet=owner;
   result.musdBalance=decimal(decodeUint(bal),d0,6);
   if(spender){
     const sp=address(spender);
     const allowance=await call(MEZO.musd,buildCall(SEL.allowance,owner,sp));
     result.allowanceSpender=sp;
     result.musdAllowance=decimal(decodeUint(allowance),d0,6);
     result.allowanceRisk='An unlimited or large allowance permits the specified contract to transfer MUSD within its allowance under ERC-20 rules. It is not proof of maliciousness. Verify the intended spender; no approval changes can be made here.';
   }
 }else if(spender)throw new Error('To inspect an allowance, supply a public wallet address');
 return result;
}
