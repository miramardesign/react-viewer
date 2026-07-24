import React from "react";

interface QuestionTextProps {
  text: string;
}

const extractImageUrl = (text: string): string | null => {
  if (!text) {
    return null;
  }

  const cleaned = text.trim();

  if (/\.(jpg|jpeg|png|gif|webp)$/i.test(cleaned)) {
    return cleaned;
  }

  const absoluteMatch = cleaned.match(/https?:\/\/\S+\.(jpg|jpeg|png|gif|webp)/i);
  if (absoluteMatch) {
    return absoluteMatch[0];
  }

  const relativeMatch = cleaned.match(/[./\w-]+\.(jpg|jpeg|png|gif|webp)/i);
  return relativeMatch ? relativeMatch[0] : null;
};

const resolveImageUrl = (imgUrl: string): string => {
  if (/^https?:\/\//i.test(imgUrl)) {
    return imgUrl;
  }

  return `${import.meta.env.BASE_URL}${imgUrl.replace(/^\.?\//, "")}`;
};

export const QuestionText: React.FC<QuestionTextProps> = ({ text }) => {
  const imgUrl = extractImageUrl(text);

  return imgUrl ? (
    <section>
      <h2 className="question">Que significa esta senal?</h2>
      <img
        src={resolveImageUrl(imgUrl)}
        alt="Pregunta"
        className="question-image"
      />
    </section>
  ) : (
    <section>
      <h2 className="question">{text}</h2>
    </section>
  );
};
