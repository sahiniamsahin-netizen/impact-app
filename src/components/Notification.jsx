export default function Notification({ notifications }) {
  return (
    <>
      <h2>🔔 Notifications</h2>
      {notifications.map((n, i) => (
        <div key={i}>
          {n.type} from {n.from}
        </div>
      ))}
    </>
  );
}