import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { SquareClient, SquareEnvironment } from 'square'
import { getAddress, JsonRpcProvider, Interface } from 'ethers'
import { ledger, origin, CHAIN } from './ledger.js'

const book=ledger(process.env.SCUPH_LEDGER_DB || 'pilot.sqlite')
const [cmd,...args]=process.argv.slice(2)
const env = key => {if(!process.env[key])throw Error(`Set ${key} on the server`);return process.env[key]}
async function operator() {
  if (cmd==='cash' || cmd==='sync') {
    const client=new SquareClient({token:env('SQUARE_SANDBOX_TOKEN'),environment:SquareEnvironment.Sandbox})
    const [ticket,wallet,cents]=args
    const s=cmd==='cash'?book.sale(ticket,wallet,Number(cents),env('SQUARE_SANDBOX_LOCATION')):book.lookup(ticket)
    if(!s)throw Error('Unknown receipt')
    let id=s.payment
    if(!id){
      if(cmd!=='cash')throw Error('Retry the original cash command to recover the Square payment')
      const money={amount:BigInt(s.cents),currency:'USD'}
      const {payment}=await client.payments.create({idempotencyKey:`pilot-${ticket}`,sourceId:'CASH',amountMoney:money,cashDetails:{buyerSuppliedMoney:money},locationId:s.location,referenceId:ticket})
      id=payment?.id
      if(!id)throw Error('Square returned no payment ID')
    }
    const {payment}=await client.payments.get({paymentId:id})
    return book.reconcile(ticket,payment)
  }
  if(cmd==='award') {
    const [id,wallet,kind,asset,units]=args
    return book.draft(id,wallet,kind,asset,units,env('SEPOLIA_TREASURY_ADDRESS'))
  }
  if(cmd==='confirm'){
    const [id,hash]=args,p=book.prize(id)
    if(!p)throw Error('Unknown award')
    const rpc=new JsonRpcProvider(env('SEPOLIA_RPC_URL'))
    try {
      if((await rpc.getNetwork()).chainId!==BigInt(CHAIN))throw Error('Sepolia required')
      const [tx,r]=await Promise.all([rpc.getTransaction(hash),rpc.getTransactionReceipt(hash)])
      if(!tx||!r||r.status!==1||await r.confirmations()<3||getAddress(tx.from)!==p.treasury)throw Error('Treasury transfer not confirmed')
      if(p.kind==='native'){
        if(!tx.to||getAddress(tx.to)!==p.wallet||tx.value!==BigInt(p.units)||tx.data!=='0x')throw Error('Wrong native transfer')
      } else {
        const abi=new Interface(['event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)'])
        const expected=abi.encodeFilterTopics('Transfer',[p.treasury,p.wallet,BigInt(p.units)])
        if(!r.logs.some(l=>getAddress(l.address)===p.asset && expected.length===l.topics.length && expected.every((t,i)=>t.toLowerCase()===l.topics[i].toLowerCase())))throw Error('Missing ERC-721 transfer')
      }
      book.confirm(id,tx.hash.toLowerCase());return {award:id,status:'delivered',hash:tx.hash}
    } finally {rpc.destroy()}
  }
  throw Error('Unknown operator command')
}

if(cmd){
  try{console.log(JSON.stringify(await operator(),null,2))}catch(e){console.error(e.message);process.exitCode=1}finally{book.close()}
}else{
  const page=readFileSync(new URL('./portal.html',import.meta.url)),sessions=new Map()
  createServer(async(req,res)=>{
    const send=(status,data,type='application/json')=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY'});res.end(type==='text/html'?data:JSON.stringify(data))}
    if(req.headers.host!=='127.0.0.1:8787')return send(403,{error:'Invalid host'})
    try{
      if(req.method==='GET' && req.url==='/')return send(200,page,'text/html')
      if(req.method!=='POST'||req.headers.origin!==origin || req.headers['content-type']!=='application/json')return send(403,{error:'Use the local portal'})
      let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>4096)return send(413,{error:'Body too large'})}
      const body=JSON.parse(raw)
      if(req.url==='/challenge')return send(200,book.challenge(body.wallet))
      if(req.url==='/verify'){
        const wallet=book.verify(body.nonce,body.signature),token=randomBytes(32).toString('hex')
        for(const [key,s] of sessions)if(s.expires<Date.now())sessions.delete(key)
        sessions.set(token,{wallet,expires:Date.now()+900000});return send(200,{token})
      }
      if(req.url==='/ledger'){
        const s=sessions.get(req.headers.authorization?.replace(/^Bearer /,''))
        if(!s||s.expires<Date.now())return send(401,{error:'Reconnect wallet'})
        return send(200,book.history(s.wallet))
      }
      return send(404,{error:'Not found'})
    }catch{return send(400,{error:'Invalid request or signature'})}
  }).listen(8787,'127.0.0.1',()=>console.log(`SCUPH sandbox portal: ${origin}`))
}
