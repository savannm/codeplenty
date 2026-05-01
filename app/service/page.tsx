import Agent from "@/components/ai/Agent"
import Navbar from "@/components/Navbar";
import Style from "@/components/Navbar.module.css";

export default function Page() {
  return (
    <>
      <div className={Style.navbar}><Navbar /></div>
      <div>
        <Agent />
      </div>
    </>
  );
}
