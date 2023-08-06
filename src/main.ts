import {TypeormDatabase} from '@subsquid/typeorm-store'
import {TransactionThatCausedMint, Mint} from './model'
import {processor} from './processor'
import * as erc20 from './abi/erc20'

processor.run(new TypeormDatabase({supportHotBlocks: false}), async (ctx) => {
    const transactions: Map<string,TransactionThatCausedMint> = new Map()
    const mints: Mint[] = []

    for (let block of ctx.blocks) {
        for (let log of block.logs) {
            if (log.topics[0] === erc20.events.Transfer.topic &&
                log.topics[1] === '0x0000000000000000000000000000000000000000000000000000000000000000') {

                if (!log.transaction) {
                    ctx.log.fatal(`ERROR: event log came without a parent transaction`)
                    console.log(log)
                    process.exit(1)
                }

                if (!transactions.has(log.transaction.hash)) {
                    transactions.set(log.transaction.hash, new TransactionThatCausedMint({
                        id: log.transaction.id,
                        block: block.header.height,
                        hash: log.transaction.hash,
                        from: log.transaction.from,
                        to: log.transaction.to,
                        gasSpent: log.transaction.gasUsed
                    }))
                }

                let {from, to, value} = erc20.events.Transfer.decode(log)
                mints.push(new Mint({
                    id: log.id,
                    txn: transactions.get(log.transaction.hash),
                    contract: log.address,
                    destination: to,
                    amount: value
                }))
            }
        }
    }

    await ctx.store.upsert([...transactions.values()])
    await ctx.store.upsert(mints)
})
