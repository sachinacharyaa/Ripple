import { useState, FormEvent, useEffect } from "react";
import confetti from "canvas-confetti";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import { Analytics } from "@vercel/analytics/next";

export default function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#14f195", "#9945ff", "#ffffff"]
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#14f195", "#9945ff", "#ffffff"]
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  const playSuccessSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playNote = (frequency: number, startTime: number, duration: number) => {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      const now = audioCtx.currentTime;
      // C Major arpeggio chime
      playNote(523.25, now, 0.2);       // C5
      playNote(659.25, now + 0.1, 0.3); // E5
      playNote(783.99, now + 0.2, 0.5); // G5
      playNote(1046.50, now + 0.3, 0.8);// C6
      
    } catch (e) {
      console.log('Audio not supported', e);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Something went wrong");
      }

      setStatus("success");
      triggerConfetti();
      playSuccessSound();

      // Close modal after some time
      setTimeout(() => {
        setIsModalOpen(false);
        setStatus("idle");
        setName("");
        setEmail("");
      }, 4000);
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message);
    }
  };

  // Prevent scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isModalOpen]);

  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden flex flex-col items-center justify-center font-sans">
      {/* Noise overlay */}
      <div className="noise-bg"></div>

      {/* Ambient glowing orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#14f195] opacity-[0.15] blur-[120px] pointer-events-none mix-blend-screen"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-[#9945ff] opacity-[0.12] blur-[120px] pointer-events-none mix-blend-screen"></div>

      <div className="z-10 flex flex-col items-center text-center px-6 max-w-3xl mx-auto w-full">
        {/* Logo */}
        <div className="rounded-3xl overflow-hidden flex items-center justify-center mb-10 shadow-2xl border border-white/10 shrink-0" style={{ width: '96px', height: '96px' }}>
          <img src="/logoRivo.png" alt="Rivo Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>

        {/* Hero Text */}
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">
          Join the waitlist
        </h1>
        <p className="text-lg md:text-xl text-zinc-400 mb-12 max-w-3xl mx-auto leading-relaxed">
          Get early access to Rivo and explore the Solana creator marketplace.
        </p>

        {/* Form Trigger (Looks like an input, acts as a button to open modal) */}
        <div
          onClick={() => setIsModalOpen(true)}
          className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md bg-zinc-900/50 backdrop-blur-md p-2 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group"
        >
          <div className="flex-1 text-left px-4 text-zinc-500 py-3 sm:py-0 w-full sm:w-auto">
            your@email.com
          </div>
          <button className="w-full sm:w-auto bg-white text-black px-6 py-3 rounded-xl font-semibold hover:bg-zinc-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)] group-hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]">
            Join waitlist
          </button>
        </div>


      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => status !== 'loading' && setIsModalOpen(false)}
          ></div>

          <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 p-8 rounded-3xl shadow-2xl modal-animate overflow-hidden">
            {/* Modal glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-[#14f195] opacity-5 blur-[100px] pointer-events-none"></div>

            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white transition-colors rounded-full hover:bg-zinc-900"
              disabled={status === "loading"}
            >
              <X size={20} />
            </button>

            {status === "success" ? (
              <div className="py-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-[#14f195]/20 text-[#14f195] flex items-center justify-center mb-6">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-2xl font-bold mb-2">You're on the list!</h3>
                <p className="text-zinc-400">Keep an eye on your inbox for updates.</p>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h3 className="text-2xl font-bold mb-2">Join Rivo</h3>
                  <p className="text-zinc-400 text-sm">Enter your details to secure your spot.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-1.5">Name</label>
                    <input
                      id="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={status === "loading"}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#14f195]/50 focus:border-[#14f195]/50 transition-all"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-1.5">Email address</label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={status === "loading"}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#14f195]/50 focus:border-[#14f195]/50 transition-all"
                      placeholder="your@email.com"
                    />
                  </div>

                  {status === "error" && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                      {errorMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={status === "loading" || !name || !email}
                    className="w-full mt-4 bg-white text-black font-semibold rounded-xl px-4 py-3 hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center h-12"
                  >
                    {status === "loading" ? (
                      <Loader2 className="animate-spin text-zinc-500" size={20} />
                    ) : (
                      "Join waitlist"
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
      <Analytics />
    </main>
  );
}
