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

  const [user, setUser] = useState(null);
  const [credibility, setCredibility] = useState(1);

  const auth = getAuth();

  // 🔐 LOGIN / LOGOUT
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
        following: []
      });
    } else {
      setCredibility(snap.data().credibility || 1);
    }
  };

  // 📥 FETCH FUNCTIONS
  const fetchPosts = async () => {
    const snap = await getDocs(collection(db, "posts"));
    setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const fetchUsers = async () => {
    const snap = await getDocs(collection(db, "users"));
    setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const fetchComments = async () => {
    const snap = await getDocs(collection(db, "comments"));
    setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const fetchNotifications = async () => {
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      where("to", "==", user.uid)
    );

    const snap = await getDocs(q);
    setNotifications(snap.docs.map(d => d.data()));
  };

  // 🔄 INIT
  useEffect(() => {
    onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setupUser(u);
      }
    });

    fetchPosts();
    fetchUsers();
    fetchComments();
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  // ✍️ POST
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

  // ⚡ IMPACT
  const giveImpact = async (id, p) => {
    if (!user) return;

    if (p.createdBy === user.uid) return alert("No self boost");

    if (p.impactedBy?.includes(user.uid))
      return alert("Already supported");

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

    fetchPosts();
    fetchNotifications();
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
    fetchComments();
  };

  // 👥 FOLLOW
  const followUser = async (targetId) => {
    if (!user) return;

    const myRef = doc(db, "users", user.uid);
    const targetRef = doc(db, "users", targetId);

    const me = users.find(u => u.id === user.uid);

    if (me.following?.includes(targetId)) return;

    await updateDoc(myRef, {
      following: [...(me.following || []), targetId]
    });

    await updateDoc(targetRef, {
      followers: increment(1)
    });

    await addDoc(collection(db, "notifications"), {
      type: "follow",
      to: targetId,
      from: user.displayName,
      createdAt: new Date()
    });

    fetchUsers();
  };

  // 🧠 FEEDS
  const myPosts = posts.filter(p => p.createdBy === user?.uid);

  const myProfile = users.find(u => u.id === user?.uid);

  const followingIds = myProfile?.following || [];

  const followingPosts = posts.filter(p =>
    followingIds.includes(p.createdBy)
  );

  const publicPosts = posts.filter(p => p.createdBy !== user?.uid);

  const leaderboard = [...users].sort(
    (a, b) => (b.credibility || 0) - (a.credibility || 0)
  );

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

      {/* POST */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ width: "100%", padding: 10 }}
      />
      <button style={btn} onClick={handlePost}>Post</button>

      {/* 🔔 */}
      <h2>🔔 Notifications</h2>
      {notifications.map((n, i) => (
        <div key={i} style={card}>
          {n.type} from {n.from}
        </div>
      ))}

      {/* 🧠 MY */}
      <h2>🧠 My Space</h2>
      {myPosts.map(p => (
        <div key={p.id} style={card}>
          <p>{p.content}</p>
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

            {/* 💬 COMMENTS */}
            {comments
              .filter(c => c.postId === p.id)
              .map(c => {
                const userName =
                  users.find(u => u.id === c.userId)?.name || "User";
                return (
                  <div key={c.id} style={{ fontSize: 14 }}>
                    💬 {userName}: {c.text}
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

      {/* 🏆 */}
      <h2>🏆 Leaderboard</h2>
      {leaderboard.slice(0, 5).map((u, i) => (
        <div key={u.id} style={card}>
          #{i + 1} {u.name}
        </div>
      ))}
    </div>
  );
}