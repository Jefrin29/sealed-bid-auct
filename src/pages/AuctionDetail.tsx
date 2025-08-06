import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../hooks/useAuth';

interface Auction {
  id: string;
  product: {
    id: string;
    title: string;
    description: string;
    images: string[];
    seller_id: string;
  };
  start_price: number;
  end_time: string;
  status: 'draft' | 'active' | 'ended' | 'cancelled';
}

interface Winner {
  user_name: string;
  bid_amount: number;
}

function AuctionDetail() {
  const { id } = useParams<{ id: string }>();
  const [auction, setAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [hasUserBid, setHasUserBid] = useState(false);
  const [userBidAmount, setUserBidAmount] = useState<number | null>(null);
  const [winner, setWinner] = useState<Winner | null>(null);
  const { user } = useAuth();
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  useEffect(() => {
    if (id) {
      fetchAuctionDetails();
      checkUserBid();
      if (isEnded) {
        fetchWinnerDetails();
      }
    }
  }, [id]);

  // Success toast auto-dismiss effect
  useEffect(() => {
    if (showSuccessToast) {
      const timer = setTimeout(() => {
        setShowSuccessToast(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessToast]);

  const isEnded = auction ? new Date(auction.end_time) < new Date() : false;

  async function checkUserBid() {
    if (!user || !id) return;

    try {
      const { data, error } = await supabase
        .from('bids')
        .select('id, amount')
        .eq('auction_id', id)
        .eq('bidder_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setHasUserBid(!!data);
      if (data) {
        setUserBidAmount(data.amount);
      }
    } catch (err) {
      console.error('Error checking user bid:', err);
    }
  }

  async function fetchWinnerDetails() {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('bids')
        .select(`
          amount,
          bidder:bidder_id (
            full_name
          )
        `)
        .eq('auction_id', id)
        .order('amount', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      
      if (data && data.bidder) {
        const bidderData = data.bidder as unknown as { full_name: string };
        setWinner({
          user_name: bidderData.full_name,
          bid_amount: data.amount
        });
      }
    } catch (err) {
      console.error('Error fetching winner details:', err);
    }
  }

  async function fetchAuctionDetails() {
    try {
      const { data, error } = await supabase
        .from('auctions')
        .select(`
          id,
          start_price,
          end_time,
          status,
          product:product_id (
            id,
            title,
            description,
            images,
            seller_id
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data || !data.product) throw new Error('Auction not found');

      const productData = data.product as unknown as {
        id: string;
        title: string;
        description: string;
        images: string[];
        seller_id: string;
      };

      setAuction({
        id: data.id,
        start_price: data.start_price,
        end_time: data.end_time,
        status: data.status,
        product: {
          id: productData.id,
          title: productData.title,
          description: productData.description,
          images: productData.images || [],
          seller_id: productData.seller_id
        }
      });
      setBidAmount(data.start_price);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch auction details');
    } finally {
      setLoading(false);
    }
  }

  async function handleBidSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!user) {
      setError('Please sign in to place a bid');
      return;
    }

    // Double check if user has already bid
    const { data: existingBid, error: bidCheckError } = await supabase
      .from('bids')
      .select('id, amount')
      .eq('auction_id', id)
      .eq('bidder_id', user.id)
      .maybeSingle();

    if (existingBid) {
      setError('You have already placed a bid for this auction. One bid per item is allowed and cannot be modified.');
      setHasUserBid(true);
      setUserBidAmount(existingBid.amount);
      return;
    }

    if (!auction || bidAmount <= auction.start_price) {
      setError('Bid amount must be higher than the base price');
      return;
    }

    try {
      const { error } = await supabase
        .from('bids')
        .insert([
          {
            auction_id: id,
            bidder_id: user.id,
            amount: bidAmount,
            created_at: new Date().toISOString()
          }
        ]);

      if (error) throw error;
      
      // Update state to show success message and hide bid form
      setHasUserBid(true);
      setUserBidAmount(bidAmount);
      setShowSuccessToast(true);
      setError(null);
      
      // Scroll to top to make sure user sees the success message
      window.scrollTo(0, 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place bid');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Auction not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Success Toast Notification */}
      {showSuccessToast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-md shadow-lg z-50 transition-opacity duration-300 ease-in-out max-w-md w-full">
          <div className="flex items-center">
            <svg className="h-6 w-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
            </svg>
            <div>
              <p className="font-bold">Bid Successfully Placed!</p>
              <p className="text-sm">You cannot place another bid or modify this bid until the auction ends.</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
          <div>
            <img
              src={auction.product.images[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30"}
              alt={auction.product.title}
              className="w-full h-96 object-cover rounded-lg"
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-4">{auction.product.title}</h1>
            <p className="text-gray-600 mb-6">
              {auction.product.description}
            </p>
            
            <div className="space-y-4 mb-8">
              <div>
                <h3 className="text-lg font-semibold">Base Price</h3>
                <p className="text-2xl font-bold text-indigo-600">
                  ${auction.start_price.toLocaleString()}
                </p>
                {!isEnded && (
                  <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <p className="text-sm text-yellow-800 flex items-center">
                      <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Sealed Bidding: All bids remain confidential until auction ends
                    </p>
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="text-lg font-semibold">
                  {isEnded ? 'Auction Ended' : 'Time Remaining'}
                </h3>
                <p className="text-xl">
                  {isEnded 
                    ? 'This auction has ended'
                    : formatDistanceToNow(new Date(auction.end_time), { addSuffix: true })}
                </p>
              </div>

              {isEnded && winner && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-md p-4">
                  <h3 className="text-lg font-semibold text-green-800">Auction Winner</h3>
                  <p className="text-green-700">
                    Winner: {winner.user_name}<br />
                    Winning Bid: ${winner.bid_amount.toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {!isEnded && !hasUserBid && (
              <>
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-800 flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">One Bid Policy:</span> You can only place a single bid for this item. Your bid cannot be changed after submission.
                  </p>
                </div>
              
                <form onSubmit={handleBidSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Your Bid Amount
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={auction.start_price + 1}
                        step="1"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(Number(e.target.value))}
                        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                        placeholder="Enter bid amount"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      Your bid must be higher than the base price and will remain confidential
                    </p>
                  </div>
                  
                  <div className="border-t pt-4 mt-4 border-gray-200">
                    <div className="flex items-center mb-4">
                      <input 
                        id="bid-terms" 
                        type="checkbox" 
                        required 
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" 
                      />
                      <label htmlFor="bid-terms" className="ml-2 block text-sm text-gray-700">
                        I understand that I can only place one bid for this item and it cannot be changed after submission
                      </label>
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 text-white py-3 rounded-md hover:bg-indigo-700 transition-colors"
                    disabled={!user}
                  >
                    {user ? 'Place Sealed Bid' : 'Sign in to Place Bid'}
                  </button>
                </form>
              </>
            )}

            {!isEnded && hasUserBid && (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-5 space-y-3 mb-6">
                <div className="flex items-center bg-blue-100 p-3 rounded-md">
                  <svg className="h-8 w-8 text-blue-700 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="text-lg font-bold text-blue-800">Bid Successfully Recorded</h3>
                    <p className="text-blue-700">Your sealed bid of ${userBidAmount?.toLocaleString()} has been placed.</p>
                  </div>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <p className="text-yellow-800 flex items-center font-medium">
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    One Bid Policy
                  </p>
                  <p className="text-yellow-700 text-sm mt-1 ml-7">
                    As per our auction rules, you <span className="font-bold underline">cannot place another bid or modify your existing bid</span> for this product until the auction ends.
                  </p>
                </div>
                
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="bg-gray-50 rounded-lg p-3 mb-3 text-center">
                    <p className="text-sm text-gray-600 mb-1">Auction ends in</p>
                    <p className="text-lg font-bold text-indigo-600">{formatDistanceToNow(new Date(auction.end_time), { addSuffix: false })}</p>
                  </div>
                  
                  <p className="text-blue-600 text-sm flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    The auction will end on {new Date(auction.end_time).toLocaleDateString()} at {new Date(auction.end_time).toLocaleTimeString()}
                  </p>
                  <p className="text-blue-600 text-sm flex items-center mt-2">
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    All bids remain confidential until the auction ends
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuctionDetail;