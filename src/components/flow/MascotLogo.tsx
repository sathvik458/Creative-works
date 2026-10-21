/** Original supplied artwork; clip transparent canvas padding without editing the asset. */
export function MascotLogo({framed=true}:{framed?:boolean}) {
  return (
    <div
      className="mx-auto mb-5 mt-1 w-[264px] max-w-full"
      aria-label="Yap & Learn"
    >
      <div
        className={framed?"relative overflow-hidden rounded-[24px] bg-ink shadow-sm":"relative overflow-hidden"}
        style={{ aspectRatio: "1.43" }}
      >
        <img
          src="/images/brand/yap-learn.png"
          alt="Yap & Learn smiling speech bubble mascot above an open book"
          width={1254}
          height={1254}
          className="absolute h-auto max-w-none"
          style={{ width: "154%", left: "-28%", top: "-61%" }}
        />
      </div>
    </div>
  );
}
