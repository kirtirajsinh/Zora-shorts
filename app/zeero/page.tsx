import { UploadVideoComponent } from "@/components/UploadVideoComponent";

export default function ZeeroPage() {
  return (
    <div className="h-full w-full relative overflow-hidden bg-black flex flex-col items-center justify-center">
      <div className="text-center px-8 mb-8">
        {/* Main Logo/Title */}
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-white mb-4">Zeero</h1>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
        </div>
      </div>

      {/* Upload Component */}
      <div className="w-full max-w-4xl mx-auto px-4 pb-20">
        <UploadVideoComponent />
      </div>
    </div>
  );
}
