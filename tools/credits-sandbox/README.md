# SCUPH credits pilot

Local counter workflow using the official Square Node SDK, SQLite, and an injected EVM wallet. No production environment switch. No treasury private key. This is a companion to the static PWA; Pages cannot run the ledger. Game coins and editable local scores have no financial authority.

From this directory, use Node 22.13+ and run `npm ci`, `npm test`, then `npm start`. Open **http://127.0.0.1:8787** in a wallet-enabled desktop browser, select Sepolia, and sign the one-time challenge. The wallet address is the pilot account. Refresh to see postings and prize delivery status.

### Counter: Square Sandbox

To open the pilot from the game on this machine, start the Vite dev server with `VITE_CREDITS_PILOT=1` and use **Crew & HQ → Credits & prizes**. Production builds omit this local-only link.

In another terminal in this directory, set `SQUARE_SANDBOX_TOKEN` and `SQUARE_SANDBOX_LOCATION` to your Sandbox seller's server credentials. Use the same working directory or `SCUPH_LEDGER_DB` absolute path in both processes.

```
node portal.js cash counter-0001 REGISTERED_WALLET 1000
node portal.js sync counter-0001
```

The first command **records** a simulated $10 USD cash tender. It does not collect card payments, move bank funds, or import an existing POS payment. Never enter the same tender separately in POS and here. Retry with exactly the same receipt ID and values after a timeout. One nonredeemable test credit per whole unrefunded dollar is a demo assumption. A fresh Square API read must match the local sale before credits post. `sync` reconciles refunds; run it after a Sandbox refund. No webhook or background reconciliation is deployed. Serialize operator commands for a given receipt.

### Independent free prize fulfillment

An operator assigns a unique award ID after independently verifying eligibility. The pilot never consumes cash credits for entries or issues rewards based on browser-reported scores. Set `SEPOLIA_TREASURY_ADDRESS` to the public address of the operator-controlled test wallet.

```
node portal.js award time-trial-001 REGISTERED_WALLET native ETH 100000000000000
node portal.js award badge-001 REGISTERED_WALLET nft ERC721_CONTRACT 42
node portal.js confirm badge-001 TRANSACTION_HASH
```

Amounts are **wei** for Sepolia ETH or a token ID for an existing treasury-owned ERC-721. The award command prints an **unsigned** transaction (`value` in decimal wei). Check network, destination, asset and units, then submit once with your own treasury wallet. A repeated draft is not a reason to send again; check the treasury's history first. Set `SEPOLIA_RPC_URL` and run `confirm` for each submitted award after three confirmations. The portal records delivery only after checking the chain receipt and native transfer or NFT event. A pending award is not an on-chain prize yet. No minting contract, mainnet payouts, or player spending approvals are involved.

### Connecting an existing backend

Supply the repository/path for the existing Square integration (and whether it is Ruby on Rails), wallet provider/network, and whether “cash” means counter notes, Square POS, or online checkout. The host backend should own customer identity, receipt binding, signed webhook ingestion and scheduled reconciliation. Keep secrets and the database off Pages and out of `VITE_*`. For a live promotion confirm the payment model with Square and the eligibility rules for the intended audience; this family game remains free.
