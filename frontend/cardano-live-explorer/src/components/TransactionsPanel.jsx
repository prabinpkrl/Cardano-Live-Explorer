function TransactionsPanel({
  transactions,
  truncateHash,
  formatTimeAgo,
  lovelaceToADA,
}) {
  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden shadow-xl shadow-black/25">
      <div className="flex flex-wrap items-center justify-between gap-3 px-7 py-5 border-b border-white/10">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-white">Recent Transactions</h2>
          <p className="text-sm text-gray-300/90">Live stream of the last 20</p>
        </div>
        <span className="text-xs text-gray-200 bg-white/10 px-3 py-1.5 rounded-full border border-white/15">
          Showing {Math.min(transactions.length, 20)} items
        </span>
      </div>

      <div className="overflow-x-auto">
        {transactions.length === 0 ? (
          <div className="px-8 py-14 text-center text-base text-gray-300">
            Waiting for live transaction data...
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-white/5">
              <tr>
                <th className="px-7 py-3 text-[13px] font-semibold text-gray-100 uppercase tracking-[0.1em]">
                  Transaction
                </th>
                <th className="px-7 py-3 text-[13px] font-semibold text-gray-100 uppercase tracking-[0.1em]">
                  Block / Slot
                </th>
                <th className="px-7 py-3 text-[13px] font-semibold text-gray-100 uppercase tracking-[0.1em]">
                  Outputs (first 2)
                </th>
                <th className="px-7 py-3 text-[13px] font-semibold text-gray-100 uppercase tracking-[0.1em]">
                  Output (ADA)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {transactions.map((tx, index) => (
                <tr
                  key={`${tx.id}-${index}`}
                  className="hover:bg-white/5 transition-colors"
                >
                  <td className="px-7 py-5 align-top">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm font-mono text-[#7bb3e0]">
                        {truncateHash(tx.id)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatTimeAgo(tx.timestamp)}
                      </span>
                    </div>
                  </td>
                  <td className="px-7 py-5 align-top">
                    <div className="text-base text-white font-semibold">
                      {tx.blockHeight}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Epoch {tx.epoch} / Slot {tx.slot}
                    </div>
                  </td>
                  <td className="px-7 py-5 align-top">
                    <div className="flex flex-col gap-1.5">
                      {tx.outputAddresses.slice(0, 2).map((addr, idx) => (
                        <span
                          key={idx}
                          className="text-sm font-mono text-gray-100"
                          title={addr}
                        >
                          {addr}
                        </span>
                      ))}
                      {tx.outputAddresses.length > 2 && (
                        <span className="text-xs text-[#7bb3e0]">
                          +{tx.outputAddresses.length - 2} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-7 py-5 align-top">
                    <span className="text-base text-white font-semibold">
                      {lovelaceToADA(tx.totalOutput)} ADA
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

export default TransactionsPanel;

