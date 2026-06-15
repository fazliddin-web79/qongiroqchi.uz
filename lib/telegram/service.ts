import { prisma } from "@/lib/db/prisma";

export async function notifyNewLead(leadId: string) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { contact: { select: { fullName: true, phone: true } }, campaign: { select: { name: true } }, call: { select: { pressedKey: true } }, company: { select: { settings: true } } },
    });
    const settings = lead?.company.settings;
    if (!lead || !settings?.telegramBotToken || !settings.telegramChatId) return { sent: false, reason: "NOT_CONFIGURED" };
    await sendTelegramMessage(settings.telegramBotToken, settings.telegramChatId, leadMessage(lead, settings.defaultLanguage));
    return { sent: true };
  } catch (error) {
    console.error("Telegram lead notification failed", error);
    return { sent: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

export async function sendTelegramTest(companyId: string) {
  const settings = await prisma.companySetting.findUnique({ where: { companyId } });
  if (!settings?.telegramBotToken || !settings.telegramChatId) throw new Error("Telegram bot token and chat id are required");
  await sendTelegramMessage(settings.telegramBotToken, settings.telegramChatId, "AutoCall CRM: Telegram notification test successful.");
}

async function sendTelegramMessage(token: string, chatId: string, text: string) {
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Telegram API returned ${response.status}`);
}

function leadMessage(lead: {
  status: string;
  contact: { fullName: string; phone: string } | null;
  campaign: { name: string } | null;
  call: { pressedKey: string | null } | null;
}, language: string) {
  if (language === "en") return `New lead!\nName: ${lead.contact?.fullName ?? "-"}\nPhone: ${lead.contact?.phone ?? "-"}\nCampaign: ${lead.campaign?.name ?? "-"}\nPressed key: ${lead.call?.pressedKey ?? "-"}\nStatus: ${lead.status}`;
  if (language === "ru") return `Новый лид!\nИмя: ${lead.contact?.fullName ?? "-"}\nТелефон: ${lead.contact?.phone ?? "-"}\nКампания: ${lead.campaign?.name ?? "-"}\nНажатая клавиша: ${lead.call?.pressedKey ?? "-"}\nСтатус: ${lead.status}`;
  return `Yangi lead!\nIsm: ${lead.contact?.fullName ?? "-"}\nTelefon: ${lead.contact?.phone ?? "-"}\nKampaniya: ${lead.campaign?.name ?? "-"}\nBosilgan tugma: ${lead.call?.pressedKey ?? "-"}\nStatus: ${lead.status}`;
}
