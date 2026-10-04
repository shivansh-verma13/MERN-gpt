// @vitest-environment jsdom
import { it, expect, vi, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useLiveCaptions } from "./useLiveCaptions";
afterEach(() => {
  cleanup();
  delete (window as unknown as { SpeechRecognition?: unknown })
    .SpeechRecognition;
});
it("does not send speech without opt-in and emits interim and final text separately, stopping on pause", () => {
  let result: ((e: unknown) => void) | null = null;
  const start = vi.fn(),
    abort = vi.fn();
  class Recognition {
    continuous = false;
    interimResults = false;
    lang = "";
    onerror = null;
    onend = null;
    set onresult(v: ((e: unknown) => void) | null) {
      result = v;
    }
    start = start;
    abort = abort;
  }
  (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition =
    Recognition;
  const final = vi.fn(),
    interim = vi.fn();
  const view = renderHook(
    ({ active }) => useLiveCaptions(active, "Question", final, interim),
    { initialProps: { active: false } },
  );
  expect(start).not.toHaveBeenCalled();
  view.rerender({ active: true });
  expect(start).toHaveBeenCalledOnce();
  act(() =>
    result?.({
      resultIndex: 0,
      results: [{ isFinal: false, 0: { transcript: "I designed" } }],
    }),
  );
  expect(interim).toHaveBeenCalledWith("I designed");
  expect(final).not.toHaveBeenCalled();
  act(() =>
    result?.({
      resultIndex: 0,
      results: [{ isFinal: true, 0: { transcript: "I designed an API." } }],
    }),
  );
  expect(final).toHaveBeenCalledWith("I designed an API.");
  view.rerender({ active: false });
  expect(abort).toHaveBeenCalledOnce();
  expect(interim).toHaveBeenLastCalledWith("");
});
it("reports unsupported browsers instead of presenting fake transcripts", () => {
  const view = renderHook(() => useLiveCaptions(true, "Question", vi.fn()));
  expect(view.result.current.supported).toBe(false);
});
