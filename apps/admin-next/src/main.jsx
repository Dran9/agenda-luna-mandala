import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { queryClient } from "./lib/queryClient";
import { LoginRoute } from "./routes/LoginRoute";
import { ControlRoute } from "./routes/ControlRoute";
import { AuthProvider } from "./features/auth/AuthContext";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/forms.css";
import "./styles/table.css";
import "./styles/table-interactions.css";
import "./styles/modal.css";
import "./styles/drawer.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/control" element={<ControlRoute />} />
            <Route path="*" element={<Navigate to="/control" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
