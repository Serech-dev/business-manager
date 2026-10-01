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
import ReportsAnalytics from "./pages/ReportsAnalytics";
import ProductList from "./pages/ProductList";
import StockManagement from "./pages/StockManagement";
import AdminPanel from "./pages/AdminPanel";
import EmployeeList from "./pages/EmployeeList";
import EmployeeDetail from "./pages/EmployeeDetail";

import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import PinModal from "./components/PinModal";
import SubscriptionModal from "./components/subscription/SubscriptionModal";
import SubscriptionExpiredOverlay from "./components/subscription/SubscriptionExpiredOverlay";
import StoreSettingsModal from "./components/settings/StoreSettingsModal";
import FirstTimeSetupModal from "./components/settings/FirstTimeSetupModal";
import ShiftHandoverModal from "./components/shifts/ShiftHandoverModal";

import { DeviceSecurityProvider } from "./context/DeviceSecurityContext";
import { OnboardingProvider } from "./context/OnboardingContext";
import { SubscriptionProvider, useSubscription } from "./context/SubscriptionContext";
import { StoreSettingsProvider, useStoreSettings } from "./context/StoreSettingsContext";
import { ShiftProvider, useShift } from "./context/ShiftContext";
import { DeviceModeProvider } from "./hooks/useDeviceMode";
import { NotificationProvider } from "./context/NotificationContext";
import { AnnouncementProvider } from "./context/AnnouncementContext";


function ShiftModalContainer() {
    const { isHandoverModalOpen, closeHandoverModal, activeShift, refreshActiveShift } = useShift();

    return (
        <ShiftHandoverModal
            isOpen={isHandoverModalOpen}
            onClose={closeHandoverModal}
            currentShift={activeShift}
            onSuccess={() => {
                refreshActiveShift();
                closeHandoverModal();
            }}
        />
    );
}


function SubscriptionModalContainer() {
    const { isSubscriptionModalOpen, closeSubscriptionModal } = useSubscription();

    return (
        <>
            <SubscriptionModal
                isOpen={isSubscriptionModalOpen}
                onClose={closeSubscriptionModal}
            />
            <SubscriptionExpiredOverlay />
        </>
    );
}

function StoreSettingsModalContainer() {
    const { isSettingsModalOpen, closeSettingsModal } = useStoreSettings();

    return (
        <>
            <StoreSettingsModal
                isOpen={isSettingsModalOpen}
                onClose={closeSettingsModal}
            />
            <FirstTimeSetupModal />
        </>
    );
}


function App() {
    return (
        <DeviceModeProvider>
            <DeviceSecurityProvider>
                <SubscriptionProvider>
                    <StoreSettingsProvider>
                        <NotificationProvider>
                            <AnnouncementProvider>
                                <OnboardingProvider>
                                    <ShiftProvider>
                            <Toaster
                                position="top-center"
                                gutter={8}
                                containerStyle={{
                                    top: 16,
                                }}
                                toastOptions={{
                                    duration: 3000,
                                    style: {
                                        background: "var(--surface)",
                                        color: "var(--text-primary)",
                                        border: "1px solid var(--border)",
                                        borderRadius: "6px",
                                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.45), 0 8px 10px -6px rgba(0, 0, 0, 0.3)",
                                        fontSize: "0.8125rem",
                                        fontWeight: "600",
                                        padding: "9px 14px",
                                        maxWidth: "420px",
                                    },
                                    success: {
                                        iconTheme: {
                                            primary: "var(--success)",
                                            secondary: "var(--surface)",
                                        },
                                        style: {
                                            border: "1px solid rgba(16, 185, 129, 0.35)",
                                        },
                                    },
                                    error: {
                                        duration: 4000,
                                        iconTheme: {
                                            primary: "var(--danger)",
                                            secondary: "var(--surface)",
                                        },
                                        style: {
                                            border: "1px solid rgba(244, 63, 94, 0.35)",
                                        },
                                    },
                                    loading: {
                                        iconTheme: {
                                            primary: "var(--primary)",
                                            secondary: "var(--surface)",
                                        },
                                    },
                                }}
                            />

                            <PinModal />

                        <BrowserRouter>
                            <SubscriptionModalContainer />
                            <StoreSettingsModalContainer />
                            <ShiftModalContainer />
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
                                {/* SUPERADMIN / OWNER CONTROL PANEL */}
                                <Route
                                    path="/admin-panel"
                                    element={<AdminPanel />}
                                />

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
                                        path="/analytics"
                                        element={<ReportsAnalytics />}
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
                                    <Route
                                        path="/employees"
                                        element={<EmployeeList />}
                                    />
                                    <Route
                                        path="/employees/:id"
                                        element={<EmployeeDetail />}
                                    />
                                    <Route
                                        path="/products"
                                        element={<ProductList />}
                                    />
                                    <Route
                                        path="/stock"
                                        element={<StockManagement />}
                                    />
                                </Route>
                            </Route>
                        </Routes>
                    </BrowserRouter>
                                    </ShiftProvider>
                                </OnboardingProvider>
                            </AnnouncementProvider>
                        </NotificationProvider>
        </StoreSettingsProvider>
    </SubscriptionProvider>
</DeviceSecurityProvider>
</DeviceModeProvider>
);
}

export default App;