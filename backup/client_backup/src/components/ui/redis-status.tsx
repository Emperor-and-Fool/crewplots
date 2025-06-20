import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';

interface RedisStatusData {
  connected: boolean;
  uptime: number;
  memory: {
    used: string;
    peak: string;
  };
  clients: number;
  version: string;
  error?: string;
}

export function RedisStatus() {
  const [status, setStatus] = useState<RedisStatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRedisStatus = async () => {
      try {
        const response = await fetch('/api/redis/status', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
        } else {
          setStatus({
            connected: false,
            uptime: 0,
            memory: { used: 'N/A', peak: 'N/A' },
            clients: 0,
            version: 'N/A',
            error: 'Failed to fetch status'
          });
        }
      } catch (error) {
        setStatus({
          connected: false,
          uptime: 0,
          memory: { used: 'N/A', peak: 'N/A' },
          clients: 0,
          version: 'N/A',
          error: error instanceof Error ? error.message : 'Connection failed'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRedisStatus();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchRedisStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Redis Status</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 rounded-full bg-gray-400 animate-pulse"></div>
            <span className="text-xs text-gray-500">Checking...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          Redis Status
          <Badge variant={status?.connected ? "default" : "destructive"}>
            {status?.connected ? "Connected" : "Disconnected"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-500">Uptime:</span>
            <div className="font-mono">{status?.uptime ? formatUptime(status.uptime) : 'N/A'}</div>
          </div>
          <div>
            <span className="text-gray-500">Clients:</span>
            <div className="font-mono">{status?.clients || 0}</div>
          </div>
          <div>
            <span className="text-gray-500">Memory:</span>
            <div className="font-mono">{status?.memory.used || 'N/A'}</div>
          </div>
          <div>
            <span className="text-gray-500">Version:</span>
            <div className="font-mono">{status?.version || 'N/A'}</div>
          </div>
        </div>
        
        {status?.error && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
            {status.error}
          </div>
        )}
        
        <div className="flex items-center space-x-2 pt-1">
          <div className={`h-2 w-2 rounded-full ${status?.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-xs text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}