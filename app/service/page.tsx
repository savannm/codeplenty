import Navbar from "@/components/Navbar";
import Style from "@/components/Navbar.module.css";
import ChatInterface from "@/components/ChatInterface";

export default function Page() {
  return (
    <>
      <div className={Style.navbar}><Navbar /></div>
      <div>
        <ChatInterface />
      </div>
    </>
  );
}
