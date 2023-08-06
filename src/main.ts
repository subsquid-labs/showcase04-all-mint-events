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
                        gasUsed: log.transaction.gasUsed
                    }))
                }

                let value
                let destination = log.topics[2] && '0x' + log.topics[2].slice(26)
                try {
                    let {from, to, value} = erc20.events.Transfer.decode(log)
                    if (!destination) {
                        destination = to.toLowerCase()
                    }
                    else if (destination !== to.toLowerCase()) {
                        ctx.log.error(`ERROR: minting destination from topics and from data disagree for a minting Transfer emitted by txn ${log.transaction.hash}`)
                    }
                }
                catch (error) {
                    ctx.log.info(`Failed to decode a minting Transfer emitted by txn ${log.transaction.hash}: amount will be missing`)
                }
                if (!destination) {
                    ctx.log.error(`cannot determine destination for a minting Transfer emitted by txn ${log.transaction.hash}`)
                }

                mints.push(new Mint({
                    id: log.id,
                    txn: transactions.get(log.transaction.hash),
                    contract: log.address,
                    destination,
                    amount: value
                }))
            }
        }
    }

    await ctx.store.upsert([...transactions.values()])
    await ctx.store.upsert(mints)
})
