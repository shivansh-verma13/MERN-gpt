// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import Auth from "./Auth";
import Conversation from "./Conversation";
import SourceDialog from "./SourceDialog";
vi.mock("../api", () => ({ post: vi.fn(), api: vi.fn() }));
import { post } from "../api";
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const config = { demoEnabled: true, mode: "demo" as const, dailyLimit: 20 };
const sources = [
  {
    id: "s",
    title: "Plan",
    content: "The pilot launches November 12.",
    createdAt: "",
  },
];
describe("primary user journey states", () => {
  it("clearly labels demo and exposes preparation failure", async () => {
    vi.mocked(post).mockRejectedValueOnce(new Error("Demo unavailable"));
    render(<Auth config={config} onLogin={vi.fn()} />);
    expect(screen.getByText(/not AI-generated/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Explore demo/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Demo unavailable",
    );
    expect(screen.getByRole("button", { name: /Explore demo/ })).toBeEnabled();
  });
  it("requires consent before live AI; blocks empty questions", async () => {
    render(
      <Conversation
        thread={null}
        sources={sources}
        mode="live"
        onAnswered={vi.fn()}
        onSource={vi.fn()}
      />,
    );
    const send = screen.getByRole("button", { name: "Ask question" });
    expect(send).toBeDisabled();
    await userEvent.type(
      screen.getByRole("textbox", {
        name: "Ask a question about your sources",
      }),
      "When is the pilot launch?",
    );
    expect(send).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox"));
    expect(send).toBeEnabled();
  });
  it("failed requests keep question text and allow retry", async () => {
    vi.mocked(post).mockRejectedValueOnce(new Error("Provider unavailable"));
    render(
      <Conversation
        thread={null}
        sources={sources}
        mode="demo"
        onAnswered={vi.fn()}
        onSource={vi.fn()}
      />,
    );
    await userEvent.type(
      screen.getByRole("textbox", { name: /Ask a question/ }),
      "When is the launch?",
    );
    await userEvent.click(screen.getByRole("button", { name: "Ask question" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Provider unavailable",
    );
    expect(screen.getByRole("textbox", { name: /Ask a question/ })).toHaveValue(
      "When is the launch?",
    );
    expect(screen.getByRole("button", { name: "Ask question" })).toBeEnabled();
  });
  it("renders evidence as text and opens original source", async () => {
    const open = vi.fn();
    render(
      <Conversation
        thread={{
          id: "t",
          title: "Launch",
          updatedAt: "",
          messages: [
            {
              id: "m",
              role: "assistant",
              content: "Launch on November 12.",
              createdAt: "",
              result: {
                answer: "Launch on November 12.",
                citations: [
                  {
                    sourceId: "s",
                    chunkId: "s:0",
                    title: "Plan",
                    quote: "<script>not executable</script>",
                  },
                ],
                insufficient: false,
                mode: "demo",
                latencyMs: 5,
                tokens: 0,
              },
            },
          ],
        }}
        sources={sources}
        mode="demo"
        onAnswered={vi.fn()}
        onSource={open}
      />,
    );
    await userEvent.click(screen.getByText("Plan"));
    expect(
      screen.getByText("<script>not executable</script>"),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: /Open original source/ }),
    );
    expect(open).toHaveBeenCalledWith("s");
    expect(document.querySelector("script")).toBeNull();
  });
  it("source save requires a title and meaningful content", async () => {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = vi.fn();
    render(<SourceDialog source={null} onClose={vi.fn()} onChange={vi.fn()} />);
    const save = screen.getByRole("button", { name: "Save source" });
    expect(save).toBeDisabled();
    await userEvent.type(
      screen.getByRole("textbox", { name: "Source title" }),
      "A plan",
    );
    await userEvent.type(
      screen.getByRole("textbox", { name: "Content" }),
      "This is a useful source with more than twenty characters.",
    );
    expect(save).toBeEnabled();
  });
});
