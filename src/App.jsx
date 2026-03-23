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

  // AUTH
  useEffect(() => {
    onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setupUser(u);
      }
    });
  }, []);

  // 🔄 REALTIME
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

    if (me.following?.includes(targetId)) return;

    await updateDoc(doc(db, "users", user.uid), {
      following: [...(me.following || []), targetId]
    });

    await updateDoc(doc(db, "users", targetId), {
      followers: [...(target.followers || []), user.uid]
    });

    await addDoc(collection(db, "notifications"), {
      type: "follow",
      to: targetId,
      from: user.displayName
    });
  };

  const myProfile = users.find(u => u.id === user?.uid);

  // 🎨 UI
  const card = {
    background: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16
  };

  const btn = {
    padding: "6px 10px",
    background: "#111",
    color: "white",
    border: "none",
    borderRadius: 8,
    marginTop: 6
  };

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
        placeholder="Write something..."
      />

      <button style={btn} onClick={handlePost}>Post</button>

      <h2>🔔 Notifications</h2>
      {notifications.map((n, i) => (
        <div key={i} style={card}>
          {n.type} from {n.from}
        </div>
      ))}

      <h2>🌍 Feed</h2>

      {posts.map(p => {
        const author = users.find(u => u.id === p.createdBy);

        return (
          <div key={p.id} style={card}>
            <p><b>{author?.name || "User"}</b></p>
            <p>{p.content}</p>
            <p>💎 {p.impact}</p>

            <button style={btn} onClick={() => giveImpact(p)}>
              Impact ⚡
            </button>

            {/* COMMENTS */}
            {comments
              .filter(c => c.postId === p.id)
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