export default function ZeeroPage() {
  return (
    <div className="h-full w-full relative overflow-hidden bg-black flex flex-col items-center justify-center">
      <div className="text-center px-8">
        {/* Main Logo/Title */}
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-white mb-4">Zeero</h1>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
        </div>

        {/* Coming Soon Message */}
        <div className="mb-12">
          <h2 className="text-3xl font-semibold text-white mb-4">
            Video Uploads
          </h2>
          <h3 className="text-2xl font-medium text-gray-300 mb-6">
            Coming Soon
          </h3>
          <p className="text-lg text-gray-400 leading-relaxed max-w-md mx-auto">
            Create, share, and monetize your videos with Zora tokens. The future
            of content creation is almost here.
          </p>
        </div>
      </div>
    </div>
  );
}
