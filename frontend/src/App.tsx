import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import QueueDashboard from "./pages/QueueDashboard";
import QueueDetails from "./pages/QueueDetails";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<QueueDashboard />} />
        <Route path="/queue/:queueName" element={<QueueDetails />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
