import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const extractImageUrl = (text) => {
    if (!text)
        return null;
    const cleaned = text.trim();
    // Case 1: whole text is an image URL
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(cleaned)) {
        return cleaned;
    }
    // Case 2: find full http(s) image URLs in text
    const match = cleaned.match(/https?:\/\/\S+\.(jpg|jpeg|png|gif|webp)/i);
    if (match)
        return match[0];
    // Case 3: find relative paths ending in image extension
    const rel = cleaned.match(/[./\w-]+\.(jpg|jpeg|png|gif|webp)/i);
    if (rel)
        return rel[0];
    return null;
};
export const QuestionText = ({ text }) => {
    //todo save locally
    const baseUrl = "https://www.santafe.gob.ar/examenlicencia/examenETLC/";
    const imgUrl = extractImageUrl(text);
    return imgUrl ? (_jsxs("section", { children: [_jsx("h2", { children: "\u00BFQu\u00E9 significa esta se\u00F1al?" }), _jsx("img", { src: baseUrl + imgUrl, alt: "Pregunta", className: "question-image" })] })) : (_jsx("section", { children: _jsx("h2", { className: "question", children: text }) }));
};
