import { readFile, writeFile } from "fs/promises";
import path from "path";

const sourcePath = path.join(process.cwd(), "json", "data.json");
const targetPath = path.join(process.cwd(), "react-viewer", "public", "answers.json");

console.log(`Loading data from ${sourcePath}`);
const raw = await readFile(sourcePath, "utf8");
const data = JSON.parse(raw);

const keys = Object.keys(data);
console.log(`Found ${keys.length} entries`);

for (let i = 0; i < keys.length; i++) {
  const id = keys[i];
  const item = data[id];

  if (!item || typeof item !== "object") continue;

  const question = item.QuestionText;
  const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=es&tl=en&dt=t&q=${encodeURIComponent(question)}`;

  try {
    const response = await fetch(googleUrl);
    if (!response.ok) {
      console.warn(`Failed to translate id=${id}, status=${response.status}, using Spanish fallback`);
      item.QuestionTextEn = question;
      continue;
    }
    const json = await response.json();
    if (Array.isArray(json) && Array.isArray(json[0])) {
      item.QuestionTextEn = json[0].map((segment) => segment[0]).join("") || question;
    } else {
      item.QuestionTextEn = question;
    }
  } catch (err) {
    console.warn(`Error translating id=${id}: ${err.message}, using Spanish fallback`);
    item.QuestionTextEn = question;
  }

  if ((i + 1) % 20 === 0) {
    console.log(`Translated ${i + 1}/${keys.length}`);
  }

  await new Promise((resolve) => setTimeout(resolve, 150));
}

await writeFile(targetPath, JSON.stringify(data, null, 2), "utf8");
console.log(`Updated file written to ${targetPath}`);
