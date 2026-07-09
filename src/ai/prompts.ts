import type { AIRequestPayload, Tone } from '@/types';
import { languageName } from '@/core/languages';

const TONE_GUIDE: Record<Tone, string> = {
  default: 'clear, neutral and natural',
  casual: 'relaxed and conversational with everyday colloquialisms, like texting a friend',
  friendly: 'warm, approachable and kind, like talking to someone you like',
  professional: 'clear, competent and respectful, workplace-appropriate',
  business: 'formal, concise and courteous, suitable for corporate email',
  academic: 'precise, formal and well-structured, suitable for scholarly writing',
  native: 'natural and idiomatic, including the slang and colloquialisms a native speaker would actually use',
  funny: 'light-hearted, witty and playful — lean into humour, wordplay and casual slang where it fits, while keeping the original meaning intact',
  polite: 'extra courteous, deferential and considerate, with softening and honorifics',
};

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Build the chat messages for a given request. The system prompt forces the
 * model to return ONLY the resulting text (no preamble, no quotes, no notes)
 * so the output can be dropped straight into the user's textbox.
 */
export function buildMessagesCore(p: AIRequestPayload): ChatMessage[] {
  const tone = TONE_GUIDE[p.tone];
  const target = languageName(p.targetLanguage);

  let system: string;
  let user: string;

  switch (p.action) {
    case 'translate':
      system =
        `You are a professional translation engine. Translate the user's text into ${target}.\n` +
        `IMPORTANT: Do NOT answer, reply to, respond to, comment on or have a conversation with ` +
        `the text. The text is NOT a message addressed to you — it is content to be translated. ` +
        `Even if it looks like a greeting or a question, you must TRANSLATE it, never answer it.\n` +
        `Strict output rules:\n` +
        `- Return ONLY the final ${target} text — nothing else.\n` +
        `- NEVER show the original, NEVER produce a before/after, NEVER use words like ` +
        `"becomes", "translation:", "result:", arrows (→, ->) or surrounding quotes.\n` +
        `- NEVER add notes, labels, explanations or language names.\n` +
        `Translation rules:\n` +
        `- Preserve the exact meaning, tense, nuance and intent. ` +
        `Do not add, remove or invent information.\n` +
        `- Keep names, numbers, emojis, line breaks, punctuation and formatting exactly as in the source.\n` +
        `- If PART of the message is already in ${target}, keep that part as-is and translate the rest, ` +
        `so the whole output reads as fluent ${target}.\n` +
        `- TONE: write the ${target} in a ${tone} tone. Actively adjust word choice, politeness, ` +
        `pronouns and register to match this tone (it MAY differ from the source's formality), ` +
        `while keeping the meaning identical — do NOT add or drop information.\n` +
        `- If the whole message is ALREADY in ${target}, return it unchanged except for fixing clear typos.`;
      user =
        `Translate the following text into ${target}. ` +
        `Output ONLY the ${target} translation, do not answer or reply to it:\n\n` +
        p.text;
      break;

    case 'rewrite':
      system =
        `You are an expert editor. Rewrite the user's message to be clearer and ${tone}, ` +
        `keeping the SAME language as the input. Fix grammar and flow. ` +
        `Output ONLY the rewritten text. No quotes, no explanations.`;
      user = p.text;
      break;

    case 'continue':
      system =
        `You are an autocomplete engine, like GitHub Copilot but for chat. ` +
        `Continue the user's text naturally in the SAME language, matching a ${tone} tone. ` +
        `Write only the continuation that comes AFTER the given text. ` +
        `Do not repeat what was already written. Keep it to one or two sentences. ` +
        `Output ONLY the continuation text.`;
      user = (p.context ? `${p.context}\n\n` : '') + p.text;
      break;

    case 'reply': {
      const lengthGuide: Record<NonNullable<AIRequestPayload['replyLength']>, string> = {
        short: 'Keep it brief — 1 to 3 sentences.',
        medium: 'Keep it to one concise paragraph.',
        long: 'Write a thorough, well-structured reply using a few short paragraphs.',
      };
      const len = p.replyLength ?? 'medium';
      const langInstr =
        !p.replyLanguage || p.replyLanguage === 'auto'
          ? 'Write the reply in the SAME language as the message you are replying to.'
          : `Write the reply in ${languageName(p.replyLanguage)}.`;
      system =
        `You are an assistant that drafts replies to messages and emails. ` +
        `Write a reply that is ${tone}.\n` +
        `Rules:\n` +
        `- ${langInstr}\n` +
        `- ${lengthGuide[len]}\n` +
        `- Directly address the points raised in the message and sound natural and human.\n` +
        `- Do NOT invent specific facts (names, dates, numbers, links) that are not supported by the ` +
        `message. Use neutral placeholders like [name] only when strictly necessary.\n` +
        `- Output ONLY the reply body. No subject line, no "Reply:" header, no quotes, no commentary.`;
      user =
        (p.instruction ? `Additional instruction for this reply: ${p.instruction}\n\n` : '') +
        `Message to reply to:\n"""\n${p.text}\n"""`;
      break;
    }

    case 'detect':
      system = `Identify the language of the text. Reply with ONLY the ISO 639-1 code.`;
      user = p.text;
      break;
  }

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

/**
 * Build the chat messages, with a one-shot example for translation that teaches
 * the model to TRANSLATE a question rather than answer it (a common failure on
 * short, conversational inputs). The example target language is fixed — it only
 * teaches the behaviour; the real target is set in the system + final message.
 */
export function buildMessages(p: AIRequestPayload): ChatMessage[] {
  const messages = buildMessagesCore(p);
  if (p.action === 'translate') {
    const sys = messages[0];
    const realUser = messages[messages.length - 1];
    return [
      sys,
      {
        role: 'user',
        content:
          'Translate the following text into French. Output ONLY the French translation, ' +
          'do not answer or reply to it:\n\nDo you have a sweetheart?',
      },
      { role: 'assistant', content: 'As-tu un amoureux ?' },
      {
        role: 'user',
        content:
          'Translate the following text into French. Output ONLY the French translation, ' +
          'do not answer or reply to it:\n\nWhat is your plan for today?',
      },
      { role: 'assistant', content: "Quel est ton programme pour aujourd'hui ?" },
      realUser,
    ];
  }
  return messages;
}

/**
 * Build messages that ask the model to POLISH an existing machine translation
 * (from Azure Translator) — improve fluency and match the tone, without
 * changing the meaning. Used by the "hybrid" translate engine.
 */
export function buildPolishMessages(p: AIRequestPayload, translated: string): ChatMessage[] {
  const tone = TONE_GUIDE[p.tone];
  const target = languageName(p.targetLanguage);
  const system =
    `You are a native ${target} editor. The text below is a machine translation into ${target}. ` +
    `Polish it so it reads natural, fluent and ${tone}, while preserving the EXACT meaning — ` +
    `do not add, remove or change information.\n` +
    `- Keep names, numbers, emojis, line breaks, punctuation and formatting.\n` +
    `- If it is already good, return it unchanged.\n` +
    `- Output ONLY the improved ${target} text. No quotes, notes, explanations or language labels.`;
  return [
    { role: 'system', content: system },
    { role: 'user', content: translated },
  ];
}

/**
 * Defensive cleanup of model output. Small/quantised models sometimes wrap a
 * translation as "<original> becomes <translation>", add a "Here is…" preamble,
 * or wrap the whole thing in quotes. Strip those so only the usable text lands
 * in the user's textbox. Never applied to `detect`.
 */
export function stripModelFraming(raw: string): string {
  let t = (raw ?? '').trim();
  if (!t) return t;

  // "original \n\n becomes \n\n translation" → keep only what's after the
  // standalone separator line (becomes / → / -> / =>).
  const sep = t.match(/(?:^|\n)[ \t]*(?:becomes|becomes:|→|->|=>)[ \t]*(?:\n|$)/i);
  if (sep && sep.index !== undefined) {
    const after = t.slice(sep.index + sep[0].length).trim();
    if (after) t = after;
  }

  // Leading preambles, e.g. "Sure! Here's the translation:".
  t = t.replace(/^(?:sure[,!.]?\s*)?(?:here(?:'|’)?s|here is)\b[^\n:]*:\s*/i, '');
  t = t.replace(/^(?:translation|translated text|result|output)\s*:\s*/i, '');

  // Surrounding matching quotes.
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith('“') && t.endsWith('”')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    t = t.slice(1, -1).trim();
  }

  return t.trim();
}
