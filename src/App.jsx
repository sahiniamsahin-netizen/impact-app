import { useState, useEffect } from "react";
import { db } from "./firebase";
import PostCard from "./components/PostCard";

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

  // ⚡ USER MAP
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  // 🧠 ALGORITHM (impact + freshness)
  const sortedPosts = [...posts].sort((a, b) => {
    const scoreA =
      (a.impact || 0) - (Date.now() - (a.createdAt || 0)) * 0.000001;
    const scoreB =
      (b.impact || 0) - (Date.now() - (b.createdAt || 0)) * 0.000001;

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
  const addComment = async (postId, text) => {
    if (!user || !text) return;

    await addDoc(collection(db, "comments"), {
      postId,
      text,
      userId: user.uid
    });
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

  // ⌨️ KEYBOARD NAVIGATION
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowDown") {
        setCurrentIndex(i => i < sortedPosts.length - 1 ? i + 1 : i);
      }
      if (e.key === "ArrowUp") {
        setCurrentIndex(i => i > 0 ? i - 1 : i);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [sortedPosts.length]);

  return (
    <div className="min-h-screen bg-[#f3efe7] flex flex-col items-center justify-center px-4">

      {/* LOGIN */}
      {!user ? (
        <button
          onClick={login}
          className="bg-black text-white px-5 py-2 rounded-xl"
        >
          Login
        </button>
      ) : (
        <div className="absolute top-4 right-6 text-sm text-gray-700">
          👤 {user.displayName}
          <button onClick={logout} className="ml-3 text-red-500">
            Logout
          </button>
        </div>
      )}

      {/* POST INPUT */}
      {user && (
        <div className="absolute top-4 left-6 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write something meaningful..."
            className="border px-3 py-2 rounded-lg text-sm bg-white"
          />
          <button
            onClick={handlePost}
            className="bg-black text-white px-3 py-2 rounded-lg"
          >
            Post
          </button>
        </div>
      )}

      {/* POST */}
      {currentPost && (
        <PostCard
          post={currentPost}
          user={user}
          userMap={userMap}
          comments={comments}
          addComment={addComment}
          followUser={followUser}
          giveImpact={giveImpact}
        />
      )}

      {/* NAVIGATION */}
      <div className="mt-6 flex justify-between w-full max-w-2xl text-gray-600 text-sm">
        <button onClick={() => setCurrentIndex(i => i > 0 ? i - 1 : i)}>
          ↑ Previous
        </button>
        <button onClick={() => setCurrentIndex(i => i < sortedPosts.length - 1 ? i + 1 : i)}>
          Next ↓
        </button>
      </div>
    </div>
  );
}