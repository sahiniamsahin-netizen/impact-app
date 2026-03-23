import { useState } from "react";

export default function PostCard({
  post,
  user,
  userMap,
  comments,
  addComment,
  followUser,
  giveImpact
}) {
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);

  return (
    <div className="w-full max-w-2xl min-h-[80vh] bg-[#fdfaf6] text-[#1a1a1a] rounded-2xl p-8 shadow-lg flex flex-col justify-between">

      {/* AUTHOR */}
      <div>
        <p className="text-sm text-gray-500 mb-4">
          ✍️ {userMap[post.createdBy]?.name || "Unknown"}
        </p>

        {/* CONTENT */}
        <p className="text-lg leading-8 tracking-wide whitespace-pre-line">
          {post.content}
        </p>
      </div>

      {/* FOOTER */}
      <div className="mt-6 space-y-3">

        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>💎 {post.impact || 0}</span>

          <button
            onClick={() => giveImpact(post)}
            className="px-4 py-2 rounded-lg bg-black text-white"
          >
            Appreciate
          </button>
        </div>

        {/* COMMENTS */}
        <button
          onClick={() => setShowComments(!showComments)}
          className="text-sm text-gray-500"
        >
          💬 Thoughts
        </button>

        {showComments && (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {comments
              .filter(c => c.postId === post.id)
              .map(c => (
                <p key={c.id} className="text-sm">
                  <b>{userMap[c.userId]?.name}:</b> {c.text}
                </p>
              ))}

            <div className="flex gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a thought..."
                className="flex-1 border px-3 py-2 rounded-lg text-sm"
              />

              <button
                onClick={() => {
                  addComment(post.id, commentText);
                  setCommentText("");
                }}
                className="bg-black text-white px-3 py-2 rounded-lg text-sm"
              >
                Send
              </button>
            </div>
          </div>
        )}

        {/* FOLLOW */}
        {post.createdBy !== user?.uid && (
          <button
            onClick={() => followUser(post.createdBy)}
            className="text-sm text-gray-600 underline"
          >
            Follow writer
          </button>
        )}
      </div>
    </div>
  );
}