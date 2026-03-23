import { useState, useEffect } from "react";
import { db } from "./firebase";

import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  increment,
  setDoc,
  getDoc,
  query,
  where
} from "firebase/firestore";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from "firebase/auth";

export default function App() {
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [text, setText] = useState("");
  const [commentText, setCommentText] = useState({});
  const [user, setUser] = useState(null);
  const [credibility, setCredibility] = useState(1);
  const [dark, setDark] = useState(true);

  const auth = getAuth();

  const login = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    setUser(result.user);
  };

  const setupUser = async (u) => {
    const ref = doc(db, "users", u.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, {
        name: u.displayName,
        credibility: 1,
        impactPoints: 0,
        followers: [],
        following: []
      });
    } else {
      setCredibility(snap.data().credibility || 1);
    }
  };

  useEffect(() => {
    onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setupUser(u);
      }
    });

    fetchPosts();
    fetchUsers();
  }, []);

  const fetchPosts = async () => {
    const snap = await getDocs(collection(db, "posts"));
    setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const fetchUsers = async () => {
    const snap = await getDocs(collection(db, "users"));
    setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const fetchNotifications = async () => {
    if (!user) return;
    const q = query(collection(db, "notifications"), where("to", "==", user.uid));
    const snap = await getDocs(q);
    setNotifications(snap.docs.map(d => d.data()));
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const handlePost = async () => {
    if (!user) return alert("Login first");
    if (!text.trim()) return;

    await addDoc(collection(db, "posts"), {
      content: text,
      impact: 0,
      createdBy: user.uid,
      impactedBy: [],
      createdAt: new Date()
    });

    setText("");
    fetchPosts();
  };

  const giveImpact = async (id, p) => {
    if (!user) return;
    if (p.createdBy === user.uid) return;
    if (p.impactedBy?.includes(user.uid)) return;

    await updateDoc(doc(db, "posts", id), {
      impact: increment(1),
      impactedBy: [...(p.impactedBy || []), user.uid]
    });

    await addDoc(collection(db, "notifications"), {
      type: "impact",
      to: p.createdBy,
      from: user.uid,
      createdAt: new Date()
    });

    fetchPosts();
    fetchNotifications();
  };

  const addComment = async (postId) => {
    if (!user) return;
    const text = commentText[postId];
    if (!text) return;

    await addDoc(collection(db, "comments"), {
      postId,
      text,
      userId: user.uid,
      createdAt: new Date()
    });

    setCommentText(prev => ({ ...prev, [postId]: "" }));
  };

  const followUser = async (targetId) => {
    if (!user) return;

    const myRef = doc(db, "users", user.uid);
    const me = users.find(u => u.id === user.uid);

    if (me.following?.includes(targetId)) return;

    await updateDoc(myRef, {
      following: [...(me.following || []), targetId]
    });

    await addDoc(collection(db, "notifications"), {
      type: "follow",
      to: targetId,
      from: user.uid,
      createdAt: new Date()
    });

    fetchUsers();
  };

  const myPosts = posts.filter(p => p.createdBy === user?.uid);
  const myProfile = users.find(u => u.id === user?.uid);
  const followingIds = myProfile?.following || [];
  const followingPosts = posts.filter(p => followingIds.includes(p.createdBy));
  const publicPosts = posts.filter(p => p.createdBy !== user?.uid);

  const leaderboard = [...users].sort(
    (a, b) => (b.credibility || 0) - (a.credibility || 0)
  );

  const bg = dark ? "#0f172a" : "#f9fafb";
  const textColor = dark ? "#e5e7eb" : "#111827";

  const cardStyle = {
    backdropFilter: "blur(10px)",
    background: dark ? "rgba(255,255,255,0.05)" : "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    border: "1px solid rgba(255,255,255,0.1)"
  };

  const btn = {
    padding: "6px 10px",
    borderRadius: 8,
    border: "none",
    background: "#6366f1",
    color: "white",
    cursor: "pointer",
    marginTop: 6
  };

  return (
    <div style={{
      padding: 20,
      maxWidth: 500,
      margin: "auto",
      background: bg,
      color: textColor,
      minHeight: "100vh"
    }}>

      <h1>🧠 App</h1>

      <button onClick={() => setDark(!dark)} style={btn}>
        Toggle {dark ? "Light" : "Dark"}
      </button>

      {!user ? (
        <button onClick={login} style={btn}>Login</button>
      ) : (
        <p>👤 {user.displayName}</p>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 10,
          marginTop: 10
        }}
      />

      <button onClick={handlePost} style={btn}>Post</button>

      <h2>🔔 Notifications</h2>
      {notifications.map((n, i) => (
        <div key={i} style={cardStyle}>
          {n.type} from {n.from}
        </div>
      ))}

      <h2>🧠 My Space</h2>
      {myPosts.map(p => (
        <div key={p.id} style={cardStyle}>
          <p>{p.content}</p>
        </div>
      ))}

      <h2>👥 Following</h2>
      {followingPosts.map(p => (
        <div key={p.id} style={cardStyle}>
          <p>{p.content}</p>
        </div>
      ))}

      <h2>🌍 Public</h2>
      {publicPosts.map(p => (
        <div key={p.id} style={cardStyle}>
          <p>{p.content}</p>
          <button onClick={() => giveImpact(p.id, p)} style={btn}>Support</button>

          <input
            value={commentText[p.id] || ""}
            onChange={(e) =>
              setCommentText(prev => ({ ...prev, [p.id]: e.target.value }))
            }
            placeholder="Reply..."
            style={{ width: "100%", marginTop: 8 }}
          />
          <button onClick={() => addComment(p.id)} style={btn}>Reply</button>

          {p.createdBy !== user?.uid && (
            <button onClick={() => followUser(p.createdBy)} style={btn}>
              Follow
            </button>
          )}
        </div>
      ))}

      <h2>🏆 Leaderboard</h2>
      {leaderboard.slice(0, 5).map((u, i) => (
        <div key={u.id} style={cardStyle}>
          #{i + 1} {u.name}
        </div>
      ))}
    </div>
  );
}