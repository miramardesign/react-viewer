import { readFile, writeFile } from "fs/promises";
import path from "path";

const translateIfNeeded = async (sourceText) => {
  if (process.env.TRANSLATE === "true") {
    const endpoints = [
      "https://libretranslate.com/translate",
      "https://translate.argosopentech.com/translate",
      "https://libretranslate.de/translate",
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`Attempting remote translation: ${endpoint}`);
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            q: sourceText,
            source: "es",
            target: "en",
            format: "text",
          }),
        });

        if (!response.ok) {
          console.warn(`Endpoint ${endpoint} status ${response.status}`);
          continue;
        }

        const json = await response.json();
        if (json.translatedText) {
          return json.translatedText;
        }

        console.warn(`Endpoint ${endpoint} returned no translatedText`, json);
      } catch (err) {
        console.warn(`Remote translate failed for ${endpoint}, trying next:`, err.message);
      }
    }

    console.warn("All remote translation endpoints failed, trying Google Translate public endpoint...");

    try {
      const encoded = encodeURIComponent(sourceText);
      const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=es&tl=en&dt=t&q=${encoded}`;
      const googleResp = await fetch(googleUrl);
      if (googleResp.ok) {
        const googleJson = await googleResp.json();
        if (Array.isArray(googleJson) && Array.isArray(googleJson[0])) {
          const translated = googleJson[0].map((segment) => segment[0]).join("");
          if (translated) {
            return translated;
          }
        }
      } else {
        console.warn("Google public translate endpoint status", googleResp.status);
      }
    } catch (err) {
      console.warn("Google public translate endpoint failed:", err.message);
    }

    console.warn("Falling back to Spanish text as QuestionTextEn.");
  }

  // Fallback to Spanish if no translation is available.
  return sourceText;
};

const run = async () => {
  const sourcePath = path.join(process.cwd(), "json", "data.json");
  const targetPath = path.join(process.cwd(), "react-viewer", "public", "answers.json");

  console.log(`Loading data from ${sourcePath}`);
  const raw = await readFile(sourcePath, "utf8");
  const data = JSON.parse(raw);

  const ids = Object.keys(data);
  console.log(`Found ${ids.length} entries`);

  for (const id of ids) {
    const item = data[id];
    if (!item || typeof item !== "object") continue;

    if (process.env.TRANSLATE === "true") {
      item.QuestionTextEn = await translateIfNeeded(item.QuestionText);
    } else if (!item.QuestionTextEn) {
      item.QuestionTextEn = item.QuestionText;
    }

    // Also keep answers as they are. If you want answer-level translation, add a second field.
  }

  await writeFile(targetPath, JSON.stringify(data, null, 2), "utf8");
  console.log(`Updated file written to ${targetPath}`);
};

run().catch((err) => {
  console.error("Error in add-translations script:", err);
  process.exit(1);
});
