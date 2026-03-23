import { useState, useEffect } from "react";
import { db } from "./firebase";
import { auth, provider } from "./firebase";

import {
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  doc,
  increment,
  serverTimestamp,
  query,
  orderBy,
  setDoc,
  getDoc,
} from "firebase/firestore";

import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

function App() {
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState("");
  const [user, setUser] = useState(null);
  const [impactPoints, setImpactPoints] = useState(0);
  const [userCredibility, setUserCredibility] = useState(1);
  const [darkMode, setDarkMode] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [canImpact, setCanImpact] = useState(false);
  const [delayDone, setDelayDone] = useState(false);

  const [streak, setStreak] = useState(0);

  const currentPost = posts[currentIndex];

  // 🔥 Smart feed
  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("score", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPosts(data);
    });

    return () => unsubscribe();
  }, []);

  // 🔐 Auth + Wallet + Credibility
  useEffect(() => {
    onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const data = snap.data();
          setImpactPoints(data.impactPoints);
          setUserCredibility(data.credibility || 1);
          setStreak(data.streak || 0);
        } else {
          await setDoc(userRef, {
            impactPoints: 10,
            credibility: 1,
            streak: 0,
          });
          setImpactPoints(10);
          setUserCredibility(1);
          setStreak(0);
        }
      }
    });
  }, []);

  const login = async () => {
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  // 🧠 AI-like scoring
  const getTextScore = (text) => {
    let score = 0;
    if (text.length > 50) score += 1;
    if (text.length > 100) score += 2;
    if (text.includes("?")) score += 1;
    if (text.toLowerCase().includes("why")) score += 1;
    if (text.toLowerCase().includes("how")) score += 1;
    return score;
  };

  // 📝 Add post
  const addPost = async () => {
    if (!text || !user) return;

    const baseScore = getTextScore(text);

    await addDoc(collection(db, "posts"), {
      content: text,
      impact: 0,
      score: baseScore,
      createdAt: serverTimestamp(),
      userName: user.displayName,
      userId: user.uid,
      impactGivenBy: [],
    });

    setText("");
  };

  // ⏳ Read + Think system
  useEffect(() => {
    setCanImpact(false);
    setDelayDone(false);

    const readTimer = setTimeout(() => {
      setCanImpact(true);
      setImpactPoints((prev) => prev + 1); // 💰 earn
    }, 8000);

    const thinkTimer = setTimeout(() => {
      setDelayDone(true);
    }, 3000);

    return () => {
      clearTimeout(readTimer);
      clearTimeout(thinkTimer);
    };
  }, [currentIndex]);

  // 💎 Impact system
  const giveImpact = async (post) => {
    if (!user) return;

    if (impactPoints <= 0) {
      alert("No points left!");
      return;
    }

    if (post.impactGivenBy?.includes(user.uid)) {
      alert("Already impacted!");
      return;
    }

    const postRef = doc(db, "posts", post.id);
    const userRef = doc(db, "users", user.uid);
    const ownerRef = doc(db, "users", post.userId);

    const weightedScore = 1 * userCredibility;

    await updateDoc(postRef, {
      impact: increment(1),
      score: increment(weightedScore),
      impactGivenBy: [...(post.impactGivenBy || []), user.uid],
    });

    await updateDoc(userRef, {
      impactPoints: impactPoints - 1,
      streak: streak + 1,
    });

    await updateDoc(ownerRef, {
      credibility: increment(0.1),
    });

    setImpactPoints(impactPoints - 1);
    setStreak(streak + 1);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "just now";
    const diff = Math.floor((new Date() - timestamp.toDate()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return Math.floor(diff / 60) + " min ago";
    return Math.floor(diff / 3600) + " hr ago";
  };

  const bg = darkMode ? "#0f172a" : "#eef2ff";
  const card = darkMode ? "#1e293b" : "white";
  const textColor = darkMode ? "white" : "#111";

  return (
    <div style={{ background: bg, minHeight: "100vh", padding: "20px", color: textColor }}>
      <div style={{ maxWidth: "600px", margin: "auto" }}>

        <h1 style={{ textAlign: "center" }}>🧠 MindFeed</h1>

        <button onClick={() => setDarkMode(!darkMode)}>
          Toggle {darkMode ? "Light" : "Dark"}
        </button>

        {!user ? (
          <button onClick={login}>Login</button>
        ) : (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <p>
              👤 {user.displayName}  
              <br />
              💎 Cred: {userCredibility.toFixed(2)}  
              <br />
              🔥 Streak: {streak}
            </p>
            <button onClick={logout}>Logout</button>
          </div>
        )}

        <p>💰 Points: {impactPoints}</p>

        {/* 🏅 Badges */}
        <div>
          {streak > 5 && <span>🔥 Deep Thinker </span>}
          {userCredibility > 2 && <span>💎 High Value </span>}
          {impactPoints > 20 && <span>📚 Deep Reader </span>}
        </div>

        {currentPost && (
          <div style={{
            background: card,
            padding: "20px",
            borderRadius: "15px",
            marginTop: "20px"
          }}>
            <p style={{ fontSize: "20px" }}>{currentPost.content}</p>

            <small>
              {currentPost.userName} • {formatTime(currentPost.createdAt)}
            </small>

            <p>💎 {currentPost.impact} | 🧠 {currentPost.score?.toFixed(2)}</p>

            <button
              disabled={!canImpact || !delayDone}
              onClick={() => giveImpact(currentPost)}
            >
              {!canImpact ? "Reading..." : !delayDone ? "Thinking..." : "❤️ Impact"}
            </button>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "20px" }}>
          <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}>⬅️</button>
          <button onClick={() => setCurrentIndex(Math.min(posts.length - 1, currentIndex + 1))}>➡️</button>
        </div>

        <div style={{ marginTop: "20px" }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write something meaningful..."
            style={{ width: "100%", padding: "10px" }}
          />
          <button onClick={addPost}>Post</button>
        </div>

      </div>
    </div>
  );
}

export default App;