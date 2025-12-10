function BlocksPanel({ blocks, formatTimeAgo, lovelaceToADA }) {
  const renderPool = (pool) => {
    if (!pool) return "Unknown Pool";
    if (typeof pool === "string") return pool;
    try {
      return pool.verificationKey || pool.poolId || JSON.stringify(pool);
    } catch {
      return "Unknown Pool";
    }
  };

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden shadow-xl shadow-black/25">
      <div className="flex flex-wrap items-center justify-between gap-3 px-7 py-5 border-b border-white/10">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-white">Recent Blocks</h2>
          <p className="text-sm text-gray-300/90">Latest 20 received blocks</p>
        </div>
        <span className="text-xs text-gray-200 bg-white/10 px-3 py-1.5 rounded-full border border-white/15">
          Showing {Math.min(blocks.length, 20)} items
        </span>
      </div>

      <div className="overflow-x-auto">
        {blocks.length === 0 ? (
          <div className="px-8 py-14 text-center text-base text-gray-300">
            Waiting for live block data...
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-white/5">
              <tr>
                <th className="px-7 py-3 text-[13px] font-semibold text-gray-100 uppercase tracking-[0.1em]">
                  Block
                </th>
                <th className="px-7 py-3 text-[13px] font-semibold text-gray-100 uppercase tracking-[0.1em]">
                  Epoch / Slot
                </th>
                <th className="px-7 py-3 text-[13px] font-semibold text-gray-100 uppercase tracking-[0.1em]">
                  Pool
                </th>
                <th className="px-7 py-3 text-[13px] font-semibold text-gray-100 uppercase tracking-[0.1em]">
                  TX Count
                </th>
                <th className="px-7 py-3 text-[13px] font-semibold text-gray-100 uppercase tracking-[0.1em]">
                  Output (ADA)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {blocks.map((block, index) => (
                <tr
                  key={`${block.id}-${index}`}
                  className="hover:bg-white/5 transition-colors"
                >
                  <td className="px-7 py-5 align-top">
                    <div className="text-base font-semibold text-white">
                      {block.height}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {formatTimeAgo(block.timestamp)}
                    </div>
                  </td>
                  <td className="px-7 py-5 align-top">
                    <span className="text-sm text-gray-200">
                      {block.epoch} / {block.slot}
                    </span>
                  </td>
                  <td className="px-7 py-5 align-top">
                    <span className="text-sm text-gray-200" title={renderPool(block.pool)}>
                      {renderPool(block.pool)}
                    </span>
                  </td>
                  <td className="px-7 py-5 align-top">
                    <span className="text-base text-white font-semibold">
                      {block.transactionCount}
                    </span>
                  </td>
                  <td className="px-7 py-5 align-top">
                    <span className="text-base text-white font-semibold">
                      {lovelaceToADA(block.totalOutput.toString())} ADA
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default BlocksPanel;

