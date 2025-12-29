import { Route, Routes, Navigate } from "react-router-dom";
import GatefrontHome from "./pages/gatefront-home";
import SignIn from "./pages/auth/sign-in";
import SignOut from "./pages/auth/sign-out";
import NotFound from "./pages/not-found";
import AdminPage from "./pages/admin/admin-page";

export default function App() {
  return (
    <>
      <Routes>
        {/* 게이트웨이 내부 관리 및 인증 경로는 /_gate 로 시작합니다. */}
        <Route path="/_gatefront" element={<GatefrontHome />} />
        <Route path="/_gatefront/" element={<GatefrontHome />} />
        <Route path="/_gatefront/auth/sign-in" element={<SignIn />} />
        <Route path="/_gatefront/auth/sign-out" element={<SignOut />} />
        <Route path="/_gatefront/admin" element={<AdminPage />} />

        {/* 루트 접속 시 로그인 페이지로 리다이렉트 (예시) */}
        <Route path="/" element={<Navigate to="/_gatefront" replace />} />

        <Route path="/*" element={<NotFound />} />
      </Routes>
    </>
  );
}
