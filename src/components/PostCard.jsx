export default function PostCard({ post }) {
  if (!post) return null;

  return (
    <div className="p-6 bg-white rounded-xl shadow max-w-xl">
      <p className="text-lg">{post.content}</p>
      <p className="text-sm text-gray-500 mt-2">
        Impact: {post.impact || 0}
      </p>
    </div>
  );
}