"use client";

import React from 'react';
import HomeHeader from "@/components/HomeHeader";
import PromoBanner from "@/components/PromoBanner";
import SubjectGrid from "@/components/SubjectGrid";
import BottomNav from "@/components/BottomNav";

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md md:max-w-5xl lg:max-w-6xl mx-auto relative overflow-x-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-study-primary/5 dark:bg-study-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
      <div className="absolute bottom-40 left-0 w-48 h-48 bg-study-primary/5 rounded-full -translate-x-1/2 blur-2xl" />
      
      <div className="relative z-10 flex flex-col h-full">
        <HomeHeader />
        
        <div className="flex-1">
          <PromoBanner />
          <SubjectGrid />
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Index;