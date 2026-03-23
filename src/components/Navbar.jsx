export default function Navbar({ user, login, logout }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h1>🧠 Think App</h1>

      {!user ? (
        <button onClick={login}>Login</button>
      ) : (
        <>
          <span>👤 {user.displayName}</span>
          <button onClick={logout}>Logout</button>
        </>
      )}
    </div>
  );
}