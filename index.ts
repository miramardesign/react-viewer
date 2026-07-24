import * as crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { load } from "cheerio";
import { Agent } from "undici";
import type { Element } from "domhandler";
import type {
  Answer,
  AnswerData,
  AnswerDataMap,
  QuestionForm,
} from "./types/AnswerTypes.js";
import { examPages } from "./const/urls.js";

type FetchOptions = RequestInit & {
  dispatcher?: Agent;
};

type ScanMode = "html" | "images" | "net";

const SCAN_DELAY_MS = 2_000;
const DEFAULT_NET_SCAN_COUNT = 100;
const SAVED_HTML_DIR = path.join(process.cwd(), "savedHtml");
const MASTER_JSON_PATH = path.join(process.cwd(), "json", "data.json");
const REACT_PUBLIC_DIR = path.join(process.cwd(), "react-viewer", "public");
const QUESTION_IMAGE_DIR = path.join("images", "preguntas");
const EXAM_ASSET_BASE_URL = `${examPages.origin}/examenlicencia/examenETLC/`;

const START_QUIZ_BODY =
  "id_sel=245&idcm_sel=245%7CAUTO%2C+UTILITARIO%2C+CAMIONETA+Y+CASA+RODANTE+MOTOR.+H%2F3.500+KG+TOTAL&uword=small&comenzar=Comenzar";

const commonHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "es-419,es;q=0.9,en;q=0.8",
  "Content-Type": "application/x-www-form-urlencoded",
};

// The Santa Fe exam site currently needs legacy TLS renegotiation enabled.
const legacyTlsDispatcher = new Agent({
  connect: {
    secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
  },
});

const wait = (ms = SCAN_DELAY_MS) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const parseMode = (): ScanMode => {
  const modeArg = process.argv.find((arg) => arg.startsWith("--mode="));
  const mode = modeArg?.split("=")[1];

  if (mode === "html" || mode === "images") {
    return mode;
  }

  return "net";
};

const parseScanCount = (): number => {
  const maxArg = process.argv.find((arg) => arg.startsWith("--max="));
  const parsed = Number(maxArg?.split("=")[1]);

  return Number.isFinite(parsed) && parsed > 0
    ? Math.floor(parsed)
    : DEFAULT_NET_SCAN_COUNT;
};

const extractFirstElement = (html: string, selector = "form"): string => {
  const $ = load(html);
  return $(selector).first().toString();
};

const isImageQuestion = (questionText: string): boolean =>
  questionText.includes("significa esta se");

const parseQuestionIdsFromFilename = (filename: string): number[] =>
  filename
    .replace(/^a-/, "")
    .replace(/\.htm$/i, "")
    .split("-")
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id));

const buildCacheFilename = (
  questionIds: number[],
  prefix: string,
  suffix: string
): string => {
  // Keep filenames compact enough for Windows path limits.
  return `${prefix}-${questionIds.join("-")}${suffix}`;
};

const getLocalQuestionImagePath = (imageSrc: string): string | null => {
  const match = imageSrc
    .replace(/\\/g, "/")
    .match(/images\/preguntas\/([^/?#]+\.(?:jpg|jpeg|png|gif|webp))/i);

  return match ? `images/preguntas/${match[1]}` : null;
};

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const cacheQuestionImage = async (imageSrc: string): Promise<string> => {
  const localImagePath = getLocalQuestionImagePath(imageSrc);

  if (!localImagePath) {
    return imageSrc;
  }

  const imageFileName = path.basename(localImagePath);
  const imagePath = path.join(
    REACT_PUBLIC_DIR,
    QUESTION_IMAGE_DIR,
    imageFileName
  );

  if (await fileExists(imagePath)) {
    return localImagePath;
  }

  const imageUrl = new URL(localImagePath, EXAM_ASSET_BASE_URL).toString();
  const response = await fetch(imageUrl, {
    headers: {
      ...commonHeaders,
      Referer: examPages.answerPg,
    },
    dispatcher: legacyTlsDispatcher,
  } as FetchOptions);

  if (!response.ok) {
    console.warn(`Image fetch failed with status ${response.status}: ${imageUrl}`);
    return localImagePath;
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer());

  await fs.mkdir(path.dirname(imagePath), { recursive: true });
  await fs.writeFile(imagePath, imageBuffer);

  console.log(`Cached question image: ${localImagePath}`);
  return localImagePath;
};

const readMasterJsonFile = async (): Promise<AnswerDataMap> => {
  const raw = await fs.readFile(MASTER_JSON_PATH, "utf8");
  return JSON.parse(raw) as AnswerDataMap;
};

const cacheImagesFromMasterJson = async (): Promise<void> => {
  let data: AnswerDataMap;

  try {
    data = await readMasterJsonFile();
  } catch (err) {
    console.error("Could not read json/data.json:", err);
    return;
  }

  const imagePaths = [
    ...new Set(
      Object.values(data)
        .map((answerData) => getLocalQuestionImagePath(answerData.QuestionText))
        .filter((imagePath): imagePath is string => Boolean(imagePath))
    ),
  ];

  console.log(`Found ${imagePaths.length} unique question images in data.json.`);

  let cachedCount = 0;
  for (const imagePath of imagePaths) {
    await cacheQuestionImage(imagePath);
    cachedCount++;
  }

  console.log(`Finished image cache sync. Checked ${cachedCount} images.`);
};

const getQuestionFormParamsFromHtml = (formHtml: string): QuestionForm => {
  const $ = load(formHtml);
  const questionIds: number[] = [];
  const answersByQuestionId: Record<number, string> = {};

  $(".formulation").each((_, el) => {
    const rawQuestionId = $(el)
      .find('input[type="hidden"][name="id_preg[]"]')
      .val();
    const firstAnswerValue = $(el).find('input[type="radio"]').first().val();
    const questionId = Number(rawQuestionId);

    if (Number.isFinite(questionId)) {
      questionIds.push(questionId);
    }

    // The answer page only renders after submitting something for each question.
    // We send the first radio value as a harmless placeholder, then parse the
    // correct answer from the result page.
    if (Number.isFinite(questionId) && typeof firstAnswerValue === "string") {
      answersByQuestionId[questionId] = firstAnswerValue;
    }
  });

  return {
    nombre_cuest: "Cuestionario para Clase B1",
    id_preg: questionIds,
    respuestas: answersByQuestionId,
    enviar: "Enviar",
  };
};

const buildAnswerPostBody = (questionFormParams: QuestionForm): string => {
  const body = new URLSearchParams();

  body.set("nombre_cuest", questionFormParams.nombre_cuest);

  for (const questionId of questionFormParams.id_preg) {
    body.append("id_preg[]", questionId.toString());
  }

  for (const [questionId, answerId] of Object.entries(
    questionFormParams.respuestas
  )) {
    body.set(questionId, answerId);
  }

  body.set("enviar", questionFormParams.enviar);

  return body.toString();
};

const fetchQuestionPage = async (url: string): Promise<void> => {
  const fetchOptions: FetchOptions = {
    method: "POST",
    headers: {
      ...commonHeaders,
      Origin: examPages.origin,
      Referer: examPages.listPg,
    },
    body: START_QUIZ_BODY,
    dispatcher: legacyTlsDispatcher,
  };

  const response = await fetch(url, fetchOptions);
  console.log(`Fetched question page. Status: ${response.status}`);

  if (!response.ok) {
    console.error(`Question fetch failed with status ${response.status}.`);
    return;
  }

  const html = await response.text();
  const cookies = response.headers.getSetCookie().join("; ");

  await wait();
  await processQuestionPage(html, cookies);
};

const scanNet = async (scanCount: number): Promise<void> => {
  for (let i = 0; i < scanCount; i++) {
    console.log(`Network scan ${i + 1}/${scanCount}`);
    await fetchQuestionPage(examPages.questionPg);
    await wait();
  }
};

const scanSavedHtmlFiles = async (): Promise<void> => {
  let files: string[] = [];

  try {
    files = await fs.readdir(SAVED_HTML_DIR);
  } catch (err) {
    if (
      typeof err === "object" &&
      err &&
      "code" in err &&
      err.code === "ENOENT"
    ) {
      console.warn(
        "No savedHtml directory found. Run --mode=net to fetch fresh scans and cache new answer pages."
      );
      return;
    }

    console.error("Could not read ./savedHtml directory:", err);
    return;
  }

  // Cached answer files are named with the IDs they contain, for example:
  // a-1006-1145-1008.htm
  const htmlFiles = files.filter((file) => /^a-(\d+-)*\d+\.htm$/i.test(file));
  console.log(`Found ${htmlFiles.length} saved answer files.`);

  for (const file of htmlFiles) {
    console.log(`Scanning cached HTML: ${file}`);

    const filePath = path.join(SAVED_HTML_DIR, file);
    const content = await fs.readFile(filePath, "utf8");
    const questionIds = parseQuestionIdsFromFilename(file);

    const questionFormParams: QuestionForm = {
      nombre_cuest: "Cached scan",
      id_preg: questionIds,
      respuestas: {
        1: "mock-1",
      },
      enviar: "enviar",
    };

    await processAnswerPage(
      extractFirstElement(content, ".form"),
      questionFormParams
    );
  }

  console.log("Finished scanning saved HTML files.");
};

const processQuestionPage = async (
  html: string,
  cookies: string
): Promise<void> => {
  const formHtml = extractFirstElement(html, "form");

  if (!formHtml) {
    console.warn("No question form found.");
    return;
  }

  const questionFormParams = getQuestionFormParamsFromHtml(formHtml);

  await wait();
  await submitQuestionForm(examPages.answerPg, questionFormParams, cookies);
};

const submitQuestionForm = async (
  answerPageUrl: string,
  questionFormParams: QuestionForm,
  cookies: string
): Promise<void> => {
  const fetchOptions: FetchOptions = {
    method: "POST",
    headers: {
      ...commonHeaders,
      Origin: examPages.origin,
      Referer: examPages.questionPg,
      Cookie: cookies,
    },
    body: buildAnswerPostBody(questionFormParams),
    dispatcher: legacyTlsDispatcher,
  };

  const response = await fetch(answerPageUrl, fetchOptions);
  console.log(`Fetched answer page. Status: ${response.status}`);

  if (!response.ok) {
    console.error(`Answer fetch failed with status ${response.status}.`);
    return;
  }

  const html = await response.text();
  await processAnswerPage(
    extractFirstElement(html, ".form"),
    questionFormParams,
    true
  );
};

const getQuestionText = (
  $: ReturnType<typeof load>,
  element: Element
): string => {
  const text =
    $(element).find(".qtext p").text().trim() ||
    $(element).find(".qtext").text().trim();

  if (!isImageQuestion(text)) {
    return text;
  }

  // Image questions use generic text; the useful question payload is the image src.
  return $(element).find(".qtext img").attr("src") ?? text;
};

const getCorrectAnswerText = (
  $: ReturnType<typeof load>,
  element: Element
): string =>
  $(element)
    .nextAll(".outcome_correcto, .outcome")
    .first()
    .find(".rightanswer")
    .text()
    .replace(/Respuesta correcta\:/i, "")
    .trim();

const parseAnswerRows = async (
  answerFormHtml: string,
  questionFormParams: QuestionForm,
  shouldCacheImages: boolean
): Promise<AnswerDataMap> => {
  const $ = load(answerFormHtml);
  const answerDataMap: AnswerDataMap = {};

  const formulations = $(".formulation").toArray();

  for (const [index, el] of formulations.entries()) {
    const questionId = questionFormParams.id_preg[index];

    if (!questionId) {
      continue;
    }

    const questionText = shouldCacheImages
      ? await cacheQuestionImage(getQuestionText($, el))
      : getQuestionText($, el);
    const correctAnswerText = getCorrectAnswerText($, el);
    let correctAnswerId = -1;
    const answers: Answer[] = [];

    $(el)
      .find(".answer .r0, .answer .r1")
      .each((_, row) => {
        const rawAnswerId = $(row).find("input").val();
        const answerId = rawAnswerId ? Number(rawAnswerId) : -1;
        const answerText = $(row).find("label").text().trim();

        if (answerText.includes(correctAnswerText)) {
          correctAnswerId = answerId;
        }

        answers.push({
          AnswerId: answerId,
          AnswerText: answerText,
        });
      });

    answerDataMap[questionId] = {
      QuestionText: questionText,
      CorrectAnswerId: correctAnswerId,
      Answers: answers,
    };
  }

  return answerDataMap;
};

const processAnswerPage = async (
  answerFormHtml: string,
  questionFormParams: QuestionForm,
  shouldCacheHtml = false
): Promise<void> => {
  if (!answerFormHtml) {
    console.warn("No answer form found.");
    return;
  }

  const answerData = await parseAnswerRows(
    answerFormHtml,
    questionFormParams,
    shouldCacheHtml
  );
  const additions = await appendMasterJsonFile(answerData);

  // Network scans cache the answer HTML even if data.json already had those IDs.
  // That lets --mode=html rebuild json/data.json later without touching the site.
  if (shouldCacheHtml || additions > 0) {
    const filename = buildCacheFilename(questionFormParams.id_preg, "a", ".htm");
    await writeSavedHtml(answerFormHtml, filename);
  }
};

const writeSavedHtml = async (html: string, filename: string): Promise<void> => {
  await fs.mkdir(SAVED_HTML_DIR, { recursive: true });

  const filePath = path.join(SAVED_HTML_DIR, filename);
  await fs.writeFile(filePath, html, "utf8");

  console.log(`Saved answer form cache to ${filePath}`);
};

const appendMasterJsonFile = async (
  answerData: AnswerDataMap
): Promise<number> => {
  let existing: AnswerDataMap = {};

  try {
    existing = await readMasterJsonFile();
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err &&
      "code" in err &&
      err.code === "ENOENT"
    ) {
      console.warn("data.json not found; creating a new one.");
    } else {
      throw err;
    }
  }

  let addedCount = 0;
  const addedIds: string[] = [];

  for (const [questionId, data] of Object.entries(answerData)) {
    if (existing[questionId]) {
      continue;
    }

    existing[questionId] = data;
    addedCount++;
    addedIds.push(questionId);
  }

  await fs.mkdir(path.dirname(MASTER_JSON_PATH), { recursive: true });
  await fs.writeFile(MASTER_JSON_PATH, JSON.stringify(existing, null, 2), "utf8");

  console.log(
    `Saved data.json. Added ${addedCount} new entries. Total entries: ${
      Object.keys(existing).length
    }${addedIds.length ? `. New IDs: ${addedIds.join(", ")}` : ""}`
  );

  return addedCount;
};

const main = async (): Promise<void> => {
  const mode = parseMode();
  const scanCount = parseScanCount();
  console.log(`Scan mode: ${mode}`);

  if (mode === "html") {
    await scanSavedHtmlFiles();
  } else if (mode === "images") {
    await cacheImagesFromMasterJson();
  } else {
    await scanNet(scanCount);
  }
};

main().catch((err) => {
  console.error("Scan failed:", err);
  process.exitCode = 1;
});
