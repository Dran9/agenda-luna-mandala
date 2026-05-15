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
import "./styles/modal.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
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
