import { AnchorProvider, BN, Program, type Idl, type Wallet } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  type Transaction,
  type VersionedTransaction,
} from "@solana/web3.js";
import type { Product, Purchase } from "@/types/product";
import rawIdl from "@/idl/ripple.json";
import { getConnection } from "./connection";
import { getProgramId } from "./env";
import { fetchIpfsMetadata } from "./ipfs";
import type { PhantomProvider } from "@/types/phantom";

function idlForProgram(programId: PublicKey): Idl {
  return {
    ...(rawIdl as Idl),
    address: programId.toBase58(),
  };
}

function readonlyWallet(): Wallet {
  const kp = Keypair.generate();
  return {
    publicKey: kp.publicKey,
    payer: kp,
    signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T) =>
      tx,
    signAllTransactions: async <T extends Transaction | VersionedTransaction>(
      txs: T[]
    ) => txs,
  };
}

export function getReadonlyProgram(): Program {
  const programId = getProgramId();
  if (!programId) throw new Error("NEXT_PUBLIC_RIPPLE_PROGRAM_ID is not set");
  const connection = getConnection();
  const provider = new AnchorProvider(
    connection,
    readonlyWallet(),
    AnchorProvider.defaultOptions()
  );
  return new Program(idlForProgram(programId), provider);
}

export function getProgramForWallet(wallet: Wallet): Program {
  const programId = getProgramId();
  if (!programId) throw new Error("NEXT_PUBLIC_RIPPLE_PROGRAM_ID is not set");
  const connection = getConnection();
  const provider = new AnchorProvider(
    connection,
    wallet,
    AnchorProvider.defaultOptions()
  );
  return new Program(idlForProgram(programId), provider);
}

export function phantomToWallet(provider: PhantomProvider): Wallet {
  const pk = provider.publicKey;
  if (!pk) {
    throw new Error("Wallet not connected");
  }
  const pub = new PublicKey(pk.toString());
  return {
    publicKey: pub,
    signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T) => {
      const signed = await provider.signTransaction(tx);
      return signed as T;
    },
    signAllTransactions: async <T extends Transaction | VersionedTransaction>(
      txs: T[]
    ) => {
      const out: T[] = [];
      for (const tx of txs) {
        out.push((await provider.signTransaction(tx)) as T);
      }
      return out;
    },
  } as Wallet;
}

export function productPda(
  programId: PublicKey,
  creator: PublicKey,
  productId: BN
): PublicKey {
  const idBytes = Buffer.from(productId.toArray("le", 8));
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("product"), creator.toBuffer(), idBytes],
    programId
  );
  return pda;
}

export function purchaseRecordPda(
  programId: PublicKey,
  buyer: PublicKey,
  productPk: PublicKey
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("purchase"), buyer.toBuffer(), productPk.toBuffer()],
    programId
  );
  return pda;
}

export async function fetchChainCatalog(): Promise<{
  products: Product[];
  purchases: Purchase[];
}> {
  const program = getReadonlyProgram();

  const prodRows = await (
    program.account as unknown as {
      product: { all: () => Promise<{ publicKey: PublicKey; account: unknown }[]> };
    }
  ).product.all();
  const products: Product[] = [];

  for (const row of prodRows) {
    const pk = row.publicKey;
    const acc = row.account as {
      creator: PublicKey;
      id: BN;
      price: BN;
      contentHash: number[];
      metadataUri: string;
    };
    let title = "Untitled";
    let description = "";
    let contentUrl = "";
    try {
      const meta = await fetchIpfsMetadata(acc.metadataUri);
      title = meta.title;
      description = meta.description;
      contentUrl = meta.contentUrl;
    } catch {
      description = "Metadata could not be loaded (check IPFS gateway / URI).";
    }

    const hashBytes = new Uint8Array(acc.contentHash);
    products.push({
      id: pk.toBase58(),
      source: "chain",
      creatorWallet: acc.creator.toBase58(),
      title,
      description,
      priceLamports: acc.price.toNumber(),
      contentUrl,
      contentHash: Buffer.from(hashBytes).toString("hex"),
      createdAt: 0,
      metadataUri: acc.metadataUri,
      productIdU64: acc.id.toString(),
    });
  }

  const purchaseRows = await (
    program.account as unknown as {
      purchaseRecord: {
        all: () => Promise<{ publicKey: PublicKey; account: unknown }[]>;
      };
    }
  ).purchaseRecord.all();
  const productByPk = new Map(products.map((p) => [p.id, p]));

  const purchases: Purchase[] = purchaseRows.map((row) => {
    const acc = row.account as {
      buyer: PublicKey;
      product: PublicKey;
      amountLamports: BN;
    };
    const prodPk = acc.product.toBase58();
    const prod = productByPk.get(prodPk);
    return {
      id: row.publicKey.toBase58(),
      productId: prodPk,
      buyerWallet: acc.buyer.toBase58(),
      creatorWallet: prod?.creatorWallet ?? "",
      txSignature: "",
      amountLamports: acc.amountLamports.toNumber(),
      createdAt: 0,
      recordPda: row.publicKey.toBase58(),
    };
  });

  return { products, purchases };
}

export async function createProductOnChain(
  wallet: Wallet,
  params: {
    productId: BN;
    priceLamports: BN;
    contentHash: Uint8Array;
    metadataUri: string;
  }
): Promise<string> {
  const program = getProgramForWallet(wallet);
  const programId = program.programId;
  const creator = wallet.publicKey;
  const productPk = productPda(programId, creator, params.productId);
  const hashArr = Array.from(params.contentHash);
  if (hashArr.length !== 32) throw new Error("content_hash must be 32 bytes");

  const sig = await program.methods
    .createProduct(
      params.productId,
      params.priceLamports,
      hashArr,
      params.metadataUri
    )
    .accounts({
      creator,
      product: productPk,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return sig;
}

export async function purchaseOnChain(
  wallet: Wallet,
  productPk: PublicKey
): Promise<string> {
  const program = getProgramForWallet(wallet);
  const programId = program.programId;
  const buyer = wallet.publicKey;

  const prod = await (
    program.account as unknown as {
      product: { fetch: (k: PublicKey) => Promise<unknown> };
    }
  ).product.fetch(productPk);
  const acc = prod as {
    creator: PublicKey;
    id: BN;
    price: BN;
    contentHash: number[];
    metadataUri: string;
  };

  const creator = acc.creator;
  const purchasePk = purchaseRecordPda(programId, buyer, productPk);

  const sig = await program.methods
    .purchase()
    .accounts({
      buyer,
      creator,
      product: productPk,
      purchaseRecord: purchasePk,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return sig;
}
