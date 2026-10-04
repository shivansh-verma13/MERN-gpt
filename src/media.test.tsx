// @vitest-environment jsdom
import { afterEach, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import MediaRoom from "./components/MediaRoom";
import type { Interview } from "./types";
vi.mock("./api", () => ({
  post: vi.fn().mockResolvedValue({ ok: true }),
  api: vi.fn().mockResolvedValue({ transcript: "A real transcript." }),
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const interview = {
  id: "test",
  format: "simulation",
  mode: "live",
  currentQuestion: "Explain your design.",
  version: 0,
} as Interview;
it("requires fullscreen and devices, pauses on escape, resumes with a user action and cleans up devices", async () => {
  let full: Element | null = null;
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    get: () => full,
  });
  const enter = vi.fn(async () => {
    full = document.documentElement;
    document.dispatchEvent(new Event("fullscreenchange"));
  });
  Object.defineProperty(document.documentElement, "requestFullscreen", {
    configurable: true,
    value: enter,
  });
  Object.defineProperty(document, "exitFullscreen", {
    configurable: true,
    value: vi.fn(async () => {
      full = null;
    }),
  });
  const tracks = [
    { kind: "audio", readyState: "live", stop: vi.fn(), onended: null },
    { kind: "video", readyState: "live", stop: vi.fn(), onended: null },
  ];
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => tracks,
        getAudioTracks: () => [tracks[0]],
        getVideoTracks: () => [tracks[1]],
      }),
    },
  });
  const state = vi.fn();
  const view = render(
    <MediaRoom interview={interview} onState={state} onTranscript={vi.fn()} />,
  );
  expect(state).toHaveBeenLastCalledWith(
    expect.objectContaining({ locked: true }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Enter fullscreen & enable devices" }),
  );
  await waitFor(() =>
    expect(state).toHaveBeenLastCalledWith(
      expect.objectContaining({
        locked: false,
        fullscreen: true,
        camera: true,
        microphone: true,
      }),
    ),
  );
  full = null;
  document.dispatchEvent(new Event("fullscreenchange"));
  await screen.findByText("Interview paused");
  expect(state).toHaveBeenLastCalledWith(
    expect.objectContaining({ locked: true, fullscreen: false }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Resume interview" }));
  await waitFor(() => expect(enter).toHaveBeenCalledTimes(2));
  view.unmount();
  expect(tracks[0].stop).toHaveBeenCalled();
  expect(tracks[1].stop).toHaveBeenCalled();
});
it("permission rejection stays locked and gives a recoverable error", async () => {
  Object.defineProperty(document.documentElement, "requestFullscreen", {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: vi.fn().mockRejectedValue(Error("Permission denied")),
    },
  });
  const state = vi.fn();
  render(
    <MediaRoom interview={interview} onState={state} onTranscript={vi.fn()} />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Enter fullscreen & enable devices" }),
  );
  await screen.findByText("Permission denied");
  expect(state).toHaveBeenLastCalledWith(
    expect.objectContaining({ locked: true }),
  );
});
it("records audio and local video, requires audio consent, transcribes to an editable answer and releases URLs", async () => {
  const { api } = await import("./api");
  const track = {
    kind: "audio",
    readyState: "live",
    stop: vi.fn(),
    onended: null,
  };
  const s = {
    getTracks: () => [track],
    getAudioTracks: () => [track],
    getVideoTracks: () => [],
  };
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: vi.fn().mockResolvedValue(s) },
  });
  class Recorder {
    static isTypeSupported() {
      return true;
    }
    state = "inactive";
    ondataavailable: ((e: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;
    start() {
      this.state = "recording";
    }
    stop() {
      this.state = "inactive";
      this.ondataavailable?.({ data: new Blob(["synthetic recording"]) });
      this.onstop?.();
    }
  }
  vi.stubGlobal("MediaRecorder", Recorder);
  vi.stubGlobal(
    "MediaStream",
    class {
      constructor(public tracks: unknown[]) {}
    },
  );
  const create = vi.fn(() => "blob:local-test"),
    revoke = vi.fn();
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: create,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: revoke,
  });
  const transcript = vi.fn();
  const view = render(
    <MediaRoom
      interview={{ ...interview, format: "video" }}
      onState={vi.fn()}
      onTranscript={transcript}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Enable microphone & camera" }),
  );
  await screen.findByText("Your practice studio");
  fireEvent.click(screen.getByLabelText(/Also record video locally/));
  fireEvent.click(screen.getByRole("button", { name: "Record answer" }));
  fireEvent.click(screen.getByRole("button", { name: "Stop recording" }));
  expect(
    screen.getByRole("button", { name: "Transcribe answer" }),
  ).toBeDisabled();
  expect(
    screen.getByRole("link", { name: "Download local video" }),
  ).toHaveAttribute("href", "blob:local-test");
  fireEvent.click(screen.getByLabelText(/Send this audio clip/));
  fireEvent.click(screen.getByRole("button", { name: "Transcribe answer" }));
  await waitFor(() =>
    expect(transcript).toHaveBeenCalledWith("A real transcript."),
  );
  expect(api).toHaveBeenCalledWith(
    "/interviews/test/transcribe",
    expect.objectContaining({
      body: expect.any(Blob),
      headers: expect.objectContaining({ "X-Audio-Consent": "true" }),
    }),
  );
  view.unmount();
  expect(revoke).toHaveBeenCalledWith("blob:local-test");
  vi.unstubAllGlobals();
});
