import {TypeormDatabase} from '@subsquid/typeorm-store'
import {TransactionThatCausedMint, Mint} from './model'
import {processor} from './processor'
import * as usdcAbi from './abi/usdc'

processor.run(new TypeormDatabase({supportHotBlocks: false}), async (ctx) => {
    const transactions: Map<string,TransactionThatCausedMint> = new Map()
    const mints: Mint[] = []

    for (let block of ctx.blocks) {
        for (let log of block.logs) {
            if (log.topics[0] === usdcAbi.events.Mint.topic) {
                if (!log.transaction) {
                    ctx.log.fatal(`event log came without a parent transaction`)
                    console.log(log)
                    process.exit(1)
                }

                try {
                    let {minter, to, amount} = usdcAbi.events.Mint.decode(log)
                    if (!transactions.has(log.transaction.hash)) {
                        transactions.set(log.transaction.hash, new TransactionThatCausedMint({
                            id: log.transaction.id,
                            block: block.header.height,
                            hash: log.transaction.hash,
                            from: log.transaction.from,
                            to: log.transaction.to,
                            gasUsed: log.transaction.gasUsed
                        }))
                    }
                    mints.push(new Mint({
                        id: log.id,
                        txn: transactions.get(log.transaction.hash),
                        contract: log.address,
                        minter,
                        to,
                        amount
                    }))
                }
                catch (error) {
                    ctx.log.info(`Failed to decode a Mint(address,address,uint256) event emitted by txn ${log.transaction.hash}, skipping it`)
                }
            }
        }
    }

    await ctx.store.upsert([...transactions.values()])
    await ctx.store.upsert(mints)
})
