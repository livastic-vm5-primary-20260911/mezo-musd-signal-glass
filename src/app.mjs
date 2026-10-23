import {MEZO,address,getSnapshot} from './core.mjs';
const $=id=>document.getElementById(id);
const state={busy:false};
const update=(id,v)=>{$(id).textContent=v};
function format(value){return value==='0.000000'? '0.000000' : value;}
async function refresh({lookup=false}={}){
 if(state.busy)return;
 state.busy=true;
 $('refresh').disabled=true;
 update('status','Connecting to official public Mezo RPC (read-only)…');
 $('statusDot').className='statusdot';
 try{
  const wallet=$('walletAddress').value.trim();
  const spender=$('spenderAddress').value.trim();
  if(lookup && spender && !wallet)throw new Error('Enter a wallet address before inspecting an allowance.');
  if(lookup && wallet)address(wallet);
  if(lookup && spender)address(spender);
  let latest;
  try{
   latest=await getSnapshot({wallet:lookup?wallet:undefined,spender:lookup?spender:undefined});
  }catch(firstError){
   // Only an official listed read-only provider; never alter address/asset/network.
   latest=await getSnapshot({wallet:lookup?wallet:undefined,spender:lookup?spender:undefined,rpcUrl:MEZO.rpcFallback});
  }
  update('supply',latest.observedTotalSupply);
  update('poolMUSD',latest.poolMUSD);
  update('poolMUSDC',latest.poolMUSDC);
  update('ratio',latest.poolReserveImpliedMusdcPerMusd??'Unknown');
  update('block','Block · #'+latest.block);
  if(lookup){
    update('balance',latest.musdBalance===undefined?'—':format(latest.musdBalance)+' MUSD');
    update('allowance',latest.musdAllowance===undefined?'—':format(latest.musdAllowance)+' MUSD');
  }
  update('status','Live read confirmed · official Mezo network / token / pool checked');
  $('statusDot').className='statusdot ok';
 }catch(e){
  update('status','Read unavailable: '+String(e.message||e).slice(0,180));
  $('statusDot').className='statusdot error';
 }finally{
  $('refresh').disabled=false;
  state.busy=false;
 }
}
$('refresh').addEventListener('click',()=>refresh());
$('lookup').addEventListener('submit',e=>{e.preventDefault();refresh({lookup:true});});
$('clear').addEventListener('click',()=>{
 $('walletAddress').value='';$('spenderAddress').value='';
 update('balance','—');update('allowance','—');
});
refresh();
