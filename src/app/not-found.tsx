import { Button, PageShell } from "@/components/ui";

export default function NotFound() {
  return (
    <PageShell>
      <div className="mt-16 text-center">
        <div className="text-5xl">🗺️</div>
        <h1 className="mt-3 font-display text-2xl font-extrabold">迷子になりました… You&apos;re lost!</h1>
        <p className="mt-1 text-sm text-ink-soft">That story or episode doesn&apos;t exist.</p>
        <Button href="/" className="mt-5">
          Back to stories
        </Button>
      </div>
    </PageShell>
  );
}
