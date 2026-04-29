// import { useEffect, useState } from "react";
// import axios from 'axios';
//
//
// export default function Notifications() {
//   const [data, setData] = useState([]);
//
//   useEffect(() => {
//     axios.get("/notifications").then((res) => {
//       setData(res.data.content || []);
//     });
//   }, []);
//
//   return (
//     <div>
//       <h2>Notifications</h2>
//
//       {data.map((n) => (
//         <div
//           key={n.id}
//           style={{
//             border: "1px solid gray",
//             padding: "10px",
//             marginBottom: "10px",
//           }}
//         >
//           <b>{n.title}</b>
//           <p>{n.message}</p>
//         </div>
//       ))}
//     </div>
//   );
// }


// import { useEffect, useState } from "react";
// import api from "../services/api";
//
// export default function Notifications() {
//   const [data, setData] = useState([]);
//
//   useEffect(() => {
//     load();
//   }, []);
//
//   const load = async () => {
//     try {
//       const res = await api.get("/notifications");
//
//       const list =
//         Array.isArray(res.data) ? res.data :
//         Array.isArray(res.data.data) ? res.data.data :
//         Array.isArray(res.data.content) ? res.data.content :
//         [];
//
//       setData(list);
//     } catch (err) {
//       console.error("Failed to load notifications:", err);
//       setData([]);
//     }
//   };
//
//   return (
//     <div style={{ padding: "24px" }}>
//       <h2>Notifications</h2>
//
//       {data.length === 0 ? (
//         <p>No notifications found.</p>
//       ) : (
//         data.map((n) => (
//           <div
//             key={n.id}
//             style={{
//               borderBottom: "1px solid #ddd",
//               padding: "12px 0",
//             }}
//           >
//             <strong>{n.title}</strong>
//             <p>{n.message}</p>
//             <small>{n.createdAt}</small>
//           </div>
//         ))
//       )}
//     </div>
//   );
// }

import { useEffect, useState } from "react";
import api from "../services/api";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const res = await api.get("/notifications");

      const list =
        Array.isArray(res.data) ? res.data :
        Array.isArray(res.data.data) ? res.data.data :
        Array.isArray(res.data.content) ? res.data.content :
        [];

      setNotifications(list);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setNotifications([]);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      await load();
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  return (
    <div style={{ padding: "28px" }}>
      <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 18 }}>
        Notifications
      </h2>

      {notifications.length === 0 ? (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: 20,
          }}
        >
          No notifications found.
        </div>
      ) : (
        notifications.map((n) => (
          <button
            key={n.id}
            onClick={() => markAsRead(n.id)}
            style={{
              width: "100%",
              textAlign: "left",
              background: n.isRead ? "#fff" : "#eff6ff",
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              padding: 16,
              marginBottom: 12,
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>{n.title}</strong>
              {!n.isRead && (
                <span
                  style={{
                    background: "#fef3c7",
                    color: "#92400e",
                    borderRadius: 999,
                    padding: "3px 10px",
                    fontSize: 12,
                  }}
                >
                  Unread
                </span>
              )}
            </div>

            <p style={{ margin: "8px 0", color: "#374151" }}>{n.message}</p>

            <small style={{ color: "#6b7280" }}>
              {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
            </small>
          </button>
        ))
      )}
    </div>
  );
}