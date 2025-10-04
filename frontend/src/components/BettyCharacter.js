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
        
        {/* Betty's Face/Avatar - Using CSS Art */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Face Circle */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-peach-200 to-pink-200 relative shadow-inner" style={{background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fbcfe8 100%)'}}>
            {/* Eyes with sparkle */}
            <div className="absolute top-4 left-3 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 relative">
              <div className="absolute top-0.5 left-0.5 w-1 h-1 rounded-full bg-white opacity-80"></div>
            </div>
            <div className="absolute top-4 right-3 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 relative">
              <div className="absolute top-0.5 left-0.5 w-1 h-1 rounded-full bg-white opacity-80"></div>
            </div>
            
            {/* Eyelashes */}
            <div className="absolute top-3.5 left-2.5 w-0.5 h-1 bg-slate-600 rounded-full transform rotate-12"></div>
            <div className="absolute top-3.5 left-3.5 w-0.5 h-1 bg-slate-600 rounded-full transform -rotate-12"></div>
            <div className="absolute top-3.5 right-2.5 w-0.5 h-1 bg-slate-600 rounded-full transform -rotate-12"></div>
            <div className="absolute top-3.5 right-3.5 w-0.5 h-1 bg-slate-600 rounded-full transform rotate-12"></div>
            
            {/* Nose */}
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-pink-300 rounded-full opacity-60"></div>
            
            {/* Smile */}
            <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 w-7 h-4 border-b-2 border-rose-400 rounded-full"></div>
            
            {/* Blonde Hair */}
            <div className="absolute -top-2 left-1 right-1 h-6 bg-gradient-to-r from-yellow-200 via-yellow-300 to-amber-200 rounded-t-full"></div>
            
            {/* Hair highlights */}
            <div className="absolute -top-1 left-2 right-4 h-2 bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-t-full opacity-70"></div>
            <div className="absolute -top-1 left-4 right-2 h-3 bg-gradient-to-r from-amber-100 to-yellow-100 rounded-t-full opacity-50"></div>
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
