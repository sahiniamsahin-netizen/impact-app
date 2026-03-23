import { useState, useEffect } from "react";
import { db } from "./firebase";

import {
  collection,
  addDoc,
  updateDoc,
  doc,
  increment,
  setDoc,
  getDoc,
  query,
  where,
  onSnapshot
} from "firebase/firestore";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "firebase/auth";

export default function App() {
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);

  const [text, setText] = useState("");
  const [commentText, setCommentText] = useState({});
  const [user, setUser] = useState(null);

  const auth = getAuth();

  // 🔐 LOGIN
  const login = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    setUser(result.user);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  // 👤 USER SETUP
  const setupUser = async (u) => {
    const ref = doc(db, "users", u.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, {
        name: u.displayName,
        following: [],
        online: true
      });
    }
  };

  // AUTH
  useEffect(() => {
    onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setupUser(u);
      }
    });
  }, []);

  // REALTIME
  useEffect(() => {
    return onSnapshot(collection(db, "posts"), snap =>
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, "comments"), snap =>
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, "users"), snap =>
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      where("to", "==", user.uid)
    );

    return onSnapshot(q, snap =>
      setNotifications(snap.docs.map(d => d.data()))
    );
  }, [user]);

  // POST
  const handlePost = async () => {
    if (!user || !text.trim()) return;

    await addDoc(collection(db, "posts"), {
      content: text,
      impact: 0,
      createdBy: user.uid,
      impactedBy: [],
      createdAt: new Date()
    });

    setText("");
  };

  // IMPACT
  const giveImpact = async (p) => {
    if (!user) return;
    if (p.createdBy === user.uid) return;
    if (p.impactedBy?.includes(user.uid)) return;

    await updateDoc(doc(db, "posts", p.id), {
      impact: increment(1),
      impactedBy: [...(p.impactedBy || []), user.uid]
    });

    await addDoc(collection(db, "notifications"), {
      type: "impact",
      to: p.createdBy,
      from: user.displayName
    });
  };

  // COMMENT
  const addComment = async (postId) => {
    if (!user || !commentText[postId]) return;

    await addDoc(collection(db, "comments"), {
      postId,
      text: commentText[postId],
      userId: user.uid
    });

    setCommentText(prev => ({ ...prev, [postId]: "" }));
  };

  // UI styles
  const card = {
    background: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    boxShadow: "0 2px 6px rgba(0,0,0,0.05)"
  };

  const btn = {
    padding: "6px 10px",
    borderRadius: 8,
    border: "none",
    background: "#111",
    color: "white",
    marginTop: 6
  };

  return (
    <div style={{
      padding: 20,
      maxWidth: 500,
      margin: "auto",
      background: "#f9fafb",
      minHeight: "100vh"
    }}>

      <h1>🧠 ThinkSpace</h1>

      {!user ? (
        <button style={btn} onClick={login}>Login</button>
      ) : (
        <>
          <p>👤 {user.displayName}</p>
          <button style={btn} onClick={logout}>Logout</button>
        </>
      )}

      <textarea
        placeholder="Write 1 honest thought..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ width: "100%", padding: 10 }}
      />

      <button style={btn} onClick={handlePost}>Post</button>

      <h2>🌍 Feed</h2>

      {posts.map(p => (
        <div key={p.id} style={card}>
          <p>{p.content}</p>
          <p>💎 {p.impact}</p>

          <button style={btn} onClick={() => giveImpact(p)}>
            Impact ⚡
          </button>

          {comments
            .filter(c => c.postId === p.id)
            .map(c => (
              <div key={c.id}>💬 {c.text}</div>
            ))}

          <input
            placeholder="Reply..."
            value={commentText[p.id] || ""}
            onChange={(e) =>
              setCommentText(prev => ({
                ...prev,
                [p.id]: e.target.value
              }))
            }
          />

          <button style={btn} onClick={() => addComment(p.id)}>
            Reply
          </button>
        </div>
      ))}
    </div>
  );
}