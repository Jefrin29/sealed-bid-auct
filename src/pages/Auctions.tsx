import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from 'date-fns';

interface Auction {
  id: string;
  product: {
    id: string;
    title: string;
    description: string;
    images: string[];
  };
  start_price: number;
  end_time: string;
  status: 'draft' | 'active' | 'ended' | 'cancelled';
}

function Auctions() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAuctions();
  }, []);

  async function fetchAuctions() {
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
            images
          )
        `)
        .eq('status', 'active')
        .order('end_time', { ascending: true });

      if (error) throw error;
      setAuctions(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch auctions');
    } finally {
      setLoading(false);
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

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Active Auctions</h1>
      {auctions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No active auctions at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {auctions.map((auction) => (
            <div key={auction.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <img
                src={auction.product.images[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30"}
                alt={auction.product.title}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h2 className="text-xl font-semibold mb-2">{auction.product.title}</h2>
                <p className="text-gray-600 mb-4">
                  Starting Bid: ${auction.start_price.toLocaleString()}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    Ends {formatDistanceToNow(new Date(auction.end_time), { addSuffix: true })}
                  </span>
                  <Link
                    to={`/auctions/${auction.id}`}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Auctions;