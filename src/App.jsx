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
  const [currentPost, setCurrentPost] = useState(null);

  const auth = getAuth();

  // 🔐 LOGIN
  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
    } catch (e) {
      console.error(e);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (e) {
      console.error(e);
    }
  };

  // 👤 USER SETUP
  const setupUser = async (u) => {
    try {
      const ref = doc(db, "users", u.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        await setDoc(ref, {
          name: u.displayName,
          followers: [],
          following: []
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setupUser(u);
      }
    });
    return () => unsub();
  }, []);

  // 🧠 POSTS (SAFE)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "posts"), (snap) => {
      try {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        const sorted = data.sort((a, b) => {
          const scoreA =
            (a?.impact || 0) - (Date.now() - (a?.createdAt || 0)) * 0.000001;
          const scoreB =
            (b?.impact || 0) - (Date.now() - (b?.createdAt || 0)) * 0.000001;

          return scoreB - scoreA;
        });

        setPosts(sorted || []);

        setCurrentPost(prev => {
          if (!prev) return sorted?.[0] || null;

          const stillExists = (sorted || []).find(p => p.id === prev.id);
          return stillExists || sorted?.[0] || null;
        });

      } catch (e) {
        console.error("POST ERROR:", e);
      }
    });

    return () => unsub();
  }, []);

  // 💬 COMMENTS
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "comments"), (snap) => {
      try {
        setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })) || []);
      } catch (e) {
        console.error(e);
      }
    });
    return () => unsub();
  }, []);

  // 👥 USERS
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      try {
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })) || []);
      } catch (e) {
        console.error(e);
      }
    });
    return () => unsub();
  }, []);

  // 🧠 SAFE MAP
  const userMap = Object.fromEntries((users || []).map(u => [u.id, u]));

  // ✍️ POST
  const handlePost = async () => {
    if (!user || !text?.trim()) return;

    try {
      await addDoc(collection(db, "posts"), {
        content: text,
        impact: 0,
        createdBy: user.uid,
        impactedBy: [],
        createdAt: Date.now()
      });

      setText("");
    } catch (e) {
      console.error(e);
    }
  };

  // ⚡ IMPACT
  const giveImpact = async (p) => {
    if (!user || !p) return;
    if (p.createdBy === user.uid) return;
    if (p.impactedBy?.includes(user.uid)) return;

    try {
      await updateDoc(doc(db, "posts", p.id), {
        impact: (p.impact || 0) + 1,
        impactedBy: [...(p.impactedBy || []), user.uid]
      });
    } catch (e) {
      console.error(e);
    }
  };

  // 💬 COMMENT
  const addComment = async (postId, text) => {
    if (!user || !text) return;

    try {
      await addDoc(collection(db, "comments"), {
        postId,
        text,
        userId: user.uid
      });
    } catch (e) {
      console.error(e);
    }
  };

  // 👥 FOLLOW (SAFE)
  const followUser = async (targetId) => {
    if (!user || !(users || []).length) return;

    try {
      const me = (users || []).find(u => u.id === user.uid);
      const target = (users || []).find(u => u.id === targetId);

      if (!me || !target) return;
      if (me.following?.includes(targetId)) return;

      await updateDoc(doc(db, "users", user.uid), {
        following: [...(me.following || []), targetId]
      });

      await updateDoc(doc(db, "users", targetId), {
        followers: [...(target.followers || []), user.uid]
      });
    } catch (e) {
      console.error(e);
    }
  };

  // 🔁 NAVIGATION (ULTRA SAFE)
  const goNext = () => {
    if (!currentPost || !(posts || []).length) return;

    const index = (posts || []).findIndex(p => p.id === currentPost.id);
    if (index === -1) return;

    const next = posts[index + 1];
    if (next) setCurrentPost(next);
  };

  const goPrev = () => {
    if (!currentPost || !(posts || []).length) return;

    const index = (posts || []).findIndex(p => p.id === currentPost.id);
    if (index === -1) return;

    const prev = posts[index - 1];
    if (prev) setCurrentPost(prev);
  };

  // 🛑 HARD GUARD (NO CRASH)
  if (!Array.isArray(posts) || !Array.isArray(users) || !Array.isArray(comments)) {
    return null;
  }

  // EMPTY
  if (!currentPost) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f3efe7]">
        <p className="mb-4">No posts yet</p>

        {!user ? (
          <button onClick={login} className="bg-black text-white px-4 py-2 rounded">
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
            <button onClick={handlePost} className="bg-black text-white px-3 py-2 rounded">
              Post
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3efe7] flex flex-col items-center justify-center">

      <PostCard
        post={currentPost}
        user={user}
        userMap={userMap}
        comments={comments}
        addComment={addComment}
        followUser={followUser}
        giveImpact={giveImpact}
      />

      <div className="mt-6 flex gap-10 text-sm">
        <button onClick={goPrev}>↑ Prev</button>
        <button onClick={goNext}>Next ↓</button>
      </div>
    </div>
  );
}