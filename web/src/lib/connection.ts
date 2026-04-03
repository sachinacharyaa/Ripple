import { Connection } from "@solana/web3.js";
import { RPC_ENDPOINT } from "./constants";

let conn: Connection | null = null;

export function getConnection(): Connection {
  if (!conn) {
    conn = new Connection(RPC_ENDPOINT, "confirmed");
  }
  return conn;
}
