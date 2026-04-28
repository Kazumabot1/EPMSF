import { useEffect, useState } from "react";
import axios from 'axios';


export default function Notifications() {
  const [data, setData] = useState([]);

  useEffect(() => {
    axios.get("/notifications").then((res) => {
      setData(res.data.content || []);
    });
  }, []);

  return (
    <div>
      <h2>Notifications</h2>

      {data.map((n) => (
        <div
          key={n.id}
          style={{
            border: "1px solid gray",
            padding: "10px",
            marginBottom: "10px",
          }}
        >
          <b>{n.title}</b>
          <p>{n.message}</p>
        </div>
      ))}
    </div>
  );
}