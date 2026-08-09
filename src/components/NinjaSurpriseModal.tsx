import React from 'react';

interface NinjaSurpriseModalProps {
  onClose: () => void;
  onAcceptChallenge: () => void;
}

const NinjaSurpriseModal: React.FC<NinjaSurpriseModalProps> = ({ onClose, onAcceptChallenge }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-slate-900 border-2 border-brand-charcoal shadow-[8px_8px_0px_0px_#4C1D95] w-full max-w-xl flex flex-col relative overflow-hidden">
        
        {/* Header */}
        <div className="bg-brand-charcoal p-4 border-b-2 border-purple-900 flex justify-between items-center relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10 text-8xl -mt-4 mr-2 pointer-events-none">忍</div>
          <div>
            <div className="text-amber-500 text-xs font-mono tracking-widest uppercase mb-1">🍵 Secret Dojo Technique Unlocked</div>
            <h2 className="text-2xl font-serif font-black text-white flex items-center gap-2">
              <span className="text-brand-red">🥷</span> The Shadow Kata of the Vanishing Fly
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-5 text-gray-200">
          
          <div className="flex gap-4 items-start">
            <div className="w-24 h-24 shrink-0 border-2 border-brand-charcoal bg-black relative">
              {/* Fallback image style in case asset doesn't exist */}
              <img src="/assets/ninja_fly_chopsticks.jpg" alt="Ninja Fly" className="w-full h-full object-cover opacity-80" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              <div className="absolute inset-0 flex items-center justify-center text-4xl">🥷</div>
            </div>
            <div className="flex-1 font-serif text-sm leading-relaxed italic border-l-2 border-purple-900 pl-4 py-1">
              "Patience, young disciple! You have stumbled upon the sacred Shadow Scroll of the Dojo. Legend speaks of the Ninja Fly—a creature so swift it moves between the steam of hot soup and the shadow of your chopsticks.
              <br/><br/>
              When the smoke bomb drops, do not panic. Breathe in the aroma of fresh Matcha 🍵, steel your grip, and strike not where the fly is, but where its shadow will land!"
            </div>
          </div>

          {/* Squad Quotes */}
          <div className="bg-black/50 border border-purple-950 p-3 flex flex-col gap-2 text-xs font-mono">
            <div className="text-purple-300"><span className="text-brand-red font-bold">Luna:</span> "Whoa! Did someone turn off the keyframes?! The screen just exploded into smoke particles and Ghibli tea leaves!"</div>
            <div className="text-blue-300"><span className="text-brand-red font-bold">Echo:</span> "Listen close... hear that subtle sub-bass *poof*? That's 100% pure authentic Ninja Fly stealth pitch!"</div>
            <div className="text-green-300"><span className="text-brand-red font-bold">Scott:</span> "Testing alert! High-speed smoke evasions incoming! Chopstick collision hitboxes better be pixel-perfect!"</div>
          </div>

          {/* Onboarding Guide */}
          <div className="bg-brand-ivory text-brand-charcoal p-4 border border-brand-charcoal font-sans text-sm shadow-[2px_2px_0px_0px_#C8102E]">
            <div className="font-bold mb-2 flex items-center gap-2"><span className="text-brand-red">💡</span> NINJA SURPRISE MECHANICS:</div>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Smoke Bomb Evasion:</strong> Ninja Flies emit a puff of smoke (`💨`) and vanish briefly when chopsticks approach.</li>
              <li><strong>Matcha Focus:</strong> Sip Matcha to slow time by 30% for 5 seconds when the fly vanishes.</li>
              <li><strong>Honor Points:</strong> Catching a Ninja Fly rewards +500 Points!</li>
            </ul>
          </div>
        </div>

        {/* Footer CTAs */}
        <div className="bg-purple-950/30 p-4 border-t border-purple-900 flex flex-col sm:flex-row gap-3 justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 font-serif text-sm border-2 border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors"
          >
            🍵 Return to Quiet Meditation
          </button>
          <button 
            onClick={onAcceptChallenge}
            className="px-6 py-2 font-serif font-bold text-sm bg-brand-red text-white border-2 border-brand-charcoal hover:bg-red-600 transition-colors shadow-[3px_3px_0px_0px_#EAB308]"
          >
            🥢 Accept the Shadow Challenge
          </button>
        </div>
      </div>
    </div>
  );
};

export default NinjaSurpriseModal;
