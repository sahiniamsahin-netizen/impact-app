import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";

export default function useRealtime(ref) {
  const [data, setData] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(ref, (snap) => {
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [ref]);

  return data;
}