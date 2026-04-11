import { PublicKey, SystemProgram } from "@solana/web3.js";

const SYSTEM_PROGRAM_ID = SystemProgram.programId.toBase58();

/**
 * Verify a confirmed transaction contains a system transfer:
 * buyer -> creator for exactly expectedLamports.
 */
export async function verifySolTransfer(connection, signature, buyerWallet, creatorWallet, expectedLamports) {
  const buyer = new PublicKey(buyerWallet);
  const creator = new PublicKey(creatorWallet);
  const want = BigInt(expectedLamports);

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

  for (const ix of candidates) {
    if (instructionMatchesTransfer(ix, buyer, creator, want)) return { ok: true };
  }

  const raw = await connection.getTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });
  if (raw?.meta && raw.transaction) {
    const ok = verifyByBalanceDelta(raw, buyer, creator, want);
    if (ok) return { ok: true };
  }

  return { ok: false, reason: "No matching SOL transfer from buyer to creator for the listed price" };
}

function programIdString(ix) {
  const p = ix.programId;
  if (typeof p === "string") return p;
  if (p && typeof p.toBase58 === "function") return p.toBase58();
  return "";
}

function instructionMatchesTransfer(ix, buyer, creator, wantLamports) {
  if (programIdString(ix) !== SYSTEM_PROGRAM_ID) return false;
  const parsed = ix.parsed;
  if (!parsed || parsed.type !== "transfer") return false;
  const { source, destination, lamports } = parsed.info;
  if (!source || !destination || lamports === undefined) return false;
  try {
    const src = new PublicKey(source);
    const dst = new PublicKey(destination);
    if (!src.equals(buyer) || !dst.equals(creator)) return false;
    return BigInt(lamports) === wantLamports;
  } catch {
    return false;
  }
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

function verifyByBalanceDelta(tx, buyer, creator, wantLamports) {
  const keys = getAccountKeysForTx(tx);
  const meta = tx.meta;
  if (!meta?.preBalances || !meta?.postBalances) return false;

  let buyerIdx = -1;
  let creatorIdx = -1;
  for (let i = 0; i < keys.length; i++) {
    if (keys[i].equals(buyer)) buyerIdx = i;
    if (keys[i].equals(creator)) creatorIdx = i;
  }
  if (buyerIdx < 0 || creatorIdx < 0) return false;

  const preB = meta.preBalances[buyerIdx];
  const postB = meta.postBalances[buyerIdx];
  const preC = meta.preBalances[creatorIdx];
  const postC = meta.postBalances[creatorIdx];

  const toCreator = BigInt(postC) - BigInt(preC);
  const fromBuyer = BigInt(preB) - BigInt(postB);

  if (toCreator !== wantLamports) return false;
  if (fromBuyer < wantLamports) return false;
  return true;
}
