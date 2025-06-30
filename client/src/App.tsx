import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Sidebar } from "@/components/sidebar";
import Dashboard from "@/pages/dashboard";
import PatientForm from "@/pages/patient-form";
import Patients from "@/pages/patients";
import Agents from "@/pages/agents";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/patients/new" component={PatientForm} />
      <Route path="/patients" component={Patients} />
      <Route path="/agents" component={Agents} />
      <Route path="/risk" component={Dashboard} />
      <Route path="/drugs" component={Dashboard} />
      <Route path="/guidelines" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <div className="min-h-screen flex bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Router />
        </main>
      </div>
    </QueryClientProvider>
  );
}

export default App;
