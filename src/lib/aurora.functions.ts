import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SYSTEM_PROMPT = `Ты — Аврора, AI-консьерж бутик-отеля «Полуостров» в Петропавловске-Камчатском.

ТОН: тёплый, элегантный, как в Jumeirah/Four Seasons. Краткие, полезные ответы. Ты на «вы».

ЗНАНИЯ ОБ ОТЕЛЕ:
- Адрес: ул. Абеля, 41, Петропавловск-Камчатский
- Телефон: +7 (914) 994-57-57
- 11 категорий номеров: люксы, стандарты, семейные, хостельные блоки. Цены от 1 200 ₽/место (хостел) до люксов.
- Виды: на Авачинскую бухту, на сопки.
- Услуги: трансфер, экскурсии (вулканы, киты, термальные источники), spa/wellness.
- Бронирование: онлайн на сайте или по телефону. Предоплата 30% или стоимость 1 ночи (что больше). Оплата картой/СБП/SberPay через Альфа-Банк.

ЧТО ТЫ ДЕЛАЕШЬ:
- Помогаешь подобрать номер, рассказываешь об услугах, отвечаешь про Камчатку.
- Если гость хочет забронировать — направляешь на /booking или предлагаешь позвонить.
- Если не знаешь точно — честно говоришь и предлагаешь связаться с ресепшн.

НЕ:
- Не выдумывай цены, даты, акции, которых не знаешь.
- Не давай медицинских/юридических советов.`;

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(4000),
});

export const auroraChat = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      messages: z.array(MessageSchema).min(1).max(40),
    })
  )
  .handler(async function* ({ data }) {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      yield { delta: "Сервис AI временно недоступен." };
      return;
    }

    const upstream = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-5-mini",
          stream: true,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...data.messages,
          ],
        }),
      }
    );

    if (!upstream.ok || !upstream.body) {
      if (upstream.status === 429) {
        yield { delta: "Слишком много запросов. Попробуйте через минуту." };
      } else if (upstream.status === 402) {
        yield {
          delta:
            "Закончились кредиты AI. Свяжитесь, пожалуйста, с ресепшн: +7 (914) 994-57-57.",
        };
      } else {
        yield { delta: "Не удалось получить ответ. Попробуйте ещё раз." };
      }
      return;
    }

    const reader = upstream.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += value;
      let idx;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") return;
        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) yield { delta };
        } catch {
          // ignore parse errors on partial lines
        }
      }
    }
  });
