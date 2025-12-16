
import React from 'react';
import { ArrowLeft, Mic, Activity, BrainCircuit, Calendar, Gauge, Dumbbell, Smartphone } from 'lucide-react';

interface Props {
  onBack: () => void;
}

const HelpView: React.FC<Props> = ({ onBack }) => {
  const features = [
    {
      icon: <Mic size={24} className="text-red-400" />,
      title: "Smart Voice Logging",
      desc: "Tap the 'Smart Mic' button in an exercise and speak your numbers. The app listens for two numbers: Weight first, then Reps.",
      example: "Say: '80 kilos for 10 reps' or simply '80 10'."
    },
    {
      icon: <Activity size={24} className="text-blue-400" />,
      title: "Motion Pacer",
      desc: "The circular timer isn't just a clock. It guides your lifting tempo (speed).",
      example: "Follow the breathing cues: Inhale on the way down, Exhale on the exertion. Match the circle's speed."
    },
    {
      icon: <BrainCircuit size={24} className="text-purple-400" />,
      title: "Auto-Pilot Coach",
      desc: "The app analyzes your last session's RPE and Reps to suggest weights.",
      example: "If a set was too easy (RPE < 7), it will suggest a weight increase (+2.5kg) for next time automatically."
    },
    {
      icon: <Gauge size={24} className="text-yellow-400" />,
      title: "RPE (Exertion)",
      desc: "Rate of Perceived Exertion. A scale of 1-10 on how hard the set was.",
      example: "10 = Absolute failure (could not do another rep). 8 = Hard, but could do 2 more reps."
    },
    {
      icon: <Calendar size={24} className="text-green-400" />,
      title: "Skip & Reschedule",
      desc: "Missed an exercise? Skip it and select a target plan (e.g., 'Pull A') to move it to. It will appear at the top of that workout next time.",
      example: "Useful if the gym is too busy or you ran out of time."
    }
  ];

  return (
    <div className="min-h-screen bg-gym-900 text-white p-6 max-w-md mx-auto animate-in slide-in-from-right">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="text-gray-400 hover:text-white p-2 -ml-2">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-2xl font-bold">App Guide</h2>
      </div>

      <div className="space-y-6 pb-10">
        {features.map((f, i) => (
          <div key={i} className="bg-gym-800 border border-gym-700 rounded-xl p-5 shadow-lg">
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 bg-gym-900 rounded-full border border-gym-700">
                {f.icon}
              </div>
              <h3 className="font-bold text-lg text-white">{f.title}</h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed mb-3">{f.desc}</p>
            {f.example && (
              <div className="bg-gym-900/50 p-3 rounded-lg border border-gym-700/50">
                <p className="text-xs text-gym-accent font-bold uppercase mb-1">How to use:</p>
                <p className="text-xs text-gray-400 italic">"{f.example}"</p>
              </div>
            )}
          </div>
        ))}

        <div className="bg-gym-800 border border-gym-700 rounded-xl p-5">
            <h3 className="font-bold text-lg text-white mb-2 flex items-center gap-2"><Smartphone size={20}/> Troubleshooting Voice</h3>
            <ul className="list-disc list-inside text-xs text-gray-400 space-y-2">
                <li>Ensure you are using <strong>Google Chrome</strong> (Android/Desktop) or <strong>Safari</strong> (iOS).</li>
                <li>You must grant <strong>Microphone Permission</strong> when asked.</li>
                <li>Speak clearly and wait for the "Listening..." text to appear.</li>
                <li>If it fails, try typing manually using the "Last" or "+2.5kg" buttons for speed.</li>
            </ul>
        </div>
      </div>
    </div>
  );
};

export default HelpView;
