import React from "react";

const Loader = ({ message = "Analyzing ingredient profiles..." }) => {
  return (
    <div className="w-full flex flex-col items-center justify-center py-16 px-4">
      <div className="relative w-12 h-12">
        <div className="absolute w-full h-full rounded-full border-4 border-emerald-100 border-t-emerald-800 animate-spin"></div>
      </div>
      <p className="mt-4 text-xs font-bold uppercase tracking-widest text-emerald-900/60 animate-pulse">
        {message}
      </p>
    </div>
  );
};

export { Loader };