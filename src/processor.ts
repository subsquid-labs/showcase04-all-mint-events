import {DataSourceBuilder} from '@subsquid/evm-stream'
import * as usdcAbi from './abi/usdc'

export const dataSource = new DataSourceBuilder()
    // The SQD Network Portal is the primary source of blockchain data: it is public,
    // needs no API key, and streams pre-filtered data — including real-time unfinalized
    // blocks — far faster than a plain RPC endpoint.
    .setPortal('https://portal.sqd.dev/datasets/ethereum-mainnet')
    // To use a private or rate-limit-lifted Portal, supply an API key
    // through the HTTP client headers (create a key at https://portal.sqd.dev/app):
    // .setPortal({
    //     url: 'https://portal.sqd.dev/datasets/ethereum-mainnet',
    //     http: {
    //         headers: {'x-api-key': process.env.SQD_API_KEY},
    //     },
    // })
    // Field selection is explicit: there are no default optional fields, so list every
    // field the handler reads.
    .setFields({
        log: {
            address: true,
            topics: true,
            data: true,
        },
        transaction: {
            hash: true,
            from: true,
            to: true,
            gasUsed: true,
        },
    })
    // Request all logs with the Mint topic together with their parent transactions.
    .addLog({
        where: {
            topic0: [usdcAbi.events.Mint.topic],
        },
        include: {
            transaction: true,
        },
    })
    .build()
