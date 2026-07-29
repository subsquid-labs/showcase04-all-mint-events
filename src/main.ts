import {run} from '@subsquid/batch-processor'
import {augmentBlock} from '@subsquid/evm-objects'
import {createLogger} from '@subsquid/logger'
import {TypeormDatabase} from '@subsquid/typeorm-store'
import {TransactionThatCausedMint, Mint} from './model'
import {dataSource} from './processor'
import * as usdcAbi from './abi/usdc'

const log = createLogger('sqd:processor')

run(dataSource, new TypeormDatabase({supportHotBlocks: true}), async (ctx) => {
    const transactions: Map<string,TransactionThatCausedMint> = new Map()
    const mints: Mint[] = []

    for (let block of ctx.blocks.map(augmentBlock)) {
        for (let evmLog of block.logs) {
            if (evmLog.topics[0] === usdcAbi.events.Mint.topic) {
                if (!evmLog.transaction) {
                    log.fatal(`event log came without a parent transaction`)
                    console.log(evmLog)
                    process.exit(1)
                }

                try {
                    let {minter, to, amount} = usdcAbi.events.Mint.decode(evmLog)
                    if (!transactions.has(evmLog.transaction.hash)) {
                        transactions.set(evmLog.transaction.hash, new TransactionThatCausedMint({
                            id: evmLog.transaction.id,
                            block: block.header.number,
                            hash: evmLog.transaction.hash,
                            from: evmLog.transaction.from,
                            to: evmLog.transaction.to,
                            gasUsed: evmLog.transaction.gasUsed
                        }))
                    }
                    mints.push(new Mint({
                        id: evmLog.id,
                        txn: transactions.get(evmLog.transaction.hash),
                        contract: evmLog.address,
                        minter,
                        to,
                        amount
                    }))
                }
                catch (error) {
                    log.info(`Failed to decode a Mint(address,address,uint256) event emitted by txn ${evmLog.transaction.hash}, skipping it`)
                }
            }
        }
    }

    await ctx.store.upsert([...transactions.values()])
    await ctx.store.upsert(mints)
})
