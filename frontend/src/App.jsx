import { Toaster } from "react-hot-toast";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ClientList from "./pages/ClientList";
import ClientDetail from "./pages/ClientDetail";
import RegisterReport from "./pages/RegisterReport";
import NewTransaction from "./pages/NewTransaction";
import RegisterHistory from "./pages/RegisterHistory";

import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";


function App() {

    return (

        <>
            <Toaster
                position="top-center"
                toastOptions={{
                    duration: 2500,
                }}
            />

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
                        </Route>

                    </Route>

                </Routes>
            </BrowserRouter>
        </>
    );
}


export default App;