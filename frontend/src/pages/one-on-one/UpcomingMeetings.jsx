/* // add KHN (Chatgpt)
UpcomingMeetings.jsx */
import { useEffect, useState } from "react";
import {
  getUpcomingMeetings,
  updateMeeting,
  deleteMeeting,
} from "../../services/meetingService";

export default function UpcomingMeetings() {
  const [meetings, setMeetings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    getUpcomingMeetings().then((res) => {
      setMeetings(res.data.data);
    });
  };

  const handleUpdate = async () => {
    await updateMeeting(selected.id, selected);
    setShowModal(false);
    loadData();
  };

  const handleDelete = async () => {
    await deleteMeeting(selected.id);
    setShowConfirm(false);
    setShowModal(false);
    loadData();
  };

  return (
    <div>
      <h2>Upcoming Meetings</h2>

      {meetings.map((m) => (
        <div
          key={m.id}
          style={{
            border: "1px solid gray",
            padding: "10px",
            marginBottom: "10px",
            cursor: "pointer",
          }}
          onClick={() => {
            setSelected({
              ...m,
              scheduledDate: m.scheduledDate?.slice(0, 16),
            });
            setShowModal(true);
          }}
        >
          <p>
            {m.employeeFirstName} {m.employeeLastName}
          </p>
          <p>{m.scheduledDate}</p>
        </div>
      ))}

      {/* EDIT MODAL */}
      {showModal && selected && (
        <div style={modalStyle}>
          <h3>Edit Meeting</h3>

          <input
            type="datetime-local"
            value={selected.scheduledDate}
            onChange={(e) =>
              setSelected({ ...selected, scheduledDate: e.target.value })
            }
          />

          <br />

          <textarea
            value={selected.notes || ""}
            onChange={(e) =>
              setSelected({ ...selected, notes: e.target.value })
            }
          />

          <br />

          <button onClick={handleUpdate}>Submit</button>

          <button
            style={{ background: "red", color: "white", marginLeft: "10px" }}
            onClick={() => setShowConfirm(true)}
          >
            Cancel Meeting
          </button>

          <button onClick={() => setShowModal(false)}>Close</button>
        </div>
      )}

      {/* CONFIRM MODAL */}
      {showConfirm && (
        <div style={modalStyle}>
          <p>Are you sure you want to cancel?</p>

          <button onClick={handleDelete}>Yes</button>
          <button onClick={() => setShowConfirm(false)}>No</button>
        </div>
      )}
    </div>
  );
}

const modalStyle = {
  position: "fixed",
  top: "30%",
  left: "30%",
  background: "white",
  padding: "20px",
  border: "1px solid black",
};