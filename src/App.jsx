import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import { useTenant } from './lib/tenant.jsx';
import Layout from './components/Layout.jsx';
import { Alert, Spinner } from './components/ui.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Drivers from './pages/Drivers.jsx';
import DriverDetail from './pages/DriverDetail.jsx';
import Passengers from './pages/Passengers.jsx';
import Rides from './pages/Rides.jsx';
import RideDetail from './pages/RideDetail.jsx';
import Tariff from './pages/Tariff.jsx';
import Settings from './pages/Settings.jsx';
import LiveMap from './pages/LiveMap.jsx';
import Credits from './pages/Credits.jsx';

export default function App() {
  const { user, ready } = useAuth();
  const { loading, error } = useTenant();

  if (loading || !ready) return <Spinner />;
  if (error) {
    return (
      <div className="mx-auto max-w-md p-6">
        <Alert>{error.message} Confira VITE_API_URL e VITE_TENANT no arquivo .env.</Alert>
      </div>
    );
  }
  if (!user) return <Login />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="mapa" element={<LiveMap />} />
        <Route path="motoristas" element={<Drivers />} />
        <Route path="motoristas/:id" element={<DriverDetail />} />
        <Route path="passageiros" element={<Passengers />} />
        <Route path="corridas" element={<Rides />} />
        <Route path="corridas/:id" element={<RideDetail />} />
        <Route path="creditos" element={<Credits />} />
        <Route path="tarifa" element={<Tariff />} />
        <Route path="configuracoes" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
