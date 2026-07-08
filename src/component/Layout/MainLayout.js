
import { useState, useRef, useEffect } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

const MainLayout = ({ children }) => {
  const [openSidebar, setOpenSidebar] = useState(true);
  const sidebarRef = useRef(null);

  // Mobile pe sidebar ke bahar kahin bhi touch/click ho to sidebar band ho jaye
  useEffect(() => {
    const handler = (e) => {
      if (window.innerWidth > 991) return;
      if (e.target.closest(".mobile_btn")) return;
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        setOpenSidebar(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="h-screen flex  overflow-hidden">

      {/* SIDEBAR GLASS */}
      <div ref={sidebarRef}>
        {openSidebar && <Sidebar className="w-64 h-full" />}
      </div>

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* NAVBAR GLASS */}
        <div className="">
          <Navbar toggleSidebar={() => setOpenSidebar(!openSidebar)} />
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-auto p-md-4 p-2 
           backdrop-blur-md">

          {/* content glass wrapper */}
          <div className="min-h-full 
            ">

            {children}

          </div>

        </div>
      </div>
    </div>
  );
};

export default MainLayout;
