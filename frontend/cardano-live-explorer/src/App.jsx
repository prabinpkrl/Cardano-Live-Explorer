import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

function App() {
  const [blocks, setBlocks] = useState([]);

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected to backend");
    });

    socket.on("block", (block) => {
      setBlocks((prev) => [block, ...prev].slice(0, 10));
    });

    return () => {
      socket.off("block");
    };
  }, []);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Cardano Live Explorer</h1>

      {blocks.length === 0 ? (
        <p style={styles.waiting}>Waiting for live data...</p>
      ) : (
        <div style={styles.blockList}>
          {blocks.map((block, index) => (
            <div key={index} style={styles.blockCard}>
              <h3>Block #{block.height}</h3>
              <p>
                <strong>Slot:</strong> {block.slot}
              </p>
              <p>
                <strong>Hash:</strong> {block.id}
              </p>
              <p>
                <strong>Transactions:</strong> {block.transactions?.length || 0}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: "30px",
    fontFamily: "Arial, sans-serif",
    background: "#f7f7f7",
    minHeight: "100vh",
  },
  title: {
    textAlign: "center",
    marginBottom: "20px",
  },
  waiting: {
    textAlign: "center",
    fontSize: "18px",
    color: "#888",
  },
  blockList: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
    maxWidth: "600px",
    margin: "auto",
  },
  blockCard: {
    background: "white",
    padding: "15px",
    borderRadius: "10px",
    boxShadow: "rgba(0,0,0,0.1) 0px 2px 6px",
  },
};

export default App;
