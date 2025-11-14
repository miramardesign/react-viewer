export interface Answer {
  AnswerId: number;
  AnswerText: string;
}

/* the data the way im goign to save it */
export interface AnswerData {
  QuestionText: string;
  Answers: Answer[];
  // Answers: string[];
  CorrectAnswerId: number;
}

export type AnswerDataMap = Record<string, AnswerData>;

/** the datga the way they expext it posted to answer the exam questions. */
export interface QuestionForm {
  nombre_cuest: string;
  id_preg: number[];
  respuestas: Record<number, string>;
  enviar: string;
}
