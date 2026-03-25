import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";

export function useRealtime() {
  const [posts, setPosts] = useState([]);

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

  return { posts };
}