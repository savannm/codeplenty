
import Navbar from "@/components/Navbar";
import Style from "@/components/Navbar.module.css";
import ChatInterface from "@/components/ChatInterface";

export default function Home() {
  return (
    <>
      {/* <div className={Style.navbar}><Navbar /></div> */}
      <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black p-4">
        <main className="flex flex-col md:flex-row flex-1 w-full max-w-5xl items-center justify-center gap-8 py-12">
          <div className="flex flex-col gap-6 p-8 bg-white dark:bg-zinc-900 rounded-[20px] shadow-sm border border-zinc-200 dark:border-zinc-800 sm:w-5/6 md:w-1/3">
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Agentic Loop</h2>
              <div className="h-1 w-12 bg-blue-600 rounded-full mb-6"></div>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                This interface uses an <span className="font-semibold text-blue-600 dark:text-blue-400">agentic loop</span> powered by Claude.
                Instead of just answering, the agent thinks, selects tools, and iterates until your task is complete.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 w-5 h-5 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold">1</div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">Tool Execution</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Calls specialized tools to interact with real data.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 w-5 h-5 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold">2</div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">Autonomous Logic</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Self-corrects and iterates until the goal is met.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 w-5 h-5 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold">3</div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">Step Tracking</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Monitors the number of steps taken for transparency.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="h-[60vh] sm:w-5/6 md:w-1/2 overflow-hidden shadow-2xl rounded-[20px]">
            <ChatInterface />
          </div>
        </main>
      </div>
    </>
  );
}
