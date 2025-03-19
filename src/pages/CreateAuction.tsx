import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Plus, X, Upload, AlertCircle } from 'lucide-react';

function CreateAuction() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startPrice, setStartPrice] = useState('');
  const [duration, setDuration] = useState('7'); // Default 7 days
  const [images, setImages] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [sealedBidding, setSealedBidding] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Check if user is a seller or hybrid
  useEffect(() => {
    if (profile && profile.role !== 'seller' && profile.role !== 'hybrid') {
      navigate('/');
    }
  }, [profile, navigate]);

  const handleAddImage = () => {
    if (!imageUrl.trim()) return;
    
    // Basic URL validation
    try {
      new URL(imageUrl);
      setImages([...images, imageUrl]);
      setImageUrl('');
    } catch (e) {
      setError('Please enter a valid URL for the image');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to create an auction');
      return;
    }
    
    if (!title.trim() || !description.trim() || !startPrice || images.length === 0) {
      setError('Please fill in all required fields and add at least one image');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Calculate end time based on duration
      const startTime = new Date();
      const endTime = new Date();
      endTime.setDate(endTime.getDate() + parseInt(duration));
      
      // 1. Create product
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          seller_id: user.id,
          title,
          description,
          images
        })
        .select()
        .single();
      
      if (productError) throw productError;
      
      // 2. Create auction
      const { error: auctionError } = await supabase
        .from('auctions')
        .insert({
          product_id: product.id,
          start_price: parseFloat(startPrice),
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: 'active',
          sealed_bidding: sealedBidding
        });
      
      if (auctionError) throw auctionError;
      
      setSuccess(true);
      
      // Reset form
      setTitle('');
      setDescription('');
      setStartPrice('');
      setDuration('7');
      setImages([]);
      setSealedBidding(true);
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      
    } catch (err) {
      console.error('Error creating auction:', err);
      setError(err instanceof Error ? err.message : 'Failed to create auction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Create New Auction</h1>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6 flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-md mb-6">
          <p>Auction created successfully! Redirecting to dashboard...</p>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4 md:col-span-2">
              <h2 className="text-xl font-semibold">Item Details</h2>
              
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                  placeholder="Enter item title"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                  placeholder="Describe your item in detail"
                  required
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="startPrice" className="block text-sm font-medium text-gray-700 mb-1">
                Starting Price ($) *
              </label>
              <input
                type="number"
                id="startPrice"
                value={startPrice}
                onChange={(e) => setStartPrice(e.target.value)}
                min="0.01"
                step="0.01"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                placeholder="0.00"
                required
              />
            </div>
            
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                Duration (days) *
              </label>
              <select
                id="duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                required
              >
                <option value="1">1 day</option>
                <option value="3">3 days</option>
                <option value="5">5 days</option>
                <option value="7">7 days</option>
                <option value="10">10 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
              </select>
            </div>
            
            <div className="md:col-span-2">
              <h2 className="text-xl font-semibold mb-4">Item Images *</h2>
              
              <div className="mb-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="flex-grow p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                    placeholder="Enter image URL"
                  />
                  <button
                    type="button"
                    onClick={handleAddImage}
                    className="bg-indigo-600 text-white p-3 rounded-md hover:bg-indigo-700"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Add at least one image URL for your item
                </p>
              </div>
              
              {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  {images.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Item image ${index + 1}`}
                        className="w-full h-32 object-cover rounded-md"
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1523275335684-37898b6baf30";
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="md:col-span-2">
              <h2 className="text-xl font-semibold mb-4">Auction Settings</h2>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="sealedBidding"
                  checked={sealedBidding}
                  onChange={(e) => setSealedBidding(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="sealedBidding" className="text-sm font-medium text-gray-700">
                  Enable Sealed Bidding
                </label>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Sealed bidding hides all bids until the auction ends
              </p>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Creating Auction...' : 'Create Auction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateAuction;