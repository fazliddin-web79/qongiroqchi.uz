import type { TelephonyAdapter } from "./types";
import { MockTelephonyAdapter } from "./mock";

let adapter: TelephonyAdapter | undefined;

export function getTelephonyAdapter() {
  if (adapter) return adapter;
  const provider = process.env.TELEPHONY_ADAPTER ?? "mock";
  if (provider !== "mock") throw new Error(`Unsupported telephony adapter: ${provider}`);
  adapter = new MockTelephonyAdapter();
  return adapter;
}

export type { TelephonyAdapter, TelephonyCallResult, TelephonyCallStatus } from "./types";
