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
  const [clicked, setClicked] = useState(false);
  const [showComments, setShowComments] = useState(false);

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

  // ⚡ USER MAP (performance boost)
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  // 🧠 ALGORITHM (impact + freshness)
  const sortedPosts = [...posts].sort((a, b) => {
    const scoreA = (a.impact || 0) - (Date.now() - (a.createdAt || 0)) * 0.000001;
    const scoreB = (b.impact || 0) - (Date.now() - (b.createdAt || 0)) * 0.000001;
    return scoreB - scoreA;
  });

  const currentPost = sortedPosts[currentIndex];

  // ✍️ POST
  const handlePost = async () => {
    if (!user || !text.trim()) return;

    await addDoc(collection(db, "posts"), {
      content: text,
      impact: 0,
      createdBy: user.uid,
      impactedBy: [],
      createdAt: Date.now()
    });

    setText("");
  };

  // ⚡ IMPACT
  const giveImpact = async (p) => {
    if (!user) return;
    if (p.createdBy === user.uid) return;
    if (p.impactedBy?.includes(user.uid)) return;

    setClicked(true);
    setTimeout(() => setClicked(false), 200);

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

  // 📱 SWIPE
  let startY = 0;

  const handleTouchStart = (e) => {
    startY = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    const endY = e.changedTouches[0].clientY;
    const diff = startY - endY;

    if (diff > 50) {
      setCurrentIndex(i => i < sortedPosts.length - 1 ? i + 1 : i);
    } else if (diff < -50) {
      setCurrentIndex(i => i > 0 ? i - 1 : i);
    }
  };

  // 🎨 UI
  const card = {
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(10px)",
    padding: 20,
    borderRadius: 20,
    color: "white",
    height: "70vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    boxShadow: "0 0 20px rgba(0,0,0,0.3)"
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
    <div style={{ padding: 20, maxWidth: 500, margin: "auto", background: "#0f0f0f", minHeight: "100vh" }}>
      <h1 style={{ color: "white" }}>🧠 Think App</h1>

      {!user ? (
        <button style={btn} onClick={login}>Login</button>
      ) : (
        <>
          <p style={{ color: "white" }}>👤 {user.displayName}</p>
          <button style={btn} onClick={logout}>Logout</button>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write..."
          />
          <button style={btn} onClick={handlePost}>Post</button>
        </>
      )}

      <h3 style={{ color: "white" }}>🔔 Notifications</h3>
      {notifications.map((n, i) => (
        <div key={i} style={{ color: "white" }}>
          {n.type} from {n.from}
        </div>
      ))}

      {/* SWIPE AREA */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {currentPost && (
          <div style={card}>
            <p><b>{userMap[currentPost.createdBy]?.name}</b></p>
            <p style={{ fontSize: 20 }}>{currentPost.content}</p>
            <p>💎 {currentPost.impact}</p>

            <button
              style={{
                ...btn,
                transform: clicked ? "scale(1.2)" : "scale(1)",
                transition: "0.2s"
              }}
              onClick={() => giveImpact(currentPost)}
            >
              ⚡ Impact
            </button>

            <button style={btn} onClick={() => setShowComments(!showComments)}>
              💬 Comments
            </button>

            {showComments && (
              <>
                {comments
                  .filter(c => c.postId === currentPost.id)
                  .map(c => (
                    <div key={c.id}>
                      💬 {userMap[c.userId]?.name}: {c.text}
                    </div>
                  ))}

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
              </>
            )}

            {currentPost.createdBy !== user?.uid && (
              <button style={btn} onClick={() => followUser(currentPost.createdBy)}>
                Follow
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}