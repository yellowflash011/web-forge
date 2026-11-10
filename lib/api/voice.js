import {
  ERROR_CODES,
  createError,
  createSuccess,
  SUPPORTED_TRADES,
  SUPPORTED_LOCALITIES,
} from './domain.js';

export async function extractVoice({ audioRef, purpose, locale = 'ur' }) {
  if (!audioRef) {
    return createError(ERROR_CODES.VALIDATION_ERROR, 'audioRef is required for voice extraction');
  }

  if (!['worker_profile', 'job_request'].includes(purpose)) {
    return createError(ERROR_CODES.VALIDATION_ERROR, `Invalid purpose: ${purpose}`);
  }

  const apiKey = typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : null;
  if (!apiKey) {
    return createError(
      ERROR_CODES.AI_UNAVAILABLE,
      'AI extraction provider is unavailable. GEMINI_API_KEY is not configured.',
      false
    );
  }

  // System prompt tailored for Pakistani artisan marketplace
  const isWorkerProfile = purpose === 'worker_profile';
  const schemaDescription = isWorkerProfile
    ? `{
        "name": string or null,
        "tradeIds": array of strings from ["plumber", "electrician"],
        "localityId": string from ["g-10-islamabad", "f-10-islamabad", "i-9-islamabad"] or null,
        "serviceAreaIds": array of strings from ["g-10-islamabad", "f-10-islamabad", "i-9-islamabad"],
        "yearsExperience": integer >= 0 or null,
        "bio": string or null
      }`
    : `{
        "tradeId": string from ["plumber", "electrician"] or null,
        "localityId": string from ["g-10-islamabad", "f-10-islamabad", "i-9-islamabad"] or null,
        "task": string or null
      }`;

  const prompt = `You are an AI assistant for Roshan Rozgar, an artisan marketplace in Islamabad, Pakistan.
Analyze the following user input (in Urdu, Roman Urdu, or English) representing audio reference "${audioRef}".
Extract structured fields into JSON matching this schema:
${schemaDescription}

Also provide:
- "transcript": user speech transcription in Urdu/English
- "missingFields": array of field names that could not be determined
- "ambiguities": array of specific questions/ambiguities requiring user confirmation

DO NOT invent values. If a locality or trade is ambiguous, put it in ambiguities and mark the field null.
Never suggest prices, availability, or ratings. Output strictly valid JSON.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return createError(
        ERROR_CODES.AI_UNAVAILABLE,
        `AI extraction service error (HTTP ${response.status}): ${errText.slice(0, 100)}`,
        true
      );
    }

    const payload = await response.json();
    const rawText = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return createError(ERROR_CODES.AI_UNAVAILABLE, 'Empty response received from AI model');
    }

    const parsed = JSON.parse(rawText);

    // Clean and validate suggestions strictly against allowed enums
    const cleanFields = {};
    const missing = Array.isArray(parsed.missingFields) ? [...parsed.missingFields] : [];
    const ambiguities = Array.isArray(parsed.ambiguities) ? [...parsed.ambiguities] : [];

    if (isWorkerProfile) {
      cleanFields.name = typeof parsed.name === 'string' ? parsed.name.trim() : null;
      if (!cleanFields.name) missing.push('name');

      if (Array.isArray(parsed.tradeIds)) {
        cleanFields.tradeIds = parsed.tradeIds.filter((t) => SUPPORTED_TRADES.includes(t));
      } else {
        cleanFields.tradeIds = [];
      }
      if (cleanFields.tradeIds.length === 0) missing.push('tradeIds');

      if (SUPPORTED_LOCALITIES.includes(parsed.localityId)) {
        cleanFields.localityId = parsed.localityId;
      } else {
        cleanFields.localityId = null;
        missing.push('localityId');
      }

      if (Array.isArray(parsed.serviceAreaIds)) {
        cleanFields.serviceAreaIds = parsed.serviceAreaIds.filter((a) => SUPPORTED_LOCALITIES.includes(a));
      } else {
        cleanFields.serviceAreaIds = cleanFields.localityId ? [cleanFields.localityId] : [];
      }

      cleanFields.yearsExperience =
        typeof parsed.yearsExperience === 'number' && parsed.yearsExperience >= 0
          ? Math.round(parsed.yearsExperience)
          : null;

      cleanFields.bio = typeof parsed.bio === 'string' ? parsed.bio.trim() : null;
    } else {
      cleanFields.tradeId = SUPPORTED_TRADES.includes(parsed.tradeId) ? parsed.tradeId : null;
      if (!cleanFields.tradeId) missing.push('tradeId');

      cleanFields.localityId = SUPPORTED_LOCALITIES.includes(parsed.localityId) ? parsed.localityId : null;
      if (!cleanFields.localityId) missing.push('localityId');

      cleanFields.task = typeof parsed.task === 'string' ? parsed.task.trim() : null;
      if (!cleanFields.task) missing.push('task');
    }

    return createSuccess({
      transcript: parsed.transcript || `Recorded voice memo (${audioRef})`,
      fields: cleanFields,
      missingFields: Array.from(new Set(missing)),
      ambiguities: Array.from(new Set(ambiguities)),
    });
  } catch (err) {
    return createError(ERROR_CODES.AI_UNAVAILABLE, `Voice extraction failed: ${err.message}`, true);
  }
}
