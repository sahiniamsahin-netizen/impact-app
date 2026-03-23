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

  const auth = getAuth();

  // 🔐 LOGIN
  const login = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    setUser(result.user);
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

  // 📥 POSTS
  const fetchPosts = async () => {
    const snap = await getDocs(collection(db, "posts"));
    setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  // 👥 USERS
  const fetchUsers = async () => {
    const snap = await getDocs(collection(db, "users"));
    setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  // 🔔 NOTIFICATIONS
  const fetchNotifications = async () => {
    if (!user) return;
    const q = query(
      collection(db, "notifications"),
      where("to", "==", user.uid)
    );
    const snap = await getDocs(q);
    setNotifications(snap.docs.map(d => d.data()));
  };

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

    const postRef = doc(db, "posts", id);

    await updateDoc(postRef, {
      impact: increment(1),
      impactedBy: [...(p.impactedBy || []), user.uid]
    });

    // 🔔 notify owner
    await addDoc(collection(db, "notifications"), {
      type: "impact",
      to: p.createdBy,
      from: user.uid,
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
  };

  // 👥 FOLLOW
  const followUser = async (targetId) => {
    if (!user) return;

    const myRef = doc(db, "users", user.uid);

    const me = users.find(u => u.id === user.uid);

    if (me.following?.includes(targetId)) return;

    await updateDoc(myRef, {
      following: [...(me.following || []), targetId]
    });

    // 🔔 notify
    await addDoc(collection(db, "notifications"), {
      type: "follow",
      to: targetId,
      from: user.uid,
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

  // 🏆 LEADERBOARD
  const leaderboard = [...users].sort(
    (a, b) => (b.credibility || 0) - (a.credibility || 0)
  );

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "auto" }}>
      <h1>🔥 Your App</h1>

      {!user ? (
        <button onClick={login}>Login</button>
      ) : (
        <p>👤 {user.displayName}</p>
      )}

      {/* POST */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button onClick={handlePost}>Post</button>

      {/* 🔔 NOTIFICATIONS */}
      <h2>🔔 Notifications</h2>
      {notifications.map((n, i) => (
        <div key={i}>
          {n.type} from {n.from}
        </div>
      ))}

      {/* MY */}
      <h2>🧠 My Space</h2>
      {myPosts.map(p => (
        <div key={p.id}>
          <p>{p.content}</p>
        </div>
      ))}

      {/* FOLLOWING */}
      <h2>👥 Following</h2>
      {followingPosts.map(p => (
        <div key={p.id}>
          <p>{p.content}</p>
        </div>
      ))}

      {/* PUBLIC */}
      <h2>🌍 Public</h2>
      {publicPosts.map(p => (
        <div key={p.id}>
          <p>{p.content}</p>

          <button onClick={() => giveImpact(p.id, p)}>
            Support
          </button>

          {/* 💬 COMMENTS */}
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
          <button onClick={() => addComment(p.id)}>Reply</button>

          {/* 👥 FOLLOW */}
          {p.createdBy !== user?.uid && (
            <button onClick={() => followUser(p.createdBy)}>
              Follow
            </button>
          )}
        </div>
      ))}

      {/* PROFILE */}
      <h2>👤 Profile</h2>
      {myProfile && (
        <div>
          <p>Cred: {myProfile.credibility}</p>
          <p>Points: {myProfile.impactPoints}</p>
        </div>
      )}

      {/* LEADERBOARD */}
      <h2>🏆 Leaderboard</h2>
      {leaderboard.slice(0, 5).map((u, i) => (
        <div key={u.id}>
          #{i + 1} {u.name}
        </div>
      ))}
    </div>
  );
}