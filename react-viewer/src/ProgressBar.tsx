import React from 'react';

interface ProgressBarProps {
  answerHistory: boolean[];
}

const ProgressBar: React.FC<ProgressBarProps> = ({ answerHistory }) => {
  const correctAnswers = answerHistory.filter(a => a).length;
  const totalAnswers = Math.min(answerHistory.length, 20);
  const progressPercentage = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;
  const isHighScore = totalAnswers > 0 && correctAnswers >= 18;

  return (
    <div className="progress-bar-wrapper">
      <div className="progress-bar-container">
        <div className="progress-bar-score">
          {totalAnswers > 0 ? `${correctAnswers} / ${totalAnswers}` : '0 / 20'}
        </div>
        <div 
          className="progress-bar-fill"
          style={{
            width: `${progressPercentage}%`,
            backgroundColor: isHighScore ? '#4caf50' : '#f44336',
          }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;