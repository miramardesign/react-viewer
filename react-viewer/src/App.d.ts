import "./App.css";
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
declare function App(): import("react/jsx-runtime").JSX.Element;
export default App;
