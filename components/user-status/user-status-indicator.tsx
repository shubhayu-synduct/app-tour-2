"use client"

import { useState, useEffect } from 'react';
import { getUserStatus } from '@/lib/authenticated-api';
import { Globe, User, Database, Info, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { logger } from '@/lib/logger';

interface UserStatus {
  authenticated: boolean;
  user_id?: string;
  email?: string;
  country?: string;
  database: string;
  source: string;
}

interface UserStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export default function UserStatusIndicator({ 
  className = "",
  showDetails = true 
}: UserStatusIndicatorProps) {
  const { user } = useAuth();
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserStatus = async () => {
      if (!user) {
        setUserStatus(null);
        setError('Authentication required');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const status = await getUserStatus();
        setUserStatus(status);
      } catch (err) {
        logger.error('Error fetching user status:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch user status');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserStatus();

    // Refresh status every 30 seconds to catch auth changes
    const interval = setInterval(fetchUserStatus, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 text-gray-500 ${className}`}>
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm">Checking status...</span>
      </div>
    );
  }

  // Show authentication required message
  if (!user) {
    return (
      <div className={`flex items-center space-x-2 text-amber-600 ${className}`}>
        <AlertCircle size={16} />
        <span className="text-sm font-medium">Authentication Required</span>
        {showDetails && (
          <span className="text-xs text-gray-500">Sign in to access drug information</span>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center space-x-2 text-red-500 ${className}`}>
        <Info size={16} />
        <span className="text-sm">Status unavailable</span>
      </div>
    );
  }

  if (!userStatus) return null;

  const getDatabaseColor = (database: string) => {
    return database === 'portuguese' ? 'text-green-600' : 'text-blue-600';
  };

  const getDatabaseFlag = (database: string) => {
    return database === 'portuguese' ? '🇵🇹' : '🇬🇧';
  };

  const getSourceText = (source: string) => {
    switch (source) {
      case 'user_preference':
        return 'Based on your profile';
      case 'geo_location':
        return 'Based on your location';
      default:
        return 'Default selection';
    }
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Authentication Status - Always authenticated now */}
      <div className="flex items-center space-x-1">
        <User size={16} className="text-green-500" />
        {showDetails && (
          <span className="text-sm text-gray-600">
            {user.email || 'Authenticated'}
          </span>
        )}
      </div>

      {/* Database Indicator */}
      <div className="flex items-center space-x-1">
        <Database size={16} className={getDatabaseColor(userStatus.database)} />
        <span className={`text-sm font-medium ${getDatabaseColor(userStatus.database)}`}>
          {getDatabaseFlag(userStatus.database)} {userStatus.database.charAt(0).toUpperCase() + userStatus.database.slice(1)}
        </span>
      </div>

      {/* Country/Location */}
      {showDetails && userStatus.country && (
        <div className="flex items-center space-x-1">
          <Globe size={16} className="text-gray-500" />
          <span className="text-sm text-gray-600">{userStatus.country}</span>
        </div>
      )}

      {/* Source indicator as tooltip */}
      {showDetails && (
        <div className="relative group">
          <Info size={14} className="text-gray-400 cursor-help" />
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
            {getSourceText(userStatus.source)}
          </div>
        </div>
      )}
    </div>
  );
}

// Compact version for use in headers
export function CompactUserStatusIndicator({ className = "" }: { className?: string }) {
  return (
    <UserStatusIndicator 
      className={className}
      showDetails={false}
    />
  );
}