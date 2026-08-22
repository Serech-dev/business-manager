import { Toaster } from "react-hot-toast";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import RegisterReport from "./pages/RegisterReport";
import NewTransaction from "./pages/NewTransaction";
import RegisterHistory from "./pages/RegisterHistory";
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
                <Route path="/login" element={<Login />} />
                <Route
                    path="/register"
                    element={<Register />}
                />
                <Route element={<ProtectedRoute />}>
                    <Route path="/" element={<Dashboard />} />
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
                </Route>
            </Routes>
        </BrowserRouter>
        </>
    );
}

export default App;