import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useCallback, useRef } from "react";
import { useSwipeable } from "react-swipeable";
import "./App.css";
import { QuestionText } from "./QuestionText";
function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
function App() {
    const [data, setData] = useState({});
    const [loading, setLoading] = useState(true);
    const [currentId, setCurrentId] = useState(null);
    const [userAnswer, setUserAnswer] = useState(null);
    const [correctText, setCorrectText] = useState(null);
    const [isCorrect, setIsCorrect] = useState(null);
    const [showOverlay, setShowOverlay] = useState(false);
    const timeoutRef = useRef(null);
    useEffect(() => {
        fetch("/json/data.json") // MUST be in /public/json/data.json
            .then((r) => r.json())
            .then((json) => {
            setData(json);
            setLoading(false);
            const ids = Object.keys(json);
            setCurrentId(pickRandom(ids));
        })
            .catch((err) => console.error("Error loading data:", err));
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
        if (ids.length === 0)
            return;
        setCurrentId(pickRandom(ids));
        setUserAnswer(null);
        setIsCorrect(null);
        setShowOverlay(false);
    }, [data]);
    // --- inside your component, replace handleAnswer with this ---
    const handleAnswerById = (answerId) => {
        if (!currentId)
            return;
        const q = data[currentId];
        if (!q)
            return;
        console.log("👉 User selected answerId:", answerId);
        let correctAnswerId = null;
        let correctAnswerText = null;
        for (const ans of q.Answers) {
            // console.log('--ans.AnswerId.toString()--' + ans.AnswerId.toString() + '--q.CorrectAnswerId--'+ q.CorrectAnswerId + '--' ) 
            if (ans.AnswerId.toString().trim() === q.CorrectAnswerId.toString().trim()) {
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
            if (id)
                handleAnswerById(String(id));
        },
        onSwipedUp: () => {
            const id = q?.Answers?.[1]?.AnswerId;
            console.log("swipe UP -> AnswerId:", id);
            if (id)
                handleAnswerById(String(id));
        },
        onSwipedRight: () => {
            const id = q?.Answers?.[2]?.AnswerId;
            console.log("swipe RIGHT -> AnswerId:", id);
            if (id)
                handleAnswerById(String(id));
        },
        trackMouse: true,
    });
    if (loading || !currentId)
        return _jsx("div", { className: "loading", children: "Loading\u2026" });
    const q = data[currentId];
    return (_jsxs("div", { className: "wrapper", ...swipeHandlers, children: [_jsxs("div", { className: "card", children: [_jsx(QuestionText, { text: q?.QuestionText || "" }), _jsx("section", { children: _jsx("small", { children: q?.CorrectAnswerId.toString() }) }), _jsx("div", { className: "instructions", children: _jsxs("div", { className: "answers", children: [_jsxs("button", { className: "answer-item", onClick: () => {
                                        const id = q?.Answers?.[0]?.AnswerId;
                                        console.log("click A ->", id);
                                        if (id)
                                            handleAnswerById(String(id));
                                    }, disabled: !q?.Answers?.[0], children: ["\u2B05 ", q?.Answers?.[0]?.AnswerText ?? "—", q?.Answers?.[0]?.AnswerId] }), _jsxs("button", { className: "answer-item", onClick: () => {
                                        const id = q?.Answers?.[1]?.AnswerId;
                                        console.log("click B ->", id);
                                        if (id)
                                            handleAnswerById(String(id));
                                    }, disabled: !q?.Answers?.[1], children: ["\u2B06 ", q?.Answers?.[1]?.AnswerText ?? "—", q?.Answers?.[1]?.AnswerId] }), _jsxs("button", { className: "answer-item", onClick: () => {
                                        const id = q?.Answers?.[2]?.AnswerId;
                                        console.log("click C ->", id);
                                        if (id)
                                            handleAnswerById(String(id));
                                    }, disabled: !q?.Answers?.[2], children: ["\u27A1 ", q?.Answers?.[2]?.AnswerText ?? "—", q?.Answers?.[2]?.AnswerId] })] }) })] }), showOverlay && (_jsx("div", { className: "overlay", onClick: () => {
                    if (timeoutRef.current) {
                        clearTimeout(timeoutRef.current);
                    }
                    setShowOverlay(false);
                    nextQuestion();
                }, onTouchEnd: (e) => {
                    e.preventDefault();
                    if (timeoutRef.current) {
                        clearTimeout(timeoutRef.current);
                    }
                    setShowOverlay(false);
                    nextQuestion();
                }, children: _jsx("div", { className: "overlay-content", children: isCorrect ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "icon-correct", children: "\u2705" }), _jsx("h3", { className: "text-correct", children: "\u00A1Correcto!" }), _jsx("div", { className: "correct-answer-box", children: _jsxs("strong", { children: ["Respuesta correcta: ", correctText, " "] }) })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "icon-wrong", children: "\u274C" }), _jsx("h3", { className: "text-wrong", children: "Incorrecto" }), _jsx("div", { className: "correct-answer-box", children: _jsxs("strong", { children: ["Respuesta correcta: ", correctText] }) })] })) }) }))] }));
}
export default App;
