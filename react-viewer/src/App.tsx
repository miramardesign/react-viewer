import { useEffect, useState, useCallback, useRef } from "react";
import { useSwipeable } from "react-swipeable";
import "./App.css";
import { QuestionText } from "./QuestionText";

export interface Answer {
  AnswerId: number;
  AnswerText: string;
}

export interface AnswerData {
  QuestionText: string;
  CorrectAnswerId: string;
  Answers: Answer[];
}

export type AnswerDataMap = Record<string, AnswerData>;

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function App() {
  const [data, setData] = useState<AnswerDataMap>({});
  const [loading, setLoading] = useState(true);

  const [currentId, setCurrentId] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState<string | null>(null);
  const [correctText, setCorrectText] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const url = `${import.meta.env.BASE_URL}json/data.json`;
    console.log("Fetching data from:", url);
    fetch(url)
      .then((r) => {
        console.log("Response status:", r.status, "ok:", r.ok);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        console.log("Data loaded successfully:", Object.keys(json).length, "questions");
        setData(json);
        setLoading(false);
        setError(null);
        const ids = Object.keys(json);
        setCurrentId(pickRandom(ids));
      })
      .catch((err) => {
        const errorMsg = `Error loading data: ${err.message}`;
        console.error(errorMsg);
        setError(errorMsg);
        setLoading(false);
      });
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const nextQuestion = useCallback(() => {
    const ids = Object.keys(data);
    if (ids.length === 0) return;

    setCurrentId(pickRandom(ids));
    setUserAnswer(null);
    setIsCorrect(null);
    setShowOverlay(false);
  }, [data]);


  // --- inside your component, replace handleAnswer with this ---
  const handleAnswerById = (answerId: string) => {
    if (!currentId) return;
    const q = data[currentId];
    if (!q) return;

    console.log("👉 User selected answerId:", answerId);

    let correctAnswerId: string | null = null;    
    let correctAnswerText: string | null = null;    
    for (const ans of q.Answers) {          
      // console.log('--ans.AnswerId.toString()--' + ans.AnswerId.toString() + '--q.CorrectAnswerId--'+ q.CorrectAnswerId + '--' ) 
      if (ans.AnswerId.toString().trim()=== q.CorrectAnswerId.toString().trim()) {
        correctAnswerId = String(ans.AnswerId);
        correctAnswerText = ans.AnswerText;

        break;
      }
    }
  
    console.log("Correct answerId resolved to:", correctAnswerId, 'correctText');

    const isCorrect = answerId === correctAnswerId;

    console.log("Result -> isCorrect:", isCorrect);

    setCorrectText(correctAnswerText);
    setUserAnswer(answerId);
    console.log(userAnswer, 'useranswer');
    setIsCorrect(isCorrect); 
    setShowOverlay(true);

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Next question after 4 seconds
    timeoutRef.current = setTimeout(() => {
      setShowOverlay(false);
      nextQuestion();
    }, 3500);
  };

  // --- update swipe handlers to call handleAnswerById ---
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      const id = q?.Answers?.[0]?.AnswerId;
      console.log("swipe LEFT -> AnswerId:", id);
      if (id) handleAnswerById(String(id));
    },
    onSwipedUp: () => {
      const id = q?.Answers?.[1]?.AnswerId;
      console.log("swipe UP -> AnswerId:", id);
      if (id) handleAnswerById(String(id));
    },
    onSwipedRight: () => {
      const id = q?.Answers?.[2]?.AnswerId;
      console.log("swipe RIGHT -> AnswerId:", id);
      if (id) handleAnswerById(String(id));
    },
    trackMouse: true,
  });

  if (error) return <div className="error" style={{ color: "red", fontSize: "18px", padding: "20px", textAlign: "center" }}>{error}</div>;
  if (loading || !currentId) return <div className="loading">Loading…</div>;

  const q = data[currentId];

  return (
    <div className="wrapper" {...swipeHandlers}>
      <div className="card">
        <QuestionText text={q?.QuestionText || ""} />
        <section>
          <small>{q?.CorrectAnswerId.toString()}</small>
        </section>
        <div className="instructions">
          <div className="answers">
            <button
              className="answer-item"
              onClick={() => {
                const id = q?.Answers?.[0]?.AnswerId;
                console.log("click A ->", id);
                if (id) handleAnswerById(String(id));
              }}
              disabled={!q?.Answers?.[0]}
            >
              ⬅ {q?.Answers?.[0]?.AnswerText ?? "—"}
              {q?.Answers?.[0]?.AnswerId }
            </button>

            <button
              className="answer-item"
              onClick={() => {
                const id = q?.Answers?.[1]?.AnswerId;
                console.log("click B ->", id);
                if (id) handleAnswerById(String(id));
              }}
              disabled={!q?.Answers?.[1]}
            >
              ⬆ {q?.Answers?.[1]?.AnswerText ?? "—"}
              {q?.Answers?.[1]?.AnswerId }
            </button>

            <button
              className="answer-item"
              onClick={() => {
                const id = q?.Answers?.[2]?.AnswerId;
                console.log("click C ->", id);
                if (id) handleAnswerById(String(id));
              }}
              disabled={!q?.Answers?.[2]}
            >
              ➡ {q?.Answers?.[2]?.AnswerText ?? "—"}
              {q?.Answers?.[2]?.AnswerId }
            </button>
          </div>
        </div>
      </div>

      {showOverlay && (
        <div 
          className="overlay"
          onClick={() => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
            setShowOverlay(false);
            nextQuestion();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
            setShowOverlay(false);
            nextQuestion();
          }}
        >
          <div className="overlay-content">
            {isCorrect ? (
              <>
                <div className="icon-correct">✅</div>
                <h3 className="text-correct">¡Correcto!</h3>
                 <div className="correct-answer-box">
                  <strong>Respuesta correcta: {correctText} </strong>                
                </div>
              </>
            ) : (
              <>
                <div className="icon-wrong">❌</div>
                <h3 className="text-wrong">Incorrecto</h3>
                <div className="correct-answer-box">
                  <strong>Respuesta correcta: {correctText}</strong>                
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
