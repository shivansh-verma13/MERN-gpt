import { useCallback, useEffect, useRef, useState } from "react";
import { useLiveCaptions } from "../useLiveCaptions";
import { api, post } from "../api";
import type { Interview } from "../types";
export type RoomState = {
  locked: boolean;
  busy: boolean;
  fullscreen: boolean;
  camera: boolean;
  microphone: boolean;
};
export default function MediaRoom({
  interview,
  onState,
  onTranscript,
  onInterim,
  submitting = false,
}: {
  interview: Interview;
  onState: (s: RoomState) => void;
  onTranscript: (text: string) => void;
  onInterim?: (text: string) => void;
  submitting?: boolean;
}) {
  const [captions, setCaptions] = useState(false),
    [speaking, setSpeaking] = useState(false);
  const entered = useRef(false);
  const simulation = interview.format === "simulation",
    video = simulation || interview.format === "video";
  const [ready, setReady] = useState(false),
    [paused, setPaused] = useState(false),
    [recording, setRecording] = useState(false),
    [working, setWorking] = useState(false),
    [consent, setConsent] = useState(false),
    [clip, setClip] = useState<Blob | null>(null),
    [error, setError] = useState("");
  const live = useLiveCaptions(
    captions &&
      ready &&
      !paused &&
      !recording &&
      !working &&
      !speaking &&
      !submitting,
    interview.currentQuestion,
    onTranscript,
    onInterim,
  );
  const preview = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null),
    recorder = useRef<MediaRecorder | null>(null),
    timer = useRef<ReturnType<typeof setTimeout>>(),
    abort = useRef<AbortController | null>(null),
    alive = useRef(true),
    events = useRef<unknown[]>([]);
  const [starting, setStarting] = useState(false);
  const [saveVideo, setSaveVideo] = useState(false),
    [videoUrl, setVideoUrl] = useState("");
  const videoRecorder = useRef<MediaRecorder | null>(null);
  const videoUrlRef = useRef("");
  const [eventError, setEventError] = useState(false);
  const flush = useRef(false);
  const flushEvents = useCallback(async () => {
    if (flush.current) return;
    flush.current = true;
    try {
      while (events.current.length) {
        await post(
          "/interviews/" + interview.id + "/events",
          events.current[0],
        );
        events.current.shift();
      }
      if (alive.current) setEventError(false);
    } catch {
      if (alive.current) setEventError(true);
    } finally {
      flush.current = false;
    }
  }, [interview.id]);
  const event = useCallback(
    (type: string) => {
      if (!simulation || events.current.length >= 100) return;
      events.current.push({
        id: crypto.randomUUID(),
        type,
        at: new Date().toISOString(),
      });
      void flushEvents();
    },
    [simulation, flushEvents],
  );
  function stop() {
    clearTimeout(timer.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
    if (videoRecorder.current?.state === "recording")
      videoRecorder.current.stop();
    window.speechSynthesis?.cancel();
  }
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      clearTimeout(timer.current);
      abort.current?.abort();
      if (videoRecorder.current?.state === "recording")
        videoRecorder.current.stop();
      if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => {
        t.onended = null;
        t.stop();
      });
      window.speechSynthesis?.cancel();
      if (simulation && document.fullscreenElement)
        void document.exitFullscreen().catch(() => {});
    };
  }, [simulation]);
  useEffect(() => {
    onState({
      locked: simulation && (!ready || paused),
      busy: recording || working || starting,
      fullscreen: !!document.fullscreenElement,
      camera: !!stream.current
        ?.getVideoTracks()
        .some((t) => t.readyState === "live"),
      microphone: !!stream.current
        ?.getAudioTracks()
        .some((t) => t.readyState === "live"),
    });
  }, [ready, paused, recording, working, starting, onState, simulation]);
  useEffect(() => {
    if (!ready) return;
    const pause = (type: string) => {
      if (!simulation) return;
      stop();
      abort.current?.abort();
      setPaused(true);
      event(type);
    };
    const fullscreen = () => {
      if (!document.fullscreenElement) pause("fullscreen_exit");
    };
    const hidden = () => {
      if (document.hidden) pause("page_hidden");
    };
    const blur = () => {
      if (simulation) event("window_blur");
    };
    document.addEventListener("fullscreenchange", fullscreen);
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("blur", blur);
    return () => {
      document.removeEventListener("fullscreenchange", fullscreen);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("blur", blur);
    };
  }, [ready, simulation, event]);
  useEffect(() => {
    setClip(null);
    window.speechSynthesis?.cancel();
  }, [interview.currentQuestion]);
  useEffect(() => {
    if (
      ready &&
      !paused &&
      interview.currentQuestion &&
      window.speechSynthesis
    ) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(interview.currentQuestion);
      setSpeaking(true);
      utterance.onend = () => {
        if (alive.current) setSpeaking(false);
      };
      utterance.onerror = () => {
        if (alive.current) setSpeaking(false);
      };
      window.speechSynthesis.speak(utterance);
    }
    return () => window.speechSynthesis?.cancel();
  }, [ready, paused, interview.currentQuestion]);
  const autoStarted = useRef(false);
  const autoStart = useRef<() => void>(() => {});
  autoStart.current = () => {
    void start(true);
  };
  useEffect(() => {
    if (!autoStarted.current) {
      autoStarted.current = true;
      autoStart.current();
    }
  }, []);
  async function start(automatic = false) {
    if (starting) return;
    setStarting(true);
    setError("");
    try {
      if (simulation && !automatic) {
        if (!document.documentElement.requestFullscreen)
          throw Error(
            "Fullscreen is unavailable in this browser. Choose audio or video practice instead.",
          );
        await document.documentElement.requestFullscreen();
      }
      if (!navigator.mediaDevices?.getUserMedia)
        throw Error(
          "Camera and microphone require HTTPS or localhost and a supported browser.",
        );
      if (
        !stream.current ||
        stream.current.getTracks().some((t) => t.readyState !== "live")
      ) {
        stream.current?.getTracks().forEach((t) => t.stop());
        const s = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: video
            ? { width: { ideal: 640 }, height: { ideal: 360 } }
            : false,
        });
        if (!alive.current) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream.current = s;
        s.getTracks().forEach((t) => {
          t.onended = () => {
            stop();
            setReady(false);
            setPaused(true);
            event(t.kind === "video" ? "camera_ended" : "microphone_ended");
          };
        });
        if (preview.current) preview.current.srcObject = s;
      }
      if (simulation && !document.fullscreenElement) {
        setReady(true);
        setPaused(true);
        return;
      }
      event(entered.current ? "fullscreen_return" : "session_started");
      entered.current = true;
      setReady(true);
      setPaused(false);
    } catch (e) {
      setError(
        (e as Error).message ||
          "Device permission was denied. Check browser permissions and try again.",
      );
      setReady(false);
      stream.current?.getTracks().forEach((t) => {
        t.onended = null;
        t.stop();
      });
      if (document.fullscreenElement)
        void document.exitFullscreen().catch(() => {});
    } finally {
      if (alive.current) setStarting(false);
    }
  }
  function record() {
    setError("");
    try {
      if (!stream.current || !window.MediaRecorder)
        throw Error(
          "Recording is unavailable. You can type your answer in practice mode.",
        );
      window.speechSynthesis?.cancel();
      setSpeaking(false);
      const mime = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ].find((t) => MediaRecorder.isTypeSupported(t));
      if (!mime)
        throw Error("No supported audio recording format is available.");
      const r = new MediaRecorder(
        new MediaStream(stream.current.getAudioTracks()),
        { mimeType: mime, audioBitsPerSecond: 32000 },
      );
      recorder.current = r;
      const chunks: Blob[] = [];
      let size = 0;
      r.ondataavailable = (e) => {
        chunks.push(e.data);
        size += e.data.size;
        if (size > 3500000 && r.state === "recording") r.stop();
      };
      r.onstop = () => {
        if (videoRecorder.current?.state === "recording")
          videoRecorder.current.stop();
        clearTimeout(timer.current);
        if (alive.current) {
          setClip(new Blob(chunks, { type: mime }));
          setRecording(false);
        }
      };
      r.onerror = () => {
        setError("Recording failed. Try again or type your answer.");
        stop();
      };
      setClip(null);
      if (saveVideo && video) {
        const videoMime = [
          "video/webm;codecs=vp8,opus",
          "video/webm",
          "video/mp4",
        ].find((t) => MediaRecorder.isTypeSupported(t));
        if (!videoMime)
          throw Error(
            "Video recording is unsupported. Turn off local recording to continue with audio.",
          );
        const vr = new MediaRecorder(stream.current, {
          mimeType: videoMime,
          videoBitsPerSecond: 500000,
          audioBitsPerSecond: 32000,
        });
        videoRecorder.current = vr;
        const parts: Blob[] = [];
        let bytes = 0;
        vr.ondataavailable = (e) => {
          parts.push(e.data);
          bytes += e.data.size;
          if (bytes > 20000000 && vr.state === "recording") stop();
        };
        vr.onstop = () => {
          if (!alive.current) return;
          if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
          videoUrlRef.current = URL.createObjectURL(
            new Blob(parts, { type: videoMime }),
          );
          setVideoUrl(videoUrlRef.current);
        };
        vr.onerror = () => {
          setError(
            "Local video recording failed. Audio recording is still available.",
          );
        };
        vr.start(1000);
      }
      r.start(1000);
      setRecording(true);
      timer.current = setTimeout(() => {
        if (r.state === "recording") r.stop();
      }, 120000);
    } catch (e) {
      stop();
      setRecording(false);
      setError((e as Error).message);
    }
  }
  async function transcribe() {
    if (!clip || !consent) return;
    setWorking(true);
    setError("");
    abort.current = new AbortController();
    const timeout = setTimeout(() => abort.current?.abort(), 35000);
    try {
      const r = await api<{ transcript: string }>(
        "/interviews/" + interview.id + "/transcribe",
        {
          method: "POST",
          body: clip,
          headers: {
            "Content-Type": clip.type.split(";")[0],
            "X-Audio-Consent": "true",
            "X-Interview-Version": String(interview.version),
          },
          signal: abort.current.signal,
        },
      );
      if (alive.current) {
        onTranscript(r.transcript);
        setClip(null);
      }
    } catch (e) {
      if (alive.current)
        setError(
          (e as Error).name === "AbortError"
            ? "Transcription stopped. Your clip is available to retry."
            : (e as Error).message,
        );
    } finally {
      clearTimeout(timeout);
      if (alive.current) setWorking(false);
    }
  }
  function speak() {
    if (!window.speechSynthesis) {
      setError(
        "Spoken questions are unavailable in this browser. Read the question below.",
      );
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      interview.currentQuestion ?? "",
    );
    setSpeaking(true);
    utterance.onend = () => {
      if (alive.current) setSpeaking(false);
    };
    utterance.onerror = () => {
      if (alive.current) setSpeaking(false);
    };
    window.speechSynthesis.speak(utterance);
  }
  return (
    <div className="media-room">
      <p className="eyebrow">
        {simulation
          ? "FULLSCREEN SIMULATION"
          : video
            ? "VIDEO PRACTICE"
            : "VOICE PRACTICE"}
      </p>
      <h2>
        {paused
          ? entered.current
            ? "Interview paused"
            : "Ready to enter fullscreen"
          : ready
            ? "Your practice studio"
            : "Set up your devices"}
      </h2>
      {video && (
        <video
          ref={preview}
          autoPlay
          muted
          playsInline
          aria-label="Local camera preview"
        />
      )}
      {ready && paused && !entered.current && (
        <p>Your devices are ready. Enter fullscreen to begin the simulation.</p>
      )}
      {live.supported ? (
        <label className="consent">
          <input
            type="checkbox"
            checked={captions}
            onChange={(e) => setCaptions(e.target.checked)}
          />
          Enable live captions. Your browser speech service may send audio to
          its provider. Final words appear in the editable transcript on the
          left.
        </label>
      ) : (
        <p className="muted">
          Live captions are unavailable in this browser. Record an answer and
          transcribe it with Gemini, or type on the left.
        </p>
      )}
      {captions && <p role="status">{live.status}</p>}
      {video && (
        <label className="consent">
          <input
            type="checkbox"
            checked={saveVideo}
            disabled={recording || working || submitting}
            onChange={(e) => setSaveVideo(e.target.checked)}
          />
          Also record video locally while answering (up to 2 minutes / 20 MB).
          Download before leaving this room.
        </label>
      )}
      {videoUrl && (
        <a
          className="secondary"
          href={videoUrl}
          download="Interview_Lab_Answer_Video"
        >
          Download local video
        </a>
      )}
      <div className="media-actions">
        {(!ready || paused) && (
          <button
            className="primary"
            disabled={starting}
            onClick={() => void start()}
          >
            {paused && entered.current
              ? "Resume interview"
              : simulation
                ? "Enter fullscreen & enable devices"
                : "Enable microphone" + (video ? " & camera" : "")}
          </button>
        )}
        {ready && !paused && (
          <>
            <button
              className="secondary"
              onClick={speak}
              disabled={recording || working || submitting}
            >
              Read question aloud
            </button>
            <button
              className="secondary"
              onClick={() => {
                window.speechSynthesis?.cancel();
                setSpeaking(false);
              }}
            >
              Stop speech
            </button>
            <button
              className="primary"
              disabled={working || submitting}
              onClick={recording ? stop : record}
            >
              {recording ? "Stop recording" : "Record answer"}
            </button>
          </>
        )}
      </div>
      {recording && (
        <p role="status">
          Recording microphone · stops after 2 minutes. Stop before
          transcribing.
        </p>
      )}
      {clip && !recording && (
        <>
          <label className="consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              disabled={working || submitting}
            />
            Send this audio clip to Gemini to create an editable transcript.
          </label>
          <button
            className="secondary"
            disabled={
              !consent || working || paused || interview.mode === "demo"
            }
            onClick={() => void transcribe()}
          >
            {working ? "Transcribing…" : "Transcribe answer"}
          </button>
          {interview.mode === "demo" && (
            <p>
              Demo mode does not send audio to AI. Type your answer to continue.
            </p>
          )}
          <button
            className="secondary"
            disabled={working || submitting}
            onClick={() => setClip(null)}
          >
            Discard clip
          </button>
        </>
      )}
      {working && (
        <button className="secondary" onClick={() => abort.current?.abort()}>
          Cancel transcription
        </button>
      )}
      <details className="media-privacy">
        <summary>Privacy and recording details</summary>{" "}
        <p>
          Camera preview stays on this device. Optional recordings are saved
          locally for download and never uploaded. Audio clips are sent to
          Gemini only when you choose transcription. Edited transcripts are
          saved with your answers.
        </p>
      </details>
      {simulation && (
        <p className="muted">
          Fullscreen exits and interruptions pause answering and appear in your
          review. These browser signals cannot prove cheating or detect another
          device. No eye tracking or face analysis.
        </p>
      )}
      {eventError && (
        <p role="status">
          Some interruption events have not synced.{" "}
          <button onClick={() => void flushEvents()}>Retry event sync</button>
        </p>
      )}
      <p className="error" role="alert">
        {error}
      </p>
    </div>
  );
}
