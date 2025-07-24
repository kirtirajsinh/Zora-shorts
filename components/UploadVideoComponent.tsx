"use client";

import { useState, useRef, useCallback } from "react";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { toast } from "sonner";
import { createCoin } from "@zoralabs/coins-sdk";
import { ValidMetadataURI } from "@zoralabs/coins-sdk";
import { platform } from "os";

interface CoinFormData {
  name: string;
  symbol: string;
  description: string;
  video: File | null;
  coverImage: File | null;
  payoutRecipient: string;
}

export const UploadVideoComponent = () => {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [formData, setFormData] = useState<CoinFormData>({
    name: "",
    symbol: "",
    description: "",
    video: null,
    coverImage: null,
    payoutRecipient: "",
  });

  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleVideoSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith("video/")) {
        setVideoError("Please select a video file");
        return;
      }

      // Validate file size (100MB limit for R2)
      if (file.size > 100 * 1024 * 1024) {
        setVideoError("Video file must be smaller than 100MB");
        return;
      }

      setVideoError(null);
      setFormData((prev) => ({ ...prev, video: file }));

      // Create preview URL
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
    },
    []
  );

  const handleImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setImageError("Please select an image file");
        return;
      }

      // Validate file size (10MB limit for images)
      if (file.size > 10 * 1024 * 1024) {
        setImageError("Image file must be smaller than 10MB");
        return;
      }

      setImageError(null);
      setFormData((prev) => ({ ...prev, coverImage: file }));

      // Create preview URL
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    },
    []
  );

  const uploadToR2 = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/r2/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload to R2");
      }

      const { url } = await response.json();
      return url;
    } catch (error) {
      console.error("R2 upload error:", error);
      throw new Error("Failed to upload video to storage");
    }
  };

  const createMetadata = async (
    videoUrl: string,
    imageUrl: string,
    tokenAddress?: string
  ) => {
    console.log("Creating metadata with:", {
      videoUrl,
      imageUrl,
      tokenAddress,
    });

    const baseUrl = process.env.NEXT_PUBLIC_URL || window.location.origin;

    const metadata = {
      name: formData.name,
      description: formData.description,
      image: imageUrl,
      animation_url: videoUrl,
      properties: {
        creator: address || "Unknown",
        category: "video",
        image_type: formData.coverImage?.type || "image/jpeg",
        platform: "Zeero",
        platform_url: "zeero.cool",
      },
      content: {
        mime: formData.video?.type || "video/mp4",
        uri: videoUrl,
      },
    };

    console.log(metadata, "metadata to upload");

    // Upload metadata to R2
    const metadataBlob = new Blob([JSON.stringify(metadata)], {
      type: "application/json",
    });

    const metadataFile = new File([metadataBlob], "metadata.json", {
      type: "application/json",
    });

    return await uploadToR2(metadataFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address || !walletClient || !publicClient) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!formData.video) {
      toast.error("Please select a video file");
      return;
    }

    if (!formData.coverImage) {
      toast.error("Please select a cover image");
      return;
    }

    if (!formData.name || !formData.symbol) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsCreating(true);
    setUploadProgress(0);

    try {
      // Step 1: Upload video to R2
      setIsUploading(true);
      setUploadProgress(20);
      toast.loading("Uploading video...");
      const videoUrl = await uploadToR2(formData.video);

      // Step 2: Upload cover image to R2
      setUploadProgress(40);
      toast.loading("Uploading cover image...");
      const imageUrl = await uploadToR2(formData.coverImage);

      // Step 3: Create and upload metadata
      setUploadProgress(60);
      toast.loading("Creating metadata...");
      const metadataUrl = await createMetadata(videoUrl, imageUrl);
      setIsUploading(false);
      setUploadProgress(80);

      // Step 4: Create the coin
      toast.loading("Creating coin...");
      const coinParams = {
        name: formData.name,
        symbol: formData.symbol.toUpperCase(),
        uri: metadataUrl as ValidMetadataURI,
        payoutRecipient: (formData.payoutRecipient || address) as `0x${string}`,
      };

      const result = await createCoin(coinParams, walletClient, publicClient);

      setUploadProgress(100);
      toast.success("Coin created successfully!");
      console.log("Coin creation result:", result);

      // Reset form
      setFormData({
        name: "",
        symbol: "",
        description: "",
        video: null,
        coverImage: null,
        payoutRecipient: "",
      });
      setVideoPreview(null);
      setImagePreview(null);
      setUploadProgress(0);
    } catch (error) {
      console.error("Error creating coin:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create coin"
      );
      setUploadProgress(0);
    } finally {
      setIsCreating(false);
      setIsUploading(false);
    }
  };

  const handleVideoClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageClick = () => {
    imageInputRef.current?.click();
  };

  if (!address) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-3 text-center">Connect Wallet</h2>
        <p className="text-gray-400 text-center mb-6 max-w-xs">
          Connect your wallet to start creating video coins and monetizing your content
        </p>
        <div className="w-full max-w-xs px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl">
          <p className="text-red-400 text-sm text-center font-medium">
            Wallet connection required
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-20">
      <div className="px-4 pt-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Create Reel</h2>
          <p className="text-gray-400">Share your video and mint a coin</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Video Upload - Reel Style */}
          <div className="relative">
            <div
              onClick={handleVideoClick}
              className="relative aspect-[9/16] bg-gray-900 rounded-3xl overflow-hidden cursor-pointer group"
            >
              {videoPreview ? (
                <div className="relative w-full h-full">
                  <video
                    ref={videoPreviewRef}
                    src={videoPreview}
                    className="w-full h-full object-cover"
                    controls={false}
                    preload="metadata"
                    muted
                    loop
                    onClick={(e) => {
                      e.stopPropagation();
                      const video = e.target as HTMLVideoElement;
                      video.paused ? video.play() : video.pause();
                    }}
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-black/50 rounded-full p-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </div>
                  </div>
                  <div className="absolute top-4 right-4 bg-black/50 rounded-full px-3 py-1">
                    <span className="text-white text-xs font-medium">Tap to change</span>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gradient-to-b from-gray-800/50 to-gray-900/50">
                  <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-4">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-white text-lg font-semibold mb-2">Add your video</h3>
                  <p className="text-gray-300 text-center text-sm mb-3 px-6">
                    Upload a vertical video to create your reel
                  </p>
                  <div className="bg-white/10 rounded-full px-4 py-2">
                    <span className="text-gray-300 text-xs">Max 100MB • MP4, MOV</span>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoSelect}
                className="hidden"
              />
            </div>
            {videoError && (
              <div className="mt-3 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-2xl">
                <p className="text-red-400 text-sm">{videoError}</p>
              </div>
            )}
          </div>

          {/* Cover Image - Compact Style */}
          <div className="space-y-3">
            <label className="text-white font-medium text-sm">Cover Image *</label>
            <div
              onClick={handleImageClick}
              className="relative aspect-[16/9] bg-gray-900 rounded-2xl overflow-hidden cursor-pointer group border-2 border-dashed border-gray-600"
            >
              {imagePreview ? (
                <div className="relative w-full h-full">
                  <img
                    src={imagePreview}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-black/50 rounded-full p-2">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                  <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-center">Add cover image</p>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG • Max 10MB</p>
                </div>
              )}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
            {imageError && (
              <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-2xl">
                <p className="text-red-400 text-sm">{imageError}</p>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {(isUploading || isCreating) && (
            <div className="bg-gray-900/50 rounded-2xl p-4">
              <div className="flex justify-between text-sm text-gray-300 mb-2">
                <span>Creating your reel...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Form Fields - Compact Mobile Style */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-white font-medium text-sm">Token Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="My Awesome Token"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-white font-medium text-sm">Symbol *</label>
              <input
                type="text"
                name="symbol"
                value={formData.symbol}
                onChange={handleInputChange}
                placeholder="MAT"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                maxLength={10}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-white font-medium text-sm">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Tell everyone about your reel..."
                rows={3}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-white font-medium text-sm">Payout Address</label>
              <input
                type="text"
                name="payoutRecipient"
                value={formData.payoutRecipient}
                onChange={handleInputChange}
                placeholder={address || "0x..."}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
              />
              <p className="text-xs text-gray-500 px-1">
                Earnings will go to your connected wallet if left empty
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isCreating || isUploading || !formData.video || !formData.name || !formData.symbol}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-2xl transition-all duration-300 text-lg shadow-lg"
            >
              {isUploading
                ? "Uploading..."
                : isCreating
                ? "Creating Token..."
                : formData.video && formData.name && formData.symbol
                ? "Create Reel Token"
                : "Add Video & Details"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
