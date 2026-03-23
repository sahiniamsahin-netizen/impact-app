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
  getDoc
} from "firebase/firestore";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from "firebase/auth";

export default function App() {
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState("");
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
    const userRef = doc(db, "users", u.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      await setDoc(userRef, {
        name: u.displayName,
        credibility: 1,
        impactPoints: 0,
        streak: 1
      });
      setCredibility(1);
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
  }, []);

  // 📥 FETCH POSTS
  const fetchPosts = async () => {
    const snapshot = await getDocs(collection(db, "posts"));
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));
    setPosts(data);
  };

  // ✍️ CREATE POST
  const handlePost = async () => {
    if (!user) {
      alert("Login first 😏");
      return;
    }

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

  // ⚡ GIVE IMPACT
  const giveImpact = async (id, p) => {
    if (!user) {
      alert("Login first 😏");
      return;
    }

    // ❌ self boost block
    if (p.createdBy === user.uid) {
      alert("You can't support your own thought 😏");
      return;
    }

    // ❌ multiple click block
    if (p.impactedBy?.includes(user.uid)) {
      alert("Already supported 😏");
      return;
    }

    const postRef = doc(db, "posts", id);
    const userRef = doc(db, "users", user.uid);

    const impactValue = Math.max(1, Math.floor(credibility * 5));

    await updateDoc(postRef, {
      impact: increment(impactValue),
      impactedBy: [...(p.impactedBy || []), user.uid]
    });

    await updateDoc(userRef, {
      impactPoints: increment(1),
      credibility: increment(0.05)
    });

    fetchPosts();
  };

  // 🧠 SPLIT FEED

  const myPosts = posts.filter(p => p.createdBy === user?.uid);

  let publicPosts = posts.filter(p => p.createdBy !== user?.uid);

  // 🔥 SMART SORT (fresh + impact)
  publicPosts.sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();

    const scoreA = (a.impact || 0) * 1000 + timeA;
    const scoreB = (b.impact || 0) * 1000 + timeB;

    return scoreB - scoreA;
  });

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif", maxWidth: 600, margin: "auto" }}>
      
      <h1>🧠 Your App</h1>

      {!user ? (
        <button onClick={login}>Login with Google</button>
      ) : (
        <p>
          👤 {user.displayName} | Cred: {credibility.toFixed(2)}
        </p>
      )}

      {/* POST BOX */}
      <textarea
        placeholder="Write something meaningful..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ width: "100%", padding: 10 }}
      />

      <button onClick={handlePost} style={{ marginTop: 10 }}>
        Post
      </button>

      {/* 🟢 MY SPACE */}
      <h2 style={{ marginTop: 30 }}>🧠 My Space</h2>

      {myPosts.map((p) => (
        <div key={p.id} style={{ marginBottom: 20, padding: 10, border: "1px solid #ddd" }}>
          <p>{p.content}</p>
          <p>💎 {p.impact}</p>
        </div>
      ))}

      {/* 🌍 PUBLIC SPACE */}
      <h2 style={{ marginTop: 30 }}>🌍 Public Space</h2>

      {publicPosts.map((p) => (
        <div key={p.id} style={{ marginBottom: 20, padding: 10, border: "1px solid #ddd" }}>
          
          {Date.now() - new Date(p.createdAt).getTime() < 600000 && (
            <span>🔥 New Thought</span>
          )}

          <p>{p.content}</p>
          <p>💎 {p.impact}</p>

          <button onClick={() => giveImpact(p.id, p)}>
            Support Thought 🌱
          </button>
        </div>
      ))}
    </div>
  );
}