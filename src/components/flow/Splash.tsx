"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MascotLogo } from "./MascotLogo";
let splashCompleted = false;
export const hasPassedSplash = () => splashCompleted;
export function Splash() {
  const router = useRouter();
  useEffect(() => {
    const timer = setTimeout(() => {
      splashCompleted = true;
      router.replace("/onboarding");
    }, 3000);
    return () => clearTimeout(timer);
  }, [router]);
  return (
    <main className="splash-screen" aria-label="Language Stories splash">
      <div className="splash-content">
        <MascotLogo framed={false} />
        <h1 className="font-display text-[29px] font-extrabold">
          Language Stories
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed">
          Learn real language.
          <br />
          Live real situations.
        </p>
      </div>
    </main>
  );
}
