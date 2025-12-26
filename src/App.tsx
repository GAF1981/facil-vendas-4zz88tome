import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import GlobalLayout from '@/components/layout/GlobalLayout'
import Index from '@/pages/Index'
import NotFound from '@/pages/NotFound'
import ClientsPage from '@/pages/clients/ClientsPage'
import ClientFormPage from '@/pages/clients/ClientFormPage'

const App = () => (
  <BrowserRouter
    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
  >
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Routes>
        <Route element={<GlobalLayout />}>
          <Route path="/" element={<Index />} />
          <Route path="/clientes" element={<ClientsPage />} />
          <Route path="/clientes/novo" element={<ClientFormPage />} />
          <Route path="/clientes/:id" element={<ClientFormPage />} />

          {/* Redirect generic routes to 404 or specific pages if needed, for now Vendas is just a placeholder route */}
          <Route
            path="/vendas"
            element={
              <div className="flex items-center justify-center h-[50vh] text-muted-foreground">
                Módulo de Vendas em desenvolvimento.
              </div>
            }
          />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  </BrowserRouter>
)

export default App
