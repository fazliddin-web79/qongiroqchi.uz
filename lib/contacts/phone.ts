import { AppError } from "@/lib/api/errors";

const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

export function normalizePhone(input: string) {
  let value = input.trim().replace(/[^\d+]/g, "");
  if (value.startsWith("00")) value = `+${value.slice(2)}`;
  const digits = value.replace(/\D/g, "");

  if (!value.startsWith("+")) {
    value = digits.length === 9 ? `+998${digits}` : `+${digits}`;
  }

  if (!E164_PATTERN.test(value)) {
    throw new AppError("Phone number must be a valid E.164 number", 422, "INVALID_PHONE");
  }
  return value;
}

export function isValidPhone(input: string) {
  try {
    normalizePhone(input);
    return true;
  } catch {
    return false;
  }
}
