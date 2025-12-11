import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Home } from "@/pages/Home";
import { Console } from "@/pages/Console";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/console" element={<Console />} />
      </Routes>
    </BrowserRouter>
  );
}
