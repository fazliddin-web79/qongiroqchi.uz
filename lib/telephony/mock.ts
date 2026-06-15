import { randomUUID } from "node:crypto";
import type { TelephonyAdapter, TelephonyCallResult, TelephonyCallStatus } from "./types";

const calls = new Map<string, TelephonyCallResult>();
const statuses: TelephonyCallStatus[] = ["answered", "answered", "not_answered", "busy", "failed"];

export class MockTelephonyAdapter implements TelephonyAdapter {
  async call(phone: string, audioUrl: string | null) {
    void phone;
    void audioUrl;
    await wait(randomDelay());
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const callId = `mock-${randomUUID()}`;
    const pressedKey = status === "answered" && Math.random() < 0.35 ? "1" : null;
    const result: TelephonyCallResult = {
      callId,
      status,
      duration: status === "answered" ? Math.floor(Math.random() * 90) + 10 : 0,
      pressedKey,
      recordingUrl: status === "answered" ? `/mock-recordings/${callId}.mp3` : null,
      errorMessage: status === "failed" ? "Mock telephony provider failure" : null,
    };
    calls.set(callId, result);
    return result;
  }

  async getCallStatus(callId: string) {
    const result = calls.get(callId);
    if (!result) throw new Error(`Mock call ${callId} not found`);
    return result;
  }

  async hangup(callId: string) {
    if (!calls.has(callId)) throw new Error(`Mock call ${callId} not found`);
  }

  async handleIvrInput(callId: string, pressedKey: string) {
    const result = await this.getCallStatus(callId);
    calls.set(callId, { ...result, pressedKey });
  }
}

function randomDelay() {
  const minimum = Number(process.env.MOCK_CALL_MIN_DELAY_MS ?? "500");
  const maximum = Number(process.env.MOCK_CALL_MAX_DELAY_MS ?? "2000");
  return Math.floor(Math.random() * Math.max(1, maximum - minimum + 1)) + minimum;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
