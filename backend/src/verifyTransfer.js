import { PublicKey, SystemProgram } from "@solana/web3.js";

const SYSTEM_PROGRAM_ID = SystemProgram.programId.toBase58();

/**
 * Verify a confirmed transaction contains split system transfers:
 * buyer -> creator and buyer -> platform for expected amounts.
 */
export async function verifySolTransfer(connection, signature, buyerWallet, creatorWallet, platformWallet, expectedCreatorLamports, expectedFeeLamports) {
  const buyer = new PublicKey(buyerWallet);
  const creator = new PublicKey(creatorWallet);
  const platform = new PublicKey(platformWallet);
  const wantCreator = BigInt(expectedCreatorLamports);
  const wantFee = BigInt(expectedFeeLamports);

  const parsed = await connection.getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });

  if (!parsed) return { ok: false, reason: "Transaction not found" };
  if (parsed.meta?.err) return { ok: false, reason: "Transaction failed on-chain" };

  const candidates = [];
  const { message } = parsed.transaction;
  const outer = "instructions" in message ? message.instructions : [];
  for (const ix of outer) candidates.push(ix);
  if (parsed.meta?.innerInstructions) {
    for (const group of parsed.meta.innerInstructions) {
      for (const ix of group.instructions) candidates.push(ix);
    }
  }

  const parsedMatch = verifyTransfersFromParsed(candidates, buyer, creator, platform, wantCreator, wantFee);
  if (parsedMatch.ok) return { ok: true };

  const raw = await connection.getTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });
  if (raw?.meta && raw.transaction) {
    const balanceMatch = verifyByBalanceDelta(raw, buyer, creator, platform, wantCreator, wantFee);
    if (balanceMatch.ok) return { ok: true };
    return {
      ok: false,
      reason:
        `Split transfer mismatch. Expected creator=${wantCreator.toString()} lamports, ` +
        `platform=${wantFee.toString()} lamports; parsed creator=${parsedMatch.toCreator.toString()}, ` +
        `parsed platform=${parsedMatch.toPlatform.toString()}, balance creator=${balanceMatch.toCreator.toString()}, ` +
        `balance platform=${balanceMatch.toPlatform.toString()}.`,
    };
  }

  return {
    ok: false,
    reason:
      `No valid split SOL transfer found. Expected creator=${wantCreator.toString()} lamports, ` +
      `platform=${wantFee.toString()} lamports; parsed creator=${parsedMatch.toCreator.toString()}, ` +
      `parsed platform=${parsedMatch.toPlatform.toString()}.`,
  };
}

function programIdString(ix) {
  const p = ix.programId;
  if (typeof p === "string") return p;
  if (p && typeof p.toBase58 === "function") return p.toBase58();
  return "";
}

function transferAmount(ix, buyer, target) {
  if (programIdString(ix) !== SYSTEM_PROGRAM_ID) return 0n;
  const parsed = ix.parsed;
  if (!parsed || parsed.type !== "transfer") return 0n;
  const { source, destination: infoDestination, lamports } = parsed.info;
  if (!source || !infoDestination || lamports === undefined) return 0n;
  try {
    const src = new PublicKey(source);
    const dst = new PublicKey(infoDestination);
    if (!src.equals(buyer) || !dst.equals(target)) return 0n;
    return BigInt(lamports);
  } catch {
    return 0n;
  }
}

function verifyTransfersFromParsed(candidates, buyer, creator, platform, wantCreator, wantFee) {
  let toCreator = 0n;
  let toPlatform = 0n;
  for (const ix of candidates) {
    toCreator += transferAmount(ix, buyer, creator);
    toPlatform += transferAmount(ix, buyer, platform);
  }

  if (creator.equals(platform)) {
    return {
      ok: toCreator === wantCreator + wantFee,
      toCreator,
      toPlatform,
    };
  }

  return {
    ok: toCreator === wantCreator && toPlatform === wantFee,
    toCreator,
    toPlatform,
  };
}

function getAccountKeysForTx(tx) {
  const msg = tx.transaction.message;
  if (msg.version === "legacy") {
    return msg.accountKeys.map((k) => (k instanceof PublicKey ? k : new PublicKey(k)));
  }
  const out = [...msg.staticAccountKeys];
  const loaded = tx.meta?.loadedAddresses;
  if (loaded?.writable?.length) {
    for (const w of loaded.writable) out.push(new PublicKey(w));
  }
  if (loaded?.readonly?.length) {
    for (const r of loaded.readonly) out.push(new PublicKey(r));
  }
  return out;
}

function verifyByBalanceDelta(tx, buyer, creator, platform, wantCreatorLamports, wantFeeLamports) {
  const keys = getAccountKeysForTx(tx);
  const meta = tx.meta;
  if (!meta?.preBalances || !meta?.postBalances) {
    return { ok: false, toCreator: 0n, toPlatform: 0n };
  }

  let buyerIdx = -1;
  let creatorIdx = -1;
  let platformIdx = -1;
  for (let i = 0; i < keys.length; i++) {
    if (keys[i].equals(buyer)) buyerIdx = i;
    if (keys[i].equals(creator)) creatorIdx = i;
    if (keys[i].equals(platform)) platformIdx = i;
  }
  if (buyerIdx < 0 || creatorIdx < 0 || platformIdx < 0) {
    return { ok: false, toCreator: 0n, toPlatform: 0n };
  }

  const preB = meta.preBalances[buyerIdx];
  const postB = meta.postBalances[buyerIdx];
  const preC = meta.preBalances[creatorIdx];
  const postC = meta.postBalances[creatorIdx];
  const preP = meta.preBalances[platformIdx];
  const postP = meta.postBalances[platformIdx];

  const toCreator = BigInt(postC) - BigInt(preC);
  const toPlatform = BigInt(postP) - BigInt(preP);
  const fromBuyer = BigInt(preB) - BigInt(postB);
  const total = wantCreatorLamports + wantFeeLamports;

  if (creator.equals(platform)) {
    return {
      ok: toCreator === total && fromBuyer >= total,
      toCreator,
      toPlatform,
    };
  }

  return {
    ok:
      toCreator === wantCreatorLamports &&
      toPlatform === wantFeeLamports &&
      fromBuyer >= total,
    toCreator,
    toPlatform,
  };
}
