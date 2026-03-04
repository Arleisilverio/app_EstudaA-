"use client";

import React from 'react';

const GlobalBackground = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] flex items-center justify-center overflow-hidden select-none">
      <div className="relative w-full h-full flex items-center justify-center opacity-[0.03] dark:opacity-[0.07] transition-opacity duration-500">
        <img 
          src="/src/assets/background-logo.jpg" 
          alt="Watermark" 
          className="w-[80%] max-w-2xl object-contain dark:invert-0 invert"
          style={{
            filter: 'grayscale(100%) brightness(1.2) contrast(1.2)'
          }}
        />
      </div>
      
      {/* Overlay de gradiente suave para garantir que o centro não fique muito poluído */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
    </div>
  );
};

export default GlobalBackground;