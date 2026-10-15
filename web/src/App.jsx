import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import Layout from "@/components/Layout";
import UploadPage from "@/pages/UploadPage";
import ConfigPage from "@/pages/ConfigPage";
import ResultsPage from "@/pages/ResultsPage";
import ExportPage from "@/pages/ExportPage";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/upload" replace />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/config" element={<ConfigPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/export" element={<ExportPage />} />
        </Routes>
      </Layout>
      <Toaster />
    </BrowserRouter>
  );
}
