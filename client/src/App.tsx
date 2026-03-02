import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import DashboardView from './views/DashboardView';
import FoodLogView from './views/FoodLogView';
import AnalyticsView from './views/AnalyticsView';
import FoodsView from './views/FoodsView';
import SettingsView from './views/SettingsView';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardView />} />
        <Route path="/log" element={<FoodLogView />} />
        <Route path="/analytics" element={<AnalyticsView />} />
        <Route path="/foods" element={<FoodsView />} />
        <Route path="/settings" element={<SettingsView />} />
      </Route>
    </Routes>
  );
}
