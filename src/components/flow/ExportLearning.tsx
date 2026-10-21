"use client";
import { useState } from "react";
import { useGame } from "@/store/game";
import { usePreview } from "@/store/preview";
/** Download a local backup without changing browser storage. */
export function ExportLearning() {
  const [message, setMessage] = useState("");
  return (
    <section className="mt-6">
      <h2 className="flow-section-title">Take your learning with you</h2>
      <div className="flow-card">
        <p className="mb-3 text-sm text-ink-soft">
          Download a copy of your progress and notebook entries for safekeeping.
          Your learning stays saved in this browser.
        </p>
        <button
          className="flow-secondary w-full"
          onClick={() => {
            try {
              const payload = {
                format: "language-stories-native",
                version: 1,
                game: useGame.getState(),
                preferences: usePreview.getState(),
              };
              const url = URL.createObjectURL(
                new Blob([JSON.stringify(payload)], {
                  type: "application/json",
                }),
              );
              const link = document.createElement("a");
              link.href = url;
              link.download = "language-stories-backup.json";
              link.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
              setMessage("Backup downloaded. Keep it somewhere private.");
            } catch {
              setMessage("The backup could not be created. Please try again.");
            }
          }}
        >
          Export learning backup
        </button>
        {message && (
          <p role="status" className="mt-3 text-sm text-ink-soft">
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
