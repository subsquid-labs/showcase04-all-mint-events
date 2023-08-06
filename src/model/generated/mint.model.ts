import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_} from "typeorm"
import * as marshal from "./marshal"
import {TransactionThatCausedMint} from "./transactionThatCausedMint.model"

@Entity_()
export class Mint {
    constructor(props?: Partial<Mint>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => TransactionThatCausedMint, {nullable: true})
    txn!: TransactionThatCausedMint

    @Index_()
    @Column_("text", {nullable: false})
    contract!: string

    @Index_()
    @Column_("text", {nullable: false})
    destination!: string

    @Column_("numeric", {transformer: marshal.bigintTransformer, nullable: true})
    amount!: bigint | undefined | null
}
