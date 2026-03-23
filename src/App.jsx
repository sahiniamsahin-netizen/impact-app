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

  const [text, setText] = useState("");
  const [user, setUser] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const auth = getAuth();

  // LOGIN
  const login = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    setUser(result.user);
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

  // REALTIME
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

  // USER MAP
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  // ALGORITHM
  const sortedPosts = [...posts].sort((a, b) => {
    const scoreA =
      (a.impact || 0) - (Date.now() - (a.createdAt || 0)) * 0.000001;
    const scoreB =
      (b.impact || 0) - (Date.now() - (b.createdAt || 0)) * 0.000001;

    return scoreB - scoreA;
  });

  // 🔥 INDEX FIX (IMPORTANT)
  useEffect(() => {
    if (currentIndex >= sortedPosts.length) {
      setCurrentIndex(0);
    }
  }, [sortedPosts.length]);

  const currentPost = sortedPosts[currentIndex] || null;

  // POST
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

  // IMPACT
  const giveImpact = async (p) => {
    if (!user || !p) return;
    if (p.createdBy === user.uid) return;
    if (p.impactedBy?.includes(user.uid)) return;

    await updateDoc(doc(db, "posts", p.id), {
      impact: (p.impact || 0) + 1,
      impactedBy: [...(p.impactedBy || []), user.uid]
    });
  };

  // COMMENT
  const addComment = async (postId, text) => {
    if (!user || !text) return;

    await addDoc(collection(db, "comments"), {
      postId,
      text,
      userId: user.uid
    });
  };

  // FOLLOW
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

  // KEYBOARD NAV
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

  // EMPTY STATE
  if (!currentPost) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f3efe7]">
        <p className="text-gray-600 mb-4">No posts yet</p>

        {!user ? (
          <button
            onClick={login}
            className="bg-black text-white px-4 py-2 rounded"
          >
            Login
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write first post..."
              className="border px-3 py-2 rounded"
            />
            <button
              onClick={handlePost}
              className="bg-black text-white px-3 py-2 rounded"
            >
              Post
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3efe7] flex flex-col items-center justify-center px-4">

      {user && (
        <div className="absolute top-4 right-6 text-sm text-gray-700">
          👤 {user.displayName}
          <button onClick={logout} className="ml-3 text-red-500">
            Logout
          </button>
        </div>
      )}

      <PostCard
        post={currentPost}
        user={user}
        userMap={userMap}
        comments={comments}
        addComment={addComment}
        followUser={followUser}
        giveImpact={giveImpact}
      />

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