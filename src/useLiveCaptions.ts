import { useEffect, useRef, useState } from "react";
type Result = { isFinal: boolean; 0: { transcript: string } };
type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult:
    ((e: { resultIndex: number; results: ArrayLike<Result> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
export function useLiveCaptions(
  active: boolean,
  question: string | null,
  onFinal: (s: string) => void,
  onInterim?: (s: string) => void,
) {
  const [status, setStatus] = useState(""),
    [supported] = useState(
      () =>
        !!(
          (window as SpeechWindow).SpeechRecognition ||
          (window as SpeechWindow).webkitSpeechRecognition
        ),
    );
  const callbacks = useRef({ onFinal, onInterim });
  callbacks.current = { onFinal, onInterim };
  useEffect(() => {
    if (!active || !supported) return;
    const Constructor =
      (window as SpeechWindow).SpeechRecognition ||
      (window as SpeechWindow).webkitSpeechRecognition;
    const recognition = new Constructor!();
    let disposed = false;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";
    recognition.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) callbacks.current.onFinal(r[0].transcript);
        else interim += r[0].transcript;
      }
      callbacks.current.onInterim?.(interim);
    };
    recognition.onerror = (e) => {
      if (!disposed)
        setStatus(
          e.error === "not-allowed"
            ? "Speech permission denied. Use recording or type your answer."
            : "Live captions stopped (" +
                e.error +
                "). Toggle live captions to retry, or use recording.",
        );
    };
    recognition.onend = () => {
      if (!disposed)
        setStatus("Live captions stopped. Toggle live captions to restart.");
    };
    try {
      recognition.start();
      setStatus("Listening · live transcript appears on the left");
    } catch {
      setStatus(
        "Live captions could not start. Use recording or type your answer.",
      );
    }
    return () => {
      disposed = true;
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
      recognition.abort();
      callbacks.current.onInterim?.("");
    };
  }, [active, question, supported]);
  return { supported, status: active ? status : "Live captions paused" };
}
