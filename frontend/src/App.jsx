import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import Dashboard from './pages/Dashboard';
import MapRoute from './pages/MapRoute';
import Predict from './pages/Predict';
import Analytics from './pages/Analytics';
import Trips from './pages/Trips';
import ModelInfo from './pages/ModelInfo';
import Admin from './pages/Admin';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="map" element={<MapRoute />} />
          <Route path="predict" element={<Predict />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="trips" element={<Trips />} />
          <Route path="model" element={<ModelInfo />} />
          <Route path="admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
