export default function PostCard({ post }) {
  if (!post) return null;

  return (
    <div className="p-6 bg-white rounded-xl shadow max-w-xl">
      <p className="text-lg">
        {post?.content || "No content"}
      </p>
    </div>
  );
}