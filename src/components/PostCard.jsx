import CommentSection from "./CommentSection";

export default function PostCard({
  p,
  users,
  user,
  giveImpact,
  followUser,
  comments,
  commentText,
  setCommentText,
  addComment
}) {
  const author = users.find(u => u.id === p.createdBy);

  return (
    <div style={{
      background: "white",
      padding: 16,
      borderRadius: 12,
      marginBottom: 16
    }}>
      <p><b>{author?.name || "User"}</b></p>
      <p>{p.content}</p>
      <p>💎 {p.impact}</p>

      <button onClick={() => giveImpact(p)}>Impact ⚡</button>

      <CommentSection
        comments={comments}
        users={users}
        postId={p.id}
        commentText={commentText}
        setCommentText={setCommentText}
        addComment={addComment}
      />

      {p.createdBy !== user?.uid && (
        <button onClick={() => followUser(p.createdBy)}>
          Follow
        </button>
      )}
    </div>
  );
}