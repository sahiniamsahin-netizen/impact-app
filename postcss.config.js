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
  const [clicked, setClicked] = useState(false);

  const handleImpact = () => {
    setClicked(true);
    setTimeout(() => setClicked(false), 200);
    giveImpact(post);
  };

  return (
    <div className="w-full max-w-md h-[75vh] bg-zinc-900 text-white rounded-2xl p-6 flex flex-col justify-between shadow-2xl">

      {/* TOP */}
      <div>
        <p className="text-sm text-gray-400">
          {userMap[post.createdBy]?.name || "Unknown"}
        </p>

        <p className="text-xl font-semibold mt-4 leading-relaxed">
          {post.content}
        </p>
      </div>

      {/* BOTTOM */}
      <div className="space-y-3">

        <div className="flex justify-between items-center">
          <span className="text-lg">💎 {post.impact || 0}</span>

          <button
            onClick={handleImpact}
            className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
              clicked
                ? "bg-white text-black scale-110"
                : "bg-white text-black"
            }`}
          >
            ⚡ Impact
          </button>
        </div>

        {/* COMMENT TOGGLE */}
        <button
          onClick={() => setShowComments(!showComments)}
          className="text-sm text-gray-400"
        >
          💬 Comments
        </button>

        {/* COMMENTS */}
        {showComments && (
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {comments
              .filter(c => c.postId === post.id)
              .map(c => (
                <p key={c.id} className="text-sm text-gray-300">
                  <b>{userMap[c.userId]?.name}:</b> {c.text}
                </p>
              ))}

            <div className="flex gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Reply..."
                className="flex-1 bg-zinc-800 px-3 py-2 rounded-lg text-sm outline-none"
              />

              <button
                onClick={() => {
                  addComment(post.id, commentText);
                  setCommentText("");
                }}
                className="bg-white text-black px-3 py-2 rounded-lg text-sm"
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
            className="text-sm bg-zinc-800 px-3 py-2 rounded-lg"
          >
            Follow
          </button>
        )}
      </div>
    </div>
  );
}