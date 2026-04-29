import { useState, useRef } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { HiOutlineCamera } from 'react-icons/hi';

export default function ProfileUploadWidget({ user }) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(user?.profile_image || null);
  const [imgError, setImgError] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate type
    if (!['image/jpeg', 'image/jpg'].includes(file.type)) {
      toast.error('Only JPEG/JPG formats are supported.');
      return;
    }

    // Validate size (2MB = 2 * 1024 * 1024 bytes)
    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error('File size must be 2MB or less.');
      return;
    }

    // Show preview immediately
    setImgError(false);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Proceed to upload
    await uploadImage(file);
  };

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await API.post(`/upload-profile/${user.id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success('Profile picture updated successfully!');
      if (user) {
        // Since we are replacing the file with the same name, we append a timestamp
        // to bypass the browser's image cache for the new image.
        const newUrl = res.data.profile_image + '?t=' + new Date().getTime();
        user.profile_image = newUrl;
        setPreviewUrl(newUrl);
      }
      // Reload window so the navbar avatar updates too
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to upload image');
      // Revert preview on failure
      setPreviewUrl(user?.profile_image || null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative group">
        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-3xl font-bold shadow-xl shadow-primary-500/20 mb-3 overflow-hidden border-4 border-white">
          {previewUrl && !imgError ? (
            <img 
              src={previewUrl} 
              alt="Profile" 
              className="w-full h-full object-cover" 
              onError={() => setImgError(true)}
            />
          ) : (
            user?.name?.charAt(0)?.toUpperCase() || 'U'
          )}
          
          <div 
            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full"
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            <HiOutlineCamera className="text-white text-2xl" />
          </div>
        </div>
        
        <input 
          type="file" 
          accept="image/jpeg, image/jpg" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileSelect}
          disabled={uploading}
        />
        
        <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-xs font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 px-3 py-1.5 rounded-full absolute -bottom-2 left-1/2 transform -translate-x-1/2 shadow-sm whitespace-nowrap disabled:opacity-50"
        >
            {uploading ? 'Uploading...' : 'Upload Image'}
        </button>
      </div>
    </div>
  );
}
