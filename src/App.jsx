import { useEffect, useState } from "react";
import { useRealtime } from "./hooks/useRealtime";
import PostCard from "./components/PostCard";
import { calculateScore } from "./utils/ranking";

export default function App() {
  const { posts } = useRealtime();
  const [sorted, setSorted] = useState([]);

  useEffect(() => {
    if (!posts) return;

    const ranked = [...posts].sort(
      (a, b) => calculateScore(b) - calculateScore(a)
    );

    setSorted(ranked);
  }, [posts]);

  if (!sorted.length) {
    return <div className="h-screen flex items-center justify-center">No posts</div>;
  }

  return (
    <div className="h-screen flex items-center justify-center bg-[#f3efe7]">
      <PostCard post={sorted[0]} />
    </div>
  );
}