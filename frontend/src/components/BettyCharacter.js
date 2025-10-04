import React from 'react';
import { Star, TrendingUp, TrendingDown } from 'lucide-react';

const BettyCharacter = ({ size = 'large' }) => {
  const sizeClasses = {
    small: 'w-12 h-12',
    medium: 'w-20 h-20', 
    large: 'w-32 h-32'
  };

  return (
    <div className={`relative ${sizeClasses[size]} mx-auto`}>
      {/* Betty's Character Container */}
      <div className="relative w-full h-full">
        {/* Crystal Ball Base */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-300 via-blue-300 to-cyan-300 opacity-80 animate-pulse"></div>
        
        {/* Inner Crystal Glow */}
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/40 to-transparent"></div>
        
        {/* Betty Character Avatar */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Character Betty - CSS Art Style */}
          <div className="w-16 h-16 rounded-full relative" style={{background: 'linear-gradient(135deg, #fef7cd 0%, #fef3c7 40%, #fde68a 100%)'}}>
            {/* Character Hair - Blonde with highlights */}
            <div className="absolute -top-3 left-2 right-2 h-8 bg-gradient-to-br from-amber-300 via-yellow-300 to-amber-400 rounded-t-full transform rotate-2"></div>
            <div className="absolute -top-2 left-3 right-3 h-6 bg-gradient-to-br from-yellow-200 to-yellow-300 rounded-t-full opacity-80"></div>
            
            {/* Side bangs */}
            <div className="absolute top-1 left-1 w-3 h-4 bg-gradient-to-br from-yellow-300 to-amber-300 rounded-full transform -rotate-12"></div>
            <div className="absolute top-1 right-1 w-3 h-4 bg-gradient-to-br from-yellow-300 to-amber-300 rounded-full transform rotate-12"></div>
            
            {/* Character Eyes - Large and friendly */}
            <div className="absolute top-5 left-3 w-3 h-3 bg-white rounded-full border border-slate-300">
              <div className="absolute inset-0.5 w-2 h-2 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full">
                <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-white rounded-full opacity-90"></div>
              </div>
            </div>
            <div className="absolute top-5 right-3 w-3 h-3 bg-white rounded-full border border-slate-300">
              <div className="absolute inset-0.5 w-2 h-2 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full">
                <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-white rounded-full opacity-90"></div>
              </div>
            </div>
            
            {/* Eyebrows */}
            <div className="absolute top-4 left-3 w-2.5 h-0.5 bg-amber-600 rounded-full transform -rotate-12"></div>
            <div className="absolute top-4 right-3 w-2.5 h-0.5 bg-amber-600 rounded-full transform rotate-12"></div>
            
            {/* Nose - small and cute */}
            <div className="absolute top-7 left-1/2 transform -translate-x-1/2 w-1 h-1.5 bg-pink-300 rounded-full opacity-60 shadow-sm"></div>
            
            {/* Mouth - friendly smile */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-4 h-2 border-b-2 border-pink-400 rounded-full"></div>
            
            {/* Rosy cheeks */}
            <div className="absolute top-7 left-2 w-1.5 h-1 bg-pink-300 rounded-full opacity-40"></div>
            <div className="absolute top-7 right-2 w-1.5 h-1 bg-pink-300 rounded-full opacity-40"></div>
            
            {/* Character charm - small earrings */}
            <div className="absolute top-6 left-0.5 w-1 h-1 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full animate-pulse"></div>
            <div className="absolute top-6 right-0.5 w-1 h-1 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
          </div>
        </div>
        
        {/* Mystical Sparkles */}
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-300 rounded-full animate-ping"></div>
        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-pink-400 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute top-2 left-1 w-1 h-1 bg-white rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-2 right-1 w-1 h-1 bg-cyan-300 rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
        
        {/* Floating Icons Around Betty */}
        {size === 'large' && (
          <>
            <div className="absolute -top-4 left-4 animate-bounce" style={{animationDelay: '0.2s'}}>
              <TrendingUp className="w-4 h-4 text-emerald-400 opacity-60" />
            </div>
            <div className="absolute -top-4 right-4 animate-bounce" style={{animationDelay: '0.8s'}}>
              <TrendingDown className="w-4 h-4 text-red-400 opacity-60" />
            </div>
            <div className="absolute bottom-0 -left-4 animate-bounce" style={{animationDelay: '1.2s'}}>
              <Star className="w-4 h-4 text-yellow-400 opacity-60" />
            </div>
          </>
        )}
      </div>
      
      {/* Character Glow Effect */}
      <div className="absolute -inset-2 bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-cyan-500/20 rounded-full blur-md -z-10 animate-pulse"></div>
    </div>
  );
};

export default BettyCharacter;
