import { useEffect, useState, useCallback, useRef } from "react";
import { useSwipeable } from "react-swipeable";
import "./App.css";
import { QuestionText } from "./QuestionText";
import AnswerButtons from "./AnswerButtons";
import ProgressBar from "./ProgressBar";

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
  const [answerHistory, setAnswerHistory] = useState<boolean[]>([]);
  const [showAnswerOnButtons, setShowAnswerOnButtons] = useState(false);
  const [incorrectQuestions, setIncorrectQuestions] = useState<Record<string, number>>({});
  // Trigger workflow test
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // BASE_URL is /react-viewer/ in production, / in dev
    // Files in public/ are served at BASE_URL/
    const isDev = !window.location.hostname.includes('github');
    const url = isDev ? '/answers.json' : '/react-viewer/answers.json';
    console.log("Fetching data from:", url, "| isDev:", isDev, "| location:", window.location.pathname);
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

  // Handle showAnswerOnButtons cookie and URL parameter
  useEffect(() => {
    // Check for cookie
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith('showAnswerOnButtons='))
      ?.split('=')[1];

    if (cookieValue === 'true') {
      setShowAnswerOnButtons(true);
    } else if (cookieValue === 'false') {
      setShowAnswerOnButtons(false);
    }

    // Check for URL parameter ?a=true or ?a=false
    const urlParams = new URLSearchParams(window.location.search);
    const aParam = urlParams.get('a');
    
    if (aParam === 'true') {
      document.cookie = 'showAnswerOnButtons=true; path=/; max-age=86400'; // 24 hours
      setShowAnswerOnButtons(true);
    } else if (aParam === 'false') {
      document.cookie = 'showAnswerOnButtons=false; path=/; max-age=86400'; // 24 hours
      setShowAnswerOnButtons(false);
    }
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

    // Create weighted list: incorrect questions appear 5 times more often
    const weightedIds: string[] = [];
    ids.forEach(id => {
      const weight = incorrectQuestions[id] !== undefined ? 5 : 1;
      for (let i = 0; i < weight; i++) {
        weightedIds.push(id);
      }
    });

    const selectedId = pickRandom(weightedIds);
    setCurrentId(selectedId);
    setUserAnswer(null);
    setIsCorrect(null);
    setShowOverlay(false);
  }, [data, incorrectQuestions]);


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

    // Update incorrect questions tracking
    setIncorrectQuestions(prev => {
      const newIncorrect = { ...prev };
      if (isCorrect) {
        // If correct and question is in incorrect list, increment count
        if (newIncorrect[currentId]) {
          newIncorrect[currentId] += 1;
          // If answered correctly twice, remove from incorrect list
          if (newIncorrect[currentId] >= 2) {
            delete newIncorrect[currentId];
          }
        }
      } else {
        // If wrong, add to incorrect list with count 0
        if (newIncorrect[currentId] === undefined) {
          newIncorrect[currentId] = 0;
        }
      }
      return newIncorrect;
    });

    // Track answer in history (keep last 20)
    setAnswerHistory((prev) => {
      const newHistory = [...prev, isCorrect];
      return newHistory.slice(-20);
    });

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

  if (error) return <div className="error" style={{ color: "red", fontSize: "20px", padding: "40px", textAlign: "center", fontWeight: "bold" }}>❌ {error}</div>;
  if (loading || !currentId) return <div className="loading" style={{ fontSize: "24px", padding: "40px", textAlign: "center" }}>⏳ Loading… now</div>;

  const q = data[currentId];

  // q.CorrectAnswerId

  return (
    <div className="wrapper" {...swipeHandlers}>
      <div className="card">
        <QuestionText text={q?.QuestionText || ""} />

        <section className="instructions">
          <AnswerButtons 
            correctAnswerId={q?.CorrectAnswerId || ""} 
            answers={q?.Answers || []} 
            onAnswerSelect={handleAnswerById}
            showAnswerOnButtons={showAnswerOnButtons}
          />
        </section>
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

      <ProgressBar answerHistory={answerHistory} />
    </div>
  );
}

export default App;
