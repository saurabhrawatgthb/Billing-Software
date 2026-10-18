import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

const SOCKET_BASE_URL = 
  import.meta.env.VITE_SOCKET_URL || 
  (import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).replace(/\/api\/?$/, "") : "http://localhost:5000");

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_BASE_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      try {
        const savedUserStr = localStorage.getItem("rms_user");
        const savedFranchise = localStorage.getItem("rms_selected_franchise");
        if (savedUserStr) {
          const user = JSON.parse(savedUserStr);
          if (user.role === "SUPER_ADMIN") {
            socket?.emit("join-super-admin");
          }
          const fId = savedFranchise || user.franchiseId;
          if (fId) {
            socket?.emit("join-franchise", fId);
          }
        }
      } catch (e) {
        console.error("Error auto-joining socket rooms:", e);
      }
    });
  }
  return socket;
}

export function joinFranchiseRoom(franchiseId: string) {
  const s = getSocket();
  if (s.connected) {
    s.emit("join-franchise", franchiseId);
  }
}

export function joinStationRoom(franchiseId: string, stationId: string) {
  const s = getSocket();
  if (s.connected) {
    s.emit("join-station", { franchiseId, stationId });
  }
}
