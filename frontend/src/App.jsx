import { Toaster } from "react-hot-toast";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ClientList from "./pages/ClientList";
import ClientDetail from "./pages/ClientDetail";
import ProviderList from "./pages/ProviderList";
import ProviderDetail from "./pages/ProviderDetail";
import RegisterReport from "./pages/RegisterReport";
import NewTransaction from "./pages/NewTransaction";
import RegisterHistory from "./pages/RegisterHistory";

import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import PinModal from "./components/PinModal";
import { DeviceSecurityProvider } from "./context/DeviceSecurityContext";


function App() {

    return (

        <DeviceSecurityProvider>
            <Toaster
                position="top-center"
                toastOptions={{
                    duration: 2500,
                }}
            />

            <PinModal />

            <BrowserRouter>
                <Routes>

                    {/* PUBLIC */}

                    <Route
                        path="/login"
                        element={<Login />}
                    />

                    <Route
                        path="/register"
                        element={<Register />}
                    />


                    {/* PROTECTED */}

                    <Route element={<ProtectedRoute />}>

                        <Route element={<AppLayout />}>

                            <Route
                                path="/"
                                element={<Dashboard />}
                            />

                            <Route
                                path="/transactions/new"
                                element={<NewTransaction />}
                            />

                            <Route
                                path="/registers"
                                element={<RegisterHistory />}
                            />

                            <Route
                                path="/registers/:id"
                                element={<RegisterReport />}
                            />
                            <Route
                                path="/clients"
                                element={<ClientList />}
                            />
                            <Route
                                path="/clients/new"
                                element={<ClientDetail isNewClient />}
                            />
                            <Route
                                path="/clients/:id"
                                element={<ClientDetail />}
                            />
                            <Route
                                path="/providers"
                                element={<ProviderList />}
                            />
                            <Route
                                path="/providers/new"
                                element={<ProviderDetail isNewProvider />}
                            />
                            <Route
                                path="/providers/:id"
                                element={<ProviderDetail />}
                            />
                        </Route>

                    </Route>

                </Routes>
            </BrowserRouter>
        </DeviceSecurityProvider>
    );
}


export default App;