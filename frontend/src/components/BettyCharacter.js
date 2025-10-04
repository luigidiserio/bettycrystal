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
        
        {/* Betty's Professional Avatar */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Professional Betty Avatar */}
          <div 
            className="w-16 h-16 rounded-full bg-cover bg-center shadow-lg border-2 border-white/30" 
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2Mzl8MHwxfHNlYXJjaHwzfHxidXNpbmVzcyUyMHdvbWFuJTIwcG9ydHJhaXR8ZW58MHx8fHwxNzU5NjAxMjA3fDA&ixlib=rb-4.1.0&q=85&w=200&h=200&fit=crop&crop=face')`,
              backgroundPosition: 'center 20%'
            }}
          >
            {/* Mystical overlay */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400/20 via-blue-400/20 to-cyan-400/20"></div>
            {/* Professional glow */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 to-transparent"></div>
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
