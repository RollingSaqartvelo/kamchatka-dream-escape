export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#f5f2ee] px-6 text-center">
      <div className="font-serif text-3xl tracking-tight text-navy sm:text-5xl">
        Полуостров
      </div>
      <p className="mt-10 max-w-xl font-serif text-2xl text-navy sm:text-3xl">
        Ваш отдых на краю земли ждёт<span className="loading-dots" />
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        Одну секунду — подбираем доступные номера на ваши даты.
      </p>
      <style>{`
        .loading-dots::after {
          content: "";
          display: inline-block;
          width: 1em;
          text-align: left;
          animation: loading-dots 1.4s steps(4, end) infinite;
        }
        @keyframes loading-dots {
          0%, 20% { content: ""; }
          40% { content: "."; }
          60% { content: ".."; }
          80%, 100% { content: "..."; }
        }
      `}</style>
    </div>
  );
}
