import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AuthProvider } from "../../context/AuthProvider";
import NotifyPendingButton from "./NotifyPendingButton";

describe("NotifyPendingButton", () => {
  it("replaces both notification actions with a non-interactive updating status while saving", () => {
    const markup = renderToStaticMarkup(
      createElement(
        AuthProvider,
        null,
        createElement(NotifyPendingButton, {
          summary: {
            pending_students: 1,
            pending: [],
            without_email: [],
            active_batch: null,
            last_batch: null,
          },
          sending: false,
          updating: true,
          justFinished: null,
          onSend: async () => undefined,
          onOpenPreview: () => undefined,
        }),
      ),
    );

    expect(markup).toContain('role="status"');
    expect(markup).toContain("Actualizando");
    expect(markup).not.toContain("<button");
  });
});
