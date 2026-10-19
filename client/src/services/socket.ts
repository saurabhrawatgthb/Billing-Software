import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

const SOCKET_BASE_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.VITE_API_URL
    ? String(import.meta.env.VITE_API_URL).replace(/\/api\/?$/, "")
    : typeof window !== "undefined"
      ? window.location.port === "5000"
        ? window.location.origin
        : `${window.location.protocol}//${window.location.hostname}:5000`
      : "http://localhost:5000");

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_BASE_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionAttempts: Infinity,
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
  if (!franchiseId) return;
  const s = getSocket();
  s.emit("join-franchise", franchiseId);
}

export function joinSuperAdminRoom() {
  const s = getSocket();
  s.emit("join-super-admin");
}

export function joinStationRoom(franchiseId: string, stationId: string) {
  if (!franchiseId || !stationId) return;
  const s = getSocket();
  s.emit("join-station", { franchiseId, stationId });
}
