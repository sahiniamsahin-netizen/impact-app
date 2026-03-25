import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

export async function createPost(content, userId) {
  return await addDoc(collection(db, "posts"), {
    content,
    impact: 0,
    createdBy: userId,
    createdAt: Date.now()
  });
}