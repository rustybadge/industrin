import { Button } from "@/components/ui/button";
import { DataQualityScore, getDataQualityMessage, getScrollWallIntensity } from "@/utils/data-quality";
import { UserCheck, TrendingUp, Info, X } from "lucide-react";

interface ScrollWallProps {
  quality: DataQualityScore;
  companyName: string;
  onClaimClick: () => void;
  onDismiss?: () => void;
  intensity?: 'light' | 'medium' | 'heavy';
}

export default function ScrollWall({ quality, companyName, onClaimClick, onDismiss, intensity }: ScrollWallProps) {
  const scrollIntensity = intensity || getScrollWallIntensity(quality);
  
  const intensityClasses = {
    light: {
      overlay: 'bg-gradient-to-b from-transparent via-white/20 to-white/60',
      backdrop: 'backdrop-blur-[1px]',
      opacity: 'opacity-70'
    },
    medium: {
      overlay: 'bg-gradient-to-b from-transparent via-white/40 to-white/80',
      backdrop: 'backdrop-blur-[2px]',
      opacity: 'opacity-85'
    },
    heavy: {
      overlay: 'bg-gradient-to-b from-transparent via-white/60 to-white/95',
      backdrop: 'backdrop-blur-[3px]',
      opacity: 'opacity-95'
    }
  };

  const currentIntensity = intensityClasses[scrollIntensity];

  return (
    <div className="fixed inset-0 pointer-events-auto z-50">
      {/* Scroll Wall Overlay */}
      <div 
        className={`absolute inset-0 ${currentIntensity.overlay} ${currentIntensity.backdrop} ${currentIntensity.opacity} transition-all duration-300`}
        style={{
          background: `linear-gradient(to bottom, 
            transparent 0%, 
            rgba(255,255,255,0.1) 20%, 
            rgba(255,255,255,0.3) 40%, 
            rgba(255,255,255,0.6) 60%, 
            rgba(255,255,255,0.9) 80%, 
            white 100%)`
        }}
      />
      
      {/* Call-to-Action Card - Centered */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-md border border-gray-200 rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4 transform transition-all duration-300 hover:scale-[1.02] relative">
          {/* Close Button */}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Stäng"
            >
              <X className="h-5 w-5" />
            </button>
          )}
          
          <div className="text-center">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="bg-blue-50 p-4 rounded-full">
                <UserCheck className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            
            {/* Heading */}
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Äger du {companyName}?
            </h3>
            
            {/* Quality Status */}
            <div className="flex items-center justify-center mb-4">
              <Info className="h-4 w-4 text-amber-500 mr-2" />
              <span className="text-sm text-amber-700 font-medium">
                {getDataQualityMessage(quality)}
              </span>
            </div>
            
            {/* Description */}
            <p className="text-gray-600 mb-6 leading-relaxed">
              Komplettera er företagsprofil med detaljerad beskrivning, kontaktuppgifter och 
              specialområden. Ta kontroll över er närvaro på Industrin.se och börja ta emot 
              förfrågningar från potentiella kunder.
            </p>
            
            {/* Stats */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Komplett data:</span>
                <span className="font-semibold">{quality.score}/{quality.maxScore} fält</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${quality.percentage}%` }}
                />
              </div>
            </div>
            
            {/* Action Button */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={onClaimClick}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Begär ägarskap och utöka profilen
              </Button>
            </div>
            
            {/* Subtle hint */}
            <p className="text-xs text-gray-400 mt-4">
              Klicka för att komplettera er företagsinformation
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
