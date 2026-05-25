
import { useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

const MainLayout = ({ children }) => {
  const [openSidebar, setOpenSidebar] = useState(false);
  return (
    <div className="h-screen flex bg-[#000] overflow-hidden">

      {/* SIDEBAR GLASS */}
      <div >
        {openSidebar && <Sidebar className="w-64 h-full" />}
      </div>

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* NAVBAR GLASS */}
        <div className="">
          <Navbar toggleSidebar={() => setOpenSidebar(!openSidebar)} />
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-auto p-4
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
