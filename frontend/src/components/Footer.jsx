// src/components/Footer.jsx
import React from "react";

const Footer = () => {
  return (
    <footer className="bg-zinc-950 text-zinc-400 text-[11px] py-12 border-t border-zinc-900 w-full mt-auto">
      <div className="max-w-7xl mx-auto px-6 space-y-10">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-zinc-900">
          {/* Brand Pillar Column */}
          <div className="md:col-span-4 space-y-4">
            <div className="flex items-baseline select-none">
              <span className="text-3xl font-serif font-black text-emerald-600 tracking-tighter mr-0.5 leading-none">D</span>
              <span className="text-sm font-sans font-black uppercase tracking-[0.15em] text-white leading-none">ermaGlow</span>
            </div>
            <p className="text-zinc-400 leading-relaxed max-w-xs text-[11px]">
              An intelligent safety platform indexing verified database parameters to empower sensitive skin health.
            </p>
            {/* Social SVGs Line */}
            <div className="flex items-center space-x-4 pt-1">
              <a href="#" className="text-zinc-500 hover:text-white transition-colors" aria-label="Twitter Links">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="#" className="text-zinc-500 hover:text-white transition-colors" aria-label="Facebook Links">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
              </a>
              <a href="#" className="text-zinc-500 hover:text-white transition-colors" aria-label="Instagram Links">
                <svg className="h-4 w-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </a>
            </div>
          </div>

          {/* Core Menu Footprint Links */}
          <div className="md:col-span-2 space-y-2">
            <h4 className="font-bold text-white uppercase text-[10px] tracking-wider">Shop</h4>
            <ul className="space-y-1 text-zinc-400">
              <li className="hover:text-white cursor-pointer transition-colors">Sell Online</li>
              <li className="hover:text-white cursor-pointer transition-colors">Features</li>
              <li className="hover:text-white cursor-pointer transition-colors">Examples</li>
            </ul>
          </div>
          <div className="md:col-span-3 space-y-2">
            <h4 className="font-bold text-white uppercase text-[10px] tracking-wider">Press</h4>
            <ul className="space-y-1 text-zinc-400">
              <li className="hover:text-white cursor-pointer transition-colors">Events Hub</li>
              <li className="hover:text-white cursor-pointer transition-colors">News Insights</li>
              <li className="hover:text-white cursor-pointer transition-colors">Awards Room</li>
            </ul>
          </div>
          <div className="md:col-span-3 space-y-2">
            <h4 className="font-bold text-white uppercase text-[10px] tracking-wider">About</h4>
            <ul className="space-y-1 text-zinc-400">
              <li className="hover:text-white cursor-pointer transition-colors">Contact Gate</li>
              <li className="hover:text-white cursor-pointer transition-colors">Clinical Team</li>
              <li className="hover:text-white cursor-pointer transition-colors">Careers</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-zinc-500 text-[10px]">
          <div className="flex space-x-4">
            <span className="hover:text-zinc-300 cursor-pointer transition-colors">Privacy Policy</span>
            <span>&bull;</span>
            <span className="hover:text-zinc-300 cursor-pointer transition-colors">Terms & Conditions</span>
          </div>
          <p>&copy; 2026 DermaGlow Inc. All Rights Reserved via local dataset indexing.</p>
        </div>

      </div>
    </footer>
  );
};

export default Footer;