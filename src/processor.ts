import {lookupArchive} from '@subsquid/archive-registry'
import {
    BlockHeader,
    DataHandlerContext,
    EvmBatchProcessor,
    EvmBatchProcessorFields,
    Log as _Log,
    Transaction as _Transaction,
} from '@subsquid/evm-processor'
import * as erc20 from './abi/erc20'

export const processor = new EvmBatchProcessor()
    .setDataSource({
        archive: lookupArchive('eth-mainnet'),
    })
    // ERC20 token mints emit Transfer events originating from 0x0
    .addLog({
        topic0: [erc20.events.Transfer.topic],
        topic1: ['0x0000000000000000000000000000000000000000000000000000000000000000'],
        transaction: true,
    })
    .setFields({
        transaction: {
            gasUsed: true,
        }
    })

export type Fields = EvmBatchProcessorFields<typeof processor>
export type Block = BlockHeader<Fields>
export type Log = _Log<Fields>
export type Transaction = _Transaction<Fields>
export type ProcessorContext<Store> = DataHandlerContext<Store, Fields>
