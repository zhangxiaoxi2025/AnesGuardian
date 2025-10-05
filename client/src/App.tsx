import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Sidebar } from "@/components/sidebar";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "@/pages/dashboard";
import PatientForm from "@/pages/patient-form";
import Patients from "@/pages/patients";
import Agents from "@/pages/agents";
import Chat from "@/pages/chat";
import DrugInteractions from "@/pages/drug-interactions";
import ClinicalGuidelines from "@/pages/clinical-guidelines";
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";

function ProtectedRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/patients/new" component={PatientForm} />
      <Route path="/patient-form" component={PatientForm} />
      <Route path="/patients" component={Patients} />
      <Route path="/agents" component={Agents} />
      <Route path="/chat" component={Chat} />
      <Route path="/risk" component={Dashboard} />
      <Route path="/drug-interactions" component={DrugInteractions} />
      <Route path="/drugs" component={DrugInteractions} />
      <Route path="/clinical-guidelines" component={ClinicalGuidelines} />
      <Route path="/guidelines" component={ClinicalGuidelines} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <ProtectedRouter />
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster />
        <Switch>
          <Route path="/login" component={LoginPage} />
          <Route>
            <ProtectedRoute>
              <AppContent />
            </ProtectedRoute>
          </Route>
        </Switch>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
