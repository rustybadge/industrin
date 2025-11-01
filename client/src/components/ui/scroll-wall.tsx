import { Button } from "@/components/ui/button";
import { DataQualityScore, getDataQualityMessage, getScrollWallIntensity } from "@/utils/data-quality";
import { X } from "lucide-react";

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
        <div className="bg-white border-2 border-gray-300 max-w-xl w-full mx-4 p-8 relative">
          {/* Close Button */}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-900 transition-colors"
              aria-label="Stäng"
            >
              <X className="h-5 w-5" />
            </button>
          )}
          
          <div className="text-left">
            {/* Heading */}
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Äger du {companyName}?
            </h3>
            
            {/* Quality Status */}
            <p className="text-sm text-gray-600 mb-4">
              Denna profil är ofullständig och skulle kunna förbättras med mer information.
            </p>
            
            {/* Stats */}
            <div className="bg-gray-50 p-3 mb-6">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Komplett information:</span>
                <span className="font-medium">{quality.score}/{quality.maxScore} fält</span>
              </div>
              <div className="w-full bg-gray-200 h-1">
                <div 
                  className="bg-gray-900 h-1 transition-all duration-500"
                  style={{ width: `${quality.percentage}%` }}
                />
              </div>
            </div>
            
            {/* Action Button */}
            <div className="flex flex-col sm:flex-row gap-3">
              {onDismiss && (
                <Button
                  onClick={onDismiss}
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium px-6 py-2.5"
                >
                  Inte nu
                </Button>
              )}
              <Button 
                onClick={onClaimClick}
                className="bg-gray-900 hover:bg-gray-800 text-white font-medium px-6 py-2.5 transition-colors"
              >
                Begär ägarskap
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
