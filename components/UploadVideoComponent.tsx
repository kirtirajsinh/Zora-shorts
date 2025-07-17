"use client";

import { useState, useRef, useCallback } from "react";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { toast } from "sonner";
import { createCoin } from "@zoralabs/coins-sdk";
import { ValidMetadataURI } from "@zoralabs/coins-sdk";

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
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleVideoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      setVideoError('Please select a video file');
      return;
    }

    // Validate file size (100MB limit for R2)
    if (file.size > 100 * 1024 * 1024) {
      setVideoError('Video file must be smaller than 100MB');
      return;
    }

    setVideoError(null);
    setFormData(prev => ({ ...prev, video: file }));
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setVideoPreview(url);
  }, []);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setImageError('Please select an image file');
      return;
    }

    // Validate file size (10MB limit for images)
    if (file.size > 10 * 1024 * 1024) {
      setImageError('Image file must be smaller than 10MB');
      return;
    }

    setImageError(null);
    setFormData(prev => ({ ...prev, coverImage: file }));
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  }, []);

  const uploadToR2 = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch('/api/r2/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload to R2');
      }
      
      const { url } = await response.json();
      return url;
    } catch (error) {
      console.error('R2 upload error:', error);
      throw new Error('Failed to upload video to storage');
    }
  };

  const createMetadata = async (videoUrl: string, imageUrl: string, tokenAddress?: string) => {
    console.log('Creating metadata with:', { videoUrl, imageUrl, tokenAddress });
    
    const baseUrl = process.env.NEXT_PUBLIC_URL || window.location.origin;
    const externalUrl = tokenAddress 
      ? `${baseUrl}/token/${tokenAddress}`
      : `${baseUrl}/zeero`;
    
    const metadata = {
      name: formData.name,
      description: formData.description,
      image: imageUrl, // Using uploaded cover image
      animation_url: videoUrl,
      attributes: [
        {
          trait_type: "Creator",
          value: address || "Unknown"
        },
        {
          trait_type: "Type",
          value: "Video Coin"
        }
      ],
      external_url: externalUrl,
      properties: {
        files: [
          {
            uri: videoUrl,
            type: formData.video?.type || "video/mp4"
          },
          {
            uri: imageUrl,
            type: formData.coverImage?.type || "image/jpeg"
          }
        ]
      }
    };

    // Upload metadata to R2
    const metadataBlob = new Blob([JSON.stringify(metadata)], {
      type: 'application/json'
    });
    
    const metadataFile = new File([metadataBlob], 'metadata.json', {
      type: 'application/json'
    });
    
    return await uploadToR2(metadataFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address || !walletClient || !publicClient) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!formData.video) {
      toast.error('Please select a video file');
      return;
    }

    if (!formData.coverImage) {
      toast.error('Please select a cover image');
      return;
    }

    if (!formData.name || !formData.symbol) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    setUploadProgress(0);
    
    try {
      // Step 1: Upload video to R2
      setIsUploading(true);
      setUploadProgress(20);
      toast.loading('Uploading video...');
      const videoUrl = await uploadToR2(formData.video);
      
      // Step 2: Upload cover image to R2
      setUploadProgress(40);
      toast.loading('Uploading cover image...');
      const imageUrl = await uploadToR2(formData.coverImage);
      
      // Step 3: Create and upload metadata
      setUploadProgress(60);
      toast.loading('Creating metadata...');
      const metadataUrl = await createMetadata(videoUrl, imageUrl);
      setIsUploading(false);
      setUploadProgress(80);

      // Step 4: Create the coin
      toast.loading('Creating coin...');
      const coinParams = {
        name: formData.name,
        symbol: formData.symbol.toUpperCase(),
        uri: metadataUrl as ValidMetadataURI,
        payoutRecipient: formData.payoutRecipient || address,
      };

      const result = await createCoin(coinParams, walletClient, publicClient);
      
      setUploadProgress(100);
      toast.success('Coin created successfully!');
      console.log('Coin creation result:', result);
      
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
      console.error('Error creating coin:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create coin');
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
      <div className="text-center px-8">
        <div className="mb-8">
          <h2 className="text-3xl font-semibold text-white mb-4">
            Create Video Coins
          </h2>
          <p className="text-lg text-gray-400 leading-relaxed max-w-md mx-auto mb-8">
            Connect your wallet to start creating and monetizing your video content with Zora tokens.
          </p>
          <div className="text-red-400 text-lg font-medium">
            Please connect your wallet to continue
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Create Video Coin</h2>
        <p className="text-gray-400">Upload your video and create a tradeable token</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Video Upload Section */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-300">
            Video <span className="text-red-400">*</span>
          </label>
          <div
            onClick={handleVideoClick}
            className="relative border-2 border-dashed border-gray-600 rounded-lg p-6 cursor-pointer hover:border-gray-500 transition-colors"
          >
            {videoPreview ? (
              <div className="aspect-[16/9] bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoPreviewRef}
                  src={videoPreview}
                  className="w-full h-full object-contain"
                  controls
                  preload="metadata"
                />
              </div>
            ) : (
              <div className="aspect-[16/9] flex flex-col items-center justify-center text-gray-400">
                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p className="text-center text-lg mb-2">Click to upload video</p>
                <p className="text-sm text-gray-500">Max 100MB • MP4, MOV, AVI</p>
                <p className="text-xs text-gray-600 mt-1">Horizontal videos (16:9) work best</p>
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
            <p className="text-red-400 text-sm">{videoError}</p>
          )}
        </div>

        {/* Cover Image Upload Section */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-300">
            Cover Image <span className="text-red-400">*</span>
          </label>
          <div
            onClick={handleImageClick}
            className="relative border-2 border-dashed border-gray-600 rounded-lg p-4 cursor-pointer hover:border-gray-500 transition-colors"
          >
            {imagePreview ? (
              <div className="aspect-[16/9] bg-black rounded-lg overflow-hidden">
                <img
                  src={imagePreview}
                  alt="Cover preview"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="aspect-[16/9] flex flex-col items-center justify-center text-gray-400">
                <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-center text-base mb-1">Click to upload cover image</p>
                <p className="text-sm text-gray-500">Max 10MB • JPG, PNG, GIF</p>
                <p className="text-xs text-gray-600 mt-1">16:9 aspect ratio recommended</p>
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
            <p className="text-red-400 text-sm">{imageError}</p>
          )}
        </div>

        {/* Progress Bar */}
        {(isUploading || isCreating) && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-300">
              <span>Progress</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Coin Name */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Coin Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., My Awesome Coin"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Symbol */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Symbol <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="symbol"
              value={formData.symbol}
              onChange={handleInputChange}
              placeholder="e.g., MAC"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              maxLength={10}
              required
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Describe your coin..."
            rows={3}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>

        {/* Payout Recipient */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Payout Recipient
          </label>
          <input
            type="text"
            name="payoutRecipient"
            value={formData.payoutRecipient}
            onChange={handleInputChange}
            placeholder={address || "0x..."}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
          <p className="text-xs text-gray-500">
            Address to receive creator earnings. Defaults to your connected wallet.
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isCreating || isUploading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
        >
          {isUploading ? 'Uploading Video...' : isCreating ? 'Creating Coin...' : 'Create Video Coin'}
        </button>
      </form>
    </div>
  );
};