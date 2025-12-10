const ogmios = require("@cardano-ogmios/client");

const OGMIOS_HOST = "localhost";
const OGMIOS_PORT = 1337;

async function startChainSync(onNewBlock) {
  console.log(`🚀 Connecting to Ogmios at ws://${OGMIOS_HOST}:${OGMIOS_PORT}`);

  // 1. Build connection object (this tells Ogmios how to open WS)
  const connection = ogmios.createConnectionObject({
    host: OGMIOS_HOST,
    port: OGMIOS_PORT,
    tls: false,
  });

  // 2. Build interaction context (manages WS handshake + protocol)
  const context = await ogmios.createInteractionContext(
    (err) => {
      console.error("❌ WS Error:", err);
    },
    (code, reason) => {
      console.log("🔌 WS Closed:", code, reason);
    },
    { connection }
  );

  console.log("🟢 Connected! Creating ChainSync client…");

  // 3. Create ChainSync client using v6 API
  const chainSync = await ogmios.createChainSynchronizationClient(
    context,
    {
      /**
       * When a new block arrives
       */
      rollForward: async (response, next) => {
        const block = response.block;
        // console.log("Raw block:", block);

        onNewBlock(block, next);
        // console.log("\n📦 NEW BLOCK");
        // console.log("Block Height:", block.height);
        // console.log("Slot:", block.slot);
        // console.log("TX Count:", block.transactions?.length || 0);
        // console.log("Block Hash:", block.id.substring(0, 20) + "...");

        // block.transactions?.forEach((tx, index) => {
        //   console.log(`  TX #${index + 1}`);
        //   console.log("    ID:", tx.id);

        //   console.log("    Fee:", tx.fee.ada.lovelace ?? "N/A");
        //   const feeLovelace = BigInt(tx.fee.ada.lovelace);
        //   const feeADA = Number(feeLovelace) / 1_000_000;
        //   console.log("Fee in Lovelace:", feeLovelace.toString());
        //   console.log("Fee in ADA:", feeADA);
        //   console.log("    Inputs:", tx.inputs?.length ?? 0);
        //   console.log("    Outputs:", tx.outputs?.length ?? 0);
        //   console.log(
        //     "    Minted Tokens:",
        //     tx.mint ? Object.keys(tx.mint) : "None"
        //   );
        // });

        next(); // request next block
      },

      /**
       * When the chain rolls back (fork)
       */
      rollBackward: async (response, next) => {
        console.log("\n🔄 ROLLBACK OCCURRED");
        console.log("New Tip:", response.point);
        next();
      },
    },
    { sequential: true } // ensures ordered messages
  );

  console.log("🔗 Starting ChainSync…");

  // 4. Start chain sync
  await chainSync.resume(); // resume from current tip
}

module.exports = startChainSync;
