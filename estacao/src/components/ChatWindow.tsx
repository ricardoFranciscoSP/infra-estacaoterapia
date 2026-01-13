"use client";

import React, { useEffect, useState } from "react";

interface ChatWindowProps {
  isLoggedIn: boolean;
  chatUserId: string;
  setChatUserId: (id: string) => void;
  chatToken: string;
  setChatToken: (token: string) => void;
  handleLogin: () => void;
  handleLogout: () => void;
  peerId: string;
  setPeerId: (id: string) => void;
  chatMessage: string;
  setChatMessage: (msg: string) => void;
  handleSendMessage: () => void;
  chatLogs: string[];
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  isLoggedIn,
  chatUserId,
  setChatUserId,
  chatToken,
  setChatToken,
  handleLogin,
  handleLogout,
  peerId,
  setPeerId,
  chatMessage,
  setChatMessage,
  handleSendMessage,
  chatLogs,
}) => {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div style={{ width: "350px", display: "flex", flexDirection: "column", gap: "10px" }}>
      <h3>Chat da Sala</h3>
      {!isLoggedIn ? (
        <>
          <div>
            <label>UserID: </label>
            <input type="text" value={chatUserId} onChange={e => setChatUserId(e.target.value)} placeholder="Seu user ID" />
          </div>
          <div>
            <label>Token: </label>
            <input type="text" value={chatToken} onChange={e => setChatToken(e.target.value)} placeholder="Seu token" />
          </div>
          <button onClick={handleLogin}>Entrar no chat</button>
        </>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Bem-vindo, {chatUserId}</span>
            <button onClick={handleLogout}>Sair</button>
          </div>
          <div>
            <label>Destinatário: </label>
            <input type="text" value={peerId} onChange={e => setPeerId(e.target.value)} placeholder="User ID do destinatário" />
          </div>
          <div style={{ display: "flex", gap: "5px" }}>
            <input type="text" value={chatMessage} onChange={e => setChatMessage(e.target.value)} placeholder="Digite sua mensagem" style={{ flex: 1 }} />
            <button onClick={handleSendMessage}>Enviar</button>
          </div>
        </>
      )}
      <div style={{ height: "200px", overflowY: "auto", border: "1px solid #ccc", padding: "8px", background: "#fafafa" }}>
        {isMounted && chatLogs.map((log, idx) => (
          <div key={idx} style={{ fontSize: "0.95em" }}>{log}</div>
        ))}
      </div>
    </div>
  );
};

export default ChatWindow;
