export default function CommentSection({
  comments,
  users,
  postId,
  commentText,
  setCommentText,
  addComment
}) {
  return (
    <div>
      {comments
        .filter(c => c.postId === postId)
        .map(c => {
          const u = users.find(x => x.id === c.userId);
          return (
            <div key={c.id}>
              💬 {u?.name}: {c.text}
            </div>
          );
        })}

      <input
        placeholder="Reply..."
        value={commentText[postId] || ""}
        onChange={(e) =>
          setCommentText(prev => ({
            ...prev,
            [postId]: e.target.value
          }))
        }
      />

      <button onClick={() => addComment(postId)}>Reply</button>
    </div>
  );
}