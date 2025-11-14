import React from "react";

interface QuestionTextProps {
  text: string;
}

const extractImageUrl = (text: string): string | null => {
  if (!text) return null;

  const cleaned = text.trim();

  // Case 1: whole text is an image URL
  if (/\.(jpg|jpeg|png|gif|webp)$/i.test(cleaned)) {
    return cleaned;
  }

  // Case 2: find full http(s) image URLs in text
  const match = cleaned.match(/https?:\/\/\S+\.(jpg|jpeg|png|gif|webp)/i);
  if (match) return match[0];

  // Case 3: find relative paths ending in image extension
  const rel = cleaned.match(/[./\w-]+\.(jpg|jpeg|png|gif|webp)/i);
  if (rel) return rel[0];

  return null;
};


export const QuestionText: React.FC<QuestionTextProps> = ({ text }) => {

  //todo save locally
  const baseUrl = "https://www.santafe.gob.ar/examenlicencia/examenETLC/";
  const imgUrl = extractImageUrl(text);

  return imgUrl ? (
    <section>
      <h2>¿Qué significa esta señal?</h2>
      <img src={baseUrl + imgUrl} alt="Pregunta" className="question-image" />
    </section>
  ) : (
    <section>
      <h2 className="question">{text}</h2>
    </section>
  );
};
