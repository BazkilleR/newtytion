import { Route, Routes } from "react-router";
import { GuestOnly, RequireAuth } from "./components/auth/RequireAuth.jsx";
import { AppLayout } from "./components/layout/AppLayout.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { NotFoundPage } from "./pages/NotFoundPage.jsx";
import { SignupPage } from "./pages/SignupPage.jsx";
import { TodayPage } from "./pages/TodayPage.jsx";

export function App() {
  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<TodayPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
