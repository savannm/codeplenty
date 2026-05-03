
import Navbar from "@/components/Navbar";
import Style from "@/components/Navbar.module.css";
import ChatInterface from "@/components/ChatInterface";

export default function Home() {
  return (
    <>
      {/* <div className={Style.navbar}><Navbar /></div> */}
      <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <main className="flex flex-1 w-full max-w-3xl flex-row items-center justify-between  justify-center align-center">

          <div className="w-1/2 h-[50vh] overflow-auto"><ChatInterface /></div>
        </main>
      </div>
    </>
  );
}
