import { useState, useEffect } from "react";
import { db } from "./firebase";

import {
  collection,
  addDoc,
  updateDoc,
  doc,
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
  const [users, setUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [text, setText] = useState("");
  const [commentText, setCommentText] = useState({});
  const [user, setUser] = useState(null);

  const [currentIndex, setCurrentIndex] = useState(0);

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
        followers: [],
        following: []
      });
    }
  };

  // 🔄 AUTH
  useEffect(() => {
    onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setupUser(u);
      }
    });
  }, []);

  // ⚡ REALTIME
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "posts"), (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "comments"), (snap) => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      where("to", "==", user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => d.data()));
    });

    return () => unsub();
  }, [user]);

  // ✍️ POST
  const handlePost = async () => {
    if (!user || !text.trim()) return;

    await addDoc(collection(db, "posts"), {
      content: text,
      impact: 0,
      createdBy: user.uid,
      impactedBy: []
    });

    setText("");
  };

  // ⚡ IMPACT
  const giveImpact = async (p) => {
    if (!user) return;
    if (p.createdBy === user.uid) return;
    if (p.impactedBy?.includes(user.uid)) return;

    await updateDoc(doc(db, "posts", p.id), {
      impact: (p.impact || 0) + 1,
      impactedBy: [...(p.impactedBy || []), user.uid]
    });

    await addDoc(collection(db, "notifications"), {
      type: "impact",
      to: p.createdBy,
      from: user.displayName
    });
  };

  // 💬 COMMENT
  const addComment = async (postId) => {
    if (!user || !commentText[postId]) return;

    await addDoc(collection(db, "comments"), {
      postId,
      text: commentText[postId],
      userId: user.uid
    });

    setCommentText(prev => ({ ...prev, [postId]: "" }));
  };

  // 👥 FOLLOW
  const followUser = async (targetId) => {
    if (!user) return;

    const me = users.find(u => u.id === user.uid);
    const target = users.find(u => u.id === targetId);

    if (me?.following?.includes(targetId)) return;

    await updateDoc(doc(db, "users", user.uid), {
      following: [...(me?.following || []), targetId]
    });

    await updateDoc(doc(db, "users", targetId), {
      followers: [...(target?.followers || []), user.uid]
    });
  };

  const myProfile = users.find(u => u.id === user?.uid);

  // 🎨 UI
  const card = {
    background: "white",
    padding: 20,
    borderRadius: 16,
    minHeight: "300px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center"
  };

  const btn = {
    padding: "6px 10px",
    background: "#111",
    color: "white",
    border: "none",
    borderRadius: 8,
    marginTop: 6
  };

  const currentPost = posts[currentIndex];

  return (
    <div style={{ padding: 20, maxWidth: 500, margin: "auto" }}>
      <h1>🧠 Think App</h1>

      {!user ? (
        <button style={btn} onClick={login}>Login</button>
      ) : (
        <>
          <p>👤 {user.displayName}</p>
          <button style={btn} onClick={logout}>Logout</button>

          <h3>Followers: {myProfile?.followers?.length || 0}</h3>
          <h3>Following: {myProfile?.following?.length || 0}</h3>
        </>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write..."
      />

      <button style={btn} onClick={handlePost}>Post</button>

      <h2>🔔 Notifications</h2>
      {notifications.map((n, i) => (
        <div key={i}>{n.type} from {n.from}</div>
      ))}

      <h2>🧠 Focus Mode</h2>

      {currentPost && (
        <div style={card}>
          <p><b>{users.find(u => u.id === currentPost.createdBy)?.name}</b></p>
          <p style={{ fontSize: 18 }}>{currentPost.content}</p>
          <p>💎 {currentPost.impact}</p>

          <button style={btn} onClick={() => giveImpact(currentPost)}>
            Impact ⚡
          </button>

          {/* COMMENTS */}
          {comments
            .filter(c => c.postId === currentPost.id)
            .map(c => {
              const u = users.find(x => x.id === c.userId);
              return (
                <div key={c.id}>
                  💬 {u?.name}: {c.text}
                </div>
              );
            })}

          <input
            placeholder="Reply..."
            value={commentText[currentPost.id] || ""}
            onChange={(e) =>
              setCommentText(prev => ({
                ...prev,
                [currentPost.id]: e.target.value
              }))
            }
          />

          <button style={btn} onClick={() => addComment(currentPost.id)}>
            Reply
          </button>

          {currentPost.createdBy !== user?.uid && (
            <button style={btn} onClick={() => followUser(currentPost.createdBy)}>
              Follow
            </button>
          )}
        </div>
      )}

      {/* NAVIGATION */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
        <button
          style={btn}
          onClick={() =>
            setCurrentIndex(i => (i > 0 ? i - 1 : i))
          }
        >
          ⬆ Prev
        </button>

        <button
          style={btn}
          onClick={() =>
            setCurrentIndex(i =>
              i < posts.length - 1 ? i + 1 : i
            )
          }
        >
          Next ⬇
        </button>
      </div>
    </div>
  );
}