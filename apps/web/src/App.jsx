import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router";
import { GuestOnly, RequireAuth } from "./components/auth/RequireAuth.jsx";
import { AppLayout } from "./components/layout/AppLayout.jsx";
import { AddFoodPage } from "./pages/AddFoodPage.jsx";
import { ExercisesPage } from "./pages/ExercisesPage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { NotFoundPage } from "./pages/NotFoundPage.jsx";
import { SettingsPage } from "./pages/SettingsPage.jsx";
import { SignupPage } from "./pages/SignupPage.jsx";
import { TodayPage } from "./pages/TodayPage.jsx";
import { WorkoutPage } from "./pages/WorkoutPage.jsx";
import { WorkoutsPage } from "./pages/WorkoutsPage.jsx";

// Chart pages pull in Recharts (~400 kB); load them only when visited.
const BodyPage = lazy(() => import("./pages/BodyPage.jsx").then((m) => ({ default: m.BodyPage })));
const ExerciseHistoryPage = lazy(() =>
  import("./pages/ExerciseHistoryPage.jsx").then((m) => ({ default: m.ExerciseHistoryPage })),
);

const loading = <p className="text-sm text-muted-foreground">Loading…</p>;

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
          <Route path="food/add" element={<AddFoodPage />} />
          <Route path="workouts" element={<WorkoutsPage />} />
          <Route path="workouts/:workoutId" element={<WorkoutPage />} />
          <Route
            path="body"
            element={
              <Suspense fallback={loading}>
                <BodyPage />
              </Suspense>
            }
          />
          <Route path="exercises" element={<ExercisesPage />} />
          <Route
            path="exercises/:exerciseId"
            element={
              <Suspense fallback={loading}>
                <ExerciseHistoryPage />
              </Suspense>
            }
          />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
