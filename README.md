# MUSD Signal Glass — a Mezo DeFi data utility

A functioning zero-key, no-wallet static web dashboard that integrates the REAL MUSD (Mezo mainnet) ERC-20 and the official Mezo MUSD/mUSDC onchain liquidity pool. Created for Mezo Buildathon Wave 1 (October 2026). The app is useful before interacting with MUSD: confirm public supply and pool balances, examine a publicly supplied wallet's MUSD holdings, and inspect a specific spender's ERC-20 allowance without granting any authorization.

Live site: https://livastic-vm5-primary-20260911.github.io/mezo-musd-signal-glass/

## Functional MUSD integration

- Mezo EVM chain ID 31612, official public Mezo RPC https://mezo-mainnet.boar.network, second official network provider only for transient failure fallback. No private API key, wallet or third-party backend.
- Canonical MUSD token: 0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186, decimals 18.
- mUSDC token: 0x04671c72aab5ac02a03c1098314b1bb6b560c197, decimals 6 (verified by read-only onchain decimals()).
- Canonical MUSD/mUSDC liquidity pool: 0xEd812AEc0Fecc8fD882Ac3eccC43f3aA80A6c356.
- Fetch actual ERC-20 totalSupply, balanceOf, allowance, decimals, pool token0, token1, getReserves on one pinned Mezo block, using eth_call only. Pool reserve implied ratio is presented as pool-only, NOT oracle valuation or executable swap price.
- Uses public official RPC eth_chainId, eth_blockNumber, eth_getCode before validating token and pool identity. The code fails closed on mismatched chain, token, decimals, ABI shape or address.
- No wallet connection, browser localStorage, user account, tracking scripts, signatures, transaction sending, gas or approval mutations.

First-party canonical sources:
- [Mezo contract reference](https://mezo.org/docs/users/resources/contracts-reference)
- [Mezo Pools](https://mezo.org/docs/developers/features/mezo-pools)
- [Official Mezo RPCs](https://mezo.org/docs/users/getting-started/connect/)
- [Mezo Buildathon official announcement](https://mezo.org/blog/mezo-buildathon-is-underway/)

### Real reproducible public-chain evidence

An original dated pinned block snapshot is at evidence/official-mezo-public-snapshot-20261023.json. It was retrieved from Mezo mainnet block 12,699,128 using the real MUSD and pool contracts. The supply/reserve values are historical point observations, not forward-looking APY or investment advice. Pool ratio can reflect depegs, low liquidity, migration, stale reserves, or other conditions; never infer arbitrage profitability from it.

Run npm test. To reproduce the live snapshot, in this folder execute:

    node --input-type=module -e 'import {getSnapshot} from "./src/core.mjs"; getSnapshot().then(x=>console.log(JSON.stringify(x,null,2))).catch(console.error)'

25 tests independently verify ABI decoding, source token identity, decimal scaling, pool order, public addresses, wrong chain failures, allowance checks and strict read-only method/host allowlist. No npm dependencies. Tests run without network, no customer wallet.

### Mezo Buildathon scope and status

This project has a working MUSD onchain integration that can be used immediately in a public browser. It does NOT deploy any new Mezo smart contract, provide trading strategies, custody tokens, swap assets, mint MUSD, collect fees or execute transactions. The Mezo Buildathon judges may or may not accept a live read-only web app as sufficiently integrated. Participation, prize eligibility and actual award/payment are separate from technical functionality.

Potential future milestones after independent interest and user-authorized testnet conditions: transaction simulation before an allowance decision, user-guided MUSD redemption and bridge safety warnings based on first-party proofs, and agent-readable tooling for merchants. No claim these are already shipped.

### Ownership and commercial integrity

One economic human owner through VM5 Delivery Lab, transparent AI-assisted engineering. Reuses original publicly verified Mezo chain references and original code; no competitor materials copied. The author has a separate Base x402 API seller project, but this static utility charges nothing and receives no payments. As of first publication, independently paid Mezo customers and buildathon grants = ZERO verified.

## License

MIT. Unofficial, independent prototype; no affiliation or endorsement by Mezo, Supernormal Foundation or AKINDO. No financial, tax, security audit or legal advice.
