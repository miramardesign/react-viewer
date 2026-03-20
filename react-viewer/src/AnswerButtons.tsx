import React from "react";
import { Answer } from "./App";

interface AnswerButtonsProps {
  answers: Answer[];
  correctAnswerId: string;
  onAnswerSelect: (answerId: string) => void;
  showAnswerOnButtons: boolean;
}

const AnswerButtons: React.FC<AnswerButtonsProps> = ({
  answers,
  correctAnswerId,
  onAnswerSelect,
  showAnswerOnButtons,
}) => {
  const handleAnswerClick = (index: number) => {
    const answer = answers[index];
    if (answer) {
      console.log(
        `click ${String.fromCharCode(65 + index)} ->`,
        answer.AnswerId,
      );
      onAnswerSelect(String(answer.AnswerId));
    }
  };

  //const buttonIcons = ["⬅", "⬆", "➡"];

  return (
    <div className="answers">
      {[0, 1, 2].map((index) => {
        const answer = answers[index];
        return (
          <button
            key={index}
            className={`answer-item ${
              showAnswerOnButtons && answer?.AnswerId === Number(correctAnswerId) ? "text-correct" : ""
            }`}
            onClick={() => handleAnswerClick(index)}
            disabled={!answer}
          >
            {answer?.AnswerText ?? "—"}
          </button>
        );
      })}
    </div>
  );
};

export default AnswerButtons;
