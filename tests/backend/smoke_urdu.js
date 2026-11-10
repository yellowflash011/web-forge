import process from 'node:process';

// Smoke test Urdu provider access
// Sample audio/text in Urdu: "میرا نام رشید ہے، میں الیکٹریشن ہوں اور اسلام آباد جی ٹین میں 5 سال سے کام کر رہا ہوں۔"
// Translates to: "My name is Rashid, I am an electrician and I have been working in Islamabad G-10 for 5 years."

const URDU_SAMPLE_TEXT = "میرا نام رشید ہے، میں الیکٹریشن ہوں اور اسلام آباد جی ٹین میں 5 سال سے کام کر رہا ہوں۔";

export async function testUrduProvider(apiKey = process.env.GEMINI_API_KEY) {
  if (!apiKey) {
    return {
      success: false,
      error: 'GEMINI_API_KEY is not set in environment or .env.local',
      status: 'BLOCKED_NO_CREDENTIALS',
    };
  }

  const prompt = `You are a parser for Roshan Rozgar, an artisan marketplace in Pakistan.
Extract structured worker profile information from the following Urdu text into JSON.
Return ONLY valid JSON matching this schema:
{
  "name": string or null,
  "tradeIds": string[] (subset of ["plumber", "electrician"]),
  "localityId": string or null (e.g. "g-10-islamabad", "f-10-islamabad", "i-9-islamabad"),
  "yearsExperience": number or null,
  "bio": string or null
}

Urdu text:
"${URDU_SAMPLE_TEXT}"`;

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
      return {
        success: false,
        error: `Provider returned HTTP ${response.status}: ${errText.slice(0, 150)}`,
        status: 'PROVIDER_ERROR',
      };
    }

    const data = await response.json();
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(rawContent);

    return {
      success: true,
      extracted: parsed,
      status: 'VERIFIED',
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      status: 'EXCEPTION',
    };
  }
}

// Allow standalone execution
if (process.argv[1]?.endsWith('smoke_urdu.js')) {
  console.log('[Smoke Test] Testing Urdu provider access...');
  testUrduProvider().then((res) => {
    if (res.success) {
      console.log('✓ Urdu extraction verified successfully:');
      console.log(JSON.stringify(res.extracted, null, 2));
    } else {
      console.warn(`! Urdu provider smoke test status: ${res.status}`);
      console.warn(`! Detail: ${res.error}`);
    }
  });
}
