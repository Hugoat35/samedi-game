"use client";

import { useEffect, useState, useRef } from "react";

interface WikiRaceProps {
  startPage: string;
  targetPage: string;
  onWin: (history: string[]) => void;
}

export default function WikiRace({ startPage, targetPage, onWin }: WikiRaceProps) {
  const [currentPage, setCurrentPage] = useState(startPage);
  const [htmlContent, setHtmlContent] = useState<string>("<p>Chargement...</p>");
  const [history, setHistory] = useState<string[]>([startPage]);
  const [isLoading, setIsLoading] = useState(false);
  
  // --- JOKERS STATES ---
  const [backjumpsLeft, setBackjumpsLeft] = useState(3);
  const [searchLeft, setSearchLeft] = useState(2);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsSearchOpen(false);
    setSearchQuery("");

    async function fetchWikiPage() {
      setIsLoading(true);
      try {
        const res = await fetch(
          `https://fr.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(
            currentPage
          )}&format=json&origin=*&disableeditsection=true`
        );
        const data = await res.json();

        if (data?.parse?.text) {
          setHtmlContent(data.parse.text["*"]);
          // On remonte la page tout en haut au chargement d'un nouvel article
          if (contentRef.current) {
            contentRef.current.parentElement?.scrollTo(0, 0);
          }
        } else {
          setHtmlContent("<p>Erreur lors du chargement de la page.</p>");
        }
      } catch (err) {
        console.error(err);
        setHtmlContent("<p>Erreur réseau.</p>");
      }
      setIsLoading(false);
    }

    fetchWikiPage();
  }, [currentPage]);

  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest("a");
    if (!target) return;

    const href = target.getAttribute("href");
    
    if (href && href.startsWith("/wiki/")) {
      e.preventDefault(); 
      
      const nextPage = decodeURIComponent(href.replace("/wiki/", ""));
      if (nextPage.includes(":")) return;

      const newHistory = [...history, nextPage];
      setHistory(newHistory);
      setCurrentPage(nextPage);

      if (nextPage.toLowerCase() === targetPage.toLowerCase()) {
        onWin(newHistory);
      }
    } else {
      e.preventDefault();
    }
  };

  const handleBackjump = () => {
    if (backjumpsLeft > 0 && history.length > 1) {
      const newHistory = [...history];
      newHistory.pop();
      const previousPage = newHistory[newHistory.length - 1];
      setHistory(newHistory);
      setCurrentPage(previousPage);
      setBackjumpsLeft((prev) => prev - 1);
    }
  };

  const handleActivateSearch = () => {
    if (searchLeft > 0 && !isSearchOpen) {
      setSearchLeft((prev) => prev - 1);
      setIsSearchOpen(true);
    }
  };

  const executeSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    const found = (window as any).find(searchQuery, false, false, true, false, true, false);
    if (!found) alert("Mot introuvable plus bas dans la page !");
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] sm:h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 pointer-events-auto">
      {/* HEADER ULTRA COMPACT POUR MOBILE */}
      <div className="shrink-0 border-b border-slate-200 bg-slate-50 p-3 sm:p-4 shadow-sm z-10">
        
        {/* Ligne 1 : Objectif et Score */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Objectif</span>
            <span className="truncate text-sm sm:text-base font-black text-blue-700">
              🏁 {targetPage.replace(/_/g, " ")}
            </span>
          </div>
          <div className="shrink-0 rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700">
            {history.length - 1} clics
          </div>
        </div>

        {/* Ligne 2 : Les Jokers */}
        <div className="mt-2 flex gap-2">
          <button
            onClick={handleBackjump}
            disabled={backjumpsLeft === 0 || history.length <= 1 || isLoading}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-100 py-2 text-[11px] font-bold text-amber-800 transition active:scale-95 disabled:opacity-40 sm:text-xs"
          >
            <span className="text-sm">⏪</span> 
            <span className="whitespace-nowrap">Retour ({backjumpsLeft})</span>
          </button>
          
          <button
            onClick={handleActivateSearch}
            disabled={searchLeft === 0 || isSearchOpen || isLoading}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-100 py-2 text-[11px] font-bold text-emerald-800 transition active:scale-95 disabled:opacity-40 sm:text-xs"
          >
            <span className="text-sm">🔍</span> 
            <span className="whitespace-nowrap">Chercher ({searchLeft})</span>
          </button>
        </div>

        {/* Ligne 3 : Barre de recherche (si ouverte) */}
        {isSearchOpen && (
          <form onSubmit={executeSearch} className="mt-2 flex gap-2 animate-in slide-in-from-top-2">
            <input
              type="text"
              placeholder="Mot..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
            <button type="submit" className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm active:scale-95">
              Sauter
            </button>
          </form>
        )}
      </div>

      {/* ZONE WIKIPEDIA (Scrollable) */}
      <div className="relative flex-1 overflow-y-auto p-3 sm:p-5 scroll-smooth">
        {isLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
            <span className="text-xs font-bold text-blue-800 animate-pulse">Chargement de la page...</span>
          </div>
        )}
        
        {/* TITRE DE LA PAGE COURANTE */}
        <h1 className="text-xl sm:text-3xl font-black text-slate-900 mb-4 pb-2 border-b-2 border-slate-100">
          {currentPage.replace(/_/g, " ")}
        </h1>

        {/* TEXTE WIKIPEDIA AVEC CLASSES MOBILES */}
        <div 
          ref={contentRef}
          onClick={handleContentClick}
          className="
            text-[13px] sm:text-base text-slate-800 leading-relaxed
            [&_a]:text-blue-600 [&_a]:font-semibold [&_a]:underline-offset-2
            hover:[&_a]:text-blue-800 
            [&_p]:mb-4 
            [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-slate-900
            [&_h3]:text-base [&_h3]:font-bold [&_h3]:mt-4 [&_h3]:mb-1
            [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:mb-4 [&_li]:mb-1
            [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:mb-4
            [&_.mw-editsection]:hidden
            [&_.reference]:hidden
            [&_.navbox]:hidden
            [&_.infobox]:float-right [&_.infobox]:ml-3 [&_.infobox]:mb-3 [&_.infobox]:bg-slate-50 [&_.infobox]:p-2 [&_.infobox]:text-[10px] [&_.infobox]:rounded-xl [&_.infobox]:border [&_.infobox]:border-slate-200 [&_.infobox]:max-w-[140px]
          "
          dangerouslySetInnerHTML={{ __html: htmlContent }} 
        />
      </div>
    </div>
  );
}