import * as crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { load } from "cheerio";
import type {
  Answer,
  AnswerData,
  AnswerDataMap,
  QuestionForm,
} from "./types/AnswerTypes.js";
import { examPages } from "./const/urls.js";

const getQuestions = async (url: string) => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",

      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "es-419,es;q=0.9,en;q=0.8",
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: "https://www.santafe.gob.ar",
      Referer:
        "https://www.santafe.gob.ar/examenlicencia/examenETLC/listarCuestionarios.php",
    },
    body: "id_sel=245&idcm_sel=245%7CAUTO%2C+UTILITARIO%2C+CAMIONETA+Y+CASA+RODANTE+MOTOR.+H%2F3.500+KG+TOTAL&uword=small&comenzar=Comenzar",
  });

  const text = await response.text();

  // ⬅️ Capture cookies so i dont spam the same session.
  const cookies = response.headers.getSetCookie().join("; ");
  // console.log("Cookies:", cookies);

  await new Promise((resolve) => setTimeout(resolve, 2000));
  processQuestionsFile(text, cookies);
};

//kicks the whole thing off, aka init.

const arg = process.argv.find((a) => a.startsWith("--mode="));
const mode = arg ? arg.split("=")[1] : undefined;

const runRequests = () => {
  getQuestions(examPages.questionPg);
};

const getIdPregFromFilename = (filename: string): number[] => {
  // Remove prefix and extension
  const cleaned = filename
    .replace(/^a-/, "") // remove leading "a-"
    .replace(/\.htm$/i, ""); // remove trailing ".htm"

  // Split → string[] → convert to number[]
  return cleaned
    .split("-")
    .map((n) => Number(n))
    .filter((n) => !isNaN(n)); // safety: drop any non-numbers
};

//get from saved thml backup.
const scanAnswerFiles = async () => {
  const dir = path.join(process.cwd(), "savedHtml");

  let files: string[] = [];

  try {
    files = await fs.readdir(dir);
  } catch (err) {
    console.error("❌ Could not read ./savedHtml directory:", err);
    return;
  }

  // Match files like a-1006-1145-1008-1170-...-1559.htm
  const pattern = /^a-(\d+-)*\d+\.htm$/i;
  const htmlFiles = files.filter((f) => pattern.test(f));

  console.log(`📁 Found ${htmlFiles.length} files:`);

  for (const file of htmlFiles) {
    console.log("➡ scanning:", file);

    const filePath = path.join(dir, file);
    const content = await fs.readFile(filePath, "utf8");

    const idPreg = getIdPregFromFilename(file);
    console.log("idPregfggggggggg", idPreg);

    const questionFormParams: QuestionForm = {
      nombre_cuest: "test?",
      id_preg: idPreg,
      respuestas: {
        1: "mock-1",
      } as Record<number, string>,
      enviar: "enviar",
    };

    const justForm = getElement(content, ".form");

    await processAnswersFile(justForm, questionFormParams);

   // break; // ← stops after first file
  }

  console.log("✔ Finished scanning saved HTML files.");
};

console.log("modeeeeeeeeeeeeeeeeeeeeeeeeee", mode);

if (mode === "scan") {
  scanAnswerFiles();
} else {
  runRequests();
}

const md5 = (input: string) => {
  return crypto.createHash("md5").update(input).digest("hex");
};

const getElement = (htmlRes: string, selector = "form"): string => {
  const $ = load(htmlRes);

  const formHtml = $(selector).first().toString();
  return formHtml;
};

const getQuestionFormParamsFromHtml = (formHtml: string): QuestionForm => {
  let formArr: any = [];

  const $ = load(formHtml);

  let id_preg_arr: number[] = [];
  const respuestas_data: Record<number, string> = {};

  $(".formulation").each((_, el) => {
    const id_preg = $(el)
      .find('input[type="hidden"][name="id_preg[]"]')
      .val() as string | undefined;
    const firstRadioValue = $(el).find('input[type="radio"]').first().val() as
      | string
      | undefined;
    const questionText = $(el).find(".qtext p").text().trim();

    formArr.push({ id_preg, firstRadioValue, questionText });

    //console.log({ id_preg, firstRadioValue, questionText });

    if (id_preg && !isNaN(parseInt(id_preg, 10))) {
      id_preg_arr.push(parseInt(id_preg, 10));
    }

    if (id_preg && firstRadioValue) {
      respuestas_data[parseInt(id_preg, 10)] = firstRadioValue;
    }
  });

  const params: QuestionForm = {
    nombre_cuest: "Cuestionario para Clase B1",
    id_preg: id_preg_arr,

    //needs 20 TODO
    respuestas: respuestas_data,
    enviar: "Enviar",
  };

  return params;
};

const processQuestionsFile = async (htmlRes: string, cookies: string) => {
  console.log("process questions file===============");
  const $ = load(htmlRes);

  const formHtml = getElement(htmlRes, "form");

  const questionFormParams: QuestionForm =
    getQuestionFormParamsFromHtml(formHtml);

  if (!formHtml) {
    console.warn("⚠️ No <form> element found!");
  } else {
    //worry about spamming them.
    await new Promise((resolve) => setTimeout(resolve, 2000));
    // CALLs next step!====
    postTest(examPages.answerPg, questionFormParams, cookies);
  }
};

const writeFileSimple = async (htmlRes: string, fileName: string) => {
  if (!htmlRes) {
    console.warn("⚠️ No <html> element found!", htmlRes);
  } else {
    const dir = path.join(process.cwd(), "savedHtml");
    await fs.mkdir(dir, { recursive: true });

    const filePath = path.join(dir, fileName);
    await fs.writeFile(filePath, htmlRes, "utf8");

    console.log(`✅ Saved form fragment to ${filePath}`);
  }
};

/** passsed in cookies from 1st respons so that its not always the same session. */
const postTest = async (
  answerPgUrl: string,
  questionFormParams: QuestionForm,
  cookies: string
) => {
  console.warn("post tests4 =============called");

  // Define your POST parameters as a JSON object

  // Helper to turn that JSON into `application/x-www-form-urlencoded`
  function toFormBody(p: typeof questionFormParams): string {
    const pairs: string[] = [];

    pairs.push(`nombre_cuest=${encodeURIComponent(p.nombre_cuest)}`);

    for (const id of p.id_preg) {
      pairs.push(`id_preg%5B%5D=${encodeURIComponent(id.toString())}`);
    }

    for (const [id, value] of Object.entries(p.respuestas)) {
      pairs.push(`${encodeURIComponent(id)}=${encodeURIComponent(value)}`);
    }

    pairs.push(`enviar=${encodeURIComponent(p.enviar)}`);

    return pairs.join("&");
  }
  const body = toFormBody(questionFormParams);

  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",

    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-419,es;q=0.9,en;q=0.8",
    "Content-Type": "application/x-www-form-urlencoded",
    Origin: "https://www.santafe.gob.ar",
    Referer:
      "https://www.santafe.gob.ar/examenlicencia/examenETLC/cuestionario.php",

    //should probably refresh this session cookie...
    // Cookie:
    //   "MoodleSession=cso012di66jrcdfbhndr6kogr1; _pk_id.7.38fb=2b2a0693b7d87bd7.1762704238.4.1762883179.1762882059.; eZSESSID=3n8fk9flu2ofq8qg53u5qn0g87; eZSESSIDweb=3r1ab6dm78137ohfj3ic4s9tb3; _gcl_au=1.1.1717133776.1762830500; _ga_XRDJD94NN8=GS2.1.s1762830500$o1$g0$t1762830511$j49$l0$h0; _ga=GA1.1.1616098780.1762830500; _ga_V7QRESCZPX=GS2.1.s1762830500$o1$g0$t1762830511$j49$l0$h0; _fbp=fb.2.1762830501375.799563771277620418; EXAMENLICENCIApwww=.examenlicencia-pwww3; _pk_ses.7.38fb=*",
    Cookie: cookies,
  };

  const response = await fetch(answerPgUrl, {
    method: "POST",
    headers,
    body,
  });

  const htmlRes = await response.text();
  const justForm = getElement(htmlRes, ".form");

  const mdfFileName = getFileNameFromFormParms(
    questionFormParams.id_preg,
    "a",
    ".htm"
  );
  writeFileSimple(justForm, mdfFileName);

  processAnswersFile(justForm, questionFormParams);
};

//parse the answer html iterate over elements of the psuedo form it has matching up the ids
//of the questions and answers such that i can make a master json object with the ids as keys
const getAnswerDataMap = (
  justAnswerForm: string,
  questionFormParams: QuestionForm
): AnswerDataMap => {
  const mockAnswerData = processAnswerRows(justAnswerForm, questionFormParams);

  // return answerDataArr;
  return mockAnswerData;
};

const processAnswerRows = (
  justAnswerForm: string,
  questionFormParams: QuestionForm
): AnswerDataMap => {
  const $ = load(justAnswerForm);

  //const answerDataMap = {};
  const answerDataMap: Record<string, AnswerData> = {};
  $(".formulation").each((i, el) => {
    const questionText =
      $(el).find(".qtext p").text().trim() ||
      $(el).find(".qtext").text().trim();

    const rightAnswer = $(el)
      .nextAll(".outcome_correcto, .outcome")
      .first()
      .find(".rightanswer")
      .text()
      .replace(/^Respuesta correcta:\s*/i, "")
      .trim();

    const questionId = questionFormParams.id_preg[i];

    const answerArr: Answer[] = [];
    $(el)
      .find(".answer .r0")
      .each((j, r0) => {
        const rawId = $(r0).find("input").val();
        const answerId = rawId ? Number(rawId) : -1; // fallback if undefined

        const answerText = $(r0).find("label").text();
        const answerData: Answer = {
          AnswerId: answerId,
          AnswerText: answerText,
        };

        answerArr.push(answerData);
        console.warn(
          "found answeer.00000.",
          answerText,
          "id============",
          answerId
        );
      });

    const answerData: AnswerData = {
      QuestionText: questionText,
      CorrectAnswer: rightAnswer,
      Answers: answerArr,
    };
    if (questionId) {
      answerDataMap[questionId] = answerData;
    }
  });

  // console.log("anserdatamap", JSON.stringify(answerDataMap ) );

  return answerDataMap;
};

const processAnswersFile = async (
  justForm: string,
  questionFormParams: QuestionForm
) => {
  const answerData: AnswerDataMap = getAnswerDataMap(
    justForm,
    questionFormParams
  );
  await appendMasterJsonFile(answerData);
};

const appendMasterJsonFile = async (answerData: AnswerDataMap) => {
  const filePath = path.join(process.cwd(), "json", "data.json");

  // 1. Load existing file
  let existing: AnswerDataMap = {};

  try {
    const raw = await fs.readFile(filePath, "utf8");
    existing = JSON.parse(raw);
  } catch (err: any) {
    if (err.code === "ENOENT") {
      console.warn("data.json not found — creating a new one.");
    } else {
      throw err;
    }
  }

  // 2. Merge only *new* IDs
  let addedCount = 0;

  const entriesAdded: string[] = [];
  for (const [id, data] of Object.entries(answerData)) {
    if (!existing[id]) {
      existing[id] = data;
      addedCount++;
      entriesAdded.push(id);
    }
  }

  // 3. Save back to file
  await fs.writeFile(filePath, JSON.stringify(existing, null, 2), "utf8");

  const totalCount = Object.keys(existing).length;

  console.log(
    `✔ Saved. Added ${addedCount} new entries. Total entries: ${totalCount}`,
    entriesAdded.join(",")
  );
};

const getFileNameFromFormParms = (
  questionsArr: number[],
  prefix: string,
  suffix: string
): string => {
  //is about 154 chars at 250 ename too long happens, including full win path c://
  const listIds = questionsArr.join("-");
  return `${prefix}-${listIds}${suffix}`;
};
