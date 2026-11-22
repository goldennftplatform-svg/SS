import { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'
import { getAddress, verifyMessage, Interface, ZeroAddress } from 'ethers'

export const CHAIN = 11155111 // Sepolia only
export const origin = 'http://127.0.0.1:8787'
const nft = new Interface(['function safeTransferFrom(address from,address to,uint256 tokenId)'])
function check(ok, message) { if (!ok) throw new Error(message) }
export function ledger(file) {
  const db = new DatabaseSync(file)
  db.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS challenge (nonce TEXT PRIMARY KEY, wallet TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS member (wallet TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS sale (ticket TEXT PRIMARY KEY, wallet TEXT REFERENCES member, cents INTEGER NOT NULL, location TEXT NOT NULL, payment TEXT UNIQUE);
    CREATE TABLE IF NOT EXISTS entry (seq INTEGER PRIMARY KEY, ticket TEXT REFERENCES sale, delta INTEGER NOT NULL, booked TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS prize (award TEXT PRIMARY KEY, wallet TEXT REFERENCES member, kind TEXT NOT NULL, asset TEXT NOT NULL, units TEXT NOT NULL, treasury TEXT NOT NULL, tx TEXT UNIQUE);
    CREATE UNIQUE INDEX IF NOT EXISTS unique_collectible ON prize(asset,units) WHERE kind='nft';
    CREATE TRIGGER IF NOT EXISTS immutable_entry BEFORE UPDATE ON entry BEGIN SELECT RAISE(ABORT,'immutable entry'); END;
    CREATE TRIGGER IF NOT EXISTS retain_entry BEFORE DELETE ON entry BEGIN SELECT RAISE(ABORT,'immutable entry'); END;`)
  const stmt = q => db.prepare(q)
  const atomic = fn => { db.exec('BEGIN IMMEDIATE');try {const v=fn();db.exec('COMMIT');return v} catch(e){db.exec('ROLLBACK');throw e} }
  const message = row => `SCUPH SAFARI sandbox wallet link\nOrigin: ${origin}\nAddress: ${row.wallet}\nChain: ${CHAIN}\nNonce: ${row.nonce}\nExpires: ${new Date(row.expires).toISOString()}\nThis signature reads test credits. It does not authorize a transfer.`
  return {
    close:()=>db.close(),
    challenge(address) {
      const row={nonce:randomUUID(),wallet:getAddress(address),expires:Date.now()+300000}
      stmt('DELETE FROM challenge WHERE expires<=?').run(Date.now())
      stmt('INSERT INTO challenge VALUES(?,?,?)').run(row.nonce,row.wallet,row.expires)
      return {nonce:row.nonce,message:message(row)}
    },
    verify(nonce,signature) {
      return atomic(()=>{
        const row=stmt('SELECT * FROM challenge WHERE nonce=?').get(nonce)
        check(row && row.expires>Date.now() && verifyMessage(message(row),signature)===row.wallet,'Wallet proof failed or expired')
        stmt('DELETE FROM challenge WHERE nonce=?').run(nonce)
        stmt('INSERT OR IGNORE INTO member VALUES(?)').run(row.wallet)
        return row.wallet
      })
    },
    history(address) {
      const wallet=getAddress(address)
      const entries=stmt('SELECT e.seq,e.delta,e.booked,s.ticket FROM entry e JOIN sale s USING(ticket) WHERE wallet=? ORDER BY seq DESC').all(wallet)
      return {wallet,credits:entries.reduce((n,e)=>n+e.delta,0),entries,prizes:stmt('SELECT award,kind,asset,units,tx FROM prize WHERE wallet=?').all(wallet)}
    },
    sale(ticket,address,cents,location) {
      const wallet=getAddress(address)
      check(/^[a-zA-Z0-9_-]{1,36}$/.test(ticket) && Number.isSafeInteger(cents) && cents>=100 && cents<=100000 && cents%100===0 && location,'Use a unique receipt ID and whole test dollars (1–1000)')
      stmt('INSERT INTO sale(ticket,wallet,cents,location) VALUES(?,?,?,?) ON CONFLICT(ticket) DO NOTHING').run(ticket,wallet,cents,location)
      const row=stmt('SELECT * FROM sale WHERE ticket=?').get(ticket)
      check(row.wallet===wallet && row.cents===cents && row.location===location,'Receipt ID already belongs to a different sale')
      return row
    },
    lookup: ticket=>stmt('SELECT * FROM sale WHERE ticket=?').get(ticket),
    reconcile(ticket,p) {
      return atomic(()=>{
        const s=stmt('SELECT * FROM sale WHERE ticket=?').get(ticket)
        check(s && p.id && p.referenceId===ticket && p.locationId===s.location && p.sourceType==='CASH' && p.status==='COMPLETED' && p.amountMoney?.currency==='USD' && BigInt(p.amountMoney.amount)===BigInt(s.cents) && (!s.payment||s.payment===p.id),'Square receipt does not match the local sale')
        const refund=p.refundedMoney
        check(!refund || (refund.currency==='USD' && BigInt(refund.amount)>=0n && BigInt(refund.amount)<=BigInt(s.cents)),'Unexpected refund')
        const target=Math.floor((s.cents-Number(refund?.amount??0))/100)
        const booked=stmt('SELECT COALESCE(SUM(delta),0) AS n FROM entry WHERE ticket=?').get(ticket).n
        stmt('UPDATE sale SET payment=? WHERE ticket=?').run(p.id,ticket)
        if(target!==booked)stmt('INSERT INTO entry(ticket,delta) VALUES(?,?)').run(ticket,target-booked)
        return {ticket,payment:p.id,creditChange:target-booked}
      })
    },
    draft(award,address,kind,asset,amount,sender) {
      check(/^[\w-]{1,64}$/.test(award) && ['native','nft'].includes(kind),'Invalid prize ID or kind')
      const wallet=getAddress(address), treasury=getAddress(sender), units=BigInt(amount)
      check(wallet!==ZeroAddress && treasury!==ZeroAddress && wallet!==treasury && units>=0n && units<2n**256n && (kind==='nft'||units>0n),'Invalid destination or units')
      asset=kind==='native'?'ETH':getAddress(asset)
      check(asset!==ZeroAddress,'Invalid NFT contract')
      stmt('INSERT INTO prize(award,wallet,kind,asset,units,treasury) VALUES(?,?,?,?,?,?) ON CONFLICT(award) DO NOTHING').run(award,wallet,kind,asset,units.toString(),treasury)
      const p=stmt('SELECT * FROM prize WHERE award=?').get(award)
      check(p.wallet===wallet && p.kind===kind && p.asset===asset && p.units===units.toString() && p.treasury===treasury && !p.tx,'Award conflict or already delivered')
      return {chainId:CHAIN,from:treasury,to:kind==='native'?wallet:asset,value:kind==='native'?units.toString():'0',data:kind==='native'?'0x':nft.encodeFunctionData('safeTransferFrom',[treasury,wallet,units])}
    },
    prize:id=>stmt('SELECT * FROM prize WHERE award=?').get(id),
    confirm(award,hash){check(/^0x[\da-f]{64}$/i.test(hash),'Invalid hash');const r=stmt('UPDATE prize SET tx=? WHERE award=? AND (tx IS NULL OR tx=?)').run(hash,award,hash);check(r.changes===1,'Award not found or already delivered')}
  }
}
