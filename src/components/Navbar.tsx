import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Gavel, User, LogIn, Bell, Plus, Menu, X, Home, Package, Settings } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';

function Navbar() {
  const { user, profile, signOut } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    setShowUserMenu(false);
  };

  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
    setShowNotifications(false);
  };

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
  };

  const isSeller = profile?.role === 'seller' || profile?.role === 'hybrid';

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <Gavel className="h-8 w-8 text-indigo-600" />
            <span className="text-xl font-bold text-gray-900">BidSmart</span>
          </Link>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-700 hover:text-indigo-600"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <Link 
              to="/" 
              className={`text-gray-700 hover:text-indigo-600 ${location.pathname === '/' ? 'text-indigo-600 font-medium' : ''}`}
            >
              Home
            </Link>
            <Link 
              to="/auctions" 
              className={`text-gray-700 hover:text-indigo-600 ${location.pathname === '/auctions' ? 'text-indigo-600 font-medium' : ''}`}
            >
              Auctions
            </Link>
            
            {user ? (
              <>
                {isSeller && (
                  <Link 
                    to="/create-auction" 
                    className={`flex items-center space-x-1 text-gray-700 hover:text-indigo-600 ${
                      location.pathname === '/create-auction' ? 'text-indigo-600 font-medium' : ''
                    }`}
                  >
                    <Plus className="h-5 w-5" />
                    <span>Create Auction</span>
                  </Link>
                )}
                
                <div className="relative" ref={notificationRef}>
                  <button
                    onClick={toggleNotifications}
                    className="flex items-center space-x-1 text-gray-700 hover:text-indigo-600 relative"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-10 max-h-96 overflow-y-auto">
                      <div className="p-3 border-b border-gray-200 flex justify-between items-center">
                        <h3 className="font-semibold">Notifications</h3>
                        {unreadCount > 0 && (
                          <button 
                            onClick={markAllAsRead}
                            className="text-xs text-indigo-600 hover:text-indigo-800"
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>
                      
                      <div>
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-gray-500">
                            No notifications
                          </div>
                        ) : (
                          notifications.map((notification) => (
                            <div 
                              key={notification.id}
                              onClick={() => handleNotificationClick(notification.id)}
                              className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                                !notification.read ? 'bg-indigo-50' : ''
                              }`}
                            >
                              <div className="font-medium">{notification.title}</div>
                              <div className="text-sm text-gray-600">{notification.message}</div>
                              <div className="text-xs text-gray-400 mt-1">
                                {new Date(notification.created_at).toLocaleString()}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={toggleUserMenu}
                    className="flex items-center space-x-1 text-gray-700 hover:text-indigo-600"
                  >
                    <User className="h-5 w-5" />
                    <span>{profile?.full_name || 'Account'}</span>
                  </button>
                  
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                      <div className="py-1">
                        <Link
                          to="/dashboard"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Package className="h-4 w-4 inline mr-2" />
                          Dashboard
                        </Link>
                        <Link
                          to="/profile"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Settings className="h-4 w-4 inline mr-2" />
                          Profile Settings
                        </Link>
                        <button
                          onClick={() => signOut()}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <LogIn className="h-4 w-4 inline mr-2" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link
                to="/auth"
                className="flex items-center space-x-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
              >
                <LogIn className="h-5 w-5" />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>
        
        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-3">
              <Link 
                to="/" 
                className={`text-gray-700 hover:text-indigo-600 py-2 ${location.pathname === '/' ? 'text-indigo-600 font-medium' : ''}`}
              >
                <Home className="h-5 w-5 inline mr-2" />
                Home
              </Link>
              <Link 
                to="/auctions" 
                className={`text-gray-700 hover:text-indigo-600 py-2 ${location.pathname === '/auctions' ? 'text-indigo-600 font-medium' : ''}`}
              >
                <Gavel className="h-5 w-5 inline mr-2" />
                Auctions
              </Link>
              
              {user ? (
                <>
                  <Link 
                    to="/dashboard" 
                    className={`text-gray-700 hover:text-indigo-600 py-2 ${location.pathname === '/dashboard' ? 'text-indigo-600 font-medium' : ''}`}
                  >
                    <Package className="h-5 w-5 inline mr-2" />
                    Dashboard
                  </Link>
                  
                  <Link 
                    to="/profile" 
                    className={`text-gray-700 hover:text-indigo-600 py-2 ${location.pathname === '/profile' ? 'text-indigo-600 font-medium' : ''}`}
                  >
                    <User className="h-5 w-5 inline mr-2" />
                    Profile
                  </Link>
                  
                  {isSeller && (
                    <Link 
                      to="/create-auction" 
                      className={`text-gray-700 hover:text-indigo-600 py-2 ${location.pathname === '/create-auction' ? 'text-indigo-600 font-medium' : ''}`}
                    >
                      <Plus className="h-5 w-5 inline mr-2" />
                      Create Auction
                    </Link>
                  )}
                  
                  <button
                    onClick={() => signOut()}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 w-full text-left mt-2"
                  >
                    <LogIn className="h-5 w-5 inline mr-2" />
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  to="/auth"
                  className="flex items-center space-x-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 mt-2"
                >
                  <LogIn className="h-5 w-5" />
                  <span>Sign In</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;