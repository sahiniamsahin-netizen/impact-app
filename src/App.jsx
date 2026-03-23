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
  const [users, setUsers] = useState([]);
  const [comments, setComments] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [text, setText] = useState("");
  const [commentText, setCommentText] = useState({});
  const [typing, setTyping] = useState(false);

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
        credibility: 1,
        impactPoints: 0,
        followers: 0,
        following: [],
        online: true
      });
    }
  };

  // 🔄 AUTH
  useEffect(() => {
    onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setupUser(u);

        updateDoc(doc(db, "users", u.uid), { online: true });
      }
    });

    return () => {
      if (user) {
        updateDoc(doc(db, "users", user.uid), { online: false });
      }
    };
  }, []);

  // ⚡ REAL-TIME POSTS
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "posts"), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPosts(data);
    });
    return () => unsub();
  }, []);

  // ⚡ USERS
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(data);
    });
    return () => unsub();
  }, []);

  // ⚡ COMMENTS
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "comments"), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setComments(data);
    });
    return () => unsub();
  }, []);

  // ⚡ NOTIFICATIONS
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      where("to", "==", user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => d.data());
      setNotifications(data);
    });

    return () => unsub();
  }, [user]);

  // ✍️ POST
  const handlePost = async () => {
    if (!user) return;
    if (!text.trim()) return;

    await addDoc(collection(db, "posts"), {
      content: text,
      impact: 0,
      createdBy: user.uid,
      impactedBy: [],
      createdAt: new Date()
    });

    setText("");
    setTyping(false);
  };

  // ⚡ IMPACT
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
      from: user.displayName,
      createdAt: new Date()
    });
  };

  // 💬 COMMENT
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

  // 👥 FOLLOW
  const followUser = async (targetId) => {
    if (!user) return;

    const me = users.find(u => u.id === user.uid);

    if (me.following?.includes(targetId)) return;

    await updateDoc(doc(db, "users", user.uid), {
      following: [...(me.following || []), targetId]
    });

    await updateDoc(doc(db, "users", targetId), {
      followers: increment(1)
    });
  };

  // 🔥 TRENDING
  const trendingPosts = [...posts]
    .sort((a, b) => (b.impact || 0) - (a.impact || 0))
    .slice(0, 3);

  const publicPosts = posts.filter(p => p.createdBy !== user?.uid);

  const onlineUsers = users.filter(u => u.online);

  // 🎨 UI
  const card = {
    background: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
  };

  const btn = {
    padding: "6px 10px",
    borderRadius: 8,
    border: "none",
    background: "#111827",
    color: "white",
    marginTop: 6,
    cursor: "pointer"
  };

  return (
    <div style={{
      padding: 20,
      maxWidth: 500,
      margin: "auto",
      background: "#f9fafb",
      minHeight: "100vh"
    }}>

      <h1>🧠 App</h1>

      {!user ? (
        <button style={btn} onClick={login}>Login</button>
      ) : (
        <>
          <p>👤 {user.displayName}</p>
          <button style={btn} onClick={logout}>Logout</button>
        </>
      )}

      {/* 🟢 ONLINE */}
      <h3>🟢 Online: {onlineUsers.length}</h3>

      {/* ✍️ POST */}
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setTyping(true);
        }}
        style={{ width: "100%", padding: 10 }}
      />

      {typing && <p>✍️ Typing...</p>}

      <button style={btn} onClick={handlePost}>Post</button>

      {/* 🔔 */}
      <h2>🔔 Notifications</h2>
      {notifications.map((n, i) => (
        <div key={i} style={card}>
          {n.type} from {n.from}
        </div>
      ))}

      {/* 🔥 TRENDING */}
      <h2>🔥 Trending</h2>
      {trendingPosts.map(p => (
        <div key={p.id} style={card}>
          <p>{p.content}</p>
          <p>💎 {p.impact}</p>
        </div>
      ))}

      {/* 🌍 PUBLIC */}
      <h2>🌍 Public</h2>
      {publicPosts.map(p => {
        const author = users.find(u => u.id === p.createdBy);

        return (
          <div key={p.id} style={card}>
            <p>{p.content}</p>
            <p>💎 {p.impact}</p>

            <button style={btn} onClick={() => giveImpact(p.id, p)}>
              Impact ⚡
            </button>

            {/* COMMENTS */}
            {comments
              .filter(c => c.postId === p.id)
              .map(c => {
                const name =
                  users.find(u => u.id === c.userId)?.name || "User";
                return (
                  <div key={c.id}>
                    💬 {name}: {c.text}
                  </div>
                );
              })}

            <input
              value={commentText[p.id] || ""}
              onChange={(e) =>
                setCommentText(prev => ({
                  ...prev,
                  [p.id]: e.target.value
                }))
              }
              placeholder="Reply..."
            />

            <button style={btn} onClick={() => addComment(p.id)}>
              Reply
            </button>

            {p.createdBy !== user?.uid && (
              <button style={btn} onClick={() => followUser(p.createdBy)}>
                Follow
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}