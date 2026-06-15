export type TelephonyCallStatus = "answered" | "not_answered" | "busy" | "failed";

export type TelephonyCallResult = {
  callId: string;
  status: TelephonyCallStatus;
  duration: number;
  recordingUrl?: string | null;
  errorMessage?: string | null;
  pressedKey?: string | null;
};

export interface TelephonyAdapter {
  call(phone: string, audioUrl: string | null): Promise<TelephonyCallResult>;
  getCallStatus(callId: string): Promise<TelephonyCallResult>;
  hangup(callId: string): Promise<void>;
  handleIvrInput(callId: string, pressedKey: string): Promise<void>;
}
