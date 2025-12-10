function HeaderBar({ isConnected }) {
  return (
    <header className="bg-gradient-to-r from-[#0f1429] via-[#101739] to-[#0f1429] border-b border-[#1a1f3a] px-6 py-5 shadow-lg shadow-black/30">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Cardano Live Explorer
          </h1>
          <p className="text-sm text-gray-300/90">
            Real-time data streamed from your node
          </p>
        </div>
        <div className="flex items-center gap-3 px-3 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur">
          <span
            className={`w-3 h-3 rounded-full ${
              isConnected ? "bg-emerald-400" : "bg-rose-400"
            } animate-pulse`}
          />
          <span className="text-sm text-gray-100 font-medium">
            {isConnected ? "Live" : "Disconnected"}
          </span>
        </div>
      </div>
    </header>
  );
}

export default HeaderBar;

