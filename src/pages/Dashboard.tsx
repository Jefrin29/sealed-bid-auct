import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { Gavel, Package, Clock, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

interface Auction {
  id: string;
  product: {
    id: string;
    title: string;
    images: string[];
  };
  start_price: number;
  end_time: string;
  status: 'draft' | 'active' | 'ended' | 'cancelled';
  highest_bid?: number;
  is_winner?: boolean;
}

interface Bid {
  id: string;
  auction: {
    id: string;
    product: {
      title: string;
      images: string[];
    };
    end_time: string;
    status: string;
  };
  amount: number;
  created_at: string;
  is_winning: boolean;
}

function Dashboard() {
  const { user, profile } = useAuth();
  const [myAuctions, setMyAuctions] = useState<Auction[]>([]);
  const [myBids, setMyBids] = useState<Bid[]>([]);
  const [wonAuctions, setWonAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const isSeller = profile?.role === 'seller' || profile?.role === 'hybrid';
  const isBuyer = profile?.role === 'buyer' || profile?.role === 'hybrid';

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      
      // Fetch auctions created by the user (if seller/hybrid)
      if (isSeller) {
        const { data: products } = await supabase
          .from('products')
          .select('id')
          .eq('seller_id', user.id);
          
        if (products && products.length > 0) {
          const productIds = products.map(p => p.id);
          
          const { data: auctions, error: auctionsError } = await supabase
            .from('auctions')
            .select(`
              id,
              start_price,
              end_time,
              status,
              product:product_id (
                id,
                title,
                images
              )
            `)
            .in('product_id', productIds)
            .order('created_at', { ascending: false });
            
          if (auctionsError) throw auctionsError;
          setMyAuctions(auctions || []);
        } else {
          setMyAuctions([]);
        }
      }
      
      // Fetch bids placed by the user (if buyer/hybrid)
      if (isBuyer) {
        const { data: bids, error: bidsError } = await supabase
          .from('bids')
          .select(`
            id,
            amount,
            created_at,
            auction:auction_id (
              id,
              status,
              end_time,
              winner_id,
              product:product_id (
                title,
                images
              )
            )
          `)
          .eq('bidder_id', user.id)
          .order('created_at', { ascending: false });
          
        if (bidsError) throw bidsError;
        
        // Process bids to determine if they're winning
        const processedBids = (bids || []).map(bid => ({
          id: bid.id,
          auction: {
            id: bid.auction.id,
            product: bid.auction.product,
            end_time: bid.auction.end_time,
            status: bid.auction.status
          },
          amount: bid.amount,
          created_at: bid.created_at,
          is_winning: bid.auction.winner_id === user.id
        }));
        
        setMyBids(processedBids || []);
        
        // Extract won auctions
        const won = processedBids.filter(bid => bid.is_winning && bid.auction.status === 'ended');
        setWonAuctions(won.map(bid => ({
          id: bid.auction.id,
          product: bid.auction.product,
          end_time: bid.auction.end_time,
          status: 'ended',
          highest_bid: bid.amount,
          is_winner: true
        })));
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Please sign in to view your dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Dashboard</h1>
          <p className="text-gray-600">Welcome back, {profile?.full_name || user.email}</p>
        </div>
        
        {isSeller && (
          <Link
            to="/create-auction"
            className="mt-4 md:mt-0 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center"
          >
            <Gavel className="h-5 w-5 mr-2" />
            Create New Auction
          </Link>
        )}
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === 'overview'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Overview
            </button>
            
            {isBuyer && (
              <button
                onClick={() => setActiveTab('bids')}
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === 'bids'
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                My Bids
              </button>
            )}
            
            {isSeller && (
              <button
                onClick={() => setActiveTab('auctions')}
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === 'auctions'
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                My Auctions
              </button>
            )}
            
            {isBuyer && (
              <button
                onClick={() => setActiveTab('won')}
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === 'won'
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Won Auctions
              </button>
            )}
          </nav>
        </div>
        
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {isBuyer && (
                  <div className="bg-indigo-50 p-6 rounded-lg">
                    <div className="flex items-center">
                      <div className="bg-indigo-100 p-3 rounded-full">
                        <Gavel className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-semibold">Active Bids</h3>
                        <p className="text-2xl font-bold">
                          {myBids.filter(b => b.auction.status === 'active').length}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {isBuyer && (
                  <div className="bg-green-50 p-6 rounded-lg">
                    <div className="flex items-center">
                      <div className="bg-green-100 p-3 rounded-full">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-semibold">Won Auctions</h3>
                        <p className="text-2xl font-bold">{wonAuctions.length}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {isSeller && (
                  <div className="bg-purple-50 p-6 rounded-lg">
                    <div className="flex items-center">
                      <div className="bg-purple-100 p-3 rounded-full">
                        <Package className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-semibold">My Listings</h3>
                        <p className="text-2xl font-bold">{myAuctions.length}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {isSeller && (
                  <div className="bg-amber-50 p-6 rounded-lg">
                    <div className="flex items-center">
                      <div className="bg-amber-100 p-3 rounded-full">
                        <Clock className="h-6 w-6 text-amber-600" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-semibold">Active Auctions</h3>
                        <p className="text-2xl font-bold">
                          {myAuctions.filter(a => a.status === 'active').length}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Recent Activity */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">Recent Activity</h3>
                </div>
                
                {isBuyer && myBids.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-lg font-medium mb-3">Recent Bids</h4>
                    <div className="space-y-4">
                      {myBids.slice(0, 3).map((bid) => (
                        <div key={bid.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                          <img
                            src={bid.auction.product.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30"}
                            alt={bid.auction.product.title}
                            className="w-12 h-12 object-cover rounded-md"
                          />
                          <div className="ml-4 flex-grow">
                            <p className="font-medium">{bid.auction.product.title}</p>
                            <p className="text-sm text-gray-500">
                              Bid: ${bid.amount.toLocaleString()}
                            </p>
                          </div>
                          <Link
                            to={`/auctions/${bid.auction.id}`}
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            <ArrowRight className="h-5 w-5" />
                          </Link>
                        </div>
                      ))}
                    </div>
                    {myBids.length > 3 && (
                      <button
                        onClick={() => setActiveTab('bids')}
                        className="mt-3 text-sm text-indigo-600 hover:text-indigo-800"
                      >
                        View all bids
                      </button>
                    )}
                  </div>
                )}
                
                {isSeller && myAuctions.length > 0 && (
                  <div>
                    <h4 className="text-lg font-medium mb-3">Recent Auctions</h4>
                    <div className="space-y-4">
                      {myAuctions.slice(0, 3).map((auction) => (
                        <div key={auction.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                          <img
                            src={auction.product.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30"}
                            alt={auction.product.title}
                            className="w-12 h-12 object-cover rounded-md"
                          />
                          <div className="ml-4 flex-grow">
                            <p className="font-medium">{auction.product.title}</p>
                            <p className="text-sm text-gray-500">
                              Status: <span className={`font-medium ${
                                auction.status === 'active' ? 'text-green-600' : 
                                auction.status === 'ended' ? 'text-gray-600' : 'text-amber-600'
                              }`}>
                                {auction.status.charAt(0).toUpperCase() + auction.status.slice(1)}
                              </span>
                            </p>
                          </div>
                          <Link
                            to={`/auctions/${auction.id}`}
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            <ArrowRight className="h-5 w-5" />
                          </Link>
                        </div>
                      ))}
                    </div>
                    {myAuctions.length > 3 && (
                      <button
                        onClick={() => setActiveTab('auctions')}
                        className="mt-3 text-sm text-indigo-600 hover:text-indigo-800"
                      >
                        View all auctions
                      </button>
                    )}
                  </div>
                )}
                
                {((isBuyer && myBids.length === 0) || (isSeller && myAuctions.length === 0)) && (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">No recent activity found.</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'bids' && (
            <div>
              <h3 className="text-xl font-semibold mb-6">My Bids</h3>
              
              {myBids.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Gavel className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">You haven't placed any bids yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Item
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Bid Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {myBids.map((bid) => (
                        <tr key={bid.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <img
                                  className="h-10 w-10 rounded-md object-cover"
                                  src={bid.auction.product.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30"}
                                  alt=""
                                />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {bid.auction.product.title}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">${bid.amount.toLocaleString()}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {new Date(bid.created_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {bid.auction.status === 'active' ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                Active
                              </span>
                            ) : bid.auction.status === 'ended' && bid.is_winning ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                                Won
                              </span>
                            ) : bid.auction.status === 'ended' ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                Lost
                              </span>
                            ) : (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                {bid.auction.status.charAt(0).toUpperCase() + bid.auction.status.slice(1)}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Link to={`/auctions/${bid.auction.id}`} className="text-indigo-600 hover:text-indigo-900">
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'auctions' && (
            <div>
              <h3 className="text-xl font-semibold mb-6">My Auctions</h3>
              
              {myAuctions.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">You haven't created any auctions yet.</p>
                  <Link
                    to="/create-auction"
                    className="mt-4 inline-block bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                  >
                    Create Your First Auction
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Item
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Starting Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          End Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {myAuctions.map((auction) => (
                        <tr key={auction.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <img
                                  className="h-10 w-10 rounded-md object-cover"
                                  src={auction.product.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30"}
                                  alt=""
                                />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {auction.product.title}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">${auction.start_price.toLocaleString()}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {new Date(auction.end_time).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {auction.status === 'active' ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                Active
                              </span>
                            ) : auction.status === 'ended' ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                Ended
                              </span>
                            ) : auction.status === 'draft' ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                Draft
                              </span>
                            ) : (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                Cancelled
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Link to={`/auctions/${auction.id}`} className="text-indigo-600 hover:text-indigo-900">
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'won' && (
            <div>
              <h3 className="text-xl font-semibold mb-6">Won Auctions</h3>
              
              {wonAuctions.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <CheckCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">You haven't won any auctions yet.</p>
                  <Link
                    to="/auctions"
                    className="mt-4 inline-block bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                  >
                    Browse Auctions
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {wonAuctions.map((auction) => (
                    <div key={auction.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <img
                        src={auction.product.images?.[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30"}
                        alt={auction.product.title}
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-4">
                        <h4 className="text-lg font-semibold mb-2">{auction.product.title}</h4>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm text-gray-500">
                            Won on {new Date(auction.end_time).toLocaleDateString()}
                          </span>
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            Won
                          </span>
                        </div>
                        <p className="text-indigo-600 font-medium mb-4">
                          Winning Bid: ${auction.highest_bid?.toLocaleString()}
                        </p>
                        <Link
                          to={`/auctions/${auction.id}`}
                          className="block w-full text-center bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;