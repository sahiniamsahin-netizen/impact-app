import { useState, useEffect } from "react";
import { db } from "./firebase";
import PostCard from "./components/PostCard";

import { collection, onSnapshot } from "firebase/firestore";

export default function App() {
  const [posts, setPosts] = useState([]);

  // 🔥 ONLY POSTS (no extra complexity)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "posts"), (snap) => {
      const data = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setPosts(data);
    });

    return () => unsub();
  }, []);

  // 🛑 SAFE GUARD
  if (!Array.isArray(posts)) return null;

  if (posts.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center">
        No posts yet
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center bg-[#f3efe7]">
      <PostCard post={posts[0]} />
    </div>
  );
}