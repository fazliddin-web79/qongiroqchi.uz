import { cookies } from "next/headers";
import en from "@/messages/en.json";
import ru from "@/messages/ru.json";
import uz from "@/messages/uz.json";
import { defaultLocale, isLocale, localeCookie } from "./config";
import type { Locale, Messages } from "@/types/i18n";

const dictionaries: Record<Locale, Messages> = { en, uz, ru };

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(localeCookie)?.value;
  return isLocale(value) ? value : defaultLocale;
}

export async function getMessages(): Promise<Messages> {
  return dictionaries[await getLocale()];
}
