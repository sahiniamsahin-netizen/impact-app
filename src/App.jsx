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
  where
} from "firebase/firestore";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "firebase/auth";

import useRealtime from "./hooks/useRealtime";
import Navbar from "./components/Navbar";
import PostCard from "./components/PostCard";
import Notification from "./components/Notification";

export default function App() {
  const [text, setText] = useState("");
  const [commentText, setCommentText] = useState({});
  const [user, setUser] = useState(null);

  const auth = getAuth();

  const posts = useRealtime(collection(db, "posts"));
  const comments = useRealtime(collection(db, "comments"));
  const users = useRealtime(collection(db, "users"));

  const [notifications, setNotifications] = useState([]);

  // LOGIN
  const login = async () => {
    const provider = new GoogleAuthProvider();
    const res = await signInWithPopup(auth, provider);
    setUser(res.user);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  // USER SETUP
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

  useEffect(() => {
    onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setupUser(u);
      }
    });
  }, []);

  // NOTIFICATIONS
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      where("to", "==", user.uid)
    );

    return onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => d.data()));
    });
  }, [user]);

  // POST
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

  // IMPACT
  const giveImpact = async (p) => {
    if (!user) return;
    if (p.createdBy === user.uid) return;

    await updateDoc(doc(db, "posts", p.id), {
      impact: (p.impact || 0) + 1,
      impactedBy: [...(p.impactedBy || []), user.uid]
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

  // FOLLOW
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
  };

  return (
    <div style={{ padding: 20, maxWidth: 500, margin: "auto" }}>
      
      <Navbar user={user} login={login} logout={logout} />

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write..."
      />

      <button onClick={handlePost}>Post</button>

      <Notification notifications={notifications} />

      <h2>🌍 Feed</h2>

      {posts.map(p => (
        <PostCard
          key={p.id}
          p={p}
          users={users}
          user={user}
          giveImpact={giveImpact}
          followUser={followUser}
          comments={comments}
          commentText={commentText}
          setCommentText={setCommentText}
          addComment={addComment}
        />
      ))}
    </div>
  );
}