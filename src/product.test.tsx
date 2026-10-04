// @vitest-environment jsdom
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import PracticeSetup, { sampleProfile } from "./components/PracticeSetup";
import PracticeSession, { Feedback } from "./components/PracticeSession";
import PracticeReview from "./components/PracticeReview";
import { post } from "./api";
import type { Interview, Turn } from "./types";
vi.mock("./api", () => ({ post: vi.fn() }));
const mockPost = vi.mocked(post);
const interview: Interview = {
  id: "practice",
  profile: sampleProfile,
  questions: [
    {
      text: "Explain a project and your contribution.",
      category: "behavioral",
      contextQuote: "",
    },
  ],
  cursor: 0,
  pendingFollowUp: null,
  followUpUsed: false,
  turns: [],
  status: "active",
  version: 0,
  mode: "demo",
  createdAt: "2026-10-04",
  updatedAt: "2026-10-04",
  currentQuestion: "Explain a project and your contribution.",
  report: {
    completed: false,
    answered: 0,
    primaryAnswered: 0,
    strengths: [],
    nextSteps: [],
    disclaimer: "Practice feedback only, not a hiring score.",
  },
};
const turn: Turn = {
  requestId: "r1",
  question: "Explain a project.",
  answer: "I measured API latency and tested access checks.",
  kind: "primary",
  review: {
    summary: "A specific example with verification.",
    strengths: ["You name a way to verify your approach."],
    improvements: ["Explain one trade-off."],
    evidence: [
      {
        quote: "<script>alert(1)</script>",
        observation: "Shown as text only.",
      },
    ],
    followUp: null,
  },
  createdAt: "2026-10-04",
  latencyMs: 10,
  tokens: 0,
};
beforeEach(() => {
  mockPost.mockReset();
});
afterEach(cleanup);
describe("practice context", () => {
  it("requires context and starts a real API request with a synthetic example", async () => {
    const started = vi.fn();
    mockPost.mockResolvedValue(interview);
    render(<PracticeSetup mode="demo" provider="Demo" onStarted={started} />);
    expect(
      screen.getByRole("button", { name: "Start practice" }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: "Use synthetic example" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Start practice" }));
    await waitFor(() => expect(started).toHaveBeenCalledWith(interview));
    expect(mockPost.mock.calls[0][0]).toBe("/interviews");
    expect(mockPost.mock.calls[0][1]).toMatchObject({
      ...sampleProfile,
      consent: false,
    });
  });
  it("requires explicit consent for live Gemini requests", () => {
    render(<PracticeSetup mode="live" provider="Gemini" onStarted={vi.fn()} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Use synthetic example" }),
    );
    expect(
      screen.getByRole("button", { name: "Start practice" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(
      screen.getByRole("button", { name: "Start practice" }),
    ).toBeEnabled();
    expect(
      screen.getByText(/free tier may use submitted content/),
    ).toBeInTheDocument();
  });
  it("keeps context after failure and reuses the request ID for a safe retry", async () => {
    mockPost.mockRejectedValue(Error("Provider unavailable"));
    render(<PracticeSetup mode="demo" provider="Demo" onStarted={vi.fn()} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Use synthetic example" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Start practice" }));
    await screen.findByText("Provider unavailable");
    expect(screen.getByLabelText("Résumé / experience")).toHaveValue(
      sampleProfile.resume,
    );
    fireEvent.click(screen.getByRole("button", { name: "Start practice" }));
    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(2));
    expect(mockPost.mock.calls[0][1]).toEqual(mockPost.mock.calls[1][1]);
  });
});
describe("practice answers", () => {
  it("preserves failed answers and sends current version for concurrency checks", async () => {
    mockPost.mockRejectedValue(Error("Feedback timed out"));
    render(
      <PracticeSession
        interview={interview}
        provider="Demo"
        onChanged={vi.fn()}
        onReview={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Your answer"), {
      target: {
        value: "I tested ownership checks before shipping the endpoint.",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit answer" }));
    await screen.findByText("Feedback timed out");
    expect(screen.getByLabelText("Your answer")).toHaveValue(
      "I tested ownership checks before shipping the endpoint.",
    );
    expect(mockPost.mock.calls[0][1]).toMatchObject({
      version: 0,
      answer: "I tested ownership checks before shipping the endpoint.",
    });
  });
  it("clears the successful answer and advances to the response from the API", async () => {
    const changed = vi.fn();
    mockPost.mockResolvedValue({
      ...interview,
      version: 1,
      pendingFollowUp: "How would you verify that?",
    });
    render(
      <PracticeSession
        interview={interview}
        provider="Demo"
        onChanged={changed}
        onReview={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Your answer"), {
      target: { value: "I tested validation before shipping." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit answer" }));
    await waitFor(() => expect(changed).toHaveBeenCalledOnce());
    expect(screen.getByLabelText("Your answer")).toHaveValue("");
  });
  it("renders provider content as text and clearly identifies demo feedback", () => {
    const { container } = render(<Feedback turn={turn} mode="demo" />);
    expect(screen.getByText("LOCAL RUBRIC PREVIEW")).toBeInTheDocument();
    expect(screen.getByText(/<script>alert/)).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
  });
  it("shows saved transcript, formative disclaimer and next steps", () => {
    render(
      <PracticeReview
        interview={{
          ...interview,
          status: "completed",
          turns: [turn],
          cursor: 3,
          report: {
            ...interview.report,
            nextSteps: ["Explain one trade-off."],
          },
        }}
        onNew={vi.fn()}
      />,
    );
    expect(screen.getByText("The full conversation")).toBeInTheDocument();
    expect(
      screen.getByText("Practice feedback only, not a hiring score."),
    ).toBeInTheDocument();
    expect(screen.getByText(turn.answer)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Download review" }),
    ).toBeInTheDocument();
  });
});
