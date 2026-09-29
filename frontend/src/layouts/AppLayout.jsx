import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { trafficApi } from '../api/client';

export default function AppLayout() {
  const [trafficSummary, setTrafficSummary] = useState({
    level: 'LOW',
    avgSpeed: 45.2,
    incidents: 0,
    weather: { condition: 'Clear', temperature: 23.5 }
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadStatus = async () => {
    try {
      setIsRefreshing(true);
      const data = await trafficApi.getCurrentTraffic();
      setTrafficSummary({
        level: data.system_traffic_level || 'LOW',
        avgSpeed: data.system_average_speed || 45.2,
        incidents: data.active_incidents_count || 0,
        weather: data.weather || { condition: 'Clear', temperature: 23.5 }
      });
    } catch (err) {
      console.warn("Could not fetch traffic status:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 25000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Navbar */}
        <Navbar
          trafficSummary={trafficSummary}
          isRefreshing={isRefreshing}
          onRefresh={loadStatus}
        />

        {/* Scrollable Page Body with Footer */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col justify-between">
          <div className="p-6">
            <Outlet />
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
}
