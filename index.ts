import * as crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { load } from "cheerio";

const examPages = {
  listPg:
    "https://www.santafe.gob.ar/examenlicencia/examenETLC/listarCuestionarios.php",
  questionPg:
    "https://www.santafe.gob.ar/examenlicencia/examenETLC/cuestionario.php",
  answerPg:
    "https://www.santafe.gob.ar/examenlicencia/examenETLC/mostrarResultado.php",
};

const init = async (url: string) => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",

      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: "https://www.santafe.gob.ar",
      Referer:
        "https://www.santafe.gob.ar/examenlicencia/examenETLC/listarCuestionarios.php",
    },
    body: "id_sel=245&idcm_sel=245%7CAUTO%2C+UTILITARIO%2C+CAMIONETA+Y+CASA+RODANTE+MOTOR.+H%2F3.500+KG+TOTAL&uword=small&comenzar=Comenzar",
  });

  const text = await response.text();
  // console.log('text-----',text);
  writeFile(text);
};

init(examPages.questionPg);

/* the data the way im goign to save it */
interface AnswerData {
  QuestionHash: string;
  Answers: string[];
  CorrectAnswer: string;
}

/** the datga the way they expext it posted to answer the exam questions. */
interface QuestionForm {
  nombre_cuest: string;
  id_preg: number[];
  respuestas: Record<number, string>;
  enviar: string;
}

const processForm = (html: string) => {
  console.log(
    "process html into fake form responses with quest4ion form dataa structure"
  );
};

const md5 = (input: string) => {
  return crypto.createHash("md5").update(input).digest("hex");
};

const writeFile = async (htmlRes: string) => {
  console.log("writefileRAn===============");

  // define output folder and file

  // const dir = path.join(process.cwd(), "savedHtml");
  // const filePath = path.join(dir, "response_form_hash_.partial.html");

  // // ensure the folder exists
  // await fs.mkdir(dir, { recursive: true });

  // // write the HTML content
  // await fs.writeFile(filePath, htmlRes, "utf8");

  // console.log(`✅ Saved HTML to ${filePath}`);

  const $ = load(htmlRes);

  // grab the first <form> element (or refine with selector)
  const formHtml = $("form").first().toString();

  if (!formHtml) {
    console.warn("⚠️ No <form> element found!");
  } else {
    const dir = path.join(process.cwd(), "savedHtml");
    await fs.mkdir(dir, { recursive: true });

    // save with custom extension
    const formMd5 = md5(formHtml).substring(0, 6);

    const filenameWithHash = `response_form_hash_${formMd5}.partial.html`;

    const filePath = path.join(dir, filenameWithHash);
    await fs.writeFile(filePath, formHtml, "utf8");

    console.log(`✅ Saved form fragment to ${filePath}`);
  }
};

const postTest = async (answerPgUrl: string, html: string) => {
  processForm(html);

  // Define your POST parameters as a JSON object

  const params: QuestionForm = {
    nombre_cuest: "Cuestionario para Clase B1",
    id_preg: [
      1190, 40648, 1089, 1013, 1127, 1182, 1059, 40638, 1096, 1017, 1184, 1162,
      40653, 1046, 1148, 1555, 1556, 1582, 1569, 1572,
    ],
    respuestas: {
      1190: "1_1190_2555",
      40648: "2_40648_77623",
      1089: "3_1089_2254",
      1013: "4_1013_2025",
      1127: "5_1127_2367",
      1182: "6_1182_2532",
      1059: "7_1059_2164",
      40638: "8_40638_77594",
      1096: "9_1096_2275",
      1017: "10_1017_2036",
      1184: "11_1184_2537",
      1162: "12_1162_2472",
      40653: "13_40653_77637",
      1046: "14_1046_2124",
      1148: "15_1148_2429",
      1555: "16_1555_3273",
      1556: "17_1556_3275",
      1582: "18_1582_3354",
      1569: "19_1569_3315",
      1572: "20_1572_3323",
    },
    enviar: "Enviar",
  };

  // Helper to turn that JSON into `application/x-www-form-urlencoded`
  function toFormBody(p: typeof params): string {
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
  const body = toFormBody(params);

  // const body =
  //   "nombre_cuest=Cuestionario+para+Clase+B1&id_preg%5B%5D=1190&1190=1_1190_2555&id_preg%5B%5D=40648&40648=2_40648_77623&id_preg%5B%5D=1089&1089=3_1089_2254&id_preg%5B%5D=1013&1013=4_1013_2025&id_preg%5B%5D=1127&1127=5_1127_2367&id_preg%5B%5D=1182&1182=6_1182_2532&id_preg%5B%5D=1059&1059=7_1059_2164&id_preg%5B%5D=40638&40638=8_40638_77594&id_preg%5B%5D=1096&1096=9_1096_2275&id_preg%5B%5D=1017&1017=10_1017_2036&id_preg%5B%5D=1184&1184=11_1184_2537&id_preg%5B%5D=1162&1162=12_1162_2472&id_preg%5B%5D=40653&40653=13_40653_77637&id_preg%5B%5D=1046&1046=14_1046_2124&id_preg%5B%5D=1148&1148=15_1148_2429&id_preg%5B%5D=1555&1555=16_1555_3273&id_preg%5B%5D=1556&1556=17_1556_3275&id_preg%5B%5D=1582&1582=18_1582_3354&id_preg%5B%5D=1569&1569=19_1569_3315&id_preg%5B%5D=1572&1572=20_1572_3323&enviar=Enviar";

  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",

    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Content-Type": "application/x-www-form-urlencoded",
    Origin: "https://www.santafe.gob.ar",
    Referer:
      "https://www.santafe.gob.ar/examenlicencia/examenETLC/cuestionario.php",
    Cookie:
      "MoodleSession=cso012di66jrcdfbhndr6kogr1; _pk_id.7.38fb=2b2a0693b7d87bd7.1762704238.4.1762883179.1762882059.; eZSESSID=3n8fk9flu2ofq8qg53u5qn0g87; eZSESSIDweb=3r1ab6dm78137ohfj3ic4s9tb3; _gcl_au=1.1.1717133776.1762830500; _ga_XRDJD94NN8=GS2.1.s1762830500$o1$g0$t1762830511$j49$l0$h0; _ga=GA1.1.1616098780.1762830500; _ga_V7QRESCZPX=GS2.1.s1762830500$o1$g0$t1762830511$j49$l0$h0; _fbp=fb.2.1762830501375.799563771277620418; EXAMENLICENCIApwww=.examenlicencia-pwww3; _pk_ses.7.38fb=*",
  };

  const response = await fetch(answerPgUrl, {
    method: "POST",
    headers,
    body,
  });

  const htmlRes = await response.text();
  writeFile(htmlRes);
  //console.log(htmlRes);
};

const parseRes = (html: string): AnswerData => {
  // console.log("===>", html);

  const md5Hash = crypto.createHash("md5").update("a").digest("hex");

  return {
    QuestionHash: md5Hash,
    Answers: ["a", "b", "c"],
    CorrectAnswer: "a",
  };
};
