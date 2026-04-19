import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ChatDrawer from "./components/ChatDrawer";
import Home from "./pages/Home";
import Compare from "./pages/Compare";
import Recommend from "./pages/Recommend";
import Cars from "./pages/Cars";
import EMI from "./pages/EMI";
import News from "./pages/News";
import BookCar from "./pages/BookCar";
import { Toaster } from "./components/ui/sonner";
import { I18nProvider } from "./lib/i18n";

function App() {
  return (
    <div className="App bg-[#050505] text-white">
      <I18nProvider>
        <BrowserRouter>
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/compare" element={<Compare />} />
              <Route path="/recommend" element={<Recommend />} />
              <Route path="/cars" element={<Cars />} />
              <Route path="/emi" element={<EMI />} />
              <Route path="/news" element={<News />} />
              <Route path="/book/:carId" element={<BookCar />} />
            </Routes>
          </main>
          <Footer />
          <ChatDrawer />
          <Toaster />
        </BrowserRouter>
      </I18nProvider>
    </div>
  );
}

export default App;
