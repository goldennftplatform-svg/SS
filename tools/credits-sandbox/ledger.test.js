import test from 'node:test'
import assert from 'node:assert/strict'
import { Wallet } from 'ethers'
import { ledger } from './ledger.js'

test('ownership, idempotent bookings, refunds, and independent treasury awards',async t=>{
  const book=ledger(':memory:');t.after(()=>book.close())
  const player=Wallet.createRandom(),cashier=Wallet.createRandom()
  const c=book.challenge(player.address), sig=await player.signMessage(c.message)
  const wrong=await cashier.signMessage(c.message)
  assert.throws(()=>book.verify(c.nonce,wrong))
  assert.equal(book.verify(c.nonce,sig),player.address)
  assert.throws(()=>book.verify(c.nonce,sig))
  const tx=book.draft('free-finisher',player.address,'native','ETH','100',cashier.address)
  assert.equal(tx.to,player.address);assert.equal(tx.value,'100')
  assert.equal(book.history(player.address).credits,0)
  const collectible=book.draft('free-badge',player.address,'nft',cashier.address,'0',cashier.address)
  assert.equal(collectible.data.slice(0,10),'0x42842e0e')
  assert.throws(()=>book.draft('second-badge',player.address,'nft',cashier.address,'0',cashier.address))
  book.sale('slip-24',player.address,1000,'loc')
  assert.throws(()=>book.sale('slip-24',player.address,500,'loc'))
  const p={id:'test-payment',referenceId:'slip-24',sourceType:'CASH',locationId:'loc',status:'COMPLETED',amountMoney:{amount:1000n,currency:'USD'}}
  assert.throws(()=>book.reconcile('slip-24',{...p,locationId:'other'}))
  assert.equal(book.reconcile('slip-24',p).creditChange,10)
  assert.equal(book.reconcile('slip-24',p).creditChange,0)
  p.refundedMoney={amount:150n,currency:'USD'}
  assert.equal(book.reconcile('slip-24',p).creditChange,-2)
  assert.equal(book.reconcile('slip-24',p).creditChange,0)
  assert.equal(book.history(player.address).credits,8)
  assert.equal(book.history(player.address).entries.length,2)
})
