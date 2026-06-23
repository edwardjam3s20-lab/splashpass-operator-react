export function ScanScreen() {
  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-white/[0.05] bg-bg/90 px-4 pb-3 pt-12 backdrop-blur-xl">
        <h2 className="font-display text-xl font-extrabold text-text">Scan</h2>
      </div>
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-sm text-muted">QR scanner — coming next.</p>
      </div>
    </div>
  )
}
